import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithProfile } from "@/types/post";
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
} from "lucide-react";

export default function MyPosts() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { toast } = useToast();
  const [tab, setTab] = useState<"active" | "expired" | "all">("active");

  useEffect(() => {
    const prev = document.title;
    document.title = t(locale, "nav.myPosts") + " — jobsy.lv";
    return () => { document.title = prev; };
  }, [locale]);

  const { data, isLoading } = trpc.posts.myPosts.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast("Sludinājums dzēsts", "success");
      utils.posts.myPosts.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });
  const setFilledMutation = trpc.posts.setFilled.useMutation({
    onSuccess: () => utils.posts.myPosts.invalidate(),
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
        return { label: t(locale, "myPosts.statusActive"), bg: "bg-sage-light", text: "text-sage", border: "border-sage", icon: CheckCircle };
      case "pending_payment":
        return { label: t(locale, "myPosts.statusPending"), bg: "bg-mustard-light", text: "text-ink", border: "border-mustard", icon: Clock };
      case "pending_review":
        return { label: "Tiek pārskatīts", bg: "bg-mustard-light", text: "text-ink", border: "border-mustard", icon: Clock };
      case "rejected":
        return { label: "Noraidīts", bg: "bg-need-light", text: "text-need", border: "border-need", icon: AlertCircle };
      default:
        return { label: t(locale, "myPosts.statusExpired"), bg: "bg-cream-dark", text: "text-ink-light", border: "border-ink-light", icon: AlertCircle };
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">{t(locale, "myPosts.title")}</h1>
          <Button
            onClick={() => navigate("/create")}
            className="h-12 rounded-xl border-2 border-ink bg-coral px-6 font-body font-medium text-ink hover:bg-coral-hover"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t(locale, "myPosts.newPost")}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {(["active", "expired", "all"] as const).map((tVal) => (
            <button
              key={tVal}
              onClick={() => setTab(tVal)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                tab === tVal
                  ? "border-ink bg-coral text-ink"
                  : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              {tVal === "active" ? t(locale, "myPosts.tabActive") : tVal === "expired" ? t(locale, "myPosts.tabExpired") : t(locale, "myPosts.tabAll")}
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === tVal ? "bg-ink text-cream" : "bg-cream-dark text-ink-muted"}`}>
                {counts[tVal]}
              </span>
            </button>
          ))}
        </div>

        {/* Posts List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl border-2 border-ink" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-4">
            {filtered.map((item: PostWithProfile) => {
              const post = item.post;
              const status = getStatusConfig(post.status);
              const StatusIcon = status.icon;
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-float"
                >
                  <div className={`h-16 w-1.5 rounded-full ${post.status === "active" ? "bg-sage" : post.status === "pending_payment" ? "bg-mustard" : "bg-ink-light"}`} />

                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${status.bg} ${status.text} border ${status.border}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                      <span className="font-body text-xs text-ink-muted">{t(locale, `categories.${post.category}` as never)}</span>
                    </div>
                    <h3 className="truncate font-body text-base font-bold text-ink">{post.title}</h3>
                    <p className="font-body text-xs text-ink-muted">
                      {post.city && `${t(locale, `cities.${post.city}` as never)} • `}
                      {t(locale, "postDetail.published", {
                        date: new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"),
                      })}
                      {post.expiresAt && ` • Beidzas ${new Date(post.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="flex items-center gap-1 font-mono text-xs text-ink-light">
                        <Eye className="h-3 w-3" /> {post.viewCount}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-xs text-ink-light">
                        <MessageSquare className="h-3 w-3" /> {post.contactCount}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {post.status === "active" && (
                        <button
                          onClick={() => setFilledMutation.mutate({ postId: post.id, filled: !post.filled })}
                          disabled={setFilledMutation.isPending}
                          title={post.filled ? t(locale, "myPosts.markOpen") : t(locale, "myPosts.markFilled")}
                          className={`rounded-lg border-2 px-2 py-2 font-body text-xs font-medium transition ${
                            post.filled
                              ? "border-sage bg-sage-light text-sage hover:bg-sage"
                              : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
                          }`}
                        >
                          {post.filled ? "✓" : "○"}
                        </button>
                      )}
                      <Link to={`/edit/${post.id}`}>
                        <button className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark" title="Labot">
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Vai tiešām dzēst?")) {
                            deleteMutation.mutate({ id: post.id });
                          }
                        }}
                        className="rounded-lg border-2 border-need bg-need-light p-2 text-need hover:bg-need hover:text-white"
                        title="Dzēst"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link to={`/post/${post.id}`}>
                        <button className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark" title="Skatīt">
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
            <FileText className="mb-4 h-12 w-12 text-ink-light" />
            <p className="mb-4 font-body text-ink-muted">{t(locale, "myPosts.empty")}</p>
            <Button onClick={() => navigate("/create")} className="rounded-xl border-2 border-ink bg-coral">
              <Plus className="mr-2 h-4 w-4" />
              {t(locale, "myPosts.emptyBtn")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
