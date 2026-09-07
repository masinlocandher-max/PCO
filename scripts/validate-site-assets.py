#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
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
    'HTML local references resolve.'
)
