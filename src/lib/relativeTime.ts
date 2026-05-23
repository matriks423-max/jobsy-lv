import type { Locale } from "./i18n";

/**
 * Returns a human-friendly relative time string.
 * e.g. "pirms 2 dienām", "2 часа назад", "2 days ago"
 * Falls back to absolute date for dates older than 30 days.
 */
export function relativeTime(date: Date | string, locale: Locale): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (locale === "lv") {
    if (diffSec < 60) return "tikko";
    if (diffMin < 60) return `pirms ${diffMin} min`;
    if (diffHr < 24) return `pirms ${diffHr} ${diffHr === 1 ? "stundas" : "stundām"}`;
    if (diffDay === 1) return "vakar";
    if (diffDay < 7) return `pirms ${diffDay} dienām`;
    if (diffDay < 30) return `pirms ${Math.floor(diffDay / 7)} ned.`;
  } else if (locale === "ru") {
    if (diffSec < 60) return "только что";
    if (diffMin < 60) return `${diffMin} мин. назад`;
    if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? "час" : diffHr < 5 ? "часа" : "часов"} назад`;
    if (diffDay === 1) return "вчера";
    if (diffDay < 7) return `${diffDay} дн. назад`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} нед. назад`;
  } else {
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return "yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  }

  // Older than 30 days — absolute date
  const localeCode = locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB";
  return d.toLocaleDateString(localeCode);
}
