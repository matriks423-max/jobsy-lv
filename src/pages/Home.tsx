import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import HomeCityMap from "@/components/HomeCityMap";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard, { PostCardSkeleton } from "@/components/PostCard";
import type { PostWithProfile } from "@/types/post";
import {
  Sparkles,
  ChevronDown,
  Plus,
  Search,
  ArrowRight,
  Gift,
  Copy,
  Check,
  Home as HomeIcon,
  Truck,
  Wrench,
  Flower2,
  Baby,
  Monitor,
  Car,
  Cat,
  GraduationCap,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { lazy, Suspense } from "react";
import MagneticButton from "@/components/premium/MagneticButton";
import TiltCard from "@/components/premium/TiltCard";
import { useLenis } from "@/hooks/useLenis";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const HeroCanvas = lazy(() => import("@/components/premium/HeroCanvas"));

/** Tracks normalized cursor offset (-0.5..0.5) for hero depth parallax. */
function useHeroParallax() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setOffset({
          x: e.clientX / window.innerWidth - 0.5,
          y: e.clientY / window.innerHeight - 0.5,
        })
      );
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return offset;
}

function AnimatedCounter({ target, duration = 1500 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}</span>;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  household: HomeIcon,
  moving: Truck,
  repairs: Wrench,
  garden: Flower2,
  auto: Car,
  childcare: Baby,
  pets: Cat,
  it: Monitor,
  tutoring: GraduationCap,
  other: MoreHorizontal,
};

const QUICK_CATEGORIES = [
  { key: "repairs",   Icon: Wrench    },
  { key: "it",        Icon: Monitor   },
  { key: "garden",    Icon: Flower2   },
  { key: "moving",    Icon: Truck     },
  { key: "household", Icon: HomeIcon  },
  { key: "childcare", Icon: Baby      },
] as const;

export default function Home() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "need" | "offer">("all");
  const [copied, setCopied] = useState(false);
  const [heroSearch, setHeroSearch] = useState("");
  const parallax = useHeroParallax();
  const categoriesRef = useScrollReveal<HTMLDivElement>({ selector: ".cat-tile", stagger: 0.05, y: 24 });
  useLenis();

  // depth: each layer drifts by a multiple of the cursor offset
  const layer = (depth: number) => ({
    transform: `translate3d(${parallax.x * depth}px, ${parallax.y * depth}px, 0)`,
  });

  const handleHeroSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/browse?search=${encodeURIComponent(q)}` : "/browse");
  };

  useEffect(() => {
    const titles: Record<string, string> = {
      lv: "jobsy.lv — Atrodi palīdzību vai darbu",
      ru: "jobsy.lv — Найди помощь или предложи услуги",
      en: "jobsy.lv — Find help or offer your skills",
    };
    const descs: Record<string, string> = {
      lv: "Latvijas ērtākais veids, kā atrast palīgus ikdienas uzdevumiem vai atrast darbiņus. Publicē bezmaksas sludinājumu.",
      ru: "Самый удобный способ в Латвии найти помощников для повседневных задач или найти подработку. Разместите объявление бесплатно.",
      en: "The easiest way in Latvia to find helpers for everyday tasks or find gigs that earn cash. Post your listing for free.",
    };
    document.title = titles[locale] ?? titles.lv;
    const desc = descs[locale] ?? descs.lv;
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !metaDesc;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;
    return () => {
      if (created && metaDesc) document.head.removeChild(metaDesc);
      else if (metaDesc) metaDesc.content = "";
    };
  }, [locale]);

  const { data: stats } = trpc.stats.get.useQuery();
  const { data: categoryCounts } = trpc.posts.categoryCounts.useQuery(undefined, { staleTime: 60 * 1000 });
  const { data: posts, isLoading } = trpc.posts.list.useQuery(
    {
      type: activeFilter === "all" ? undefined : activeFilter,
      status: "active",
      limit: 6,
    },
    { staleTime: 30 * 1000 }
  );
  const { data: referralInfo } = trpc.referral.me.useQuery(undefined, {
    enabled: isAuthenticated ?? false,
  });
  const { data: featuredData } = trpc.posts.featuredPosts.useQuery();
  const featuredPosts = (featuredData ?? []).slice(0, 3);

  return (
    <div className="min-h-screen bg-surface-off-white">
      {/* -- Hero ------------------------------------------------ */}
      <section className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-4 pb-12 pt-4 text-center">
        {/* Animated WebGL emerald gradient mesh (lazy, with static CSS fallback) */}
        <Suspense
          fallback={
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(160deg, #003527 0%, #064e3b 45%, #095c45 100%)" }}
            />
          }
        >
          <HeroCanvas />
        </Suspense>

        {/* Subtle noise texture over the mesh */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: "256px",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-3xl">
         <div style={layer(-16)} className="will-change-transform">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-6 inline-flex overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur-sm"
          >
            <span className="flex items-center gap-1.5 bg-accent-coral/90 px-3.5 py-1.5 font-label text-label-sm font-bold text-white">
              <svg width="16" height="11" viewBox="0 0 20 12" className="inline-block flex-shrink-0 rounded-[2px]" aria-label="Latvian flag">
                <rect width="20" height="12" fill="#9E3039"/>
                <rect y="4" width="20" height="4" fill="white"/>
              </svg>
              <span>{locale === "ru" ? "Бесплатно" : locale === "en" ? "Free" : "Bezmaksas"}</span>
            </span>
            <span className="flex items-center px-3.5 py-1.5 font-label text-label-sm text-white/85">
              {locale === "ru"
                ? "Без карты · Латвия"
                : locale === "en"
                ? "No credit card · Latvia"
                : "Bez kredītkartes · Latvijā"}
            </span>
          </motion.div>
         </div>

         <div style={layer(-9)} className="will-change-transform">
          {/* Headline — word-by-word reveal */}
          <motion.h1 className="mb-5 font-headline text-5xl font-bold leading-tight text-white md:text-[64px] md:leading-[1.1]">
            {t(locale, "hero.title").split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mr-[0.2em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mb-8 max-w-xl font-body text-body-lg text-primary-fixed-dim"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {t(locale, "hero.subtitle")}
          </motion.p>
         </div>

         <div style={layer(-4)} className="will-change-transform">
          {/* Search bar — glass + focus glow */}
          <motion.form
            onSubmit={handleHeroSearch}
            className="group/search mb-6 flex gap-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={t(locale, "hero.searchPlaceholder")}
                className="relative h-14 w-full rounded-xl bg-white/95 pl-12 pr-4 font-body text-body-md text-on-surface shadow-lg shadow-black/20 ring-1 ring-white/30 backdrop-blur-md placeholder:text-on-surface-variant transition-all duration-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-coral/60 focus:shadow-[0_0_0_4px_rgba(255,127,80,0.18),0_18px_40px_-12px_rgba(0,0,0,0.45)]"
              />
            </div>
            <MagneticButton className="shrink-0" strength={0.5}>
              <button
                type="submit"
                className="h-14 shrink-0 rounded-xl bg-accent-coral px-6 font-label text-label-md font-bold text-white shadow-lg shadow-accent-coral/30 transition-all duration-200 hover:bg-accent-coral-hover active:scale-95"
              >
                {t(locale, "hero.searchBtn")}
              </button>
            </MagneticButton>
          </motion.form>

          {/* Category quick-links */}
          <motion.div
            className="mb-8 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.4 }}
          >
            {QUICK_CATEGORIES.map(({ key, Icon }) => (
              <Link
                key={key}
                to={`/browse?category=${key}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 font-label text-label-sm text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
              >
                <Icon className="h-3 w-3" />
                {t(locale, `categories.${key}` as never)}
              </Link>
            ))}
          </motion.div>
         </div>

         <div style={layer(-24)} className="will-change-transform">
          {/* Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-8 md:gap-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.4 }}
          >
            {[
              { value: CATEGORIES.length,          label: t(locale, "hero.statsCategories") },
              { value: CITIES.length - 1,           label: t(locale, "hero.statsCities") },
              ...(stats?.activePosts > 0 ? [{ value: Number(stats.activePosts), label: t(locale, "hero.statsActive") }] : []),
              ...(stats?.users > 0       ? [{ value: Number(stats.users),       label: t(locale, "hero.statsUsers") }] : []),
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="font-headline text-4xl font-bold text-white">
                  <AnimatedCounter target={stat.value} />
                </div>
                <div className="mt-0.5 font-label text-label-sm text-primary-fixed-dim">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
         </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-subtle">
          <ChevronDown className="h-6 w-6 text-primary-fixed-dim" />
        </div>
      </section>

      {/* -- Categories ----------------------------------------- */}
      <section className="px-margin-mobile py-10 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max-width">
          <div ref={categoriesRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.key];
              const count = categoryCounts?.[cat.key] ?? 0;
              return (
                <TiltCard key={cat.key} className="cat-tile rounded-xl" max={9}>
                  <Link
                    to={`/browse?category=${cat.key}`}
                    className="group flex h-full flex-col items-center gap-3 rounded-xl bg-white px-4 py-5 text-center shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                  >
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                      style={{ backgroundColor: cat.bg }}
                    >
                      {Icon && <Icon className="h-6 w-6" style={{ color: cat.color }} />}
                    </div>
                    <div>
                      <p className="font-label text-label-sm font-semibold text-on-surface transition-colors group-hover:text-primary">
                        {t(locale, `categories.${cat.key}` as never)}
                      </p>
                      {count > 0 && (
                        <p className="mt-0.5 font-mono text-[11px] text-on-surface-variant">
                          {count}
                        </p>
                      )}
                    </div>
                  </Link>
                </TiltCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* -- Featured Posts -------------------------------------- */}
      {featuredPosts.length > 0 && (
        <section className="px-margin-mobile py-10 md:px-margin-desktop">
          <div className="mx-auto max-w-container-max-width">
            <div className="mb-6 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent-coral" />
              <h2 className="font-headline text-headline-sm font-semibold text-on-surface">
                {t(locale, "browse.featured")}
              </h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map(({ post, profile, isBusiness, images }) => (
                <TiltCard key={`hf-${post.id}`} className="rounded-2xl" max={5}>
                  <PostCard post={post} profile={profile} isBusiness={isBusiness} images={images} />
                </TiltCard>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* -- How It Works ---------------------------------------- */}
      <section className="bg-surface-cream px-margin-mobile py-14 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max-width">
          <div className="mb-10 text-center">
            <h2 className="font-headline text-headline-md font-bold text-on-surface">
              {t(locale, "howItWorks.title")}
            </h2>
          </div>

          {/* Step number indicators with dashed connector */}
          <div className="relative mb-8 hidden md:grid md:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute left-[16.667%] top-1/2 h-px w-[66.666%] -translate-y-1/2"
              style={{ backgroundImage: "repeating-linear-gradient(90deg, #bfc9c3 0, #bfc9c3 6px, transparent 6px, transparent 14px)" }}
            />
            {["01", "02", "03"].map((n) => (
              <div key={n} className="flex justify-center">
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-primary font-headline text-sm font-bold text-white ring-4 ring-surface-cream">
                  {n}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                emoji: "✏️",
                title: t(locale, "howItWorks.step1"),
                desc: t(locale, "howItWorks.step1Desc"),
              },
              {
                emoji: "💬",
                title: t(locale, "howItWorks.step2"),
                desc: t(locale, "howItWorks.step2Desc"),
              },
              {
                emoji: "🤝",
                title: t(locale, "howItWorks.step3"),
                desc: t(locale, "howItWorks.step3Desc"),
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center text-center"
              >
                <span className="mb-4 text-4xl">{step.emoji}</span>
                <h3 className="mb-2 font-headline text-headline-sm font-semibold text-on-surface">
                  {step.title}
                </h3>
                <p className="font-body text-body-sm text-on-surface-variant">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* -- City Map -------------------------------------------- */}
      <section className="px-margin-mobile py-14 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max-width">
          <div className="mb-8 text-center">
            <h2 className="font-headline text-headline-md font-bold text-on-surface">
              {t(locale, "cityMap.title")}
            </h2>
          </div>
          <HomeCityMap />
        </div>
      </section>

      {/* -- Latest Posts ---------------------------------------- */}
      <section className="bg-surface-cream px-margin-mobile py-14 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max-width">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="font-headline text-headline-md font-bold text-on-surface">
              {t(locale, "latestPosts.title")}
            </h2>

            {/* Type filter */}
            <div className="flex gap-2">
              {(["all", "need", "offer"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`rounded-lg px-4 py-2 font-label text-label-sm transition-colors duration-200 ${
                    activeFilter === f
                      ? "bg-primary text-white"
                      : "bg-white text-on-surface-variant shadow-card hover:text-primary"
                  }`}
                >
                  {f === "all"
                    ? t(locale, "latestPosts.all")
                    : f === "need"
                    ? t(locale, "latestPosts.need")
                    : t(locale, "latestPosts.offer")}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((item: PostWithProfile) => (
                <PostCard key={item.post.id} post={item.post} profile={item.profile} isBusiness={item.isBusiness} images={item.images} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16">
              <Search className="mb-4 h-12 w-12 text-outline" />
              <p className="mb-4 font-body text-body-md text-on-surface-variant">
                {t(locale, "latestPosts.empty")}
              </p>
              <button
                onClick={() => navigate("/create")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-label text-label-md font-bold text-white transition-all duration-200 hover:bg-on-primary-fixed-variant"
              >
                <Plus className="h-4 w-4" />
                {t(locale, "latestPosts.emptyBtn")}
              </button>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-6 py-3 font-label text-label-md text-on-surface shadow-card transition-all duration-200 hover:border-primary hover:text-primary"
            >
              {t(locale, "latestPosts.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* -- CTA --------------------------------------------------- */}
      <section className="px-margin-mobile py-14 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max-width space-y-4">

          {/* Main CTA — full width */}
          <div
            className="relative overflow-hidden rounded-2xl px-8 py-10 text-center"
            style={{
              background: "linear-gradient(135deg, #003527 0%, #064e3b 100%)",
            }}
          >
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 -translate-y-1/2 translate-x-1/2 rounded-full bg-secondary-DEFAULT/10 blur-2xl" />
            <h2 className="relative mx-auto max-w-lg font-headline text-headline-sm font-bold text-white">
              {t(locale, "ctaBanner.title")}
            </h2>
            <p className="relative mx-auto mt-3 max-w-md font-body text-body-sm text-primary-fixed-dim">
              {t(locale, "ctaBanner.subtitle")}
            </p>
            <MagneticButton className="relative mt-6" strength={0.5}>
              <button
                onClick={() => navigate(isAuthenticated ? "/create" : "/login")}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-accent-coral px-8 font-label text-label-md font-bold text-white shadow-lg shadow-accent-coral/30 transition-all duration-200 hover:bg-accent-coral-hover active:scale-95"
              >
                <Plus className="h-4 w-4" />
                {t(locale, "ctaBanner.btn")}
              </button>
            </MagneticButton>
          </div>

          {/* Referral — compact strip below CTA */}
          <div className="rounded-xl border border-outline-variant bg-white px-6 py-4 shadow-card">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-cream">
                  <Gift className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-label text-label-md font-semibold text-on-surface">
                    {t(locale, "referral.title")}
                  </p>
                  <p className="font-body text-body-sm text-on-surface-variant">
                    {t(locale, "referral.subtitle")}
                  </p>
                </div>
              </div>

              {isAuthenticated && referralInfo?.referralCode ? (
                <div className="flex shrink-0 items-center gap-2">
                  <div className="rounded-lg border border-outline-variant bg-surface-cream px-3 py-2 font-mono text-sm font-bold tracking-wider text-on-surface">
                    {referralInfo.referralCode}
                  </div>
                  <button
                    onClick={() => {
                      const refUrl = `https://jobsy.lv/login?ref=${referralInfo.referralCode ?? ""}`;
                      navigator.clipboard.writeText(refUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="rounded-lg border border-outline-variant bg-surface-cream p-2 text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                    title={t(locale, "referral.copy")}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success-emerald" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  {referralInfo.freePostCredits > 0 && (
                    <span className="font-label text-label-sm text-success-emerald">
                      +{referralInfo.freePostCredits} {t(locale, "referral.creditLabel")}
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigate("/login")}
                  className="shrink-0 rounded-lg border border-outline-variant bg-surface-cream px-4 py-2 font-label text-label-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
                >
                  {t(locale, "nav.login")}
                </button>
              )}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
