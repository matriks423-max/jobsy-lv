import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Loader2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function ForgotPassword() {
  const { locale } = useLocale();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "forgotPassword.pageTitle") + " — Jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => setDone(true),
  });

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-12 w-12" style={{ color: "var(--coral)" }} />
          <h1 className="font-headline text-2xl font-bold text-on-surface">{t(locale, "forgotPassword.successTitle")}</h1>
          <p className="mt-2 font-body text-on-surface-variant">
            {t(locale, "forgotPassword.successDesc")}
          </p>
          <Link to="/login" className="mt-6 inline-block font-body text-sm text-accent-coral hover:underline">
            {t(locale, "forgotPassword.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-headline text-3xl font-bold text-on-surface">{t(locale, "forgotPassword.heading")}</h1>
          <p className="mt-2 font-body text-sm text-on-surface-variant">
            {t(locale, "forgotPassword.subheading")}
          </p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); forgotMutation.mutate({ email }); }}
          className="rounded-2xl border border-outline-variant bg-white p-6 shadow-[4px_4px_0_var(--ink)]"
        >
          {forgotMutation.isError && (
            <div className="mb-4 rounded-xl border-2 border-need bg-need/10 px-3 py-2 font-body text-sm text-need">
              {forgotMutation.error.message}
            </div>
          )}

          <div className="mb-6">
            <label className="mb-1 block font-body text-sm font-medium text-on-surface">{t(locale, "forgotPassword.emailLabel")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(locale, "forgotPassword.emailPlaceholder")}
              className="w-full rounded-xl border border-outline-variant bg-surface-cream px-4 py-2.5 font-body text-sm outline-none focus:border-primary-DEFAULT"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={forgotMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant py-2.5 font-body font-semibold transition-all hover:-translate-y-0.5 hover:[box-shadow:3px_3px_0_var(--ink)] disabled:opacity-60"
            style={{ background: "var(--coral)" }}
          >
            {forgotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t(locale, "forgotPassword.submitBtn")}
          </button>
        </form>

        <p className="mt-4 text-center font-body text-sm text-on-surface-variant">
          <Link to="/login" className="text-coral hover:underline">
            {t(locale, "forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
