import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = `404 — ${t(locale, "notFound.title")} — jobsy.lv`;
    return () => { document.title = prev; };
  }, [locale]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/browse?search=${encodeURIComponent(query.trim())}` : "/browse");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-surface-off-white px-4">
      <div className="w-full max-w-md text-center">
        {/* Large decorative 404 */}
        <div className="mb-2 font-headline text-[120px] font-bold leading-none text-accent-coral/15">
          404
        </div>
        <div className="-mt-16 mb-6">
          <h1 className="font-headline text-3xl font-bold text-on-surface">
            {t(locale, "notFound.title")}
          </h1>
          <p className="mt-2 font-body text-on-surface-variant">
            {t(locale, "notFound.subtitle")}
          </p>
        </div>

        {/* Quick search */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(locale, "hero.searchPlaceholder")}
              className="w-full rounded-xl border border-outline-variant bg-white py-2.5 pl-10 pr-4 font-body text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl border border-outline-variant bg-accent-coral px-4 py-2.5 font-body text-sm font-semibold text-on-surface transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            {t(locale, "hero.searchBtn")}
          </button>
        </form>

        <Link
          to="/"
          className="inline-flex items-center gap-2 font-body text-sm text-accent-coral hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {t(locale, "notFound.backBtn")}
        </Link>
      </div>
    </div>
  );
}
