import { useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, ArrowRight, Plus, FileText } from "lucide-react";

export default function Success() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "success.title") + " — Jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);
  const postId = searchParams.get("post");
  const isFree = searchParams.get("free") === "true";
  const isReview = searchParams.get("review") === "true";

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg rounded-3xl border border-outline-variant bg-white p-8 text-center shadow-float md:p-12">
        <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant ${isReview ? "bg-mustard-light" : "bg-success-emerald/10"}`}>
          {isReview
            ? <Clock className="h-10 w-10 text-on-surface-variant" />
            : <CheckCircle className="h-10 w-10 text-success-emerald" />}
        </div>

        <h1 className="mb-4 font-headline text-3xl font-bold text-on-surface">
          {isReview ? t(locale, "success.reviewTitle") : t(locale, "success.title")}
        </h1>

        <p className="mb-8 font-body text-on-surface-variant">
          {isReview
            ? t(locale, "success.reviewSub")
            : isFree
            ? t(locale, "success.freeSub")
            : t(locale, "success.paidSub")}
        </p>

        <div className="flex flex-col gap-3">
          {postId && (
            <Link to={`/post/${postId}`}>
              <Button className="h-14 w-full rounded-xl border border-outline-variant bg-accent-coral font-body text-base font-medium text-on-surface hover:bg-[#e56a3a]">
                <FileText className="mr-2 h-5 w-5" />
                {t(locale, "success.viewPost")}
              </Button>
            </Link>
          )}
          <Link to="/my-posts">
            <Button
              variant="outline"
              className="h-14 w-full rounded-xl border border-outline-variant bg-transparent font-body text-base font-medium text-on-surface hover:bg-surface-cream"
            >
              <ArrowRight className="mr-2 h-5 w-5" />
              {t(locale, "success.myPosts")}
            </Button>
          </Link>
          <Link to="/create">
            <Button
              variant="ghost"
              className="h-12 w-full font-body text-sm text-accent-coral hover:text-accent-coral-hover"
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
