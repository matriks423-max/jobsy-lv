# Jobsy.lv Social Media Automation — Design Spec
Date: 2026-05-31

## Goal
Fully automated social media content generation + distribution + owner reporting.
Zero manual input after setup. Budget ≤ €2/month (Claude API only).
Site self-sustains: new listings auto-post to social, weekly owner reports arrive by email,
UTM attribution shows which channels drive signups.

---

## Architecture Overview

```
Jobsy backend (existing)
  └── post goes active → fire-and-forget HTTP POST → n8n webhook

n8n (Railway service, free)
  ├── new-listing workflow
  │     ├── Claude API → captions LV + RU + EN
  │     ├── Pollinations.ai → branded image card (free, no key)
  │     └── Postiz API → schedule to all platforms
  ├── weekly-digest workflow (Sunday 10:00 cron)
  ├── monday-spotlight workflow (Monday 09:00 cron)
  ├── monthly-stats workflow (1st of month)
  ├── weekly-owner-report workflow (Monday 08:00)
  └── new-review workflow (webhook from Jobsy)

Postiz (Railway service, free open source)
  └── dispatches to: Telegram, Facebook, Instagram, LinkedIn, Reddit, VK, Threads

Umami (Railway service, free open source)
  └── privacy-first analytics, simple REST API for n8n to query
```

---

## Services to Deploy (all Railway, all free)

| Service | Docker Image | RAM | Purpose |
|---------|-------------|-----|---------|
| n8n | n8nio/n8n | 512MB | Workflow orchestration |
| Postiz | ghcr.io/gitroomhq/postiz-app | 512MB | Multi-platform scheduler |
| Umami | ghcr.io/umami-software/umami | 256MB | UTM + traffic analytics |

All three run alongside the existing Jobsy service on Railway.
Postiz uses existing Cloudflare R2 bucket for media storage (already configured).

---

## External APIs (all free or near-free)

| API | Use | Cost |
|-----|-----|------|
| Claude API | Captions in LV/RU/EN, report summaries | ~€1-2/month |
| Pollinations.ai | Image card generation | €0 — no key needed |
| Telegram Bot API | Direct channel posting | €0 |
| Meta Graph API | Facebook Page + Instagram | €0 |
| Postiz built-in | Handles LinkedIn, Reddit, VK, Threads | €0 |

---

## Jobsy Backend Changes

### 1. DB migration — UTM attribution on users
Add to `users` table:
```sql
ALTER TABLE users
  ADD COLUMN utm_source varchar(100) DEFAULT NULL,
  ADD COLUMN utm_medium varchar(100) DEFAULT NULL,
  ADD COLUMN utm_campaign varchar(100) DEFAULT NULL;
```
Drizzle schema: add three nullable varchar fields to `users` table.

### 2. Frontend — capture UTM on page load
On app mount, read `utm_source`, `utm_medium`, `utm_campaign` from URL params.
Store in `sessionStorage` (persists across page navigations within session).
On email signup and Google OAuth callback: include UTM values in the request body.

### 3. Backend — store UTM on user create
In `auth-router.ts` email signup handler and Google OAuth callback:
read UTM from request body, write to `users.utm_source/utm_medium/utm_campaign` on INSERT.

### 4. n8n webhook call on post activation
Create `api/lib/social-notify.ts`:
```typescript
export async function notifySocialQueue(postId: number, title: string, 
  description: string, category: string, city: string | null): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return; // silently skip if not configured
  
  // fire-and-forget — never block post activation
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, title, description, category, city }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {}); // intentional swallow
}
```

Call `notifySocialQueue(...)` (fire-and-forget) in three places:
- `posts-router.ts` ~line 252: after free post created with status `active`
- `posts-router.ts` ~line 600: after paid post set to `active` (checkout fallback)
- `posts-router.ts` ~line 689: after admin activates post
- `stripe.ts` ~line 215: after Stripe webhook sets post to `active`

### 5. New cron: /api/cron/weekly-report
Called by n8n every Monday 08:00 (n8n adds x-cron-secret header).
Queries DB for last 7 days:
- New users (total + by utm_source)
- New posts (total + by category)
- Revenue: paid posts × €2 (count posts where wasFree=false and paidAt in window)
- Active listings count
- Listings marked filled
- Reports/flags raised
- Failed social posts (from socialQueue where status=failed)

Returns JSON. n8n feeds this to Claude API → formats readable email → Resend to ADMIN_EMAIL.

### 6. New cron: /api/cron/digest-data
Called by n8n Sunday 10:00. Returns top 5 active listings (by viewCount) as JSON.
n8n uses this to generate weekly digest social post.

### 7. New cron: /api/cron/retention-email  
Called weekly (Wednesday 10:00) by n8n.
For each user registered >7 days ago with lastSignInAt >14 days ago:
  - Find 3 recent active listings in their last-known city (from profiles.city)
  - Send "New listings near you" email via Resend
  - Max 1 email per user per week (track via new `retentionEmailSentAt` on profiles or check lastSignInAt threshold)

### 8. Review webhook to n8n
After a review is created (5 stars), fire-and-forget POST to `N8N_REVIEW_WEBHOOK_URL`.
n8n generates "Another job well done!" social post.

### 9. New env vars
```
N8N_WEBHOOK_URL=https://n8n-jobsy.railway.app/webhook/new-listing
N8N_REVIEW_WEBHOOK_URL=https://n8n-jobsy.railway.app/webhook/new-review
N8N_CRON_SECRET=<same as CRON_SECRET or separate>
POSTIZ_API_KEY=<from Postiz self-hosted settings>
UMAMI_SITE_ID=<from Umami dashboard>
UMAMI_API_KEY=<from Umami dashboard>
```

---

## UTM Tagging Strategy

Every URL that Postiz posts includes UTM params. n8n builds these dynamically:

| Trigger | utm_source | utm_medium | utm_campaign |
|---------|-----------|-----------|-------------|
| New listing auto-post | telegram / facebook / instagram / linkedin | auto-post | listing-{postId} |
| Weekly digest | telegram / facebook / etc | digest | weekly-{YYYY-Www} |
| Monday spotlight | telegram / facebook / etc | spotlight | category-{category} |
| Monthly stats | all platforms | roundup | monthly-{YYYY-MM} |
| Cold email outreach | cold-email | outreach | {business-category} |

Example: `https://jobsy.lv/post/123?utm_source=telegram&utm_medium=auto-post&utm_campaign=listing-123`

---

## n8n Workflows

### Workflow 1: new-listing
**Trigger:** Webhook POST from Jobsy on post activation
**Steps:**
1. Receive `{ postId, title, description, category, city }`
2. HTTP node → Claude API
   - System: "You write social media captions for jobsy.lv, Latvia's job helpers platform. Write in 3 languages."
   - Generate: Latvian caption, Russian caption, English caption. 120 chars max each.
   - Include: jobsy.lv/post/{postId}?utm_source={platform}&utm_medium=auto-post&utm_campaign=listing-{postId}
3. HTTP node → Pollinations.ai
   - URL: `https://image.pollinations.ai/prompt/Clean+modern+job+card+{category}+Latvia+emerald+green+white+minimal`
   - Returns image URL
4. Postiz API → schedule post (image + LV caption) to Telegram, Facebook, Instagram
5. Postiz API → schedule post (English caption, no image) to LinkedIn, Reddit r/latvia
6. Random delay: 5-30 min spread between platform posts (avoid bot detection)

### Workflow 2: weekly-digest (Sunday 10:00)
**Trigger:** n8n cron
**Steps:**
1. HTTP GET → /api/cron/digest-data (with cron secret header)
2. Claude API → generate "Top 5 šīs nedēļas sludinājumi" post in LV/RU/EN
3. Pollinations.ai → generate weekly digest image (list of top categories)
4. Postiz → schedule to all platforms

### Workflow 3: monday-spotlight (Monday 09:00)
**Trigger:** n8n cron, rotating category each week
**Steps:**
1. n8n static data → pick category for this week (rotate through 10 categories)
2. DB query for count of active listings in that category
3. Claude API → generate "Vai meklē {category} palīdzību Rīgā?" spotlight post
4. Pollinations.ai → category-themed image
5. Postiz → Telegram + Facebook

### Workflow 4: monthly-stats (1st of month, 09:00)
**Trigger:** n8n cron
**Steps:**
1. HTTP GET → /api/cron/weekly-report (reuse endpoint, returns broader stats)
2. Claude API → "Pagājušajā mēnesī jobsy.lv..." milestone post
3. Postiz → all platforms

### Workflow 5: weekly-owner-report (Monday 08:00, before spotlight)
**Trigger:** n8n cron
**Steps:**
1. HTTP GET → /api/cron/weekly-report (with cron secret)
2. Claude API → format into readable HTML email:
   - Growth metrics
   - Acquisition breakdown by UTM source (which platform drove signups)
   - Best performing post (most clicks from UTM data)
   - Revenue
   - Health status
   - Action items if any (e.g., pending moderation flags)
3. Resend → matriks423@gmail.com

### Workflow 6: new-review
**Trigger:** Webhook from Jobsy (5-star review posted)
**Steps:**
1. Receive `{ reviewerCity, stars, category }`
2. Claude API → generate "Vēl viens darbs labi padarīts! ⭐⭐⭐⭐⭐ {category} pakalpojums {city}" post
3. Postiz → Telegram + Instagram (social proof)

---

## Postiz Platform Setup (manual one-time)

Connect these accounts in Postiz UI after deployment:
- Telegram Bot (via Bot API token)
- Facebook Page (via Meta Graph API token)
- Instagram Business (via Meta Graph API token — same Meta app)
- LinkedIn Company Page (via LinkedIn OAuth)
- Reddit account (via Reddit OAuth)

Postiz stores OAuth tokens. n8n calls Postiz API to create scheduled posts.

---

## Umami Setup

Deployed on Railway. Tracking script replaces/augments existing GA4 in index.html.
UTM params tracked automatically. n8n weekly-owner-report queries Umami REST API:
- `/api/websites/{siteId}/stats` → page views, unique visitors
- `/api/websites/{siteId}/utm` → UTM source breakdown

---

## Content Moderation (existing + enhanced)

Existing `api/lib/moderation.ts` already does keyword-based filtering. No changes needed.
The webhook-based social post only fires for `status=active` posts — which have already
passed moderation. No double-checking needed.

For enhanced AI moderation (future): add Claude API call in the post creation flow
to soft-flag listings that pass keyword filter but seem suspicious.

---

## Rate Limiting / Platform Health

- Postiz handles scheduling — configure max 5 posts/day per platform
- n8n adds 5-30 min random delay between platform posts per listing
- Postiz has built-in retry logic for failed posts
- Failed posts logged to socialQueue.status=failed (visible in admin panel)

---

## Weekly Owner Report — Sample Output

```
JOBSY.LV NEDĒĻAS ATSKAITE — 2026-W23

IZAUGSME
  Jauni lietotāji:      +23  (kopā: 187)
  Jauni sludinājumi:    +41  (aktīvi: 312)
  Aizpildīti darbi:      +8

IEGŪŠANA — no kurienes nāk lietotāji
  Telegram:             11 reģistrācijas  ████████░  48%
  Facebook:              4 reģistrācijas  ███░░░░░░  17%
  Organiskais SEO:       6 reģistrācijas  █████░░░░  26%
  Cold email:            2 reģistrācijas  ██░░░░░░░   9%

LABĀKAIS SATURS NEDĒĻĀ
  Vairāk klikšķu: "Meklē apkopēju Rīgā" (Telegram) — 89 klikšķi
  Zemākais: Facebook attēla posts — 3 klikšķi

IEŅĒMUMI
  Stripe iekasēts:      €14
  Neizdevušies maksājumi: 1 (e-pasts nosūtīts)

VESELĪBA
  Uptime:               100%
  Cron darbi:           21/21 ✓
  Moderācijas karodziņi: 2 (skatīt admin paneli)
```

---

## Manual Actions Required (owner does once)

1. Create Facebook Page: facebook.com/pages/create — name "Jobsy.lv"
2. Create Instagram Business account: @jobsy.lv — convert personal to Business
3. Create Telegram channel: @jobsylv — set description + link to jobsy.lv
4. Create Meta Developer App: developers.facebook.com → get Page + Instagram tokens
5. Create LinkedIn Company Page: linkedin.com/company/jobsy-lv
6. Create Reddit account: u/jobsylv — subscribe to r/latvia, r/riga
7. Connect all accounts in Postiz UI after deployment
8. Join 5-10 Latvian Facebook groups manually and post once/week (API blocks group posting)
9. Register Draugiem.lv developer account: dev.draugiem.lv (future phase)
10. Set up UptimeRobot: uptimerobot.com — monitor jobsy.lv + /health every 5 min
11. Set up Apollo.io free account for business outreach leads (50/month free)
12. Set up Brevo free account (300 emails/day): brevo.com — for cold outreach emails

---

## Phase Build Order

| Phase | What | Time |
|-------|------|------|
| 1 | Deploy n8n + Postiz + Umami on Railway | 2-3h |
| 2 | Jobsy backend: n8n webhook on post activation | 1h |
| 3 | n8n Workflow 1: new-listing (Claude + Pollinations + Postiz) | 2h |
| 4 | n8n Workflow 5: weekly-owner-report | 1h |
| 5 | UTM: DB migration + frontend capture + backend store | 2h |
| 6 | n8n Workflows 2-4: digest, spotlight, monthly stats | 1h |
| 7 | Retention email cron (/api/cron/retention-email) | 1h |
| 8 | New review → social proof workflow | 30min |
| 9 | Umami analytics wired to weekly report | 1h |
| Manual | Owner creates social accounts + connects in Postiz | 1-2h |
