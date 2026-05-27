import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const { locale } = useLocale();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const install = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setDeferredPrompt(null);
      setDismissed(true);
    }
  };

  const dismiss = () => {
    sessionStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-outline-variant bg-surface-cream shadow-card sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      <div className="flex items-start gap-3 p-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant"
          style={{ background: "#FF7F50" }}
        >
          <img src="/icon-192.png" alt="jobsy" className="h-7 w-7 rounded-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-body text-sm font-semibold text-on-surface">{t(locale, "pwa.addToHome")}</p>
          <p className="mt-0.5 font-body text-xs text-on-surface-variant">{t(locale, "pwa.subtitle")}</p>
        </div>
        <button onClick={dismiss} className="shrink-0 text-on-surface-variant hover:text-on-surface">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="border-t border-outline-variant px-4 py-3">
        <button
          onClick={install}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant py-2 font-body text-sm font-semibold transition-all hover:-translate-y-0.5 hover:[box-shadow:3px_3px_0_#141b2b]"
          style={{ background: "#FF7F50", color: "#F5F1E8" }}
        >
          <Download className="h-4 w-4" />
          {t(locale, "pwa.install")}
        </button>
      </div>
    </div>
  );
}
