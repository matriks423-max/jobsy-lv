import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { getCityCoords } from "@/lib/lv-cities";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PostCard from "@/components/PostCard";
import type { PostWithProfile } from "@/types/post";
import {
  Star,
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
} from "lucide-react";
import { motion } from "framer-motion";
import SeasonalParticles from "@/components/SeasonalParticles";

// Fix Leaflet default icon paths in Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

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

function MarqueeStrip() {
  const { locale } = useLocale();
  const items = CATEGORIES.map((cat, i) => (
    <span key={i} className="inline-flex items-center gap-3 whitespace-nowrap px-4">
      <Star className="h-4 w-4" style={{ fill: 'var(--coral)', color: 'var(--coral)' }} />
      <span className="font-display text-lg font-bold italic text-mustard">
        {t(locale, `categories.${cat.key}` as never)}
      </span>
    </span>
  ));

  return (
    <div className="overflow-hidden border-y-2 border-ink bg-ink py-3">
      <div className="flex animate-marquee">
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <div key={i}>{item}</div>
        ))}
      </div>
    </div>
  );
}

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
  const [cardView, setCardView] = useState<"grid" | "list">("grid");
  const [heroSearch, setHeroSearch] = useState("");

  const handleHeroSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/browse?search=${encodeURIComponent(q)}` : "/browse");
  };

  useEffect(() => {
    document.title = "jobsy.lv — Atrodi palīdzību vai piedāvā darbu";
  }, []);

  const { data: stats } = trpc.stats.get.useQuery();
  const { data: posts, isLoading } = trpc.posts.list.useQuery(
    {
      type: activeFilter === "all" ? undefined : activeFilter,
      status: "active",
      limit: 6,
    },
    { staleTime: 30 * 1000 }
  );
  const { data: referralInfo } = trpc.referral.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: featuredData } = trpc.posts.featuredPosts.useQuery();
  const featuredPosts = (featuredData ?? []).slice(0, 3);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-20 text-center"
        style={{
          background: 'linear-gradient(to bottom, var(--season-hero-from, #FBF6EE), var(--season-hero-to, #F5F1E8))',
        }}
      >
        {/* Seasonal particles */}
        <SeasonalParticles />

        {/* Decorative shapes */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Star className="absolute left-[10%] top-[15%] h-4 w-4 opacity-20" style={{ color: 'var(--mustard)' }} />
          <div className="absolute right-[15%] top-[20%] h-6 w-6 rounded-full border-2 opacity-20" style={{ borderColor: 'var(--coral)' }} />
          <div className="absolute bottom-[25%] left-[20%] h-3 w-3 rotate-45 border-2 opacity-20" style={{ borderColor: 'var(--sage)' }} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl">
          {/* Headline — word-by-word reveal */}
          <motion.h1 className="mb-6 font-display text-5xl font-bold leading-tight text-ink md:text-7xl">
            {t(locale, "hero.title").split(" ").map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
                className="mr-[0.2em] inline-block"
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="mx-auto mb-8 max-w-xl font-body text-lg text-ink-muted"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
          >
            {t(locale, "hero.subtitle")}
          </motion.p>

          {/* Search bar */}
          <motion.form
            onSubmit={handleHeroSearch}
            className="mb-6 flex gap-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={t(locale, "hero.searchPlaceholder")}
                className="h-14 w-full rounded-xl border-2 border-ink bg-white pl-12 pr-4 font-body text-base text-ink placeholder:text-ink-light focus:border-coral focus:outline-none transition-colors"
              />
            </div>
            <Button
              type="submit"
              className="h-14 shrink-0 rounded-xl border-2 border-ink bg-coral px-6 font-body font-medium text-ink hover:-translate-y-0.5 hover:bg-coral-hover"
            >
              {t(locale, "hero.searchBtn")} →
            </Button>
          </motion.form>

          {/* Category quick-links */}
          <motion.div
            className="mb-10 flex flex-wrap justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85, duration: 0.4 }}
          >
            {QUICK_CATEGORIES.map(({ key, Icon }) => (
              <Link
                key={key}
                to={`/browse?category=${key}`}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-4 py-2 font-body text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:bg-coral-light"
              >
                <Icon className="h-3.5 w-3.5" />
                {t(locale, `categories.${key}` as never)}
              </Link>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 md:gap-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.4 }}
          >
            {[
              { value: stats?.activePosts ?? 0, label: t(locale, "hero.statsActive") },
              { value: stats?.users ?? 0,        label: t(locale, "hero.statsUsers") },
              { value: stats?.categories ?? 0,   label: t(locale, "hero.statsCategories") },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <div className="font-display text-3xl font-bold text-coral">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="font-body text-xs text-ink-muted">{stat.label}</div>
                </div>
                {i < 2 && <span className="hidden text-ink-light md:inline">•</span>}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-subtle">
          <ChevronDown className="h-6 w-6 text-ink-light" />
        </div>
      </section>

      {/* Marquee */}
      <MarqueeStrip />

      {/* Featured Posts */}
      {featuredPosts.length > 0 && (
        <section className="px-4 py-8">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-6 font-display text-2xl font-bold text-ink">✨ Featured</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredPosts.map(({ post, profile, isBusiness, images }) => (
                <PostCard key={`hf-${post.id}`} post={post} profile={profile} isBusiness={isBusiness} images={images} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="bg-cream-dark px-4 py-20 noise-bg">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-12 text-center font-display text-3xl font-bold text-ink md:text-4xl">
            {t(locale, "howItWorks.title")}
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                num: "1",
                title: t(locale, "howItWorks.step1"),
                desc: t(locale, "howItWorks.step1Desc"),
              },
              {
                num: "2",
                title: t(locale, "howItWorks.step2"),
                desc: t(locale, "howItWorks.step2Desc"),
              },
              {
                num: "3",
                title: t(locale, "howItWorks.step3"),
                desc: t(locale, "howItWorks.step3Desc"),
              },
            ].map((step, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center"
              >
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink font-display text-2xl font-bold transition-colors duration-500"
                  style={{ background: 'var(--coral-light)', color: 'var(--coral)' }}
                >
                  {step.num}
                </div>
                <h3 className="mb-2 font-body text-lg font-bold text-ink">
                  {step.title}
                </h3>
                <p className="font-body text-sm text-ink-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* City Map */}
      <section className="px-4 py-20 noise-bg">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center font-display text-3xl font-bold text-ink md:text-4xl">
            {t(locale, "cityMap.title")}
          </h2>
          <MapContainer
            center={[56.88, 24.6]}
            zoom={7}
            className="h-[340px] w-full rounded-2xl border-2 border-ink md:h-[440px]"
            scrollWheelZoom={false}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {CITIES.filter((c) => c !== "other").map((cityKey) => {
              const coords = getCityCoords(cityKey);
              if (!coords) return null;
              return (
                <Marker key={cityKey} position={[coords.lat, coords.lng]}>
                  <Popup>
                    <div className="min-w-[140px] text-center">
                      <p className="mb-2 font-bold text-gray-900">
                        {t(locale, `cities.${cityKey}` as never)}
                      </p>
                      <Link
                        to={`/browse?city=${cityKey}`}
                        className="inline-block rounded-lg border-2 border-gray-800 bg-orange-400 px-3 py-1 text-xs font-medium text-gray-900 hover:bg-orange-500"
                      >
                        {t(locale, "cityMap.viewPosts")} →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </section>

      {/* Latest Posts */}
      <section className="px-4 py-20 noise-bg">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
              {t(locale, "latestPosts.title")}
            </h2>

            <div className="flex items-center gap-3">
              {/* Grid/List toggle */}
              <div className="flex overflow-hidden rounded-xl border-2 border-ink">
                <button
                  onClick={() => setCardView("grid")}
                  className={`px-3 py-2 font-body text-sm font-medium transition ${cardView === "grid" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"}`}
                  title="Grid view"
                >
                  ⊞
                </button>
                <button
                  onClick={() => setCardView("list")}
                  className={`px-3 py-2 font-body text-sm font-medium transition ${cardView === "list" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"}`}
                  title="List view"
                >
                  ☰
                </button>
              </div>
              {/* Type filter */}
              <div className="flex gap-2">
                {(["all", "need", "offer"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                      activeFilter === f
                        ? "border-ink bg-coral text-ink"
                        : "border-ink-light bg-transparent text-ink-muted hover:border-ink hover:text-ink"
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
          </div>

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-48 rounded-2xl border-2 border-ink"
                />
              ))}
            </div>
          ) : posts && posts.length > 0 ? (
            <div className={cardView === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
              {posts.map((item: PostWithProfile) => (
                <PostCard key={item.post.id} post={item.post} profile={item.profile} isBusiness={item.isBusiness} images={item.images} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-16">
              <Search className="mb-4 h-12 w-12 text-ink-light" />
              <p className="mb-4 font-body text-ink-muted">
                {t(locale, "latestPosts.empty")}
              </p>
              <Button
                onClick={() => navigate("/create")}
                className="rounded-xl border-2 border-ink bg-coral px-6 font-body font-medium text-ink hover:bg-coral-hover"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t(locale, "latestPosts.emptyBtn")}
              </Button>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-transparent px-6 py-3 font-body font-medium text-ink transition hover:bg-cream-dark"
            >
              {t(locale, "latestPosts.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner + Referral */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Main CTA */}
            <div className="rounded-3xl border-2 border-ink bg-ink px-8 py-12 text-center noise-bg">
              <h2 className="mx-auto max-w-lg font-display text-2xl font-bold text-cream md:text-3xl">
                {t(locale, "ctaBanner.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-md font-body text-cream-dark">
                {t(locale, "ctaBanner.subtitle")}
              </p>
              <Button
                onClick={() => navigate(isAuthenticated ? "/create" : "/login")}
                className="mt-6 h-14 rounded-xl border-2 border-cream bg-coral px-8 font-body text-base font-medium text-ink hover:-translate-y-1 hover:bg-coral-hover"
              >
                <Plus className="mr-2 h-5 w-5" />
                {t(locale, "ctaBanner.btn")}
              </Button>
            </div>

            {/* Referral */}
            <div className="rounded-3xl border-2 border-ink bg-mustard-light px-8 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-mustard">
                <Gift className="h-7 w-7 text-ink" />
              </div>
              <h2 className="font-display text-2xl font-bold text-ink md:text-3xl">
                {t(locale, "referral.title")}
              </h2>
              <p className="mx-auto mt-3 max-w-sm font-body text-sm text-ink-muted">
                {t(locale, "referral.subtitle")}
              </p>

              {isAuthenticated && referralInfo?.referralCode ? (
                <div className="mt-6">
                  <p className="mb-2 font-body text-sm font-medium text-ink-muted">
                    {t(locale, "referral.yourCode")}
                  </p>
                  <div className="mx-auto flex max-w-xs items-center gap-2">
                    <div className="flex-1 rounded-xl border-2 border-ink bg-white px-4 py-3 font-mono text-lg font-bold tracking-wider text-ink">
                      {referralInfo.referralCode}
                    </div>
                    <button
                      onClick={() => {
                        const refUrl = `https://jobsy.lv/login?ref=${referralInfo.referralCode ?? ""}`;
                        navigator.clipboard.writeText(refUrl);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="rounded-xl border-2 border-ink bg-white p-3 text-ink hover:bg-cream-dark"
                      title={t(locale, "referral.copy")}
                    >
                      {copied ? (
                        <Check className="h-5 w-5 text-sage" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {referralInfo.freePostCredits > 0 && (
                    <p className="mt-3 font-body text-sm text-sage">
                      {referralInfo.freePostCredits} {t(locale, "referral.creditLabel")}
                    </p>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => navigate("/login")}
                  className="mt-6 h-12 rounded-xl border-2 border-ink bg-white font-body font-medium text-ink hover:bg-cream-dark"
                >
                  {t(locale, "nav.login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
