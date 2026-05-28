import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "jobsy-cookies";

export default function CookieBanner() {
  const { locale } = useLocale();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch { setVisible(true); }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, "accepted"); } catch { /* ignore */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(STORAGE_KEY, "declined"); } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant bg-surface-cream p-4 shadow-float">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-accent-coral" />
          <p className="font-body text-sm text-on-surface-variant">
            {t(locale, "cookie.message")}{" "}
            <a href="/privacy" className="text-accent-coral underline hover:text-accent-coral-hover">
              {t(locale, "cookie.learnMore")}
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={decline}
            className="rounded-lg border-2 border-outline-variant px-4 py-2 font-body text-sm text-on-surface-variant hover:border-primary hover:text-on-surface"
          >
            {t(locale, "cookie.decline")}
          </button>
          <button
            onClick={accept}
            className="rounded-lg border border-outline-variant bg-accent-coral px-4 py-2 font-body text-sm font-medium text-on-surface hover:bg-accent-coral-hover"
          >
            {t(locale, "cookie.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
