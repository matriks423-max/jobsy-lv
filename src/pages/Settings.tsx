import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Phone,
  Mail,
  Loader2,
  CheckCircle,
  Palette,
  Edit3,
  ShieldCheck,
  Bell,
  Trash2,
  Building2,
  CreditCard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

const THEMES: { value: Theme; labelKey: string; preview: string }[] = [
  { value: "warm",        labelKey: "settings.themeWarm",        preview: "#F5F1E8" },
  { value: "dark",        labelKey: "settings.themeDark",        preview: "#1C1814" },
  { value: "terracotta",  labelKey: "settings.themeTerracotta",  preview: "#F7F0E6" },
];

export default function Settings() {
  const { locale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");

  const utils = trpc.useUtils();

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated ?? false });
  const { data: creditHistory } = trpc.subscription.creditHistory.useQuery(undefined, { enabled: isAuthenticated ?? false });
  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });
  const portalMutation = trpc.subscription.createPortal.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
    onError: (err) => toast(err.message, "error"),
  });

  const { data: savedSearches } = trpc.savedSearches.list.useQuery(undefined, { enabled: isAuthenticated ?? false });
  const deleteSearchMutation = trpc.savedSearches.delete.useMutation({
    onSuccess: () => utils.savedSearches.list.invalidate(),
    onError: (err) => toast(err.message, "error"),
  });

  const { data: profile, isLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      setOtpSent(false);
      toast(t(locale, "settings.saved"), "success");
      utils.profile.me.invalidate();
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => toast(err.message, "error"),
  });

  const sendOtpMutation = trpc.profile.sendPhoneOtp.useMutation({
    onSuccess: () => {
      setOtpSent(true);
      toast(t(locale, "settings.otpSent"), "success");
    },
    onError: (err) => toast(err.message, "error"),
  });

  const verifyOtpMutation = trpc.profile.verifyPhoneOtp.useMutation({
    onSuccess: () => {
      setOtpSent(false);
      setOtpCode("");
      toast(t(locale, "settings.phoneVerified"), "success");
      utils.profile.me.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "nav.settings") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  // Handle Stripe redirect params
  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      toast(t(locale, "settings.toastSubscribed"), "success");
      setSearchParams({}, { replace: true });
    } else if (searchParams.get("canceled") === "true") {
      toast(t(locale, "pricing.toastCanceled"), "info");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
    if (profile?.name) setName(profile.name);
    if (profile) {
      setCompanyName(profile.companyName ?? "");
      setCompanyWebsite(profile.companyWebsite ?? "");
      setCompanyDescription(profile.companyDescription ?? "");
    }
  }, [profile]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

  const phoneChanged = phone !== (profile?.phone ?? "");
  const canVerify = !!phone && !phoneChanged && !profile?.phoneVerified;

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-8 font-display text-3xl font-bold text-ink md:text-4xl">
          {t(locale, "settings.title")}
        </h1>

        {/* Profile section */}
        <div className="mb-6 rounded-3xl border-2 border-ink bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <User className="h-5 w-5 text-coral" />
            <h2 className="font-body text-lg font-bold text-ink">
              {t(locale, "settings.profileSection")}
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
              {/* Phone */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-ink">
                  <Edit3 className="h-3.5 w-3.5 text-coral" />
                  {t(locale, "settings.name")}
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(locale, "settings.namePlaceholder")}
                  className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
                />
              </div>

              {/* Email — read only */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-ink">
                  <Mail className="h-3.5 w-3.5 text-coral" />
                  {t(locale, "settings.email")}
                </label>
                <div className="flex h-12 items-center rounded-xl border-2 border-ink-light bg-cream-dark px-4 font-body text-sm text-ink-muted">
                  {profile?.email ?? "—"}
                  <span className="ml-auto rounded bg-cream px-2 py-0.5 font-mono text-[10px] text-ink-light">
                    {t(locale, "settings.emailReadOnly")}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-ink">
                  <Phone className="h-3.5 w-3.5 text-coral" />
                  {t(locale, "settings.phone")}
                  {profile?.phoneVerified && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-sage bg-sage-light px-2 py-0.5 font-body text-[10px] font-medium text-sage">
                      <ShieldCheck className="h-3 w-3" />
                      {t(locale, "settings.verified")}
                    </span>
                  )}
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setOtpSent(false); setOtpCode(""); }}
                  placeholder="+371 2X XXX XXX"
                  className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
                />
                <p className="mt-1 font-body text-xs text-ink-light">
                  {t(locale, "settings.phoneHint")}
                </p>

                {/* Verify button — shown after saving phone, if not yet verified */}
                {canVerify && !otpSent && (
                  <button
                    onClick={() => sendOtpMutation.mutate({ phone })}
                    disabled={sendOtpMutation.isPending}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-mustard-light px-4 py-2 font-body text-sm font-medium text-ink hover:bg-mustard-light/70"
                  >
                    {sendOtpMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {t(locale, "settings.verifyPhone")}
                  </button>
                )}

                {/* OTP input */}
                {otpSent && (
                  <div className="mt-3 flex gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="_ _ _ _ _ _"
                      className="h-12 w-36 rounded-xl border-2 border-ink bg-white text-center font-mono text-lg tracking-widest focus:border-coral"
                    />
                    <Button
                      onClick={() => verifyOtpMutation.mutate({ phone, code: otpCode })}
                      disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                      className="h-12 rounded-xl border-2 border-ink bg-sage px-4 font-body font-medium text-ink hover:bg-sage/80 disabled:opacity-50"
                    >
                      {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t(locale, "settings.otpConfirm")}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={() => updateMutation.mutate({ phone, name: name || undefined })}
                disabled={updateMutation.isPending || saved}
                className="h-12 w-full rounded-xl border-2 border-ink bg-coral font-body font-medium text-ink hover:bg-coral-hover"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="mr-2 h-4 w-4" />
                ) : null}
                {saved ? t(locale, "settings.saved") : t(locale, "settings.save")}
              </Button>
            </div>
          )}
        </div>

        {/* My Alerts section */}
        <div className="mb-6 rounded-3xl border-2 border-ink bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Bell className="h-5 w-5 text-coral" />
            <h2 className="font-body text-lg font-bold text-ink">
              {t(locale, "settings.alertsSection")}
            </h2>
          </div>
          {!savedSearches || savedSearches.length === 0 ? (
            <p className="font-body text-sm text-ink-muted">{t(locale, "settings.alertsEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {savedSearches.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink-light bg-cream p-3">
                  <div>
                    <p className="font-body text-sm font-bold text-ink">{s.label}</p>
                    <p className="font-mono text-xs text-ink-light">
                      {s.type} {s.category ? `· ${s.category}` : ""} {s.city ? `· ${s.city}` : ""} {s.keyword ? `· "${s.keyword}"` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSearchMutation.mutate({ id: s.id })}
                    className="rounded-lg border border-ink-light p-2 text-ink-muted hover:border-need hover:text-need"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Business Plan */}
        <div className="mb-6 rounded-2xl border-2 border-ink bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-coral" />
            <h2 className="font-display text-xl font-bold text-ink">
              {t(locale, "settings.businessProfile")}
            </h2>
          </div>

          {/* Plan status */}
          <div className={`mb-4 rounded-xl border-2 px-4 py-3 ${subStatus?.plan === "business" ? "border-sage bg-sage/10" : "border-ink-light bg-cream-dark"}`}>
            <p className="font-body text-sm font-bold text-ink">
              {subStatus?.plan === "business"
                ? t(locale, "settings.currentPlanBusiness")
                : t(locale, "settings.currentPlanFree")}
            </p>
            {subStatus?.plan === "free" && (
              <p className="mt-0.5 font-body text-xs text-ink-muted">
                {subStatus.monthlyPostCount}/10 {t(locale, "settings.postsThisMonth")}
              </p>
            )}
            {subStatus?.plan === "business" && (
              <p className="mt-0.5 font-body text-xs text-ink-muted">
                {subStatus.freeBoostsRemaining} {t(locale, "settings.freeBoostsRemaining")}
              </p>
            )}
          </div>

          {/* Business-only: company fields */}
          {subStatus?.plan === "business" && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-ink">
                  {t(locale, "settings.companyName")}
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
                  placeholder={t(locale, "settings.companyNamePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-ink">
                  {t(locale, "settings.companyWebsite")}
                </label>
                <input
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  type="url"
                  className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-ink">
                  {t(locale, "settings.companyDescription")}
                </label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink resize-none"
                />
              </div>
              <button
                onClick={() => updateMutation.mutate({ companyName, companyWebsite, companyDescription })}
                disabled={updateMutation.isPending}
                className="rounded-xl border-2 border-ink bg-ink px-4 py-2 font-body text-sm text-cream hover:opacity-80 transition"
              >
                {t(locale, "settings.save")}
              </button>
            </div>
          )}

          {/* Upgrade / Manage */}
          {subStatus?.plan === "business" ? (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2 rounded-xl border-2 border-ink-light bg-white px-4 py-2 font-body text-sm text-ink-muted hover:border-ink hover:text-ink transition"
            >
              <CreditCard className="h-4 w-4" />
              {t(locale, "settings.manageBilling")}
            </button>
          ) : (
            <button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              className="flex items-center gap-2 rounded-xl border-2 border-ink bg-coral px-4 py-2 font-body text-sm font-semibold text-ink hover:opacity-90 transition"
            >
              <Building2 className="h-4 w-4" />
              {t(locale, "settings.upgradeToBusiness")}
            </button>
          )}
        </div>

        {/* Credit Wallet section */}
        {((subStatus?.creditBalance ?? 0) > 0 || (creditHistory && creditHistory.length > 0)) && (
          <div className="mb-6 rounded-2xl border-2 border-ink bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-coral" />
              <h2 className="font-display text-xl font-bold text-ink">
                {t(locale, "credits.historyTitle")}
              </h2>
              {(subStatus?.creditBalance ?? 0) > 0 && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-mustard-light px-3 py-1 font-body text-xs font-bold text-ink">
                  {t(locale, "credits.balance")}: €{((subStatus?.creditBalance ?? 0) / 100).toFixed(2)}
                </span>
              )}
            </div>

            {!creditHistory || creditHistory.length === 0 ? (
              <p className="font-body text-sm text-ink-muted">{t(locale, "credits.noHistory")}</p>
            ) : (
              <ul className="space-y-2">
                {creditHistory.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-3 rounded-xl border border-ink-light bg-cream px-4 py-2.5">
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-sage" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-coral" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-body text-sm text-ink">{tx.description}</p>
                      <p className="font-mono text-xs text-ink-light">
                        {new Date(tx.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}
                      </p>
                    </div>
                    <span className={`font-mono text-sm font-bold shrink-0 ${tx.amount > 0 ? "text-sage" : "text-coral"}`}>
                      {tx.amount > 0 ? "+" : ""}€{(tx.amount / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Theme section */}
        <div className="rounded-3xl border-2 border-ink bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Palette className="h-5 w-5 text-coral" />
            <h2 className="font-body text-lg font-bold text-ink">
              {t(locale, "settings.themeSection")}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {THEMES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition hover:-translate-y-0.5 ${
                  theme === opt.value
                    ? "border-coral shadow-card-coral"
                    : "border-ink-light hover:border-ink"
                }`}
              >
                <div
                  className="h-10 w-10 rounded-full border-2 border-ink"
                  style={{ backgroundColor: opt.preview }}
                />
                <span className="font-body text-xs font-medium text-ink">
                  {t(locale, opt.labelKey)}
                </span>
                {theme === opt.value && (
                  <CheckCircle className="h-4 w-4 text-coral" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
