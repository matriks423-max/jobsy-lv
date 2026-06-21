#!/usr/bin/env python3
"""
Volko Engineering – v2 designs.
Philosophy: image is the hero, text is minimal (logo + ≤5 words + CTA).
Pipeline: download photo → embed base64 in SVG → Inkscape → PNG
"""

import base64, io, os, subprocess, urllib.request
from PIL import Image, ImageFilter

OUT = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1080

GOLD  = "#C9A84C"
DARK  = "#0D0D0D"
WHITE = "#FFFFFF"
CREAM = "#F5F0E8"

FONT_BLACK  = os.path.join(OUT, "Montserrat-Black.ttf")
FONT_BOLD   = os.path.join(OUT, "Montserrat-Bold.ttf")
FONT_LIGHT  = os.path.join(OUT, "Montserrat-Light.ttf")
FONT_REG    = os.path.join(OUT, "Montserrat-Regular.ttf")

# ── Photo helpers ─────────────────────────────────────────────────────────────

def fetch_photo(url: str, size=(W, H), brightness=1.0) -> str:
    """Download photo, resize to square, return base64 PNG data-URI."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    # centre-crop to square
    iw, ih = img.size
    side = min(iw, ih)
    img = img.crop(((iw-side)//2, (ih-side)//2, (iw+side)//2, (ih+side)//2))
    img = img.resize(size, Image.LANCZOS)
    if brightness != 1.0:
        from PIL import ImageEnhance
        img = ImageEnhance.Brightness(img).enhance(brightness)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def render_svg(svg_src: str, out_png: str):
    """Write SVG to temp file, render to PNG with Inkscape (1080×1080)."""
    tmp = out_png.replace(".png", "_tmp.svg")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(svg_src)
    result = subprocess.run(
        ["inkscape", tmp,
         f"--export-filename={out_png}",
         f"--export-width={W}",
         f"--export-height={H}",
         "--export-area-page"],
        capture_output=True, text=True, timeout=60
    )
    os.remove(tmp)
    if result.returncode != 0:
        raise RuntimeError(f"Inkscape failed:\n{result.stderr}")
    print(f"  ✓  {os.path.basename(out_png)}")


# ── SVG building blocks ───────────────────────────────────────────────────────

def volko_logo(x, y, icon=48, text_color=GOLD):
    """Returns SVG <g> for the Volko Engineering logo."""
    tx = x + icon + 12
    return f"""
  <g id="logo">
    <!-- building icon -->
    <rect x="{x+17}" y="{y+8}" width="10" height="{icon-10}" fill="{GOLD}"/>
    <rect x="{x+5}"  y="{y+16}" width="9"  height="{icon-18}" fill="{GOLD}" opacity="0.7"/>
    <rect x="{x+29}" y="{y+12}" width="9"  height="{icon-14}" fill="{GOLD}" opacity="0.85"/>
    <rect x="{x+20}" y="{y+2}"  width="4"  height="8"          fill="{GOLD}"/>
    <!-- windows -->
    <rect x="{x+20}" y="{y+14}" width="4" height="3" fill="{DARK}" opacity="0.5"/>
    <rect x="{x+20}" y="{y+21}" width="4" height="3" fill="{DARK}" opacity="0.5"/>
    <!-- label -->
    <text x="{tx}" y="{y+17}" font-family="Montserrat,sans-serif" font-weight="700"
          font-size="11" letter-spacing="3" fill="{text_color}">VOLKO</text>
    <text x="{tx}" y="{y+32}" font-family="Montserrat,sans-serif" font-weight="700"
          font-size="11" letter-spacing="3" fill="{text_color}">ENGINEERING</text>
  </g>"""


def cta_button(x, y, w, h, text, bg=GOLD, fg=DARK, font_size=20):
    return f"""
  <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{bg}"/>
  <text x="{x + w//2}" y="{y + h//2 + 7}" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="{font_size}" letter-spacing="2" fill="{fg}">{text}  →</text>"""


def gold_bar_top(height=6):
    return f'<rect x="0" y="0" width="{W}" height="{height}" fill="{GOLD}"/>'


def website_tag(y=1058, color="rgba(255,255,255,0.4)"):
    return f"""
  <text x="{W//2}" y="{y}" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="400"
        font-size="15" letter-spacing="1" fill="{color}">volkoengineering.com</text>"""


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 1 — "The Silent Risk"
# Hero: stunning modern house at dusk, almost nothing on it.
# One question appears at the bottom. That's it.
# Emotional logic: You see a beautiful home → you fear for it.
# ─────────────────────────────────────────────────────────────────────────────
def design1():
    print("\nDesign 1 – The Silent Risk")
    photo = fetch_photo(
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1080&q=90",
        brightness=0.72
    )

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- HERO PHOTO -->
  <image href="{photo}" x="0" y="0" width="{W}" height="{H}"
         preserveAspectRatio="xMidYMid slice"/>

  <!-- Bottom gradient: transparent → very dark -->
  <defs>
    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0"/>
      <stop offset="45%"  stop-color="{DARK}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.96"/>
    </linearGradient>
    <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{GOLD}"/>
      <stop offset="100%" stop-color="#8B6914"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#grad1)"/>

  <!-- Gold left accent bar -->
  <rect x="0" y="0" width="7" height="{H}" fill="url(#goldBar)"/>

  <!-- Logo top-left -->
  {volko_logo(52, 48)}

  <!-- FREE badge top-right -->
  <rect x="848" y="42" width="192" height="40"
        fill="none" stroke="{GOLD}" stroke-width="2"/>
  <text x="944" y="68" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="12" letter-spacing="3" fill="{GOLD}">BEZMAKSAS</text>

  <!-- Main headline – bottom third, almost nothing else -->
  <text x="54" y="830"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="94" fill="{WHITE}" letter-spacing="-2">Vai Tava</text>
  <text x="54" y="930"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="94" fill="{WHITE}" letter-spacing="-2">māja ir</text>
  <!-- "legāla?" in gold -->
  <text x="54" y="1030"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="94" fill="{GOLD}" letter-spacing="-2">legāla?</text>

  <!-- Thin gold rule between lines 2 and 3 -->
  <rect x="54" y="944" width="680" height="3" fill="{GOLD}" opacity="0.8"/>

  <!-- CTA bottom-right -->
  <rect x="740" y="960" width="294" height="58" fill="{GOLD}"/>
  <text x="887" y="994" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="16" letter-spacing="1.5" fill="{DARK}">Uzzināt tagad  →</text>

  <!-- Website -->
  {website_tag()}

</svg>"""

    render_svg(svg, os.path.join(OUT, "volko_v2_design1.png"))


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 2 — "Before They Find Out"
# Full-bleed cinematic aerial / neighbourhood shot.
# Dark overlay. Centre: one massive word + subline. Pure mood.
# Emotional logic: scale of the image = scale of the risk.
# ─────────────────────────────────────────────────────────────────────────────
def design2():
    print("\nDesign 2 – Before They Find Out")
    photo = fetch_photo(
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1080&q=90",
        brightness=0.55
    )

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- HERO PHOTO -->
  <image href="{photo}" x="0" y="0" width="{W}" height="{H}"
         preserveAspectRatio="xMidYMid slice"/>

  <!-- Full dark vignette + centre overlay -->
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.75"/>
    </radialGradient>
    <linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.7"/>
      <stop offset="30%"  stop-color="{DARK}" stop-opacity="0.1"/>
      <stop offset="65%"  stop-color="{DARK}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.85"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#vignette)"/>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#topGrad)"/>

  <!-- TOP gold strip -->
  <rect x="0" y="0" width="{W}" height="5" fill="{GOLD}"/>

  <!-- Logo centred top -->
  {volko_logo(W//2 - 60, 38)}

  <!-- CENTRE STATEMENT — very large, cinematic -->
  <!-- "Uzzini" small label -->
  <text x="{W//2}" y="420" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="26" letter-spacing="12" fill="{GOLD}" opacity="0.9">UZZINI PIRMS</text>

  <!-- HUGE words -->
  <text x="{W//2}" y="560" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="148" letter-spacing="-4" fill="{WHITE}">VIŅI</text>
  <text x="{W//2}" y="700" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="148" letter-spacing="-4" fill="{GOLD}">UZZINA.</text>

  <!-- short rule -->
  <rect x="{W//2 - 50}" y="726" width="100" height="3" fill="{GOLD}"/>

  <!-- one-line sub -->
  <text x="{W//2}" y="772" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="22" letter-spacing="1" fill="rgba(255,255,255,0.65)">Banka. Pircējs. Tiesa.</text>

  <!-- BOTTOM CTA band -->
  <rect x="0" y="940" width="{W}" height="90" fill="{GOLD}"/>
  <text x="{W//2}" y="991" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="22" letter-spacing="2" fill="{DARK}">Saņem bezmaksas izvērtējumu  →</text>
  <text x="{W//2}" y="1018" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="400"
        font-size="14" letter-spacing="1" fill="rgba(0,0,0,0.5)">volkoengineering.com</text>

</svg>"""

    render_svg(svg, os.path.join(OUT, "volko_v2_design2.png"))


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 3 — "The Three Judges"
# Split: 60% left = beautiful warm home photo; 40% right = dark panel.
# Right panel: three icons (bank / buyer / court) stacked vertically.
# Text minimal — the icons carry the message.
# Emotional logic: contrast between the dream home and the three threats.
# ─────────────────────────────────────────────────────────────────────────────
def design3():
    print("\nDesign 3 – The Three Judges")
    photo = fetch_photo(
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=90",
        size=(648, 1080),
        brightness=0.80
    )

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">

  <defs>
    <!-- left photo gradient: slightly darken top & bottom edges -->
    <linearGradient id="photoGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.45"/>
      <stop offset="25%"  stop-color="{DARK}" stop-opacity="0.05"/>
      <stop offset="75%"  stop-color="{DARK}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.6"/>
    </linearGradient>
    <!-- right panel gradient -->
    <linearGradient id="panelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#111111"/>
      <stop offset="100%" stop-color="#0a0a0a"/>
    </linearGradient>
  </defs>

  <!-- LEFT: home photo -->
  <image href="{photo}" x="0" y="0" width="648" height="{H}"
         preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="648" height="{H}" fill="url(#photoGrad)"/>

  <!-- Gold vertical separator -->
  <rect x="644" y="0" width="6" height="{H}" fill="{GOLD}"/>

  <!-- RIGHT: dark panel -->
  <rect x="650" y="0" width="430" height="{H}" fill="url(#panelGrad)"/>

  <!-- Logo top of right panel -->
  {volko_logo(686, 52)}

  <!-- Gold top strip (right panel only) -->
  <rect x="650" y="0" width="430" height="5" fill="{GOLD}"/>

  <!-- "KAS ATKLĀJ PIRMIE?" label -->
  <text x="686" y="174"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="12" letter-spacing="4" fill="{GOLD}">KAS ATKLĀJ PIRMIE?</text>

  <!-- THREE THREAT BLOCKS -->
  <!-- Block 1: BANKA -->
  <rect x="686" y="196" width="4" height="84" fill="{GOLD}"/>
  <!-- bank icon SVG path -->
  <text x="704" y="232"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="36" fill="{WHITE}">BANKA</text>
  <text x="704" y="262"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.5)">atteic kredītu</text>

  <rect x="686" y="290" width="344" height="1" fill="{GOLD}" opacity="0.25"/>

  <!-- Block 2: PIRCĒJS -->
  <rect x="686" y="306" width="4" height="84" fill="{GOLD}"/>
  <text x="704" y="342"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="36" fill="{WHITE}">PIRCĒJS</text>
  <text x="704" y="372"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.5)">atkāpjas no darījuma</text>

  <rect x="686" y="400" width="344" height="1" fill="{GOLD}" opacity="0.25"/>

  <!-- Block 3: TIESA -->
  <rect x="686" y="416" width="4" height="84" fill="{GOLD}"/>
  <text x="704" y="452"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="36" fill="{WHITE}">TIESA</text>
  <text x="704" y="482"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.5)">pieprasa nojaukšanu</text>

  <rect x="686" y="510" width="344" height="1" fill="{GOLD}" opacity="0.3"/>

  <!-- PAYOFF HEADLINE — large, bottom of right panel -->
  <text x="686" y="600"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="52" fill="{WHITE}" letter-spacing="-1">Uzzini</text>
  <text x="686" y="660"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="52" fill="{WHITE}" letter-spacing="-1">pirms viņi</text>
  <text x="686" y="720"
        font-family="Montserrat,sans-serif" font-weight="900"
        font-size="52" fill="{GOLD}" letter-spacing="-1">uzzina.</text>

  <!-- rule -->
  <rect x="686" y="738" width="80" height="3" fill="{GOLD}"/>

  <!-- sub-line -->
  <text x="686" y="778"
        font-family="Montserrat,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.55)">Bezmaksas. Konfidenciāli. 48h.</text>

  <!-- CTA -->
  <rect x="686" y="820" width="344" height="60" fill="{GOLD}"/>
  <text x="858" y="856" text-anchor="middle"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="16" letter-spacing="1" fill="{DARK}">Izvērtēt īpašumu  →</text>

  <!-- left panel: logo bottom-left + question -->
  <text x="48" y="1032"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="22" fill="{WHITE}">Vai Tava māja</text>
  <text x="48" y="1062"
        font-family="Montserrat,sans-serif" font-weight="700"
        font-size="22" fill="{GOLD}">ir juridiski sakārtota?</text>

</svg>"""

    render_svg(svg, os.path.join(OUT, "volko_v2_design3.png"))


if __name__ == "__main__":
    design1()
    design2()
    design3()
    print("\nAll 3 designs done.")
