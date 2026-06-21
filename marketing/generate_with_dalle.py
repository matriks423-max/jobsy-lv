#!/usr/bin/env python3
"""
Palaid uz sava datora:
  pip install openai pillow cairosvg
  python generate_with_dalle.py
"""

import openai, urllib.request, os, base64, io
from PIL import Image
import cairosvg

API_KEY = "IELIEC_SAVU_JAUNO_API_ATSLEGU_SEIT"  # <-- nomainiet

GOLD = "#C9A84C"
DARK = "#0D0D0D"
WHITE = "#FFFFFF"
W, H = 1080, 1080

client = openai.OpenAI(api_key=API_KEY)


def generate_photo(prompt: str, filename: str):
    print(f"DALL-E 3: {filename}...")
    resp = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        quality="hd",
        n=1,
    )
    url = resp.data[0].url
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    img = Image.open(io.BytesIO(data)).convert("RGB").resize((W, H))
    img.save(filename)
    print(f"  ✓  {filename}")
    return filename


def img_to_uri(path: str) -> str:
    with open(path, "rb") as f:
        return "data:image/png;base64," + base64.b64encode(f.read()).decode()


def logo(x, y):
    tx = x + 60
    return f"""
  <rect x="{x+17}" y="{y+8}"  width="10" height="38" fill="{GOLD}"/>
  <rect x="{x+5}"  y="{y+18}" width="9"  height="28" fill="{GOLD}" opacity="0.7"/>
  <rect x="{x+29}" y="{y+13}" width="9"  height="33" fill="{GOLD}" opacity="0.85"/>
  <rect x="{x+20}" y="{y+2}"  width="4"  height="8"  fill="{GOLD}"/>
  <text x="{tx}" y="{y+20}" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="11" letter-spacing="3.5" fill="{GOLD}">VOLKO</text>
  <text x="{tx}" y="{y+36}" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="11" letter-spacing="3.5" fill="{GOLD}">ENGINEERING</text>"""


def render(svg_content: str, out: str):
    cairosvg.svg2png(
        bytestring=f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
{svg_content}
</svg>""".encode(),
        write_to=out, output_width=W, output_height=H
    )
    print(f"  ✓  {out}")


# ── Design 1: Dusk house — "Vai Tava māja ir legāla?" ────────────────────────
def design1():
    photo = generate_photo(
        "Cinematic twilight photograph of a modern European house exterior, "
        "warm amber and deep indigo sky, glowing windows, lush garden, "
        "dramatic shadows, architectural photography, ultra realistic, no text, no people",
        "photo_d1.png"
    )
    uri = img_to_uri(photo)
    svg = f"""
  <image href="{uri}" x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/>
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="50%"  stop-color="{DARK}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#g1)"/>
  <rect x="0" y="0" width="7" height="{H}" fill="{GOLD}"/>
  {logo(52, 48)}
  <rect x="52" y="808" width="318" height="38" fill="{GOLD}"/>
  <text x="211" y="832" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="13" letter-spacing="2.5" fill="{DARK}">BEZMAKSAS IZVĒRTĒJUMS</text>
  <text x="52" y="896" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{WHITE}">Vai Tava</text>
  <text x="52" y="998" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{WHITE}">māja ir</text>
  <rect x="52" y="1010" width="680" height="3" fill="{GOLD}" opacity="0.9"/>
  <text x="52" y="1058" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="102" letter-spacing="-2" fill="{GOLD}">legāla?</text>
  <rect x="752" y="958" width="282" height="58" fill="{GOLD}"/>
  <text x="893" y="993" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="16" letter-spacing="1.5" fill="{DARK}">Uzzināt tagad  →</text>
  <text x="{W-24}" y="{H-18}" text-anchor="end"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="14" fill="rgba(255,255,255,0.35)">volkoengineering.com</text>"""
    render(svg, "volko_final_design1.png")


# ── Design 2: Aerial night — "Uzzini pirms viņi uzzina." ─────────────────────
def design2():
    photo = generate_photo(
        "Cinematic aerial drone photograph of a quiet European residential neighbourhood "
        "at night, warm amber street lights glowing on dark rooftops, moody atmosphere, "
        "no text, no people, ultra realistic, 4K",
        "photo_d2.png"
    )
    uri = img_to_uri(photo)
    svg = f"""
  <image href="{uri}" x="0" y="0" width="{W}" height="{H}" preserveAspectRatio="xMidYMid slice"/>
  <defs>
    <radialGradient id="vig" cx="50%" cy="50%" r="70%">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.72"/>
    </radialGradient>
    <linearGradient id="tb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.75"/>
      <stop offset="28%"  stop-color="{DARK}" stop-opacity="0.05"/>
      <stop offset="68%"  stop-color="{DARK}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.88"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#vig)"/>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#tb)"/>
  <rect x="0" y="0" width="{W}" height="6" fill="{GOLD}"/>
  <rect x="0" y="{H-6}" width="{W}" height="6" fill="{GOLD}"/>
  {logo(W//2 - 75, 32)}
  <text x="{W//2}" y="406" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="26" letter-spacing="16" fill="{GOLD}" opacity="0.85">UZZINI PIRMS</text>
  <text x="{W//2}" y="572" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="160" letter-spacing="-5" fill="{WHITE}">VIŅI</text>
  <text x="{W//2}" y="730" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="160" letter-spacing="-5" fill="{GOLD}">UZZINA.</text>
  <rect x="{W//2-55}" y="754" width="110" height="3" fill="{GOLD}"/>
  <text x="{W//2}" y="798" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="20" letter-spacing="6" fill="rgba(255,255,255,0.55)">BANKA  ·  PIRCĒJS  ·  TIESA</text>
  <rect x="0" y="920" width="{W}" height="94" fill="{GOLD}"/>
  <text x="{W//2}" y="974" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="23" letter-spacing="2" fill="{DARK}">Saņem bezmaksas izvērtējumu  →</text>
  <text x="{W//2}" y="1002" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="400"
        font-size="14" fill="rgba(0,0,0,0.45)">volkoengineering.com</text>"""
    render(svg, "volko_final_design2.png")


# ── Design 3: Split — warm home vs dark threat panel ─────────────────────────
def design3():
    photo = generate_photo(
        "Cinematic interior photograph of a beautiful modern European home living room, "
        "warm golden evening light, wooden floors, elegant minimal furniture, "
        "large windows, cozy atmosphere, no text, no people, ultra realistic, 4K",
        "photo_d3.png"
    )
    # Crop left 648px
    img = Image.open(photo).resize((W, H))
    left = img.crop((0, 0, 648, H))
    left_buf = io.BytesIO()
    left.save(left_buf, "PNG")
    left_uri = "data:image/png;base64," + base64.b64encode(left_buf.getvalue()).decode()

    svg = f"""
  <rect x="648" y="0" width="432" height="{H}" fill="#0B0A08"/>
  <image href="{left_uri}" x="0" y="0" width="648" height="{H}" preserveAspectRatio="xMidYMid slice"/>
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="60%" stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="1.0"/>
    </linearGradient>
    <linearGradient id="ltb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="{DARK}" stop-opacity="0.55"/>
      <stop offset="20%"  stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="80%"  stop-color="{DARK}" stop-opacity="0.0"/>
      <stop offset="100%" stop-color="{DARK}" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="648" height="{H}" fill="url(#fade)"/>
  <rect x="0" y="0" width="648" height="{H}" fill="url(#ltb)"/>
  <rect x="644" y="0" width="6" height="{H}" fill="{GOLD}"/>
  <rect x="648" y="0" width="432" height="6" fill="{GOLD}"/>
  {logo(690, 36)}
  <rect x="690" y="118" width="360" height="1" fill="{GOLD}" opacity="0.3"/>
  <text x="690" y="162" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="12" letter-spacing="4" fill="{GOLD}">KAS ATKLĀJ PIRMIE?</text>
  <rect x="690" y="180" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="218" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">BANKA</text>
  <text x="712" y="248" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">atteic kredītu</text>
  <rect x="690" y="270" width="360" height="1" fill="{GOLD}" opacity="0.2"/>
  <rect x="690" y="286" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="324" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">PIRCĒJS</text>
  <text x="712" y="354" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">atkāpjas no darījuma</text>
  <rect x="690" y="376" width="360" height="1" fill="{GOLD}" opacity="0.2"/>
  <rect x="690" y="392" width="5" height="80" fill="{GOLD}"/>
  <text x="712" y="430" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="38" fill="{WHITE}">TIESA</text>
  <text x="712" y="460" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.45)">pieprasa nojaukšanu</text>
  <rect x="690" y="484" width="360" height="2" fill="{GOLD}" opacity="0.35"/>
  <text x="690" y="566" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{WHITE}">Uzzini</text>
  <text x="690" y="626" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{WHITE}">pirms viņi</text>
  <text x="690" y="686" font-family="Montserrat,Arial,sans-serif" font-weight="900"
        font-size="54" letter-spacing="-1" fill="{GOLD}">uzzina.</text>
  <rect x="690" y="704" width="84" height="3" fill="{GOLD}"/>
  <text x="690" y="746" font-family="Montserrat,Arial,sans-serif" font-weight="300"
        font-size="16" fill="rgba(255,255,255,0.5)">Bezmaksas. Konfidenciāli. 48h.</text>
  <rect x="690" y="790" width="362" height="64" fill="{GOLD}"/>
  <text x="871" y="828" text-anchor="middle"
        font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="17" fill="{DARK}">Izvērtēt īpašumu  →</text>
  <text x="44" y="1028" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="24" fill="{WHITE}">Vai Tava māja ir</text>
  <text x="44" y="1062" font-family="Montserrat,Arial,sans-serif" font-weight="700"
        font-size="24" fill="{GOLD}">juridiski sakārtota?</text>"""
    render(svg, "volko_final_design3.png")


if __name__ == "__main__":
    if API_KEY == "IELIEC_SAVU_JAUNO_API_ATSLEGU_SEIT":
        print("⚠️  Lūdzu nomainiet API_KEY mainīgo ar savu OpenAI API atslēgu!")
    else:
        design1()
        design2()
        design3()
        print("\nVisi 3 dizaini gatavi: volko_final_design1/2/3.png")
