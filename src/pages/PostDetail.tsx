import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
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
  ArrowLeft,
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

  const { data, isLoading } = trpc.posts.getById.useQuery(
    { id: postId },
    { enabled: !isNaN(postId), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false }
  );

  const images = data?.images ?? [];

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

  const { data: subStatus } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });

  const contactMutation = trpc.posts.contact.useMutation({
    onSuccess: () => toast(t(locale, "postDetail.contact.opened"), "success"),
    onError: (err) => toast(err.message, "error"),
  });

  const { data: interestData, refetch: refetchInterest } = trpc.posts.hasInterested.useQuery(
    { postId },
    { enabled: (isAuthenticated ?? false) && !isNaN(postId) }
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
        setShowReport(false); setReportSent(false);
        setReportReason(""); setReportDetails("");
      }, 2000);
    },
    onError: (err) => toast(err.message, "error"),
  });

  const [reviewStars, setReviewStars] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

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
      refetchMyReview(); refetchPostReviews();
    },
    onError: (err) => toast(err.message, "error"),
  });

  // JSON-LD structured data
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
      validThrough: post.expiresAt ? new Date(post.expiresAt).toISOString().split("T")[0] : undefined,
      jobLocation: {
        "@type": "Place",
        address: { "@type": "PostalAddress", addressLocality: post.city ?? "Latvija", addressCountry: "LV" },
      },
    });
    document.head.appendChild(script);
    return () => { const e = document.getElementById("job-posting-schema"); if (e) document.head.removeChild(e); };
  }, [data?.post]);

  useEffect(() => {
    if (!data?.post) return;
    const prev = document.title;
    document.title = `${data.post.title} — jobsy.lv`;
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
      if (!el) { el = document.createElement("meta"); const [n, v] = attr.split("="); el.setAttribute(n, v ?? ""); document.head.appendChild(el); }
      el.content = value;
      return created ? el : null;
    };
    const metas: HTMLMetaElement[] = [];
    const add = (s: string, a: string, v: string) => { const el = setMeta(s, a, v); if (el) metas.push(el); };
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
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonCreated = !canonical;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = url;
    return () => {
      document.title = prev;
      metas.forEach((el) => document.head.removeChild(el));
      if (canonCreated && canonical) document.head.removeChild(canonical);
      else if (canonical) canonical.href = "";
    };
  }, [data?.post, data?.images, locale]);

  const { data: relatedPosts } = trpc.posts.list.useQuery(
    { type: data?.post.type, category: data?.post.category, status: "active", limit: 4 },
    { enabled: !!data?.post, staleTime: 30 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-off-white px-margin-mobile py-8 md:px-margin-desktop">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-off-white">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-outline" />
          <p className="font-body text-body-lg text-on-surface-variant">{t(locale, "postDetail.notFound")}</p>
          <button
            onClick={() => navigate("/browse")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-DEFAULT px-6 py-2.5 font-label text-label-md text-white transition hover:bg-on-primary-fixed-variant"
          >
            <ArrowLeft className="h-4 w-4" />
            {t(locale, "browse.title")}
          </button>
        </div>
      </div>
    );
  }

  const { post, profile, isBusiness } = data;
  const category = CATEGORIES.find((c) => c.key === post.category);
  const CategoryIcon = category ? iconMap[category.icon] : MoreHorizontal;
  const isOwner = isAuthenticated && user?.id === post.userId;

  const handleContact = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    contactMutation.mutate({ postId });
  };

  const handleShare = async (platform?: string) => {
    const url = window.location.href;
    const text = `${post.title} — jobsy.lv`;
    if (!platform && navigator.share) {
      try { await navigator.share({ title: post.title, text, url }); return; } catch { /* fall through */ }
    }
    setShowShare(true);
    if (!platform) return;
    const encoded = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    if (platform === "twitter") window.open(`https://twitter.com/intent/tweet?url=${encoded}&text=${encodedText}`, "_blank");
    else if (platform === "facebook") window.open(`https://www.facebook.com/sharer/sharer.php?u=${encoded}`, "_blank");
    else if (platform === "whatsapp") window.open(`https://wa.me/?text=${encodedText}%20${encoded}`, "_blank");
    else if (platform === "copy") { await navigator.clipboard.writeText(url); toast(t(locale, "postDetail.share.copied"), "success"); }
    setShowShare(false);
  };

  return (
    <div className="min-h-screen bg-surface-off-white px-margin-mobile py-8 md:px-margin-desktop">
      <div className="mx-auto max-w-3xl">

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 font-body text-body-sm text-on-surface-variant">
          <Link to="/" className="hover:text-primary-DEFAULT transition-colors">{t(locale, "postDetail.breadcrumbHome")}</Link>
          <span className="text-outline">/</span>
          <Link to="/browse" className="hover:text-primary-DEFAULT transition-colors">{t(locale, "postDetail.breadcrumbPosts")}</Link>
          <span className="text-outline">/</span>
          <span className="text-on-surface">{t(locale, `categories.${post.category}` as never)}</span>
        </div>

        {/* Header row */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Type badge */}
            <span className={`rounded px-2.5 py-1 font-label text-label-sm uppercase ${
              post.type === "need"
                ? "bg-surface-cream text-primary-DEFAULT"
                : "bg-secondary-container/30 text-secondary-DEFAULT"
            }`}>
              {post.type === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </span>

            {/* Category chip */}
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-2.5 py-1 font-label text-label-sm text-on-surface-variant">
              {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" />}
              {t(locale, `categories.${post.category}` as never)}
            </span>

            {/* City */}
            {post.city && (
              <span className="inline-flex items-center gap-1 font-body text-body-sm text-on-surface-variant">
                <MapPin className="h-3.5 w-3.5" />
                {t(locale, `cities.${post.city}` as never)}
                {post.region && `, ${post.region}`}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare()}
              className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface-variant shadow-card transition-colors hover:border-primary-DEFAULT hover:text-primary-DEFAULT"
              title={t(locale, "postDetail.share.title")}
            >
              <Share2 className="h-4 w-4" />
            </button>
            {isOwner && (
              <>
                <Link to={`/edit/${post.id}`}>
                  <button className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface-variant shadow-card transition-colors hover:border-primary-DEFAULT hover:text-primary-DEFAULT">
                    <Pencil className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={() => setShowBoost(true)}
                  className="rounded-lg border border-outline-variant bg-white p-2 text-on-surface-variant shadow-card transition-colors hover:border-accent-coral hover:text-accent-coral"
                  title={t(locale, "boost.title")}
                >
                  <Zap className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Published date */}
        <p className="mb-5 font-label text-label-sm text-outline">
          {t(locale, "postDetail.published", {
            date: new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"),
          })}
        </p>

        {/* Title */}
        <h1 className="mb-4 font-headline text-3xl font-bold text-on-surface md:text-4xl">{post.title}</h1>

        {/* View count + status */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {data.post.viewCount > 0 && (
            <span className="inline-flex items-center gap-1 font-label text-label-sm text-on-surface-variant">
              <Eye className="h-4 w-4" />
              {data.post.viewCount} {t(locale, "postDetail.views")}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 font-label text-label-sm font-medium ${
            data.post.filled
              ? "bg-success-emerald/10 text-success-emerald"
              : "bg-surface-cream text-on-surface-variant"
          }`}>
            {data.post.filled
              ? `✓ ${t(locale, "postDetail.statusFilled")}`
              : `● ${t(locale, "postDetail.statusOpen")}`}
          </span>
        </div>

        {/* Description */}
        {post.description && (
          <p className="mb-8 whitespace-pre-wrap font-body text-body-md leading-relaxed text-on-surface-variant">
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
                  className="aspect-square overflow-hidden rounded-xl border border-outline-variant transition-shadow hover:shadow-card-hover"
                >
                  <img src={img} alt={`${post.title} — ${i + 1}`} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {post.budgetText && (
            <div className="rounded-xl bg-white p-5 shadow-card">
              <div className="mb-1 flex items-center gap-2 font-label text-label-sm text-on-surface-variant">
                <Wallet className="h-4 w-4 text-primary-DEFAULT" />
                {t(locale, "postDetail.budget")}
              </div>
              <p className="font-headline text-headline-sm font-semibold text-on-surface">{post.budgetText}</p>
            </div>
          )}
          {post.whenText && (
            <div className="rounded-xl bg-white p-5 shadow-card">
              <div className="mb-1 flex items-center gap-2 font-label text-label-sm text-on-surface-variant">
                <Calendar className="h-4 w-4 text-primary-DEFAULT" />
                {t(locale, "postDetail.when")}
              </div>
              <p className="font-headline text-headline-sm font-semibold text-on-surface">{post.whenText}</p>
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="mb-10 rounded-2xl bg-white p-8 shadow-card">
          {isAuthenticated ? (
            <div>
              {/* Profile */}
              <div className="mb-6 flex items-center gap-3">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-outline-variant" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-cream text-primary-DEFAULT">
                    <span className="font-headline text-lg font-bold">{profile?.name?.[0] ?? "?"}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/user/${post.userId}`} className="font-body text-body-md font-bold text-on-surface transition-colors hover:text-primary-DEFAULT">
                      {profile?.name ?? "—"}
                    </Link>
                    {profile?.phoneVerified && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-container/20 px-2 py-0.5 font-label text-label-sm text-primary-DEFAULT">
                        <ShieldCheck className="h-3 w-3" />
                        {t(locale, "settings.verified")}
                      </span>
                    )}
                    {isBusiness && (
                      <span className="inline-flex items-center rounded-full bg-on-surface px-1.5 py-0.5 font-label text-label-sm font-bold text-surface-off-white">
                        🏢
                      </span>
                    )}
                  </div>
                  <p className="font-label text-label-sm text-on-surface-variant">{t(locale, "postDetail.contact.title")}</p>
                </div>
              </div>

              {/* Express Interest */}
              {post.type === "need" && !isOwner && (
                <button
                  onClick={() => interestMutation.mutate({ postId })}
                  disabled={interestMutation.isPending || interestData?.interested}
                  className={`mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-label text-label-md transition-colors duration-150 ${
                    interestData?.interested
                      ? "bg-success-emerald/10 text-success-emerald"
                      : "border border-outline-variant bg-surface-cream text-on-surface hover:border-primary-DEFAULT hover:text-primary-DEFAULT"
                  }`}
                >
                  {interestData?.interested ? t(locale, "postDetail.interest.done") : t(locale, "postDetail.interest.btn")}
                </button>
              )}

              {/* Contact revealed */}
              {contactMutation.data ? (
                <div className="space-y-3">
                  {contactMutation.data.email && (
                    <a
                      href={`mailto:${contactMutation.data.email}`}
                      className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-cream p-4 text-on-surface transition-all hover:border-primary-DEFAULT hover:shadow-card"
                    >
                      <Mail className="h-5 w-5 text-primary-DEFAULT" />
                      <div>
                        <p className="font-label text-label-sm text-on-surface-variant">{t(locale, "postDetail.contact.email")}</p>
                        <p className="font-body text-body-md font-medium">{contactMutation.data.email}</p>
                      </div>
                    </a>
                  )}
                  {contactMutation.data.phone && (
                    <a
                      href={`tel:${contactMutation.data.phone}`}
                      className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-cream p-4 text-on-surface transition-all hover:border-primary-DEFAULT hover:shadow-card"
                    >
                      <Phone className="h-5 w-5 text-primary-DEFAULT" />
                      <div>
                        <p className="font-label text-label-sm text-on-surface-variant">{t(locale, "postDetail.contact.phone")}</p>
                        <p className="font-body text-body-md font-medium">{contactMutation.data.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
              ) : (() => {
                const limit = subStatus?.contactViewLimit ?? 3;
                const used = subStatus?.contactViewsThisMonth ?? 0;
                const remaining = limit === null ? Infinity : Math.max(0, (limit as number) - used);
                const limitReached = remaining === 0;
                const isContactError = contactMutation.error?.message?.includes("Contact limit reached");

                if (limitReached || isContactError) {
                  return (
                    <div className="rounded-xl bg-surface-cream p-5 text-center">
                      <Lock className="mx-auto mb-2 h-7 w-7 text-outline" />
                      <p className="mb-1 font-headline text-headline-sm font-semibold text-on-surface">
                        {t(locale, "pricing.contactLimitReached")}
                      </p>
                      <p className="mb-4 font-body text-body-sm text-on-surface-variant">
                        {t(locale, "pricing.contactLimitDesc")}
                      </p>
                      <Link
                        to="/pricing"
                        className="inline-block rounded-lg bg-accent-coral px-5 py-2.5 font-label text-label-md font-bold text-white transition hover:bg-accent-coral-hover"
                      >
                        {t(locale, "pricing.upgradeForContacts")}
                      </Link>
                    </div>
                  );
                }

                return (
                  <>
                    {subStatus && limit !== null && remaining <= (limit as number) && (
                      <p className="mb-2 text-center font-label text-label-sm text-on-surface-variant">
                        {remaining} {t(locale, "pricing.contactViewsLeft")}
                      </p>
                    )}
                    <button
                      onClick={handleContact}
                      disabled={contactMutation.isPending}
                      className="h-14 w-full rounded-lg bg-primary-DEFAULT font-label text-label-md font-bold text-white transition-all duration-200 hover:bg-on-primary-fixed-variant active:scale-[0.99] disabled:opacity-60"
                    >
                      {contactMutation.isPending ? "..." : t(locale, "postDetail.contact.contactBtn")}
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-cream">
                <Lock className="h-6 w-6 text-on-surface-variant" />
              </div>
              <p className="mb-2 font-headline text-headline-sm font-semibold text-on-surface">{t(locale, "postDetail.contact.locked")}</p>
              <p className="mb-6 font-body text-body-sm text-on-surface-variant">{t(locale, "postDetail.contact.lockedSub")}</p>
              <button
                onClick={() => navigate("/login")}
                className="h-12 rounded-lg bg-primary-DEFAULT px-8 font-label text-label-md font-bold text-white transition hover:bg-on-primary-fixed-variant"
              >
                {t(locale, "postDetail.contact.loginBtn")}
              </button>
            </div>
          )}
        </div>

        {/* Report link */}
        {isAuthenticated && (
          <button
            onClick={() => setShowReport(true)}
            className="mb-10 font-label text-label-sm text-outline underline transition-colors hover:text-accent-coral"
          >
            {t(locale, "postDetail.report")}
          </button>
        )}

        {/* Leave a Review */}
        {canLeaveReview && (
          <div className="mb-10 rounded-2xl bg-white p-8 shadow-card">
            <h3 className="mb-4 font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "postDetail.review.title")}
            </h3>
            {myReview ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={`h-6 w-6 ${s <= myReview.stars ? "fill-accent-coral text-accent-coral" : "text-outline"}`} />
                  ))}
                </div>
                {myReview.comment && <p className="font-body text-body-sm text-on-surface-variant">{myReview.comment}</p>}
                <p className="font-label text-label-sm text-outline">{t(locale, "postDetail.review.submitted")}</p>
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
                      <Star className={`h-8 w-8 transition ${s <= (reviewHover || reviewStars) ? "fill-accent-coral text-accent-coral" : "text-outline"}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t(locale, "postDetail.review.placeholder")}
                  rows={3}
                  className="w-full rounded-lg border border-outline-variant bg-surface-cream p-3 font-body text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary-DEFAULT focus:outline-none focus:ring-1 focus:ring-primary-DEFAULT/30 resize-y"
                />
                <button
                  onClick={() => reviewMutation.mutate({ postId, revieweeId: revieweeId!, stars: reviewStars, comment: reviewComment || undefined })}
                  disabled={reviewStars === 0 || reviewMutation.isPending}
                  className="h-12 rounded-lg bg-primary-DEFAULT px-6 font-label text-label-md font-bold text-white transition hover:bg-on-primary-fixed-variant disabled:opacity-50"
                >
                  {t(locale, "postDetail.review.submit")}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reviews list */}
        {postReviews && postReviews.length > 0 && (
          <div className="mb-10">
            <h3 className="mb-4 font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "postDetail.review.reviewsTitle")}
            </h3>
            <div className="space-y-4">
              {postReviews.map((r) => (
                <div key={r.id} className="rounded-xl bg-white p-5 shadow-card">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-body text-body-sm font-semibold text-on-surface">{r.reviewerName ?? "—"}</p>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className={`h-4 w-4 ${s <= r.stars ? "fill-accent-coral text-accent-coral" : "text-outline"}`} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="font-body text-body-sm text-on-surface-variant">{r.comment}</p>}
                  <p className="mt-2 font-label text-label-sm text-outline">
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
            <h2 className="mb-6 font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "postDetail.related")}
            </h2>
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
        <DialogContent className="border border-outline-variant bg-white">
          <DialogHeader>
            <DialogTitle className="font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "postDetail.share.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "twitter", label: "Twitter", icon: <Twitter className="h-6 w-6" /> },
              { id: "facebook", label: "Facebook", icon: <Facebook className="h-6 w-6" /> },
              { id: "whatsapp", label: t(locale, "postDetail.share.whatsapp"), icon: (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              ) },
              { id: "copy", label: t(locale, "postDetail.share.copy"), icon: <Link2 className="h-6 w-6" /> },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => handleShare(id)}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface-cream p-4 text-on-surface-variant transition-colors hover:bg-surface-cream hover:text-primary-DEFAULT"
              >
                {icon}
                <span className="font-label text-label-sm">{label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="border border-outline-variant bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "postDetail.report")}
            </DialogTitle>
          </DialogHeader>
          {reportSent ? (
            <div className="flex flex-col items-center py-6">
              <CheckCircle className="mb-3 h-12 w-12 text-success-emerald" />
              <p className="font-body text-body-md text-on-surface">{t(locale, "postDetail.reportSent")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface-cream p-3 font-body text-body-sm text-on-surface focus:border-primary-DEFAULT focus:outline-none"
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
                className="min-h-[100px] w-full resize-y rounded-lg border border-outline-variant bg-surface-cream p-3 font-body text-body-sm text-on-surface focus:border-primary-DEFAULT focus:outline-none"
              />
              <button
                onClick={() => {
                  if (!reportReason) return;
                  reportMutation.mutate({ postId, reason: reportReason, details: reportDetails });
                }}
                disabled={!reportReason || reportMutation.isPending}
                className="w-full rounded-lg bg-primary-DEFAULT py-2.5 font-label text-label-md font-bold text-white transition hover:bg-on-primary-fixed-variant disabled:opacity-50"
              >
                {reportMutation.isPending ? t(locale, "postDetail.reportSubmitting") : t(locale, "postDetail.reportSubmit")}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Boost Picker */}
      {showBoost && (
        <BoostPicker
          postId={postId}
          isBusiness={subStatus?.plan === "business"}
          freeBoostsRemaining={subStatus?.freeBoostsRemaining ?? 0}
          creditBalance={subStatus?.creditBalance ?? 0}
          onClose={() => setShowBoost(false)}
        />
      )}

      {/* Lightbox */}
      {showGallery && images.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowGallery(false)}>
          <div className="relative max-h-[80vh] max-w-[90vw]">
            <img
              src={images[galleryIndex]}
              alt={`${post.title} — ${galleryIndex + 1}`}
              className="max-h-[80vh] max-w-[90vw] rounded-2xl"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i - 1 + images.length) % images.length); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg"
                >
                  <ChevronLeft className="h-5 w-5 text-on-surface" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setGalleryIndex((i) => (i + 1) % images.length); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg"
                >
                  <ChevronRight className="h-5 w-5 text-on-surface" />
                </button>
              </>
            )}
            <button
              onClick={() => setShowGallery(false)}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1 shadow-lg"
            >
              <X className="h-4 w-4 text-on-surface" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
