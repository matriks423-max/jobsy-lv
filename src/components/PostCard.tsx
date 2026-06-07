import { Link } from "react-router";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { relativeTime } from "@/lib/relativeTime";
import { CATEGORIES } from "@/lib/categories";
import { getCategoryImage } from "@/lib/category-images";
import { Skeleton } from "@/components/ui/skeleton";
import type { Post, Profile } from "@db/schema";
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
  Eye,
  ShieldCheck,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};

interface PostCardProps {
  post: Post;
  profile?: Profile | null;
  isBusiness?: boolean;
  images?: string[];
}

export default function PostCard({ post, profile, isBusiness, images }: PostCardProps) {
  const { locale } = useLocale();

  const category = CATEGORIES.find((c) => c.key === post.category);
  const CategoryIcon = category ? (iconMap[category.icon] ?? MoreHorizontal) : MoreHorizontal;
  const isNeed = post.type === "need";
  const heroImage = images?.[0] ?? getCategoryImage(post.category, post.id);
  const isNew = Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/post/${post.id}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-400 hover:-translate-y-2 hover:shadow-card-hover"
        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
      >
        {/* Boost: featured indicator */}
        {post.boostType === "featured" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
          <div className="absolute left-0 top-0 right-0 h-0.5 bg-accent-coral" />
        )}

        {/* Hero image — user-uploaded or auto-assigned category photo */}
        <div className="relative aspect-video w-full overflow-hidden">
          <img
            src={heroImage}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Subtle gradient overlay so badges are readable */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>

        <div className="flex flex-1 flex-col p-6">
          {/* Top badges row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {/* Type badge — left border signals primary importance */}
            <span
              className={`rounded py-0.5 pr-2 pl-1.5 font-label text-label-sm uppercase border-l-[3px] ${
                isNeed
                  ? "bg-surface-cream text-primary border-l-primary"
                  : "bg-green-50 text-success-emerald border-l-success-emerald"
              }`}
            >
              {isNeed ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </span>

            {/* Category chip */}
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-2.5 py-1 font-label text-label-sm text-on-surface-variant">
              <CategoryIcon className="h-3 w-3" />
              {t(locale, `categories.${post.category}` as never)}
            </span>

            {/* Status badges */}
            {post.filled ? (
              <span className="rounded-full bg-success-emerald/10 px-2.5 py-0.5 font-label text-label-sm font-medium text-success-emerald">
                ✓ {t(locale, "postDetail.statusFilled")}
              </span>
            ) : isNew ? (
              <span className="rounded-full bg-accent-coral/10 px-2.5 py-0.5 font-label text-label-sm font-bold text-accent-coral uppercase">
                {t(locale, "postCard.badgeNew")}
              </span>
            ) : null}

            {/* Boost: urgent */}
            {post.boostType === "urgent" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-label text-label-sm font-bold text-red-600 uppercase">
                {t(locale, "boost.urgent")}
              </span>
            )}

            {/* Boost: bump */}
            {post.boostType === "bump" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="rounded-full bg-surface-cream px-2.5 py-0.5 font-label text-label-sm font-bold text-on-surface-variant uppercase">
                🔝
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2 font-headline text-headline-sm font-semibold text-on-surface line-clamp-2">
            {post.title}
          </h3>

          {/* Description */}
          {post.description && (
            <p className="mb-4 font-body text-body-sm text-on-surface-variant line-clamp-2">
              {post.description}
            </p>
          )}

          {/* Bottom row */}
          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-outline-variant pt-3">
            {post.city && (
              <span className="inline-flex items-center gap-1 font-label text-label-sm text-on-surface-variant">
                <MapPin className="h-3.5 w-3.5" />
                {t(locale, `cities.${post.city}` as never)}
              </span>
            )}
            {post.budgetText && (
              <span className="inline-flex items-center gap-1 font-label text-label-sm font-semibold text-primary">
                <Wallet className="h-3.5 w-3.5" />
                {post.budgetText}
              </span>
            )}
            {post.whenText && (
              <span className="inline-flex items-center gap-1 font-label text-label-sm text-on-surface-variant">
                <Calendar className="h-3.5 w-3.5" />
                {post.whenText}
              </span>
            )}
            {profile?.phoneVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-container/20 px-1.5 py-0.5 font-label text-label-sm text-primary">
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
            {isBusiness && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-on-surface px-2 py-0.5 font-label text-label-sm font-bold text-surface-off-white">
                🏢
              </span>
            )}
            <span
              className="ml-auto font-label text-label-sm text-outline"
              title={new Date(post.createdAt).toLocaleDateString(
                locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"
              )}
            >
              {relativeTime(post.createdAt, locale)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Skeleton placeholder */
export function PostCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-card">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-12 rounded" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="mb-2 h-7 w-3/4 rounded-lg" />
        <Skeleton className="mb-1 h-5 w-full rounded-md" />
        <Skeleton className="mb-4 h-5 w-5/6 rounded-md" />
        <div className="mt-auto flex items-center gap-3 border-t border-outline-variant pt-3">
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="ml-auto h-3 w-12 rounded-md" />
        </div>
      </div>
    </div>
  );
}
