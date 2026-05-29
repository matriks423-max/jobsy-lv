import React from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES } from "@/lib/categories";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import PostCard, { PostCardSkeleton } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  LayoutList,
  Map,
  Bell,
  Check,
  SlidersHorizontal,
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
import JobMap from "@/components/JobMap";

const PAGE_SIZE = 12;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};

interface FilterPanelProps {
  locale: string;
  search: string;
  setSearch: (v: string) => void;
  type: "all" | "need" | "offer";
  setType: (v: "all" | "need" | "offer") => void;
  category: string;
  setCategory: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  sort: "newest" | "oldest" | "budget_asc" | "budget_desc";
  setSort: (v: "newest" | "oldest" | "budget_asc" | "budget_desc") => void;
  setPage: (v: number) => void;
  activeFiltersCount: number;
  isAuthenticated: boolean;
  clearFilters: () => void;
  handleOpenSaveAlert: () => void;
  onClose?: () => void;
}

function FilterPanel({
  locale, search, setSearch, type, setType, category, setCategory,
  city, setCity, sort, setSort, setPage, activeFiltersCount, isAuthenticated,
  clearFilters, handleOpenSaveAlert, onClose,
}: FilterPanelProps) {
  return (
    <div className="space-y-6">
      {/* Search */}
      <div>
        <label className="mb-2 block font-label text-label-sm text-on-surface-variant">
          {t(locale, "browse.searchPlaceholder")}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline" />
          <input
            id="browse-search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder={t(locale, "browse.searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-outline-variant bg-white pl-9 pr-3 font-body text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
          />
        </div>
      </div>

      {/* Type */}
      <div>
        <label className="mb-2 block font-label text-label-sm text-on-surface-variant">
          {t(locale, "browse.typeAll")}
        </label>
        <div className="flex gap-2">
          {(["all", "need", "offer"] as const).map((tVal) => (
            <button
              key={tVal}
              onClick={() => { setType(tVal); setPage(0); onClose?.(); }}
              className={`flex-1 rounded-lg py-2 font-label text-label-sm transition-colors duration-150 ${
                type === tVal
                  ? "bg-primary text-white"
                  : "border border-outline-variant bg-surface-off-white text-on-surface-variant hover:border-primary hover:text-primary"
              }`}
            >
              {tVal === "all" ? t(locale, "browse.typeAll") : tVal === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </button>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div>
        <label className="mb-2 block font-label text-label-sm text-on-surface-variant">
          {t(locale, "browse.category")}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => { setCategory("all"); setPage(0); }}
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-label text-label-sm transition-colors duration-150 ${
              category === "all"
                ? "bg-primary text-white"
                : "border border-outline-variant bg-surface-off-white text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            <MoreHorizontal className="h-3.5 w-3.5 shrink-0" />
            {t(locale, "browse.category")}
          </button>
          {CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] ?? MoreHorizontal;
            return (
              <button
                key={cat.key}
                onClick={() => { setCategory(cat.key); setPage(0); onClose?.(); }}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-label text-label-sm transition-colors duration-150 ${
                  category === cat.key
                    ? "bg-primary text-white"
                    : "border border-outline-variant bg-surface-off-white text-on-surface-variant hover:border-primary hover:text-primary"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t(locale, `categories.${cat.key}` as never)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* City */}
      <div>
        <label className="mb-2 block font-label text-label-sm text-on-surface-variant">
          {t(locale, "browse.city")}
        </label>
        <Select value={city} onValueChange={(v) => { setCity(v); setPage(0); }}>
          <SelectTrigger className="w-full rounded-lg border border-outline-variant bg-surface-off-white font-body text-body-sm">
            <MapPin className="mr-2 h-4 w-4 text-outline" />
            <SelectValue placeholder={t(locale, "browse.city")} />
          </SelectTrigger>
          <SelectContent className="border border-outline-variant">
            <SelectItem value="all">{t(locale, "browse.city")}</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>{t(locale, `cities.${c}` as never)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sort */}
      <div>
        <label className="mb-2 block font-label text-label-sm text-on-surface-variant">
          {t(locale, "browse.sort")}
        </label>
        <Select value={sort} onValueChange={(v) => { setSort(v as typeof sort); setPage(0); }}>
          <SelectTrigger className="w-full rounded-lg border border-outline-variant bg-surface-off-white font-body text-body-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border border-outline-variant">
            <SelectItem value="newest">{t(locale, "browse.sortNewest")}</SelectItem>
            <SelectItem value="oldest">{t(locale, "browse.sortOldest")}</SelectItem>
            <SelectItem value="budget_asc">{t(locale, "browse.sortBudgetAsc")}</SelectItem>
            <SelectItem value="budget_desc">{t(locale, "browse.sortBudgetDesc")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Save search */}
      {activeFiltersCount > 0 && isAuthenticated && (
        <button
          onClick={handleOpenSaveAlert}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-surface-cream px-3 py-2 font-label text-label-sm text-on-surface transition-colors hover:border-primary hover:text-primary"
        >
          <Bell className="h-3.5 w-3.5" />
          {t(locale, "browse.saveAlert")}
        </button>
      )}

      {/* Clear */}
      {activeFiltersCount > 0 && (
        <button
          onClick={() => { clearFilters(); onClose?.(); }}
          className="flex w-full items-center justify-center gap-1 font-label text-label-sm text-accent-coral hover:text-accent-coral-hover"
        >
          <X className="h-4 w-4" />
          {t(locale, "browse.clear")}
        </button>
      )}
    </div>
  );
}

export default function Browse() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debouncedSearch = useDebounce(search, 400);

  const [type, setType] = useState<"all" | "need" | "offer">(
    (searchParams.get("type") as never) ?? "all"
  );
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [city, setCity] = useState(searchParams.get("city") ?? "all");
  const [sort, setSort] = useState<"newest" | "oldest" | "budget_asc" | "budget_desc">(
    (searchParams.get("sort") as never) ?? "newest"
  );
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "0"));
  const [viewMode, setViewMode] = useState<"list" | "map">(
    searchParams.get("search") ? "list" : "map"
  );
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [alertLabel, setAlertLabel] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const listInput = {
    type: type === "all" ? undefined : type,
    category: category === "all" ? undefined : category,
    city: city === "all" ? undefined : city,
    sort,
    status: "active",
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  } as const;

  const { data, isLoading } = trpc.posts.list.useQuery(listInput, { staleTime: 30 * 1000 });
  const { data: featuredData } = trpc.posts.featuredPosts.useQuery(undefined, { staleTime: 60 * 1000 });
  const featuredPosts = featuredData ?? [];

  const { data: totalCount } = trpc.posts.count.useQuery({
    type: listInput.type,
    category: listInput.category,
    city: listInput.city,
    status: listInput.status,
    search: listInput.search,
  }, { staleTime: 30 * 1000 });

  useEffect(() => {
    const prev = document.title;
    document.title = debouncedSearch
      ? `"${debouncedSearch}" — jobsy.lv`
      : t(locale, "browse.title") + " — jobsy.lv";

    const desc = locale === "lv"
      ? "Atrodi pakalpojumu sniedzējus vai piedāvā savas prasmes Latvijā."
      : locale === "ru"
      ? "Найдите поставщиков услуг или предложите свои навыки в Латвии."
      : "Find service providers or offer your skills in Latvia.";
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const created = !metaDesc;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = desc;
    return () => {
      document.title = prev;
      if (created && metaDesc) document.head.removeChild(metaDesc);
    };
  }, [locale, debouncedSearch]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (type !== "all") params.set("type", type);
    if (category !== "all") params.set("category", category);
    if (city !== "all") params.set("city", city);
    if (sort !== "newest") params.set("sort", sort);
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (page > 0) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [type, category, city, sort, debouncedSearch, page]);

  useEffect(() => {
    if (page > 0) window.scrollTo({ top: 280, behavior: "smooth" });
  }, [page]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("browse-search")?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const clearFilters = () => {
    setType("all"); setCategory("all"); setCity("all");
    setSort("newest"); setSearch(""); setPage(0);
  };

  const activeFiltersCount =
    (type !== "all" ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (city !== "all" ? 1 : 0) +
    (debouncedSearch ? 1 : 0);

  const saveSearchMutation = trpc.savedSearches.save.useMutation({
    onSuccess: () => { toast(t(locale, "browse.alertSaved"), "success"); setShowSaveAlert(false); setAlertLabel(""); },
    onError: (err) => toast(err.message, "error"),
  });

  const buildAutoLabel = () => {
    const parts: string[] = [];
    if (type !== "all") parts.push(type === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer"));
    if (category !== "all") parts.push(t(locale, `categories.${category}` as never));
    if (city !== "all") parts.push(t(locale, `cities.${city}` as never));
    if (debouncedSearch) parts.push(`"${debouncedSearch}"`);
    return parts.join(" � ") || t(locale, "browse.title");
  };

  const handleOpenSaveAlert = () => {
    if (!isAuthenticated) { navigate("/login"); return; }
    setAlertLabel(buildAutoLabel());
    setShowSaveAlert(true);
  };

  const posts = data ?? [];
  const hasMore = totalCount !== undefined
    ? (page + 1) * PAGE_SIZE < totalCount
    : posts.length === PAGE_SIZE;

  const filterPanelProps = {
    locale, search, setSearch, type, setType, category, setCategory,
    city, setCity, sort, setSort, setPage, activeFiltersCount, isAuthenticated,
    clearFilters, handleOpenSaveAlert,
  };

  return (
    <div className="min-h-screen bg-surface-off-white">
      <div className="mx-auto max-w-container-max-width px-margin-mobile py-8 md:px-margin-desktop">

        {/* Top bar */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-headline text-headline-md font-bold text-on-surface">
              {debouncedSearch ? `"${debouncedSearch}"` : t(locale, "browse.title")}
            </h1>
            <p className="mt-1 font-body text-body-sm text-on-surface-variant">
              {totalCount !== undefined
                ? t(locale, "browse.showing", { count: totalCount })
                : t(locale, "browse.showing", { count: posts.length })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mobile filter button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 font-label text-label-sm shadow-card md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-on-surface-variant" />
              {t(locale, "browse.filters")}
              {activeFiltersCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 font-label text-label-sm text-white">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex overflow-hidden rounded-lg border border-outline-variant bg-white shadow-card">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-2 font-label text-label-sm transition-colors duration-150 ${
                  viewMode === "map"
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, "browse.viewMap")}</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-2 font-label text-label-sm transition-colors duration-150 ${
                  viewMode === "list"
                    ? "bg-primary text-white"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, "browse.viewList")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active filter pills (mobile) */}
        {activeFiltersCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 md:hidden">
            {type !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-3 py-1 font-label text-label-sm text-on-surface">
                {type === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
                <button onClick={() => setType("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {category !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-3 py-1 font-label text-label-sm text-on-surface">
                {t(locale, `categories.${category}` as never)}
                <button onClick={() => setCategory("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {city !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-3 py-1 font-label text-label-sm text-on-surface">
                {t(locale, `cities.${city}` as never)}
                <button onClick={() => setCity("all")}><X className="h-3 w-3" /></button>
              </span>
            )}
            {debouncedSearch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-cream px-3 py-1 font-label text-label-sm text-on-surface">
                "{debouncedSearch}"
                <button onClick={() => setSearch("")}><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Save alert inline form */}
        {showSaveAlert && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-outline-variant bg-surface-cream p-4">
            <Bell className="h-4 w-4 shrink-0 text-primary" />
            <Input
              value={alertLabel}
              onChange={(e) => setAlertLabel(e.target.value)}
              placeholder={t(locale, "browse.alertLabelPlaceholder")}
              className="h-9 flex-1 min-w-[180px] rounded-lg border border-outline-variant bg-white px-3 font-body text-body-sm focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => saveSearchMutation.mutate({
                label: alertLabel || buildAutoLabel(),
                type: type === "all" ? "need" : type,
                category: category === "all" ? undefined : category,
                city: city === "all" ? undefined : city,
                keyword: debouncedSearch || undefined,
              })}
              disabled={saveSearchMutation.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 font-label text-label-sm text-white transition-colors hover:bg-on-primary-fixed-variant"
            >
              <Check className="h-3.5 w-3.5" />
              {t(locale, "browse.alertConfirm")}
            </button>
            <button onClick={() => setShowSaveAlert(false)} className="text-on-surface-variant hover:text-on-surface">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-[260px] shrink-0 md:block">
            <div className="sticky top-24 rounded-2xl bg-white p-5 shadow-card">
              <FilterPanel {...filterPanelProps} />
            </div>
          </aside>

          {/* Content area */}
          <div className="min-w-0 flex-1">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 font-headline text-headline-sm font-semibold text-on-surface">
                  {t(locale, "browse.featured")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredPosts.map(({ post, profile, isBusiness, images }) => (
                    <PostCard key={`featured-${post.id}`} post={post} profile={profile} isBusiness={isBusiness} images={images} />
                  ))}
                </div>
                <div className="mt-6 border-b border-outline-variant" />
              </div>
            )}

            {/* Results */}
            {viewMode === "list" ? (
              <>
                {isLoading ? (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => <PostCardSkeleton key={i} />)}
                  </div>
                ) : posts.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-cream text-2xl">
                      ??
                    </div>
                    <p className="font-headline text-headline-sm font-semibold text-on-surface">
                      {t(locale, "browse.noResults")}
                    </p>
                    {debouncedSearch && (
                      <p className="font-mono text-body-sm text-on-surface-variant">"{debouncedSearch}"</p>
                    )}
                    <p className="mt-2 font-body text-body-sm text-on-surface-variant">
                      {t(locale, "browse.noResultsSub")}
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 rounded-lg border border-outline-variant bg-white px-4 py-2 font-label text-label-sm text-on-surface shadow-card transition-all hover:border-primary hover:text-primary"
                    >
                      {t(locale, "browse.clear")}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {posts.map(({ post, profile, isBusiness, images }) => (
                      <PostCard key={post.id} post={post} profile={profile} isBusiness={isBusiness} images={images} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {(page > 0 || hasMore) && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-4 py-2 font-label text-label-sm text-on-surface shadow-card transition-all disabled:opacity-40 hover:border-primary hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      {t(locale, "browse.prev")}
                    </button>
                    <span className="font-label text-label-sm text-on-surface-variant">{page + 1}</span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!hasMore}
                      className="flex items-center gap-1 rounded-lg border border-outline-variant bg-white px-4 py-2 font-label text-label-sm text-on-surface shadow-card transition-all disabled:opacity-40 hover:border-primary hover:text-primary"
                    >
                      {t(locale, "browse.next")}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="mb-6">
                {isLoading ? (
                  <Skeleton className="h-[520px] rounded-2xl" />
                ) : (
                  <JobMap posts={posts} />
                )}
                <p className="mt-3 font-body text-body-sm text-on-surface-variant">
                  {t(locale, "browse.mapShowing", { count: posts.filter(({ post }) => post.city && post.city !== "other").length })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => navigate("/create")}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-label text-label-sm font-bold text-white shadow-float transition-all hover:-translate-y-0.5 active:scale-95 md:hidden"
      >
        <Plus className="h-4 w-4" />
        {t(locale, "nav.createPost")}
      </button>

      {/* Mobile filter Sheet */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl border-t border-outline-variant bg-surface-off-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <SheetTitle className="font-headline text-headline-sm font-semibold text-on-surface">
              {t(locale, "browse.filters")}
            </SheetTitle>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant hover:text-on-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <FilterPanel {...filterPanelProps} onClose={() => setShowMobileFilters(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
