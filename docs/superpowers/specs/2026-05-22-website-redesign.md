# jobsy.lv Website Redesign — 4-Season Adaptive Theme

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign jobsy.lv with a search-first homepage, polished editorial aesthetic, and an automatic 4-season theme that changes visual accent colours, hero backgrounds, and ambient particle decorations based on the real calendar month — with zero changes to data fetching, routing, auth, or APIs.

**Architecture:** Thin `SeasonProvider` sets `data-season` attribute on `<html>`; CSS variable overrides handle all colour changes automatically. Framer Motion adds targeted entry animations. Browse page gains a sticky desktop sidebar. All changes are purely presentational.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion (already installed), CSS custom properties, Geist + Playfair Display fonts.

---

## Design Principles

- **Keep what works:** Playfair Display headings, Geist body, 2px ink border system, noise texture, left accent stripe on PostCard.
- **Seasons as CSS variables:** `--coral`, `--mustard`, `--sage` are overridden per season. Every existing component inherits seasonal colour automatically.
- **Dark mode survives:** `[data-theme="dark"]` rules remain and override seasonal layer when active.
- **No API changes:** Zero modifications to tRPC routers, DB schema, auth, or i18n keys.
- **Framer Motion budget:** Page load hero reveal + card hover + section scroll-in. Nothing else animated.

---

## Season System

### Detection Logic

```ts
// src/lib/season-context.tsx
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(): Season {
  const m = new Date().getMonth(); // 0–11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}
```

`SeasonProvider` calls `getSeason()` once on mount, sets `document.documentElement.setAttribute('data-season', season)`, and provides `useSeason()` hook.

Wrap order in `main.tsx`:
```tsx
<SeasonProvider>
  <ThemeProvider>
    ...
  </ThemeProvider>
</SeasonProvider>
```

### Season Colour Palettes (CSS overrides)

```css
/* index.css — added after existing :root block */

[data-season="spring"] {
  --coral:        #6BAD6A;
  --coral-hover:  #5A9A59;
  --coral-light:  #D4EDDA;
  --mustard:      #F7C873;
  --mustard-light:#FEF3D0;
  --sage:         #A8C5A0;
  --sage-light:   #E0EED8;
  --season-hero-from: #F2FBF0;
  --season-hero-to:   #FBF9F0;
}

[data-season="summer"] {
  /* Summer = base defaults; no override needed */
  --season-hero-from: #FBF6EE;
  --season-hero-to:   #F5F1E8;
}

[data-season="autumn"] {
  --coral:        #C4632A;
  --coral-hover:  #A85520;
  --coral-light:  #F5E0CC;
  --mustard:      #D4A832;
  --mustard-light:#F7EBC8;
  --sage:         #8FAD6A;
  --sage-light:   #DDE8CC;
  --season-hero-from: #FBF5EE;
  --season-hero-to:   #F7EEE0;
}

[data-season="winter"] {
  --coral:        #5B8AC4;
  --coral-hover:  #4A72A8;
  --coral-light:  #D8E8F8;
  --mustard:      #C4B8A0;
  --mustard-light:#EDE8DC;
  --sage:         #8EB8D4;
  --sage-light:   #D8EDF8;
  --season-hero-from: #EFF4FA;
  --season-hero-to:   #E4EDF8;
}
```

### Seasonal Particles Component

`src/components/SeasonalParticles.tsx` — renders 8 absolutely-positioned decorative elements inside the hero section. Each element is a small SVG or div with a CSS animation class.

```tsx
// Particle config per season:
// winter:  8 × ❄ snowflake SVG, animation: float-down (12–20s, staggered)
// spring:  8 × oval petal div, animation: float-up-drift (10–16s, staggered)
// summer:  6 × thin ray line, animation: pulse-opacity (4–8s, staggered)
// autumn:  8 × leaf SVG, animation: fall-spin (8–14s, staggered)
```

Particle CSS keyframes in `index.css`:
- `@keyframes float-down` — translateY(0→110vh), slight X drift
- `@keyframes float-up-drift` — translateY(0→-110vh), drift X
- `@keyframes pulse-opacity` — opacity 0.1→0.3→0.1
- `@keyframes fall-spin` — translateY(0→110vh) + rotate(0→360deg)

All particles: `opacity: 0.18–0.25`, `pointer-events: none`, `position: absolute`, `z-index: 0`.

---

## Navbar Changes

**File:** `src/components/Navbar.tsx`

1. **Scroll blur:** Add `useEffect` with scroll listener. When `scrollY > 20`, add class `navbar-scrolled` to nav element.
   ```css
   nav.navbar-scrolled {
     background-color: color-mix(in srgb, var(--cream) 88%, transparent);
     backdrop-filter: blur(12px);
     -webkit-backdrop-filter: blur(12px);
   }
   ```

2. **Season accent line:** 2px top border on `<html>` body (not nav) using `--coral`:
   ```css
   body::before {
     content: '';
     position: fixed;
     top: 0; left: 0; right: 0;
     height: 2px;
     background: var(--coral);
     z-index: 9999;
   }
   ```

3. **Logo dot:** Change `bg-coral` hardcode → `bg-[var(--coral)]` so it follows season. (Already uses Tailwind, need to change to inline style or CSS variable class.)

---

## Homepage Redesign

**File:** `src/pages/Home.tsx`

### Hero Section (full replacement)

```
┌─────────────────────────────────────────────────┐
│  [seasonal gradient bg + particles]              │
│                                                  │
│  Headline (Playfair, 5xl→7xl)                   │
│  Animated word-by-word reveal (Framer Motion)    │
│                                                  │
│  Subtitle (Geist, ink-muted)                     │
│                                                  │
│  ┌──────────────────────────────┐ [Meklēt →]    │
│  │  Search bar (full width)      │               │
│  └──────────────────────────────┘               │
│                                                  │
│  [Remontdarbi] [IT&Tech] [Dārzs] [Transports]   │
│  [Radošais] [Mājas palīgs]  ← category pills     │
│                                                  │
│  2,847 sludinājumi  •  12k+ lietotāji  •  18 kat│
│                                                  │
└─────────────────────────────────────────────────┘
```

**Search bar behaviour:** `onSubmit` navigates to `/browse?q={query}`. Browse page must read `q` from URL params and filter post titles client-side (or pass to tRPC `posts.list` which already supports search if `q` param is added — see Browse section).

**Hero animation with Framer Motion:**
```tsx
// Staggered word reveal on mount
const words = heroTitle.split(' ');
<motion.h1>
  {words.map((word, i) => (
    <motion.span
      key={i}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.1, duration: 0.4 }}
    >
      {word}{' '}
    </motion.span>
  ))}
</motion.h1>
```

**Category pills:** 6 hardcoded popular categories linking to `/browse?category={key}`. Styled as rounded-full border-2 border-ink chips with seasonal hover fill.

**SeasonalParticles** rendered inside hero with `overflow-hidden` parent.

### Section Improvements

**Marquee strip:** Change star fill colour from `fill-coral text-coral` to `fill-[var(--coral)] text-[var(--coral)]` — seasonal colour.

**How It Works:** Numbered circles change from `bg-white` to `bg-[var(--coral-light)]` with `text-[var(--coral)]` number text.

**Latest Posts:** Add grid/list view toggle. List view = single-column compact rows (title + badges + price in one line). State stored in `useState`, not persisted.

**PostCard hover shadow:** Change `hover:shadow-float` → `hover:shadow-none hover:-translate-y-1 hover:shadow-[4px_4px_0_var(--ink)]` — hard editorial offset shadow.

---

## Browse Page Redesign

**File:** `src/pages/Browse.tsx`

### Desktop Layout (≥ md breakpoint)

```
┌──────────────────────────────────────────────────┐
│  [Grid/Map toggle]          [X results]  [List/Grid toggle] │
├──────────────┬───────────────────────────────────┤
│              │                                   │
│  SIDEBAR     │  POST GRID (or map)               │
│  280px       │                                   │
│  sticky      │  3-col grid on lg                 │
│              │  2-col grid on md                 │
│  Type        │                                   │
│  [Need][Offer]│                                  │
│              │                                   │
│  Category    │                                   │
│  [icon][icon]│                                   │
│  [icon][icon]│                                   │
│  ...         │                                   │
│              │                                   │
│  City        │                                   │
│  [dropdown]  │                                   │
│              │                                   │
│  Sort        │                                   │
│  [newest ▼]  │                                   │
│              │                                   │
│  [Clear all] │                                   │
└──────────────┴───────────────────────────────────┘
```

### Mobile Layout

- Top bar: shows active filter count chip + "Filtri" button (opens bottom Sheet)
- Bottom sheet: same filter groups as sidebar
- Grid/Map toggle stays in top bar

### Search from Hero

Browse page reads `?q=` from URL params. Pass to existing `posts.list` query as a new optional `search` param (backend change required — see notes below).

**Backend note:** Add `search?: string` to `listPosts` query input. Filter with `LIKE %search%` on title. Simple, no full-text search needed yet.

---

## PostCard Redesign

**File:** `src/components/PostCard.tsx`

### Changes

1. **Hard shadow on hover:**
   Remove: `hover:shadow-float`
   Add: `hover:[box-shadow:4px_4px_0_var(--ink)] hover:-translate-y-1`

2. **Image slot (future-ready):**
   `PostCard` currently receives `post` and `profile`. Add optional `images?: string[]` prop (first image URL from `postImages` join already returned by `getPostWithProfile` as `images` array).
   ```tsx
   interface PostCardProps {
     post: Post;
     profile?: Profile | null;
     isBusiness?: boolean;
     images?: string[];  // ← add this
   }
   // In JSX:
   {images && images[0] && (
     <div className="aspect-video w-full overflow-hidden border-b-2 border-ink">
       <img src={images[0]} alt="" className="h-full w-full object-cover" />
     </div>
   )}
   ```
   Pass `images={item.images}` at every PostCard call site (Home, Browse, Category, PostDetail related).

3. **Section reveal animation:**
   PostCard gains `motion.div` wrapper with:
   ```tsx
   initial={{ opacity: 0, y: 16 }}
   whileInView={{ opacity: 1, y: 0 }}
   viewport={{ once: true }}
   transition={{ duration: 0.3 }}
   ```

---

## Footer Redesign

**File:** `src/components/Footer.tsx`

### New Layout

```
┌──────────────────────────────────────────────────┐
│  [seasonal top border — 2px var(--coral)]        │
│                                                  │
│  jobsy•    Pārlūkot      Konts       Juridiskais │
│  Latvijas  Pēc kat.      Pieteikties Privacy     │
│  darba     Pēc pilsētas  Mani sludin Terms       │
│  platforma Kartes skats  Iestatījumi             │
│            Cenas                                 │
│                                                  │
│  LV  RU  EN          © 2026 jobsy.lv             │
└──────────────────────────────────────────────────┘
```

4 columns on desktop, stacked on mobile.

---

## Animation Budget Summary

| Location | Animation | Library |
|----------|-----------|---------|
| Hero headline | Word-by-word reveal | Framer Motion |
| Hero particles | Float/fall/pulse | CSS keyframes |
| PostCard | scroll-in fade-up | Framer Motion whileInView |
| PostCard hover | lift + hard shadow | CSS transition |
| Navbar | blur on scroll | CSS + scroll listener |
| Section headers | fade-up on scroll | Framer Motion whileInView |
| Stats counters | count-up | Existing IntersectionObserver |

---

## Files Changed Summary

| File | Action | Notes |
|------|--------|-------|
| `src/lib/season-context.tsx` | CREATE | SeasonProvider, useSeason, getSeason |
| `src/components/SeasonalParticles.tsx` | CREATE | 8-particle hero decoration |
| `src/index.css` | MODIFY | Season CSS vars, particle keyframes, navbar blur, season top line |
| `src/main.tsx` | MODIFY | Wrap with SeasonProvider |
| `src/components/Navbar.tsx` | MODIFY | Scroll blur, seasonal logo dot |
| `src/pages/Home.tsx` | MODIFY | Search hero, category pills, section polish |
| `src/pages/Browse.tsx` | MODIFY | Sidebar filters desktop, mobile drawer, search param |
| `src/components/PostCard.tsx` | MODIFY | Hard shadow hover, image slot, scroll-in animation |
| `src/components/Footer.tsx` | MODIFY | 4-column layout |
| `api/routers/posts-router.ts` | MODIFY | Add optional `search` param to listPosts |

**Unchanged:** All other pages (PostDetail, CreatePost, MyPosts, Settings, Pricing, Login, Admin), all DB schema, all tRPC routers except one search param addition, all auth, all i18n.

---

## Out of Scope

- Mobile app / PWA
- Image upload backend (PostCard image slot is display-only, shows existing images)
- New pages
- Dark/terracotta theme modifications (they remain and override seasonal layer)
- Stripe or payment changes
