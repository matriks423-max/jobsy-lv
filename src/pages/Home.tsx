import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
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
} from "lucide-react";

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
      <Star className="h-4 w-4 fill-coral text-coral" />
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

export default function Home() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "need" | "offer">("all");
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center px-4 pb-16 pt-20 text-center noise-bg">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Star className="absolute left-[10%] top-[15%] h-4 w-4 text-mustard opacity-30" />
          <div className="absolute right-[15%] top-[20%] h-6 w-6 rounded-full border-2 border-coral opacity-30" />
          <div className="absolute bottom-[25%] left-[20%] h-3 w-3 rotate-45 border-2 border-sage opacity-30" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl">
          <h1 className="mb-6 font-display text-5xl font-bold leading-tight text-ink md:text-7xl">
            {t(locale, "hero.title")}
          </h1>
          <p className="mx-auto mb-10 max-w-xl font-body text-lg text-ink-muted">
            {t(locale, "hero.subtitle")}
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => navigate("/browse?type=need")}
              className="h-14 rounded-xl border-2 border-ink bg-coral px-8 font-body text-base font-medium text-ink hover:-translate-y-1 hover:bg-coral-hover hover:shadow-card-coral"
            >
              <Search className="mr-2 h-5 w-5" />
              {t(locale, "hero.btnNeed")}
            </Button>
            <Button
              onClick={() => navigate("/browse?type=offer")}
              className="h-14 rounded-xl border-2 border-ink bg-mustard px-8 font-body text-base font-medium text-ink hover:-translate-y-1 hover:shadow-card-mustard"
            >
              <Plus className="mr-2 h-5 w-5" />
              {t(locale, "hero.btnOffer")}
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 md:gap-10">
            {[
              {
                value: stats?.activePosts ?? 0,
                label: t(locale, "hero.statsActive"),
              },
              {
                value: stats?.users ?? 0,
                label: t(locale, "hero.statsUsers"),
              },
              {
                value: stats?.categories ?? 0,
                label: t(locale, "hero.statsCategories"),
              },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="text-center">
                  <div className="font-display text-3xl font-bold text-coral">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="font-body text-xs text-ink-muted">
                    {stat.label}
                  </div>
                </div>
                {i < 2 && (
                  <span className="hidden text-ink-light md:inline">•</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce-subtle">
          <ChevronDown className="h-6 w-6 text-ink-light" />
        </div>
      </section>

      {/* Marquee */}
      <MarqueeStrip />

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
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-white font-display text-2xl font-bold text-ink">
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

      {/* Latest Posts */}
      <section className="px-4 py-20 noise-bg">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <h2 className="font-display text-3xl font-bold text-ink md:text-4xl">
              {t(locale, "latestPosts.title")}
            </h2>

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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((item: PostWithProfile) => (
                <PostCard key={item.post.id} post={item.post} profile={item.profile} />
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
                        navigator.clipboard.writeText(referralInfo.referralCode ?? "");
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
