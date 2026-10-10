#!/usr/bin/env python3
"""Prepare assets for davaii-site: circular portrait + subsetted Abar fonts."""
import base64, subprocess, sys
from PIL import Image, ImageDraw, ImageOps

SCRATCH = "/root/.hermes/cache/scratch/davaii-site"
FONTDIR = "/usr/share/fonts/truetype/abar"

# ---- 1. Circular portrait crop (centered on face) ----
src = Image.open("/root/.hermes/cache/images/img_de579c942823.jpg").convert("RGB")
w, h = src.size
# face is centered horizontally, mid-top vertically; keep generous top margin
scale = 3  # upscale for smooth circle edge
side = int(min(w, h) * 0.98)
cx, cy = w // 2, int(h * 0.44)
left = max(0, cx - side // 2); top = max(0, cy - side // 2)
img = src.crop((left, top, left + side, top + side)).resize((side*scale, side*scale), Image.LANCZOS)

# subtle auto-contrast + slight sharpen for the low-res source
img = ImageOps.autocontrast(img, cutoff=1)
from PIL import ImageFilter
img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=3))

# square JPEG — circle is done via CSS border-radius (much smaller file)
img = img.resize((720, 720), Image.LANCZOS)
img.save(f"{SCRATCH}/portrait.jpg", "JPEG", quality=85, optimize=True)
print("portrait.jpg", img.size)

# ---- 2. Subset Abar fonts (latin + arabic + persian glyphs actually used) ----
SUBS = {
    "abarmid-regular": f"{FONTDIR}/AbarMidFaNum-Regular.ttf",
    "abarmid-semibold": f"{FONTDIR}/AbarMidFaNum-SemiBold.ttf",
    "abarmid-black": f"{FONTDIR}/AbarMidFaNum-Black.ttf",
}
# Collect every character in the final HTML
html = open(f"{SCRATCH}/index.html", encoding="utf-8").read()
# base64 blobs may not be in yet; add full alphabet ranges anyway
chars = set(html) | set("ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی۰۱۲۳۴۵۶۷۸۹0123456789")
chars = {c for c in chars if c.isprintable() or c in "\n\t"}
unicodes = ",".join(f"U+{ord(c):04X}" for c in sorted(chars))
open(f"{SCRATCH}/unicodes.txt", "w").write(unicodes)
for name, path in SUBS.items():
    out = f"{SCRATCH}/{name}.woff2"
    subprocess.run([sys.executable, "-m", "fontTools.subset", path,
        f"--unicodes={unicodes}", "--flavor=woff2", f"--output-file={out}",
        "--layout-features=*", "--no-hinting", "--desubroutinize"], check=True)
    print(name, "subset ok")
print("unicodes count:", len(chars))
