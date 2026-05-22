# Monetization Redesign — jobsy.lv

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this spec task-by-task.

**Goal:** Replace the current per-post payment model (€2/post, 2 free) with a two-tier free/business model plus à la carte boosts, without any manual admin work.

**Architecture:** Stripe Subscriptions for the Business tier, Stripe Checkout one-time payments for boosts. A `socialQueue` table flags boosted posts for future social media automation. Existing users are grandfathered into the free tier with no disruption.

**Tech Stack:** Hono + DrizzleORM + MySQL + Stripe + React 19 + tRPC + Resend

---

## Research Background

- **Latvia market:** SS.lv dominates via per-listing fees; newer competitors (Dalder.lv, AdSnap.lv) go fully free. Charging per-post creates a growth barrier.
- **Global model:** Fiverr (20% commission), Bark.com / Thumbtack (pay-per-lead). Best platforms charge the supply side or use subscriptions — never charge demand-side users to post needs.
- **Decision:** Free for individuals, subscription for businesses, boosts for everyone. Modelled after Gumtree UK / OLX Eastern Europe two-tier approach that won local markets.

---

## Tier Structure

### Free (Individuals)
- 10 posts per calendar month (resets 1st of each month)
- Full browse and contact — no credit card ever
- À la carte boosts available
- Soft upgrade prompt when approaching or hitting monthly limit

### Business — €14.90/month (Stripe Subscription)
- Unlimited posts
- 🏢 Business badge on all posts and profile — auto-granted on first successful payment
- Company profile: name, logo (uploaded image), website URL, description
- Post analytics: views + contact clicks per post
- 2 free Featured boosts per month (credited on billing cycle)
- Posts get social media exposure when boosted (queued for future automation)
- Cancel anytime via Stripe Customer Portal (self-serve, zero admin)

### Boosts — À la carte for everyone (Stripe one-time Checkout)
| Boost | Price | Duration | Triggers social queue |
|---|---|---|---|
| 🔝 Bump to top | €1.00 | 7 days | Yes |
| ⭐ Featured | €2.00 | 7 days | Yes |
| 🔴 Urgent badge | €0.50 | 7 days | No |

Only Bump and Featured trigger social queuing — Urgent is a visual label only.

---

## Database Schema Changes

### `users` table — add columns
```sql
plan ENUM('free', 'business') NOT NULL DEFAULT 'free'
stripeSubscriptionId VARCHAR(255) NULL
planExpiresAt TIMESTAMP NULL   -- NULL = active subscription, set on cancellation grace period
```

### `profiles` table — add columns
```sql
companyName VARCHAR(255) NULL
companyLogo VARCHAR(512) NULL      -- URL to uploaded image
companyWebsite VARCHAR(512) NULL
companyDescription TEXT NULL
monthlyPostCount INT UNSIGNED NOT NULL DEFAULT 0
monthlyPostReset DATE NULL         -- date of last reset (YYYY-MM-01)
freeBoostsRemaining INT UNSIGNED NOT NULL DEFAULT 0  -- resets each billing cycle for business users
```

### `posts` table — add columns
```sql
boostType ENUM('none', 'bump', 'featured', 'urgent') NOT NULL DEFAULT 'none'
boostExpiresAt TIMESTAMP NULL
boostStripeSessionId VARCHAR(255) NULL
```

### New `socialQueue` table
```sql
CREATE TABLE socialQueue (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  postId BIGINT UNSIGNED NOT NULL,
  boostType ENUM('bump', 'featured') NOT NULL,
  status ENUM('pending', 'posted', 'failed') NOT NULL DEFAULT 'pending',
  scheduledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  postedAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_socialQueue_status (status)
)
```

### Remove / deprecate
- `profiles.freePostUsed` → replaced by `monthlyPostCount` + `monthlyPostReset`
- `profiles.freePostCredits` → replaced by `freeBoostsRemaining`
- `posts.wasFree` → no longer meaningful (keep column, stop using in new logic)
- Existing `stripeSessionId` / `stripePaymentId` on posts → keep for boost payments

---

## Stripe Integration

### Subscription product
- Create one Stripe Product: "jobsy.lv Business"
- One Price: €14.90/month recurring
- Store `STRIPE_BUSINESS_PRICE_ID` in Railway env vars

### Subscription lifecycle (webhooks)
| Event | Action |
|---|---|
| `customer.subscription.created` | Set `users.plan = 'business'`, store `stripeSubscriptionId`, credit 2 free boosts |
| `customer.subscription.updated` | Handle plan changes (future-proofing) |
| `customer.subscription.deleted` | Set `users.plan = 'free'`, clear `stripeSubscriptionId`, set `planExpiresAt` to period end |
| `invoice.payment_failed` | Send payment failure email via Resend, do NOT immediately downgrade — retry period applies |

### Boost checkout
Reuse existing `/api/checkout` flow. Add `boostType` and `postId` params. On `checkout.session.completed`:
1. Set `posts.boostType`, `posts.boostExpiresAt`
2. Insert row into `socialQueue` if boostType is `bump` or `featured`

### Stripe Customer Portal
Expose `/api/billing-portal` endpoint — creates a Stripe billing portal session for the authenticated user. Business users can cancel/update payment method themselves. Zero admin.

---

## Monthly Post Counter

Logic runs on every post creation attempt:

```
currentMonth = YYYY-MM-01 for today
if profiles.monthlyPostReset != currentMonth:
    reset monthlyPostCount = 0, monthlyPostReset = currentMonth

if user.plan == 'free' and monthlyPostCount >= 10:
    reject with "Monthly limit reached — upgrade to Business"

increment monthlyPostCount on successful post creation
```

---

## Business Free Boosts

- On subscription creation webhook: set `freeBoostsRemaining = 2`
- On each billing cycle renewal (`invoice.payment_succeeded`): reset `freeBoostsRemaining = 2`
- When a business user applies a Featured boost: check `freeBoostsRemaining > 0` first
  - If yes: deduct 1, apply boost for free (no Stripe checkout needed)
  - If no: redirect to standard boost checkout (€2)

---

## New API Endpoints / tRPC Mutations

### `subscription.createCheckout` (authed)
Creates a Stripe Checkout session for the Business subscription. Returns `url`.

### `subscription.createPortal` (authed, business only)
Creates a Stripe billing portal session. Returns `url`.

### `subscription.status` (authed)
Returns `{ plan, planExpiresAt, freeBoostsRemaining, monthlyPostCount }`.

### `posts.applyBoost` (authed, post owner only)
```
input: { postId, boostType: 'bump' | 'featured' | 'urgent' }
- Validates post ownership
- For business users with freeBoostsRemaining: applies Featured boost free
- Otherwise: creates Stripe Checkout session, returns { checkoutUrl }
- On webhook completion: sets boost fields + inserts socialQueue row
```

### `posts.activeBoosts` (public)
Returns posts with active boosts for Browse/Home featured sections.

### `admin.socialQueue` (admin only)
Returns pending social queue items (for future social automation sprint).

---

## New UI Pages & Components

### `/pricing` page
- Three columns: Free · Business · (Boosts sidebar)
- Clear feature comparison table
- "Start Free" button (→ /create) and "Upgrade to Business" button (→ subscription checkout)
- FAQ section: "What happens if I cancel?", "Can I switch back?", etc.
- Linked from Navbar and upgrade prompts

### Upgrade modal
- Triggered when free user hits post #10/month or tries to access business features
- Shows remaining posts this month + Business tier benefits
- CTA: "Upgrade — €14.90/month"

### Boost picker UI
- Shown on post detail page (owner only) and MyPosts page
- Three boost cards with price, duration, social badge for Bump + Featured
- Business users see "Use free boost" badge on Featured when `freeBoostsRemaining > 0`

### Business profile section (Settings page)
- Company name, logo upload, website, description
- Only visible when `user.plan === 'business'`

### Business badge
- Small 🏢 chip shown on PostCard and PostDetail next to poster name
- Shown when `user.plan === 'business'`

### Featured section on Browse + Homepage
- Grid of posts with active `boostType = 'featured'` and unexpired `boostExpiresAt`
- Labelled "✨ Featured Posts"
- Falls back to hidden if no active featured posts

### Bumped posts ordering
- Browse query: order by `(boostType = 'bump' AND boostExpiresAt > NOW()) DESC, createdAt DESC`
- Bumped posts always surface above non-bumped within their category

---

## Social Queue (Stub for Future Sprint)

When a Bump or Featured boost is activated:
1. Insert row into `socialQueue` with `status = 'pending'`
2. Future cron job reads `pending` rows and posts to FB/IG/Twitter APIs
3. Updates `status = 'posted'` + `postedAt`

Admin panel shows queue status. No actual social API calls in this sprint — infrastructure only.

---

## Pricing Page Copy (Latvian)

| | Free | Business |
|---|---|---|
| **Price** | Bez maksas | €14.90/mēnesī |
| **Sludinājumi** | 10/mēnesī | Neierobežoti |
| **Uzņēmuma profils** | ✗ | ✓ |
| **Business badge** | ✗ | 🏢 |
| **Analītika** | ✗ | ✓ |
| **Bezmaksas boost** | ✗ | 2×/mēnesī |
| **Kontakti** | Bezmaksas | Bezmaksas |

---

## Transition Plan — Existing Users

- All existing users → `plan = 'free'` (no action needed, default)
- Active paid posts stay active until their `expiresAt` date — no disruption
- `freePostUsed` and `freePostCredits` columns remain in DB but are ignored by new logic
- No emails needed — the change is additive, nothing is taken away

---

## Out of Scope (Future Sprints)

- Actual FB/IG/Twitter API posting (infrastructure queued here, execution later)
- Multiple business seats / team accounts
- Annual billing discount
- Post image requirements for social sharing
- A/B testing pricing

---

## Success Metrics

- Business subscription conversion rate > 2% of active posters
- Boost purchase rate > 5% of active posts
- Monthly post limit hit rate < 10% of free users (indicates generous enough free tier)
- Zero support tickets about billing (Stripe portal handles everything)
