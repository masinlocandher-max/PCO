"""Checks for the guarantees this module makes.

Stdlib unittest, no dependencies, runnable with:

    python3 linkedin-ai-assistant/tests/test_assistant.py

The tests are grouped by promise rather than by file, because the promises are
what would actually hurt FMB if they broke:

  1. Nothing private is published.
  2. Nothing goes out without a human approval.
  3. No credential is ever written down.
  4. The memory tells the truth about what it does not know.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1]
REPO = MODULE.parent
sys.path.insert(0, str(MODULE))

os.environ.setdefault("FMB_OPERATOR", "Test Operator")
_TMP = tempfile.mkdtemp()
os.environ["FMB_ASSISTANT_DB"] = str(Path(_TMP) / "test.db")

from server import approval_manager, db, knowledge_search, linkedin_client  # noqa: E402
from server.approval_manager import ApprovalError  # noqa: E402
from server.config import redact, settings  # noqa: E402


def fresh_db():
    path = Path(tempfile.mkdtemp()) / "t.db"
    return db.connection(path)


class PrivacyIsStructural(unittest.TestCase):
    """The module must be impossible to publish by accident."""

    def test_deploy_excludes_the_module(self):
        wf = (REPO / ".github/workflows/deploy-pages.yml").read_text()
        self.assertIn("--exclude 'linkedin-ai-assistant'", wf)
        self.assertIn("test ! -d _site/linkedin-ai-assistant", wf,
                      "the staging assertion is the backstop if the exclusion is dropped")

    def test_validator_fails_without_the_exclusion(self):
        """Removing the exclusion must break CI, not go unnoticed."""
        wf_path = REPO / ".github/workflows/deploy-pages.yml"
        original = wf_path.read_text()
        try:
            wf_path.write_text(original.replace("--exclude 'linkedin-ai-assistant'", ""))
            result = subprocess.run(
                [sys.executable, str(REPO / "scripts/validate-site-assets.py")],
                capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0,
                                "the validator passed with the exclusion removed")
            self.assertIn("linkedin-ai-assistant", result.stdout + result.stderr)
        finally:
            wf_path.write_text(original)

    def test_store_and_env_are_git_ignored(self):
        for candidate in ("linkedin-ai-assistant/database/fmb_assistant.db",
                          "linkedin-ai-assistant/.env"):
            result = subprocess.run(["git", "check-ignore", candidate],
                                    cwd=REPO, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, f"{candidate} is not ignored")

    def test_no_database_file_is_tracked(self):
        tracked = subprocess.run(["git", "ls-files", "linkedin-ai-assistant"],
                                 cwd=REPO, capture_output=True, text=True).stdout
        for line in tracked.splitlines():
            self.assertFalse(line.endswith((".db", ".sqlite", ".sqlite3")),
                             f"a database file is tracked: {line}")
            self.assertNotEqual(Path(line).name, ".env", "a .env file is tracked")


class NothingGoesOutWithoutApproval(unittest.TestCase):

    def test_default_mode_hands_off_and_sends_nothing(self):
        """MODE 1 is the default and is not an error state: it hands text back."""
        with fresh_db() as conn:
            aid = approval_manager.draft(conn, action_type="publish_post",
                                         subject="s", payload="hello")
            approval_manager.submit(conn, aid)
            approval_manager.approve(conn, aid, by="FMB")
            permit = approval_manager.claim(conn, aid)
            out = linkedin_client.publish(conn, permit)
            self.assertFalse(out["sent"])
            self.assertEqual(out["mode"], "prepare_and_paste")
            self.assertEqual(out["text"], "hello")
            actions = [r["action"] for r in approval_manager.audit(conn)]
            self.assertIn("prepare:handoff", actions)
            self.assertNotIn("external:published", actions)

    def test_cannot_claim_without_approval(self):
        with fresh_db() as conn:
            aid = approval_manager.draft(conn, action_type="publish_post",
                                         subject="s", payload="p")
            with self.assertRaises(ApprovalError):
                approval_manager.claim(conn, aid)      # still a draft
            approval_manager.submit(conn, aid)
            with self.assertRaises(ApprovalError):
                approval_manager.claim(conn, aid)      # under review, not approved

    def test_approval_needs_a_named_human(self):
        with fresh_db() as conn:
            aid = approval_manager.draft(conn, action_type="publish_post",
                                         subject="s", payload="p")
            approval_manager.submit(conn, aid)
            with self.assertRaises(ApprovalError):
                approval_manager.approve(conn, aid, by="   ")

    def test_a_permit_works_exactly_once(self):
        with fresh_db() as conn:
            aid = approval_manager.draft(conn, action_type="publish_post",
                                         subject="s", payload="p")
            approval_manager.submit(conn, aid)
            approval_manager.approve(conn, aid, by="FMB")
            approval_manager.claim(conn, aid)
            with self.assertRaises(ApprovalError) as ctx:
                approval_manager.claim(conn, aid)
            self.assertIn("already been used", str(ctx.exception))

    def test_stale_approval_expires(self):
        with fresh_db() as conn:
            aid = approval_manager.draft(conn, action_type="publish_post",
                                         subject="s", payload="p")
            approval_manager.submit(conn, aid)
            approval_manager.approve(conn, aid, by="FMB")
            # backdate the decision beyond the time-to-live
            conn.execute("UPDATE approvals SET decided_at = '2020-01-01 00:00:00' WHERE id = ?",
                         (aid,))
            with self.assertRaises(ApprovalError) as ctx:
                approval_manager.claim(conn, aid)
            self.assertIn("expired", str(ctx.exception))

    def test_schema_refuses_an_unapproved_external_action(self):
        with fresh_db() as conn:
            import sqlite3
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute("INSERT INTO activity_logs (action, outcome) "
                             "VALUES ('external:published', 'ok')")

    def test_schema_refuses_published_content_without_an_approval(self):
        with fresh_db() as conn:
            import sqlite3
            with self.assertRaises(sqlite3.IntegrityError):
                conn.execute(
                    "INSERT INTO content (objective, audience, strategic_angle,"
                    " recommended_action, status) VALUES ('o','a','s','r','published')")

    def test_mcp_exposes_no_publishing_tool(self):
        from server import mcp_server
        names = {t["name"] for t in mcp_server.TOOLS}
        for forbidden in ("publish", "post_now", "send_message", "connect", "reply"):
            self.assertFalse(any(forbidden in n for n in names),
                             f"a tool matching {forbidden!r} is exposed: {names}")
        self.assertIn("approval_submit", names)


class NoCredentialIsEverWrittenDown(unittest.TestCase):

    def test_schema_has_no_credential_column(self):
        sql = (MODULE / "database/schema.sql").read_text().lower()
        for word in ("password", "token", "secret", "credential", "cookie", "api_key"):
            # allowed only where the schema explains that it does NOT store one
            for line in sql.splitlines():
                if word in line and not line.strip().startswith("--"):
                    self.fail(f"schema line looks like it stores a {word}: {line.strip()}")

    def test_redact_removes_configured_secrets(self):
        os.environ["FMB_TEST_TOKEN"] = "super-secret-value-123456"
        try:
            out = redact("authorization failed for super-secret-value-123456")
            self.assertNotIn("super-secret-value-123456", out)
            self.assertIn("[redacted:FMB_TEST_TOKEN]", out)
        finally:
            del os.environ["FMB_TEST_TOKEN"]

    def test_redact_removes_token_shaped_strings(self):
        for sample in ("Bearer abcdefghijklmnopqrst",
                       "eyJhbGciOi.eyJzdWIiOiIx.SflKxwRJSM",
                       "AQVJxxxxxxxxxxxxxxxxxx"):
            self.assertNotIn(sample, redact(f"failed with {sample}"))

    def test_logged_detail_is_redacted_on_the_way_in(self):
        os.environ["FMB_TEST_TOKEN"] = "leaky-token-abcdef123456"
        try:
            with fresh_db() as conn:
                with db.transaction(conn):
                    db.log(conn, "test", detail="sent with leaky-token-abcdef123456")
                stored = db.rows(conn, "SELECT detail FROM activity_logs")[0]["detail"]
                self.assertNotIn("leaky-token-abcdef123456", stored)
        finally:
            del os.environ["FMB_TEST_TOKEN"]

    def test_capability_reports_presence_not_value(self):
        os.environ["LINKEDIN_ACCESS_TOKEN"] = "a-real-looking-token-value"
        try:
            report = json.dumps(linkedin_client.capability())
            self.assertIn("mode_2_official_api_available", report)
            self.assertNotIn("a-real-looking-token-value", report,
                             "capability must report state, never a credential")
        finally:
            del os.environ["LINKEDIN_ACCESS_TOKEN"]


class MemoryTellsTheTruth(unittest.TestCase):

    def test_unfilled_fields_are_reported_not_hidden(self):
        health = knowledge_search.memory_health()
        self.assertGreater(health["unfilled_fields_total"], 0,
                           "the memory should still be openly incomplete, not quietly filled in")
        self.assertIn("need", health["verdict"])

    def test_search_marks_unconfirmed_passages(self):
        results = knowledge_search.search("SENZ Strategic Communications", limit=3)
        self.assertTrue(results, "the project context should be retrievable")
        unconfirmed = [r for r in results if r["confidence"] == "unconfirmed"]
        self.assertTrue(unconfirmed, "a section full of [TO CONFIRM] must not read as confirmed")
        self.assertIn("caution", unconfirmed[0])

    def test_verified_facts_are_retrievable_and_confirmed(self):
        results = knowledge_search.search("book pocketbook price shipping", limit=5)
        self.assertTrue(any(r["confidence"] == "confirmed" for r in results))

    def test_the_legend_is_not_counted_as_an_unfilled_field(self):
        """Each file's header explains the marker using the marker itself.

        Counting that made a fully-answered file still read as needing FMB, which
        would have trained her to ignore the one signal that matters.
        """
        from server.knowledge_search import PLACEHOLDER, _prose
        raw = (MODULE / "memory/FMB_CORE_MEMORY.md").read_text()
        self.assertGreater(len(PLACEHOLDER.findall(raw)),
                           len(PLACEHOLDER.findall(_prose(raw))),
                           "the header legend should be excluded from the count")
        health = knowledge_search.memory_health()
        legend_only = [f for f in health["files"]
                       if f["file"] == "content_agent.md" and f["unfilled_fields"] > 0]
        self.assertFalse(legend_only,
                         "an agent brief with no real gaps must not report unfilled fields")

    def test_brief_states_what_is_missing(self):
        out = knowledge_search.brief("Cognita Institute")
        self.assertGreaterEqual(out["unconfirmed_count"], 1)
        self.assertIn("instead of inventing", out["instruction"])

    def test_every_promised_file_exists(self):
        expected = {
            "memory": ["FMB_CORE_MEMORY.md", "FMB_LINKEDIN_AGENT.md", "FMB_PROJECT_CONTEXT.md",
                       "FMB_COMMUNITY_IMPACT.md", "FMB_DECISION_FRAMEWORK.md",
                       "FMB_SECURITY_AND_APPROVAL.md", "FMB_CONTENT_ENGINE.md",
                       "FMB_LEAD_GENERATION_ENGINE.md", "FMB_ANALYTICS_ENGINE.md",
                       "FMB_AUTOMATION_WORKFLOWS.md"],
            "agents": ["content_agent.md", "research_agent.md", "engagement_agent.md",
                       "opportunity_agent.md", "reputation_agent.md"],
            "server": ["mcp_server.py", "knowledge_search.py", "approval_manager.py",
                       "linkedin_client.py"],
            "database": ["schema.sql"],
            "workflows": ["approval_workflow.md", "publishing_workflow.md",
                          "reporting_workflow.md"],
            "dashboard": ["approval-center.html", "content-calendar.html", "crm.html",
                          "analytics.html"],
        }
        for folder, names in expected.items():
            for name in names:
                self.assertTrue((MODULE / folder / name).is_file(),
                                f"missing {folder}/{name}")


class ContentKeepsItsShape(unittest.TestCase):

    def test_prepare_flags_a_post_that_would_be_truncated(self):
        prepared = linkedin_client.prepare_post("x" * 400)
        self.assertTrue(any("feed shows" in w for w in prepared.warnings))
        self.assertTrue(prepared.truncated_preview.endswith("…"))

    def test_prepare_flags_an_over_length_post(self):
        prepared = linkedin_client.prepare_post("y" * 3200)
        self.assertTrue(any("over LinkedIn's" in w for w in prepared.warnings))

    def test_prepare_flags_hashtag_stuffing(self):
        prepared = linkedin_client.prepare_post("A point. " + " ".join(f"#t{i}" for i in range(8)))
        self.assertTrue(any("hashtags" in w for w in prepared.warnings))

    def test_prepare_never_claims_to_have_posted(self):
        out = linkedin_client.prepare_post("Hello.").as_dict()
        self.assertIn("Nothing here posts on your behalf", out["how_to_use"])

    def test_opportunity_scores_are_derived_not_stored(self):
        with fresh_db() as conn:
            conn.execute(
                "INSERT INTO opportunities (title, score_relevance, score_alignment,"
                " score_value, score_timing, score_rationale)"
                " VALUES ('Talk', 5, 4, 3, 2, 'why')")
            row = db.one(conn, "SELECT total FROM opportunity_scores WHERE title = 'Talk'")
            self.assertEqual(row["total"], 14)

    def test_zero_alignment_vetoes_a_high_total(self):
        """A lucrative misalignment must not read as 'keep warm'."""
        with fresh_db() as conn:
            conn.execute(
                "INSERT INTO opportunities (title, score_relevance, score_alignment,"
                " score_value, score_timing, score_rationale)"
                " VALUES ('Well paid, badly aligned', 4, 0, 4, 3, 'why')")
            row = db.one(conn, "SELECT total, reading, veto FROM opportunity_scores"
                               " WHERE title = 'Well paid, badly aligned'")
            self.assertEqual(row["total"], 11, "the total is still the honest sum")
            self.assertEqual(row["reading"], "decline politely")
            self.assertIn("Alignment is zero", row["veto"])

    def test_the_reading_is_defined_once(self):
        """The dashboard must not recompute a verdict the database already gives."""
        js = (MODULE / "dashboard/app.js").read_text()
        self.assertNotIn("total >= 14", js,
                         "the dashboard is doing its own scoring and will drift from the view")
        self.assertIn("o.reading", js)

    def test_safe_defaults(self):
        self.assertFalse(settings.allow_external, "external actions must be off by default")
        self.assertTrue(settings.dry_run, "execution must be a dry run by default")
        self.assertEqual(settings.publish_mode, "prepare_and_paste",
                         "prepare-and-paste must be the default mode")


class TwoModesAndOnlyTwo(unittest.TestCase):
    """The official API path is supported and gated. Nothing unofficial exists."""

    def _official_mode(self, **extra):
        """Environment with official-API mode selected. Values are fake."""
        env = {"FMB_PUBLISH_MODE": "official_linkedin_api",
               "FMB_ALLOW_EXTERNAL": "1", "FMB_EXECUTE_FOR_REAL": "1",
               "LINKEDIN_CLIENT_ID": "test-app", "LINKEDIN_ACCESS_TOKEN": "test-token",
               "LINKEDIN_SCOPES": "w_member_social", "LINKEDIN_AUTHOR_URN": "urn:li:person:TEST"}
        env.update(extra)
        return env

    def test_official_mode_lists_what_is_outstanding(self):
        from server import config
        with unittest.mock.patch.dict(os.environ,
                                      {"FMB_PUBLISH_MODE": "official_linkedin_api"}, clear=False):
            with unittest.mock.patch.object(config, "settings", config.Settings.from_env()), \
                 unittest.mock.patch.object(linkedin_client, "settings", config.Settings.from_env()):
                ready = linkedin_client.readiness()
        self.assertFalse(ready["can_publish_via_api"])
        joined = " ".join(ready["outstanding"])
        self.assertIn("LINKEDIN_CLIENT_ID", joined)
        self.assertIn("w_member_social", joined)

    def test_official_mode_refuses_when_permission_is_not_declared(self):
        from server import config
        env = self._official_mode(LINKEDIN_SCOPES="r_liteprofile")
        with unittest.mock.patch.dict(os.environ, env, clear=False):
            fresh = config.Settings.from_env()
            with unittest.mock.patch.object(linkedin_client, "settings", fresh), \
                 fresh_db() as conn:
                aid = approval_manager.draft(conn, action_type="publish_post",
                                             subject="s", payload="p")
                approval_manager.submit(conn, aid)
                approval_manager.approve(conn, aid, by="FMB")
                permit = approval_manager.claim(conn, aid)
                with self.assertRaises(linkedin_client.LinkedInError) as ctx:
                    linkedin_client.publish(conn, permit)
                self.assertIn("w_member_social", str(ctx.exception))

    def test_official_mode_still_needs_an_approval(self):
        """Every gate open is not enough; the per-action permit is separate."""
        from server import config
        with unittest.mock.patch.dict(os.environ, self._official_mode(), clear=False):
            fresh = config.Settings.from_env()
            with unittest.mock.patch.object(linkedin_client, "settings", fresh):
                self.assertTrue(linkedin_client.readiness()["can_publish_via_api"])
                with fresh_db() as conn:
                    aid = approval_manager.draft(conn, action_type="publish_post",
                                                 subject="s", payload="p")
                    approval_manager.submit(conn, aid)
                    # never approved, so no permit can be claimed
                    with self.assertRaises(ApprovalError):
                        approval_manager.claim(conn, aid)

    def test_official_mode_publishes_only_through_the_official_endpoint(self):
        from server import config
        seen = {}

        def fake_call(token, permit):
            seen["token_used"] = bool(token)
            seen["payload"] = permit.payload
            return {"status": 201, "id": "urn:li:share:TEST"}

        with unittest.mock.patch.dict(os.environ, self._official_mode(), clear=False):
            fresh = config.Settings.from_env()
            with unittest.mock.patch.object(linkedin_client, "settings", fresh), \
                 unittest.mock.patch.object(linkedin_client, "_call_linkedin", fake_call), \
                 fresh_db() as conn:
                aid = approval_manager.draft(conn, action_type="publish_post",
                                             subject="s", payload="the approved text")
                approval_manager.submit(conn, aid)
                approval_manager.approve(conn, aid, by="FMB")
                permit = approval_manager.claim(conn, aid)
                out = linkedin_client.publish(conn, permit)
                self.assertTrue(out["sent"])
                self.assertEqual(out["mode"], "official_linkedin_api")
                self.assertEqual(seen["payload"], "the approved text")
                actions = [r["action"] for r in approval_manager.audit(conn)]
                self.assertIn("external:published", actions)

    def test_unofficial_credentials_are_refused_loudly(self):
        for marker in ("LI_AT", "LINKEDIN_COOKIE", "LINKEDIN_SESSION_COOKIE"):
            with unittest.mock.patch.dict(os.environ, {marker: "fake-session-value"}, clear=False):
                with self.assertRaises(linkedin_client.UnofficialAutomationRefused,
                                       msg=f"{marker} did not trigger a refusal"):
                    linkedin_client._refuse_unofficial()

    def test_no_unofficial_automation_exists_in_the_source(self):
        """A source scan, so a future edit cannot quietly add a cookie path."""
        banned = ("li_at=", "JSESSIONID", "voyager", "selenium", "playwright",
                  "puppeteer", "webdriver", "Cookie:")
        for path in (MODULE / "server").glob("*.py"):
            text = path.read_text()
            for token in banned:
                # UNOFFICIAL_MARKERS names the variables it refuses; that is the
                # one legitimate place these words may appear.
                for line in text.splitlines():
                    if token.lower() in line.lower() and "UNOFFICIAL_MARKERS" not in text[
                            max(0, text.find(line) - 400):text.find(line) + 200]:
                        self.fail(f"{path.name} mentions {token!r}: {line.strip()[:90]}")

    def test_readiness_reports_presence_not_values(self):
        from server import config
        with unittest.mock.patch.dict(os.environ, self._official_mode(), clear=False):
            fresh = config.Settings.from_env()
            with unittest.mock.patch.object(linkedin_client, "settings", fresh):
                report = json.dumps(linkedin_client.readiness())
        self.assertNotIn("test-token", report)
        self.assertNotIn("test-app", report)


if __name__ == "__main__":
    unittest.main(verbosity=2)
