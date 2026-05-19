import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Trash2,
  ShieldOff,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

type Tab = "review" | "reports";

export default function Admin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [tab, setTab] = useState<Tab>("review");

  const {
    data: pendingPosts,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = trpc.posts.pendingReview.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const {
    data: reports,
    isLoading: reportsLoading,
    refetch: refetchReports,
  } = trpc.posts.listReports.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const approveMutation = trpc.posts.approvePost.useMutation({
    onSuccess: () => refetchPosts(),
  });

  const rejectMutation = trpc.posts.rejectPost.useMutation({
    onSuccess: () => refetchPosts(),
  });

  const resolveMutation = trpc.posts.resolveReport.useMutation({
    onSuccess: () => refetchReports(),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <Skeleton className="h-32 w-full max-w-xl rounded-2xl border-2 border-ink" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-ink-light" />
          <p className="font-body text-lg text-ink">Access denied</p>
          <Button onClick={() => navigate("/")} className="mt-4 rounded-xl border-2 border-ink bg-coral">
            Go home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink">Admin Panel</h1>
          <p className="mt-1 font-body text-sm text-ink-muted">jobsy.lv moderation</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {(["review", "reports"] as Tab[]).map((tVal) => (
            <button
              key={tVal}
              onClick={() => setTab(tVal)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                tab === tVal
                  ? "border-ink bg-coral text-ink"
                  : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
              }`}
            >
              {tVal === "review" ? "Pending Review" : "Reports"}
              {tVal === "review" && (pendingPosts?.length ?? 0) > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${tab === tVal ? "bg-ink text-cream" : "bg-need-light text-need"}`}>
                  {pendingPosts!.length}
                </span>
              )}
              {tVal === "reports" && (reports?.length ?? 0) > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${tab === tVal ? "bg-ink text-cream" : "bg-need-light text-need"}`}>
                  {reports!.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Pending Review */}
        {tab === "review" && (
          <div className="space-y-4">
            {postsLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl border-2 border-ink" />
              ))
            ) : !pendingPosts?.length ? (
              <div className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-sage" />
                <p className="font-body text-ink-muted">No posts pending review</p>
              </div>
            ) : (
              pendingPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-card">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${
                          post.type === "need" ? "border border-need bg-need-light text-need" : "border border-sage bg-sage-light text-sage"
                        }`}>
                          {post.type}
                        </span>
                        <span className="font-mono text-[10px] uppercase text-ink-muted">{post.category}</span>
                        {post.city && <span className="font-body text-xs text-ink-muted">{post.city}</span>}
                      </div>
                      <h3 className="font-body text-base font-bold text-ink">{post.title}</h3>
                      {post.description && (
                        <p className="mt-1 line-clamp-2 font-body text-sm text-ink-muted">{post.description}</p>
                      )}
                      <p className="mt-1 font-mono text-xs text-ink-light">
                        {new Date(post.createdAt).toLocaleString()} · Post #{post.id}
                      </p>
                    </div>
                    <Link to={`/post/${post.id}`} target="_blank">
                      <button className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark" title="View post">
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => approveMutation.mutate({ postId: post.id })}
                      disabled={approveMutation.isPending}
                      className="h-9 rounded-lg border-2 border-sage bg-sage-light px-4 font-body text-sm font-medium text-sage hover:bg-sage hover:text-white"
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => rejectMutation.mutate({ postId: post.id })}
                      disabled={rejectMutation.isPending}
                      className="h-9 rounded-lg border-2 border-need bg-need-light px-4 font-body text-sm font-medium text-need hover:bg-need hover:text-white"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports */}
        {tab === "reports" && (
          <div className="space-y-4">
            {reportsLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl border-2 border-ink" />
              ))
            ) : !reports?.length ? (
              <div className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-sage" />
                <p className="font-body text-ink-muted">No unresolved reports</p>
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-card">
                  <div className="mb-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded border border-need bg-need-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-need">
                        {report.reason}
                      </span>
                      <span className="font-mono text-[10px] text-ink-muted">Post #{report.postId}</span>
                    </div>
                    {report.details && (
                      <p className="mt-1 font-body text-sm text-ink-muted">"{report.details}"</p>
                    )}
                    <p className="mt-1 font-mono text-xs text-ink-light">
                      {new Date(report.createdAt).toLocaleString()} · Report #{report.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/post/${report.postId}`} target="_blank">
                      <button className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-white px-3 py-1.5 font-body text-sm text-ink hover:bg-cream-dark">
                        <ArrowRight className="h-4 w-4" />
                        View post
                      </button>
                    </Link>
                    <Button
                      onClick={() => resolveMutation.mutate({ reportId: report.id, action: "dismiss" })}
                      disabled={resolveMutation.isPending}
                      className="h-9 rounded-lg border-2 border-ink-light bg-cream-dark px-3 font-body text-sm font-medium text-ink hover:bg-cream"
                    >
                      Dismiss
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Delete post and resolve report?")) {
                          resolveMutation.mutate({ reportId: report.id, action: "delete" });
                        }
                      }}
                      disabled={resolveMutation.isPending}
                      className="h-9 rounded-lg border-2 border-need bg-need-light px-3 font-body text-sm font-medium text-need hover:bg-need hover:text-white"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete post
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("Ban the post author and resolve report?")) {
                          resolveMutation.mutate({ reportId: report.id, action: "ban" });
                        }
                      }}
                      disabled={resolveMutation.isPending}
                      className="h-9 rounded-lg border-2 border-need bg-need px-3 font-body text-sm font-medium text-white hover:opacity-90"
                    >
                      <ShieldOff className="mr-1.5 h-4 w-4" />
                      Ban user
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
