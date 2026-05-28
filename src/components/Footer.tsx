import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale, setLocale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant bg-surface-off-white">
      <div className="mx-auto max-w-container-max-width px-margin-desktop py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Column 1: Brand */}
          <div>
            <Link to="/" className="inline-flex items-center gap-1.5">
              <span className="font-headline text-xl font-bold text-primary-DEFAULT">
                Jobsy
              </span>
              <span className="inline-block h-2 w-2 rounded-full bg-accent-coral" />
            </Link>
            <p className="mt-3 font-body text-body-sm text-on-surface-variant leading-relaxed">
              {t(locale, "footer.tagline")}
            </p>
            <div className="mt-5 flex gap-1">
              {(["lv", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-lg px-3 py-1.5 font-label text-label-sm transition-colors duration-200 ${
                    locale === l
                      ? "bg-primary-DEFAULT text-white"
                      : "bg-surface-cream text-on-surface-variant hover:bg-primary-DEFAULT hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Column 2: Browse */}
          <div>
            <h4 className="mb-4 font-label text-label-sm font-bold uppercase tracking-widest text-on-surface">
              {t(locale, "nav.browse")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/browse"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "browse.title")}
                </Link>
              </li>
              <li>
                <Link
                  to="/browse?type=need"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "browse.typeNeed")}
                </Link>
              </li>
              <li>
                <Link
                  to="/browse?type=offer"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "browse.typeOffer")}
                </Link>
              </li>
              <li>
                <Link
                  to="/pricing"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "nav.pricing")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Account */}
          <div>
            <h4 className="mb-4 font-label text-label-sm font-bold uppercase tracking-widest text-on-surface">
              {t(locale, "footer.account")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/login"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "nav.login")}
                </Link>
              </li>
              <li>
                <Link
                  to="/my-posts"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "nav.myPosts")}
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "nav.settings")}
                </Link>
              </li>
              <li>
                <Link
                  to="/create"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "nav.createPost")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="mb-4 font-label text-label-sm font-bold uppercase tracking-widest text-on-surface">
              {t(locale, "footer.about")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/privacy"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "footer.privacy")}
                </Link>
              </li>
              <li>
                <Link
                  to="/terms"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  {t(locale, "footer.terms")}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:info@jobsy.lv"
                  className="font-body text-body-sm text-on-surface-variant transition-colors duration-150 hover:text-primary-DEFAULT"
                >
                  info@jobsy.lv
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-outline-variant pt-6 sm:flex-row">
          <p className="font-label text-label-sm text-outline">
            © {year} jobsy.lv
          </p>
          <p className="font-label text-label-sm text-outline">
            {t(locale, "footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}
