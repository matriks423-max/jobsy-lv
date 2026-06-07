import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import PostCard, { PostCardSkeleton } from "@/components/PostCard";
import TiltCard from "@/components/premium/TiltCard";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const PAGE_SIZE = 12;

type LocaleSEO = { heading: string; description: string };
type CategorySEO = { lv: LocaleSEO; ru: LocaleSEO; en: LocaleSEO };

const CATEGORY_SEO: Record<string, CategorySEO> = {
  household: {
    lv: { heading: "Mājsaimniecības darbi Latvijā", description: "Atrodi palīgus mājsaimniecībai — tīrīšanai, mazgāšanai, veļai un citiem ikdienas darbiem visā Latvijā." },
    ru: { heading: "Домашние работы в Латвии", description: "Найдите помощников для уборки, стирки, глажки и других домашних дел по всей Латвии." },
    en: { heading: "Household Services in Latvia", description: "Find helpers for cleaning, laundry, ironing and other household tasks across Latvia." },
  },
  moving: {
    lv: { heading: "Pārvākšanās palīdzība Latvijā", description: "Pieejami pārvākšanās pakalpojumi Rīgā un visā Latvijā. Kraušanas, transporta un iesaiņošanas palīgi." },
    ru: { heading: "Помощь с переездом в Латвии", description: "Услуги переезда в Риге и по всей Латвии. Грузчики, транспорт и упаковка." },
    en: { heading: "Moving Services in Latvia", description: "Moving help in Riga and across Latvia. Movers, transport and packing assistance." },
  },
  repairs: {
    lv: { heading: "Remontdarbi Latvijā", description: "Atrodi remontdarbniekus elektriskiem, santehnikas, apdares un citiem remontdarbiem Latvijā." },
    ru: { heading: "Ремонтные работы в Латвии", description: "Найдите мастеров по электрике, сантехнике, отделке и другим ремонтным работам в Латвии." },
    en: { heading: "Repair Services in Latvia", description: "Find handymen for electrical, plumbing, finishing and other repair work across Latvia." },
  },
  garden: {
    lv: { heading: "Dārza darbi Latvijā", description: "Dārznieki, zāles pļāvēji un dārza palīgi visā Latvijā. Atrodi palīgu savam dārzam." },
    ru: { heading: "Садовые работы в Латвии", description: "Садовники, стрижка газона и помощники по саду по всей Латвии." },
    en: { heading: "Garden Services in Latvia", description: "Gardeners, lawn mowers and garden helpers across Latvia. Find help for your garden." },
  },
  auto: {
    lv: { heading: "Auto pakalpojumi Latvijā", description: "Auto remonta, mazgāšanas un citi automobilu pakalpojumi Rīgā un visā Latvijā." },
    ru: { heading: "Автомобильные услуги в Латвии", description: "Ремонт, мойка и другие автомобильные услуги в Риге и по всей Латвии." },
    en: { heading: "Auto Services in Latvia", description: "Car repair, washing and other automotive services in Riga and across Latvia." },
  },
  childcare: {
    lv: { heading: "Bērnu pieskatīšana Latvijā", description: "Aukles un bērnu pieskatīšanas pakalpojumi visā Latvijā. Uzticami palīgi ģimenēm." },
    ru: { heading: "Уход за детьми в Латвии", description: "Няни и услуги по уходу за детьми по всей Латвии. Надёжные помощники для семей." },
    en: { heading: "Childcare Services in Latvia", description: "Babysitters and childcare services across Latvia. Trusted helpers for families." },
  },
  pets: {
    lv: { heading: "Mājdzīvnieku kopšana Latvijā", description: "Mājdzīvnieku pieskatīšana, pastaiga un kopšana Rīgā un visā Latvijā." },
    ru: { heading: "Уход за питомцами в Латвии", description: "Присмотр за животными, выгул и уход в Риге и по всей Латвии." },
    en: { heading: "Pet Care Services in Latvia", description: "Pet sitting, dog walking and grooming in Riga and across Latvia." },
  },
  it: {
    lv: { heading: "IT pakalpojumi Latvijā", description: "Datorspeciālisti, web izstrādātāji un IT atbalsts privātpersonām un uzņēmumiem Latvijā." },
    ru: { heading: "IT-услуги в Латвии", description: "Компьютерные специалисты, веб-разработчики и IT-поддержка для частных лиц и компаний в Латвии." },
    en: { heading: "IT Services in Latvia", description: "Computer specialists, web developers and IT support for individuals and businesses in Latvia." },
  },
  tutoring: {
    lv: { heading: "Repetīcijas un apmācība Latvijā", description: "Repetitori mācību priekšmetos, valodas un citas jomās bērniem un pieaugušajiem Latvijā." },
    ru: { heading: "Репетиторство и обучение в Латвии", description: "Репетиторы по учебным предметам, языкам и другим дисциплинам для детей и взрослых в Латвии." },
    en: { heading: "Tutoring & Lessons in Latvia", description: "Tutors for school subjects, languages and other disciplines for children and adults in Latvia." },
  },
  other: {
    lv: { heading: "Citi pakalpojumi Latvijā", description: "Dažādi palīdzības un pakalpojumu sludinājumi, kas neietilpst citās kategorijās." },
    ru: { heading: "Другие услуги в Латвии", description: "Разнообразные объявления о помощи и услугах, не вошедших в другие категории." },
    en: { heading: "Other Services in Latvia", description: "Various help and service listings that don't fit other categories." },
  },
};

export default function Category() {
  const { slug, city } = useParams<{ slug: string; city?: string }>();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [page, setPage] = useState(0);

  const catInfo = CATEGORIES.find((c) => c.key === slug);
  const cityKey = city && CITIES.includes(city as never) && city !== "other" ? city : undefined;
  const cityName = cityKey ? t(locale, `cities.${cityKey}` as never) : "";
  const seoLocale = (locale === "ru" || locale === "en") ? locale : "lv";
  const seo = slug ? CATEGORY_SEO[slug]?.[seoLocale] : undefined;
  const catName = catInfo ? t(locale, `categories.${catInfo.key}` as never) : "";
  // page heading: category, optionally scoped to a city ("Remontdarbi — Rīga")
  const heading = cityKey ? `${seo?.heading ?? catName} — ${cityName}` : (seo?.heading ?? catName);

  // Redirect unknown slugs / invalid city to a valid page
  useEffect(() => {
    if (!catInfo) navigate("/browse", { replace: true });
    else if (city && !cityKey) navigate(`/kategorija/${slug}`, { replace: true });
  }, [catInfo, city, cityKey, slug, navigate]);

  const { data, isLoading } = trpc.posts.list.useQuery(
    { category: slug, city: cityKey, status: "active", limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { enabled: !!catInfo }
  );

  const { data: totalCount } = trpc.posts.count.useQuery(
    { category: slug, city: cityKey, status: "active" },
    { enabled: !!catInfo }
  );

  const posts = data ?? [];
  const activeCount = totalCount ?? posts.length;
  // Thin-content / index-bloat safeguard: city-scoped pages stay noindex until
  // they hold enough real listings to be useful. They auto-index as supply grows.
  const noindex = !!cityKey && activeCount < 3;
  const hasMore = totalCount !== undefined
    ? (page + 1) * PAGE_SIZE < totalCount
    : posts.length === PAGE_SIZE;

  // Set document title + meta + robots for SEO
  useEffect(() => {
    if (!catName) return;
    const prev = document.title;
    document.title = `${heading} — jobsy.lv`;
    const ensure = (sel: string, make: () => HTMLMetaElement) => {
      let el = document.querySelector<HTMLMetaElement>(sel);
      const created = !el;
      if (!el) { el = make(); document.head.appendChild(el); }
      return { el, created };
    };
    const descText = cityKey
      ? `${catName} ${cityName}. ${seo?.description ?? ""}`.trim()
      : (seo?.description ?? `${catName} — jobsy.lv`);
    const d = ensure('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }));
    d.el.content = descText;
    const r = ensure('meta[name="robots"]', () => Object.assign(document.createElement("meta"), { name: "robots" }));
    r.el.content = noindex ? "noindex, follow" : "index, follow";
    return () => {
      document.title = prev;
      if (d.created) d.el.remove(); else d.el.content = "";
      if (r.created) r.el.remove(); else r.el.content = "index, follow";
    };
  }, [catName, cityName, cityKey, heading, seo, noindex]);

  if (!catInfo) return null;

  return (
    <div className="min-h-screen bg-surface-off-white px-margin-mobile py-10 md:px-margin-desktop md:py-14">
      <div className="mx-auto max-w-container-max-width">
        {/* Breadcrumb */}
        <nav className="mb-3 flex flex-wrap items-center gap-2 font-body text-sm text-on-surface-variant">
          <Link to="/" className="hover:text-on-surface">
            {t(locale, "postDetail.breadcrumbHome")}
          </Link>
          <span>/</span>
          <Link to="/browse" className="hover:text-on-surface">
            {t(locale, "postDetail.breadcrumbPosts")}
          </Link>
          <span>/</span>
          {cityKey ? (
            <>
              <Link to={`/kategorija/${slug}`} className="hover:text-on-surface">{catName}</Link>
              <span>/</span>
              <span className="text-on-surface">{cityName}</span>
            </>
          ) : (
            <span className="text-on-surface">{catName}</span>
          )}
        </nav>

        {/* SEO heading */}
        <div className="mb-6">
          <h1 className="font-headline text-3xl font-bold text-on-surface md:text-4xl">
            {heading}
          </h1>
          {seo?.description && (
            <p className="mt-2 max-w-2xl font-body text-base text-on-surface-variant">
              {seo.description}
            </p>
          )}
        </div>

        {/* City links — internal linking + programmatic landing pages */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            to={`/kategorija/${slug}`}
            className={`rounded-lg border px-3 py-1.5 font-label text-label-sm transition ${
              !cityKey
                ? "border-primary bg-primary text-white"
                : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {t(locale, "browse.city")}
          </Link>
          {CITIES.filter((cc) => cc !== "other").map((cc) => (
            <Link
              key={cc}
              to={`/kategorija/${slug}/${cc}`}
              className={`rounded-lg border px-3 py-1.5 font-label text-label-sm transition ${
                cityKey === cc
                  ? "border-primary bg-primary text-white"
                  : "border-outline-variant bg-white text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {t(locale, `cities.${cc}` as never)}
            </Link>
          ))}
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
                <TiltCard key={post.id} className="rounded-2xl" max={5}>
                  <PostCard post={post} profile={profile} isBusiness={isBusiness} images={images} />
                </TiltCard>
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
