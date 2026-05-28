export const CATEGORIES = [
  { key: "household",  icon: "Home",          bg: "#FEF3C7", color: "#92400E" },
  { key: "moving",     icon: "Truck",          bg: "#DBEAFE", color: "#1E40AF" },
  { key: "repairs",    icon: "Wrench",         bg: "#F1F5F9", color: "#334155" },
  { key: "garden",     icon: "Flower2",        bg: "#DCFCE7", color: "#166534" },
  { key: "auto",       icon: "Car",            bg: "#E0E7FF", color: "#3730A3" },
  { key: "childcare",  icon: "Baby",           bg: "#FCE7F3", color: "#9D174D" },
  { key: "pets",       icon: "Cat",            bg: "#FEF9C3", color: "#854D0E" },
  { key: "it",         icon: "Monitor",        bg: "#EDE9FE", color: "#5B21B6" },
  { key: "tutoring",   icon: "GraduationCap",  bg: "#CFFAFE", color: "#155E75" },
  { key: "other",      icon: "MoreHorizontal", bg: "#F3F4F6", color: "#6B7280" },
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
