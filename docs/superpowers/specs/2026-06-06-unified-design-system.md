# Unified Design System — jobsy.lv

**Date:** 2026-06-06
**Goal:** The site grew feature-by-feature; spacing, radii, elevation, page titles, and page shells drifted per page. Lock one system and apply it on every page so the whole site reads with the same rhythm. Brand (Emerald Executive palette, Playfair Display headline, Geist body, coral accent) is unchanged — this is consistency, not a re-skin.

## Locked scales

**Page shell** (every routed page):
- Outer: `min-h-screen bg-surface-off-white`
- Container: `mx-auto w-full max-w-container-max-width px-margin-mobile md:px-margin-desktop`
- Vertical: `py-10 md:py-14` for standard pages. Auth pages stay centered.

**Type hierarchy:**
- Page title (H1, interior pages): `font-headline text-3xl font-bold text-on-surface md:text-4xl`
- Page subtitle: `mt-2 font-body text-body-md text-on-surface-variant md:text-body-lg`
- Section heading (H2): `font-headline text-headline-md font-bold text-on-surface`
- Home hero keeps its larger display size (the one intentional exception).

**Radius scale:**
- Cards / panels / modals: `rounded-2xl`
- Inputs / buttons / tiles / images: `rounded-xl`
- Chips / badges / pills: `rounded-lg` (or `rounded-full` for pills)

**Elevation:**
- Resting card: `shadow-card`
- Hover card: `shadow-card-hover`
- Emphasis only (auth card, "most popular" tier): `shadow-xl`
- Retire ad-hoc `shadow-lg` / `shadow-float` where they create inconsistency (keep float only for the genuinely-floating FAB/back-to-top).

**Spacing rhythm:**
- Between major sections: `py-12 md:py-16` (or the standard page `py-10 md:py-14` band).
- Card padding: `p-6` (panels), `p-5` (compact cards).
- Stack gaps: `gap-4` (default), `gap-6` (between cards in a grid).

**Buttons (already mostly consistent + a11y-correct):**
- Primary CTA: `h-12 rounded-xl bg-accent-coral text-on-surface font-bold` (dark-on-coral, WCAG-pass).
- Secondary: `h-12 rounded-xl border border-outline-variant bg-white text-on-surface`.
- Primary CTAs wrapped in `<MagneticButton>` where they're the main page action.

**Premium effects coverage (consistency):**
- Card grids (posts, categories, tiers, boosts) → `<TiltCard>`.
- Primary page CTAs → `<MagneticButton>`.
- Long pages → scroll reveals via `useScrollReveal`.

## Approach

Introduce two shared primitives to enforce the shell + header once, then migrate pages to them:
- `<PageShell>` — outer bg + container + padding.
- `<PageHeader title subtitle action>` — the standard title/subtitle row.
- A few `@layer components` utility classes in index.css for `.panel` (card) if helpful.

Migrate page by page (verify each render): Pricing, Browse, Category, PostDetail, CreatePost, MyPosts, Settings, UserProfile, Login/Forgot/Reset, Success, Terms, Privacy, NotFound, Admin. Home hero stays; align its lower sections to the rhythm.

## Out of scope
- No palette/font changes. No new features. No copy rewrites.
- No layout re-architecture — same content, unified shell/scale.

## Success
- Page titles, card radii, section rhythm, page shells identical across all pages.
- No regressions: every page renders, 0 new console errors, responsive intact.
