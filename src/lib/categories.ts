export const CATEGORIES = [
  { key: "household", icon: "Home" },
  { key: "moving", icon: "Truck" },
  { key: "repairs", icon: "Wrench" },
  { key: "garden", icon: "Flower2" },
  { key: "auto", icon: "Car" },
  { key: "childcare", icon: "Baby" },
  { key: "pets", icon: "Cat" },
  { key: "it", icon: "Monitor" },
  { key: "tutoring", icon: "GraduationCap" },
  { key: "other", icon: "MoreHorizontal" },
] as const;

export type CategoryKey = typeof CATEGORIES[number]["key"];

export const CITIES = [
  "riga",
  "daugavpils",
  "liepaja",
  "jelgava",
  "rezekne",
  "ventspils",
  "jurmala",
  "valmiera",
  "jekabpils",
  "tukums",
  "ogre",
  "cesis",
  "sigulda",
  "bauska",
  "saldus",
  "kuldiga",
  "dobele",
  "talsi",
  "other",
] as const;

export type CityKey = typeof CITIES[number];
