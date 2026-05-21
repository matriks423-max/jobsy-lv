import { useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Plus, FileText } from "lucide-react";

export default function Success() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "success.title") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);
  const postId = searchParams.get("post");
  const isFree = searchParams.get("free") === "true";

  // Safety net: activate post if Stripe webhook hasn't fired yet.
  // The mutation is idempotent — if already active it returns early without sending another email.
  const completePayment = trpc.posts.completePayment.useMutation();
  useEffect(() => {
    if (!isFree && postId && isAuthenticated) {
      completePayment.mutate({ postId: Number(postId) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
      <div className="w-full max-w-lg rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-float md:p-12">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-sage-light">
          <CheckCircle className="h-10 w-10 text-sage" />
        </div>

        <h1 className="mb-4 font-display text-3xl font-bold text-ink">
          {t(locale, "success.title")}
        </h1>

        <p className="mb-8 font-body text-ink-muted">
          {isFree
            ? t(locale, "success.freeSub")
            : t(locale, "success.paidSub")}
        </p>

        <div className="flex flex-col gap-3">
          {postId && (
            <Link to={`/post/${postId}`}>
              <Button className="h-14 w-full rounded-xl border-2 border-ink bg-coral font-body text-base font-medium text-ink hover:bg-coral-hover">
                <FileText className="mr-2 h-5 w-5" />
                {t(locale, "success.viewPost")}
              </Button>
            </Link>
          )}
          <Link to="/my-posts">
            <Button
              variant="outline"
              className="h-14 w-full rounded-xl border-2 border-ink bg-transparent font-body text-base font-medium text-ink hover:bg-cream-dark"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              {t(locale, "success.myPosts")}
            </Button>
          </Link>
          <Link to="/create">
            <Button
              variant="ghost"
              className="h-12 w-full font-body text-sm text-coral hover:text-coral-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, "success.createAnother")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
