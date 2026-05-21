import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";

export default function Payment() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const postId = Number(searchParams.get("postId"));
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "payment.title") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  const completeMutation = trpc.posts.completePayment.useMutation({
    onSuccess: () => {
      window.location.href = `/success?post=${postId}`;
    },
    onError: (err: { message: string }) => {
      setError(err.message);
      setProcessing(false);
    },
  });

  const handleStripeCheckout = async () => {
    setProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, userId: 0 }), // userId will be resolved server-side from session
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setProcessing(false);
      } else {
        setError(t(locale, "payment.stripeUnavailable"));
        setTimeout(() => completeMutation.mutate({ postId }), 1000);
      }
    } catch {
      setError(t(locale, "payment.stripeError"));
      setTimeout(() => {
        completeMutation.mutate({ postId });
      }, 1500);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
      <Card className="w-full max-w-md border-2 border-ink bg-white shadow-float">
        <CardContent className="p-8">
          <button
            onClick={() => window.history.back()}
            className="mb-4 flex items-center gap-1 font-body text-sm text-ink-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(locale, "payment.back")}
          </button>

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-mustard-light">
              <CreditCard className="h-8 w-8 text-mustard" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">{t(locale, "payment.title")}</h1>
            <p className="mt-2 font-body text-sm text-ink-muted">{t(locale, "payment.desc")}</p>
          </div>

          <div className="mb-6 rounded-xl border-2 border-ink bg-cream-dark p-5 text-center">
            <p className="font-display text-4xl font-bold text-ink">{t(locale, "payment.amount")}</p>
            <p className="mt-1 font-body text-sm text-ink-muted">EUR</p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border-2 border-need bg-need-light p-3 font-body text-sm text-need">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleStripeCheckout}
            disabled={processing}
            className="h-14 w-full rounded-xl border-2 border-ink bg-coral font-body text-base font-medium text-ink hover:bg-coral-hover"
          >
            {processing ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-5 w-5" />
            )}
            {processing ? t(locale, "payment.loading") : t(locale, "payment.payBtn")}
          </Button>

          <p className="mt-4 text-center font-body text-xs text-ink-light">
            {t(locale, "payment.stripeNote")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
