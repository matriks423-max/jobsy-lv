function svg(bg: string, accent: string, shape: string): string {
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240"><rect width="400" height="240" fill="${bg}"/>${shape}<circle cx="200" cy="120" r="90" fill="${accent}" opacity="0.12"/><circle cx="200" cy="120" r="55" fill="${accent}" opacity="0.12"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(raw)}`;
}

// Two visual variants per category
export const PRESET_IMAGES: Record<string, [string, string]> = {
  household: [
    svg("#FEF3C7", "#F59E0B", '<rect x="160" y="80" width="80" height="80" rx="8" fill="#F59E0B" opacity="0.18"/>'),
    svg("#FEF9C3", "#CA8A04", '<polygon points="200,70 240,110 240,160 160,160 160,110" fill="#CA8A04" opacity="0.15"/>'),
  ],
  moving: [
    svg("#DBEAFE", "#3B82F6", '<rect x="140" y="100" width="120" height="60" rx="6" fill="#3B82F6" opacity="0.18"/>'),
    svg("#EFF6FF", "#2563EB", '<ellipse cx="200" cy="130" rx="80" ry="40" fill="#2563EB" opacity="0.15"/>'),
  ],
  repairs: [
    svg("#F1F5F9", "#64748B", '<rect x="180" y="80" width="16" height="80" rx="8" fill="#64748B" opacity="0.2"/><rect x="150" y="110" width="80" height="16" rx="8" fill="#64748B" opacity="0.2"/>'),
    svg("#F8FAFC", "#475569", '<polygon points="170,80 230,80 240,160 160,160" fill="#475569" opacity="0.12"/>'),
  ],
  garden: [
    svg("#DCFCE7", "#22C55E", '<ellipse cx="200" cy="140" rx="70" ry="40" fill="#22C55E" opacity="0.18"/><ellipse cx="200" cy="110" rx="45" ry="45" fill="#16A34A" opacity="0.15"/>'),
    svg("#F0FDF4", "#15803D", '<circle cx="170" cy="130" r="40" fill="#15803D" opacity="0.12"/><circle cx="230" cy="120" r="35" fill="#16A34A" opacity="0.14"/>'),
  ],
  auto: [
    svg("#E0E7FF", "#6366F1", '<rect x="150" y="110" width="100" height="40" rx="20" fill="#6366F1" opacity="0.18"/>'),
    svg("#EEF2FF", "#4F46E5", '<ellipse cx="200" cy="130" rx="80" ry="35" fill="#4F46E5" opacity="0.14"/>'),
  ],
  childcare: [
    svg("#FCE7F3", "#EC4899", '<circle cx="200" cy="115" r="50" fill="#EC4899" opacity="0.16"/><circle cx="200" cy="115" r="30" fill="#DB2777" opacity="0.12"/>'),
    svg("#FDF2F8", "#BE185D", '<ellipse cx="200" cy="120" rx="70" ry="55" fill="#BE185D" opacity="0.12"/>'),
  ],
  pets: [
    svg("#FEF9C3", "#EAB308", '<circle cx="185" cy="110" r="30" fill="#EAB308" opacity="0.18"/><circle cx="220" cy="105" r="20" fill="#CA8A04" opacity="0.15"/>'),
    svg("#FEFCE8", "#CA8A04", '<ellipse cx="200" cy="120" rx="65" ry="50" fill="#CA8A04" opacity="0.14"/>'),
  ],
  it: [
    svg("#EDE9FE", "#7C3AED", '<rect x="155" y="90" width="90" height="60" rx="6" fill="#7C3AED" opacity="0.18"/><rect x="185" y="150" width="30" height="10" rx="4" fill="#7C3AED" opacity="0.18"/>'),
    svg("#F5F3FF", "#6D28D9", '<circle cx="200" cy="115" r="55" fill="#6D28D9" opacity="0.13"/>'),
  ],
  tutoring: [
    svg("#CFFAFE", "#06B6D4", '<rect x="160" y="85" width="80" height="70" rx="6" fill="#06B6D4" opacity="0.18"/><rect x="175" y="100" width="50" height="6" rx="3" fill="#0891B2" opacity="0.25"/><rect x="175" y="115" width="40" height="6" rx="3" fill="#0891B2" opacity="0.2"/>'),
    svg("#ECFEFF", "#0E7490", '<polygon points="200,75 250,120 200,165 150,120" fill="#0E7490" opacity="0.12"/>'),
  ],
  other: [
    svg("#F3F4F6", "#9CA3AF", '<circle cx="165" cy="120" r="25" fill="#9CA3AF" opacity="0.2"/><circle cx="200" cy="120" r="25" fill="#9CA3AF" opacity="0.2"/><circle cx="235" cy="120" r="25" fill="#9CA3AF" opacity="0.2"/>'),
    svg("#F9FAFB", "#6B7280", '<ellipse cx="200" cy="120" rx="80" ry="45" fill="#6B7280" opacity="0.12"/>'),
  ],
};
