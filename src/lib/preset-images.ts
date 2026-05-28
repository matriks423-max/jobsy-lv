function svg(bg: string, accent: string, shapes: string): string {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="${bg}"/>${shapes}</svg>`;
  return `data:image/svg+xml;base64,${btoa(raw)}`;
}

export const PRESET_IMAGES: Record<string, [string, string]> = {
  household: [
    svg("#FEF3C7", "#F59E0B",
      '<rect x="140" y="90" width="120" height="90" rx="4" fill="#F59E0B" opacity="0.5"/>' +
      '<polygon points="130,90 200,45 270,90" fill="#D97706" opacity="0.6"/>' +
      '<rect x="178" y="130" width="44" height="50" rx="3" fill="#92400E" opacity="0.4"/>'),
    svg("#FFFBEB", "#D97706",
      '<rect x="130" y="110" width="60" height="60" rx="4" fill="#D97706" opacity="0.45"/>' +
      '<rect x="210" y="120" width="60" height="50" rx="4" fill="#F59E0B" opacity="0.4"/>' +
      '<polygon points="120,110 160,75 200,110" fill="#92400E" opacity="0.5"/>' +
      '<polygon points="200,120 240,85 280,120" fill="#B45309" opacity="0.45"/>'),
  ],
  moving: [
    svg("#DBEAFE", "#3B82F6",
      '<rect x="110" y="110" width="180" height="80" rx="6" fill="#3B82F6" opacity="0.5"/>' +
      '<rect x="155" y="80" width="100" height="35" rx="4" fill="#60A5FA" opacity="0.55"/>' +
      '<circle cx="150" cy="195" r="16" fill="#1D4ED8" opacity="0.55"/>' +
      '<circle cx="260" cy="195" r="16" fill="#1D4ED8" opacity="0.55"/>'),
    svg("#EFF6FF", "#2563EB",
      '<rect x="120" y="95" width="160" height="100" rx="5" fill="#2563EB" opacity="0.4"/>' +
      '<rect x="155" y="70" width="90" height="30" rx="3" fill="#3B82F6" opacity="0.5"/>' +
      '<line x1="140" y1="95" x2="140" y2="195" stroke="#1D4ED8" stroke-width="3" opacity="0.4"/>' +
      '<line x1="260" y1="95" x2="260" y2="195" stroke="#1D4ED8" stroke-width="3" opacity="0.4"/>'),
  ],
  repairs: [
    svg("#F1F5F9", "#475569",
      '<rect x="193" y="65" width="14" height="110" rx="7" fill="#475569" opacity="0.55"/>' +
      '<rect x="145" y="110" width="110" height="14" rx="7" fill="#475569" opacity="0.55"/>' +
      '<circle cx="200" cy="122" r="18" fill="#94A3B8" opacity="0.5"/>'),
    svg("#F8FAFC", "#334155",
      '<rect x="170" y="75" width="18" height="90" rx="9" fill="#334155" opacity="0.5"/>' +
      '<rect x="155" y="75" width="90" height="18" rx="9" fill="#475569" opacity="0.45"/>' +
      '<circle cx="179" cy="168" r="14" fill="#64748B" opacity="0.5"/>'),
  ],
  garden: [
    svg("#DCFCE7", "#16A34A",
      '<ellipse cx="200" cy="160" rx="90" ry="28" fill="#16A34A" opacity="0.35"/>' +
      '<circle cx="200" cy="105" rx="55" ry="55" fill="#22C55E" opacity="0.45"/>' +
      '<rect x="196" y="130" width="8" height="50" rx="4" fill="#15803D" opacity="0.5"/>'),
    svg("#F0FDF4", "#15803D",
      '<circle cx="155" cy="120" r="45" fill="#22C55E" opacity="0.4"/>' +
      '<circle cx="245" cy="115" r="38" fill="#16A34A" opacity="0.45"/>' +
      '<rect x="148" y="155" width="8" height="40" rx="4" fill="#15803D" opacity="0.5"/>' +
      '<rect x="238" y="148" width="8" height="45" rx="4" fill="#166534" opacity="0.5"/>'),
  ],
  auto: [
    svg("#E0E7FF", "#4F46E5",
      '<rect x="100" y="130" width="200" height="60" rx="12" fill="#4F46E5" opacity="0.5"/>' +
      '<rect x="135" y="100" width="130" height="40" rx="10" fill="#6366F1" opacity="0.45"/>' +
      '<circle cx="145" cy="193" r="18" fill="#312E81" opacity="0.5"/>' +
      '<circle cx="255" cy="193" r="18" fill="#312E81" opacity="0.5"/>'),
    svg("#EEF2FF", "#4338CA",
      '<ellipse cx="200" cy="155" rx="110" ry="38" fill="#4F46E5" opacity="0.4"/>' +
      '<rect x="130" y="115" width="140" height="45" rx="8" fill="#6366F1" opacity="0.4"/>' +
      '<circle cx="152" cy="190" r="16" fill="#3730A3" opacity="0.5"/>' +
      '<circle cx="248" cy="190" r="16" fill="#3730A3" opacity="0.5"/>'),
  ],
  childcare: [
    svg("#FCE7F3", "#DB2777",
      '<circle cx="200" cy="105" r="52" fill="#EC4899" opacity="0.45"/>' +
      '<circle cx="175" cy="92" r="10" fill="#BE185D" opacity="0.5"/>' +
      '<circle cx="225" cy="92" r="10" fill="#BE185D" opacity="0.5"/>' +
      '<path d="M175 118 Q200 138 225 118" stroke="#9D174D" stroke-width="5" fill="none" opacity="0.55"/>'),
    svg("#FDF2F8", "#BE185D",
      '<circle cx="200" cy="100" r="48" fill="#F472B6" opacity="0.4"/>' +
      '<circle cx="178" cy="90" r="8" fill="#9D174D" opacity="0.5"/>' +
      '<circle cx="222" cy="90" r="8" fill="#9D174D" opacity="0.5"/>' +
      '<circle cx="200" cy="115" r="5" fill="#BE185D" opacity="0.45"/>'),
  ],
  pets: [
    svg("#FEF9C3", "#CA8A04",
      '<circle cx="200" cy="120" r="50" fill="#EAB308" opacity="0.4"/>' +
      '<ellipse cx="172" cy="80" rx="18" ry="28" fill="#CA8A04" opacity="0.5"/>' +
      '<ellipse cx="228" cy="80" rx="18" ry="28" fill="#CA8A04" opacity="0.5"/>' +
      '<circle cx="188" cy="118" r="7" fill="#78350F" opacity="0.5"/>' +
      '<circle cx="212" cy="118" r="7" fill="#78350F" opacity="0.5"/>'),
    svg("#FEFCE8", "#A16207",
      '<ellipse cx="200" cy="130" rx="70" ry="55" fill="#EAB308" opacity="0.4"/>' +
      '<circle cx="200" cy="105" r="38" fill="#CA8A04" opacity="0.4"/>' +
      '<ellipse cx="178" cy="72" rx="14" ry="22" fill="#A16207" opacity="0.5"/>' +
      '<ellipse cx="222" cy="72" rx="14" ry="22" fill="#A16207" opacity="0.5"/>'),
  ],
  it: [
    svg("#EDE9FE", "#7C3AED",
      '<rect x="120" y="80" width="160" height="100" rx="8" fill="#7C3AED" opacity="0.45"/>' +
      '<rect x="132" y="92" width="136" height="76" rx="4" fill="#DDD6FE" opacity="0.6"/>' +
      '<rect x="160" y="185" width="80" height="10" rx="5" fill="#6D28D9" opacity="0.45"/>' +
      '<rect x="145" y="195" width="110" height="6" rx="3" fill="#8B5CF6" opacity="0.35"/>'),
    svg("#F5F3FF", "#6D28D9",
      '<rect x="130" y="85" width="140" height="95" rx="6" fill="#8B5CF6" opacity="0.4"/>' +
      '<rect x="148" y="100" width="50" height="6" rx="3" fill="#6D28D9" opacity="0.5"/>' +
      '<rect x="148" y="115" width="35" height="6" rx="3" fill="#7C3AED" opacity="0.45"/>' +
      '<rect x="148" y="130" width="45" height="6" rx="3" fill="#6D28D9" opacity="0.5"/>'),
  ],
  tutoring: [
    svg("#CFFAFE", "#0891B2",
      '<rect x="120" y="70" width="160" height="120" rx="6" fill="#06B6D4" opacity="0.4"/>' +
      '<rect x="135" y="85" width="130" height="8" rx="4" fill="#0E7490" opacity="0.5"/>' +
      '<rect x="135" y="103" width="100" height="6" rx="3" fill="#0891B2" opacity="0.45"/>' +
      '<rect x="135" y="119" width="115" height="6" rx="3" fill="#0E7490" opacity="0.45"/>' +
      '<rect x="135" y="135" width="85" height="6" rx="3" fill="#0891B2" opacity="0.4"/>'),
    svg("#ECFEFF", "#0E7490",
      '<rect x="130" y="75" width="140" height="110" rx="5" fill="#0891B2" opacity="0.35"/>' +
      '<polygon points="200,65 240,95 200,125 160,95" fill="#0E7490" opacity="0.45"/>' +
      '<rect x="155" y="145" width="90" height="7" rx="3" fill="#06B6D4" opacity="0.45"/>'),
  ],
  other: [
    svg("#F3F4F6", "#6B7280",
      '<circle cx="155" cy="120" r="32" fill="#9CA3AF" opacity="0.45"/>' +
      '<circle cx="200" cy="115" r="32" fill="#6B7280" opacity="0.45"/>' +
      '<circle cx="245" cy="120" r="32" fill="#9CA3AF" opacity="0.45"/>'),
    svg("#F9FAFB", "#4B5563",
      '<rect x="140" y="90" width="50" height="50" rx="8" fill="#6B7280" opacity="0.4"/>' +
      '<rect x="205" y="90" width="50" height="50" rx="8" fill="#4B5563" opacity="0.45"/>' +
      '<rect x="172" y="150" width="50" height="50" rx="8" fill="#9CA3AF" opacity="0.4"/>'),
  ],
};
