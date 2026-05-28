import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
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


export default function Settings() {
  const { locale } = useLocale();
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
    document.title = t(locale, "nav.settings") + " ? jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  // Handle Stripe redirect params
  useEffect(() => {
    if (searchParams.get("subscribed") === "true" || searchParams.get("subscribed") === "pro") {
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
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-coral" />
      </div>
    );
  }

  const phoneChanged = phone !== (profile?.phone ?? "");
  const canVerify = !!phone && !phoneChanged && !profile?.phoneVerified;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-8 font-headline text-3xl font-bold text-on-surface md:text-4xl">
          {t(locale, "settings.title")}
        </h1>

        {/* Profile section */}
        <div className="mb-6 rounded-3xl border border-outline-variant bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <User className="h-5 w-5 text-accent-coral" />
            <h2 className="font-body text-lg font-bold text-on-surface">
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
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-on-surface">
                  <Edit3 className="h-3.5 w-3.5 text-accent-coral" />
                  {t(locale, "settings.name")}
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(locale, "settings.namePlaceholder")}
                  className="h-12 rounded-xl border-2 border-outline-variant bg-white font-body focus:border-primary"
                />
              </div>

              {/* Email ? read only */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-on-surface">
                  <Mail className="h-3.5 w-3.5 text-accent-coral" />
                  {t(locale, "settings.email")}
                </label>
                <div className="flex h-12 items-center rounded-xl border-2 border-outline-variant bg-surface-cream px-4 font-body text-sm text-on-surface-variant">
                  {profile?.email ?? "?"}
                  <span className="ml-auto rounded bg-surface-cream px-2 py-0.5 font-mono text-[10px] text-outline">
                    {t(locale, "settings.emailReadOnly")}
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-on-surface">
                  <Phone className="h-3.5 w-3.5 text-accent-coral" />
                  {t(locale, "settings.phone")}
                  {profile?.phoneVerified && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-success-emerald bg-success-emerald/10 px-2 py-0.5 font-body text-[10px] font-medium text-success-emerald">
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
                  className="h-12 rounded-xl border-2 border-outline-variant bg-white font-body focus:border-primary"
                />
                <p className="mt-1 font-body text-xs text-outline">
                  {t(locale, "settings.phoneHint")}
                </p>

                {/* Verify button ? shown after saving phone, if not yet verified */}
                {canVerify && !otpSent && (
                  <button
                    onClick={() => sendOtpMutation.mutate({ phone })}
                    disabled={sendOtpMutation.isPending}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-cream px-4 py-2 font-body text-sm font-medium text-on-surface hover:bg-surface-cream/70"
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
                      className="h-12 w-36 rounded-xl border border-outline-variant bg-white text-center font-mono text-lg tracking-widest focus:border-primary"
                    />
                    <Button
                      onClick={() => verifyOtpMutation.mutate({ phone, code: otpCode })}
                      disabled={otpCode.length !== 6 || verifyOtpMutation.isPending}
                      className="h-12 rounded-xl border border-outline-variant bg-success-emerald px-4 font-body font-medium text-on-surface hover:bg-success-emerald/80 disabled:opacity-50"
                    >
                      {verifyOtpMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t(locale, "settings.otpConfirm")}
                    </Button>
                  </div>
                )}
              </div>

              <Button
                onClick={() => updateMutation.mutate({ phone, name: name || undefined })}
                disabled={updateMutation.isPending || saved}
                className="h-12 w-full rounded-xl border border-outline-variant bg-accent-coral font-body font-medium text-on-surface hover:bg-accent-coral-hover"
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
        <div className="mb-6 rounded-3xl border border-outline-variant bg-white p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <Bell className="h-5 w-5 text-accent-coral" />
            <h2 className="font-body text-lg font-bold text-on-surface">
              {t(locale, "settings.alertsSection")}
            </h2>
          </div>
          {!savedSearches || savedSearches.length === 0 ? (
            <p className="font-body text-sm text-on-surface-variant">{t(locale, "settings.alertsEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {savedSearches.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border-2 border-outline-variant bg-surface-cream p-3">
                  <div>
                    <p className="font-body text-sm font-bold text-on-surface">{s.label}</p>
                    <p className="font-mono text-xs text-outline">
                      {s.type} {s.category ? `? ${s.category}` : ""} {s.city ? `? ${s.city}` : ""} {s.keyword ? `? "${s.keyword}"` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSearchMutation.mutate({ id: s.id })}
                    className="rounded-lg border border-outline-variant p-2 text-on-surface-variant hover:border-need hover:text-secondary-DEFAULT"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Business Plan */}
        <div className="mb-6 rounded-2xl border border-outline-variant bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent-coral" />
            <h2 className="font-headline text-xl font-bold text-on-surface">
              {t(locale, "settings.businessProfile")}
            </h2>
          </div>

          {/* Plan status */}
          <div className={`mb-4 rounded-xl border-2 px-4 py-3 ${subStatus?.plan === "business" ? "border-success-emerald bg-success-emerald/10" : subStatus?.plan === "pro" ? "border-primary bg-on-surface/5" : "border-outline-variant bg-surface-cream"}`}>
            <p className="font-body text-sm font-bold text-on-surface">
              {subStatus?.plan === "business"
                ? t(locale, "settings.currentPlanBusiness")
                : subStatus?.plan === "pro"
                ? "Pro"
                : t(locale, "settings.currentPlanFree")}
            </p>
            {subStatus?.plan === "free" && (
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                {subStatus.activePostCount}/1 {t(locale, "pricing.freePostsPerMonth")}
              </p>
            )}
            {subStatus?.plan === "business" && (
              <p className="mt-0.5 font-body text-xs text-on-surface-variant">
                {subStatus.freeBoostsRemaining} {t(locale, "settings.freeBoostsRemaining")}
              </p>
            )}
          </div>

          {/* Business-only: company fields */}
          {subStatus?.plan === "business" && (
            <div className="mb-4 space-y-3">
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-on-surface">
                  {t(locale, "settings.companyName")}
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border-2 border-outline-variant bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-primary"
                  placeholder={t(locale, "settings.companyNamePlaceholder")}
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-on-surface">
                  {t(locale, "settings.companyWebsite")}
                </label>
                <input
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}
                  type="url"
                  className="w-full rounded-xl border-2 border-outline-variant bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-primary"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block font-body text-xs font-medium text-on-surface">
                  {t(locale, "settings.companyDescription")}
                </label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className="w-full rounded-xl border-2 border-outline-variant bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-primary resize-none"
                />
              </div>
              <button
                onClick={() => updateMutation.mutate({ companyName, companyWebsite, companyDescription })}
                disabled={updateMutation.isPending}
                className="rounded-xl border border-outline-variant bg-primary px-4 py-2 font-body text-sm text-white hover:opacity-80 transition"
              >
                {t(locale, "settings.save")}
              </button>
            </div>
          )}

          {/* Upgrade / Manage */}
          {subStatus?.plan === "business" || subStatus?.plan === "pro" ? (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2 rounded-xl border-2 border-outline-variant bg-white px-4 py-2 font-body text-sm text-on-surface-variant hover:border-primary hover:text-on-surface transition"
            >
              <CreditCard className="h-4 w-4" />
              {t(locale, "settings.manageBilling")}
            </button>
          ) : (
            <button
              onClick={() => upgradeMutation.mutate()}
              disabled={upgradeMutation.isPending}
              className="flex items-center gap-2 rounded-xl border border-outline-variant bg-accent-coral px-4 py-2 font-body text-sm font-semibold text-on-surface hover:opacity-90 transition"
            >
              <Building2 className="h-4 w-4" />
              {t(locale, "settings.upgradeToBusiness")}
            </button>
          )}
        </div>

        {/* Credit Wallet section */}
        {((subStatus?.creditBalance ?? 0) > 0 || (creditHistory && creditHistory.length > 0)) && (
          <div className="mb-6 rounded-2xl border border-outline-variant bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-accent-coral" />
              <h2 className="font-headline text-xl font-bold text-on-surface">
                {t(locale, "credits.historyTitle")}
              </h2>
              {(subStatus?.creditBalance ?? 0) > 0 && (
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-cream px-3 py-1 font-body text-xs font-bold text-on-surface">
                  {t(locale, "credits.balance")}: ?{((subStatus?.creditBalance ?? 0) / 100).toFixed(2)}
                </span>
              )}
            </div>

            {!creditHistory || creditHistory.length === 0 ? (
              <p className="font-body text-sm text-on-surface-variant">{t(locale, "credits.noHistory")}</p>
            ) : (
              <ul className="space-y-2">
                {creditHistory.map((tx) => (
                  <li key={tx.id} className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-cream px-4 py-2.5">
                    {tx.amount > 0 ? (
                      <ArrowDownLeft className="h-4 w-4 shrink-0 text-success-emerald" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-accent-coral" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-body text-sm text-on-surface">{tx.description}</p>
                      <p className="font-mono text-xs text-outline">
                        {new Date(tx.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}
                      </p>
                    </div>
                    <span className={`font-mono text-sm font-bold shrink-0 ${tx.amount > 0 ? "text-success-emerald" : "text-accent-coral"}`}>
                      {tx.amount > 0 ? "+" : ""}?{(tx.amount / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
