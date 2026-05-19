import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PostCard from "@/components/PostCard";
import type { PostWithProfile } from "@/types/post";
import {
  Search,
  X,
  SlidersHorizontal,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

const PAGE_SIZE = 12;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function Browse() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebounce(search, 400);

  const [type, setType] = useState<"all" | "need" | "offer">(
    (searchParams.get("type") as never) ?? "all"
  );
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [city, setCity] = useState(searchParams.get("city") ?? "all");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));

  const { data, isLoading } = trpc.posts.list.useQuery({
    type: type === "all" ? undefined : type,
    category: category === "all" ? undefined : category,
    city: city === "all" ? undefined : city,
    status: "active",
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (category !== "all") params.set("category", category);
    if (city !== "all") params.set("city", city);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [type, category, city, debouncedSearch, page]);

  const clearFilters = () => {
    setType("all");
    setCategory("all");
    setCity("all");
    setSearch("");
    setPage(0);
  };

  const activeFiltersCount =
    (type !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (city !== "all" ? 1 : 0) +
    (debouncedSearch ? 1 : 0);

  const posts = data ?? [];
  const hasMore = posts.length === PAGE_SIZE;

  return (
    <div className="min-h-screen px-4 py-8 noise-bg">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-4 font-display text-3xl font-bold text-ink md:text-4xl">
            {t(locale, "browse.title")}
          </h1>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={t(locale, "browse.searchPlaceholder")}
              className="h-12 rounded-xl border-2 border-ink bg-white pl-12 font-body text-base focus:border-coral"
            />
          </div>
          <p className="mt-2 font-body text-sm text-ink-muted">
            {t(locale, "browse.showing", { count: posts.length })}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {(["all", "need", "offer"] as const).map((tVal) => (
              <button
                key={tVal}
                onClick={() => { setType(tVal); setPage(0); }}
                className={`rounded-full border-2 px-4 py-2 font-body text-sm font-medium transition ${
                  type === tVal
                    ? "border-ink bg-coral text-ink"
                    : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {tVal === "all" ? t(locale, "browse.typeAll") : tVal === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
              </button>
            ))}
          </div>

          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
            <SelectTrigger className="w-[180px] rounded-xl border-2 border-ink bg-white font-body">
              <SelectValue placeholder={t(locale, "browse.category")} />
            </SelectTrigger>
            <SelectContent className="border-2 border-ink">
              <SelectItem value="all">{t(locale, "browse.category")}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {t(locale, `categories.${c.key}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={city} onValueChange={(v) => { setCity(v); setPage(0); }}>
            <SelectTrigger className="w-[160px] rounded-xl border-2 border-ink bg-white font-body">
              <MapPin className="mr-2 h-4 w-4" />
              <SelectValue placeholder={t(locale, "browse.city")} />
            </SelectTrigger>
            <SelectContent className="border-2 border-ink">
              <SelectItem value="all">{t(locale, "browse.city")}</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {t(locale, `cities.${c}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 font-body text-sm text-coral hover:text-coral-hover">
              <X className="h-4 w-4" />
              {t(locale, "browse.clear")}
            </button>
          )}
        </div>

        {/* Active filter pills */}
        {activeFiltersCount > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {type !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-coral-light px-3 py-1 font-body text-xs font-medium text-ink">
                {type === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
                <button onClick={() => setType("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {category !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-mustard-light px-3 py-1 font-body text-xs font-medium text-ink">
                {t(locale, `categories.${category}` as never)}
                <button onClick={() => setCategory("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {city !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-sage-light px-3 py-1 font-body text-xs font-medium text-ink">
                {t(locale, `cities.${city}` as never)}
                <button onClick={() => setCity("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-cream px-3 py-1 font-body text-xs font-medium text-ink">
                "{debouncedSearch}"
                <button onClick={() => setSearch("")}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 animate-pulse-skeleton rounded-2xl border-2 border-ink bg-cream-dark" />
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((item: PostWithProfile) => (
                <PostCard key={item.post.id} post={item.post} profile={item.profile} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-xl border-2 border-ink bg-white px-4 py-2 font-body text-sm font-medium text-ink disabled:opacity-40 hover:bg-cream-dark"
              >
                <ChevronLeft className="h-4 w-4" />
                Iepriekšējie
              </button>
              <span className="font-body text-sm text-ink-muted">
                Lapa {page + 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 rounded-xl border-2 border-ink bg-white px-4 py-2 font-body text-sm font-medium text-ink disabled:opacity-40 hover:bg-cream-dark"
              >
                Nākamie
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-20">
            <SlidersHorizontal className="mb-4 h-12 w-12 text-ink-light" />
            <p className="font-body text-lg text-ink-muted">{t(locale, "browse.empty")}</p>
            <Button onClick={clearFilters} variant="outline" className="mt-4 rounded-xl border-2 border-ink">
              {t(locale, "browse.clear")}
            </Button>
          </div>
        )}

        {/* Mobile FAB — Post a Job */}
        <button
          onClick={() => navigate("/create")}
          className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-ink bg-coral px-4 py-3 font-body text-sm font-medium text-ink shadow-card-coral transition hover:-translate-y-0.5 hover:bg-coral-hover md:hidden"
        >
          <Plus className="h-4 w-4" />
          {t(locale, "nav.createPost")}
        </button>
      </div>
    </div>
  );
}
