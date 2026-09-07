#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []

# Every shipped raster is checked by magic bytes, not by extension. A file that
# is named .jpg but is not a JPEG renders as a broken image in production, which
# is how two book-landing photographs reached the live site unnoticed.
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
        ERRORS.append(
            f'not a valid {path.suffix.lstrip(".").upper()} binary: '
            f'{path.relative_to(ROOT)}'
        )

for rel in (
    'assets/img/portrait-hero.webp',
    'assets/img/portrait-close.webp',
    'assets/img/talent-stage.webp',
):
    path = ROOT / rel
    if not path.is_file():
        ERRORS.append(f'missing primary CV portrait: {rel}')
    elif path.stat().st_size < 45_000:
        ERRORS.append(
            f'primary CV portrait is unexpectedly small: {rel} '
            f'({path.stat().st_size} bytes)'
        )


# ---------------------------------------------------------------------------
# Manuscript containment.
#
# GitHub Pages serves every file on the deployed branch with no authentication.
# There is no login in front of it and no way to add one, so any manuscript
# committed here is a manuscript published here — and git history keeps a
# retrievable copy even after a later deletion. This gate is the last thing
# standing between a stray file and a published book, so it fails the build
# rather than warning.
# ---------------------------------------------------------------------------

MANUSCRIPT_FORMATS = {'.docx', '.doc', '.odt', '.rtf', '.epub', '.mobi',
                      '.pages', '.indd', '.txt'}
# Plain text files the site genuinely needs to publish.
TEXT_ALLOWED = {'robots.txt'}
MANUSCRIPT_WORDS = ('manuscript', 'chapter-draft', 'full-text', 'fulltext')

# Everything the book directory is allowed to publish. Anything else is either
# a mistake or the manuscript, and both should stop the deploy.
BOOK_ALLOWED = {
    'index.html', 'reader.html', 'offline.html',
    'landing.css', 'reader.css', 'scroll-fix.css',
    'book.js', 'reader.js', 'sw.js',
    'manifest.webmanifest',
    'app-icon-192.png', 'app-icon-512.png',
    'app-icon-maskable.png', 'app-icon-apple.png',
}

# The reader publishes a free preview, not the book. 156 words ship today; the
# ceiling leaves room to extend the preview on purpose while a pasted-in
# chapter, let alone a pasted-in book, trips it immediately.
PREVIEW_WORD_CEILING = 900

for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or '.git/' in str(path.relative_to(ROOT)):
        continue
    rel = path.relative_to(ROOT)
    name = path.name.lower()

    if (path.suffix.lower() in MANUSCRIPT_FORMATS
            and rel.parts[0] != 'scripts'
            and path.name not in TEXT_ALLOWED):
        ERRORS.append(
            f'manuscript-format file would be published: {rel} — '
            'Pages serves this to anyone with the URL'
        )
    if any(word in name for word in MANUSCRIPT_WORDS):
        ERRORS.append(
            f'file name suggests manuscript content: {rel} — '
            'keep the text in Drive and behind the entitlement endpoint'
        )

book_dir = ROOT / 'book'
if book_dir.is_dir():
    for path in sorted(book_dir.iterdir()):
        if path.is_file() and path.name not in BOOK_ALLOWED:
            ERRORS.append(
                f'unexpected file in the published book directory: '
                f'book/{path.name} — add it to BOOK_ALLOWED only if it is '
                'meant to be public'
            )

reader = ROOT / 'book' / 'reader.html'
if reader.is_file():
    html = reader.read_text(encoding='utf-8')
    match = re.search(r'class="reader-prose"[^>]*>(.*?)</div>', html, re.S)
    words = len(re.sub(r'<[^>]+>', ' ', match.group(1)).split()) if match else 0
    if words > PREVIEW_WORD_CEILING:
        ERRORS.append(
            f'reader preview carries {words} words, over the '
            f'{PREVIEW_WORD_CEILING}-word ceiling — the reader publishes a '
            'preview, not the book'
        )


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
        if (
            parsed.scheme
            or parsed.netloc
            or raw.startswith(('#', 'mailto:', 'tel:', 'javascript:', 'data:'))
        ):
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
            ERRORS.append(
                f'{html.relative_to(ROOT)} references missing local file: {raw}'
            )

if ERRORS:
    print('Asset validation failed:', file=sys.stderr)
    for err in ERRORS:
        print(f' - {err}', file=sys.stderr)
    raise SystemExit(1)

print(
    f'Asset validation passed: {raster_count} image files valid; '
    'HTML local references resolve; no manuscript content published.'
)
