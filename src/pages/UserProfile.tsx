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
      document.title = `${data.profile.name} — jobsy.lv`;
    }
    return () => { document.title = prev; };
  }, [data?.profile?.name]);

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-8 noise-bg">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-32 rounded-3xl border-2 border-ink" />
          <Skeleton className="h-48 rounded-3xl border-2 border-ink" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center noise-bg">
        <p className="font-body text-ink-muted">{t(locale, "postDetail.notFound")}</p>
      </div>
    );
  }

  const { profile, isBusiness, memberSince, posts, reviews, avgRating, reviewCount } = data;

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-3xl">

        {/* Profile card */}
        <div className="mb-6 rounded-3xl border-2 border-ink bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-start gap-4">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name ?? ""}
                className="h-20 w-20 rounded-full border-2 border-ink object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-ink bg-coral-light">
                <span className="font-display text-2xl font-bold text-coral">
                  {(profile.name ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}

            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-ink">
                  {profile.name ?? t(locale, "postDetail.notFound")}
                </h1>
                {profile.phoneVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-sage bg-sage-light px-2 py-0.5 font-body text-xs font-medium text-sage">
                    <ShieldCheck className="h-3 w-3" />
                    {t(locale, "settings.verified")}
                  </span>
                )}
                {isBusiness && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-ink px-2 py-0.5 font-mono text-xs font-bold text-cream">
                    🏢 Business
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 font-body text-sm text-ink-muted">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {t(locale, `cities.${profile.city}` as never)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {locale === "lv" ? "Biedrs" : locale === "ru" ? "Участник" : "Member"}{" "}
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
                        className={`h-4 w-4 ${s <= Math.round(avgRating) ? "fill-mustard text-mustard" : "text-ink-light"}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm font-bold text-ink">{avgRating}</span>
                  <span className="font-body text-xs text-ink-muted">({reviewCount})</span>
                </div>
              )}
            </div>
          </div>

          {/* Business description */}
          {isBusiness && profile.companyName && (
            <div className="mt-6 rounded-xl border-2 border-ink-light bg-cream-dark p-4">
              <p className="mb-1 font-body text-sm font-bold text-ink">🏢 {profile.companyName}</p>
              {profile.companyDescription && (
                <p className="font-body text-sm text-ink-muted">{profile.companyDescription}</p>
              )}
              {profile.companyWebsite && (
                <a
                  href={profile.companyWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-body text-xs text-coral hover:underline"
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
            <h2 className="mb-4 font-display text-xl font-bold text-ink">
              {locale === "lv" ? "Aktīvie sludinājumi" : locale === "ru" ? "Активные объявления" : "Active Posts"}
              <span className="ml-2 font-mono text-sm font-normal text-ink-muted">({posts.length})</span>
            </h2>
            <div className="space-y-3">
              {posts.map((post) => {
                const category = CATEGORIES.find((c) => c.key === post.category);
                const CategoryIcon = category ? (iconMap[category.icon] ?? MoreHorizontal) : MoreHorizontal;
                return (
                  <Link
                    key={post.id}
                    to={`/post/${post.id}`}
                    className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-card"
                  >
                    <div className={`h-12 w-1 shrink-0 rounded-full ${post.type === "need" ? "bg-need" : "bg-sage"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full border border-ink bg-mustard-light px-2 py-0.5 font-body text-[10px] font-medium uppercase text-ink">
                          <CategoryIcon className="h-3 w-3" />
                          {t(locale, `categories.${post.category}` as never)}
                        </span>
                        {post.city && (
                          <span className="flex items-center gap-0.5 font-body text-xs text-ink-muted">
                            <MapPin className="h-3 w-3" />
                            {t(locale, `cities.${post.city}` as never)}
                          </span>
                        )}
                      </div>
                      <p className="truncate font-body text-sm font-bold text-ink">{post.title}</p>
                      <div className="mt-1 flex items-center gap-3 font-mono text-xs text-ink-light">
                        {post.budgetText && (
                          <span className="flex items-center gap-0.5">
                            <Wallet className="h-3 w-3 text-coral" />
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
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-muted" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h2 className="mb-4 font-display text-xl font-bold text-ink">
              {locale === "lv" ? "Atsauksmes" : locale === "ru" ? "Отзывы" : "Reviews"}
            </h2>
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border-2 border-ink bg-white p-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-body text-sm font-bold text-ink">{r.reviewerName ?? "—"}</p>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= r.stars ? "fill-mustard text-mustard" : "text-ink-light"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="font-body text-sm text-ink-muted">{r.comment}</p>}
                  <p className="mt-2 font-mono text-xs text-ink-light">{relativeTime(r.createdAt, locale)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 && reviews.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-body text-ink-muted">
              {locale === "lv" ? "Nav aktīvu sludinājumu." : locale === "ru" ? "Нет активных объявлений." : "No active posts."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
