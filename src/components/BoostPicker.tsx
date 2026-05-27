import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { X, Wallet, CreditCard } from "lucide-react";

interface BoostPickerProps {
  postId: number;
  isBusiness: boolean;
  freeBoostsRemaining: number;
  creditBalance: number; // euro cents
  onClose: () => void;
}

const BOOSTS = [
  { type: "bump"     as const, icon: "🔝", cents: 100, priceLabel: "€1.00" },
  { type: "featured" as const, icon: "⭐", cents: 200, priceLabel: "€2.00" },
  { type: "urgent"   as const, icon: "🔴", cents:  50, priceLabel: "€0.50" },
];

export default function BoostPicker({
  postId,
  isBusiness,
  freeBoostsRemaining,
  creditBalance,
  onClose,
}: BoostPickerProps) {
  const { locale } = useLocale();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const applyMutation = trpc.boost.applyBoost.useMutation({
    onSuccess: (data) => {
      if (data.free) {
        toast(t(locale, "boost.activated"), "success");
        utils.subscription.status.invalidate();
        onClose();
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  const creditsMutation = trpc.boost.applyBoostWithCredits.useMutation({
    onSuccess: () => {
      toast(t(locale, "boost.activated"), "success");
      utils.subscription.status.invalidate();
      onClose();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const isPending = applyMutation.isPending || creditsMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-cream p-6 shadow-float">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border-2 border-ink-light p-1 text-on-surface-variant hover:border-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1 font-headline text-xl font-bold text-on-surface">
          {t(locale, "boost.selectBoost")}
        </h3>
        <p className="mb-1 font-body text-xs text-on-surface-variant">{t(locale, "boost.duration")}</p>

        {/* Credit balance badge */}
        {creditBalance > 0 && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-mustard-light px-3 py-1 font-body text-xs font-medium text-on-surface">
            <Wallet className="h-3.5 w-3.5" />
            {t(locale, "credits.balance")}: €{(creditBalance / 100).toFixed(2)}
          </div>
        )}

        <div className="space-y-3">
          {BOOSTS.map((b) => {
            const isFreeForBusiness = isBusiness && b.type === "featured" && freeBoostsRemaining > 0;
            const canUseCredits = creditBalance >= b.cents && !isFreeForBusiness;

            return (
              <div
                key={b.type}
                className="rounded-xl border border-outline-variant bg-white p-3"
              >
                {/* Boost info row */}
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-2xl">{b.icon}</span>
                  <div className="flex-1">
                    <p className="font-body text-sm font-bold text-on-surface">
                      {t(locale, `boost.${b.type}` as never)}
                    </p>
                    <p className="font-body text-xs text-on-surface-variant">
                      {t(locale, `boost.${b.type}Desc` as never)}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold text-on-surface">{b.priceLabel}</span>
                </div>

                {/* Payment buttons */}
                {isFreeForBusiness ? (
                  <button
                    onClick={() => applyMutation.mutate({ postId, boostType: b.type })}
                    disabled={isPending}
                    className="w-full rounded-lg border-2 border-sage bg-success-emerald/10 py-1.5 font-body text-xs font-bold text-success-emerald hover:bg-sage hover:text-white transition disabled:opacity-60"
                  >
                    {t(locale, "boost.freeAvailable")} ({freeBoostsRemaining})
                  </button>
                ) : canUseCredits ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => creditsMutation.mutate({ postId, boostType: b.type })}
                      disabled={isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-mustard-light py-1.5 font-body text-xs font-bold text-on-surface hover:bg-mustard transition disabled:opacity-60"
                    >
                      <Wallet className="h-3 w-3" />
                      {t(locale, "credits.useCredits")}
                    </button>
                    <button
                      onClick={() => applyMutation.mutate({ postId, boostType: b.type })}
                      disabled={isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-ink-light bg-white py-1.5 font-body text-xs font-medium text-on-surface-variant hover:border-ink hover:text-on-surface transition disabled:opacity-60"
                    >
                      <CreditCard className="h-3 w-3" />
                      {t(locale, "credits.payCard")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => applyMutation.mutate({ postId, boostType: b.type })}
                    disabled={isPending}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-white py-1.5 font-body text-xs font-medium text-on-surface hover:bg-surface-cream transition disabled:opacity-60"
                  >
                    <CreditCard className="h-3 w-3" />
                    {t(locale, "credits.payCard")} {b.priceLabel}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
