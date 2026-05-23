import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Check, ChevronDown } from "lucide-react";

export default function Pricing() {
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const portalMutation = trpc.subscription.createPortal.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const isBusiness = status?.plan === "business";

  useEffect(() => {
    document.title = t(locale, "pricing.title") + " — jobsy.lv";
    return () => { document.title = "jobsy.lv"; };
  }, [locale]);

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast(t(locale, "pricing.toastCanceled"), "info");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boostAlaCarte = locale === "lv" ? "Boost à la carte" : locale === "ru" ? "Boost по выбору" : "Boost à la carte";

  const FREE_FEATURES = [
    t(locale, "pricing.freePostsPerMonth"),
    t(locale, "pricing.contactFree"),
    boostAlaCarte,
  ];

  const BUSINESS_FEATURES = [
    t(locale, "pricing.unlimitedPosts"),
    t(locale, "pricing.companyProfile"),
    t(locale, "pricing.badge"),
    t(locale, "pricing.analytics"),
    t(locale, "pricing.freeBoosts"),
    t(locale, "pricing.contactFree"),
    boostAlaCarte,
    t(locale, "pricing.cancelAnytime"),
  ];

  const BOOST_FEATURES = [
    { icon: "🔝", name: t(locale, "boost.bump"), price: "€1.00", desc: t(locale, "boost.bumpDesc") },
    { icon: "⭐", name: t(locale, "boost.featured"), price: "€2.00", desc: t(locale, "boost.featuredDesc") },
    { icon: "🔴", name: t(locale, "boost.urgent"), price: "€0.50", desc: t(locale, "boost.urgentDesc") },
  ];

  return (
    <div className="min-h-screen px-4 py-16 noise-bg">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            {t(locale, "pricing.title")}
          </h1>
          <p className="mt-3 font-body text-lg text-ink-muted">
            {t(locale, "pricing.subtitle")}
          </p>
        </div>

        {/* Tier cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border-2 border-ink bg-white p-8">
            <div className="mb-6">
              <p className="font-body text-sm font-medium uppercase tracking-widest text-ink-muted">
                {t(locale, "pricing.free")}
              </p>
              <p className="mt-1 font-display text-5xl font-bold text-ink">€0</p>
              <p className="mt-1 font-body text-sm text-ink-muted">
                {t(locale, "pricing.freeForever")}
              </p>
            </div>
            <ul className="mb-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 font-body text-sm text-ink">
                  <Check className="h-4 w-4 shrink-0 text-sage" />
                  {f}
                </li>
              ))}
            </ul>
            {isBusiness ? (
              <div className="rounded-xl border-2 border-ink-light bg-cream-dark px-4 py-3 text-center font-body text-sm text-ink-muted">
                {t(locale, "pricing.currentPlanIsBusiness")}
              </div>
            ) : (
              <Link
                to="/create"
                className="block rounded-xl border-2 border-ink bg-white px-6 py-3 text-center font-body text-sm font-semibold text-ink hover:bg-cream-dark transition"
              >
                {t(locale, "pricing.startFree")}
              </Link>
            )}
          </div>

          {/* Business */}
          <div className="relative rounded-2xl border-2 border-ink bg-ink p-8 text-cream shadow-card">
            <div className="absolute -top-3 left-6 rounded-full border-2 border-ink bg-coral px-3 py-0.5 font-mono text-xs font-bold text-ink uppercase">
              {t(locale, "pricing.mostPopular")}
            </div>
            <div className="mb-6">
              <p className="font-body text-sm font-medium uppercase tracking-widest text-cream/60">
                {t(locale, "pricing.business")}
              </p>
              <div className="mt-1 flex items-end gap-1">
                <p className="font-display text-5xl font-bold text-cream">€9.99</p>
                <p className="mb-1.5 font-body text-sm text-cream/60">{t(locale, "pricing.perMonth")}</p>
              </div>
              <p className="mt-1 font-body text-sm text-cream/60">
                {t(locale, "pricing.cancelAnytime")}
              </p>
            </div>
            <ul className="mb-8 space-y-3">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 font-body text-sm text-cream">
                  <Check className="h-4 w-4 shrink-0 text-coral" />
                  {f}
                </li>
              ))}
            </ul>
            {isBusiness ? (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="w-full rounded-xl border-2 border-cream bg-cream px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-cream/90 transition disabled:opacity-60"
              >
                {t(locale, "pricing.manageBilling")}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = "/login"; return; }
                  upgradeMutation.mutate();
                }}
                disabled={upgradeMutation.isPending}
                className="w-full rounded-xl border-2 border-cream bg-coral px-6 py-3 font-body text-sm font-semibold text-ink hover:opacity-90 transition disabled:opacity-60"
              >
                {upgradeMutation.isPending
                  ? t(locale, "pricing.loading")
                  : t(locale, "pricing.upgrade")}
              </button>
            )}
          </div>
        </div>

        {/* Boosts */}
        <div className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">
            {t(locale, "pricing.boostForAll")}
          </h2>
          <p className="mb-6 font-body text-sm text-ink-muted">
            {t(locale, "pricing.boostForAllDesc")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {BOOST_FEATURES.map((b) => (
              <div key={b.name} className="rounded-2xl border-2 border-ink bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="font-mono text-lg font-bold text-ink">{b.price}</span>
                </div>
                <p className="font-body text-sm font-bold text-ink">{b.name}</p>
                <p className="mt-1 font-body text-xs text-ink-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border-2 border-ink bg-white p-8">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink">
            {t(locale, "pricing.faqTitle")}
          </h2>
          <div className="space-y-4">
            {[
              { q: t(locale, "pricing.faq1q"), a: t(locale, "pricing.faq1a") },
              { q: t(locale, "pricing.faq2q"), a: t(locale, "pricing.faq2a") },
            ].map(({ q, a }) => (
              <details key={q} className="group border-b border-ink-light pb-4">
                <summary className="flex cursor-pointer items-center justify-between font-body text-sm font-semibold text-ink">
                  {q}
                  <ChevronDown className="h-4 w-4 text-ink-muted transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 font-body text-sm text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
