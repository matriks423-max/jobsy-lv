import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale, setLocale } = useLocale();

  return (
    <footer className="border-t-2 border-ink bg-cream-dark noise-bg">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo + tagline */}
          <div>
            <Link to="/" className="flex items-center gap-1">
              <span className="font-display text-xl font-bold italic text-ink">
                jobsy
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-coral" />
            </Link>
            <p className="mt-2 font-body text-sm text-ink-muted">
              {t(locale, "footer.tagline")}
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-3 font-body text-sm font-bold text-ink">
              {t(locale, "footer.about")}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/privacy"
                  className="font-body text-sm text-ink-muted hover:text-ink"
                >
                  {t(locale, "footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="font-body text-sm text-ink-muted hover:text-ink"
                >
                  {t(locale, "footer.terms")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-body text-sm font-bold text-ink">
              {t(locale, "footer.contact")}
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:info@jobsy.lv"
                  className="font-body text-sm text-ink-muted hover:text-ink"
                >
                  info@jobsy.lv
                </a>
              </li>
            </ul>
          </div>

          {/* Language */}
          <div>
            <h4 className="mb-3 font-body text-sm font-bold text-ink">
              Language / Valoda / Язык
            </h4>
            <div className="flex gap-2">
              {(["lv", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-md border-2 px-3 py-1.5 font-body text-sm font-medium ${
                    locale === l
                      ? "border-ink bg-coral text-ink"
                      : "border-ink-light bg-transparent text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-light pt-6 text-center">
          <p className="font-body text-xs text-ink-light">
            {t(locale, "footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
