#!/usr/bin/env python3
"""
Volko Engineering – v3 designs.
Approach: synthetic cinematic backgrounds (noise + lighting + blur) rendered
with Pillow, then crisp SVG text/shapes composited on top via CairoSVG.
Images are the hero; text is minimal.
"""

import base64, io, os, random, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import cairosvg

OUT  = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1080

GOLD       = "#C9A84C"
GOLD_RGB   = (201, 168, 76)
DARK       = "#0D0D0D"
DARK_RGB   = (13, 13, 13)
WHITE      = "#FFFFFF"
WHITE_RGB  = (255, 255, 255)
CREAM      = "#F5F0E8"
CREAM_RGB  = (245, 240, 232)
RED_RGB    = (180, 30, 30)

FONT_DIR = OUT

# ─────────────────────────────────────────────────────────────────────────────
# Background generators
# ─────────────────────────────────────────────────────────────────────────────

def make_dusk_house_bg():
    """
    Simulate a twilight architectural photograph:
    warm amber sky gradient → dark silhouetted base.
    Adds filmic grain + subtle bokeh blobs.
    """
    arr = np.zeros((H, W, 3), dtype=np.float32)

    # Sky gradient: deep indigo top → amber/orange horizon → dark ground
    for y in range(H):
        t = y / H
        if t < 0.45:
            # sky: deep navy → warm amber
            sky_t = t / 0.45
            r = 18  + sky_t * (180 - 18)
            g = 15  + sky_t * (100 - 15)
            b = 40  + sky_t * (40  - 40)
        elif t < 0.62:
            # horizon glow: amber/orange
            h_t = (t - 0.45) / 0.17
            r = 180 + h_t * (40 - 180)
            g = 100 + h_t * (45 - 100)
            b = 40  + h_t * (30 - 40)
        else:
            # ground/building: dark
            g_t = (t - 0.62) / 0.38
            r = 40  * (1 - g_t) + 8  * g_t
            g = 45  * (1 - g_t) + 8  * g_t
            b = 30  * (1 - g_t) + 8  * g_t
        arr[y, :] = [r, g, b]

    # Add architectural silhouette (house shape)
    base_y = int(H * 0.55)
    # Main house body
    arr[base_y:base_y+220, 180:750] = [22, 18, 14]
    # Roof (triangle-ish: use gradient lines)
    for dy in range(100):
        x1 = 180 + int(dy * 0.6)
        x2 = 750 - int(dy * 0.6)
        y_pos = base_y - 100 + dy
        if 0 <= y_pos < H:
            arr[y_pos, x1:x2] = np.clip(
                arr[y_pos, x1:x2] * 0.15, 0, 255
            )
    # Windows (warm glow)
    windows = [(240, base_y+40, 100, 70), (440, base_y+40, 100, 70),
               (280, base_y+140, 80, 55), (460, base_y+140, 80, 55)]
    for wx, wy, ww, wh in windows:
        arr[wy:wy+wh, wx:wx+ww] = np.clip(
            arr[wy:wy+wh, wx:wx+ww] + [180, 120, 40], 0, 255
        )
        # glow halo
        for pad in range(1, 8):
            glow_alpha = 0.08 * (8 - pad)
            y0, y1 = max(0, wy-pad), min(H, wy+wh+pad)
            x0, x1 = max(0, wx-pad), min(W, wx+ww+pad)
            arr[y0:y1, x0:x1] = np.clip(
                arr[y0:y1, x0:x1] + np.array([160, 90, 20]) * glow_alpha, 0, 255
            )

    # Bokeh blobs (out-of-focus lights)
    random.seed(42)
    blob_img = np.zeros((H, W, 3), dtype=np.float32)
    for _ in range(18):
        bx = random.randint(50, W-50)
        by = random.randint(int(H*0.3), int(H*0.6))
        br = random.randint(20, 55)
        bc = random.choice([
            [220, 160, 40], [200, 120, 30], [180, 200, 240]
        ])
        for dy in range(-br, br):
            for dx in range(-br, br):
                dist = math.sqrt(dx*dx + dy*dy)
                if dist < br:
                    alpha = (1 - dist/br) ** 2 * 0.35
                    py_, px_ = by+dy, bx+dx
                    if 0 <= py_ < H and 0 <= px_ < W:
                        blob_img[py_, px_] += np.array(bc, dtype=np.float32) * alpha

    arr = np.clip(arr + blob_img, 0, 255)

    # Film grain
    grain = np.random.normal(0, 6, (H, W, 3)).astype(np.float32)
    arr = np.clip(arr + grain, 0, 255)

    img = Image.fromarray(arr.astype(np.uint8), 'RGB')
    # Subtle blur for depth-of-field feel
    img = img.filter(ImageFilter.GaussianBlur(radius=1.2))
    return img


def make_aerial_dark_bg():
    """
    Simulate a dark aerial neighbourhood shot with warm street-light pools.
    """
    arr = np.zeros((H, W, 3), dtype=np.float32)

    # Base: very dark charcoal
    arr[:] = [14, 12, 10]

    # Simulate a grid of city blocks / rooftops
    random.seed(99)
    for row in range(12):
        for col in range(12):
            bx = col * 95 + random.randint(-10, 10)
            by = row * 95 + random.randint(-10, 10)
            bw = random.randint(50, 80)
            bh = random.randint(50, 80)
            shade = random.randint(18, 42)
            x0, y0 = max(0,bx), max(0,by)
            x1, y1 = min(W,bx+bw), min(H,by+bh)
            arr[y0:y1, x0:x1] = [shade, shade-2, shade-4]

    # Street light pools (warm amber)
    for _ in range(20):
        lx = random.randint(40, W-40)
        ly = random.randint(40, H-40)
        lr = random.randint(30, 70)
        for dy in range(-lr, lr):
            for dx in range(-lr, lr):
                dist = math.sqrt(dx*dx + dy*dy)
                if dist < lr:
                    alpha = (1 - dist/lr) ** 1.5 * 0.45
                    py_, px_ = ly+dy, lx+dx
                    if 0 <= py_ < H and 0 <= px_ < W:
                        arr[py_, px_] += np.array([200, 130, 40], np.float32) * alpha

    # Grain
    grain = np.random.normal(0, 5, (H, W, 3)).astype(np.float32)
    arr = np.clip(arr + grain, 0, 255)

    img = Image.fromarray(arr.astype(np.uint8), 'RGB')
    img = img.filter(ImageFilter.GaussianBlur(radius=2.0))
    # Darken slightly
    img = ImageEnhance.Brightness(img).enhance(0.75)
    return img


def make_warm_house_interior_bg():
    """
    Simulate a warm interior — evening light, wooden tones.
    Split: left warm amber, right cooler/darker.
    """
    arr = np.zeros((H, W, 3), dtype=np.float32)

    # Warm amber/brown base
    for y in range(H):
        t = y / H
        r = 90  + t * 30
        g = 58  + t * 20
        b = 28  + t * 10
        arr[y, :W//2+80] = [r, g, b]

    # Right side cooler
    for y in range(H):
        t = y / H
        r = 22 + t * 8
        g = 18 + t * 6
        b = 15 + t * 5
        arr[y, W//2-80:] = np.clip(
            arr[y, W//2-80:] * 0.18 + np.array([r, g, b]), 0, 255
        )

    # Wood plank texture (horizontal lines)
    for py_ in range(0, H, random.randint(18, 26)):
        darkness = random.uniform(0.88, 0.97)
        arr[py_:py_+2, :] = np.clip(arr[py_:py_+2, :] * darkness, 0, 255)

    # A bright window light source (left-centre)
    wlx, wly = 240, 380
    for dy in range(-200, 200):
        for dx in range(-150, 150):
            dist = math.sqrt((dx/150)**2 + (dy/200)**2)
            if dist < 1.0:
                alpha = (1-dist) ** 2 * 0.6
                py_, px_ = wly+dy, wlx+dx
                if 0 <= py_ < H and 0 <= px_ < W:
                    arr[py_, px_] = np.clip(
                        arr[py_, px_] + np.array([220, 180, 100]) * alpha, 0, 255
                    )

    # Grain
    grain = np.random.normal(0, 7, (H, W, 3)).astype(np.float32)
    arr = np.clip(arr + grain, 0, 255)

    img = Image.fromarray(arr.astype(np.uint8), 'RGB')
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# SVG overlay helpers
# ─────────────────────────────────────────────────────────────────────────────

def img_to_datauri(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def svg_wrap(content: str, w=W, h=H) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}"
     xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink">
{content}
</svg>"""


def render(svg: str, out_path: str):
    cairosvg.svg2png(
        bytestring=svg.encode("utf-8"),
        write_to=out_path,
        output_width=W, output_height=H
    )
    print(f"  ✓  {os.path.basename(out_path)}")


def logo_svg(x, y, color=GOLD):
    tx = x + 60
    return f"""
  <rect x="{x+17}" y="{y+8}"  width="10" height="38" fill="{color}"/>
  <rect x="{x+5}"  y="{y+18}" width="9"  height="28" fill="{color}" opacity="0.7"/>
  <rect x="{x+29}" y="{y+13}" width="9"  height="33" fill="{color}" opacity="0.85"/>
  <rect x="{x+20}" y="{y+2}"  width="4"  height="8"  fill="{color}"/>
  <rect x="{x+20}" y="{y+13}" width="4"  height="3"  fill="{DARK}" opacity="0.55"/>
  <rect x="{x+20}" y="{y+20}" width="4"  height="3"  fill="{DARK}" opacity="0.55"/>
  <text x="{tx}" y="{y+20}" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="11" letter-spacing="3.5" fill="{color}">VOLKO</text>
  <text x="{tx}" y="{y+36}" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="11" letter-spacing="3.5" fill="{color}">ENGINEERING</text>"""


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 1 — "Legāla?" — dusk house, one burning question
# ─────────────────────────────────────────────────────────────────────────────
def design1():
    print("\nDesign 1 – Legāla? (dusk house silhouette)")
    bg = make_dusk_house_bg()

    # Darken top 40% and bottom 35% heavily so text pops
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ov)
    # top gradient
    for y in range(int(H * 0.42)):
        a = int(180 * (1 - y / (H * 0.42)))
        draw.line([(0, y), (W, y)], fill=(13, 13, 13, a))
    # bottom gradient
    for y in range(int(H * 0.38)):
        a = int(230 * (y / (H * 0.38)))
        yy = H - int(H * 0.38) + y
        draw.line([(0, yy), (W, yy)], fill=(13, 13, 13, a))

    base = bg.convert("RGBA")
    base = Image.alpha_composite(base, ov)
    photo_uri = img_to_datauri(base)

    svg_content = f"""
  <!-- Photo background -->
  <image href="{photo_uri}" x="0" y="0" width="{W}" height="{H}"/>

  <!-- Gold left accent bar -->
  <defs>
    <linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{GOLD}"/>
      <stop offset="60%"  stop-color="#8B6914"/>
      <stop offset="100%" stop-color="{GOLD}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="7" height="{H}" fill="url(#gbar)"/>

  <!-- Logo -->
  {logo_svg(52, 48)}

  <!-- "BEZMAKSAS IZVĒRTĒJUMS" pill badge -->
  <rect x="52" y="808" width="318" height="38" fill="{GOLD}"/>
  <text x="211" y="832" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="13" letter-spacing="2.5" fill="{DARK}">BEZMAKSAS IZVĒRTĒJUMS</text>

  <!-- HEADLINE: 3 lines, only last word in gold -->
  <text x="52" y="896"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{WHITE}">Vai Tava</text>
  <text x="52" y="998"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{WHITE}">māja ir</text>

  <!-- Gold rule under line 2 -->
  <rect x="52" y="1010" width="680" height="3" fill="{GOLD}" opacity="0.9"/>

  <!-- "legāla?" stretched across bottom -->
  <text x="52" y="1058"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{GOLD}">legāla?</text>

  <!-- CTA pill bottom-right -->
  <rect x="752" y="958" width="282" height="58" fill="{GOLD}" rx="0"/>
  <text x="893" y="993" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="16" letter-spacing="1.5" fill="{DARK}">Uzzināt tagad  →</text>

  <!-- Website -->
  <text x="{W-24}" y="{H-18}" text-anchor="end"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="14" letter-spacing="0.5" fill="rgba(255,255,255,0.35)">volkoengineering.com</text>"""

    render(svg_wrap(svg_content), os.path.join(OUT, "volko_v3_design1.png"))


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 2 — "Uzzini pirms viņi uzzina." — aerial dark city, huge cinematic type
# ─────────────────────────────────────────────────────────────────────────────
def design2():
    print("\nDesign 2 – Uzzini pirms viņi uzzina (aerial night city)")
    bg = make_aerial_dark_bg()

    # Strong vignette to focus centre
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(ov)
    cx, cy = W // 2, H // 2
    for r in range(max(W, H), 0, -1):
        dist = r / max(W, H)
        if dist > 0.35:
            a = int(min(255, (dist - 0.35) / 0.65 * 200))
            draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(13, 13, 13, a), width=2)

    # Gradient bars top/bottom
    for y in range(int(H * 0.22)):
        a = int(210 * (1 - y / (H * 0.22)))
        draw.line([(0, y), (W, y)], fill=(13, 13, 13, a))
    for y in range(int(H * 0.22)):
        a = int(240 * (y / (H * 0.22)))
        yy = H - int(H * 0.22) + y
        draw.line([(0, yy), (W, yy)], fill=(13, 13, 13, a))

    base = bg.convert("RGBA")
    base = Image.alpha_composite(base, ov)
    photo_uri = img_to_datauri(base)

    svg_content = f"""
  <image href="{photo_uri}" x="0" y="0" width="{W}" height="{H}"/>

  <!-- TOP GOLD STRIP -->
  <rect x="0" y="0" width="{W}" height="6" fill="{GOLD}"/>
  <rect x="0" y="{H-6}" width="{W}" height="6" fill="{GOLD}"/>

  <!-- Logo centred top -->
  {logo_svg(W//2 - 75, 32)}

  <!-- "UZZINI PIRMS" — spaced label -->
  <text x="{W//2}" y="406" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="26" letter-spacing="16" fill="{GOLD}" opacity="0.85">UZZINI PIRMS</text>

  <!-- GIANT WORDS -->
  <text x="{W//2}" y="572" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="160" letter-spacing="-5" fill="{WHITE}">VIŅI</text>
  <text x="{W//2}" y="730" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="160" letter-spacing="-5" fill="{GOLD}">UZZINA.</text>

  <!-- Short divider -->
  <rect x="{W//2-55}" y="754" width="110" height="3" fill="{GOLD}"/>

  <!-- Three threats (very subtle, small) -->
  <text x="{W//2}" y="798" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="20" letter-spacing="6" fill="rgba(255,255,255,0.55)">BANKA  ·  PIRCĒJS  ·  TIESA</text>

  <!-- BOTTOM CTA BAND -->
  <rect x="0" y="920" width="{W}" height="94" fill="{GOLD}"/>
  <text x="{W//2}" y="974" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="23" letter-spacing="2" fill="{DARK}">Saņem bezmaksas izvērtējumu  →</text>
  <text x="{W//2}" y="1002" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="400"
        font-size="14" letter-spacing="1" fill="rgba(0,0,0,0.45)">volkoengineering.com</text>"""

    render(svg_wrap(svg_content), os.path.join(OUT, "volko_v3_design2.png"))


# ─────────────────────────────────────────────────────────────────────────────
# DESIGN 3 — "The Split" — warm home left, dark threat panel right
# Image is 60% of the canvas; right panel is typographic with gold accents.
# ─────────────────────────────────────────────────────────────────────────────
def design3():
    print("\nDesign 3 – The Split (warm home vs dark threat panel)")
    full_bg = make_warm_house_interior_bg()

    # Extract left 648px for the photo panel
    left_bg = full_bg.crop((0, 0, 648, H))
    # Add heavy right-edge fade to black for the split
    fade = Image.new("RGBA", (648, H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for x in range(648):
        t = x / 648
        if t > 0.7:
            a = int(((t - 0.7) / 0.3) ** 1.5 * 255)
            fd.line([(x, 0), (x, H)], fill=(13, 13, 13, a))
    # also darken top/bottom a bit
    for y in range(150):
        a = int(160 * (1 - y/150))
        fd.line([(0, y), (648, y)], fill=(13, 13, 13, a))
    for y in range(180):
        a = int(200 * (y/180))
        yy = H - 180 + y
        fd.line([(0, yy), (648, yy)], fill=(13, 13, 13, a))

    left_rgba = left_bg.convert("RGBA")
    left_rgba = Image.alpha_composite(left_rgba, fade)
    photo_uri = img_to_datauri(left_rgba)

    # Right panel: pure dark
    right_bg = Image.new("RGB", (432, H), (11, 10, 8))
    right_uri = img_to_datauri(right_bg.convert("RGBA"))

    svg_content = f"""
  <!-- RIGHT dark panel first -->
  <image href="{right_uri}" x="648" y="0" width="432" height="{H}"/>

  <!-- LEFT photo -->
  <image href="{photo_uri}" x="0" y="0" width="648" height="{H}"/>

  <!-- Gold vertical separator -->
  <rect x="644" y="0" width="6" height="{H}" fill="{GOLD}"/>

  <!-- Gold top strip (right panel) -->
  <rect x="648" y="0" width="432" height="6" fill="{GOLD}"/>

  <!-- RIGHT PANEL CONTENT -->
  <!-- Logo top-right -->
  {logo_svg(690, 36)}

  <!-- Thin divider -->
  <rect x="690" y="118" width="360" height="1" fill="{GOLD}" opacity="0.3"/>

  <!-- "KAS ATKLĀJ PIRMIE?" -->
  <text x="690" y="162"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="12" letter-spacing="4" fill="{GOLD}">KAS ATKLĀJ PIRMIE?</text>

  <!-- THREAT 1 -->
  <rect x="690" y="180" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="218" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">BANKA</text>
  <text x="712" y="248" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">atteic kredītu</text>

  <rect x="690" y="270" width="360" height="1" fill="{GOLD}" opacity="0.2"/>

  <!-- THREAT 2 -->
  <rect x="690" y="286" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="324" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">PIRCĒJS</text>
  <text x="712" y="354" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">atkāpjas no darījuma</text>

  <rect x="690" y="376" width="360" height="1" fill="{GOLD}" opacity="0.2"/>

  <!-- THREAT 3 -->
  <rect x="690" y="392" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="430" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">TIESA</text>
  <text x="712" y="460" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">pieprasa nojaukšanu</text>

  <rect x="690" y="484" width="360" height="2" fill="{GOLD}" opacity="0.35"/>

  <!-- PAYOFF — large gold headline -->
  <text x="690" y="566" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{WHITE}">Uzzini</text>
  <text x="690" y="626" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{WHITE}">pirms viņi</text>
  <text x="690" y="686" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{GOLD}">uzzina.</text>

  <rect x="690" y="704" width="84" height="3" fill="{GOLD}"/>

  <text x="690" y="746" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.5)">Bezmaksas. Konfidenciāli. 48h.</text>

  <!-- CTA -->
  <rect x="690" y="790" width="362" height="64" fill="{GOLD}"/>
  <text x="871" y="828" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="17" letter-spacing="1" fill="{DARK}">Izvērtēt īpašumu  →</text>

  <text x="690" y="894" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="14" fill="rgba(255,255,255,0.3)">volkoengineering.com</text>

  <!-- LEFT PANEL BOTTOM TEXT -->
  <text x="44" y="1028" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="24" fill="{WHITE}">Vai Tava māja ir</text>
  <text x="44" y="1062" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="24" fill="{GOLD}">juridiski sakārtota?</text>"""

    render(svg_wrap(svg_content), os.path.join(OUT, "volko_v3_design3.png"))


if __name__ == "__main__":
    design1()
    design2()
    design3()
    print("\nAll 3 designs complete.")
