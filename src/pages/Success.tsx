import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Plus, FileText, Loader2, Clock } from "lucide-react";

export default function Success() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const postId = searchParams.get("post");
  const isFree = searchParams.get("free") === "true";
  const { isAuthenticated } = useAuth();

  const [pollingExpired, setPollingExpired] = useState(false);

  const isPaidFlow = !!postId && !isFree;

  useEffect(() => {
    if (!isPaidFlow) return;
    const timer = setTimeout(() => setPollingExpired(true), 30000);
    return () => clearTimeout(timer);
  }, [isPaidFlow]);

  const { data: statusData } = trpc.posts.getStatus.useQuery(
    { postId: Number(postId) },
    {
      enabled: isPaidFlow && isAuthenticated && !pollingExpired,
      refetchInterval: (query) => {
        const status = query.state.data?.status;
        if (status === "active" || status === "pending_review") return false;
        return 2000;
      },
    }
  );

  const isActivated =
    statusData?.status === "active" || statusData?.status === "pending_review";
  const isWaiting = isPaidFlow && !isActivated && !pollingExpired;

  const getSubtitle = () => {
    if (isFree) return t(locale, "success.freeSub");
    if (statusData?.status === "pending_review") return t(locale, "success.pendingReview");
    return t(locale, "success.paidSub");
  };

  if (isWaiting) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
        <div className="w-full max-w-lg rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-float md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-mustard-light">
            <Loader2 className="h-10 w-10 animate-spin text-mustard" />
          </div>
          <h1 className="mb-4 font-display text-3xl font-bold text-ink">
            {t(locale, "success.activating")}
          </h1>
          <p className="font-body text-ink-muted">{t(locale, "success.paidSub")}</p>
        </div>
      </div>
    );
  }

  const isPendingReview = statusData?.status === "pending_review";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 noise-bg">
      <div className="w-full max-w-lg rounded-3xl border-2 border-ink bg-white p-8 text-center shadow-float md:p-12">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink ${
            isPendingReview ? "bg-mustard-light" : "bg-sage-light"
          }`}
        >
          {isPendingReview ? (
            <Clock className="h-10 w-10 text-mustard" />
          ) : (
            <CheckCircle className="h-10 w-10 text-sage" />
          )}
        </div>

        <h1 className="mb-4 font-display text-3xl font-bold text-ink">
          {t(locale, "success.title")}
        </h1>

        <p className="mb-8 font-body text-ink-muted">{getSubtitle()}</p>

        <div className="flex flex-col gap-3">
          {postId && !isPendingReview && (
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
