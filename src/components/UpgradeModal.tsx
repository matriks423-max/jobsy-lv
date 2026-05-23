import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { X, Zap } from "lucide-react";

interface UpgradeModalProps {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const { locale } = useLocale();
  const { toast } = useToast();

  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-ink bg-cream p-8 shadow-float">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border-2 border-ink-light p-1 text-ink-muted hover:border-ink hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-coral">
          <Zap className="h-6 w-6 text-ink" />
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          {t(locale, "upgrade.title")}
        </h2>
        <p className="mt-2 font-body text-sm text-ink-muted">
          {t(locale, "upgrade.desc")}
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
            className="w-full rounded-xl border-2 border-ink bg-coral px-6 py-3 font-body text-sm font-semibold text-ink hover:opacity-90 transition disabled:opacity-60"
          >
            {upgradeMutation.isPending
              ? "..."
              : t(locale, "upgrade.cta")}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border-2 border-ink-light px-6 py-3 font-body text-sm text-ink-muted hover:border-ink hover:text-ink transition"
          >
            {t(locale, "upgrade.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
