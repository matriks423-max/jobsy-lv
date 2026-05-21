import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  XCircle,
  Trash2,
  ShieldOff,
  AlertTriangle,
  FileText,
  Flag,
  Loader2,
} from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [tab, setTab] = useState<"pending" | "reports">("pending");

  useEffect(() => {
    document.title = "Admin — jobsy.lv";
  }, []);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const utils = trpc.useUtils();

  const { data: pendingPosts, isLoading: pendingLoading } = trpc.posts.pendingReview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: reports, isLoading: reportsLoading } = trpc.posts.listReports.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const approveMutation = trpc.posts.approvePost.useMutation({
    onSuccess: () => {
      toast("Post approved", "success");
      utils.posts.pendingReview.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const rejectMutation = trpc.posts.rejectPost.useMutation({
    onSuccess: () => {
      toast("Post rejected", "success");
      utils.posts.pendingReview.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const resolveMutation = trpc.posts.resolveReport.useMutation({
    onSuccess: () => {
      toast("Report resolved", "success");
      utils.posts.listReports.invalidate();
    },
    onError: (err) => toast(err.message, "error"),
  });

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  const pendingCount = pendingPosts?.length ?? 0;
  const reportsCount = reports?.length ?? 0;

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 font-display text-3xl font-bold text-ink md:text-4xl">
          Admin Panel
        </h1>
        <p className="mb-8 font-body text-sm text-ink-muted">
          Logged in as <strong>{user.email}</strong> (admin)
        </p>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab("pending")}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
              tab === "pending"
                ? "border-ink bg-coral text-ink"
                : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            <FileText className="h-4 w-4" />
            Pending Review
            {pendingCount > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === "pending" ? "bg-ink text-cream" : "bg-need-light text-need"}`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("reports")}
            className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
              tab === "reports"
                ? "border-ink bg-coral text-ink"
                : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            <Flag className="h-4 w-4" />
            Reports
            {reportsCount > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${tab === "reports" ? "bg-ink text-cream" : "bg-need-light text-need"}`}>
                {reportsCount}
              </span>
            )}
          </button>
        </div>

        {/* Pending Review Tab */}
        {tab === "pending" && (
          <div className="space-y-4">
            {pendingLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl border-2 border-ink" />
              ))
            ) : pendingPosts && pendingPosts.length > 0 ? (
              pendingPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border-2 border-ink bg-white p-5 shadow-card"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-mustard-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-ink">
                          {post.category}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">#{post.id}</span>
                        <span className="font-mono text-xs text-ink-muted">
                          {post.type}
                        </span>
                      </div>
                      <h3 className="font-body text-lg font-bold text-ink">{post.title}</h3>
                      {post.description && (
                        <p className="mt-1 font-body text-sm text-ink-muted line-clamp-3">
                          {post.description}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-xs text-ink-light">
                        {new Date(post.createdAt).toLocaleString("lv-LV")}
                        {post.city && ` • ${post.city}`}
                        {post.budgetText && ` • ${post.budgetText}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => approveMutation.mutate({ postId: post.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="h-9 rounded-xl border-2 border-sage bg-sage-light px-4 font-body text-sm text-sage hover:bg-sage hover:text-white"
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => rejectMutation.mutate({ postId: post.id })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        className="h-9 rounded-xl border-2 border-need bg-need-light px-4 font-body text-sm text-need hover:bg-need hover:text-white"
                      >
                        <XCircle className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <a
                      href={`/post/${post.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-xs text-coral underline hover:text-coral-hover"
                    >
                      View post →
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-sage" />
                <p className="font-body text-ink-muted">No posts pending review</p>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {tab === "reports" && (
          <div className="space-y-4">
            {reportsLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl border-2 border-ink" />
              ))
            ) : reports && reports.length > 0 ? (
              reports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border-2 border-need bg-white p-5 shadow-card"
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded bg-need-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-need">
                          {report.reason}
                        </span>
                        <span className="font-mono text-xs text-ink-muted">
                          Post #{report.postId}
                        </span>
                      </div>
                      {report.details && (
                        <p className="mt-1 font-body text-sm text-ink-muted">
                          {report.details}
                        </p>
                      )}
                      <p className="mt-2 font-mono text-xs text-ink-light">
                        Reported {new Date(report.createdAt).toLocaleString("lv-LV")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Button
                        onClick={() => resolveMutation.mutate({ reportId: report.id, action: "dismiss" })}
                        disabled={resolveMutation.isPending}
                        className="h-9 rounded-xl border-2 border-ink-light bg-cream-dark px-4 font-body text-sm text-ink-muted hover:border-ink hover:text-ink"
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm(`Delete post #${report.postId}?`)) {
                            resolveMutation.mutate({ reportId: report.id, action: "delete" });
                          }
                        }}
                        disabled={resolveMutation.isPending}
                        className="h-9 rounded-xl border-2 border-need bg-need-light px-4 font-body text-sm text-need hover:bg-need hover:text-white"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete Post
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm(`Ban user who posted #${report.postId}?`)) {
                            resolveMutation.mutate({ reportId: report.id, action: "ban" });
                          }
                        }}
                        disabled={resolveMutation.isPending}
                        className="h-9 rounded-xl border-2 border-need bg-need px-4 font-body text-sm text-white hover:opacity-80"
                      >
                        <ShieldOff className="mr-1 h-4 w-4" />
                        Ban User
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <a
                      href={`/post/${report.postId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-xs text-coral underline hover:text-coral-hover"
                    >
                      View reported post →
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center py-16">
                <AlertTriangle className="mb-4 h-12 w-12 text-ink-light" />
                <p className="font-body text-ink-muted">No pending reports</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
