#!/usr/bin/env python3
"""Generate 3 Volko Engineering 1080x1080 marketing title page PNGs."""

import urllib.request
import io
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

GOLD = (201, 168, 76)
GOLD_DARK = (139, 105, 20)
DARK = (13, 13, 13)
CREAM = (245, 240, 232)
WHITE = (255, 255, 255)
RED_STAMP = (200, 30, 30)

SIZE = (1080, 1080)

FONT_DIR = os.path.dirname(__file__)

def font(name, size):
    path = os.path.join(FONT_DIR, name)
    return ImageFont.truetype(path, size)

def fetch_image(url, size):
    """Download and resize an Unsplash photo."""
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=15) as r:
        data = r.read()
    img = Image.open(io.BytesIO(data)).convert('RGBA')
    # crop to square centre
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    return img.resize(size, Image.LANCZOS)


def draw_logo(draw, img, x, y, icon_size=48):
    """Draw the Volko Engineering logo (building icon + text)."""
    # Gold building icon (simplified)
    bx, by = x, y
    # tallest centre tower
    draw.rectangle([bx+18, by+8, bx+30, by+icon_size-2], fill=GOLD)
    # left wing
    draw.rectangle([bx+4, by+18, bx+16, by+icon_size-2], fill=(*GOLD[:3], 165))
    # right wing
    draw.rectangle([bx+32, by+14, bx+44, by+icon_size-2], fill=(*GOLD[:3], 200))
    # spire
    draw.rectangle([bx+22, by+2, bx+26, by+10], fill=GOLD)
    # windows
    for wy in [18, 26, 34]:
        draw.rectangle([bx+21, by+wy, bx+27, by+wy+4], fill=(0, 0, 0, 140))

    text_x = x + icon_size + 12
    fnt = font('Montserrat-Bold.ttf', 12)
    draw.text((text_x, y + 6), 'VOLKO', font=fnt, fill=GOLD)
    draw.text((text_x, y + 22), 'ENGINEERING', font=fnt, fill=GOLD)


def overlay(img, color, alpha):
    """Add a solid colour overlay at given alpha (0–255)."""
    ov = Image.new('RGBA', img.size, (*color, alpha))
    return Image.alpha_composite(img, ov)


def gradient_overlay(img, top_alpha, bottom_alpha, color=DARK):
    """Vertical gradient overlay."""
    grad = Image.new('RGBA', img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(grad)
    h = img.size[1]
    for y in range(h):
        a = int(top_alpha + (bottom_alpha - top_alpha) * y / h)
        draw.line([(0, y), (img.size[0], y)], fill=(*color, a))
    return Image.alpha_composite(img, grad)


# ─────────────────────────────────────────────────────────────
# DESIGN 1: "The Fear Question"
# Full-bleed dark house, single question, gold accent
# ─────────────────────────────────────────────────────────────
def design1():
    print("Generating Design 1: The Fear Question...")

    bg_url = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1080&q=85"
    try:
        bg = fetch_image(bg_url, SIZE)
    except Exception:
        bg = Image.new('RGBA', SIZE, (30, 28, 24, 255))

    bg = bg.convert('RGBA')
    # Darken image
    enhancer = ImageEnhance.Brightness(bg.convert('RGB'))
    bg = enhancer.enhance(0.55).convert('RGBA')
    # Gradient: lighter top, very dark bottom
    bg = gradient_overlay(bg, 60, 220)

    draw = ImageDraw.Draw(bg)

    # Gold left accent bar
    draw.rectangle([0, 0, 7, 1080], fill=GOLD)

    # Logo
    draw_logo(draw, bg, 52, 52)

    # TAG pill
    tag_font = font('Montserrat-Bold.ttf', 13)
    tag_text = 'BEZMAKSAS IZVĒRTĒJUMS'
    tag_x, tag_y = 52, 820
    tw = draw.textlength(tag_text, font=tag_font)
    draw.rectangle([tag_x, tag_y, tag_x + tw + 32, tag_y + 36], fill=GOLD)
    draw.text((tag_x + 16, tag_y + 9), tag_text, font=tag_font, fill=DARK)

    # Main headline
    h1 = font('Montserrat-Black.ttf', 100)
    h2 = font('Montserrat-Black.ttf', 100)
    gold_font = font('Montserrat-Black.ttf', 100)

    draw.text((52, 870), 'Vai Tava māja', font=h1, fill=WHITE)
    draw.text((52, 965), 'ir ', font=h2, fill=WHITE)
    # "legāla?" in gold
    legala_x = 52 + draw.textlength('ir ', font=h2)
    draw.text((legala_x, 965), 'legāla?', font=gold_font, fill=GOLD)

    # Gold divider line
    draw.rectangle([52, 960, 700, 963], fill=GOLD)

    # Sub-line
    sub = font('Montserrat-Light.ttf', 24)
    draw.text((52, 880 + 108), 'Uzzini pirms to dara banka, pircējs vai tiesa.', font=sub,
              fill=(255, 255, 255, 180))

    # Wait — let me redo layout more carefully
    # Headline at bottom third
    # Already drawn above — looks fine

    # Website
    web_font = font('Montserrat-Regular.ttf', 16)
    draw.text((1080 - 230, 1080 - 42), 'volkoengineering.com', font=web_font,
              fill=(255, 255, 255, 100))

    out = bg.convert('RGB')
    out.save('volko_design1_fear_question.png', 'PNG', quality=95)
    print("  -> volko_design1_fear_question.png")


# ─────────────────────────────────────────────────────────────
# DESIGN 2: "The Shock Statistic" — split layout
# ─────────────────────────────────────────────────────────────
def design2():
    print("Generating Design 2: The Shock Statistic...")

    canvas = Image.new('RGBA', SIZE, CREAM + (255,))
    draw = ImageDraw.Draw(canvas)

    # LEFT HALF: photo with illegal stamp
    bg_url = "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85"
    try:
        bg = fetch_image(bg_url, (540, 1080))
    except Exception:
        bg = Image.new('RGBA', (540, 1080), (40, 35, 28, 255))

    bg = bg.convert('RGBA')
    enhancer = ImageEnhance.Brightness(bg.convert('RGB'))
    bg = enhancer.enhance(0.5).convert('RGBA')
    bg = gradient_overlay(bg, 40, 200)
    canvas.paste(bg.convert('RGB'), (0, 0))

    # Re-draw over left panel
    draw = ImageDraw.Draw(canvas)

    # RED STAMP circle
    cx, cy, r = 270, 540, 130
    # Outer ring
    for offset in range(3):
        draw.ellipse([cx-r-offset, cy-r-offset, cx+r+offset, cy+r+offset],
                     outline=(*RED_STAMP, 220), width=2)
    draw.ellipse([cx-r+4, cy-r+4, cx+r-4, cy+r-4],
                 outline=(*RED_STAMP, 200), width=12)
    # NELEG ĀLS text
    stamp_font = font('Montserrat-Black.ttf', 44)
    stamp_sub = font('Montserrat-Bold.ttf', 36)
    draw.text((cx, cy - 28), 'NELE-', font=stamp_font, fill=(*RED_STAMP, 220), anchor='mm')
    draw.text((cx, cy + 28), 'GĀLS', font=stamp_font, fill=(*RED_STAMP, 220), anchor='mm')

    # Rotate stamp look (just angle the text a bit — PIL doesn't rotate easily mid-draw,
    # so we do it with a temp image)
    stamp_layer = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    sd = ImageDraw.Draw(stamp_layer)
    sd.ellipse([cx-r+4, cy-r+4, cx+r-4, cy+r-4],
               outline=(*RED_STAMP, 200), width=12)
    sd.text((cx, cy - 28), 'NELE-', font=stamp_font, fill=(*RED_STAMP, 220), anchor='mm')
    sd.text((cx, cy + 28), 'GĀLS', font=stamp_font, fill=(*RED_STAMP, 220), anchor='mm')
    stamp_layer = stamp_layer.rotate(-18, center=(cx, cy), expand=False)
    canvas = Image.alpha_composite(canvas, stamp_layer)
    draw = ImageDraw.Draw(canvas)

    # Left bottom label
    lbl = font('Montserrat-Light.ttf', 18)
    draw.text((32, 1042), 'Vai zini, ko jūsu māja slēpj?', font=lbl,
              fill=(255, 255, 255, 140))

    # Separator line
    draw.rectangle([538, 0, 542, 1080], fill=GOLD)

    # RIGHT PANEL ─────────────────────────────────────────────
    rx = 562  # right panel x start
    rpad = 40

    # BADGE
    badge_font = font('Montserrat-Bold.ttf', 11)
    badge_text = 'LATVIJAS STATISTIKA'
    bw = draw.textlength(badge_text, font=badge_font)
    draw.rectangle([rx + rpad, 58, rx + rpad + bw + 28, 94], fill=GOLD)
    draw.text((rx + rpad + 14, 68), badge_text, font=badge_font, fill=DARK)

    # BIG NUMBER  "1/3"
    big_font = font('Montserrat-Black.ttf', 210)
    draw.text((rx + rpad, 90), '1/3', font=big_font, fill=DARK)

    # Sub-number line
    sub_num = font('Montserrat-Bold.ttf', 28)
    draw.text((rx + rpad, 340), 'māju ir problemātiskas', font=sub_num, fill=GOLD)

    # Gold divider
    draw.rectangle([rx + rpad, 390, rx + 490, 393], fill=GOLD)

    # Headline
    hl = font('Montserrat-Black.ttf', 38)
    hl_light = font('Montserrat-Regular.ttf', 38)
    draw.text((rx + rpad, 414), 'Īpašnieki', font=hl, fill=DARK)
    # "nezina" in gold italic
    nezina_x = rx + rpad + draw.textlength('Īpašnieki ', font=hl)
    draw.text((nezina_x, 414), 'nezina,', font=hl, fill=GOLD)
    draw.text((rx + rpad, 462), 'kamēr nav par vēlu.', font=hl_light, fill=DARK)

    # Sub-copy
    sub_copy = font('Montserrat-Light.ttf', 18)
    draw.text((rx + rpad, 540), 'Banka, pircējs vai tiesa parasti', font=sub_copy, fill=(80, 80, 80))
    draw.text((rx + rpad, 564), 'atklāj pirmie. Saņem bezmaksas', font=sub_copy, fill=(80, 80, 80))
    draw.text((rx + rpad, 588), 'izvērtējumu — šodien.', font=sub_copy, fill=(80, 80, 80))

    # CTA button
    cta_y = 670
    draw.rectangle([rx + rpad, cta_y, rx + 490, cta_y + 64], fill=DARK)
    cta_font = font('Montserrat-Bold.ttf', 17)
    cta_text = 'Pārbaudi savu īpašumu →'
    cta_w = draw.textlength(cta_text, font=cta_font)
    draw.text((rx + rpad + (490 - rpad - cta_w) // 2, cta_y + 21), cta_text,
              font=cta_font, fill=GOLD)

    # Logo bottom right
    draw_logo(draw, canvas, rx + rpad, 780)
    web_font = font('Montserrat-Regular.ttf', 14)
    draw.text((rx + rpad, 840), 'volkoengineering.com', font=web_font, fill=(160, 155, 145))

    out = canvas.convert('RGB')
    out.save('volko_design2_shock_stat.png', 'PNG', quality=95)
    print("  -> volko_design2_shock_stat.png")


# ─────────────────────────────────────────────────────────────
# DESIGN 3: "The Consequence" — dark full-bleed, 3 pills + payoff
# ─────────────────────────────────────────────────────────────
def design3():
    print("Generating Design 3: The Consequence...")

    bg_url = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1080&q=85"
    try:
        bg = fetch_image(bg_url, SIZE)
    except Exception:
        bg = Image.new('RGBA', SIZE, (20, 18, 14, 255))

    bg = bg.convert('RGBA')
    enhancer = ImageEnhance.Brightness(bg.convert('RGB'))
    bg = enhancer.enhance(0.45).convert('RGBA')
    bg = gradient_overlay(bg, 160, 230)

    draw = ImageDraw.Draw(bg)

    # TOP gold strip
    draw.rectangle([0, 0, 1080, 6], fill=GOLD)

    # LOGO top-left
    draw_logo(draw, bg, 52, 42)

    # FREE badge top-right
    badge_font = font('Montserrat-Bold.ttf', 12)
    badge_text = 'BEZMAKSAS'
    bw = draw.textlength(badge_text, font=badge_font)
    bx = 1080 - bw - 60
    draw.rectangle([bx - 14, 40, bx + bw + 14, 76], outline=GOLD, width=2)
    draw.text((bx, 51), badge_text, font=badge_font, fill=GOLD)

    # THREE CONSEQUENCE PILLS
    pill_font_num = font('Montserrat-Bold.ttf', 13)
    pill_font_txt = font('Montserrat-Regular.ttf', 22)
    pill_font_bold = font('Montserrat-Bold.ttf', 22)

    pills = [
        ('01', 'Banka', ' var atteikt kredītu'),
        ('02', 'Pircējs', ' var atkāpties no darījuma'),
        ('03', 'Tiesa', ' var pieprasīt nojaukšanu'),
    ]

    py = 200
    for num, bold_word, rest in pills:
        # pill background
        draw.rectangle([52, py, 700, py + 58], fill=(255, 255, 255, 14))
        # gold left border
        draw.rectangle([52, py, 56, py + 58], fill=GOLD)
        # number
        draw.text((72, py + 20), num, font=pill_font_num, fill=GOLD)
        # bold word
        bw_text = draw.textlength(bold_word, font=pill_font_bold)
        draw.text((104, py + 16), bold_word, font=pill_font_bold, fill=WHITE)
        # rest
        draw.text((104 + bw_text, py + 16), rest, font=pill_font_txt,
                  fill=(255, 255, 255, 165))
        py += 72

    # HEADLINE
    py += 40
    hl_big = font('Montserrat-Black.ttf', 88)
    hl_gold = font('Montserrat-Black.ttf', 88)
    draw.text((52, py), 'Uzzini pirms', font=hl_big, fill=WHITE)
    py += 98
    draw.text((52, py), 'viņi ', font=hl_big, fill=WHITE)
    vinji_w = draw.textlength('viņi ', font=hl_big)
    draw.text((52 + vinji_w, py), 'uzzina.', font=hl_gold, fill=GOLD)

    # Thin rule
    py += 108
    draw.rectangle([52, py, 124, py + 3], fill=GOLD)

    # Sub-copy
    py += 22
    sub_font = font('Montserrat-Light.ttf', 24)
    draw.text((52, py), 'Bezmaksas īpašuma novērtējums —', font=sub_font,
              fill=(255, 255, 255, 170))
    draw.text((52, py + 34), 'konfidenciāli, 48h laikā.', font=sub_font,
              fill=(255, 255, 255, 170))

    # BOTTOM GOLD CTA BAND
    draw.rectangle([0, 984, 1080, 1080], fill=GOLD)
    cta_font = font('Montserrat-Bold.ttf', 20)
    cta_text = 'Saņem bezmaksas izvērtējumu'
    draw.text((52, 1013), cta_text, font=cta_font, fill=DARK)
    # arrow right
    arrow_font = font('Montserrat-Black.ttf', 28)
    draw.text((1080 - 100, 1006), '→', font=arrow_font, fill=DARK)
    web_font = font('Montserrat-Regular.ttf', 14)
    draw.text((1080 - 252, 1048), 'volkoengineering.com', font=web_font,
              fill=(0, 0, 0, 120))

    out = bg.convert('RGB')
    out.save('volko_design3_consequence.png', 'PNG', quality=95)
    print("  -> volko_design3_consequence.png")


if __name__ == '__main__':
    os.chdir(FONT_DIR)
    design1()
    design2()
    design3()
    print("\nAll 3 designs generated.")
