import { useState, useEffect } from "react";
import { useLocale } from "@/lib/locale-context";
import { useTheme, type Theme } from "@/lib/theme-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Phone,
  Mail,
  Loader2,
  CheckCircle,
  Palette,
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

  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateMutation = trpc.profile.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast(t(locale, "settings.saved"), "success");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => toast(err.message, "error"),
  });

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "nav.settings") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  useEffect(() => {
    if (profile?.phone) setPhone(profile.phone);
  }, [profile]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

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
              <div className="h-12 animate-pulse rounded-xl bg-cream-dark" />
              <div className="h-12 animate-pulse rounded-xl bg-cream-dark" />
            </div>
          ) : (
            <div className="space-y-4">
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

              {/* Phone — editable */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 font-body text-sm font-bold text-ink">
                  <Phone className="h-3.5 w-3.5 text-coral" />
                  {t(locale, "settings.phone")}
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+371 2X XXX XXX"
                  className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
                />
                <p className="mt-1 font-body text-xs text-ink-light">
                  {t(locale, "settings.phoneHint")}
                </p>
              </div>

              <Button
                onClick={() => updateMutation.mutate({ phone })}
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
