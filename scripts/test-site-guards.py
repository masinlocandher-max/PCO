#!/usr/bin/env python3
"""Proof that the publication guards actually bite.

A validator nobody has tried to defeat is a validator nobody knows works. Each
case here plants the exact mistake the guard exists to catch, asserts the build
fails and says why, then puts the tree back — and the last cases check that the
guards do not fire on legitimate work, which is the failure mode that gets a
guard deleted six months later.

    python3 scripts/test-site-guards.py
"""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VALIDATOR = ROOT / 'scripts' / 'validate-site-assets.py'
CONTRACT = ROOT / '.github' / 'supabase-contract.md'

results = []


def run():
    p = subprocess.run([sys.executable, str(VALIDATOR)], capture_output=True, text=True)
    return p.returncode, p.stdout + p.stderr


def case(label, *, expect_fail, expect_text=''):
    """Decorator-free helper: returns a function that records the outcome."""
    code, out = run()
    failed = code != 0
    ok = (failed == expect_fail) and (not expect_text or expect_text in out)
    results.append((label, ok, out.strip().splitlines()[:2]))
    return ok


class planted:
    """Write content into a path for the duration of the block, then restore."""

    def __init__(self, path, content, *, append=False):
        self.path, self.content, self.append = Path(path), content, append
        self.existed = self.path.exists()
        self.original = self.path.read_text() if self.existed else None

    def __enter__(self):
        self.path.write_text((self.original or '') + self.content if self.append else self.content)
        return self

    def __exit__(self, *exc):
        if self.existed:
            self.path.write_text(self.original)
        else:
            self.path.unlink(missing_ok=True)
        return False


class removed:
    """Take a file away for the duration of the block."""

    def __init__(self, path):
        self.path = Path(path)
        self.original = self.path.read_text()

    def __enter__(self):
        self.path.unlink()
        return self

    def __exit__(self, *exc):
        self.path.write_text(self.original)
        return False


# ── the tree as it stands must pass ──────────────────────────────────────────
case('a clean tree passes', expect_fail=False)

# ── ORIGINAL BYPASS: ship a backend endpoint with no written contract ────────
with planted(ROOT / 'ebook' / 'index.html',
             "\n<!-- fetch('https://x.supabase.co/functions/v1/book-secret-api') -->\n",
             append=True):
    case('an undocumented endpoint in published code fails the build',
         expect_fail=True, expect_text='book-secret-api')

# ── VARIANT: a different file type on the published site ─────────────────────
with planted(ROOT / 'ebook' / 'manifest.webmanifest',
             '{"x":"https://x.supabase.co/functions/v1/book-other-api"}'):
    case('the same trick in a webmanifest also fails',
         expect_fail=True, expect_text='book-other-api')

# ── VARIANT: a direct Supabase Auth endpoint, not an Edge Function ───────────
with planted(ROOT / 'ebook' / 'index.html',
             "\n<!-- fetch('https://x.supabase.co/auth/v1/invite') -->\n",
             append=True):
    case('an undocumented Supabase Auth endpoint fails the build',
         expect_fail=True, expect_text='auth/v1/invite')

# ── VARIANT: the attacker has read the fix and concatenates the name ─────────
# The first version of this guard matched `functions/v1/<name>` and so saw
# nothing at all when the name was glued on at runtime. A bare `functions/v1/`
# is now itself the finding.
with planted(ROOT / 'ebook' / 'index.html',
             "\n<!-- var f='functions/v1/'+'book-sneaky-api' -->\n",
             append=True):
    case('an endpoint name built at runtime is still reported',
         expect_fail=True, expect_text='built at runtime')

# ── VARIANT: the contract itself goes missing ────────────────────────────────
with removed(CONTRACT):
    case('deleting the contract fails the build', expect_fail=True,
         expect_text='supabase-contract.md')

# ── an unreviewed file dropped into the published ebook app ──────────────────
with planted(ROOT / 'ebook' / 'notes.js', '// scratch\n'):
    case('a stray file in ebook/ fails the build', expect_fail=True,
         expect_text='notes.js')

# ── LEGITIMATE WORKFLOW: these must NOT fire ─────────────────────────────────
# The private module is never published, so an endpoint named in its documentation
# is not a published endpoint. A guard that fires here would be deleted by the
# next person who touched the module, and take the real protection with it.
with planted(ROOT / 'linkedin-ai-assistant' / 'SCRATCH.md',
             'calls https://x.supabase.co/functions/v1/book-private-api\n'):
    case('an endpoint named inside the private module does not fire',
         expect_fail=False)

# A documented endpoint is exactly what the contract is for.
with planted(ROOT / 'ebook' / 'index.html',
             "\n<!-- fetch('https://x.supabase.co/functions/v1/book-api') -->\n",
             append=True):
    case('an endpoint that IS documented passes', expect_fail=False)

# ── report ───────────────────────────────────────────────────────────────────
width = max(len(label) for label, _, _ in results)
for label, ok, detail in results:
    print(f'{"ok  " if ok else "FAIL"}  {label.ljust(width)}')
    if not ok:
        for line in detail:
            print(f'        {line}')

failed = [label for label, ok, _ in results if not ok]
print()
if failed:
    print(f'{len(failed)} of {len(results)} guard checks did not behave as expected')
    sys.exit(1)
print(f'All {len(results)} guard checks behaved as expected.')
