#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []

RASTER_SIGNATURES = {
    '.webp': lambda d: len(d) >= 12 and d[:4] == b'RIFF' and d[8:12] == b'WEBP',
    '.jpg': lambda d: len(d) >= 3 and d[:3] == b'\xff\xd8\xff',
    '.jpeg': lambda d: len(d) >= 3 and d[:3] == b'\xff\xd8\xff',
    '.png': lambda d: len(d) >= 8 and d[:8] == b'\x89PNG\r\n\x1a\n',
    '.gif': lambda d: len(d) >= 6 and d[:6] in (b'GIF87a', b'GIF89a'),
}

raster_count = 0
for path in sorted((ROOT / 'assets' / 'img').iterdir()):
    is_valid = RASTER_SIGNATURES.get(path.suffix.lower())
    if not path.is_file() or is_valid is None:
        continue
    raster_count += 1
    if not is_valid(path.read_bytes()):
        ERRORS.append(f'not a valid {path.suffix.lstrip(".").upper()} binary: {path.relative_to(ROOT)}')

for rel in ('assets/img/portrait-hero.webp','assets/img/portrait-close.webp','assets/img/talent-stage.webp'):
    path = ROOT / rel
    if not path.is_file():
        ERRORS.append(f'missing primary CV portrait: {rel}')
    elif path.stat().st_size < 45_000:
        ERRORS.append(f'primary CV portrait is unexpectedly small: {rel} ({path.stat().st_size} bytes)')

MANUSCRIPT_FORMATS = {'.docx', '.doc', '.odt', '.rtf', '.epub', '.mobi', '.pages', '.indd', '.txt'}
TEXT_ALLOWED = {'robots.txt'}
MANUSCRIPT_WORDS = ('manuscript', 'chapter-draft', 'full-text', 'fulltext')

BOOK_ALLOWED = {
    'index.html', 'reader.html', 'offline.html', 'auth-callback.html',
    'free-access.html', 'payment-success.html',
    'landing.css', 'reader.css', 'scroll-fix.css', 'mobile-polish.css',
    'book.js', 'paymongo.js', 'reader.js', 'sw.js',
    'manifest.webmanifest',
    'app-icon-192.png', 'app-icon-512.png',
    'app-icon-maskable.png', 'app-icon-apple.png',
}

PREVIEW_WORD_CEILING = 900

# ── Private assistant containment ────────────────────────────────────────────
# linkedin-ai-assistant/ holds FMB's positioning, contacts, opportunity notes and
# unpublished drafts. GitHub Pages serves whatever the workflow stages, to anyone,
# with no authentication — so the module is private only for as long as the deploy
# keeps excluding it. This fails the build the moment that stops being true, which
# is earlier and louder than discovering it live.
PRIVATE_MODULE = 'linkedin-ai-assistant'
_workflow = ROOT / '.github' / 'workflows' / 'deploy-pages.yml'
if _workflow.is_file():
    _wf = _workflow.read_text(encoding='utf-8')
    if f"--exclude '{PRIVATE_MODULE}'" not in _wf:
        ERRORS.append(
            f'the deploy no longer excludes {PRIVATE_MODULE}/ from the published site — '
            'restore the rsync exclusion before merging, or FMB\'s private strategy and '
            'contacts go live at francinemariebautista.com'
        )
    if f'test ! -d _site/{PRIVATE_MODULE}' not in _wf:
        ERRORS.append(
            f'the deploy no longer asserts that {PRIVATE_MODULE}/ stayed out of _site — '
            'restore the staging assertion so a dropped exclusion fails the build'
        )


for path in sorted(ROOT.rglob('*')):
    if PRIVATE_MODULE in path.parts and path.suffix.lower() in {'.html', '.css', '.js'}:
        # Files inside the module are never published, so they are not checked
        # against the published-site rules below.
        continue
    if not path.is_file() or '.git/' in str(path.relative_to(ROOT)):
        continue
    rel = path.relative_to(ROOT)
    name = path.name.lower()
    if (path.suffix.lower() in MANUSCRIPT_FORMATS and rel.parts[0] != 'scripts' and path.name not in TEXT_ALLOWED):
        ERRORS.append(f'manuscript-format file would be published: {rel} — Pages serves this to anyone with the URL')
    if any(word in name for word in MANUSCRIPT_WORDS):
        ERRORS.append(f'file name suggests manuscript content: {rel} — keep the text in Drive and behind the entitlement endpoint')

# ── Every published backend endpoint must have a written contract ────────────
# The site talks to Supabase Edge Functions that this repository cannot see. The
# only leverage the repo has over them is the contract in .github/, which states
# what each one must enforce — auth, entitlement, ownership, rate limits.
#
# That leverage is worth nothing if a new endpoint can be wired into a page
# without anyone writing down what it must check. That is exactly how the reader
# ended up on book-gift-api while the contract still claimed the browser talked
# to a single function: no rule was broken, because no rule existed.
#
# So: an endpoint referenced by published code and absent from the contract fails
# the build. It does not make the endpoint safe — only the person with Supabase
# access can do that — it makes shipping one silently impossible.
#
# What this does NOT do: stop someone who is deliberately hiding an endpoint.
# 'functions/' + 'v1/name' assembles the same URL and matches nothing here, and
# no static scan of a repository can beat an author who does not want to be
# read. That is not the failure this guards against. The failure it guards
# against already happened: the ebook app shipped against a new endpoint and
# nobody wrote it down, because nothing asked them to. This asks.
CONTRACT_PATH = ROOT / '.github' / 'supabase-contract.md'
# The trailing group is optional so that a bare `functions/v1/` — the shape left
# behind when a name is concatenated on at runtime — is reported rather than
# silently matching nothing.
ENDPOINT_PATTERN = re.compile(r'functions/v1/([a-z0-9][a-z0-9-]*)?')
AUTH_PATTERN = re.compile(r'auth/v1/([a-z0-9][a-z0-9-]*)?')

def _published_files():
    """Files rsync would copy to the public site."""
    for path in sorted(ROOT.rglob('*')):
        if not path.is_file():
            continue
        parts = path.relative_to(ROOT).parts
        if parts[0] in {'.git', '.github', PRIVATE_MODULE, 'scripts'}:
            continue
        if path.suffix.lower() in {'.html', '.js', '.json', '.webmanifest'}:
            yield path

_referenced = {}
for path in _published_files():
    text = path.read_text(encoding='utf-8', errors='replace')
    for name in ENDPOINT_PATTERN.findall(text):
        key = name or '<name built at runtime>'
        _referenced.setdefault(key, set()).add(str(path.relative_to(ROOT)))
    for name in AUTH_PATTERN.findall(text):
        key = 'auth/v1/' + name if name else '<auth path built at runtime>'
        _referenced.setdefault(key, set()).add(str(path.relative_to(ROOT)))

if _referenced and not CONTRACT_PATH.is_file():
    ERRORS.append(
        'the site calls Supabase endpoints but .github/supabase-contract.md is missing — '
        'the contract is the only record of what those endpoints must enforce'
    )
elif _referenced:
    _contract = CONTRACT_PATH.read_text(encoding='utf-8')
    for name in sorted(_referenced):
        if name not in _contract:
            where = ', '.join(sorted(_referenced[name]))
            ERRORS.append(
                f'undocumented backend endpoint published: {name} (called from {where}) — '
                'add a section to .github/supabase-contract.md stating what it must verify '
                'server-side before this ships'
            )

# ── The ebook app directory, like book/, is an allowlist ─────────────────────
# Pages serves whatever is staged. book/ has been guarded this way since the
# preview shipped; ebook/ was added later and was not, which meant a stray file
# dropped in beside the reader would have gone live unreviewed.
EBOOK_ALLOWED = {
    'index.html', 'manifest.webmanifest', 'sw.js',
}
ebook_dir = ROOT / 'ebook'
if ebook_dir.is_dir():
    for path in sorted(ebook_dir.iterdir()):
        if path.is_file() and path.name not in EBOOK_ALLOWED:
            ERRORS.append(
                f'unexpected file in the published ebook directory: ebook/{path.name} — '
                'add it to EBOOK_ALLOWED only if it is meant to be public'
            )

book_dir = ROOT / 'book'
if book_dir.is_dir():
    for path in sorted(book_dir.iterdir()):
        if path.is_file() and path.name not in BOOK_ALLOWED:
            ERRORS.append(f'unexpected file in the published book directory: book/{path.name} — add it to BOOK_ALLOWED only if it is meant to be public')

reader = ROOT / 'book' / 'reader.html'
if reader.is_file():
    html = reader.read_text(encoding='utf-8')
    match = re.search(r'class="reader-prose"[^>]*>(.*?)</div>', html, re.S)
    words = len(re.sub(r'<[^>]+>', ' ', match.group(1)).split()) if match else 0
    if words > PREVIEW_WORD_CEILING:
        ERRORS.append(f'reader preview carries {words} words, over the {PREVIEW_WORD_CEILING}-word ceiling — the reader publishes a preview, not the book')

JWT_PATTERN = re.compile(rb'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}')
SECRET_MARKERS = (
    (rb'sb_secret_[A-Za-z0-9_-]{10,}', 'a Supabase secret key'),
    (rb'-----BEGIN [A-Z ]*PRIVATE KEY-----', 'a private key'),
    (rb'sk_live_[A-Za-z0-9]{10,}', 'a live secret API key'),
    (rb'\bsk-[A-Za-z0-9]{24,}', 'a secret API key'),
    (rb'SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["\']?[A-Za-z0-9._-]{20,}', 'an assigned service_role key'),
)
SCANNED_SUFFIXES = {'.html', '.js', '.css', '.json', '.webmanifest', '.md', '.yml', '.yaml', '.txt', '.py', '.svg'}

def jwt_role(token):
    import base64
    import json as _json
    try:
        payload = token.split(b'.')[1]
        payload += b'=' * (-len(payload) % 4)
        return _json.loads(base64.urlsafe_b64decode(payload)).get('role')
    except Exception:
        return None

for path in sorted(ROOT.rglob('*')):
    rel_text = str(path.relative_to(ROOT)) if path != ROOT else ''
    if not path.is_file() or rel_text.startswith('.git/'):
        continue
    if path.resolve() == Path(__file__).resolve():
        continue
    if path.name.startswith('.env'):
        # This rule is about publication. The private assistant module is never
        # published (see the deploy exclusion above), so its documented
        # .env.example — names with empty values — is allowed there and nowhere
        # else. A real .env is still an error anywhere, including inside it,
        # because git history is retrievable long after a deletion.
        module_example = (PRIVATE_MODULE in path.parts and path.name == '.env.example')
        if not module_example:
            ERRORS.append(f'environment file would be published: {rel_text}')
        continue
    if path.suffix.lower() not in SCANNED_SUFFIXES:
        continue
    blob = path.read_bytes()
    for marker, described in SECRET_MARKERS:
        if re.search(marker, blob):
            ERRORS.append(f'{rel_text} contains {described}')
    for token in JWT_PATTERN.findall(blob):
        role = jwt_role(token)
        if role and role != 'anon':
            ERRORS.append(f'{rel_text} contains a JWT with role "{role}" — only the anon key may ship to the browser')

class RefParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for key in ('src', 'href', 'data-full'):
            val = attrs.get(key)
            if val:
                self.refs.append(val)

for html in sorted(ROOT.rglob('*.html')):
    parser = RefParser()
    parser.feed(html.read_text(encoding='utf-8'))
    for raw in parser.refs:
        parsed = urlsplit(raw)
        if parsed.scheme or parsed.netloc or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:')):
            continue
        path = parsed.path
        if path.startswith('/') or not path or path.endswith('/'):
            continue
        target = (html.parent / path).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            continue
        if not target.exists():
            ERRORS.append(f'{html.relative_to(ROOT)} references missing local file: {raw}')

if ERRORS:
    print('Asset validation failed:', file=sys.stderr)
    for err in ERRORS:
        print(f' - {err}', file=sys.stderr)
    raise SystemExit(1)

print(f'Asset validation passed: {raster_count} image files valid; HTML local references resolve; no manuscript or secret content published.')
