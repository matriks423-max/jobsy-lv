import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale, setLocale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-cream-dark noise-bg"
      style={{ borderTop: '2px solid var(--coral)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Column 1: Brand */}
          <div>
            <Link to="/" className="flex items-center gap-1">
              <span className="font-display text-xl font-bold italic text-ink">jobsy</span>
              <span
                className="inline-block h-2 w-2 rounded-full transition-colors duration-500"
                style={{ background: 'var(--coral)' }}
              />
            </Link>
            <p className="mt-3 font-body text-sm text-ink-muted">
              {t(locale, "footer.tagline")}
            </p>
            <div className="mt-4 flex gap-1">
              {(["lv", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-md border-2 px-2.5 py-1 font-body text-sm font-medium transition ${
                    locale === l
                      ? "border-ink bg-ink text-cream"
                      : "border-ink-light bg-transparent text-ink-muted hover:border-ink hover:text-ink"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Browse */}
          <div>
            <h4 className="mb-4 font-body text-sm font-bold uppercase tracking-wide text-ink">
              {t(locale, "nav.browse")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/browse" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "browse.title")}
                </Link>
              </li>
              <li>
                <Link to="/browse?type=need" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "browse.typeNeed")}
                </Link>
              </li>
              <li>
                <Link to="/browse?type=offer" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "browse.typeOffer")}
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "nav.pricing")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Account */}
          <div>
            <h4 className="mb-4 font-body text-sm font-bold uppercase tracking-wide text-ink">
              {t(locale, "footer.contact")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/login" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "nav.login")}
                </Link>
              </li>
              <li>
                <Link to="/my-posts" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "nav.myPosts")}
                </Link>
              </li>
              <li>
                <Link to="/settings" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "nav.settings")}
                </Link>
              </li>
              <li>
                <Link to="/create" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "nav.createPost")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="mb-4 font-body text-sm font-bold uppercase tracking-wide text-ink">
              {t(locale, "footer.about")}
            </h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/privacy" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "footer.privacy")}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="font-body text-sm text-ink-muted hover:text-ink">
                  {t(locale, "footer.terms")}
                </Link>
              </li>
              <li>
                <a href="mailto:info@jobsy.lv" className="font-body text-sm text-ink-muted hover:text-ink">
                  info@jobsy.lv
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-ink-light pt-6 text-center">
          <p className="font-body text-xs text-ink-light">
            © {year} jobsy.lv — {t(locale, "footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}
