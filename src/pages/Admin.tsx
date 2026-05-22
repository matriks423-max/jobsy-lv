import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, XCircle, Trash2, ShieldOff, AlertTriangle,
  FileText, Flag, Loader2, LayoutDashboard, Users, List,
  Eye, ShieldCheck, Ban, UserCheck, Search, Phone,
} from "lucide-react";

type AdminTab = "overview" | "users" | "posts" | "pending" | "reports";

const STATUS_OPTIONS = ["", "active", "pending_review", "pending_payment", "expired", "rejected", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "All", active: "Active", pending_review: "Pending Review",
  pending_payment: "Pending Payment", expired: "Expired", rejected: "Rejected", closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-sage-light text-sage border-sage",
  pending_review: "bg-mustard-light text-ink border-mustard",
  pending_payment: "bg-mustard-light text-ink border-mustard",
  expired: "bg-cream-dark text-ink-muted border-ink-light",
  rejected: "bg-need-light text-need border-need",
  closed: "bg-cream-dark text-ink-muted border-ink-light",
};

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [postStatus, setPostStatus] = useState("");

  useEffect(() => { document.title = "Admin — jobsy.lv"; }, []);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const utils = trpc.useUtils();

  const { data: stats } = trpc.posts.adminStats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: pendingPosts, isLoading: pendingLoading } = trpc.posts.pendingReview.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: reports, isLoading: reportsLoading } = trpc.posts.listReports.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: users, isLoading: usersLoading } = trpc.posts.listUsers.useQuery({ search: userSearch || undefined, limit: 50 }, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: allPosts, isLoading: postsLoading } = trpc.posts.listAllPosts.useQuery({ status: postStatus || undefined, limit: 50 }, { enabled: isAuthenticated && user?.role === "admin" });

  const approveMutation = trpc.posts.approvePost.useMutation({
    onSuccess: () => { toast("Approved", "success"); utils.posts.pendingReview.invalidate(); utils.posts.adminStats.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const rejectMutation = trpc.posts.rejectPost.useMutation({
    onSuccess: () => { toast("Rejected", "success"); utils.posts.pendingReview.invalidate(); utils.posts.adminStats.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const resolveMutation = trpc.posts.resolveReport.useMutation({
    onSuccess: () => { toast("Resolved", "success"); utils.posts.listReports.invalidate(); utils.posts.adminStats.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });
  const setRoleMutation = trpc.posts.setUserRole.useMutation({
    onSuccess: (_, vars) => {
      toast(vars.role === "banned" ? "User banned" : vars.role === "admin" ? "Made admin" : "Unbanned", "success");
      utils.posts.listUsers.invalidate();
    },
    onError: (e) => toast(e.message, "error"),
  });
  const deletePostMutation = trpc.posts.adminDeletePost.useMutation({
    onSuccess: () => { toast("Post deleted", "success"); utils.posts.listAllPosts.invalidate(); utils.posts.adminStats.invalidate(); },
    onError: (e) => toast(e.message, "error"),
  });

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-coral" />
    </div>
  );

  if (!isAuthenticated || user?.role !== "admin") return null;

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "posts", label: "Posts", icon: <List className="h-4 w-4" /> },
    { key: "pending", label: "Review", icon: <FileText className="h-4 w-4" />, badge: stats?.pendingCount },
    { key: "reports", label: "Reports", icon: <Flag className="h-4 w-4" />, badge: stats?.reportsCount },
  ];

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-coral" />
            <h1 className="font-display text-3xl font-bold text-ink">Admin</h1>
          </div>
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs text-ink-muted">
            {user.email}
          </span>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                tab === t.key ? "border-ink bg-coral text-ink" : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
              }`}>
              {t.icon}{t.label}
              {!!t.badge && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === t.key ? "bg-ink text-cream" : "bg-need-light text-need"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Total Users", value: stats?.totalUsers, color: "text-coral" },
                { label: "Active Posts", value: stats?.activePosts, color: "text-sage" },
                { label: "Posts Today", value: stats?.postsToday, color: "text-mustard" },
                { label: "Signups Today", value: stats?.usersToday, color: "text-coral" },
                { label: "Total Posts", value: stats?.totalPosts, color: "text-ink" },
                { label: "Paid Posts", value: stats?.paidPosts, color: "text-sage" },
                { label: "Pending Review", value: stats?.pendingCount, color: "text-mustard" },
                { label: "Open Reports", value: stats?.reportsCount, color: "text-need" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border-2 border-ink bg-white p-5 text-center">
                  <p className={`font-mono text-3xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                  <p className="mt-1 font-body text-xs text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Interests Sent", value: stats?.totalInterests, color: "text-coral" },
                { label: "Reviews Left", value: stats?.totalReviews, color: "text-mustard" },
                { label: "Verified Phones", value: stats?.verifiedPhones, color: "text-sage" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border-2 border-ink bg-white p-5 text-center">
                  <p className={`font-mono text-3xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                  <p className="mt-1 font-body text-xs text-ink-muted">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <div className="mb-4 flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-4 py-2">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="flex-1 bg-transparent font-body text-sm text-ink outline-none placeholder:text-ink-muted"
              />
            </div>
            <div className="space-y-3">
              {usersLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl border-2 border-ink" />)
              ) : users?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body text-sm font-bold text-ink truncate">{u.email}</p>
                      {u.role === "admin" && <span className="rounded bg-coral px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">ADMIN</span>}
                      {u.role === "banned" && <span className="rounded bg-need-light px-1.5 py-0.5 font-mono text-[10px] font-bold text-need">BANNED</span>}
                    </div>
                    <p className="font-mono text-xs text-ink-muted">
                      #{u.id} · {u.name ?? "—"} · {u.authMethod} · joined {new Date(u.createdAt).toLocaleDateString()} · {u.postCount ?? 0} posts
                    </p>
                    {u.phoneVerified && (
                      <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-sage">
                        <Phone className="h-3 w-3" /> phone verified
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {u.role === "banned" ? (
                      <button onClick={() => setRoleMutation.mutate({ userId: u.id, role: "user" })}
                        className="flex items-center gap-1 rounded-lg border-2 border-sage bg-sage-light px-3 py-1.5 font-body text-xs font-medium text-sage hover:bg-sage hover:text-white transition">
                        <UserCheck className="h-3 w-3" /> Unban
                      </button>
                    ) : u.role !== "admin" ? (
                      <button onClick={() => { if (confirm(`Ban ${u.email}?`)) setRoleMutation.mutate({ userId: u.id, role: "banned" }); }}
                        className="flex items-center gap-1 rounded-lg border-2 border-need bg-need-light px-3 py-1.5 font-body text-xs font-medium text-need hover:bg-need hover:text-white transition">
                        <Ban className="h-3 w-3" /> Ban
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ALL POSTS ── */}
        {tab === "posts" && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setPostStatus(s)}
                  className={`rounded-full border-2 px-3 py-1 font-body text-xs font-medium transition ${
                    postStatus === s ? "border-ink bg-ink text-cream" : "border-ink-light bg-white text-ink-muted hover:border-ink"
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {postsLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl border-2 border-ink" />)
              ) : allPosts?.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] ?? "bg-cream-dark text-ink-muted"}`}>
                        {p.status.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs text-ink-muted">{p.category} · {p.city ?? "—"}</span>
                      {!p.wasFree && <span className="rounded bg-mustard-light px-1.5 py-0.5 font-mono text-[10px] text-ink">PAID</span>}
                    </div>
                    <p className="font-body text-sm font-bold text-ink truncate">{p.title}</p>
                    <p className="font-mono text-xs text-ink-muted">#{p.id} · user #{p.userId} · <Eye className="inline h-3 w-3" /> {p.viewCount} · {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link to={`/post/${p.id}`} target="_blank">
                      <button className="rounded-lg border-2 border-ink bg-white p-2 hover:bg-cream-dark"><Eye className="h-3.5 w-3.5" /></button>
                    </Link>
                    <button onClick={() => { if (confirm(`Delete "${p.title}"?`)) deletePostMutation.mutate({ postId: p.id }); }}
                      className="rounded-lg border-2 border-need bg-need-light p-2 text-need hover:bg-need hover:text-white transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PENDING REVIEW ── */}
        {tab === "pending" && (
          <div className="space-y-4">
            {pendingLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl border-2 border-ink" />)
            ) : !pendingPosts?.length ? (
              <div className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-sage" />
                <p className="font-body text-ink-muted">No posts pending review</p>
              </div>
            ) : pendingPosts.map((post) => (
              <div key={post.id} className="rounded-2xl border-2 border-ink bg-white p-5 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-mustard-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-ink">{post.category}</span>
                      <span className="font-mono text-xs text-ink-muted">#{post.id} · {post.type}</span>
                    </div>
                    <h3 className="font-body text-lg font-bold text-ink">{post.title}</h3>
                    {post.description && <p className="mt-1 font-body text-sm text-ink-muted line-clamp-3">{post.description}</p>}
                    <p className="mt-2 font-mono text-xs text-ink-light">{new Date(post.createdAt).toLocaleString("lv-LV")}{post.city && ` · ${post.city}`}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={`/post/${post.id}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border-2 border-ink bg-white p-2 hover:bg-cream-dark">
                      <Eye className="h-4 w-4" />
                    </a>
                    <button onClick={() => approveMutation.mutate({ postId: post.id })} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 rounded-xl border-2 border-sage bg-sage-light px-3 py-2 font-body text-sm text-sage hover:bg-sage hover:text-white transition">
                      <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                    <button onClick={() => rejectMutation.mutate({ postId: post.id })} disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 rounded-xl border-2 border-need bg-need-light px-3 py-2 font-body text-sm text-need hover:bg-need hover:text-white transition">
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === "reports" && (
          <div className="space-y-4">
            {reportsLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl border-2 border-ink" />)
            ) : !reports?.length ? (
              <div className="flex flex-col items-center py-16">
                <AlertTriangle className="mb-4 h-12 w-12 text-ink-light" />
                <p className="font-body text-ink-muted">No pending reports</p>
              </div>
            ) : reports.map((report) => (
              <div key={report.id} className="rounded-2xl border-2 border-need bg-white p-5 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-need-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-need">{report.reason}</span>
                      <span className="font-mono text-xs text-ink-muted">Post #{report.postId}</span>
                    </div>
                    {report.details && <p className="font-body text-sm text-ink-muted">{report.details}</p>}
                    <p className="mt-2 font-mono text-xs text-ink-light">Reported {new Date(report.createdAt).toLocaleString("lv-LV")}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <a href={`/post/${report.postId}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-xl border-2 border-ink bg-white px-3 py-2 font-body text-xs hover:bg-cream-dark">
                      <Eye className="h-3.5 w-3.5" /> View
                    </a>
                    <button onClick={() => resolveMutation.mutate({ reportId: report.id, action: "dismiss" })} disabled={resolveMutation.isPending}
                      className="rounded-xl border-2 border-ink-light bg-cream-dark px-3 py-2 font-body text-xs text-ink-muted hover:border-ink hover:text-ink transition">
                      Dismiss
                    </button>
                    <button onClick={() => { if (confirm(`Delete post #${report.postId}?`)) resolveMutation.mutate({ reportId: report.id, action: "delete" }); }}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 rounded-xl border-2 border-need bg-need-light px-3 py-2 font-body text-xs text-need hover:bg-need hover:text-white transition">
                      <Trash2 className="h-3.5 w-3.5" /> Delete Post
                    </button>
                    <button onClick={() => { if (confirm(`Ban user who posted #${report.postId}?`)) resolveMutation.mutate({ reportId: report.id, action: "ban" }); }}
                      disabled={resolveMutation.isPending}
                      className="flex items-center gap-1 rounded-xl border-2 border-need bg-need px-3 py-2 font-body text-xs text-white hover:opacity-80 transition">
                      <ShieldOff className="h-3.5 w-3.5" /> Ban User
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
