# Sprint 2 Design — Map View, SEO, Post Status, Email Notifications
*2026-05-19 — approved by user*

---

## Scope

Four sprints shipped together. No external paid APIs. All backwards-compatible schema migrations.

---

## Sprint A — Quick Wins (no schema changes)

### JSON-LD JobPosting Schema
- **Where:** `src/pages/PostDetail.tsx`
- **How:** `useEffect` that creates `<script type="application/ld+json">` element, appends to `document.head` on mount, removes on cleanup (return function)
- **Fields:** `@type: "JobPosting"`, `title`, `description` (first 160 chars), `datePosted` (ISO), `validThrough` (ISO), `jobLocation.addressLocality` (city), `jobLocation.addressCountry: "LV"`
- **Fallback:** Only inject when post data is loaded (not during loading state)

### Per-page SEO Meta Tags
- **Where:** PostDetail, Browse, Home pages
- **How:** `useEffect` sets `document.title` and upserts `<meta name="description" content="...">` (find existing or create new)
- PostDetail: `"{post.title} — jobsy.lv"` + description from post body (truncated 160 chars)
- Browse: `"Darba sludinājumi Latvijā — jobsy.lv"` (locale-aware)
- Home: `"jobsy.lv — Atrodi palīdzību vai piedāvā darbu Latvijā"`
- Cleanup: reset to default on unmount

### Mobile "Post a Job" FAB
- **Where:** `src/pages/Browse.tsx`
- **What:** Fixed button, `md:hidden`, `bottom-20 right-4` (sits above BackToTop)
- **Style:** Coral, `border-2 border-ink`, `rounded-full`, `shadow-card-coral`, Plus icon + "Publicēt" text (i18n)
- **Behaviour:** `navigate("/create")`

### Bug Fix — Homepage Stats
- **Where:** `src/pages/Home.tsx`
- **Fix:** Add tRPC query `stats.overview` → backend counts `SELECT COUNT(*) FROM posts WHERE status='active'`, `SELECT COUNT(*) FROM users`
- **Display:** Real active post count, real user count. Remove "8 cities" / "10 categories" hardcoded stats or replace with real category count from posts table.

### Bug Fix — Marquee Locale
- **Where:** `src/pages/Home.tsx` (marquee strip)
- **Fix:** Replace hardcoded Latvian category strings with `t(locale, 'categories.X')` for each category slug

---

## Sprint B — Map View

### Dependencies
- `react-leaflet` + `leaflet` (npm install)
- `@types/leaflet` (dev dependency)
- Leaflet CSS imported in `src/index.css` or lazily in the map component

### City Coordinate Lookup
- **New file:** `src/lib/lv-cities.ts`
- Static record: ~25 Latvian cities → `{ lat: number; lng: number }`
- Cities covered: Rīga, Daugavpils, Liepāja, Jelgava, Jūrmala, Ventspils, Rēzekne, Valmiera, Jēkabpils, Ogre, Tukums, Cēsis, Saldus, Kuldīga, Talsi, Sigulda, Bauska, Dobele, Limbaži, Alūksne, Gulbene, Madona, Aizkraukle, Ludza, Preiļi
- Export: `getCityCoords(city: string): { lat: number; lng: number } | null`
- Fuzzy match: lowercase + trim before lookup; return null if not found

### Browse Page Changes (`src/pages/Browse.tsx`)
- Add `viewMode: "list" | "map"` state (default: `"list"`)
- Toggle buttons top-right of results header: `List | Map` — same style as existing filter chips
- Existing filter state (`type`, `category`, `city`, `keyword`) feeds both views unchanged
- Filtered posts array passed to whichever view is active

### Map Component
- **New file:** `src/components/JobMap.tsx`
- Props: `posts: Post[]`
- Renders `<MapContainer>` centred on Latvia (56.8796, 24.6032), zoom 7
- OpenStreetMap tile layer (no API key): `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- One `<Marker>` per post where `getCityCoords(post.city)` returns non-null
- Marker click → `<Popup>` with: post title (bold), category badge, city, coral "Skatīt →" link to `/post/{id}`
- Posts with unrecognised city: silently skipped
- Map height: `h-[520px]` on desktop, `h-[380px]` on mobile
- Leaflet default marker icon fix (known Webpack/Vite issue): re-import marker icons explicitly in component

---

## Sprint C — Post Status + View Counter

### Schema Changes (`db/schema.ts`)
```typescript
// On posts table — add:
viewCount: int("viewCount").default(0).notNull(),
filled: boolean("filled").default(false).notNull(),
```

### Backend Changes

**View counter** (`api/queries/posts.ts`):
- `getById` runs `UPDATE posts SET viewCount = viewCount + 1 WHERE id = ?` before the SELECT
- Return `viewCount` in the post object

**Post status** (`api/posts-router.ts`):
- New mutation: `posts.setFilled` — authed, takes `{ postId, filled: boolean }`, verifies ownership, updates `filled` field
- `getById` and `list` both return `filled` field

### Frontend Changes

**PostDetail** (`src/pages/PostDetail.tsx`):
- Below title: show `👁 {viewCount} skatījumi` (i18n: `postDetail.views`)
- Show status badge: filled → green "✅ Palīgs atrasts" chip, else "🟢 Aktīvs" (i18n keys)

**Browse cards** (`src/components/PostCard.tsx` or inline):
- Small view count badge bottom-right of card
- Filled posts: show "Palīgs atrasts" badge overlaid on card, reduced opacity

**MyPosts** (`src/pages/MyPosts.tsx`):
- Each active post gets "Atzīmēt kā aizpildītu" / "Atzīmēt kā atvērtu" toggle button
- Calls `posts.setFilled` mutation, refetches list

### i18n additions (all 3 locales)
- `postDetail.views` — "{n} skatījumi" / "{n} просмотров" / "{n} views"
- `postDetail.statusOpen` — "Aktīvs" / "Открыто" / "Open"
- `postDetail.statusFilled` — "Palīgs atrasts" / "Помощник найден" / "Helper found"
- `myPosts.markFilled` — "Atzīmēt kā aizpildītu" / "Отметить как заполненное" / "Mark as filled"
- `myPosts.markOpen` — "Atzīmēt kā atvērtu" / "Отметить как открытое" / "Mark as open"

---

## Sprint D — Email Notifications

### Provider: Resend
- Install: `resend` npm package (backend only)
- Env var: `RESEND_API_KEY` (add to Railway + .env.example)
- Sender: `noreply@jobsy.lv` (requires Resend domain verification — fallback: `onboarding@resend.dev` during dev)

### Schema Addition (`db/schema.ts`)
```typescript
// On posts table — add:
reminderSent: boolean("reminderSent").default(false).notNull(),
```

### New File: `api/lib/email.ts`
- `sendPostPublished(to: string, postTitle: string, postId: number): Promise<void>`
- `sendExpiryReminder(to: string, postTitle: string, postId: number, daysLeft: number): Promise<void>`
- Both functions: plain HTML email, inline styles, jobsy.lv branding (cream bg, coral CTA button)
- Wrap Resend calls in try/catch — email failure must NOT fail the post creation mutation

### Post Published Email
- **Where:** `api/posts-router.ts` — after successful post insert (both free and paid paths)
- Fire-and-forget (no await, wrapped in try/catch)
- Subject (LV): "Tavs sludinājums ir publicēts! 🎉"
- Body: post title, direct link button, "Sludinājums būs aktīvs 30 dienas"

### Expiry Reminder Cron
- **New file:** `api/cron-router.ts` — GET endpoint `/api/cron/reminders`
- Query: posts where `validUntil BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 3 DAY)` AND `reminderSent = false` AND `status = 'active'`
- For each: send reminder email, set `reminderSent = true`
- Protected by a secret header: `X-Cron-Secret: {env var CRON_SECRET}` — Railway cron must include it
- Railway cron: daily at 09:00 Riga time (`0 9 * * *`)
- Register route in `api/index.ts`

---

## Migration Strategy

Run `drizzle-kit push` (or generate migration file) for all schema changes together:
- `posts.viewCount INT DEFAULT 0 NOT NULL`
- `posts.filled BOOLEAN DEFAULT false NOT NULL`
- `posts.reminderSent BOOLEAN DEFAULT false NOT NULL`

All columns have defaults — safe to add to existing data with no backfill needed.

---

## Files Changed / Created

### New files
- `src/lib/lv-cities.ts` — city → coords lookup
- `src/components/JobMap.tsx` — Leaflet map component
- `api/lib/email.ts` — Resend email helpers
- `api/cron-router.ts` — expiry reminder cron endpoint

### Modified files
- `src/pages/PostDetail.tsx` — JSON-LD, SEO meta, view count, status badge
- `src/pages/Browse.tsx` — List/Map toggle, FAB, SEO meta
- `src/pages/Home.tsx` — real stats query, marquee i18n fix
- `src/pages/MyPosts.tsx` — mark filled/open button
- `src/lib/i18n.ts` — new keys for views, status, filled, cron
- `db/schema.ts` — viewCount, filled, reminderSent columns
- `api/queries/posts.ts` — increment viewCount on getById, return new fields
- `api/posts-router.ts` — setFilled mutation, post-publish email
- `api/router.ts` — register cron router
- `src/index.css` — import Leaflet CSS
- `package.json` — react-leaflet, leaflet, @types/leaflet, resend

---

## Out of Scope (next sprints)
- Phone verification badge (SMS OTP — separate sprint)
- Category landing pages
- Review system
- PWA / social media automation
