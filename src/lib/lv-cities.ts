// Coordinates for cities used in jobsy.lv posts
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  riga: { lat: 56.946, lng: 24.106 },
  daugavpils: { lat: 55.875, lng: 26.536 },
  liepaja: { lat: 56.505, lng: 21.011 },
  jelgava: { lat: 56.651, lng: 23.722 },
  rezekne: { lat: 56.509, lng: 27.332 },
  ventspils: { lat: 57.394, lng: 21.563 },
  jurmala: { lat: 56.968, lng: 23.770 },
  // "other" → geographic centre of Latvia
  other: { lat: 56.880, lng: 24.603 },
};

export function getCityCoords(city: string | null | undefined): { lat: number; lng: number } | null {
  if (!city) return null;
  return CITY_COORDS[city.toLowerCase().trim()] ?? null;
}
