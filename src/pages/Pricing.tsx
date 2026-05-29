import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });

  const proMutation = trpc.subscription.createProCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const portalMutation = trpc.subscription.createPortal.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const plan = status?.plan ?? "free";
  const isPro = plan === "pro";
  const isBusiness = plan === "business";
  const isPaid = isPro || isBusiness;

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

  const FREE_FEATURES = [
    t(locale, "pricing.freePostsPerMonth"),
    t(locale, "pricing.freeContactViews"),
    t(locale, "pricing.boostPrices"),
  ];

  const PRO_FEATURES = [
    t(locale, "pricing.proPostsPerMonth"),
    t(locale, "pricing.proContactViews"),
    t(locale, "pricing.boostPrices"),
    t(locale, "pricing.cancelAnytime"),
  ];

  const BUSINESS_FEATURES = [
    t(locale, "pricing.unlimitedPosts"),
    t(locale, "pricing.unlimitedContacts"),
    t(locale, "pricing.companyProfile"),
    t(locale, "pricing.badge"),
    t(locale, "pricing.analytics"),
    t(locale, "pricing.freeBoosts"),
    t(locale, "pricing.boostPrices"),
    t(locale, "pricing.cancelAnytime"),
  ];

  const BOOST_FEATURES = [
    { icon: "🔼", name: t(locale, "boost.bump"), price: "€1.00", desc: t(locale, "boost.bumpDesc") },
    { icon: "⭐", name: t(locale, "boost.featured"), price: "€2.00", desc: t(locale, "boost.featuredDesc") },
    { icon: "🔴", name: t(locale, "boost.urgent"), price: "€0.50", desc: t(locale, "boost.urgentDesc") },
  ];

  const handleGo = (target: "pro" | "business") => {
    if (!isAuthenticated) { navigate("/login"); return; }
    if (target === "pro") proMutation.mutate();
    else upgradeMutation.mutate();
  };

  return (
    <div className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="font-headline text-4xl font-bold text-on-surface md:text-5xl">
            {t(locale, "pricing.title")}
          </h1>
          <p className="mt-3 font-body text-lg text-on-surface-variant">
            {t(locale, "pricing.subtitle")}
          </p>
        </div>

        {/* Tier cards — 3 columns */}
        <div className="mb-10 grid gap-6 md:grid-cols-3 items-stretch">

          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-outline-variant bg-white p-6">
            <div className="mb-5">
              <p className="font-body text-xs font-medium uppercase tracking-widest text-on-surface-variant">
                {t(locale, "pricing.free")}
              </p>
              <p className="mt-1 font-headline text-4xl font-bold text-on-surface">€0</p>
              <p className="mt-1 font-body text-xs text-on-surface-variant">
                {t(locale, "pricing.freeForever")}
              </p>
            </div>
            <ul className="mb-6 flex-1 space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 font-body text-sm text-on-surface">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-emerald" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isPaid ? (
              <div className="rounded-xl border-2 border-outline-variant bg-surface-cream px-4 py-3 text-center font-body text-xs text-on-surface-variant">
                {isBusiness ? t(locale, "pricing.currentPlanIsBusiness") : t(locale, "pricing.currentPlanIsPro")}
              </div>
            ) : (
              <Link
                to="/create"
                className="block rounded-xl border border-outline-variant bg-white px-6 py-3 text-center font-body text-sm font-semibold text-on-surface hover:bg-surface-cream transition"
              >
                {t(locale, "pricing.startFree")}
              </Link>
            )}
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-2xl border border-outline-variant bg-white p-6">
            <div className="absolute -top-3 left-6 rounded-full border border-outline-variant bg-surface-cream px-3 py-0.5 font-mono text-xs font-bold text-on-surface uppercase">
              {t(locale, "pricing.pro")}
            </div>
            <div className="mb-5">
              <p className="font-body text-xs font-medium uppercase tracking-widest text-on-surface-variant">
                {t(locale, "pricing.pro")}
              </p>
              <div className="mt-1 flex items-end gap-1">
                <p className="font-headline text-4xl font-bold text-on-surface">€4.99</p>
                <p className="mb-1 font-body text-xs text-on-surface-variant">{t(locale, "pricing.perMonth")}</p>
              </div>
              <p className="mt-1 font-body text-xs text-on-surface-variant">
                {t(locale, "pricing.cancelAnytime")}
              </p>
            </div>
            <ul className="mb-6 flex-1 space-y-2.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 font-body text-sm text-on-surface">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-emerald" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isPro ? (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="w-full rounded-xl border border-outline-variant bg-surface-cream px-6 py-3 font-body text-sm font-semibold text-on-surface hover:bg-surface-cream transition disabled:opacity-60"
              >
                {t(locale, "pricing.manageBilling")}
              </button>
            ) : isBusiness ? (
              <div className="rounded-xl border-2 border-outline-variant bg-surface-cream px-4 py-3 text-center font-body text-xs text-on-surface-variant">
                {t(locale, "pricing.currentPlanIsBusiness")}
              </div>
            ) : (
              <button
                onClick={() => handleGo("pro")}
                disabled={proMutation.isPending}
                className="w-full rounded-xl border border-outline-variant bg-primary px-6 py-3 font-body text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-60"
              >
                {proMutation.isPending ? t(locale, "pricing.loading") : t(locale, "pricing.upgradePro")}
              </button>
            )}
          </div>

          {/* Business */}
          <div className="relative flex flex-col rounded-2xl border border-outline-variant bg-primary p-6 text-white shadow-card">
            <div className="absolute -top-3 left-6 rounded-full border border-outline-variant bg-accent-coral px-3 py-0.5 font-mono text-xs font-bold text-on-surface uppercase">
              {t(locale, "pricing.mostPopular")}
            </div>
            <div className="mb-5">
              <p className="font-body text-xs font-medium uppercase tracking-widest text-white/60">
                {t(locale, "pricing.business")}
              </p>
              <div className="mt-1 flex items-end gap-1">
                <p className="font-headline text-4xl font-bold text-white">€9.99</p>
                <p className="mb-1 font-body text-xs text-white/60">{t(locale, "pricing.perMonth")}</p>
              </div>
              <p className="mt-1 font-body text-xs text-white/60">
                {t(locale, "pricing.cancelAnytime")}
              </p>
            </div>
            <ul className="mb-6 flex-1 space-y-2.5">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 font-body text-sm text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-coral" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {isBusiness ? (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="w-full rounded-xl border border-outline-variant bg-surface-cream px-6 py-3 font-body text-sm font-semibold text-on-surface hover:bg-surface-cream/90 transition disabled:opacity-60"
              >
                {t(locale, "pricing.manageBilling")}
              </button>
            ) : (
              <button
                onClick={() => handleGo("business")}
                disabled={upgradeMutation.isPending}
                className="w-full rounded-xl border border-outline-variant bg-accent-coral px-6 py-3 font-body text-sm font-semibold text-on-surface hover:opacity-90 transition disabled:opacity-60"
              >
                {upgradeMutation.isPending ? t(locale, "pricing.loading") : t(locale, "pricing.upgrade")}
              </button>
            )}
          </div>
        </div>

        {/* Boosts */}
        <div className="mb-10">
          <h2 className="mb-2 font-headline text-2xl font-bold text-on-surface">
            {t(locale, "pricing.boostForAll")}
          </h2>
          <p className="mb-6 font-body text-sm text-on-surface-variant">
            {t(locale, "pricing.boostForAllDesc")}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {BOOST_FEATURES.map((b) => (
              <div key={b.name} className="rounded-2xl border border-outline-variant bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="font-mono text-lg font-bold text-on-surface">{b.price}</span>
                </div>
                <p className="font-body text-sm font-bold text-on-surface">{b.name}</p>
                <p className="mt-1 font-body text-xs text-on-surface-variant">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border border-outline-variant bg-white p-6">
          <h2 className="mb-4 font-headline text-2xl font-bold text-on-surface">
            {t(locale, "pricing.faqTitle")}
          </h2>
          <div className="space-y-4">
            {[
              { q: t(locale, "pricing.faq1q"), a: t(locale, "pricing.faq1a") },
              { q: t(locale, "pricing.faq2q"), a: t(locale, "pricing.faq2a") },
              { q: t(locale, "pricing.faq3q"), a: t(locale, "pricing.faq3a") },
            ].map(({ q, a }) => (
              <details key={q} className="group border-b border-outline-variant pb-4">
                <summary className="flex cursor-pointer items-center justify-between font-body text-sm font-semibold text-on-surface">
                  {q}
                  <ChevronDown className="h-4 w-4 text-on-surface-variant transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 font-body text-sm text-on-surface-variant">{a}</p>
              </details>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
