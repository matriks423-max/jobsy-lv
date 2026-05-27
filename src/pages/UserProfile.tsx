import { useEffect } from "react";
import { useParams, Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { relativeTime } from "@/lib/relativeTime";
import { CATEGORIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Star,
  ShieldCheck,
  Calendar,
  Eye,
  Wallet,
  ArrowRight,
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
  Building2,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { locale } = useLocale();
  const userId = Number(id);

  const { data, isLoading } = trpc.posts.publicProfile.useQuery(
    { userId },
    { enabled: !isNaN(userId) }
  );

  useEffect(() => {
    const prev = document.title;
    if (data?.profile?.name) {
      document.title = `${data.profile.name} — Jobsy.lv`;
    }
    return () => { document.title = prev; };
  }, [data?.profile?.name]);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-32 rounded-3xl border border-outline-variant" />
          <Skeleton className="h-48 rounded-3xl border border-outline-variant" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-body text-on-surface-variant">{t(locale, "postDetail.notFound")}</p>
      </div>
    );
  }

  const { profile, isBusiness, memberSince, posts, reviews, avgRating, reviewCount } = data;

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl">

        {/* Profile card */}
        <div className="mb-6 rounded-3xl border border-outline-variant bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name ?? ""}
                className="h-20 w-20 rounded-full border border-outline-variant object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-outline-variant bg-accent-coral/10">
                <span className="font-headline text-2xl font-bold text-accent-coral">
                  {(profile.name?.[0] ?? "?").toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="font-headline text-2xl font-bold text-on-surface">
                  {profile.name ?? t(locale, "postDetail.notFound")}
                </h1>
                {profile.phoneVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-success-emerald bg-success-emerald/10 px-2 py-0.5 font-body text-xs font-medium text-success-emerald">
                    <ShieldCheck className="h-3 w-3" />
                    {t(locale, "settings.verified")}
                  </span>
                )}
                {isBusiness && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary-DEFAULT bg-primary-DEFAULT px-2 py-0.5 font-mono text-xs font-bold text-white">
                    <Building2 className="h-3 w-3" />
                    Business
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 font-body text-sm text-on-surface-variant">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {t(locale, `cities.${profile.city}` as never)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t(locale, "userProfile.member")}{" "}
                  {relativeTime(memberSince, locale)}
                </span>
              </div>

              {/* Star rating */}
              {avgRating !== null && (
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-accent-coral text-accent-coral" : "text-outline"}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm font-bold text-on-surface">{avgRating}</span>
                  <span className="font-body text-xs text-on-surface-variant">({reviewCount})</span>
                </div>
              )}
            </div>
          </div>

          {/* Business description */}
          {isBusiness && profile.companyName && (
            <div className="mt-6 rounded-xl border-2 border-outline-variant bg-surface-cream p-4">
              <p className="mb-1 flex items-center gap-1.5 font-body text-sm font-bold text-on-surface">
                <Building2 className="h-4 w-4 text-primary-DEFAULT" />
                {profile.companyName}
              </p>
              {profile.companyDescription && (
                <p className="font-body text-sm text-on-surface-variant">{profile.companyDescription}</p>
              )}
              {profile.companyWebsite && (
                <a
                  href={profile.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-body text-xs text-accent-coral hover:underline"
                >
                  {profile.companyWebsite}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Posts */}
        {posts.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-4 font-headline text-xl font-bold text-on-surface">
              {t(locale, "userProfile.activePosts")}
              <span className="ml-2 font-mono text-sm font-normal text-on-surface-variant">({posts.length})</span>
            </h2>
            <div className="space-y-3">
              {posts.map((post) => {
                const category = CATEGORIES.find((c) => c.key === post.category);
                const CategoryIcon = category ? (iconMap[category.icon] ?? MoreHorizontal) : MoreHorizontal;
                return (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className={`h-12 w-1 shrink-0 rounded-full ${post.type === "need" ? "bg-need" : "bg-success-emerald"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary-DEFAULT bg-surface-cream px-2 py-0.5 font-body text-[10px] font-medium uppercase text-on-surface">
                          <CategoryIcon className="h-3 w-3" />
                          {t(locale, `categories.${post.category}` as never)}
                        </span>
                        {post.city && (
                          <span className="flex items-center gap-0.5 font-body text-xs text-on-surface-variant">
                            <MapPin className="h-3 w-3" />
                            {t(locale, `cities.${post.city}` as never)}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-body text-sm font-bold text-on-surface">{post.title}</p>
                      <div className="mt-1 flex items-center gap-3 font-mono text-xs text-outline">
                        {post.budgetText && (
                          <span className="flex items-center gap-0.5">
                            <Wallet className="h-3 w-3 text-accent-coral" />
                            {post.budgetText}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-3 w-3" />
                          {post.viewCount}
                        </span>
                        <span>{relativeTime(post.createdAt, locale)}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h2 className="mb-4 font-headline text-xl font-bold text-on-surface">
              {t(locale, "userProfile.reviews")}
            </h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border border-outline-variant bg-white p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-body text-sm font-bold text-on-surface">{r.reviewerName ?? "Anonīms"}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= r.stars ? "fill-accent-coral text-accent-coral" : "text-outline"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="font-body text-sm text-on-surface-variant">{r.comment}</p>}
                  <p className="mt-2 font-mono text-xs text-outline">{relativeTime(r.createdAt, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && reviews.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-body text-on-surface-variant">
              {t(locale, "userProfile.noActivePosts")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
