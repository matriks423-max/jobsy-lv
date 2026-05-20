import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: string | number | null | undefined, currency = "EUR") {
  if (!value) return "—";
  return new Intl.NumberFormat("lv-LV", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value));
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("lv-LV", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
