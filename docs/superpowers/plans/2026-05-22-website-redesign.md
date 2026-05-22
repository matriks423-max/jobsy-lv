# jobsy.lv Website Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign jobsy.lv with a 4-season adaptive theme (auto-detected from calendar month), search-first homepage hero, polished PostCard with hard editorial shadows, Browse page with sticky desktop sidebar, and an improved Footer — all purely presentational, zero backend changes needed.

**Architecture:** `SeasonProvider` sets `data-season` attribute on `<html>`; existing Tailwind color classes (`bg-coral`, `text-coral`, etc.) automatically reflect seasonal CSS variable overrides. Framer Motion handles hero word reveal and card scroll-in animations. Browse gains a 280px sticky sidebar on desktop and a bottom Sheet drawer on mobile.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Framer Motion (already installed), CSS custom properties, shadcn/ui Sheet component (already installed).

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/season-context.tsx` | CREATE | Season detection, SeasonProvider, useSeason hook |
| `src/components/SeasonalParticles.tsx` | CREATE | Ambient hero particle decoration per season |
| `src/index.css` | MODIFY | Season CSS vars, particle keyframes, navbar blur, top accent line |
| `src/main.tsx` | MODIFY | Wrap app with SeasonProvider |
| `src/lib/i18n.ts` | MODIFY | Add hero.searchPlaceholder + hero.searchBtn keys (lv/ru/en) |
| `src/components/Navbar.tsx` | MODIFY | Scroll blur effect, seasonal logo dot fix |
| `src/pages/Home.tsx` | MODIFY | Search-first hero, category pills, section polish, grid/list toggle |
| `src/types/post.ts` | MODIFY | Add images?: string[] to PostWithProfile |
| `src/components/PostCard.tsx` | MODIFY | Hard shadow hover, image slot, scroll-in animation |
| `src/pages/Browse.tsx` | MODIFY | Desktop sidebar filters, mobile Sheet drawer |
| `src/components/Footer.tsx` | MODIFY | 4-column layout with seasonal top border |

**Unchanged:** All tRPC routers, DB schema, auth, i18n keys except 2 new hero keys, PostDetail, CreatePost, MyPosts, Settings, Pricing, Login, Admin, Payment, Success pages.

---

## Context Every Subagent Needs

- Stack: React 19 + Vite + TypeScript. Tailwind CSS v3 with custom config in `tailwind.config.js`. CSS custom properties define all brand colours (`--coral`, `--mustard`, `--sage`, `--ink`, `--cream`). Tailwind color classes (`bg-coral`, `text-coral`) already map to these CSS vars via the config — so overriding the CSS var overrides the Tailwind class automatically.
- `data-theme="dark"` and `data-theme="terracotta"` already used by ThemeProvider for theme switching. We add `data-season="spring|summer|autumn|winter"` on the same `<html>` element — no conflict since different attribute name.
- Framer Motion is installed: `import { motion } from 'framer-motion'`.
- shadcn/ui Sheet is at `src/components/ui/sheet.tsx` — `import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"`.
- Dev server: `npm run dev` in `C:\Users\Toms\Projects\jobsy`. Runs on port 5173.
- `@/` alias maps to `src/`.

---

## Task 1: Season Foundation — CSS Variables + SeasonProvider

**Files:**
- Create: `src/lib/season-context.tsx`
- Modify: `src/index.css` (add season blocks after existing `:root` block)
- Modify: `src/main.tsx` (wrap with SeasonProvider)
- Modify: `src/lib/i18n.ts` (add 2 hero search keys)

- [ ] **Step 1: Add season CSS variable blocks to `src/index.css`**

Open `src/index.css`. After the closing `}` of the `[data-theme="terracotta"]` block (line ~64), add:

```css
/* ─── Season: Spring (Mar–May) ────────────────────────────── */
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

/* ─── Season: Summer (Jun–Aug) ─────────────────────────────── */
[data-season="summer"] {
  /* Summer uses base defaults — only hero gradient needed */
  --season-hero-from: #FBF6EE;
  --season-hero-to:   #F5F1E8;
}

/* ─── Season: Autumn (Sep–Nov) ─────────────────────────────── */
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

/* ─── Season: Winter (Dec–Feb) ─────────────────────────────── */
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

/* ─── Seasonal top accent line ─────────────────────────────── */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--coral);
  z-index: 9999;
  pointer-events: none;
  transition: background 0.5s ease;
}

/* ─── Navbar scroll blur ───────────────────────────────────── */
nav.navbar-scrolled {
  background-color: color-mix(in srgb, var(--cream) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

- [ ] **Step 2: Create `src/lib/season-context.tsx`**

```tsx
import { createContext, useContext, useEffect, type ReactNode } from 'react';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getSeason(): Season {
  const m = new Date().getMonth(); // 0–11
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

const SeasonContext = createContext<Season>('summer');

export function SeasonProvider({ children }: { children: ReactNode }) {
  const season = getSeason();

  useEffect(() => {
    document.documentElement.setAttribute('data-season', season);
    return () => {
      document.documentElement.removeAttribute('data-season');
    };
  }, [season]);

  return (
    <SeasonContext.Provider value={season}>
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason(): Season {
  return useContext(SeasonContext);
}
```

- [ ] **Step 3: Wrap app with SeasonProvider in `src/main.tsx`**

Current `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { LocaleProvider } from "@/lib/locale-context"
import ErrorBoundary from "@/components/ErrorBoundary"
import { initSentry } from "@/lib/sentry"
import App from './App.tsx'

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TRPCProvider>
          <LocaleProvider>
            <App />
          </LocaleProvider>
        </TRPCProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```

Replace with:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import { LocaleProvider } from "@/lib/locale-context"
import ErrorBoundary from "@/components/ErrorBoundary"
import { initSentry } from "@/lib/sentry"
import { SeasonProvider } from "@/lib/season-context"
import App from './App.tsx'

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <TRPCProvider>
          <LocaleProvider>
            <SeasonProvider>
              <App />
            </SeasonProvider>
          </LocaleProvider>
        </TRPCProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 4: Add hero search i18n keys to `src/lib/i18n.ts`**

Find the Latvian `hero` block (around line 15). It ends after `statsUsers`. Add 2 keys:
```ts
// BEFORE (end of lv hero block):
      statsUsers: "Reģistrēti lietotāji",
    },
// AFTER:
      statsUsers: "Reģistrēti lietotāji",
      searchPlaceholder: "Meklē darbus, pakalpojumus...",
      searchBtn: "Meklēt",
    },
```

Find the Russian `hero` block (~line 411). Same pattern:
```ts
      statsUsers: "Зарегистрированные пользователи",
      searchPlaceholder: "Найти работу, услуги...",
      searchBtn: "Искать",
    },
```

Find the English `hero` block (~line 806). Same pattern:
```ts
      statsUsers: "Registered users",
      searchPlaceholder: "Search jobs, services...",
      searchBtn: "Search",
    },
```

- [ ] **Step 5: Verify season is applied**

Run: `npm run dev` in `C:\Users\Toms\Projects\jobsy`

Open browser to `http://localhost:5173`. Open DevTools → Elements. Check that `<html>` has `data-season="spring"` (May = spring, month index 4, range 2–4).

Check that `--coral` CSS variable in DevTools Computed shows `#6BAD6A` (spring green) instead of default `#E8826B` (coral red).

Expected: HTML element shows `data-season="spring"` and accent colours shift to green tones.

- [ ] **Step 6: Commit**

```bash
git add src/lib/season-context.tsx src/index.css src/main.tsx src/lib/i18n.ts
git commit -m "feat: add 4-season CSS variable system + SeasonProvider

- getSeason() detects month → spring/summer/autumn/winter
- SeasonProvider sets data-season on <html> element
- CSS overrides coral/mustard/sage vars per season
- body::before adds 2px seasonal accent line at top
- navbar-scrolled CSS class for blur effect
- Add hero.searchPlaceholder + hero.searchBtn i18n keys

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: SeasonalParticles Component

**Files:**
- Modify: `src/index.css` (add 4 particle keyframes)
- Create: `src/components/SeasonalParticles.tsx`

- [ ] **Step 1: Add particle keyframes to `src/index.css`**

Add at the very end of `src/index.css`:

```css
/* ─── Seasonal particle animations ────────────────────────── */
@keyframes particle-fall {
  0%   { transform: translateY(-10px) translateX(0) rotate(0deg);   opacity: 0.2; }
  10%  { opacity: 0.22; }
  90%  { opacity: 0.18; }
  100% { transform: translateY(110vh) translateX(40px) rotate(360deg); opacity: 0; }
}

@keyframes particle-rise {
  0%   { transform: translateY(10px) translateX(0);   opacity: 0.2; }
  10%  { opacity: 0.22; }
  90%  { opacity: 0.18; }
  100% { transform: translateY(-110vh) translateX(-30px); opacity: 0; }
}

@keyframes particle-pulse {
  0%, 100% { opacity: 0.10; transform: scale(1); }
  50%       { opacity: 0.28; transform: scale(1.15); }
}

@keyframes particle-spin-fall {
  0%   { transform: translateY(-10px) rotate(0deg);   opacity: 0.2; }
  100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
}
```

- [ ] **Step 2: Create `src/components/SeasonalParticles.tsx`**

```tsx
import { useSeason } from '@/lib/season-context';

interface ParticleConfig {
  style: React.CSSProperties;
  animationName: string;
  content: React.ReactNode;
}

const SNOWFLAKE_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-[var(--coral)]">
    <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
  </svg>
);

const LEAF_SVG = (
  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
    <path d="M21 3C21 3 14 3 9 8c-5 5-6 13-6 13s8-1 13-6c5-5 5-12 5-12z" fill="var(--coral)" opacity="0.7"/>
    <path d="M3 21l7-7" stroke="var(--mustard)" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const PETAL_SVG = (
  <svg viewBox="0 0 20 24" fill="none" className="w-full h-full">
    <ellipse cx="10" cy="12" rx="6" ry="10" fill="var(--coral)" opacity="0.6" transform="rotate(-15 10 12)"/>
  </svg>
);

const RAY_SVG = (
  <svg viewBox="0 0 4 40" className="w-full h-full">
    <line x1="2" y1="0" x2="2" y2="40" stroke="var(--mustard)" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

function makeParticles(
  count: number,
  positions: Array<{ left: string; top: string }>,
  sizes: number[],
  delays: number[],
  durations: number[],
  animName: string,
  content: React.ReactNode,
): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    style: {
      position: 'absolute' as const,
      left: positions[i % positions.length].left,
      top: positions[i % positions.length].top,
      width: sizes[i % sizes.length],
      height: sizes[i % sizes.length],
      animationName: animName,
      animationDuration: `${durations[i % durations.length]}s`,
      animationDelay: `${delays[i % delays.length]}s`,
      animationTimingFunction: 'linear',
      animationIterationCount: 'infinite',
      pointerEvents: 'none' as const,
      zIndex: 0,
    },
    animationName: animName,
    content,
  }));
}

const WINTER_PARTICLES = makeParticles(
  8,
  [
    { left: '8%',  top: '-8%' }, { left: '22%', top: '-5%' },
    { left: '38%', top: '-10%'}, { left: '55%', top: '-4%' },
    { left: '67%', top: '-8%' }, { left: '78%', top: '-6%' },
    { left: '88%', top: '-9%' }, { left: '14%', top: '-3%' },
  ],
  [14, 10, 18, 12, 16, 11, 20, 13],
  [0, 2.5, 1, 4, 0.5, 3, 6, 5],
  [13, 17, 11, 19, 15, 12, 14, 20],
  'particle-fall',
  SNOWFLAKE_SVG,
);

const SPRING_PARTICLES = makeParticles(
  8,
  [
    { left: '5%',  top: '110%' }, { left: '20%', top: '105%' },
    { left: '35%', top: '108%' }, { left: '50%', top: '112%' },
    { left: '62%', top: '106%' }, { left: '74%', top: '110%' },
    { left: '85%', top: '107%' }, { left: '92%', top: '109%' },
  ],
  [14, 10, 16, 12, 18, 11, 15, 13],
  [0, 1.5, 3, 0.5, 4, 2, 5, 1],
  [11, 15, 10, 16, 13, 12, 14, 17],
  'particle-rise',
  PETAL_SVG,
);

const SUMMER_PARTICLES = makeParticles(
  6,
  [
    { left: '15%', top: '15%' }, { left: '30%', top: '10%' },
    { left: '50%', top: '20%' }, { left: '65%', top: '8%'  },
    { left: '78%', top: '18%' }, { left: '88%', top: '12%' },
  ],
  [3, 4, 3, 5, 4, 3],
  [0, 1, 2, 0.5, 1.5, 2.5],
  [5, 7, 4, 8, 6, 5],
  'particle-pulse',
  RAY_SVG,
);

const AUTUMN_PARTICLES = makeParticles(
  8,
  [
    { left: '7%',  top: '-8%' }, { left: '18%', top: '-5%' },
    { left: '32%', top: '-10%'}, { left: '48%', top: '-4%' },
    { left: '60%', top: '-8%' }, { left: '72%', top: '-6%' },
    { left: '84%', top: '-9%' }, { left: '93%', top: '-3%' },
  ],
  [16, 12, 20, 14, 18, 11, 22, 15],
  [0, 1, 2.5, 0.5, 3.5, 1.5, 4, 2],
  [9, 12, 8, 13, 10, 11, 14, 9],
  'particle-spin-fall',
  LEAF_SVG,
);

const SEASON_PARTICLES: Record<string, ParticleConfig[]> = {
  winter: WINTER_PARTICLES,
  spring: SPRING_PARTICLES,
  summer: SUMMER_PARTICLES,
  autumn: AUTUMN_PARTICLES,
};

export default function SeasonalParticles() {
  const season = useSeason();
  const particles = SEASON_PARTICLES[season] ?? [];

  return (
    <>
      {particles.map((p, i) => (
        <div key={i} style={p.style}>
          {p.content}
        </div>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Verify component renders without errors**

With dev server running, temporarily add `<SeasonalParticles />` to a test location in App.tsx, check console has no errors, then remove it. (It will be properly added in Task 4 to the hero.)

Actually, just verify the TypeScript compiles:

Run: `npm run build` in `C:\Users\Toms\Projects\jobsy`

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/SeasonalParticles.tsx src/index.css
git commit -m "feat: add SeasonalParticles component + particle CSS keyframes

- 4 keyframes: particle-fall, particle-rise, particle-pulse, particle-spin-fall
- Winter: 8 snowflake SVGs drifting down
- Spring: 8 petal SVGs rising up
- Summer: 6 ray lines pulsing
- Autumn: 8 leaf SVGs spinning down
- All particles: ~20% opacity, pointer-events none

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Navbar — Scroll Blur + Seasonal Logo Dot

**Files:**
- Modify: `src/components/Navbar.tsx`

The CSS for scroll blur was already added to `src/index.css` in Task 1. This task only touches the Navbar component.

- [ ] **Step 1: Add scroll listener and logo dot fix to Navbar**

Replace the entire contents of `src/components/Navbar.tsx` with:

```tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Plus,
  List,
  User,
  LogOut,
  Globe,
  Settings,
  Shield,
} from "lucide-react";

export default function Navbar() {
  const { locale, setLocale } = useLocale();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`sticky top-0 z-50 border-b-2 border-ink transition-all duration-300 noise-bg ${scrolled ? 'navbar-scrolled' : 'bg-cream'}`}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1">
          <span className="font-display text-2xl font-bold italic text-ink">
            jobsy
          </span>
          <span
            className="inline-block h-2 w-2 rounded-full transition-colors duration-500"
            style={{ background: 'var(--coral)' }}
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            to="/browse"
            className="font-body text-sm font-medium text-ink-muted hover:text-ink"
          >
            {t(locale, "nav.browse")}
          </Link>
          <Link
            to="/pricing"
            className="font-body text-sm font-medium text-ink-muted hover:text-ink"
          >
            {t(locale, "nav.pricing")}
          </Link>
          {isAuthenticated && (
            <Link
              to="/my-posts"
              className="font-body text-sm font-medium text-ink-muted hover:text-ink"
            >
              {t(locale, "nav.myPosts")}
            </Link>
          )}
          <Button
            onClick={() => navigate("/create")}
            className="h-9 rounded-md border-2 border-ink bg-coral px-4 font-body text-sm font-medium text-ink hover:-translate-y-0.5 hover:bg-coral-hover hover:shadow-card-coral"
          >
            <Plus className="mr-1 h-4 w-4" />
            {t(locale, "nav.createPost")}
          </Button>
        </div>

        {/* Right side: Lang + Auth */}
        <div className="hidden items-center gap-4 md:flex">
          {/* Language switcher */}
          <div className="flex items-center gap-1">
            {(["lv", "ru", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLocale(l)}
                className={`px-1.5 py-1 font-body text-sm font-medium ${
                  locale === l
                    ? "text-coral underline decoration-2 underline-offset-4"
                    : "text-ink-light hover:text-ink"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Auth */}
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border-2 border-ink p-0.5 pr-3 transition hover:-translate-y-0.5">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-coral-light">
                      <User className="h-4 w-4 text-coral" />
                    </div>
                  )}
                  <span className="font-body text-sm font-medium text-ink">
                    {user.name?.split(" ")[0] ?? "User"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 border-2 border-ink bg-white"
              >
                <DropdownMenuItem onClick={() => navigate("/my-posts")}>
                  <List className="mr-2 h-4 w-4" />
                  {t(locale, "nav.myPosts")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t(locale, "nav.createPost")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t(locale, "nav.settings")}
                </DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <Shield className="mr-2 h-4 w-4 text-coral" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t(locale, "nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="h-9 rounded-md border-2 border-ink bg-transparent font-body text-sm font-medium text-ink hover:bg-cream-dark"
            >
              {t(locale, "nav.login")}
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <button className="rounded-md border-2 border-ink p-2">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-80 border-l-2 border-ink bg-cream p-0"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b-2 border-ink p-4">
                <span className="font-display text-xl font-bold italic text-ink">
                  jobsy
                </span>
                <SheetClose asChild>
                  <button className="rounded-md border-2 border-ink p-2">
                    <X className="h-5 w-5" />
                  </button>
                </SheetClose>
              </div>
              <div className="flex flex-col gap-2 p-4">
                <Link
                  to="/browse"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                >
                  {t(locale, "nav.browse")}
                </Link>
                <Link
                  to="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                >
                  {t(locale, "nav.pricing")}
                </Link>
                {isAuthenticated && (
                  <Link
                    to="/my-posts"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border-2 border-ink bg-white px-4 py-3 font-body font-medium text-ink"
                  >
                    {t(locale, "nav.myPosts")}
                  </Link>
                )}
                <Link
                  to="/create"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border-2 border-ink bg-coral px-4 py-3 font-body font-medium text-ink"
                >
                  <Plus className="mr-2 inline h-4 w-4" />
                  {t(locale, "nav.createPost")}
                </Link>
              </div>
              <div className="mt-auto border-t-2 border-ink p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-ink-muted" />
                  <div className="flex gap-1">
                    {(["lv", "ru", "en"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLocale(l)}
                        className={`px-2 py-1 font-body text-sm font-medium ${
                          locale === l
                            ? "rounded bg-coral text-ink"
                            : "text-ink-muted"
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-light">
                        <User className="h-5 w-5 text-coral" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-body text-sm font-medium text-ink">
                        {user.name}
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { navigate("/settings"); setMobileOpen(false); }}
                          className="font-body text-xs text-ink-light hover:text-ink"
                        >
                          {t(locale, "nav.settings")}
                        </button>
                        <button
                          onClick={() => { logout(); setMobileOpen(false); }}
                          className="font-body text-xs text-ink-light hover:text-coral"
                        >
                          {t(locale, "nav.logout")}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => { navigate("/login"); setMobileOpen(false); }}
                    className="w-full rounded-md border-2 border-ink bg-coral font-body font-medium text-ink hover:bg-coral-hover"
                  >
                    {t(locale, "nav.login")}
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
```

Key changes from original:
1. Added `scrolled` state + scroll `useEffect`
2. Nav className: conditionally adds `navbar-scrolled` class (triggers blur CSS) vs `bg-cream`
3. Logo dot: changed from `className="...bg-coral"` to `style={{ background: 'var(--coral)' }}` so it follows seasonal variable

- [ ] **Step 2: Verify in browser**

With dev server running, open `http://localhost:5173`. Scroll down — navbar should become slightly translucent with blur. Logo dot should match the seasonal accent colour. Top 2px line should be visible.

Expected: Scrolled navbar is frosted/blurred. Logo dot is spring-green (#6BAD6A) in May.

- [ ] **Step 3: Commit**

```bash
git add src/components/Navbar.tsx
git commit -m "feat: navbar scroll blur + seasonal logo dot

- Adds scrolled state with passive scroll listener
- navbar-scrolled CSS class applies color-mix blur when scrollY > 20px
- Logo dot uses var(--coral) inline style to follow season
- Transition duration 300ms for smooth effect

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Home Hero — Search-First + SeasonalParticles + Framer Motion

**Files:**
- Modify: `src/pages/Home.tsx` (hero section only — the rest of the file stays identical)

This task replaces only the `<section>` hero block (from `{/* Hero Section */}` to the closing `</section>` after the scroll indicator).

- [ ] **Step 1: Add imports to `src/pages/Home.tsx`**

At the top of the file, after existing imports, add:

```tsx
import { motion } from "framer-motion";
import SeasonalParticles from "@/components/SeasonalParticles";
```

Also add `Home as HomeIcon, Truck, Wrench, Flower2, Baby, Monitor` to the existing lucide-react import. The file already imports some of these — check and add only missing ones. The complete lucide import should include at minimum:

```tsx
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
```

- [ ] **Step 2: Add QUICK_CATEGORIES constant and heroSearch state**

After the existing `AnimatedCounter` and `MarqueeStrip` function definitions, before the `export default function Home()`, add:

```tsx
const QUICK_CATEGORIES = [
  { key: "repairs",   Icon: Wrench    },
  { key: "it",        Icon: Monitor   },
  { key: "garden",    Icon: Flower2   },
  { key: "moving",    Icon: Truck     },
  { key: "household", Icon: HomeIcon  },
  { key: "childcare", Icon: Baby      },
] as const;
```

Inside the `Home` component, after existing `useState` declarations, add:

```tsx
const [heroSearch, setHeroSearch] = useState("");

const handleHeroSearch = (e: React.FormEvent) => {
  e.preventDefault();
  const q = heroSearch.trim();
  navigate(q ? `/browse?search=${encodeURIComponent(q)}` : "/browse");
};
```

- [ ] **Step 3: Replace the hero `<section>` block**

Find the block starting with `{/* Hero Section */}` and ending with `</section>` (after the scroll indicator `</div>`). Replace the entire `<section>...</section>` with:

```tsx
      {/* Hero Section */}
      <section
        className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 pb-16 pt-20 text-center"
        style={{
          background: 'linear-gradient(to bottom, var(--season-hero-from, #FBF6EE), var(--season-hero-to, #F5F1E8))',
        }}
      >
        {/* Seasonal particles */}
        <SeasonalParticles />

        {/* Decorative shapes — keep subtle */}
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
```

- [ ] **Step 4: Verify in browser**

Open `http://localhost:5173`. Expected:
- Hero has gradient background (spring: green-tinted, or whichever season)
- Seasonal particles visible drifting
- Headline words animate in one by one
- Search bar is center-aligned, full width, prominent
- 6 category pills below search bar
- Stats count up on scroll
- Scroll indicator bounces at bottom

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat: search-first hero with SeasonalParticles + Framer Motion

- Replaces two-button hero with centered search bar + category pills
- Word-by-word headline reveal using Framer Motion stagger
- SeasonalParticles integrated inside overflow-hidden hero
- Seasonal gradient background via CSS vars
- Category quick-links: repairs, it, garden, moving, household, childcare
- Stats row with AnimatedCounter preserved

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Home Section Polish + PostCard Update + Images Prop

**Files:**
- Modify: `src/types/post.ts` (add images field)
- Modify: `src/components/PostCard.tsx` (hard shadow, image slot, scroll-in)
- Modify: `src/pages/Home.tsx` (marquee colour, How It Works, grid/list toggle, pass images)
- Modify: `src/pages/Browse.tsx` (pass images to featured PostCards)
- Modify: `src/pages/Category.tsx` (pass images)
- Modify: `src/pages/PostDetail.tsx` (pass images to related PostCards)

- [ ] **Step 1: Add `images` to PostWithProfile type**

Replace entire `src/types/post.ts`:

```ts
import type { Post, Profile } from "@db/schema";

export interface PostWithProfile {
  post: Post;
  profile: Profile | undefined;
  isBusiness?: boolean;
  images?: string[];
}
```

- [ ] **Step 2: Update PostCard component**

Replace entire `src/components/PostCard.tsx` with:

```tsx
import { Link } from "react-router";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { CATEGORIES } from "@/lib/categories";
import type { Post, Profile } from "@db/schema";
import {
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
  MapPin,
  Calendar,
  Wallet,
  Eye,
  ShieldCheck,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};

interface PostCardProps {
  post: Post;
  profile?: Profile | null;
  isBusiness?: boolean;
  images?: string[];
}

export default function PostCard({ post, profile, isBusiness, images }: PostCardProps) {
  const { locale } = useLocale();

  const category = CATEGORIES.find((c) => c.key === post.category);
  const CategoryIcon = category ? iconMap[category.icon] : MoreHorizontal;
  const isNeed = post.type === "need";
  const heroImage = images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Link
        to={`/post/${post.id}`}
        className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white transition-all duration-200 hover:-translate-y-1 hover:[box-shadow:4px_4px_0_var(--ink)]"
      >
        {/* Hero image — only if post has images */}
        {heroImage && (
          <div className="aspect-video w-full overflow-hidden border-b-2 border-ink">
            <img
              src={heroImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}

        {/* Left accent stripe */}
        <div
          className={`absolute left-0 top-0 h-full w-1 rounded-l-2xl ${isNeed ? "bg-need" : "bg-sage"}`}
        />

        {post.filled && (
          <div className="absolute right-3 top-3 z-10 rounded-full border-2 border-ink bg-sage px-2.5 py-0.5 font-body text-xs font-medium text-ink">
            ✓ {t(locale, "postDetail.statusFilled")}
          </div>
        )}

        <div className="flex flex-1 flex-col p-5 pl-6">
          {/* Top row */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase ${
                isNeed
                  ? "border border-need bg-need-light text-need"
                  : "border border-sage bg-sage-light text-sage"
              }`}
            >
              {isNeed ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border-1.5 border-ink bg-mustard-light px-2.5 py-1 font-body text-xs font-medium uppercase tracking-wide text-ink">
              <CategoryIcon className="h-3 w-3" />
              {t(locale, `categories.${post.category}` as never)}
            </span>
            {post.city && (
              <span className="inline-flex items-center gap-1 font-body text-xs text-ink-light">
                <MapPin className="h-3 w-3" />
                {t(locale, `cities.${post.city}` as never)}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mb-2 font-body text-lg font-bold text-ink line-clamp-2">
            {post.title}
          </h3>

          {/* Description */}
          {post.description && (
            <p className="mb-4 font-body text-sm text-ink-muted line-clamp-2">
              {post.description}
            </p>
          )}

          {/* Bottom row */}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            {post.budgetText && (
              <span className="inline-flex items-center gap-1 font-body text-sm text-ink">
                <Wallet className="h-3.5 w-3.5 text-coral" />
                {post.budgetText}
              </span>
            )}
            {post.whenText && (
              <span className="inline-flex items-center gap-1 font-body text-sm text-ink-muted">
                <Calendar className="h-3.5 w-3.5" />
                {post.whenText}
              </span>
            )}
            {post.viewCount > 0 && (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-ink-light">
                <Eye className="h-3 w-3" />
                {post.viewCount}
              </span>
            )}
            {profile?.phoneVerified && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-sage bg-sage-light px-1.5 py-0.5 font-body text-[10px] font-medium text-sage">
                <ShieldCheck className="h-3 w-3" />
              </span>
            )}
            {isBusiness && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold text-cream">
                🏢
              </span>
            )}
            {post.boostType === "featured" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-coral bg-coral/10 px-1.5 py-0.5 font-mono text-[10px] text-coral">
                ⭐
              </span>
            )}
            {post.boostType === "urgent" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-red-400 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-600 uppercase">
                {locale === "lv" ? "Steidzams" : locale === "ru" ? "Срочно" : "Urgent"}
              </span>
            )}
            <span className="ml-auto font-mono text-xs text-ink-light">
              {new Date(post.createdAt).toLocaleDateString(
                locale === "lv" ? "lv-LV" : locale === "ru" ? "ru-RU" : "en-GB"
              )}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
```

Key changes: `motion.div` wrapper with `whileInView`, `images?: string[]` prop + hero image slot, `hover:[box-shadow:4px_4px_0_var(--ink)]` hard shadow replacing `hover:shadow-float`.

- [ ] **Step 3: Update call sites — pass `images` prop**

**`src/pages/Home.tsx`** — update both PostCard call sites:

```tsx
// Featured posts (already maps { post, profile, isBusiness }):
{featuredPosts.map(({ post, profile, isBusiness, images }) => (
  <PostCard key={`hf-${post.id}`} post={post} profile={profile} isBusiness={isBusiness} images={images} />
))}

// Latest posts:
{posts.map((item: PostWithProfile) => (
  <PostCard key={item.post.id} post={item.post} profile={item.profile} isBusiness={item.isBusiness} images={item.images} />
))}
```

**`src/pages/Browse.tsx`** — update featured PostCards:
```tsx
{featuredPosts.map(({ post, profile, isBusiness, images }) => (
  <PostCard key={`featured-${post.id}`} post={post} profile={profile} isBusiness={isBusiness} images={images} />
))}

// And regular posts:
{posts.map(({ post, profile, isBusiness, images }) => (
  <PostCard key={post.id} post={post} profile={profile} isBusiness={isBusiness} images={images} />
))}
```

**`src/pages/Category.tsx`** — update PostCard:
```tsx
{posts.map(({ post, profile, isBusiness, images }) => (
  <PostCard key={post.id} post={post} profile={profile} isBusiness={isBusiness} images={images} />
))}
```

**`src/pages/PostDetail.tsx`** — update related posts:
```tsx
<PostCard key={r.post.id} post={r.post} profile={r.profile} isBusiness={r.isBusiness} images={r.images} />
```

- [ ] **Step 4: Update remaining Home.tsx sections**

**MarqueeStrip** — change `fill-coral text-coral` to use CSS variable:

```tsx
// In MarqueeStrip, find the Star element:
// BEFORE:
<Star className="h-4 w-4 fill-coral text-coral" />
// AFTER:
<Star className="h-4 w-4" style={{ fill: 'var(--coral)', color: 'var(--coral)' }} />
```

**How It Works** — update numbered circles (find the `{step.num}` div):

```tsx
// BEFORE:
<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-white font-display text-2xl font-bold text-ink">
  {step.num}
</div>
// AFTER:
<div
  className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink font-display text-2xl font-bold transition-colors duration-500"
  style={{ background: 'var(--coral-light)', color: 'var(--coral)' }}
>
  {step.num}
</div>
```

**Latest Posts — add grid/list view toggle:**

Add `const [cardView, setCardView] = useState<"grid" | "list">("grid");` with other state declarations at the top of the Home component.

Find the Latest Posts section header row:
```tsx
// BEFORE the "View All" section, modify the header row to include toggle:
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
          {f === "all" ? t(locale, "latestPosts.all") : f === "need" ? t(locale, "latestPosts.need") : t(locale, "latestPosts.offer")}
        </button>
      ))}
    </div>
  </div>
</div>
```

Update the posts grid to respect `cardView`:
```tsx
// BEFORE:
<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
  {posts.map((item: PostWithProfile) => (
    <PostCard key={item.post.id} post={item.post} profile={item.profile} isBusiness={item.isBusiness} images={item.images} />
  ))}
</div>

// AFTER:
<div className={cardView === "grid" ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col gap-3"}>
  {posts.map((item: PostWithProfile) => (
    <PostCard key={item.post.id} post={item.post} profile={item.profile} isBusiness={item.isBusiness} images={item.images} />
  ))}
</div>
```

- [ ] **Step 5: Verify in browser**

Open `http://localhost:5173`. Check:
- PostCards animate in as you scroll down
- Hovering a card gives a hard 4px offset shadow (not blur)
- How It Works circles are seasonal colour
- Grid/List toggle works in Latest Posts section
- No TypeScript errors in terminal

- [ ] **Step 6: Commit**

```bash
git add src/types/post.ts src/components/PostCard.tsx src/pages/Home.tsx src/pages/Browse.tsx src/pages/Category.tsx src/pages/PostDetail.tsx
git commit -m "feat: PostCard redesign + section polish + images prop

- PostCard: Framer Motion whileInView scroll-in animation
- PostCard: hard 4px offset shadow on hover (editorial style)
- PostCard: image slot for future image upload display
- PostWithProfile type: add images?: string[]
- All call sites updated to pass images prop
- Home How It Works: seasonal colour circles
- Home marquee: seasonal star colour via CSS var
- Home Latest Posts: grid/list view toggle

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Browse — Sidebar Filters Desktop + Mobile Sheet

**Files:**
- Modify: `src/pages/Browse.tsx`

The Browse page already has all the filter logic and state. This task restructures the layout: filters move from a horizontal top strip into a sticky 280px left sidebar on desktop, and a bottom Sheet drawer on mobile. All existing state, tRPC queries, and filter logic remain unchanged.

- [ ] **Step 1: Add mobile filter Sheet state and SlidersHorizontal import**

At the top of Browse.tsx, add to the lucide imports:
```tsx
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
  SlidersHorizontal,  // ← add this
} from "lucide-react";
```

Add `CATEGORIES` icon map (same as PostCard — needed for category grid in sidebar):
```tsx
import {
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

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Home, Truck, Wrench, Flower2, Car, Baby, Cat, Monitor, GraduationCap, MoreHorizontal,
};
```

Add Sheet import:
```tsx
import { Sheet, SheetContent } from "@/components/ui/sheet";
```

Inside the `Browse` component, add state:
```tsx
const [showMobileFilters, setShowMobileFilters] = useState(false);
```

- [ ] **Step 2: Extract filter JSX into a local `FilterPanel` component**

Define this component INSIDE the `Browse` function (it closes over all state):

```tsx
  // ── Local filter panel (used in both sidebar and mobile sheet) ──
  function FilterPanel({ onClose }: { onClose?: () => void }) {
    return (
      <div className="space-y-6">
        {/* Search */}
        <div>
          <label className="mb-2 block font-body text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(locale, "browse.searchPlaceholder")}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder={t(locale, "browse.searchPlaceholder")}
              className="h-10 w-full rounded-xl border-2 border-ink bg-white pl-9 pr-3 font-body text-sm focus:border-coral focus:outline-none"
            />
          </div>
        </div>

        {/* Type */}
        <div>
          <label className="mb-2 block font-body text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(locale, "browse.typeAll")}
          </label>
          <div className="flex gap-2">
            {(["all", "need", "offer"] as const).map((tVal) => (
              <button
                key={tVal}
                onClick={() => { setType(tVal); setPage(0); onClose?.(); }}
                className={`flex-1 rounded-xl border-2 py-2 font-body text-sm font-medium transition ${
                  type === tVal
                    ? "border-ink bg-coral text-ink"
                    : "border-ink-light bg-white text-ink-muted hover:border-ink"
                }`}
              >
                {tVal === "all" ? t(locale, "browse.typeAll") : tVal === "need" ? t(locale, "browse.typeNeed") : t(locale, "browse.typeOffer")}
              </button>
            ))}
          </div>
        </div>

        {/* Category grid */}
        <div>
          <label className="mb-2 block font-body text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(locale, "browse.category")}
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setCategory("all"); setPage(0); }}
              className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 font-body text-xs transition ${
                category === "all" ? "border-ink bg-ink text-cream" : "border-ink-light bg-white text-ink hover:border-ink"
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
                  className={`flex items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 font-body text-xs transition ${
                    category === cat.key
                      ? "border-ink bg-coral text-ink"
                      : "border-ink-light bg-white text-ink hover:border-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t(locale, `categories.${cat.key}` as never)}
                </button>
              );
            })}
          </div>
        </div>

        {/* City */}
        <div>
          <label className="mb-2 block font-body text-xs font-bold uppercase tracking-wide text-ink-muted">
            {t(locale, "browse.city")}
          </label>
          <Select value={city} onValueChange={(v) => { setCity(v); setPage(0); }}>
            <SelectTrigger className="w-full rounded-xl border-2 border-ink bg-white font-body text-sm">
              <MapPin className="mr-2 h-4 w-4 text-ink-muted" />
              <SelectValue placeholder={t(locale, "browse.city")} />
            </SelectTrigger>
            <SelectContent className="border-2 border-ink">
              <SelectItem value="all">{t(locale, "browse.city")}</SelectItem>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>{t(locale, `cities.${c}` as never)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div>
          <label className="mb-2 block font-body text-xs font-bold uppercase tracking-wide text-ink-muted">
            Kārtot
          </label>
          <Select value={sort} onValueChange={(v) => { setSort(v as "newest" | "oldest"); setPage(0); }}>
            <SelectTrigger className="w-full rounded-xl border-2 border-ink bg-white font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-2 border-ink">
              <SelectItem value="newest">{t(locale, "browse.sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t(locale, "browse.sortOldest")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Save search */}
        {activeFiltersCount > 0 && isAuthenticated && (
          <button
            onClick={handleOpenSaveAlert}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-mustard-light px-3 py-2 font-body text-sm font-medium text-ink hover:bg-mustard transition"
          >
            <Bell className="h-3.5 w-3.5" />
            {t(locale, "browse.saveAlert")}
          </button>
        )}

        {/* Clear */}
        {activeFiltersCount > 0 && (
          <button
            onClick={() => { clearFilters(); onClose?.(); }}
            className="flex w-full items-center justify-center gap-1 font-body text-sm text-coral hover:text-coral-hover"
          >
            <X className="h-4 w-4" />
            {t(locale, "browse.clear")}
          </button>
        )}
      </div>
    );
  }
```

- [ ] **Step 3: Replace the Browse return JSX**

Replace the entire `return (...)` block with:

```tsx
  return (
    <div className="min-h-screen noise-bg">
      <div className="mx-auto max-w-7xl px-4 py-8">

        {/* Top bar */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink md:text-4xl">
              {t(locale, "browse.title")}
            </h1>
            <p className="mt-1 font-body text-sm text-ink-muted">
              {totalCount !== undefined
                ? t(locale, "browse.showing", { count: totalCount })
                : t(locale, "browse.showing", { count: posts.length })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mobile filter button */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex items-center gap-2 rounded-xl border-2 border-ink bg-white px-3 py-2 font-body text-sm font-medium md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtri
              {activeFiltersCount > 0 && (
                <span
                  className="rounded-full px-1.5 py-0.5 font-mono text-xs text-ink"
                  style={{ background: 'var(--coral)' }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* View toggle */}
            <div className="flex overflow-hidden rounded-xl border-2 border-ink">
              <button
                onClick={() => setViewMode("map")}
                className={`flex items-center gap-1.5 px-3 py-2 font-body text-sm font-medium transition ${
                  viewMode === "map" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"
                }`}
              >
                <Map className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, "browse.viewMap")}</span>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1.5 px-3 py-2 font-body text-sm font-medium transition ${
                  viewMode === "list" ? "bg-ink text-cream" : "bg-white text-ink hover:bg-cream"
                }`}
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">{t(locale, "browse.viewList")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile active filter pills */}
        {activeFiltersCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 md:hidden">
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

        {/* Save alert inline form */}
        {showSaveAlert && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-ink bg-mustard-light p-4">
            <Bell className="h-4 w-4 shrink-0 text-ink" />
            <input
              value={alertLabel}
              onChange={(e) => setAlertLabel(e.target.value)}
              placeholder={t(locale, "browse.alertLabelPlaceholder")}
              className="h-9 flex-1 min-w-[180px] rounded-lg border-2 border-ink bg-white px-3 font-body text-sm focus:border-coral focus:outline-none"
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
              className="flex items-center gap-1.5 rounded-lg border-2 border-ink bg-ink px-4 py-1.5 font-body text-sm font-medium text-cream hover:bg-ink/80"
            >
              <Check className="h-3.5 w-3.5" />
              {t(locale, "browse.alertConfirm")}
            </button>
            <button onClick={() => setShowSaveAlert(false)} className="text-ink-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main layout: sidebar + content */}
        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden w-[280px] shrink-0 md:block">
            <div className="sticky top-24 rounded-2xl border-2 border-ink bg-white p-5">
              <FilterPanel />
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Featured Posts */}
            {featuredPosts.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-3 font-display text-lg font-bold text-ink">
                  {t(locale, "browse.featured")}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {featuredPosts.map(({ post, profile, isBusiness, images }) => (
                    <PostCard key={`featured-${post.id}`} post={post} profile={profile} isBusiness={isBusiness} images={images} />
                  ))}
                </div>
                <div className="mt-4 border-b-2 border-ink-light" />
              </div>
            )}

            {/* Results */}
            {viewMode === "list" ? (
              <>
                {isLoading ? (
                  <div className="grid gap-6 sm:grid-cols-2">
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
                  <div className="grid gap-6 sm:grid-cols-2">
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
          </div>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => navigate("/create")}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-ink bg-coral px-4 py-3 font-body text-sm font-medium text-ink shadow-card-coral transition hover:-translate-y-0.5 hover:bg-coral-hover md:hidden"
      >
        <Plus className="h-4 w-4" />
        {t(locale, "nav.createPost")}
      </button>

      {/* Mobile filter Sheet */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl border-t-2 border-ink bg-cream p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Filtri</h2>
            <button
              onClick={() => setShowMobileFilters(false)}
              className="rounded-lg border-2 border-ink p-1.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <FilterPanel onClose={() => setShowMobileFilters(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
```

- [ ] **Step 4: Verify in browser**

Desktop (`≥ 768px`): sidebar visible on left, filters grouped with icons. Selecting a category highlights it and filters posts immediately.

Mobile (`< 768px`): "Filtri" button top-right. Tapping opens bottom Sheet. Filter pills show active filters above the grid.

Map toggle still works. Pagination still works.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Browse.tsx
git commit -m "feat: Browse sidebar layout for desktop + mobile Sheet drawer

- Desktop: 280px sticky sidebar with grouped filter panel
- Mobile: top Filtri button opens bottom Sheet (85vh)
- FilterPanel component extracted (renders in both sidebar + sheet)
- Category grid with icons replaces dropdown
- Active filter chips on mobile
- All existing filter state/URL sync/pagination unchanged

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Footer Redesign — 4-Column Layout

**Files:**
- Modify: `src/components/Footer.tsx`

- [ ] **Step 1: Replace Footer with 4-column layout**

Replace entire `src/components/Footer.tsx` with:

```tsx
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";

export default function Footer() {
  const { locale, setLocale } = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="noise-bg" style={{ borderTop: '2px solid var(--coral)' }}>
      <div className="border-t-2 border-ink bg-cream-dark">
        <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">

            {/* Col 1: Brand */}
            <div>
              <Link to="/" className="mb-3 flex items-center gap-1">
                <span className="font-display text-xl font-bold italic text-ink">jobsy</span>
                <span
                  className="inline-block h-2 w-2 rounded-full transition-colors duration-500"
                  style={{ background: 'var(--coral)' }}
                />
              </Link>
              <p className="mb-4 font-body text-sm text-ink-muted">
                {t(locale, "footer.tagline")}
              </p>
              <div className="flex gap-1">
                {(["lv", "ru", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`rounded-md border-2 px-2.5 py-1 font-body text-xs font-medium transition ${
                      locale === l
                        ? "border-ink bg-coral text-ink"
                        : "border-ink-light bg-transparent text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Col 2: Browse */}
            <div>
              <h4 className="mb-3 font-body text-xs font-bold uppercase tracking-wider text-ink">
                {t(locale, "nav.browse")}
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/browse" className="font-body text-sm text-ink-muted hover:text-ink">
                    {locale === "lv" ? "Visi sludinājumi" : locale === "ru" ? "Все объявления" : "All listings"}
                  </Link>
                </li>
                <li>
                  <Link to="/browse?type=need" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "browse.typeNeed")}
                  </Link>
                </li>
                <li>
                  <Link to="/browse?type=offer" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "browse.typeOffer")}
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "nav.pricing")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Account */}
            <div>
              <h4 className="mb-3 font-body text-xs font-bold uppercase tracking-wider text-ink">
                {locale === "lv" ? "Konts" : locale === "ru" ? "Аккаунт" : "Account"}
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "nav.login")}
                  </Link>
                </li>
                <li>
                  <Link to="/my-posts" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "nav.myPosts")}
                  </Link>
                </li>
                <li>
                  <Link to="/create" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "nav.createPost")}
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "nav.settings")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal */}
            <div>
              <h4 className="mb-3 font-body text-xs font-bold uppercase tracking-wider text-ink">
                {locale === "lv" ? "Juridiskais" : locale === "ru" ? "Правовое" : "Legal"}
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/privacy" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "footer.privacy")}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="font-body text-sm text-ink-muted hover:text-ink">
                    {t(locale, "footer.terms")}
                  </Link>
                </li>
                <li>
                  <a href="mailto:info@jobsy.lv" className="font-body text-sm text-ink-muted hover:text-ink">
                    info@jobsy.lv
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-ink-light pt-6 text-center">
            <p className="font-body text-xs text-ink-light">
              © {year} jobsy.lv — {t(locale, "footer.tagline")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

Key changes:
- Outer `<footer>` gets a 2px top border in `var(--coral)` (seasonal)
- 4 equal columns: Brand (with lang switcher), Browse, Account, Legal
- Brand column has the seasonal dot logo
- Dynamic year from `new Date().getFullYear()`
- Removed the old category-links SEO row (those are on category pages)

- [ ] **Step 2: Verify in browser**

Scroll to bottom of `http://localhost:5173`. Expected:
- Top border of footer is seasonal colour (spring green in May)
- 4 columns on desktop
- 2 columns on tablet, 1 column on mobile
- Language switcher in brand column works
- All links navigate correctly

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "feat: Footer redesign — 4-column layout with seasonal top border

- Brand column: logo + tagline + language switcher
- Browse column: all listings, need, offer, pricing
- Account column: login, my posts, create, settings
- Legal column: privacy, terms, contact email
- Seasonal top border via var(--coral)
- Dynamic year from JS Date

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Deploy + Smoke Test

**Files:** None (deploy only)

- [ ] **Step 1: Run full build to catch TypeScript errors**

```bash
cd C:\Users\Toms\Projects\jobsy
npm run build
```

Expected: `✓ built in Xs` with no TypeScript errors. If errors appear, fix them before deploying.

- [ ] **Step 2: Check all pages work on dev server**

With `npm run dev` running, verify these pages render without console errors:
- `http://localhost:5173/` — Home hero with search, category pills, particles, seasonal colour
- `http://localhost:5173/browse` — Sidebar visible on desktop, FAB visible on mobile
- `http://localhost:5173/post/[any-id]` — PostDetail renders normally
- `http://localhost:5173/pricing` — Pricing page unaffected

- [ ] **Step 3: Test hero search flow**

Type "elektriķis" in the homepage search bar → click Meklēt. Should navigate to `/browse?search=elektriķis` with results filtered. Verify Browse sidebar shows the search term populated.

- [ ] **Step 4: Test season by temporarily changing month in getSeason**

In `src/lib/season-context.tsx`, temporarily change `getSeason()` to return `'winter'`:
```tsx
export function getSeason(): Season {
  return 'winter'; // temp test
}
```
Reload browser. Check: accent colours shift to steel blue, top line is blue, logo dot is blue, hero gradient is cool blue-tinted, snowflake particles drift down.

Revert after confirming:
```tsx
export function getSeason(): Season {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}
```

- [ ] **Step 5: Push to main to trigger Railway deploy**

```bash
git push origin main
```

Railway auto-deploys on push. Monitor at Railway dashboard.

- [ ] **Step 6: Smoke test production**

Open `https://jobsy.lv`. Verify:
- Seasonal accent line visible at top of page
- Hero has gradient background matching season
- PostCards animate in on scroll
- Browse sidebar shows on desktop
- Footer has 4 columns with seasonal top border
- No JS console errors

- [ ] **Step 7: Commit completion**

```bash
git commit --allow-empty -m "chore: website redesign complete — 4-season adaptive theme live

Deployed: 4-season system, search-first hero, browse sidebar,
PostCard hard shadow, footer 4-col, navbar blur

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin main
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ SeasonProvider + getSeason → Task 1
- ✅ CSS vars (spring/summer/autumn/winter) → Task 1
- ✅ SeasonalParticles (8 per season, 4 animations) → Task 2
- ✅ Navbar scroll blur → Task 1 (CSS) + Task 3 (component)
- ✅ Seasonal logo dot → Task 3
- ✅ Top 2px seasonal accent line → Task 1 (body::before)
- ✅ Hero search-first layout → Task 4
- ✅ Framer Motion word reveal → Task 4
- ✅ Category pills → Task 4
- ✅ PostCard hard shadow → Task 5
- ✅ PostCard scroll-in animation → Task 5
- ✅ PostCard image slot → Task 5
- ✅ images prop at all call sites → Task 5
- ✅ MarqueeStrip seasonal colour → Task 5
- ✅ How It Works seasonal circles → Task 5
- ✅ Home grid/list toggle → Task 5
- ✅ Browse sidebar desktop → Task 6
- ✅ Browse mobile Sheet drawer → Task 6
- ✅ Footer 4-column → Task 7
- ✅ Deploy + smoke test → Task 8

**No placeholders found.**

**Type consistency:** `PostWithProfile.images?: string[]` defined in Task 5 Step 1, used in Tasks 5, 6. `PostCardProps.images?: string[]` defined in Task 5 Step 2, passed in all call sites in Task 5 Step 3. `Season` type defined in `season-context.tsx` Task 1, consumed by `SeasonalParticles` in Task 2. All consistent.
