#!/usr/bin/env python3
"""
Phase 16 — deterministic image pipeline.

The case artwork is authored at 1536-1672 px. That is more than any phone
needs, and far more than an evidence card on the board needs: a 1536x1024 JPEG
decodes to a 6.3 MB bitmap, and eleven of them on the wall at once is roughly
69 MB of pixel buffers for images drawn at about 150 pt.

So every master produces two shipped derivatives:

    <name>.jpg        display  - long edge 1280, quality 78, progressive
    <name>.thumb.jpg  card     - long edge 420,  quality 72, progressive

1280 px still exceeds the 1170 px physical width of an iPhone 13 and the
1440 px-class Android panels we care about once `contentFit` is applied, so
full-screen inspection loses nothing visible. The thumbnail is what the board,
the evidence index, and the montage use, and it decodes to about 0.5 MB.

Masters live in tools/source-images/ and are NOT bundled: Metro only bundles
assets that are actually `require`d. Re-run this script after adding artwork.

    python3 tools/optimize_images.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_ROOT = ROOT / "tools" / "source-images"
OUTPUT_ROOT = ROOT / "assets" / "cases"

DISPLAY_LONG_EDGE = 1280
DISPLAY_QUALITY = 78
THUMB_LONG_EDGE = 420
THUMB_QUALITY = 72


def convert(source: Path, target: Path, long_edge: int, quality: int) -> int:
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "magick",
            str(source),
            # Strip EXIF/ICC: nothing downstream reads it and it is dead bytes.
            "-strip",
            # `>` only ever shrinks, so a small master is never upscaled.
            "-resize",
            f"{long_edge}x{long_edge}>",
            "-sampling-factor",
            "4:2:0",
            "-interlace",
            "JPEG",
            "-quality",
            str(quality),
            str(target),
        ],
        check=True,
    )
    return target.stat().st_size


def main() -> int:
    if not SOURCE_ROOT.exists():
        print(f"no masters at {SOURCE_ROOT}", file=sys.stderr)
        return 1

    masters = sorted(SOURCE_ROOT.rglob("*.jpg"))
    if not masters:
        print("no masters found", file=sys.stderr)
        return 1

    before = after = 0
    for master in masters:
        relative = master.relative_to(SOURCE_ROOT)
        display = OUTPUT_ROOT / relative
        thumb = display.with_suffix(".thumb.jpg")

        master_size = master.stat().st_size
        display_size = convert(master, display, DISPLAY_LONG_EDGE, DISPLAY_QUALITY)
        thumb_size = convert(master, thumb, THUMB_LONG_EDGE, THUMB_QUALITY)

        before += master_size
        after += display_size + thumb_size
        print(
            f"{relative}  {master_size // 1024} KB"
            f"  ->  display {display_size // 1024} KB"
            f" + thumb {thumb_size // 1024} KB"
        )

    print(f"\ntotal  {before // 1024} KB  ->  {after // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
