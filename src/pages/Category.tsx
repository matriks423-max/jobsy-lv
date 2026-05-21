import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import PostCard from "@/components/PostCard";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const PAGE_SIZE = 12;

// SEO descriptions per category (Latvian)
const CATEGORY_SEO: Record<string, { heading: string; description: string }> = {
  household: {
    heading: "Mājsaimniecības darbi Latvijā",
    description:
      "Atrodi palīgus mājsaimniecībai — tīrīšanai, mazgāšanai, veļai un citiem ikdienas darbiem visā Latvijā.",
  },
  moving: {
    heading: "Pārvākšanās palīdzība Latvijā",
    description:
      "Pieejami pārvākšanās pakalpojumi Rīgā un visā Latvijā. Kraušanas, transporta un iesaiņošanas palīgi.",
  },
  repairs: {
    heading: "Remontdarbi Latvijā",
    description:
      "Atrodi remontdarbiniekus elektriskiem, santehnikas, apdares un citiem remontdarbiem Latvijā.",
  },
  garden: {
    heading: "Dārza darbi Latvijā",
    description:
      "Dārznieki, zāles pļāvēji un dārza palīgi visā Latvijā. Atrodi palīgu savam dārzam.",
  },
  auto: {
    heading: "Auto pakalpojumi Latvijā",
    description:
      "Auto remonta, mazgāšanas un citi automobiļu pakalpojumi Rīgā un visā Latvijā.",
  },
  childcare: {
    heading: "Bērnu pieskatīšana Latvijā",
    description:
      "Aukles un bērnu pieskatīšanas pakalpojumi visā Latvijā. Uzticami palīgi ģimenēm.",
  },
  pets: {
    heading: "Mājdzīvnieku kopšana Latvijā",
    description:
      "Mājdzīvnieku pieskatīšana, pastaiga un kopšana Rīgā un visā Latvijā.",
  },
  it: {
    heading: "IT pakalpojumi Latvijā",
    description:
      "Datorspeciālisti, web izstrādātāji un IT atbalsts privātpersonām un uzņēmumiem Latvijā.",
  },
  tutoring: {
    heading: "Repetīcijas un apmācība Latvijā",
    description:
      "Repetitori mācību priekšmetos, valodās un citās jomās bērniem un pieaugušajiem Latvijā.",
  },
  other: {
    heading: "Citi pakalpojumi Latvijā",
    description:
      "Dažādi palīdzības un pakalpojumu sludinājumi, kas neietilpst citās kategorijās.",
  },
};

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [page, setPage] = useState(0);

  const catInfo = CATEGORIES.find((c) => c.key === slug);
  const seo = slug ? CATEGORY_SEO[slug] : undefined;

  // Redirect unknown slugs to browse
  useEffect(() => {
    if (!catInfo) navigate("/browse", { replace: true });
  }, [catInfo, navigate]);

  // Set document title for SEO
  useEffect(() => {
    if (seo) document.title = `${seo.heading} — jobsy.lv`;
    return () => {
      document.title = "jobsy.lv — Atrodi palīdzību vai piedāvā darbu";
    };
  }, [seo]);

  const { data, isLoading } = trpc.posts.list.useQuery(
    {
      category: slug,
      status: "active",
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: !!catInfo }
  );

  const posts = data ?? [];
  const hasMore = posts.length === PAGE_SIZE;
  const catName = catInfo ? t(locale, `categories.${catInfo.key}`) : "";

  if (!catInfo) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Link to="/" className="hover:text-[var(--ink)]">
          {t(locale, "postDetail.breadcrumbHome")}
        </Link>
        <span>/</span>
        <Link to="/browse" className="hover:text-[var(--ink)]">
          {t(locale, "postDetail.breadcrumbPosts")}
        </Link>
        <span>/</span>
        <span className="text-[var(--ink)]">{catName}</span>
      </nav>

      {/* SEO heading */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[var(--ink)] md:text-4xl">
          {seo?.heading ?? catName}
        </h1>
        {seo?.description && (
          <p className="mt-2 max-w-2xl text-[var(--muted)]">{seo.description}</p>
        )}
      </div>

      {/* Post grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl bg-[var(--ink)]/5"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-[var(--muted)]">
            {t(locale, "browse.empty")}
          </p>
          <Link
            to="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-6 py-3 text-[var(--cream)] hover:opacity-80"
          >
            <Plus className="h-4 w-4" />
            Pievienot sludinājumu
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map(({ post, profile }) => (
              <PostCard key={post.id} post={post} profile={profile} />
            ))}
          </div>

          {/* Pagination */}
          {(page > 0 || hasMore) && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border border-[var(--ink)]/20 px-4 py-2 text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                {t(locale, "browse.prev")}
              </button>
              <span className="text-sm text-[var(--muted)]">
                {t(locale, "browse.loadMore")}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 rounded-xl border border-[var(--ink)]/20 px-4 py-2 text-sm disabled:opacity-40"
              >
                {t(locale, "browse.next")}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-[var(--ink)]/5 p-6 text-center">
        <p className="font-display text-xl font-semibold text-[var(--ink)]">
          Vajad palīdzību ar <em>{catName.toLowerCase()}</em>?
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Publicē sludinājumu — pirmais bez maksas.
        </p>
        <Link
          to="/create"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--cream)] hover:opacity-80"
        >
          <Plus className="h-4 w-4" />
          Publicēt sludinājumu
        </Link>
      </div>
    </div>
  );
}
