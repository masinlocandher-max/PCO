#!/usr/bin/env python3
import os
import subprocess
import sys
from pathlib import Path

START = "CV_LOCK_START"
END = "CV_LOCK_END"

LOCKED_FILES = {
    "cv.html",
    "assets/img/book-author-approved.jpeg",
    "assets/img/education-graduation.webp",
    "assets/img/service-01.webp",
    "assets/img/service-02.webp",
    "assets/img/service-03.webp",
    "assets/img/service-04.webp",
    "assets/img/talent-keynote.webp",
    "assets/img/work-desk.webp",
    "assets/img/work-field.webp",
    "assets/img/work-press.webp",
    "assets/img/work-media.webp",
}

def git(*args):
    return subprocess.run(["git", *args], check=True, text=True, capture_output=True).stdout

def show(ref, path):
    try:
        return git("show", f"{ref}:{path}")
    except subprocess.CalledProcessError:
        return None

def extract(text):
    if text is None or START not in text or END not in text:
        return None
    a = text.index(START)
    b = text.index(END) + len(END)
    return text[a:b]

base = os.environ.get("BASE_SHA", "").strip()
head = os.environ.get("HEAD_SHA", "HEAD").strip() or "HEAD"

current_index = Path("index.html").read_text(encoding="utf-8")
current_block = extract(current_index)
if current_block is None:
    print("CV LOCK FAILED: lock markers are missing from index.html.")
    sys.exit(1)

if not base or base == "0" * 40:
    print("CV LOCK baseline established; no comparable base SHA.")
    sys.exit(0)

base_index = show(base, "index.html")
base_block = extract(base_index)

# First installation of the lock: the base did not yet contain lock markers.
if base_block is None:
    print("CV LOCK installed successfully.")
    sys.exit(0)

failures = []

if base_block != current_block:
    failures.append("protected CV block in index.html changed")

changed = set(git("diff", "--name-only", base, head).splitlines())
for path in sorted(LOCKED_FILES & changed):
    failures.append(f"protected file changed: {path}")

if failures:
    print("CV LOCK FAILED:")
    for item in failures:
        print(f" - {item}")
    print("Explicit owner authorization is required before changing the CV.")
    sys.exit(1)

print("CV LOCK passed: protected CV content is unchanged.")
