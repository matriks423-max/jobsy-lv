import { Link } from "react-router";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { relativeTime } from "@/lib/relativeTime";
import { CATEGORIES } from "@/lib/categories";
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
  const CategoryIcon = category ? iconMap[category.icon] : MoreHorizontal;
  const isNeed = post.type === "need";
  const heroImage = images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link
        to={`/post/${post.id}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white transition-all duration-200 hover:-translate-y-1 hover:[box-shadow:4px_4px_0_var(--ink)]"
      >
        {/* Hero image — only if post has images */}
        {heroImage && (
          <div className="aspect-video w-full overflow-hidden border-b-2 border-ink">
            <img
              src={heroImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        )}

        {/* Left accent stripe */}
        <div
          className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${isNeed ? "bg-need" : "bg-sage"}`}
        />

        {post.filled ? (
          <div className="absolute right-3 top-3 z-10 rounded-full border-2 border-ink bg-sage px-2.5 py-0.5 font-body text-xs font-medium text-ink">
            ✓ {t(locale, "postDetail.statusFilled")}
          </div>
        ) : Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000 ? (
          <div className="absolute right-3 top-3 z-10 rounded-full border-2 border-coral bg-coral px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-ink">
            {locale === "lv" ? "Jauns" : locale === "ru" ? "Новый" : "New"}
          </div>
        ) : null}

        <div className="flex flex-1 flex-col p-5 pl-6">
          {/* Top row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase ${
                isNeed
                  ? "border border-need bg-need-light text-need"
                  : "border border-sage bg-sage-light text-sage"
              }`}
            >
              {isNeed ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border-1.5 border-ink bg-mustard-light px-2.5 py-1 font-body text-xs font-medium uppercase tracking-wide text-ink">
              <CategoryIcon className="h-3 w-3" />
              {t(locale, `categories.${post.category}` as never)}
            </span>
            {post.city && (
              <span className="inline-flex items-center gap-1 font-body text-xs text-ink-light">
                <MapPin className="h-3 w-3" />
                {t(locale, `cities.${post.city}` as never)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2 font-body text-lg font-bold text-ink line-clamp-2">
            {post.title}
          </h3>

          {/* Description */}
          {post.description && (
            <p className="mb-4 font-body text-sm text-ink-muted line-clamp-2">
              {post.description}
            </p>
          )}

          {/* Bottom row */}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            {post.budgetText && (
              <span className="inline-flex items-center gap-1 font-body text-sm text-ink">
                <Wallet className="h-3.5 w-3.5 text-coral" />
                {post.budgetText}
              </span>
            )}
            {post.whenText && (
              <span className="inline-flex items-center gap-1 font-body text-sm text-ink-muted">
                <Calendar className="h-3.5 w-3.5" />
                {post.whenText}
              </span>
            )}
            {post.viewCount > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-light">
                <Eye className="h-3 w-3" />
                {post.viewCount}
              </span>
            )}
            {profile?.phoneVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-sage bg-sage-light px-1.5 py-0.5 font-body text-[10px] font-medium text-sage">
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
            {isBusiness && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-cream">
                🏢
              </span>
            )}
            {post.boostType === "featured" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-coral bg-coral/10 px-1.5 py-0.5 font-mono text-[10px] text-coral">
                ⭐
              </span>
            )}
            {post.boostType === "urgent" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-600 uppercase">
                {locale === "lv" ? "Steidzams" : locale === "ru" ? "Срочно" : "Urgent"}
              </span>
            )}
            {post.boostType === "bump" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-mustard bg-mustard-light px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink uppercase">
                🔝
              </span>
            )}
            <span className="ml-auto font-mono text-xs text-ink-light" title={new Date(post.createdAt).toLocaleDateString(locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB")}>
              {relativeTime(post.createdAt, locale)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
