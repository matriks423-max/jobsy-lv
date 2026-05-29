import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import PostCard, { PostCardSkeleton } from "@/components/PostCard";
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
      "Atrodi remontdarbniekus elektriskiem, santehnikas, apdares un citiem remontdarbiem Latvijā.",
  },
  garden: {
    heading: "Dārza darbi Latvijā",
    description:
      "Dārznieki, zāles pļāvēji un dārza palīgi visā Latvijā. Atrodi palīgu savam dārzam.",
  },
  auto: {
    heading: "Auto pakalpojumi Latvijā",
    description:
      "Auto remonta, mazgāšanas un citi automobilu pakalpojumi Rīgā un visā Latvijā.",
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
      "Repetitori mācību priekšmetos, valodas un citas jomās bērniem un pieaugušajiem Latvijā.",
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

  // Set document title + meta description for SEO
  useEffect(() => {
    const catName = catInfo ? t(locale, `categories.${catInfo.key}` as never) : "";
    if (catName) {
      const prev = document.title;
      document.title = `${catName} darbi — jobsy.lv`;
      let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      const created = !meta;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = seo?.description ?? `${catName} sludinajumi Latvija — jobsy.lv`;
      return () => {
        document.title = prev;
        if (created && meta) document.head.removeChild(meta);
        else if (meta) meta.content = "";
      };
    }
  }, [catInfo, locale, seo]);

  const { data, isLoading } = trpc.posts.list.useQuery(
    {
      category: slug,
      status: "active",
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: !!catInfo }
  );

  const { data: totalCount } = trpc.posts.count.useQuery(
    { category: slug, status: "active" },
    { enabled: !!catInfo }
  );

  const posts = data ?? [];
  const hasMore = totalCount !== undefined
    ? (page + 1) * PAGE_SIZE < totalCount
    : posts.length === PAGE_SIZE;
  const catName = catInfo ? t(locale, `categories.${catInfo.key}` as never) : "";

  if (!catInfo) return null;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-container-max-width">
        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-2 font-body text-sm text-on-surface-variant">
          <Link to="/" className="hover:text-on-surface">
            {t(locale, "postDetail.breadcrumbHome")}
          </Link>
          <span>/</span>
          <Link to="/browse" className="hover:text-on-surface">
            {t(locale, "postDetail.breadcrumbPosts")}
          </Link>
          <span>/</span>
          <span className="text-on-surface">{catName}</span>
        </nav>

        {/* SEO heading */}
        <div className="mb-6">
          <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
            {seo?.heading ?? catName}
          </h1>
          {seo?.description && (
            <p className="mt-2 max-w-2xl font-body text-base text-on-surface-variant">
              {seo.description}
            </p>
          )}
        </div>

        {/* Post grid */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PostCardSkeleton key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-body text-lg text-on-surface-variant">
              {t(locale, "browse.noResults")}
            </p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-accent-coral px-6 py-3 font-body text-sm font-medium text-on-surface hover:bg-accent-coral-hover"
            >
              <Plus className="h-4 w-4" />
              {t(locale, "myPosts.newPost")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map(({ post, profile, isBusiness, images }) => (
                <PostCard key={post.id} post={post} profile={profile} isBusiness={isBusiness} images={images} />
              ))}
            </div>

            {/* Pagination */}
            {(page > 0 || hasMore) && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 font-body text-sm font-medium disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t(locale, "browse.prev")}
                </button>
                <span className="font-mono text-sm text-on-surface-variant">{page + 1}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="flex items-center gap-1 rounded-xl border border-outline-variant px-4 py-2 font-body text-sm font-medium disabled:opacity-40"
                >
                  {t(locale, "browse.next")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="mt-8 rounded-2xl border border-outline-variant bg-surface-cream p-6 text-center">
          <p className="font-headline text-xl font-bold text-on-surface">
            {t(locale, "category.ctaHeading", { cat: catName.toLowerCase() })}
          </p>
          <p className="mt-1 font-body text-sm text-on-surface-variant">
            {t(locale, "category.ctaSubtitle")}
          </p>
          <Link
            to="/create"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-accent-coral px-6 py-3 font-body text-sm font-medium text-on-surface hover:bg-accent-coral-hover"
          >
            <Plus className="h-4 w-4" />
            {t(locale, "nav.createPost")}
          </Link>
        </div>
      </div>
    </div>
  );
}
