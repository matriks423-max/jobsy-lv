# Jobsy.lv Feature Sprint 1 — Design Spec

**Date:** 2026-05-18  
**Status:** Approved  
**Approach:** Option B — two batches (quick wins first, schema changes second)

---

## Batch 1 — Quick Wins (no schema changes, single deploy)

### 1. Spelling & Text Fixes (`src/lib/i18n.ts`)

- `footer.copyright`: change `"© 2025 jobsy.lv"` → `"© 2026 jobsy.lv"` in all 3 locales (lv, ru, en)
- LV locale contact button: `"Sazinīties"` → `"Sazināties"` (correct Latvian spelling)
- Any remaining "pirmais sludinājums bez maksas" / first-post-free references are left for Batch 2 when all free-post text is rewritten together

### 2. WhatsApp Share Button (`src/pages/PostDetail.tsx`)

**`handleShare()` function:** add `whatsapp` case:
```ts
} else if (platform === "whatsapp") {
  window.open(`https://wa.me/?text=${text}%20${encodeURIComponent(url)}`, "_blank");
}
```

**Share dialog layout:** change from 3-column to 2×2 grid (4 buttons: Twitter, Facebook, WhatsApp, Copy Link). WhatsApp icon from the existing icon library or a simple SVG inline.

**i18n:** add `postDetail.share.whatsapp` = `"WhatsApp"` in all 3 locales (name is the same in all languages).

### 3. "First Post Free" Badge Bug Fix (`api/router.ts` + `src/pages/CreatePost.tsx`)

**Problem:** The `referral.me` tRPC query does not return `freePostUsed`, so the frontend always shows the free-post badge even after the free post is consumed.

**Backend change:** In the `referral.me` query handler, include the existing `freePostUsed` boolean in the returned object. (In Batch 2 this becomes `freePostsUsed` int — the frontend will be updated then too.)

**Frontend change (`CreatePost.tsx`):** Update badge logic using the existing boolean:
```ts
// Before:
const showFreeBadge = !hasFreeCredits;

// After (Batch 1 — uses existing boolean):
const freePostUsed = referralInfo?.freePostUsed ?? false;
const showFreeBadge = !hasFreeCredits && !freePostUsed;
```

In Batch 2, this logic is replaced with the int-based check (`freePostsUsed < 2`). Badge text also updates in Batch 2 when i18n is rewritten for "2 free posts."

---

## Batch 2 — Schema Migration + New Page (separate deploy)

### 4. 2 Free Posts (`db/schema.ts` + `api/posts-router.ts` + `api/queries/profiles.ts` + `src/lib/i18n.ts`)

**Schema change (`db/schema.ts`):**
```ts
// Remove:
freePostUsed: boolean("freePostUsed").default(false).notNull()

// Add:
freePostsUsed: int("freePostsUsed", { unsigned: true }).default(0).notNull()
```

**Drizzle migration:** generate and run migration — rename column + change type. Only 1 existing user (owner), so no data migration concerns beyond setting `freePostsUsed = 0` as default.

**Backend (`api/posts-router.ts`):**
```ts
const FREE_POSTS_LIMIT = 2;
const canUseFreePost = FREE_FIRST_POST && profile.freePostsUsed < FREE_POSTS_LIMIT;
```

**Backend (`api/queries/profiles.ts`):**
```ts
// useFreePost() changes from:
freePostUsed: true
// to:
freePostsUsed: sql`freePostsUsed + 1`
```

**i18n (`src/lib/i18n.ts`) — all 3 locales — keys to update:**
| Key | Old text (LV) | New text (LV) |
|-----|--------------|--------------|
| `createPost.info` | Pirmais sludinājums bez maksas | Pirmie 2 sludinājumi bez maksas |
| `ctaBanner.title` | Tavs pirmais sludinājums ir bez maksas | Tavi pirmie 2 sludinājumi ir bez maksas |
| `ctaBanner.subtitle` | (any mention of first free) | update to "2 free" |
| `success.freeSub` | Tavs pirmais sludinājums ir bez maksas | update to "2 free" |
| `howItWorks.step1Desc` | Bez maksas pirmais sludinājums | Pirmie 2 sludinājumi bez maksas |

Russian (ru) and English (en) equivalents updated in parallel.

### 5. Profile Settings Page (new file: `src/pages/Settings.tsx`)

**Route:** `/settings` — add to the router alongside existing routes.

**Access:** Link in user avatar/menu dropdown (already exists in the nav) — add "Settings" or "Profils" menu item.

**Page layout:**
- Heading: "Profila iestatījumi" / "Настройки профиля" / "Profile Settings"
- **Email field** (read-only, prefilled from Google OAuth): shows current email with a lock icon or "(no rediģējams)" label
- **Phone number field** (editable): text input, format hint "+371 XXXXXXXX", save button
- On save: calls existing `updateProfile` tRPC mutation with `{ phone: value }`
- Success toast on save, validation: must be non-empty if entered (no forced format — Latvia has varied formats)

**Backend:** `updateProfile` mutation already exists in `api/queries/profiles.ts`. Verify it is exposed via the tRPC router; if not, wire it up.

**Effect on contact section:** Once user sets phone in Settings, `PostDetail.tsx` contact section will automatically show it (backend already returns phone in contact query).

---

## Out of Scope (this sprint)

- Job search / filtering
- Email notifications
- Job expiry / auto-archive
- CV upload / direct apply
- Admin panel
- Analytics per listing

These go in [[project-jobsy-roadmap]] for future sprints.

---

## Deploy Plan

1. **Batch 1 deploy:** commit spelling + WhatsApp + badge fix → `git push` → Railway auto-deploys → smoke test
2. **Batch 2 deploy:** run Drizzle migration locally first (`drizzle-kit push`), commit schema + code changes → `git push` → Railway auto-deploys → verify free-post counter works + settings page accessible
