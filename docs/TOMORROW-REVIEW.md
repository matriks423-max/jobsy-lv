# Jobsy.lv — Tomorrow Review Document
*Prepared overnight 2026-05-18 — ready to go through when you wake up*

---

## ✅ What Was Built Tonight (all deployed to Railway)

### Already live this session:
1. **Full text/spelling audit** — copyright 2026, "Sazināties" fix, "Kimi"→Google, all "first post free"→"2 free posts" in LV/RU/EN
2. **WhatsApp share** — added to share dialog (2×2 grid)
3. **Free-badge bug fixed** — badge now correctly disappears after free posts are used
4. **Font fix** — Fraunces (broken Latvian chars) → Playfair Display (full Latin Extended)

### Built tonight (deployed, ready to test):
5. **3 themes** — Warm Cream / Dark Editorial / Terracotta Linen (switch via Settings page or footer)
6. **Profile Settings page** (`/settings`) — phone number input + theme switcher, linked from user dropdown
7. **Back-to-top button** — appears after scrolling 400px
8. **GDPR Cookie Banner** — accept/decline, persisted to localStorage
9. **New backend route** — `profile.me` + `profile.update` (saves phone to DB)

---

## 🔍 AI Research Findings — Priority Actions

### 🚨 High Priority (do these first)

#### 1. JobPosting Schema (JSON-LD) — FREE Google Jobs traffic
Every listing page should have structured data. This is the single highest-ROI action.
Google can show jobsy.lv posts directly in search results.
```json
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Post title",
  "description": "...",
  "datePosted": "2026-05-18",
  "validThrough": "2026-06-17",
  "jobLocation": {
    "@type": "Place",
    "address": { "addressLocality": "Rīga", "addressCountry": "LV" }
  }
}
```
**File to edit:** `src/pages/PostDetail.tsx` — inject into `<head>` via `document.title` equivalent or add a `<Helmet>` component.

#### 2. Floating "Post a Job" CTA on mobile
A fixed bottom-right button visible while browsing keeps the primary monetization action always reachable.
**File to edit:** `src/components/BackToTop.tsx` — add a companion FAB or make it context-aware.

#### 3. "X people viewed this" on listing
Recency signal prevents helpers from contacting posters about old/closed jobs.
**Required:** Add `viewCount int` to the `posts` schema, increment on `getById` query.
**Files:** `db/schema.ts`, `api/queries/posts.ts`, `src/pages/PostDetail.tsx`

#### 4. Post Status on listings ("Still open" / "Helper found" / "Closed")
Currently only "active/expired" — users need a way to mark a post as filled.
**Files:** `db/schema.ts` (add `filled boolean`), `api/posts-router.ts`, `src/pages/MyPosts.tsx`

---

### 🟡 Medium Priority

#### 5. Email Notifications — "Post published" confirmation
After a post goes live, send the poster a confirmation email with a direct link.
Transactional email is the highest-engagement touchpoint.
**Stack:** Add nodemailer or Resend (free tier) to the backend.
**Files:** `api/posts-router.ts` → trigger after successful post creation.

#### 6. "Job expires in 3 days" email reminder
Drives renewals and re-engagement.
**Implementation:** A daily cron job (`/api/cron/reminders`) that queries posts expiring in 3 days.
Already tracked in `validUntil` field in posts table.

#### 7. SEO — Per-page meta tags
Currently all pages share the same `<title>` and `<meta description>`.
Each post needs: `<title>{post.title} — jobsy.lv</title>` and matching description.
**Quick win:** Update `index.html` approach → use `document.title` setter in each page's `useEffect`.

#### 8. Category landing pages
Static pages like `/kategorija/remonts` with Latvian keyword content rank for free search traffic.
"Remontdarbi Rīgā" — no competition in Latvia on this.
**Files:** New `src/pages/Category.tsx` + route `/kategorija/:slug`

---

### 🟢 Nice to Have (future sprints)

#### 9. Review system
"Rate this helper" after job completion.
Biggest trust differentiator vs SS.lv.
Needs: `reviews` table, reviewer/reviewee FK, star rating, comment.

#### 10. "Express Interest" button
One-tap "I'm interested" button visible to logged-in helpers on listing pages.
Sends poster a notification: "{Helper name} is interested in your post."
No message composing needed — huge friction reducer.

#### 11. Saved searches / alerts
"Notify me when a new IT job appears in Riga."
Needs: `savedSearches` table, cron job to check + email.

#### 12. Map view for listings
For physical gigs, a map pin view is significantly more useful than a list.
**Library:** Leaflet.js (free, open source, no API key needed).

#### 13. Post images
Upload field already in `CreatePost.tsx` but the upload endpoint needs a real storage backend.
**Quickest path:** Railway Volumes (already configured) or Cloudflare R2 (free tier, S3-compatible).

---

## 🎨 3 Themes — How to Switch

Go to **Settings** → **Appearance** section (or user dropdown → Settings).

| Theme | Preview | Best for |
|-------|---------|----------|
| **Warm Cream** | Cream background, coral accent | Current look |
| **Dark Editorial** | Warm dark bg, same accents | Night use, feels premium |
| **Terracotta Linen** | Earthy linen, terracotta accent | Warmer, more local feel |

Theme persists in localStorage across sessions.

---

## 🐛 Known Issues to Fix

1. **Stats on homepage show 0/0/8/10** — "8 cities" and "10 categories" are hardcoded. "Helpers found" count is misleading (shows total posts, not helpers). Consider just removing the stats or showing only real data.

2. **Marquee strip (categories)** — always shows Latvian regardless of language. Should use `t(locale, 'categories.X')`.

3. **"pirmais" in referral.claimSuccess (LV)** — still says "pirmo sludinājumu" (your first post). This is correct for referral flow but sounds odd now that we have 2 free posts. Consider rewording.

4. **Login page subtitle** — shows "Pieslēdzies ar Google vai e-pastu" but the page header (nav.settings) says "Iestatījumi" in the browser tab. Minor.

5. **Toaster bg uses hardcoded `var(--ink)`** — will switch with theme but needs testing in dark mode.

---

## 💡 Competitor Edge — What Jobsy Already Has That SS.lv Doesn't

Based on research:
- ✅ Category-specific posts (not generic classifieds)
- ✅ Stripe payment flow (SS.lv has no paid boost)
- ✅ Google OAuth (SS.lv requires manual registration)
- ✅ 3-language support (LV/RU/EN)
- ✅ Mobile-responsive design
- ✅ WhatsApp share (most viral channel in Latvia)

**One thing to add that would be a massive differentiator: Phone verification badge on profiles.** Research shows this is the single biggest trust signal for local gig boards. Even a simple SMS OTP verify would make jobsy.lv the "safe" alternative to SS.lv.

---

## 📋 Pending DNS / Deployment Checklist

Before sharing jobsy.lv publicly:
- [ ] Cloudflare DNS: change `A @ → 66.33.22.174` → `CNAME @ → zt02btgt.up.railway.app` (proxy OFF)
- [ ] Confirm Railway shows domain verified + SSL active
- [ ] Smoke test: login with Google → post job → Stripe payment
- [ ] Update Stripe webhook URL → `https://jobsy.lv/api/webhook`
- [ ] Switch Stripe from test mode to live mode (get live API keys)

---

## 📁 New Files Created Tonight

```
src/lib/theme-context.tsx     — ThemeContext (warm/dark/terracotta)
src/components/BackToTop.tsx  — Scroll-to-top button
src/components/CookieBanner.tsx — GDPR banner
src/pages/Settings.tsx        — Profile settings + theme switcher
api/profile-router.ts         — profile.me + profile.update tRPC routes
docs/TOMORROW-REVIEW.md       — This file
docs/superpowers/specs/2026-05-18-feature-sprint-1-design.md — Feature spec
```

---

*Good morning! Everything above is deployed and ready to test at https://jobsy-lv-production.up.railway.app*
