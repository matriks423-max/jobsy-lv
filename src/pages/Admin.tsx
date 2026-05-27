import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, XCircle, Trash2, ShieldOff, AlertTriangle,
  FileText, Flag, Loader2, LayoutDashboard, Users, List,
  Eye, ShieldCheck, Ban, UserCheck, Search, Phone, Share2, Download, Wallet,
} from "lucide-react";

function downloadCsv(filename: string, rows: string[][]): void {
  const escape = (v: unknown) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type AdminTab = "overview" | "users" | "posts" | "pending" | "reports" | "queue" | "credits";

const STATUS_OPTIONS = ["", "active", "pending_review", "pending_payment", "expired", "rejected", "closed"] as const;
const STATUS_LABELS: Record<string, string> = {
  "": "All", active: "Active", pending_review: "Pending Review",
  pending_payment: "Pending Payment", expired: "Expired", rejected: "Rejected", closed: "Closed",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-success-emerald/10 text-success-emerald border-sage",
  pending_review: "bg-surface-cream text-on-surface border-mustard",
  pending_payment: "bg-surface-cream text-on-surface border-mustard",
  expired: "bg-surface-cream text-on-surface-variant border-ink-light",
  rejected: "bg-need-light text-need border-need",
  closed: "bg-surface-cream text-on-surface-variant border-ink-light",
};

export default function Admin() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [postStatus, setPostStatus] = useState("");

  useEffect(() => { document.title = "Admin — Jobsy.lv"; }, []);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAuthenticated, user, navigate]);

  const utils = trpc.useUtils();

  const isAdmin = (isAuthenticated ?? false) && user?.role === "admin";

  const { data: stats } = trpc.posts.adminStats.useQuery(undefined, { enabled: isAdmin });
  const { data: pendingPosts, isLoading: pendingLoading } = trpc.posts.pendingReview.useQuery(undefined, { enabled: isAdmin });
  const { data: reports, isLoading: reportsLoading } = trpc.posts.listReports.useQuery(undefined, { enabled: isAdmin });
  const { data: users, isLoading: usersLoading } = trpc.posts.listUsers.useQuery({ search: userSearch || undefined, limit: 50 }, { enabled: isAdmin });
  const { data: allPosts, isLoading: postsLoading } = trpc.posts.listAllPosts.useQuery({ status: postStatus || undefined, limit: 50 }, { enabled: isAdmin });
  const [queueStatus, setQueueStatus] = useState<"pending" | "posted" | "failed" | "">("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantEuros, setGrantEuros] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const { data: socialQueueData, isLoading: queueLoading } = trpc.posts.socialQueue.useQuery({ status: queueStatus || undefined, limit: 100 }, { enabled: isAdmin });

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
  const grantCreditsMutation = trpc.subscription.adminGrantCredits.useMutation({
    onSuccess: (data) => {
      toast(`Granted €${(data.cents / 100).toFixed(2)} to user #${data.userId}`, "success");
      setGrantEmail(""); setGrantEuros(""); setGrantNote("");
    },
    onError: (e) => toast(e.message, "error"),
  });

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-accent-coral" />
    </div>
  );

  if (!isAuthenticated || user?.role !== "admin") return null;

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "users", label: "Users", icon: <Users className="h-4 w-4" /> },
    { key: "posts", label: "Posts", icon: <List className="h-4 w-4" /> },
    { key: "pending", label: "Review", icon: <FileText className="h-4 w-4" />, badge: stats?.pendingCount },
    { key: "reports", label: "Reports", icon: <Flag className="h-4 w-4" />, badge: stats?.reportsCount },
    { key: "queue", label: "Social Queue", icon: <Share2 className="h-4 w-4" /> },
    { key: "credits", label: "Credits", icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-accent-coral" />
            <h1 className="font-headline text-3xl font-bold text-on-surface">Admin</h1>
          </div>
          <span className="rounded-full border border-outline-variant bg-white px-3 py-1 font-mono text-xs text-on-surface-variant">
            {user.email}
          </span>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                tab === t.key ? "border-ink bg-accent-coral text-on-surface" : "border-ink-light bg-white text-on-surface-variant hover:border-ink hover:text-on-surface"
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
                { label: "Total Users", value: stats?.totalUsers, color: "text-accent-coral" },
                { label: "Active Posts", value: stats?.activePosts, color: "text-success-emerald" },
                { label: "Posts Today", value: stats?.postsToday, color: "text-accent-coral" },
                { label: "Signups Today", value: stats?.usersToday, color: "text-accent-coral" },
                { label: "Total Posts", value: stats?.totalPosts, color: "text-ink" },
                { label: "Business Users", value: stats?.businessUsers, color: "text-success-emerald" },
                { label: "Pending Review", value: stats?.pendingCount, color: "text-accent-coral" },
                { label: "Open Reports", value: stats?.reportsCount, color: "text-need" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-outline-variant bg-white p-5 text-center">
                  <p className={`font-mono text-3xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                  <p className="mt-1 font-body text-xs text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Interests Sent", value: stats?.totalInterests, color: "text-accent-coral" },
                { label: "Reviews Left", value: stats?.totalReviews, color: "text-accent-coral" },
                { label: "Verified Phones", value: stats?.verifiedPhones, color: "text-success-emerald" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-outline-variant bg-white p-5 text-center">
                  <p className={`font-mono text-3xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                  <p className="mt-1 font-body text-xs text-on-surface-variant">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div>
            <div className="mb-4 flex gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2">
                <Search className="h-4 w-4 text-on-surface-variant" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by email or name..."
                  className="flex-1 bg-transparent font-body text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                />
              </div>
              {users && users.length > 0 && (
                <button
                  onClick={() => {
                    const rows = [
                      ["id", "email", "name", "role", "plan", "authMethod", "phoneVerified", "postCount", "createdAt"],
                      ...users.map((u) => [u.id, u.email, u.name ?? "", u.role, u.plan ?? "", u.authMethod, u.phoneVerified ? "yes" : "no", u.postCount ?? 0, new Date(u.createdAt).toISOString()]),
                    ];
                    downloadCsv(`jobsy-users-${new Date().toISOString().split("T")[0]}.csv`, rows as string[][]);
                  }}
                  className="flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-2 font-body text-sm font-medium text-on-surface hover:bg-surface-cream transition"
                  title="Export CSV"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
              )}
            </div>
            <div className="space-y-3">
              {usersLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl border border-outline-variant" />)
              ) : users?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-white px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-body text-sm font-bold text-on-surface truncate">{u.email}</p>
                      {u.role === "admin" && <span className="rounded bg-accent-coral px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-surface">ADMIN</span>}
                      {u.role === "banned" && <span className="rounded bg-need-light px-1.5 py-0.5 font-mono text-[10px] font-bold text-need">BANNED</span>}
                      {u.plan === "business" && <span className="rounded bg-surface-cream px-1.5 py-0.5 font-mono text-[10px] font-bold text-on-surface">🏢 BUSINESS</span>}
                    </div>
                    <p className="font-mono text-xs text-on-surface-variant">
                      #{u.id} · {u.name ?? "—"} · {u.authMethod} · joined {new Date(u.createdAt).toLocaleDateString()} · {u.postCount ?? 0} posts
                    </p>
                    {u.phoneVerified && (
                      <span className="mt-1 flex items-center gap-1 font-mono text-[10px] text-success-emerald">
                        <Phone className="h-3 w-3" /> phone verified
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {u.role === "banned" ? (
                      <button onClick={() => setRoleMutation.mutate({ userId: u.id, role: "user" })}
                        className="flex items-center gap-1 rounded-lg border-2 border-sage bg-success-emerald/10 px-3 py-1.5 font-body text-xs font-medium text-success-emerald hover:bg-sage hover:text-white transition">
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
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button key={s} onClick={() => setPostStatus(s)}
                  className={`rounded-full border-2 px-3 py-1 font-body text-xs font-medium transition ${
                    postStatus === s ? "border-ink bg-ink text-cream" : "border-ink-light bg-white text-on-surface-variant hover:border-ink"
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
              {allPosts && allPosts.length > 0 && (
                <button
                  onClick={() => {
                    const rows = [
                      ["id", "title", "type", "category", "status", "city", "userId", "viewCount", "contactCount", "wasFree", "boostType", "createdAt", "expiresAt"],
                      ...allPosts.map((p) => [p.id, p.title, p.type, p.category, p.status, p.city ?? "", p.userId, p.viewCount, p.contactCount, p.wasFree ? "yes" : "no", p.boostType ?? "", new Date(p.createdAt).toISOString(), p.expiresAt ? new Date(p.expiresAt).toISOString() : ""]),
                    ];
                    downloadCsv(`jobsy-posts-${new Date().toISOString().split("T")[0]}.csv`, rows as string[][]);
                  }}
                  className="ml-auto flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-4 py-1.5 font-body text-xs font-medium text-on-surface hover:bg-surface-cream transition"
                  title="Export CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              )}
            </div>
            <div className="space-y-3">
              {postsLoading ? (
                [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl border border-outline-variant" />)
              ) : allPosts?.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-outline-variant bg-white px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] ?? "bg-surface-cream text-on-surface-variant"}`}>
                        {p.status.replace("_", " ")}
                      </span>
                      <span className="font-mono text-xs text-on-surface-variant">{p.category} · {p.city ?? "—"}</span>
                      {!p.wasFree && <span className="rounded bg-surface-cream px-1.5 py-0.5 font-mono text-[10px] text-on-surface">PAID</span>}
                    </div>
                    <p className="font-body text-sm font-bold text-on-surface truncate">{p.title}</p>
                    <p className="font-mono text-xs text-on-surface-variant">#{p.id} · user #{p.userId} · <Eye className="inline h-3 w-3" /> {p.viewCount} · {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link to={`/post/${p.id}`} target="_blank">
                      <button className="rounded-lg border border-outline-variant bg-white p-2 hover:bg-surface-cream"><Eye className="h-3.5 w-3.5" /></button>
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
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl border border-outline-variant" />)
            ) : !pendingPosts?.length ? (
              <div className="flex flex-col items-center py-16">
                <CheckCircle className="mb-4 h-12 w-12 text-success-emerald" />
                <p className="font-body text-on-surface-variant">No posts pending review</p>
              </div>
            ) : pendingPosts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-outline-variant bg-white p-5 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-surface-cream px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-on-surface">{post.category}</span>
                      <span className="font-mono text-xs text-on-surface-variant">#{post.id} · {post.type}</span>
                    </div>
                    <h3 className="font-body text-lg font-bold text-on-surface">{post.title}</h3>
                    {post.description && <p className="mt-1 font-body text-sm text-on-surface-variant line-clamp-3">{post.description}</p>}
                    <p className="mt-2 font-mono text-xs text-outline">{new Date(post.createdAt).toLocaleString("lv-LV")}{post.city && ` · ${post.city}`}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <a href={`/post/${post.id}`} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-outline-variant bg-white p-2 hover:bg-surface-cream">
                      <Eye className="h-4 w-4" />
                    </a>
                    <button onClick={() => approveMutation.mutate({ postId: post.id })} disabled={approveMutation.isPending}
                      className="flex items-center gap-1 rounded-xl border-2 border-sage bg-success-emerald/10 px-3 py-2 font-body text-sm text-success-emerald hover:bg-sage hover:text-white transition">
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
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl border border-outline-variant" />)
            ) : !reports?.length ? (
              <div className="flex flex-col items-center py-16">
                <AlertTriangle className="mb-4 h-12 w-12 text-outline" />
                <p className="font-body text-on-surface-variant">No pending reports</p>
              </div>
            ) : reports.map((report) => (
              <div key={report.id} className="rounded-2xl border-2 border-need bg-white p-5 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded bg-need-light px-2 py-0.5 font-mono text-[10px] font-medium uppercase text-need">{report.reason}</span>
                      <span className="font-mono text-xs text-on-surface-variant">Post #{report.postId}</span>
                    </div>
                    {report.details && <p className="font-body text-sm text-on-surface-variant">{report.details}</p>}
                    <p className="mt-2 font-mono text-xs text-outline">Reported {new Date(report.createdAt).toLocaleString("lv-LV")}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <a href={`/post/${report.postId}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-xl border border-outline-variant bg-white px-3 py-2 font-body text-xs hover:bg-surface-cream">
                      <Eye className="h-3.5 w-3.5" /> View
                    </a>
                    <button onClick={() => resolveMutation.mutate({ reportId: report.id, action: "dismiss" })} disabled={resolveMutation.isPending}
                      className="rounded-xl border-2 border-ink-light bg-surface-cream px-3 py-2 font-body text-xs text-on-surface-variant hover:border-ink hover:text-on-surface transition">
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

        {/* ── SOCIAL QUEUE ── */}
        {tab === "queue" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-bold text-on-surface">Social Queue</h2>
              <div className="flex gap-2">
                {(["", "pending", "posted", "failed"] as const).map((s) => (
                  <button key={s} onClick={() => setQueueStatus(s)}
                    className={`rounded-full border-2 px-3 py-1 font-body text-xs font-medium transition ${
                      queueStatus === s ? "border-ink bg-accent-coral text-on-surface" : "border-ink-light bg-white text-on-surface-variant hover:border-ink"
                    }`}>
                    {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {queueLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : !socialQueueData?.length ? (
              <div className="rounded-2xl border-2 border-ink-light bg-white p-8 text-center">
                <Share2 className="mx-auto mb-3 h-8 w-8 text-outline" />
                <p className="font-body text-sm text-on-surface-variant">No queue items{queueStatus ? ` with status "${queueStatus}"` : ""}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {socialQueueData.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl border-2 border-ink-light bg-white px-4 py-3">
                    <span className="text-lg">{item.boostType === "bump" ? "🔝" : "⭐"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-body text-sm font-medium text-on-surface">
                        #{item.postId} — {item.postTitle ?? "unknown"}
                      </p>
                      <p className="font-mono text-xs text-on-surface-variant">
                        {item.boostType} · queued {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className={`rounded-full border-2 px-2.5 py-0.5 font-mono text-xs font-bold ${
                      item.status === "pending" ? "border-mustard bg-surface-cream text-on-surface" :
                      item.status === "posted" ? "border-sage bg-success-emerald/10 text-success-emerald" :
                      "border-need bg-need-light text-need"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREDITS ── */}
        {tab === "credits" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <div className="mb-4 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-accent-coral" />
                <h2 className="font-headline text-xl font-bold text-on-surface">Grant Credits</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block font-body text-xs font-medium text-on-surface">User Email</label>
                  <input
                    type="email"
                    value={grantEmail}
                    onChange={(e) => setGrantEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-body text-xs font-medium text-on-surface">Amount (€)</label>
                  <input
                    type="number"
                    min="0.01"
                    max="500"
                    step="0.01"
                    value={grantEuros}
                    onChange={(e) => setGrantEuros(e.target.value)}
                    placeholder="5.00"
                    className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-body text-xs font-medium text-on-surface">Note (optional)</label>
                  <input
                    type="text"
                    value={grantNote}
                    onChange={(e) => setGrantNote(e.target.value)}
                    placeholder="Promotion May 2026"
                    maxLength={200}
                    className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-on-surface outline-none focus:border-ink"
                  />
                </div>
                <button
                  onClick={() => {
                    const euros = parseFloat(grantEuros);
                    if (!grantEmail || isNaN(euros) || euros <= 0) { toast("Fill in email and valid amount", "error"); return; }
                    if (confirm(`Grant €${euros.toFixed(2)} to ${grantEmail}?`)) {
                      grantCreditsMutation.mutate({ email: grantEmail, euros, note: grantNote || undefined });
                    }
                  }}
                  disabled={grantCreditsMutation.isPending}
                  className="flex items-center gap-2 rounded-xl border border-outline-variant bg-accent-coral px-5 py-2.5 font-body text-sm font-semibold text-on-surface hover:opacity-90 transition disabled:opacity-60"
                >
                  {grantCreditsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  Grant Credits
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
