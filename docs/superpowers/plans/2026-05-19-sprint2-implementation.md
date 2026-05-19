# Sprint 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship map view (Leaflet), JSON-LD schema, mobile FAB, real stats, marquee i18n fix, post status (filled/open), view count display, and email notifications (Resend).

**Architecture:** Four independent sprints — A (quick wins/SEO), B (map view), C (post status + view display), D (email). All share a single schema push at the end of Sprint C. Sprints A and B have zero schema changes.

**Tech Stack:** React 19 + Vite + tRPC frontend, Hono + DrizzleORM + MySQL backend, Leaflet.js + react-leaflet (no API key), Resend (email), Railway hosting.

---

## Pre-flight: read these before starting

- Schema: `db/schema.ts` — posts table already has `viewCount`, needs `filled` + `reminderSent`
- Posts query: `api/queries/posts.ts` — `incrementViewCount` already exists and is called in `getById`
- Stats router: `api/stats-router.ts` — has hardcoded `cities: 8, categories: 10`
- Categories: `src/lib/categories.ts` — 10 category keys, 8 city keys (riga, daugavpils, liepaja, jelgava, rezekne, ventspils, jurmala, other)
- Browse: `src/pages/Browse.tsx` — uses `trpc.posts.list` with filters, renders `<PostCard>` grid
- Home marquee: `src/pages/Home.tsx:22-33` — `CATEGORIES_LV` hardcoded Latvian array

---

## Sprint A — Quick Wins

### Task A1: Fix homepage stats (remove hardcoded 8/10)

**Files:**
- Modify: `api/stats-router.ts`
- Modify: `src/pages/Home.tsx`
- Modify: `api/queries/posts.ts`

- [ ] **Step 1: Add countUsers query to `api/queries/posts.ts`**

Add after `countPostsByType`:

```typescript
export async function countUsers() {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);
  return result[0]?.count ?? 0;
}

export async function countCategories() {
  const result = await getDb()
    .select({ count: sql<number>`count(distinct ${schema.posts.category})` })
    .from(schema.posts)
    .where(eq(schema.posts.status, "active"));
  return result[0]?.count ?? 0;
}
```

- [ ] **Step 2: Update `api/stats-router.ts`**

```typescript
import { createRouter, publicQuery } from "./middleware";
import { countActivePosts, countPostsByType, countUsers, countCategories } from "./queries/posts";

export const statsRouter = createRouter({
  get: publicQuery.query(async () => {
    const [activePosts, needPosts, offerPosts, users, categories] = await Promise.all([
      countActivePosts(),
      countPostsByType("need"),
      countPostsByType("offer"),
      countUsers(),
      countCategories(),
    ]);
    return { activePosts, needPosts, offerPosts, users, categories };
  }),
});
```

- [ ] **Step 3: Update Home.tsx stats array (lines ~144–155)**

Replace the stats array in `Home.tsx`:

```tsx
{[
  { value: stats?.activePosts ?? 0, label: t(locale, "hero.statsActive") },
  { value: stats?.users ?? 0, label: t(locale, "hero.statsUsers") },
  { value: stats?.categories ?? 0, label: t(locale, "hero.statsCategories") },
].map((stat, i) => ( ... ))}
```

Also add `"hero.statsUsers"` i18n key in `src/lib/i18n.ts`:
- LV: `"Reģistrēti lietotāji"`
- RU: `"Зарегистрированных пользователей"`
- EN: `"Registered users"`

Remove `"hero.statsCities"` and `"hero.statsHelpers"` from display (keep keys in i18n to avoid TS errors).

- [ ] **Step 4: Verify in browser**

Start dev server (`npm run dev`). Open homepage. Stats section should show live numbers, not 0/0/8/10.

- [ ] **Step 5: Commit**

```bash
git add api/stats-router.ts api/queries/posts.ts src/pages/Home.tsx src/lib/i18n.ts
git commit -m "fix: replace hardcoded homepage stats with real DB counts"
```

---

### Task A2: Fix marquee to use i18n locale

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Replace `CATEGORIES_LV` constant and `MarqueeStrip` component**

Delete lines 22–33 (`const CATEGORIES_LV = [...]`).

Replace the `MarqueeStrip` component:

```tsx
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
```

Add `CATEGORIES` import at top of file (if not already present):
```tsx
import { CATEGORIES } from "@/lib/categories";
```

- [ ] **Step 2: Verify**

Switch language (LV→RU→EN) on homepage. Marquee text should change language.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "fix: marquee now respects selected locale"
```

---

### Task A3: JSON-LD JobPosting schema on PostDetail

**Files:**
- Modify: `src/pages/PostDetail.tsx`

- [ ] **Step 1: Add JSON-LD injection after existing imports in PostDetail.tsx**

Add a `useEffect` inside the `PostDetail` component, after the existing query hooks:

```tsx
// JSON-LD structured data for Google Jobs
useEffect(() => {
  if (!data?.post) return;
  const post = data.post;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "job-posting-schema";
  script.text = JSON.stringify({
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: post.title,
    description: (post.description ?? "").slice(0, 500),
    datePosted: new Date(post.createdAt).toISOString().split("T")[0],
    validThrough: post.expiresAt
      ? new Date(post.expiresAt).toISOString().split("T")[0]
      : undefined,
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: post.city ?? "Latvija",
        addressCountry: "LV",
      },
    },
  });
  document.head.appendChild(script);
  return () => {
    const existing = document.getElementById("job-posting-schema");
    if (existing) document.head.removeChild(existing);
  };
}, [data?.post]);
```

- [ ] **Step 2: Add per-page document.title**

Add another `useEffect` in the same component:

```tsx
useEffect(() => {
  if (!data?.post) return;
  const prev = document.title;
  document.title = `${data.post.title} — jobsy.lv`;
  return () => { document.title = prev; };
}, [data?.post]);
```

- [ ] **Step 3: Verify**

Open any post detail page. Open DevTools → Elements → `<head>`. Confirm `<script type="application/ld+json">` is present with correct data. Confirm page `<title>` matches post title.

- [ ] **Step 4: Commit**

```bash
git add src/pages/PostDetail.tsx
git commit -m "feat: add JSON-LD JobPosting schema and per-page title on PostDetail"
```

---

### Task A4: Mobile "Post a Job" FAB on Browse

**Files:**
- Modify: `src/pages/Browse.tsx`

- [ ] **Step 1: Add FAB at end of Browse component JSX, before closing `</div>`**

Add `useNavigate` to imports if not already present: `import { useSearchParams, useNavigate } from "react-router";`

Add `Plus` to lucide imports.

Add the FAB just before the final closing `</div>` of the outer container:

```tsx
{/* Mobile FAB — Post a Job */}
<button
  onClick={() => navigate("/create")}
  className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-ink bg-coral px-4 py-3 font-body text-sm font-medium text-ink shadow-card-coral transition hover:-translate-y-0.5 hover:bg-coral-hover md:hidden"
>
  <Plus className="h-4 w-4" />
  {t(locale, "nav.createPost")}
</button>
```

- [ ] **Step 2: Verify**

Resize browser to mobile width (< 768px). Browse page should show the coral FAB pinned above the back-to-top button. On desktop it should be hidden.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Browse.tsx
git commit -m "feat: add mobile FAB for posting a job on Browse page"
```

---

## Sprint B — Map View

### Task B1: Install Leaflet and create city coordinate lookup

**Files:**
- Create: `src/lib/lv-cities.ts`
- Modify: `src/index.css`

- [ ] **Step 1: Install dependencies**

```bash
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

- [ ] **Step 2: Import Leaflet CSS in `src/index.css`**

Add at the top of `src/index.css` (before existing styles):

```css
@import "leaflet/dist/leaflet.css";
```

- [ ] **Step 3: Create `src/lib/lv-cities.ts`**

```typescript
// Coordinates for cities available in jobsy.lv posts
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  riga: { lat: 56.946, lng: 24.106 },
  daugavpils: { lat: 55.875, lng: 26.536 },
  liepaja: { lat: 56.505, lng: 21.011 },
  jelgava: { lat: 56.651, lng: 23.722 },
  rezekne: { lat: 56.509, lng: 27.332 },
  ventspils: { lat: 57.394, lng: 21.563 },
  jurmala: { lat: 56.968, lng: 23.770 },
  // "other" → geographic centre of Latvia
  other: { lat: 56.880, lng: 24.603 },
};

export function getCityCoords(city: string | null | undefined): { lat: number; lng: number } | null {
  if (!city) return null;
  return CITY_COORDS[city.toLowerCase().trim()] ?? null;
}
```

- [ ] **Step 4: Verify build compiles**

```bash
npm run build
```

Expected: no errors. Leaflet CSS included in bundle.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lv-cities.ts src/index.css package.json package-lock.json
git commit -m "feat: install react-leaflet and add Latvia city coordinate lookup"
```

---

### Task B2: Create JobMap component

**Files:**
- Create: `src/components/JobMap.tsx`

- [ ] **Step 1: Create `src/components/JobMap.tsx`**

```tsx
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "react-router";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getCityCoords } from "@/lib/lv-cities";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import type { Post, Profile } from "@db/schema";

// Fix Leaflet's broken default icon paths in Vite
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface JobMapProps {
  posts: Array<{ post: Post; profile?: Profile | null }>;
}

export default function JobMap({ posts }: JobMapProps) {
  const { locale } = useLocale();

  const mappable = posts.filter(({ post }) => getCityCoords(post.city) !== null);

  return (
    <MapContainer
      center={[56.88, 24.6]}
      zoom={7}
      className="h-[380px] w-full rounded-2xl border-2 border-ink md:h-[520px]"
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappable.map(({ post }) => {
        const coords = getCityCoords(post.city)!;
        const category = CATEGORIES.find((c) => c.key === post.category);
        return (
          <Marker key={post.id} position={[coords.lat, coords.lng]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                  {category ? t(locale, `categories.${category.key}` as never) : post.category}
                </p>
                <p className="mb-2 font-bold text-gray-900 leading-snug">{post.title}</p>
                <Link
                  to={`/post/${post.id}`}
                  className="inline-block rounded bg-orange-400 px-3 py-1 text-xs font-medium text-white hover:bg-orange-500"
                >
                  {t(locale, "browse.viewPost")} →
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Add `browse.viewPost` i18n key to `src/lib/i18n.ts`**

Add in all 3 locales under the `browse` section:
- LV: `viewPost: "Skatīt"`
- RU: `viewPost: "Смотреть"`
- EN: `viewPost: "View"`

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build
```

Expected: no TS errors. If "Cannot find module 'leaflet/dist/images/marker-icon.png'", add to `vite.config.ts`:
```typescript
// No change needed — Vite handles PNG imports natively
```

- [ ] **Step 4: Commit**

```bash
git add src/components/JobMap.tsx src/lib/i18n.ts
git commit -m "feat: add JobMap component with Leaflet pins for Latvia cities"
```

---

### Task B3: Add List/Map toggle to Browse page

**Files:**
- Modify: `src/pages/Browse.tsx`

- [ ] **Step 1: Add imports to Browse.tsx**

```tsx
import { LayoutList, Map } from "lucide-react";
import JobMap from "@/components/JobMap";
```

- [ ] **Step 2: Add `viewMode` state after existing state declarations**

```tsx
const [viewMode, setViewMode] = useState<"list" | "map">("list");
```

- [ ] **Step 3: Add the toggle buttons to the header section**

Find the `<h1>` in Browse.tsx. Change the header block to add a flex row with title + toggle:

```tsx
{/* Header */}
<div className="mb-8">
  <div className="mb-4 flex items-center justify-between">
    <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
      {t(locale, "browse.title")}
    </h1>
    {/* List / Map toggle */}
    <div className="flex rounded-xl border-2 border-ink overflow-hidden">
      <button
        onClick={() => setViewMode("list")}
        className={`flex items-center gap-1.5 px-3 py-2 font-body text-sm font-medium transition ${
          viewMode === "list" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"
        }`}
      >
        <LayoutList className="h-4 w-4" />
        <span className="hidden sm:inline">{t(locale, "browse.viewList")}</span>
      </button>
      <button
        onClick={() => setViewMode("map")}
        className={`flex items-center gap-1.5 px-3 py-2 font-body text-sm font-medium transition ${
          viewMode === "map" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"
        }`}
      >
        <Map className="h-4 w-4" />
        <span className="hidden sm:inline">{t(locale, "browse.viewMap")}</span>
      </button>
    </div>
  </div>
  {/* search input and count — unchanged */}
```

- [ ] **Step 4: Add i18n keys to `src/lib/i18n.ts`**

Under the `browse` section, add in all 3 locales:
- LV: `viewList: "Saraksts"`, `viewMap: "Karte"`
- RU: `viewList: "Список"`, `viewMap: "Карта"`
- EN: `viewList: "List"`, `viewMap: "Map"`

- [ ] **Step 5: Replace the results section with conditional rendering**

Find the `{/* Results */}` comment in Browse.tsx. Replace everything from `{isLoading ? (` to the end of the results block with:

```tsx
{/* Results */}
{viewMode === "list" ? (
  <>
    {isLoading ? (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border-2 border-ink bg-white" />
        ))}
      </div>
    ) : posts.length === 0 ? (
      <div className="py-20 text-center">
        <p className="font-body text-lg text-ink-muted">{t(locale, "browse.noResults")}</p>
        <button onClick={clearFilters} className="mt-4 font-body text-sm text-coral hover:underline">
          {t(locale, "browse.clear")}
        </button>
      </div>
    ) : (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map(({ post, profile }) => (
          <PostCard key={post.id} post={post} profile={profile} />
        ))}
      </div>
    )}
    {/* Pagination */}
    {(page > 0 || hasMore) && (
      <div className="mt-8 flex items-center justify-center gap-4">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex items-center gap-1 rounded-xl border-2 border-ink px-4 py-2 font-body text-sm font-medium disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t(locale, "browse.prev")}
        </button>
        <span className="font-mono text-sm text-ink-muted">{page + 1}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="flex items-center gap-1 rounded-xl border-2 border-ink px-4 py-2 font-body text-sm font-medium disabled:opacity-40"
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
      <div className="h-[520px] animate-pulse rounded-2xl border-2 border-ink bg-white" />
    ) : (
      <JobMap posts={posts} />
    )}
    <p className="mt-3 font-body text-sm text-ink-muted">
      {t(locale, "browse.mapShowing", { count: posts.filter(({ post }) => post.city && post.city !== "other").length })}
    </p>
  </div>
)}
```

Note: `posts` here is the `data ?? []` variable already defined. Check its type — it's `Array<{ post: Post; profile?: Profile | null }>` from `listPostsWithProfiles`. Make sure `JobMap` receives `posts` not `data`.

- [ ] **Step 6: Add `browse.mapShowing` i18n key**

- LV: `mapShowing: "Kartē redzami {count} sludinājumi"`
- RU: `mapShowing: "На карте показано {count} объявлений"`
- EN: `mapShowing: "Showing {count} posts on map"`

- [ ] **Step 7: Verify in browser**

Open `/browse`. Toggle between List and Map. Confirm map shows pins for cities. Click a pin — popup should show title and "Skatīt →" link. Changing filters (city, category) should update both views.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Browse.tsx src/lib/i18n.ts
git commit -m "feat: add List/Map toggle to Browse page with Leaflet city pins"
```

---

## Sprint C — Post Status + View Count Display

### Task C1: Add schema columns + push migration

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Add `filled` and `reminderSent` to posts table in `db/schema.ts`**

After the `contactCount` line, add:

```typescript
filled: boolean("filled").default(false).notNull(),
reminderSent: boolean("reminderSent").default(false).notNull(),
```

- [ ] **Step 2: Push schema to Railway DB**

```bash
npx drizzle-kit push
```

Expected: confirms adding `filled` and `reminderSent` columns. Both default to false, so no data migration needed.

- [ ] **Step 3: Commit**

```bash
git add db/schema.ts
git commit -m "feat: add filled and reminderSent columns to posts table"
```

---

### Task C2: Backend — setFilled mutation

**Files:**
- Modify: `api/queries/posts.ts`
- Modify: `api/posts-router.ts`

- [ ] **Step 1: Add `setPostFilled` to `api/queries/posts.ts`**

```typescript
export async function setPostFilled(id: number, filled: boolean) {
  await getDb()
    .update(schema.posts)
    .set({ filled, updatedAt: new Date() })
    .where(eq(schema.posts.id, id));
}
```

- [ ] **Step 2: Add `setFilled` mutation to `api/posts-router.ts`**

Import `setPostFilled` at the top of posts-router.ts:
```typescript
import { ..., setPostFilled } from "./queries/posts";
```

Add mutation to `postsRouter`:

```typescript
setFilled: authedQuery
  .input(z.object({ postId: z.number(), filled: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    const result = await getPostWithProfile(input.postId);
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
    if (result.post.userId !== ctx.user.id) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not your post" });
    }
    await setPostFilled(input.postId, input.filled);
    return { success: true };
  }),
```

- [ ] **Step 3: Commit**

```bash
git add api/queries/posts.ts api/posts-router.ts
git commit -m "feat: add setFilled mutation for post status toggle"
```

---

### Task C3: Display view count on PostCard

**Files:**
- Modify: `src/components/PostCard.tsx`

- [ ] **Step 1: Add Eye icon import and view count to PostCard bottom row**

Add `Eye` to lucide-react imports.

In the bottom row (after the date span), add:

```tsx
{post.viewCount > 0 && (
  <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-light">
    <Eye className="h-3 w-3" />
    {post.viewCount}
  </span>
)}
```

Place it before the date `ml-auto` span so the layout is: budget · when · 👁 views · date.

- [ ] **Step 2: Add "filled" badge to PostCard**

At the top of the card JSX, inside the `<Link>`, before the accent stripe, add:

```tsx
{post.filled && (
  <div className="absolute right-3 top-3 z-10 rounded-full border-2 border-ink bg-sage px-2.5 py-0.5 font-body text-xs font-medium text-ink">
    ✓ {t(locale, "postDetail.statusFilled")}
  </div>
)}
```

- [ ] **Step 3: Add i18n key `postDetail.statusFilled` to `src/lib/i18n.ts`**

- LV: `statusFilled: "Palīgs atrasts"`
- RU: `statusFilled: "Помощник найден"`
- EN: `statusFilled: "Helper found"`

- [ ] **Step 4: Verify**

Open browse page. Cards with `viewCount > 0` should show eye icon + count. Any filled post should show sage badge.

- [ ] **Step 5: Commit**

```bash
git add src/components/PostCard.tsx src/lib/i18n.ts
git commit -m "feat: show view count and filled badge on PostCard"
```

---

### Task C4: Display view count and status on PostDetail, add "Mark filled" to MyPosts

**Files:**
- Modify: `src/pages/PostDetail.tsx`
- Modify: `src/pages/MyPosts.tsx`

- [ ] **Step 1: Add view count display to PostDetail.tsx**

Find the section after the post title (h1). Add below the title and above any existing meta (city, date etc):

```tsx
<div className="mb-4 flex flex-wrap items-center gap-3">
  {data.post.viewCount > 0 && (
    <span className="inline-flex items-center gap-1 font-body text-sm text-ink-muted">
      <Eye className="h-4 w-4" />
      {data.post.viewCount} {t(locale, "postDetail.views")}
    </span>
  )}
  <span className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-0.5 font-body text-xs font-medium ${
    data.post.filled
      ? "border-sage bg-sage-light text-sage"
      : "border-ink bg-cream text-ink"
  }`}>
    {data.post.filled
      ? `✓ ${t(locale, "postDetail.statusFilled")}`
      : `● ${t(locale, "postDetail.statusOpen")}`}
  </span>
</div>
```

Add `Eye` to lucide-react imports in PostDetail.tsx.

- [ ] **Step 2: Add i18n keys**

In `src/lib/i18n.ts`, add under `postDetail`:
- LV: `views: "skatījumi"`, `statusOpen: "Aktīvs"`
- RU: `views: "просмотров"`, `statusOpen: "Открыто"`
- EN: `views: "views"`, `statusOpen: "Open"`

(`statusFilled` already added in Task C3.)

- [ ] **Step 3: Add "Mark as filled" button in MyPosts.tsx**

Add these two lines near the top of the `MyPosts` component, after the `deleteMutation` definition:

```tsx
const utils = trpc.useUtils();
const setFilledMutation = trpc.posts.setFilled.useMutation({
  onSuccess: () => utils.posts.myPosts.invalidate(),
});
```

Find the `<div className="flex gap-1">` in MyPosts.tsx (line ~155) — it contains the edit, delete, and view buttons. Add this button **before** the edit `<Link>`:

```tsx
{post.status === "active" && (
  <button
    onClick={() => setFilledMutation.mutate({ postId: post.id, filled: !post.filled })}
    disabled={setFilledMutation.isPending}
    title={post.filled ? t(locale, "myPosts.markOpen") : t(locale, "myPosts.markFilled")}
    className={`rounded-lg border-2 px-2 py-2 font-body text-xs font-medium transition ${
      post.filled
        ? "border-sage bg-sage-light text-sage hover:bg-sage"
        : "border-ink-light bg-white text-ink-muted hover:border-ink hover:text-ink"
    }`}
  >
    {post.filled ? "✓" : "○"}
  </button>
)}
```

(Icon-only button to save space; tooltip via `title` shows the full label.)

- [ ] **Step 4: Add i18n keys**

In `src/lib/i18n.ts`, add under `myPosts`:
- LV: `markFilled: "Atzīmēt kā aizpildītu"`, `markOpen: "Atzīmēt kā atvērtu"`
- RU: `markFilled: "Отметить как заполненное"`, `markOpen: "Отметить как открытое"`
- EN: `markFilled: "Mark as filled"`, `markOpen: "Mark as open"`

- [ ] **Step 5: Verify**

Open a post detail — should show view count + status badge. Go to My Posts → active tab → click "Mark as filled" → badge on card updates.

- [ ] **Step 6: Commit**

```bash
git add src/pages/PostDetail.tsx src/pages/MyPosts.tsx src/lib/i18n.ts
git commit -m "feat: add view count display and post status toggle to PostDetail and MyPosts"
```

---

## Sprint D — Email Notifications

### Task D1: Install Resend and create email helper

**Files:**
- Create: `api/lib/email.ts`
- Modify: `.env.example` (if it exists)

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Add env var to Railway**

```bash
railway variable set RESEND_API_KEY=re_xxxxxxxxxxxx --service jobsy-lv
```

Replace with actual key from https://resend.com/api-keys (free account, no credit card).

Also add `CRON_SECRET` for the cron endpoint protection:
```bash
railway variable set CRON_SECRET=$(openssl rand -hex 32) --service jobsy-lv
```

Note the CRON_SECRET value — you'll need it when configuring the Railway cron.

- [ ] **Step 3: Create `api/lib/email.ts`**

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "jobsy.lv <noreply@jobsy.lv>";

export async function sendPostPublished(
  to: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tavs sludinājums ir publicēts! 🎉",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Tavs sludinājums ir publicēts!</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            <strong>${postTitle}</strong> tagad ir redzams visiem jobsy.lv apmeklētājiem. Sludinājums būs aktīvs 30 dienas.
          </p>
          <a href="${postUrl}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendPostPublished failed:", err);
  }
}

export async function sendExpiryReminder(
  to: string,
  postTitle: string,
  postId: number
): Promise<void> {
  try {
    const postUrl = `https://jobsy.lv/post/${postId}`;
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Tavs sludinājums beidzas pēc 3 dienām ⏰",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#E8512A;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 22px; color: #1A1208; margin-bottom: 16px;">Sludinājums beidzas drīz</h2>
          <p style="color: #4A3728; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Tavs sludinājums <strong>${postTitle}</strong> beidzas pēc 3 dienām. Ja palīgs vēl nav atrasts, apsver publicēt jaunu sludinājumu.
          </p>
          <a href="${postUrl}" style="display: inline-block; background: #E8512A; color: #FAF6F0; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; border: 2px solid #1A1208;">
            Skatīt sludinājumu →
          </a>
          <p style="color: #8A7060; font-size: 13px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendExpiryReminder failed:", err);
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/lib/email.ts package.json package-lock.json
git commit -m "feat: add Resend email helper for post published and expiry reminders"
```

---

### Task D2: Trigger publish email on post creation

**Files:**
- Modify: `api/posts-router.ts`

- [ ] **Step 1: Import email helper at top of `api/posts-router.ts`**

```typescript
import { sendPostPublished } from "./lib/email";
```

- [ ] **Step 2: Add email trigger in the `create` mutation in `api/posts-router.ts`**

There are two free-post paths in the `create` mutation. In both, the post ID is `insertId` and the profile email is `profile.email`. Add the email call (fire-and-forget) right before each `return` statement where `requiresPayment: false`:

**Free-credits path** (around line 146):
```typescript
await checkAndRewardReferralOnPost(ctx.user.id);
if (!needsReview && profile.email) {
  sendPostPublished(profile.email, input.title, insertId); // no await
}
return { postId: insertId, requiresPayment: false, needsReview };
```

**Free-first-post path** (around line 168):
```typescript
await checkAndRewardReferralOnPost(ctx.user.id);
if (!needsReview && profile.email) {
  sendPostPublished(profile.email, input.title, insertId); // no await
}
return { postId: insertId, requiresPayment: false, needsReview };
```

Paid posts go through Stripe and activate via webhook — skip email for now (add later when webhook handler is wired to jobsy.lv domain).

- [ ] **Step 3: Verify (development)**

Create a free post while watching Railway logs (or local console). Should see `[email]` log line (success or failure). If `RESEND_API_KEY` is not set locally, will see a silent error log — that's expected.

- [ ] **Step 4: Commit**

```bash
git add api/posts-router.ts
git commit -m "feat: send post published email on post activation"
```

---

### Task D3: Cron endpoint for expiry reminders

**Files:**
- Create: `api/cron-router.ts`
- Modify: `api/router.ts`

- [ ] **Step 1: Create `api/cron-router.ts`**

```typescript
import { Hono } from "hono";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./queries/connection";
import { sendExpiryReminder } from "./lib/email";

export const cronRouter = new Hono();

cronRouter.get("/reminders", async (c) => {
  const secret = c.req.header("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find active posts expiring within 3 days that haven't been reminded yet
  const expiringPosts = await getDb()
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      userId: schema.posts.userId,
    })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "active"),
        eq(schema.posts.reminderSent, false),
        gte(schema.posts.expiresAt, now),
        lte(schema.posts.expiresAt, threeDaysLater)
      )
    );

  let sent = 0;
  for (const post of expiringPosts) {
    const userRows = await getDb()
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, post.userId))
      .limit(1);

    const email = userRows[0]?.email;
    if (!email) continue;

    await sendExpiryReminder(email, post.title, post.id);
    await getDb()
      .update(schema.posts)
      .set({ reminderSent: true })
      .where(eq(schema.posts.id, post.id));
    sent++;
  }

  return c.json({ ok: true, sent, checked: expiringPosts.length });
});
```

- [ ] **Step 2: Register cronRouter in main Hono app**

In your main Hono entry file (likely `api/index.ts` or `server.ts`), add:

```typescript
import { cronRouter } from "./cron-router";
// ...
app.route("/api/cron", cronRouter);
```

Note: This is a plain Hono route, NOT a tRPC route — it sits alongside the tRPC handler.

- [ ] **Step 3: Configure Railway cron**

In Railway dashboard → your service → Settings → Cron Jobs, add:
- Schedule: `0 7 * * *` (07:00 UTC = 09:00 Riga time)
- Command: `curl -H "x-cron-secret: YOUR_CRON_SECRET" https://jobsy.lv/api/cron/reminders`

Replace `YOUR_CRON_SECRET` with the value you set in Task D1 Step 2.

- [ ] **Step 4: Commit**

```bash
git add api/cron-router.ts
git commit -m "feat: add cron endpoint for 3-day expiry reminder emails"
```

---

### Task D4: Deploy and smoke test

- [ ] **Step 1: Push all commits to main**

```bash
git push origin main
```

Railway auto-deploys on push.

- [ ] **Step 2: Watch build logs**

```bash
railway logs --service jobsy-lv --lines 100
```

Expected: build success, no import errors.

- [ ] **Step 3: Smoke test each feature**

1. **Stats** — Homepage: live numbers show (not 0/0/8/10)
2. **Marquee** — Switch LV→RU→EN: marquee categories change language
3. **JSON-LD** — Open any post, DevTools Elements, check `<head>` for `<script type="application/ld+json">`
4. **FAB** — Browse on mobile width: coral "Publicēt" button appears above back-to-top
5. **Map toggle** — Browse → click Map: pins appear on Latvia map, popup works, List toggle returns grid
6. **View count** — Visit any post twice: viewCount increments and shows on card and detail
7. **Mark filled** — My Posts → active tab: "Mark as filled" button; click it; card shows sage badge
8. **Email** — Create a free post: check inbox for confirmation email (if RESEND_API_KEY set)

- [ ] **Step 4: Update memory file**

Update `C:\Users\Toms\.claude\projects\C--Users-Toms\memory\project_jobsy.md` — add Sprint 2 features to the "What's Built" list, mark roadmap items as done.

---

## Notes

- **Leaflet + Vite**: PNG imports work natively. If you get "Failed to load resource: marker-icon.png", the `L.Icon.Default.mergeOptions` call in JobMap.tsx fixes it.
- **Resend sender domain**: Until `jobsy.lv` is verified in Resend dashboard, use `onboarding@resend.dev` as the `from` address for dev/staging. Switch to `noreply@jobsy.lv` after DNS is live and domain verified in Resend.
- **MyPosts invalidation key**: Confirmed — `utils.posts.myPosts.invalidate()` (matches `trpc.posts.myPosts.useQuery()` on line 31 of MyPosts.tsx).
- **viewCount already shown in MyPosts**: The MyPosts page already displays `post.viewCount` with an Eye icon (lines 148–150). No change needed there — only PostCard and PostDetail need updating.
- **Cron secret locally**: Set `CRON_SECRET=dev-secret` in `.env` for local testing of the cron endpoint.
