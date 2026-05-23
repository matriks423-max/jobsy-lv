import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { ArrowLeft, Mail, UserPlus, Loader2, Gift, Eye, EyeOff } from "lucide-react";

function getGoogleOAuthUrl(referralCode?: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";
  const redirectUri = `${window.location.origin}/api/oauth/google/callback`;
  // Encode redirectUri + optional referral code in state
  const state = btoa(JSON.stringify({ redirectUri, ref: referralCode || null }));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

export default function Login() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "login.pageTitle") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  // Auto-switch to register when referral code is in URL
  const urlRef = searchParams.get("ref") ?? "";
  const [mode, setMode] = useState<"login" | "register">(urlRef ? "register" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(urlRef);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loginMutation = trpc.emailAuth.login.useMutation({
    onSuccess: () => {
      toast(t(locale, "login.toastSuccess"), "success");
      window.location.href = "/";
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const registerMutation = trpc.emailAuth.register.useMutation({
    onSuccess: () => {
      toast(t(locale, "login.toastRegisterSuccess"), "success");
      window.location.href = "/";
    },
    onError: (err) => {
      toast(err.message, "error");
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!email.includes("@")) newErrors.email = t(locale, "login.errorEmail");
    if (password.length < 8) newErrors.password = t(locale, "login.errorPassword");
    if (mode === "register" && name.length < 2) newErrors.name = t(locale, "login.errorName");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ name, email, password, referralCode: referralCode || undefined });
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const hasGoogle = !!googleClientId && googleClientId !== "your_google_client_id.apps.googleusercontent.com";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-body text-sm text-ink-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          {t(locale, "login.back")}
        </Link>

        <Card className="border-2 border-ink bg-white shadow-float">
          <CardContent className="p-8">
            {/* Toggle tabs */}
            <div className="mb-6 flex rounded-xl border-2 border-ink p-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-lg py-2 font-body text-sm font-medium transition ${
                  mode === "login" ? "bg-coral text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t(locale, "login.loginTab")}
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-lg py-2 font-body text-sm font-medium transition ${
                  mode === "register" ? "bg-coral text-ink" : "text-ink-muted hover:text-ink"
                }`}
              >
                {t(locale, "login.registerTab")}
              </button>
            </div>

            {/* Google OAuth */}
            {hasGoogle && (
              <>
                <button
                  onClick={() => { window.location.href = getGoogleOAuthUrl(referralCode || undefined); }}
                  className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-xl border-2 border-ink bg-white font-body text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:bg-cream-dark hover:shadow-card"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {mode === "login" ? t(locale, "login.googleLogin") : t(locale, "login.googleRegister")}
                </button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-ink-light" />
                  <span className="font-body text-xs text-ink-light">{t(locale, "login.orEmail")}</span>
                  <div className="h-px flex-1 bg-ink-light" />
                </div>
              </>
            )}

            {/* Email form */}
            <div className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="mb-1 block font-body text-sm font-medium text-ink">{t(locale, "login.nameLabel")}</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t(locale, "login.namePlaceholder")}
                    className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
                  />
                  {errors.name && <p className="mt-1 font-body text-xs text-need">{errors.name}</p>}
                </div>
              )}

              <div>
                <label className="mb-1 block font-body text-sm font-medium text-ink">{t(locale, "login.emailLabel")}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t(locale, "login.emailPlaceholder")}
                  className="h-12 rounded-xl border-2 border-ink-light bg-white font-body focus:border-coral"
                />
                {errors.email && <p className="mt-1 font-body text-xs text-need">{errors.email}</p>}
              </div>

              <div>
                <label className="mb-1 block font-body text-sm font-medium text-ink">{t(locale, "login.passwordLabel")}</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "register" ? t(locale, "login.passwordPlaceholderMin") : t(locale, "login.passwordPlaceholderLogin")}
                    className="h-12 rounded-xl border-2 border-ink-light bg-white font-body pr-10 focus:border-coral"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 font-body text-xs text-need">{errors.password}</p>}
                {mode === "login" && (
                  <div className="mt-1 text-right">
                    <Link to="/forgot-password" className="font-body text-xs text-coral hover:underline">
                      Aizmirsi paroli?
                    </Link>
                  </div>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <label className="mb-1 block font-body text-sm font-medium text-ink">
                    <span className="flex items-center gap-1">
                      <Gift className="h-3.5 w-3.5 text-coral" />
                      {t(locale, "login.referralLabel")}
                    </span>
                  </label>
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder={t(locale, "login.referralPlaceholder")}
                    className="h-12 rounded-xl border-2 border-ink-light bg-white font-body uppercase focus:border-coral"
                  />
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={loginMutation.isPending || registerMutation.isPending}
                className="h-12 w-full rounded-xl border-2 border-ink bg-coral font-body text-base font-medium text-ink hover:bg-coral-hover"
              >
                {loginMutation.isPending || registerMutation.isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : mode === "login" ? (
                  <Mail className="mr-2 h-5 w-5" />
                ) : (
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                {mode === "login" ? t(locale, "login.submitLogin") : t(locale, "login.submitRegister")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
