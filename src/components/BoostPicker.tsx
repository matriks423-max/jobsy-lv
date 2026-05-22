import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { X } from "lucide-react";

interface BoostPickerProps {
  postId: number;
  isBusiness: boolean;
  freeBoostsRemaining: number;
  onClose: () => void;
}

const BOOSTS = [
  { type: "bump" as const, icon: "🔝", priceLabel: "€1.00" },
  { type: "featured" as const, icon: "⭐", priceLabel: "€2.00" },
  { type: "urgent" as const, icon: "🔴", priceLabel: "€0.50" },
];

export default function BoostPicker({ postId, isBusiness, freeBoostsRemaining, onClose }: BoostPickerProps) {
  const { locale } = useLocale();
  const { toast } = useToast();

  const applyMutation = trpc.boost.apply.useMutation({
    onSuccess: (data) => {
      if (data.free) {
        toast(t(locale, "boost.activated"), "success");
        onClose();
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-ink bg-cream p-6 shadow-float">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border-2 border-ink-light p-1 text-ink-muted hover:border-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1 font-display text-xl font-bold text-ink">
          {t(locale, "boost.selectBoost")}
        </h3>
        <p className="mb-5 font-body text-xs text-ink-muted">7 {locale === "lv" ? "dienu ilgs" : locale === "ru" ? "дней" : "days"}</p>

        <div className="space-y-3">
          {BOOSTS.map((b) => {
            const isFreeForBusiness = isBusiness && b.type === "featured" && freeBoostsRemaining > 0;
            return (
              <button
                key={b.type}
                onClick={() => applyMutation.mutate({ postId, boostType: b.type })}
                disabled={applyMutation.isPending}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-3 text-left hover:bg-cream-dark transition disabled:opacity-60"
              >
                <span className="text-2xl">{b.icon}</span>
                <div className="flex-1">
                  <p className="font-body text-sm font-bold text-ink">
                    {t(locale, `boost.${b.type}` as any)}
                  </p>
                  <p className="font-body text-xs text-ink-muted">
                    {t(locale, `boost.${b.type}Desc` as any)}
                  </p>
                </div>
                <span className={`font-mono text-sm font-bold ${isFreeForBusiness ? "text-sage" : "text-ink"}`}>
                  {isFreeForBusiness ? t(locale, "boost.freeAvailable") : b.priceLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
