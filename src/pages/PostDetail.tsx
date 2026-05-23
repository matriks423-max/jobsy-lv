import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "@/components/PostCard";
import BoostPicker from "@/components/BoostPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Home,
  Truck,
  Wrench,
  Flower2,
  Car,
  Baby,
  Cat,
  Monitor,
  GraduationCap,
  MoreHorizontal,
  MapPin,
  Calendar,
  Wallet,
  Mail,
  Phone,
  Lock,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Share2,
  Pencil,
  Twitter,
  Facebook,
  Link2,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Star,
  ShieldCheck,
  Zap,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const postId = Number(id);

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showBoost, setShowBoost] = useState(false);

  const images = data?.images ?? [];

  // Gallery keyboard navigation
  useEffect(() => {
    if (!showGallery) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i + 1) % images.length);
      if (e.key === "Escape") setShowGallery(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showGallery, images.length]);

  const { data, isLoading } = trpc.posts.getById.useQuery(
    { id: postId },
    { enabled: !isNaN(postId) }
  );

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });

  const contactMutation = trpc.posts.contact.useMutation({
    onSuccess: () => toast(t(locale, "postDetail.contact.opened"), "success"),
    onError: (err) => toast(err.message, "error"),
  });

  const { data: interestData, refetch: refetchInterest } = trpc.posts.hasInterested.useQuery(
    { postId },
    { enabled: isAuthenticated && !isNaN(postId) }
  );
  const interestMutation = trpc.posts.expressInterest.useMutation({
    onSuccess: (res) => {
      if (!res.already) toast(t(locale, "postDetail.interest.toast"), "success");
      refetchInterest();
    },
    onError: (err) => toast(err.message, "error"),
  });

  const reportMutation = trpc.posts.report.useMutation({
    onSuccess: () => {
      setReportSent(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSent(false);
        setReportReason("");
        setReportDetails("");
      }, 2000);
    },
    onError: (err) => toast(err.message, "error"),
  });

  const [reviewStars, setReviewStars] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  // revieweeId when leaving a review: non-owners review the post owner
  const revieweeId = data?.post?.userId;
  const isOwnerEarly = isAuthenticated && user?.id === data?.post?.userId;
  const canLeaveReview = isAuthenticated && !isOwnerEarly && !!data?.post?.filled && !!interestData?.interested;

  const { data: myReview, refetch: refetchMyReview } = trpc.posts.myReviewForPost.useQuery(
    { postId, revieweeId: revieweeId ?? 0 },
    { enabled: !!canLeaveReview && !!revieweeId }
  );

  const { data: postReviews, refetch: refetchPostReviews } = trpc.posts.postReviews.useQuery(
    { postId },
    { enabled: !isNaN(postId) }
  );

  const reviewMutation = trpc.posts.leaveReview.useMutation({
    onSuccess: () => {
      toast(t(locale, "postDetail.review.submitted"), "success");
      refetchMyReview();
      refetchPostReviews();
    },
    onError: (err) => toast(err.message, "error"),
  });

  // JSON-LD structured data for Google Jobs
  useEffect(() => {
    if (!data?.post) return;
    const post = data.post;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "job-posting-schema";
    script.text = JSON.stringify({
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      title: post.title,
      description: (post.description ?? "").slice(0, 500),
      datePosted: new Date(post.createdAt).toISOString().split("T")[0],
      validThrough: post.expiresAt
        ? new Date(post.expiresAt).toISOString().split("T")[0]
        : undefined,
      jobLocation: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: post.city ?? "Latvija",
          addressCountry: "LV",
        },
      },
    });
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("job-posting-schema");
      if (existing) document.head.removeChild(existing);
    };
  }, [data?.post]);

  useEffect(() => {
    if (!data?.post) return;
    const prev = document.title;
    document.title = `${data.post.title} — jobsy.lv`;

    // Dynamic meta description + OG tags for SEO and social sharing
    const desc = [
      data.post.description?.slice(0, 120),
      data.post.city ? t(locale, `cities.${data.post.city}` as never) : null,
      data.post.budgetText,
    ].filter(Boolean).join(" · ") || `${data.post.title} — jobsy.lv`;

    const url = `https://jobsy.lv/post/${data.post.id}`;
    const image = data.images?.[0] ?? "https://jobsy.lv/og-image.png";

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      const created = !el;
      if (!el) {
        el = document.createElement("meta");
        const [name, val] = attr.split("=");
        el.setAttribute(name, val ?? "");
        document.head.appendChild(el);
      }
      el.content = value;
      return created ? el : null;
    };

    const metas: HTMLMetaElement[] = [];
    const add = (sel: string, attr: string, val: string) => {
      const el = setMeta(sel, attr, val);
      if (el) metas.push(el);
    };

    add('meta[name="description"]', "name=description", desc);
    add('meta[property="og:title"]', "property=og:title", `${data.post.title} — jobsy.lv`);
    add('meta[property="og:description"]', "property=og:description", desc);
    add('meta[property="og:url"]', "property=og:url", url);
    add('meta[property="og:image"]', "property=og:image", image);
    add('meta[property="og:type"]', "property=og:type", "website");
    add('meta[name="twitter:card"]', "name=twitter:card", "summary_large_image");
    add('meta[name="twitter:title"]', "name=twitter:title", `${data.post.title} — jobsy.lv`);
    add('meta[name="twitter:description"]', "name=twitter:description", desc);
    add('meta[name="twitter:image"]', "name=twitter:image", image);

    // Canonical link
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    return () => {
      document.title = prev;
      metas.forEach((el) => document.head.removeChild(el));
      if (canonicalCreated && canonical) document.head.removeChild(canonical);
      else if (canonical) canonical.href = "";
    };
  }, [data?.post, data?.images, locale]);

  const { data: relatedPosts } = trpc.posts.list.useQuery(
    {
      type: data?.post.type,
      category: data?.post.category,
      status: "active",
      limit: 3,
    },
    { enabled: !!data?.post }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-8 noise-bg">
        <div className="mx-auto max-w-3xl">
          <Skeleton className="mb-4 h-8 w-48 rounded-xl border-2 border-ink" />
          <Skeleton className="mb-4 h-12 w-full rounded-xl border-2 border-ink" />
          <Skeleton className="mb-4 h-32 w-full rounded-xl border-2 border-ink" />
          <Skeleton className="h-48 w-full rounded-xl border-2 border-ink" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-ink-light" />
          <p className="font-body text-lg text-ink-muted">{t(locale, "postDetail.notFound")}</p>
          <Button onClick={() => navigate("/browse")} className="mt-4 rounded-xl border-2 border-ink bg-coral">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t(locale, "browse.title")}
          </Button>
        </div>
      </div>
    );
  }

  const { post, profile, isBusiness } = data;
  const category = CATEGORIES.find((c) => c.key === post.category);
  const CategoryIcon = category ? iconMap[category.icon] : MoreHorizontal;
  const isOwner = isAuthenticated && user?.id === post.userId;

  const handleContact = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    contactMutation.mutate({ postId });
  };

  const handleShare = async (platform?: string) => {
    const url = window.location.href;
    const text = `${post.title} — jobsy.lv`;

    // Use Web Share API on mobile when no specific platform requested
    if (!platform && navigator.share) {
      try {
        await navigator.share({ title: post.title, text, url });
        return;
      } catch {
        // User cancelled or not supported — fall through to dialog
      }
    }

    setShowShare(true);
    if (!platform) return;

    const encoded = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedText}`, "_blank");
    } else if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodedText}%20${encoded}`, "_blank");
    } else if (platform === "copy") {
      await navigator.clipboard.writeText(url);
      toast(t(locale, "postDetail.share.copied"), "success");
    }
    setShowShare(false);
  };

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 font-body text-sm text-ink-muted">
          <Link to="/" className="hover:text-ink">{t(locale, "postDetail.breadcrumbHome")}</Link>
          <span>/</span>
          <Link to="/browse" className="hover:text-ink">{t(locale, "postDetail.breadcrumbPosts")}</Link>
          <span>/</span>
          <span className="text-ink">{t(locale, `categories.${post.category}` as never)}</span>
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded px-2.5 py-1 font-mono text-xs font-medium uppercase ${
              post.type === "need" ? "border border-need bg-need-light text-need" : "border border-sage bg-sage-light text-sage"
            }`}>
              {post.type === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border-1.5 border-ink bg-mustard-light px-3 py-1 font-body text-xs font-medium uppercase tracking-wide">
              <CategoryIcon className="h-3.5 w-3.5" />
              {t(locale, `categories.${post.category}` as never)}
            </span>
            {post.city && (
              <span className="inline-flex items-center gap-1 font-body text-sm text-ink-muted">
                <MapPin className="h-3.5 w-3.5" />
                {t(locale, `cities.${post.city}` as never)}
                {post.region && `, ${post.region}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare()}
              className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark"
              title={t(locale, "postDetail.share.title")}
            >
              <Share2 className="h-4 w-4" />
            </button>
            {isOwner && (
              <>
                <Link to={`/edit/${post.id}`}>
                  <button className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark" title={t(locale, "nav.myPosts")}>
                    <Pencil className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={() => setShowBoost(true)}
                  className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark"
                  title={t(locale, "boost.title")}
                >
                  <Zap className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mb-6 font-mono text-xs text-ink-light">
          {t(locale, "postDetail.published", {
            date: new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"),
          })}
        </p>

        {/* Title & Description */}
        <h1 className="mb-6 font-display text-3xl font-bold text-ink md:text-4xl">{post.title}</h1>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {data.post.viewCount > 0 && (
            <span className="inline-flex items-center gap-1 font-body text-sm text-ink-muted">
              <Eye className="h-4 w-4" />
              {data.post.viewCount} {t(locale, "postDetail.views")}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-0.5 font-body text-xs font-medium ${
            data.post.filled
              ? "border-sage bg-sage-light text-sage"
              : "border-ink bg-cream text-ink"
          }`}>
            {data.post.filled
              ? `✓ ${t(locale, "postDetail.statusFilled")}`
              : `● ${t(locale, "postDetail.statusOpen")}`}
          </span>
        </div>
        {post.description && (
          <p className="mb-8 whitespace-pre-wrap font-body text-base leading-relaxed text-ink-muted">
            {post.description}
          </p>
        )}

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => { setGalleryIndex(i); setShowGallery(true); }}
                  className="aspect-square overflow-hidden rounded-xl border-2 border-ink"
                >
                  <img src={img} alt={`${post.title} — ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {post.budgetText && (
            <div className="rounded-xl border-2 border-ink bg-cream-dark p-5">
              <div className="mb-1 flex items-center gap-2 font-body text-sm font-medium text-ink">
                <Wallet className="h-4 w-4 text-coral" />
                {t(locale, "postDetail.budget")}
              </div>
              <p className="font-body text-lg font-bold text-ink">{post.budgetText}</p>
            </div>
          )}
          {post.whenText && (
            <div className="rounded-xl border-2 border-ink bg-cream-dark p-5">
              <div className="mb-1 flex items-center gap-2 font-body text-sm font-medium text-ink">
                <Calendar className="h-4 w-4 text-coral" />
                {t(locale, "postDetail.when")}
              </div>
              <p className="font-body text-lg font-bold text-ink">{post.whenText}</p>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mb-10 rounded-3xl border-2 border-ink bg-cream-dark p-8">
          {isAuthenticated ? (
            <div>
              <div className="mb-6 flex items-center gap-3">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-12 w-12 rounded-full border-2 border-ink object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-coral-light">
                    <span className="font-body text-lg font-bold text-coral">{profile?.name?.[0] ?? "?"}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/user/${post.userId}`} className="font-body text-base font-bold text-ink hover:text-coral">
                      {profile?.name ?? "—"}
                    </Link>
                    {profile?.phoneVerified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-sage bg-sage-light px-2 py-0.5 font-body text-[10px] font-medium text-sage">
                        <ShieldCheck className="h-3 w-3" />
                        {t(locale, "settings.verified")}
                      </span>
                    )}
                    {isBusiness && (
                      <span className="inline-flex items-center gap-0.5 rounded-full border border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-cream">
                        🏢
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-ink-muted">{t(locale, "postDetail.contact.title")}</p>
                </div>
              </div>

              {/* Express Interest — only on "need" posts for non-owners */}
              {post.type === "need" && !isOwner && (
                <button
                  onClick={() => interestMutation.mutate({ postId })}
                  disabled={interestMutation.isPending || interestData?.interested}
                  className={`mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-body text-sm font-medium transition ${
                    interestData?.interested
                      ? "border-sage bg-sage-light text-sage"
                      : "border-ink bg-white text-ink hover:bg-cream-dark"
                  }`}
                >
                  {interestData?.interested
                    ? t(locale, "postDetail.interest.done")
                    : t(locale, "postDetail.interest.btn")}
                </button>
              )}

              {contactMutation.data ? (
                <div className="space-y-3">
                  {contactMutation.data.email && (
                    <a href={`mailto:${contactMutation.data.email}`} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-white p-4 font-body text-ink transition hover:-translate-y-0.5 hover:shadow-card">
                      <Mail className="h-5 w-5 text-coral" />
                      <div>
                        <p className="text-xs text-ink-muted">{t(locale, "postDetail.contact.email")}</p>
                        <p className="font-medium">{contactMutation.data.email}</p>
                      </div>
                    </a>
                  )}
                  {contactMutation.data.phone && (
                    <a href={`tel:${contactMutation.data.phone}`} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-white p-4 font-body text-ink transition hover:-translate-y-0.5 hover:shadow-card">
                      <Phone className="h-5 w-5 text-coral" />
                      <div>
                        <p className="text-xs text-ink-muted">{t(locale, "postDetail.contact.phone")}</p>
                        <p className="font-medium">{contactMutation.data.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              ) : (
                <Button
                  onClick={handleContact}
                  disabled={contactMutation.isPending}
                  className="h-14 w-full rounded-xl border-2 border-ink bg-coral font-body text-base font-medium text-ink hover:bg-coral-hover"
                >
                  {contactMutation.isPending ? "..." : t(locale, "postDetail.contact.contactBtn")}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Lock className="mx-auto mb-4 h-10 w-10 text-ink-light" />
              <p className="mb-2 font-body text-base font-medium text-ink">{t(locale, "postDetail.contact.locked")}</p>
              <p className="mb-6 font-body text-sm text-ink-muted">{t(locale, "postDetail.contact.lockedSub")}</p>
              <Button onClick={() => navigate("/login")} className="h-12 rounded-xl border-2 border-ink bg-coral px-8 font-body font-medium text-ink hover:bg-coral-hover">
                {t(locale, "postDetail.contact.loginBtn")}
              </Button>
            </div>
          )}
        </div>

        {/* Report */}
        {isAuthenticated && (
          <button onClick={() => setShowReport(true)} className="mb-10 font-body text-sm text-ink-light underline hover:text-need">
            {t(locale, "postDetail.report")}
          </button>
        )}

        {/* Leave a Review — shown to interested parties after post is filled */}
        {canLeaveReview && (
          <div className="mb-10 rounded-3xl border-2 border-ink bg-cream-dark p-8">
            <h3 className="mb-4 font-display text-xl font-bold text-ink">{t(locale, "postDetail.review.title")}</h3>
            {myReview ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-6 w-6 ${s <= myReview.stars ? "fill-mustard text-mustard" : "text-ink-light"}`} />
                  ))}
                </div>
                {myReview.comment && <p className="font-body text-sm text-ink-muted">{myReview.comment}</p>}
                <p className="font-body text-xs text-ink-light">{t(locale, "postDetail.review.submitted")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setReviewHover(s)}
                      onMouseLeave={() => setReviewHover(0)}
                      onClick={() => setReviewStars(s)}
                      className="p-0.5"
                    >
                      <Star className={`h-8 w-8 transition ${s <= (reviewHover || reviewStars) ? "fill-mustard text-mustard" : "text-ink-light"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t(locale, "postDetail.review.placeholder")}
                  rows={3}
                  className="w-full rounded-xl border-2 border-ink bg-white p-3 font-body text-sm text-ink placeholder:text-ink-light focus:outline-none"
                />
                <Button
                  onClick={() => reviewMutation.mutate({ postId, revieweeId: revieweeId!, stars: reviewStars, comment: reviewComment || undefined })}
                  disabled={reviewStars === 0 || reviewMutation.isPending}
                  className="h-12 rounded-xl border-2 border-ink bg-coral px-6 font-body font-medium text-ink hover:bg-coral-hover disabled:opacity-50"
                >
                  {t(locale, "postDetail.review.submit")}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Reviews for this post */}
        {postReviews && postReviews.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 font-display text-xl font-bold text-ink">{t(locale, "postDetail.review.reviewsTitle")}</h3>
            <div className="space-y-4">
              {postReviews.map((r) => (
                <div key={r.id} className="rounded-2xl border-2 border-ink bg-cream-dark p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-body text-sm font-bold text-ink">{r.reviewerName ?? "—"}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.stars ? "fill-mustard text-mustard" : "text-ink-light"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="font-body text-sm text-ink-muted">{r.comment}</p>}
                  <p className="mt-2 font-mono text-xs text-ink-light">
                    {new Date(r.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts && relatedPosts.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-display text-2xl font-bold text-ink">{t(locale, "postDetail.related")}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts
                .filter((r) => r.post.id !== post.id)
                .slice(0, 3)
                .map((r) => (
                  <PostCard key={r.post.id} post={r.post} profile={r.profile} isBusiness={r.isBusiness} images={r.images} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Share Dialog */}
      <Dialog open={showShare} onOpenChange={setShowShare}>
        <DialogContent className="border-2 border-ink bg-white">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-ink">{t(locale, "postDetail.share.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleShare("twitter")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-cream p-4 hover:bg-cream-dark">
              <Twitter className="h-6 w-6 text-ink" />
              <span className="font-body text-xs">Twitter</span>
            </button>
            <button onClick={() => handleShare("facebook")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-cream p-4 hover:bg-cream-dark">
              <Facebook className="h-6 w-6 text-ink" />
              <span className="font-body text-xs">Facebook</span>
            </button>
            <button onClick={() => handleShare("whatsapp")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-cream p-4 hover:bg-cream-dark">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span className="font-body text-xs">{t(locale, "postDetail.share.whatsapp")}</span>
            </button>
            <button onClick={() => handleShare("copy")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-ink bg-cream p-4 hover:bg-cream-dark">
              <Link2 className="h-6 w-6 text-ink" />
              <span className="font-body text-xs">{t(locale, "postDetail.share.copy")}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="border-2 border-ink bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-ink">{t(locale, "postDetail.report")}</DialogTitle>
          </DialogHeader>
          {reportSent ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle className="mb-3 h-12 w-12 text-sage" />
              <p className="font-body text-ink">{t(locale, "postDetail.reportSent")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border-2 border-ink-light bg-white p-3 font-body text-sm focus:border-coral"
              >
                <option value="">{t(locale, "postDetail.reportPlaceholder")}</option>
                <option value="misleading">{t(locale, "postDetail.reportMisleading")}</option>
                <option value="offensive">{t(locale, "postDetail.reportOffensive")}</option>
                <option value="fraud">{t(locale, "postDetail.reportFraud")}</option>
                <option value="other">{t(locale, "postDetail.reportOther")}</option>
              </select>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder={t(locale, "postDetail.reportDetailsPlaceholder")}
                className="min-h-[100px] w-full resize-y rounded-xl border-2 border-ink-light bg-white p-3 font-body text-sm focus:border-coral"
              />
              <Button
                onClick={() => {
                  if (!reportReason) return;
                  reportMutation.mutate({ postId, reason: reportReason, details: reportDetails });
                }}
                disabled={!reportReason || reportMutation.isPending}
                className="w-full rounded-xl border-2 border-ink bg-coral font-body font-medium text-ink hover:bg-coral-hover"
              >
                {reportMutation.isPending ? t(locale, "postDetail.reportSubmitting") : t(locale, "postDetail.reportSubmit")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Boost Picker — post owner only */}
      {showBoost && (
        <BoostPicker
          postId={postId}
          isBusiness={subStatus?.plan === "business"}
          freeBoostsRemaining={subStatus?.freeBoostsRemaining ?? 0}
          onClose={() => setShowBoost(false)}
        />
      )}

      {/* Image Gallery Lightbox */}
      {showGallery && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75" onClick={() => setShowGallery(false)}>
          <div className="relative max-h-[80vh] max-w-[90vw]">
            <img src={images[galleryIndex]} alt={`${post.title} — ${galleryIndex + 1}`} className="max-h-[80vh] max-w-[90vw] rounded-2xl border-2 border-ink" />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i - 1 + images.length) % images.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white p-2"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i + 1) % images.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white p-2"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowGallery(false)}
              className="absolute right-2 top-2 rounded-full border-2 border-ink bg-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
