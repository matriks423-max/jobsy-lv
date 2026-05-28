function card(bg: string, shapes: string): string {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="${bg}"/>${shapes}</svg>`;
  return `data:image/svg+xml;base64,${btoa(raw)}`;
}

export const PRESET_IMAGES: Record<string, [string, string]> = {
  household: [
    // solid amber — white house
    card("#F59E0B",
      '<polygon points="200,52 292,118 108,118" fill="white" opacity="0.92"/>' +
      '<rect x="124" y="118" width="152" height="82" rx="2" fill="white" opacity="0.88"/>' +
      '<rect x="178" y="144" width="44" height="56" fill="#F59E0B"/>'),
    // cream — amber house
    card("#FEF3C7",
      '<polygon points="200,52 292,118 108,118" fill="#D97706" opacity="0.75"/>' +
      '<rect x="124" y="118" width="152" height="82" rx="2" fill="#F59E0B" opacity="0.65"/>' +
      '<rect x="178" y="144" width="44" height="56" fill="#92400E" opacity="0.5"/>'),
  ],
  moving: [
    // blue — white box + arrow
    card("#3B82F6",
      '<polygon points="200,48 228,88 172,88" fill="white" opacity="0.92"/>' +
      '<rect x="128" y="88" width="144" height="96" rx="6" fill="white" opacity="0.88"/>' +
      '<line x1="128" y1="125" x2="272" y2="125" stroke="#3B82F6" stroke-width="5"/>'),
    // light blue — blue box
    card("#DBEAFE",
      '<polygon points="200,48 228,88 172,88" fill="#2563EB" opacity="0.65"/>' +
      '<rect x="128" y="88" width="144" height="96" rx="6" fill="#3B82F6" opacity="0.5"/>' +
      '<line x1="128" y1="125" x2="272" y2="125" stroke="#1D4ED8" stroke-width="4" opacity="0.55"/>'),
  ],
  repairs: [
    // slate — white plus/cross (tools)
    card("#64748B",
      '<rect x="186" y="56" width="28" height="128" rx="14" fill="white" opacity="0.9"/>' +
      '<rect x="136" y="106" width="128" height="28" rx="14" fill="white" opacity="0.9"/>'),
    // light slate — slate cross
    card("#F1F5F9",
      '<rect x="186" y="56" width="28" height="128" rx="14" fill="#475569" opacity="0.65"/>' +
      '<rect x="136" y="106" width="128" height="28" rx="14" fill="#475569" opacity="0.65"/>'),
  ],
  garden: [
    // green — white plant
    card("#22C55E",
      '<rect x="194" y="118" width="12" height="78" rx="6" fill="white" opacity="0.9"/>' +
      '<ellipse cx="200" cy="96" rx="48" ry="56" fill="white" opacity="0.88"/>' +
      '<ellipse cx="152" cy="132" rx="32" ry="18" fill="white" opacity="0.72" transform="rotate(-30,152,132)"/>' +
      '<ellipse cx="248" cy="132" rx="32" ry="18" fill="white" opacity="0.72" transform="rotate(30,248,132)"/>'),
    // light green — green plant
    card("#DCFCE7",
      '<rect x="194" y="118" width="12" height="78" rx="6" fill="#16A34A" opacity="0.7"/>' +
      '<ellipse cx="200" cy="96" rx="48" ry="56" fill="#22C55E" opacity="0.6"/>' +
      '<ellipse cx="152" cy="132" rx="32" ry="18" fill="#16A34A" opacity="0.55" transform="rotate(-30,152,132)"/>' +
      '<ellipse cx="248" cy="132" rx="32" ry="18" fill="#16A34A" opacity="0.55" transform="rotate(30,248,132)"/>'),
  ],
  auto: [
    // indigo — white car
    card("#6366F1",
      '<rect x="88" y="122" width="224" height="66" rx="14" fill="white" opacity="0.9"/>' +
      '<rect x="118" y="84" width="164" height="46" rx="12" fill="white" opacity="0.82"/>' +
      '<circle cx="144" cy="192" r="22" fill="white" opacity="0.9"/>' +
      '<circle cx="256" cy="192" r="22" fill="white" opacity="0.9"/>' +
      '<circle cx="144" cy="192" r="10" fill="#6366F1"/>' +
      '<circle cx="256" cy="192" r="10" fill="#6366F1"/>'),
    // light indigo — indigo car
    card("#EEF2FF",
      '<rect x="88" y="122" width="224" height="66" rx="14" fill="#4F46E5" opacity="0.5"/>' +
      '<rect x="118" y="84" width="164" height="46" rx="12" fill="#6366F1" opacity="0.45"/>' +
      '<circle cx="144" cy="192" r="22" fill="#4338CA" opacity="0.55"/>' +
      '<circle cx="256" cy="192" r="22" fill="#4338CA" opacity="0.55"/>'),
  ],
  childcare: [
    // pink — white person
    card("#EC4899",
      '<circle cx="200" cy="82" r="40" fill="white" opacity="0.92"/>' +
      '<rect x="160" y="132" width="80" height="68" rx="22" fill="white" opacity="0.88"/>'),
    // light pink — pink person
    card("#FCE7F3",
      '<circle cx="200" cy="82" r="40" fill="#DB2777" opacity="0.55"/>' +
      '<rect x="160" y="132" width="80" height="68" rx="22" fill="#EC4899" opacity="0.5"/>'),
  ],
  pets: [
    // amber — white paw
    card("#EAB308",
      '<circle cx="200" cy="132" r="44" fill="white" opacity="0.9"/>' +
      '<circle cx="154" cy="76" r="22" fill="white" opacity="0.88"/>' +
      '<circle cx="246" cy="76" r="22" fill="white" opacity="0.88"/>' +
      '<circle cx="136" cy="110" r="16" fill="white" opacity="0.82"/>' +
      '<circle cx="264" cy="110" r="16" fill="white" opacity="0.82"/>'),
    // cream — amber paw
    card("#FEF9C3",
      '<circle cx="200" cy="132" r="44" fill="#CA8A04" opacity="0.5"/>' +
      '<circle cx="154" cy="76" r="22" fill="#EAB308" opacity="0.55"/>' +
      '<circle cx="246" cy="76" r="22" fill="#EAB308" opacity="0.55"/>' +
      '<circle cx="136" cy="110" r="16" fill="#CA8A04" opacity="0.5"/>' +
      '<circle cx="264" cy="110" r="16" fill="#CA8A04" opacity="0.5"/>'),
  ],
  it: [
    // purple — white laptop
    card("#7C3AED",
      '<rect x="108" y="72" width="184" height="120" rx="8" fill="white" opacity="0.9"/>' +
      '<rect x="118" y="82" width="164" height="100" rx="4" fill="#7C3AED" opacity="0.28"/>' +
      '<rect x="78" y="194" width="244" height="14" rx="7" fill="white" opacity="0.88"/>'),
    // light purple — purple laptop
    card("#EDE9FE",
      '<rect x="108" y="72" width="184" height="120" rx="8" fill="#6D28D9" opacity="0.5"/>' +
      '<rect x="118" y="82" width="164" height="100" rx="4" fill="#7C3AED" opacity="0.28"/>' +
      '<rect x="78" y="194" width="244" height="14" rx="7" fill="#5B21B6" opacity="0.45"/>'),
  ],
  tutoring: [
    // cyan — white open book
    card("#06B6D4",
      '<rect x="116" y="66" width="78" height="110" rx="5" fill="white" opacity="0.9"/>' +
      '<rect x="206" y="66" width="78" height="110" rx="5" fill="white" opacity="0.85"/>' +
      '<rect x="194" y="62" width="12" height="118" fill="#06B6D4" opacity="0.35"/>' +
      '<rect x="128" y="88" width="52" height="7" rx="3" fill="#06B6D4" opacity="0.5"/>' +
      '<rect x="128" y="105" width="40" height="7" rx="3" fill="#0891B2" opacity="0.45"/>' +
      '<rect x="128" y="122" width="46" height="7" rx="3" fill="#06B6D4" opacity="0.45"/>'),
    // light cyan — cyan book
    card("#CFFAFE",
      '<rect x="116" y="66" width="78" height="110" rx="5" fill="#0891B2" opacity="0.45"/>' +
      '<rect x="206" y="66" width="78" height="110" rx="5" fill="#06B6D4" opacity="0.4"/>' +
      '<rect x="194" y="62" width="12" height="118" fill="#0E7490" opacity="0.35"/>' +
      '<rect x="128" y="88" width="52" height="7" rx="3" fill="#0E7490" opacity="0.5"/>' +
      '<rect x="128" y="105" width="40" height="7" rx="3" fill="#0891B2" opacity="0.45"/>'),
  ],
  other: [
    // gray — white three dots
    card("#9CA3AF",
      '<circle cx="132" cy="120" r="32" fill="white" opacity="0.9"/>' +
      '<circle cx="200" cy="120" r="32" fill="white" opacity="0.9"/>' +
      '<circle cx="268" cy="120" r="32" fill="white" opacity="0.9"/>'),
    // light gray — gray dots
    card("#F3F4F6",
      '<circle cx="132" cy="120" r="32" fill="#6B7280" opacity="0.55"/>' +
      '<circle cx="200" cy="120" r="32" fill="#4B5563" opacity="0.6"/>' +
      '<circle cx="268" cy="120" r="32" fill="#6B7280" opacity="0.55"/>'),
  ],
};
