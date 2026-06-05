# Homepage Premium Pass — Design Spec

**Date:** 2026-06-05
**Status:** Approved (direction), ready for implementation plan
**Goal:** Elevate the jobsy.lv homepage to a "$100k", Stripe-style-depth feel — motion-led with ONE lightweight WebGL hero moment. Fast, premium, mobile-safe. No regression to the existing Emerald Executive design system.

---

## Decisions (locked with user)

- **3D approach:** Motion-led + one hero WebGL moment. NOT full Three.js everywhere (perf trap on a job board).
- **Scope:** Homepage first. Prove the direction, then roll the reusable system to Browse / PostDetail / Pricing in later passes.
- **Aesthetic:** Stripe-style depth — animated gradient mesh, soft layered depth, glossy/glass cards, smooth scroll-reveal, magnetic interactions.
- **Reference tells to hit:** animated gradient mesh background, magnetic CTAs, 3D tilt cards, parallax depth between layers/sections, buttery smooth scroll.
- **21st.dev:** Magic MCP now fixed (registered in `~/.claude.json`, user scope). Post-restart it is available — use it to generate candidate components (hero, cards) and graft the best pieces into the system below.

## Stack context (do not re-derive)

- React 19 + Vite + TypeScript, Tailwind v3 + shadcn/ui, Framer Motion already installed.
- Tokens: `primary #003527`, emerald scale, `accent-coral #FF7F50` / `accent-coral-hover #e56a3a`, `success-emerald #059669`, cream/off-white surfaces. Fonts: Playfair Display (headline), Geist (body).
- Home component: `src/pages/Home.tsx` (single file, ~580 lines). Already has: word-by-word headline reveal, `AnimatedCounter`, gradient hero with blurred orbs + noise, scroll-reveal How-It-Works, hover-lift category grid, featured cards, city map, latest posts, CTA + referral strip.
- Build deploys via push to `main` → Railway nixpacks (slow, ~15 min).

## New dependencies (light, lazy-loaded)

- `gsap` (+ ScrollTrigger) — scroll choreography, pinned/parallax sections.
- `lenis` — smooth scroll (RAF-driven).
- `ogl` (~30kb) — the single hero WebGL gradient-mesh canvas. Chosen over three.js/r3f for size. Must lazy-load (dynamic import) so it never blocks LCP.

All three dynamically imported; first paint must not wait on them.

## Components (isolated, reusable, drop-in for other pages later)

1. **`<HeroCanvas>`** (`src/components/premium/HeroCanvas.tsx`)
   - WebGL emerald gradient mesh, slow flow, subtle cursor parallax.
   - Props: none required; self-contained.
   - Fallback: renders the current static CSS gradient when (a) `prefers-reduced-motion`, (b) mobile/touch or low DPR, (c) WebGL unavailable, (d) module fails to load.
   - Must clean up RAF + GL context on unmount.

2. **`<MagneticButton>`** (`src/components/premium/MagneticButton.tsx`)
   - Wraps a button/link; translates toward cursor within a radius, springs back. Disabled on touch + reduced-motion.
   - Used for coral primary CTAs (hero search submit, CTA banner button).

3. **`<TiltCard>`** (`src/components/premium/TiltCard.tsx`)
   - rotateX/rotateY toward cursor + glossy sheen highlight. Disabled on touch + reduced-motion.
   - Wraps category tiles and featured `PostCard`s (composition, not a PostCard rewrite).

4. **`useLenis()`** (`src/hooks/useLenis.ts`) — initializes Lenis once at app root (or Home mount), exposes nothing; respects reduced-motion (no-op).

5. **`useScrollReveal()`** / GSAP helpers (`src/hooks/useScrollReveal.ts`) — thin wrapper over ScrollTrigger for staggered section reveals + parallax offsets. Reduced-motion → elements rendered visible, no animation.

## Section-by-section changes (Home.tsx)

1. **Hero** — replace static gradient + blurred orbs with `<HeroCanvas>` behind existing content. Keep word-reveal headline. Add mouse-parallax depth: badge / headline / search / stats move at slightly different rates. Search bar gets glass + focus glow. Coral submit → `<MagneticButton>`.
2. **Category grid** — wrap tiles in `<TiltCard>`; stagger-in via ScrollTrigger; keep hover lift + count.
3. **Featured cards** — wrap in `<TiltCard>`; glass depth + shadow bloom on hover.
4. **How It Works** — keep step reveal; GSAP-draw the dashed connector line on scroll; counters sync to scroll.
5. **Section depth** — soft gradient-mesh dividers between cream/white sections for continuous depth (CSS, cheap).
6. **CTA banner** — coral button → `<MagneticButton>`; keep emerald gradient + orb.

## Guardrails (these keep it premium, not gimmicky)

- `prefers-reduced-motion: reduce` → ALL motion off; static, fully usable page.
- Mobile / touch / low-DPR → WebGL downgraded to CSS gradient; tilt + magnetic disabled.
- Lazy-load gsap/lenis/ogl; protect LCP and TTI. Hero text/search must render instantly without JS-heavy deps.
- No new color tokens; reuse Emerald Executive scale.
- Keep all existing i18n (LV/RU/EN), SEO `document.title`/meta, and tRPC data wiring intact.
- Each new component independently testable and usable on Browse/PostDetail/Pricing in later passes.

## Out of scope (this pass)

- Browse / PostDetail / Pricing premium passes (later, reuse the components above).
- Any backend / data / schema changes.
- Replacing the city map (Leaflet stays).

## Success criteria

- Homepage feels distinctly more premium (depth, motion, polish) on desktop.
- No measurable LCP regression vs current; mobile stays fast.
- Reduced-motion + touch fallbacks verified.
- Zero new console errors; existing CSP allows any new asset origins (gsap/lenis/ogl are npm bundled → same-origin, no CSP change needed).
- Build clean; deployed and visually verified live.
