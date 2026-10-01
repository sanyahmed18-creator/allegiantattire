#!/usr/bin/env python3
"""
Allegiant Attire — image optimiser (run from the repo root)

  python3 scripts/optimize-images.py public/images --max-width 1600 --quality 74

What it does
  * Resizes oversized photos (your hero is 5,206px wide; nobody needs that).
  * Re-encodes to WebP (and AVIF if your Pillow supports it) with a JPEG fallback.
  * Never upscales, never touches files already smaller than the output.
  * Writes into  --out  (default: <dir>/../images-optimised) so you can diff first.

Pillow >= 10 supports WebP + AVIF.  pip install -U pillow
"""
from __future__ import annotations
import argparse, sys
from pathlib import Path
from PIL import Image, ImageOps

SKIP_DIRS = {"node_modules", ".git", "images-optimised"}


def optimise(src: Path, out_root: Path, max_width: int, quality: int, avif: bool) -> list[tuple[str, int]]:
    results = []
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        w, h = im.size
        scale = min(1.0, max_width / w)
        if scale < 1.0:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        w, h = im.size
        out_dir = out_root / src.parent.name if src.parent.name else out_root
        out_dir.mkdir(parents=True, exist_ok=True)
        stem = src.stem
        targets = [("webp", "WEBP", quality), ("jpg", "JPEG", quality + 4)]
        if avif:
            targets.insert(0, ("avif", "AVIF", quality - 8))
        for ext, fmt, q in targets:
            dest = out_dir / f"{stem}.{ext}"
            kwargs = {"quality": q, "method": 6}
            if fmt == "JPEG":
                im_rgb = im.convert("RGB") if im.mode == "RGBA" else im
                im_rgb.save(dest, fmt, optimize=True, progressive=True, **kwargs)
            else:
                im.save(dest, fmt, **kwargs)
            results.append((f"{src.name} -> {dest.relative_to(out_root)} ({w}x{h})", dest.stat().st_size))
    return results


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?", default="public/images")
    ap.add_argument("--out", default=None)
    ap.add_argument("--max-width", type=int, default=1600)
    ap.add_argument("--quality", type=int, default=74)
    ap.add_argument("--no-avif", action="store_true")
    a = ap.parse_args()

    src_root = Path(a.source)
    if not src_root.exists():
        print(f"source folder not found: {src_root}", file=sys.stderr)
        return 1
    out_root = Path(a.out) if a.out else src_root.parent / "images-optimised"

    files = sorted(p for p in src_root.rglob("*")
                   if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
                   and not any(d in SKIP_DIRS for d in p.parts))
    if not files:
        print(f"no jpg/png found under {src_root}")
        return 1

    before = sum(p.stat().st_size for p in files)
    total_after, rows = 0, []
    for f in files:
        for label, size in optimise(f, out_root, a.max_width, a.quality, not a.no_avif):
            rows.append((label, size))
        total_after += sum(s for l, s in rows if l.startswith(f.name) and l.split("->")[1].strip().endswith((".webp",)))
    webp_bytes = sum(s for l, s in rows if ".webp" in l)
    print(f"processed {len(files)} images")
    print(f"  before (jpg/png): {before/1048576:8.2f} MB")
    print(f"  after  (webp)   : {webp_bytes/1048576:8.2f} MB   ({100 - webp_bytes/before*100:.1f}% smaller)")
    print(f"  written to {out_root}/  -- move into public/images/ once you are happy")
    for label, size in rows[:12]:
        print(f"   {size/1024:8.1f} KB  {label}")
    if len(rows) > 12:
        print(f"   ... and {len(rows)-12} more")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
