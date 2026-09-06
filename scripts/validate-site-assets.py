#!/usr/bin/env python3
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
ERRORS = []

for path in sorted((ROOT / 'assets' / 'img').glob('*.webp')):
    data = path.read_bytes()
    if len(data) < 12 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
        ERRORS.append(f'invalid WebP binary: {path.relative_to(ROOT)}')

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

webp_count = len(list((ROOT / 'assets' / 'img').glob('*.webp')))
print(
    f'Asset validation passed: {webp_count} WebP files valid; '
    'HTML local references resolve.'
)
