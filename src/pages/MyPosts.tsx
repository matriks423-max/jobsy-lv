import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import MagneticButton from "@/components/premium/MagneticButton";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithProfile } from "@/types/post";
import BoostPicker from "@/components/BoostPicker";
import {
  Plus,
  Eye,
  MessageSquare,
  FileText,
  ArrowRight,
  Pencil,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Heart,
  Zap,
  RefreshCw,
  TrendingUp,
  BarChart2,
  Lock,
} from "lucide-react";

export default function MyPosts() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { toast } = useToast();
  const [tab, setTab] = useState<"active" | "expired" | "all" | "analytics">("active");
  const [boostingPostId, setBoostingPostId] = useState<number | null>(null);
  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated ?? false });
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "nav.myPosts") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  // Handle Stripe boost redirect
  useEffect(() => {
    if (searchParams.get("boosted") === "true") {
      toast(t(locale, "myPosts.toastBoostActivated"), "success");
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = trpc.posts.myPosts.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });
  const { data: analyticsData } = trpc.posts.myAnalytics.useQuery(undefined, {
    enabled: (isAuthenticated ?? false) && subStatus?.plan === "business",
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast(t(locale, "createPost.toastDeleted"), "success");
      utils.posts.myPosts.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });
  const renewMutation = trpc.posts.renew.useMutation({
    onSuccess: (data) => {
      toast(t(locale, "myPosts.toastRenewed"), "success");
      utils.posts.myPosts.invalidate();
      navigate(`/post/${data.postId}`);
    },
    onError: (err) => toast(err.message, "error"),
  });
  const setFilledMutation = trpc.posts.setFilled.useMutation({
    onSuccess: (_data, variables) => {
      utils.posts.myPosts.invalidate();
      toast(
        variables.filled ? t(locale, "myPosts.toastFilled") : t(locale, "myPosts.toastOpen"),
        "success"
      );
    },
    onError: (err) => toast(err.message, "error"),
  });

  const INACTIVE_STATUSES = ["expired", "closed", "pending_payment", "pending_review", "rejected"] as const;

  const filtered =
    data?.filter((item: PostWithProfile) => {
      const post = item.post;
      if (tab === "all") return true;
      if (tab === "active") return post.status === "active";
      if (tab === "expired") return (INACTIVE_STATUSES as readonly string[]).includes(post.status);
      return true;
    }) ?? [];

  const counts = {
    active: data?.filter((item: PostWithProfile) => item.post.status === "active").length ?? 0,
    expired:
      data?.filter((item: PostWithProfile) =>
        (INACTIVE_STATUSES as readonly string[]).includes(item.post.status)
      ).length ?? 0,
    all: data?.length ?? 0,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return { label: t(locale, "myPosts.statusActive"), bg: "bg-success-emerald/10", text: "text-success-emerald", border: "border-success-emerald", icon: CheckCircle };
      case "pending_payment":
        return { label: t(locale, "myPosts.statusPending"), bg: "bg-surface-cream", text: "text-on-surface", border: "border-accent-coral", icon: Clock };
      case "pending_review":
        return { label: t(locale, "myPosts.statusReview"), bg: "bg-surface-cream", text: "text-on-surface", border: "border-accent-coral", icon: Clock };
      case "rejected":
        return { label: t(locale, "myPosts.statusRejected"), bg: "bg-surface-cream", text: "text-secondary-DEFAULT", border: "border-need", icon: AlertCircle };
      default:
        return { label: t(locale, "myPosts.statusExpired"), bg: "bg-surface-cream", text: "text-outline", border: "border-outline-variant", icon: AlertCircle };
    }
  };

  const getBoostTimeRemaining = (expiresAt: Date | string) => {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">{t(locale, "myPosts.title")}</h1>
          <MagneticButton strength={0.4}>
            <Button
              onClick={() => navigate("/create")}
              className="h-12 rounded-xl border border-outline-variant bg-accent-coral px-6 font-body font-medium text-on-surface hover:bg-accent-coral-hover"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, "myPosts.newPost")}
            </Button>
          </MagneticButton>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(["active", "expired", "all"] as const).map((tVal) => (
            <button
              key={tVal}
              onClick={() => setTab(tVal)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                tab === tVal
                  ? "border-primary bg-accent-coral text-on-surface"
                  : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-on-surface"
              }`}
            >
              {tVal === "active" ? t(locale, "myPosts.tabActive") : tVal === "expired" ? t(locale, "myPosts.tabExpired") : t(locale, "myPosts.tabAll")}
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === tVal ? "bg-primary text-white" : "bg-surface-cream text-on-surface-variant"}`}>
                {counts[tVal]}
              </span>
            </button>
          ))}
          {/* Analytics tab — visible to all, locked for free users */}
          <button
            onClick={() => setTab("analytics")}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
              tab === "analytics"
                ? "border-primary bg-primary text-white"
                : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-on-surface"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {t(locale, "myPosts.analyticsTab")}
            {subStatus?.plan !== "business" && <Lock className="h-3 w-3 text-outline" />}
          </button>
        </div>

        {/* Analytics Panel */}
        {tab === "analytics" && (
          subStatus?.plan !== "business" ? (
            <div className="flex flex-col items-center rounded-2xl border border-outline-variant bg-white py-14 text-center">
              <Lock className="mb-3 h-10 w-10 text-outline" />
              <p className="mb-1 font-body font-bold text-on-surface">{t(locale, "myPosts.analyticsBusinessOnly")}</p>
              <a
                href="/pricing"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-accent-coral px-5 py-2.5 font-body text-sm font-medium text-on-surface hover:bg-accent-coral-hover"
              >
                {t(locale, "myPosts.analyticsUpgrade")}
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-outline-variant bg-white overflow-hidden">
              {/* Summary row */}
              {analyticsData && analyticsData.length > 0 && (
                <div className="grid grid-cols-3 border-b border-on-surface">
                  {[
                    { icon: Eye, label: t(locale, "myPosts.analyticsViews"), value: analyticsData.reduce((s, p) => s + p.viewCount, 0) },
                    { icon: MessageSquare, label: t(locale, "myPosts.analyticsContacts"), value: analyticsData.reduce((s, p) => s + p.contactCount, 0) },
                    { icon: Heart, label: t(locale, "myPosts.analyticsInterests"), value: analyticsData.reduce((s, p) => s + p.interestCount, 0) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex flex-col items-center py-4 text-center">
                      <Icon className="mb-1 h-4 w-4 text-on-surface-variant" />
                      <span className="font-headline text-2xl font-bold text-accent-coral">{value}</span>
                      <span className="font-body text-xs text-on-surface-variant">{label}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Per-post table */}
              {!analyticsData || analyticsData.length === 0 ? (
                <div className="py-12 text-center font-body text-on-surface-variant">{t(locale, "myPosts.analyticsEmpty")}</div>
              ) : (
                <div className="divide-y divide-ink/10">
                  {analyticsData.map((post) => (
                    <div key={post.id} className="flex items-center gap-3 px-4 py-3">
                      <div className={`h-10 w-1 shrink-0 rounded-full ${post.status === "active" ? "bg-success-emerald" : "bg-outline/20"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-on-surface">{post.title}</p>
                        <p className="font-mono text-xs text-on-surface-variant">
                          {new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 font-mono text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{post.viewCount}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{post.contactCount}</span>
                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{post.interestCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        )}

        {/* Posts List */}
        {tab !== "analytics" && (isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl border border-outline-variant" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((item: PostWithProfile & { interestCount?: number }) => {
              const post = item.post;
              const status = getStatusConfig(post.status);
              const StatusIcon = status.icon;
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className={`h-16 w-1.5 rounded-full ${post.status === "active" ? "bg-success-emerald" : post.status === "pending_payment" ? "bg-accent-coral" : "bg-outline/20"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${status.bg} ${status.text} border ${status.border}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      <span className="font-body text-xs text-on-surface-variant">{t(locale, `categories.${post.category}` as never)}</span>
                      {post.boostType !== "none" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
                        <span className="flex items-center gap-0.5 rounded-full border border-accent-coral bg-accent-coral/10 px-1.5 py-0.5 font-mono text-[10px] text-accent-coral">
                          <Zap className="h-2.5 w-2.5" />
                          {post.boostType === "bump" ? "Bump" : post.boostType === "featured" ? "Featured" : "Urgent"}
                          {getBoostTimeRemaining(post.boostExpiresAt) && (
                            <span className="ml-0.5 opacity-70">· {getBoostTimeRemaining(post.boostExpiresAt)}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <h3 className="truncate font-body text-base font-bold text-on-surface">{post.title}</h3>
                    <p className="font-body text-xs text-on-surface-variant">
                      {post.city && `${t(locale, `cities.${post.city}` as never)} · `}
                      {t(locale, "postDetail.published", {
                        date: new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"),
                      })}
                      {post.expiresAt && ` · ${t(locale, "myPosts.expires")} ${new Date(post.expiresAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden flex-col items-end sm:flex">
                      <span className={`flex items-center gap-1 font-mono text-xs ${post.boostType !== "none" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() ? "text-accent-coral font-semibold" : "text-outline"}`}>
                        {post.boostType !== "none" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date()
                          ? <TrendingUp className="h-3 w-3" />
                          : <Eye className="h-3 w-3" />
                        }
                        {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-xs text-outline">
                        <MessageSquare className="h-3 w-3" /> {post.contactCount}
                      </span>
                      {post.type === "need" && (
                        <span className="flex items-center gap-1 font-mono text-xs text-accent-coral">
                          <Heart className="h-3 w-3" /> {item.interestCount ?? 0}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {post.status === "active" && (
                        <button
                          onClick={() => setFilledMutation.mutate({ postId: post.id, filled: !post.filled })}
                          disabled={setFilledMutation.isPending}
                          title={post.filled ? t(locale, "myPosts.markOpen") : t(locale, "myPosts.markFilled")}
                          className={`rounded-lg border-2 px-2 py-2 font-body text-xs font-medium transition ${
                            post.filled
                              ? "border-success-emerald bg-success-emerald/10 text-success-emerald hover:bg-success-emerald"
                              : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-on-surface"
                          }`}
                        >
                          {post.filled ? "✓" : "—"}
                        </button>
                      )}
                      <button
                        onClick={() => setBoostingPostId(post.id)}
                        className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface hover:bg-surface-cream"
                        title={t(locale, "boost.title")}
                      >
                        <Zap className="h-4 w-4" />
                      </button>
                      <Link to={`/edit/${post.id}`}>
                        <button className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface hover:bg-surface-cream" title={t(locale, "createPost.editTitle")}>
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Link>
                      {["expired", "closed"].includes(post.status) && (
                        <button
                          onClick={() => renewMutation.mutate({ postId: post.id })}
                          disabled={renewMutation.isPending}
                          className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface hover:bg-surface-cream"
                          title={t(locale, "myPosts.renewTooltip")}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(t(locale, "myPosts.confirmDelete"))) {
                            deleteMutation.mutate({ id: post.id });
                          }
                        }}
                        className="rounded-lg border-2 border-need bg-surface-cream p-2 text-secondary-DEFAULT hover:bg-need hover:text-white"
                        title={t(locale, "createPost.deleteBtn")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link to={`/post/${post.id}`}>
                        <button className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface hover:bg-surface-cream" title={t(locale, "browse.viewPost")}>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center py-16">
            <FileText className="mb-4 h-12 w-12 text-outline" />
            <p className="mb-4 font-body text-on-surface-variant">{t(locale, "myPosts.empty")}</p>
            <Button onClick={() => navigate("/create")} className="rounded-xl border border-outline-variant bg-accent-coral">
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, "myPosts.emptyBtn")}
            </Button>
          </div>
        ))}
      </div>
      {boostingPostId !== null && (
        <BoostPicker
          postId={boostingPostId}
          isBusiness={subStatus?.plan === "business"}
          freeBoostsRemaining={subStatus?.freeBoostsRemaining ?? 0}
          creditBalance={subStatus?.creditBalance ?? 0}
          onClose={() => setBoostingPostId(null)}
        />
      )}
    </div>
  );
}
