# Social Media Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully automated social media content generation + distribution + owner reporting for Jobsy.lv — zero manual input after setup, ≤€2/month.

**Architecture:** Jobsy backend fires a fire-and-forget webhook to n8n on every post activation. n8n generates captions (Claude API), images (Pollinations.ai), and dispatches to all platforms via Postiz. Weekly cron pulls DB stats → Claude formats → Resend emails owner. UTM params tracked from social posts back to user signups in DB.

**Tech Stack:** Hono + DrizzleORM + MySQL (Jobsy), n8n (Railway), Postiz (Railway), Umami (Railway), Claude API, Pollinations.ai, Resend, Telegram Bot API, Meta Graph API

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `db/schema.ts` | Modify | Add utm_source/medium/campaign to users; retentionEmailSentAt to profiles |
| `api/lib/env.ts` | Modify | Add N8N_WEBHOOK_URL, N8N_REVIEW_WEBHOOK_URL env vars |
| `api/lib/social-notify.ts` | Create | Fire-and-forget webhook calls to n8n |
| `api/lib/email.ts` | Modify | Add sendRetentionEmail function |
| `api/email-auth.ts` | Modify | Pass utm fields in register input → store on user INSERT |
| `api/auth-router.ts` | Modify | Add setUtm mutation (idempotent, only sets if null) |
| `api/posts-router.ts` | Modify | Call notifySocialQueue in 3 places; call notifyReview in leaveReview |
| `api/stripe.ts` | Modify | Call notifySocialQueue after Stripe webhook sets post active |
| `api/cron-router.ts` | Modify | Add /weekly-report, /digest-data, /retention-email endpoints |
| `src/hooks/useUTM.ts` | Create | Read URL UTM params → sessionStorage |
| `src/App.tsx` | Modify | Call useUTM hook; send setUtm mutation when user authenticated |
| `index.html` | Modify | Add Umami tracking script |

---

## Task 1: Deploy n8n on Railway

**Files:** Railway dashboard (no code files)

- [ ] **Step 1: Create n8n service on Railway**

Go to Railway dashboard → project "shimmering-ambition" → New Service → Docker Image.

Image: `n8nio/n8n:latest`

Set environment variables:
```
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<choose a strong password>
N8N_HOST=0.0.0.0
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://<n8n-railway-domain>/
N8N_ENCRYPTION_KEY=<random 32 char hex string>
GENERIC_TIMEZONE=Europe/Riga
DB_TYPE=sqlite
N8N_RUNNERS_ENABLED=true
```

Set domain: Settings → Networking → Generate Domain. Note the URL — e.g., `n8n-jobsy.up.railway.app`.

- [ ] **Step 2: Verify n8n is running**

Visit `https://n8n-jobsy.up.railway.app` — should see n8n login screen.
Login with the credentials set above.

- [ ] **Step 3: Add Claude API credential in n8n**

In n8n: Settings → Credentials → New → "HTTP Request" (we call Claude via HTTP node, not native credential).
This will be configured per-workflow. No credential setup needed yet.

- [ ] **Step 4: Note the n8n webhook base URL**

Format: `https://n8n-jobsy.up.railway.app/webhook/`
The new-listing webhook will be: `https://n8n-jobsy.up.railway.app/webhook/new-listing`
The new-review webhook will be: `https://n8n-jobsy.up.railway.app/webhook/new-review`

---

## Task 2: Deploy Postiz on Railway

**Files:** Railway dashboard (no code files)

- [ ] **Step 1: Create Postiz service**

Railway → New Service → Docker Image: `ghcr.io/gitroomhq/postiz-app:latest`

Environment variables:
```
MAIN_URL=https://<postiz-railway-domain>
FRONTEND_URL=https://<postiz-railway-domain>
NEXT_PUBLIC_BACKEND_URL=https://<postiz-railway-domain>/api
JWT_SECRET=<random 64 char hex>
DATABASE_URL=<same MySQL URL as Jobsy or a new DB — use existing Railway MySQL>
REDIS_URL=redis://default:@<add Redis service or use in-memory>
STORAGE_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=4b522aba61a14a3d483876216d6a74d2
CLOUDFLARE_ACCESS_KEY=5e20cd76bbd122f1220b0dd8ca9f6514
CLOUDFLARE_SECRET_ACCESS_KEY=e9535f171adb133505d1e915e75f924734d8e4371b19c34ca402c1c80f3b5a72
CLOUDFLARE_BUCKETNAME=jobsy-uploads
CLOUDFLARE_BUCKET_URL=https://pub-6ab822037e9c44afa1b3f9965d591a4d.r2.dev
```

Note: Postiz needs its own DB tables. It will auto-migrate on first start.
Use a separate DB name by adding `?database=postiz` to the MySQL URL, OR spin up a second MySQL service (free tier).

- [ ] **Step 2: Add Redis service (required by Postiz)**

Railway → New Service → Database → Redis. Copy the `REDIS_URL` into Postiz env vars.

- [ ] **Step 3: Verify Postiz is running**

Visit the Postiz domain, create admin account. Go to Settings → API Keys → Generate. Copy this key — it's `POSTIZ_API_KEY` for Jobsy env vars.

- [ ] **Step 4: Connect social accounts in Postiz UI (manual)**

Connect each platform via Postiz Settings → Channels:
- Telegram (requires Bot Token — create via @BotFather first)
- Facebook Page (requires Meta Developer App token)
- Instagram Business (same Meta app as Facebook)
- LinkedIn Company Page
- Reddit (OAuth)

See Manual Actions section at end of this plan for instructions on creating each account.

---

## Task 3: Deploy Umami on Railway

**Files:** Railway dashboard, `index.html`

- [ ] **Step 1: Create Umami service**

Railway → New Service → Docker Image: `ghcr.io/umami-software/umami:postgresql-latest`

Umami requires PostgreSQL. Railway → New Service → Database → PostgreSQL.

Environment variables for Umami:
```
DATABASE_URL=<PostgreSQL connection string from Railway>
APP_SECRET=<random 32 char hex>
```

- [ ] **Step 2: Create Umami website and get tracking ID**

Visit Umami domain → login (default: admin/umami, change immediately) → Settings → Websites → Add Website → jobsy.lv.

Copy the tracking script — looks like:
```html
<script async src="https://<umami-domain>/script.js" data-website-id="<website-id>"></script>
```

Also create an API key: Settings → API Keys → Add API Key. Note the key and website ID.

- [ ] **Step 3: Add Umami script to index.html**

Modify `index.html` — add Umami script before `</head>` (after existing GA4 script):

```html
    <!-- Umami Analytics — privacy-first, UTM tracking -->
    <script async src="https://<your-umami-railway-domain>/script.js" data-website-id="<your-website-id>"></script>
  </head>
```

Replace `<your-umami-railway-domain>` and `<your-website-id>` with actual values from Step 2.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "analytics: add Umami tracking script for UTM attribution"
```

---

## Task 4: DB schema changes

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Add UTM columns to users table**

In `db/schema.ts`, update the `users` table definition. After `lastSignInAt`:

```typescript
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).unique(),
  googleId: varchar("googleId", { length: 255 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  authMethod: mysqlEnum("authMethod", ["kimi", "google", "email"]).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin", "banned"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "business"]).default("free").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  planExpiresAt: timestamp("planExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  utmSource: varchar("utmSource", { length: 100 }),
  utmMedium: varchar("utmMedium", { length: 100 }),
  utmCampaign: varchar("utmCampaign", { length: 100 }),
});
```

- [ ] **Step 2: Add retentionEmailSentAt to profiles table**

In `db/schema.ts`, add to the `profiles` table after `updatedAt`:

```typescript
  retentionEmailSentAt: timestamp("retentionEmailSentAt"),
```

- [ ] **Step 3: Push schema to production DB**

```bash
npx drizzle-kit push
```

Expected output: lists added columns, asks to confirm. Type `yes`.

- [ ] **Step 4: Commit schema changes**

```bash
git add db/schema.ts
git commit -m "db: add UTM columns to users, retentionEmailSentAt to profiles"
```

---

## Task 5: Update env.ts with new env vars

**Files:**
- Modify: `api/lib/env.ts`

- [ ] **Step 1: Add new optional env vars**

In `api/lib/env.ts`, add after the `cronSecret` line:

```typescript
  cronSecret: optional("CRON_SECRET"),

  // Social automation
  n8nWebhookUrl: optional("N8N_WEBHOOK_URL"),
  n8nReviewWebhookUrl: optional("N8N_REVIEW_WEBHOOK_URL"),
  postizApiKey: optional("POSTIZ_API_KEY"),
  umamiSiteId: optional("UMAMI_SITE_ID"),
  umamiApiKey: optional("UMAMI_API_KEY"),
```

- [ ] **Step 2: Add Railway env vars**

In Railway dashboard for the Jobsy service, add:
```
N8N_WEBHOOK_URL=https://n8n-jobsy.up.railway.app/webhook/new-listing
N8N_REVIEW_WEBHOOK_URL=https://n8n-jobsy.up.railway.app/webhook/new-review
POSTIZ_API_KEY=<from Postiz settings>
UMAMI_SITE_ID=<from Umami dashboard>
UMAMI_API_KEY=<from Umami dashboard>
```

- [ ] **Step 3: Commit**

```bash
git add api/lib/env.ts
git commit -m "env: add n8n webhook, Postiz, and Umami env vars"
```

---

## Task 6: Create social-notify.ts

**Files:**
- Create: `api/lib/social-notify.ts`

- [ ] **Step 1: Create the file**

```typescript
import { env } from "./env";

export async function notifySocialQueue(
  postId: number,
  title: string,
  description: string | null,
  category: string,
  city: string | null
): Promise<void> {
  const webhookUrl = env.n8nWebhookUrl;
  if (!webhookUrl) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, title, description, category, city }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}

export async function notifyReview(
  stars: number,
  category: string,
  city: string | null
): Promise<void> {
  const webhookUrl = env.n8nReviewWebhookUrl;
  if (!webhookUrl || stars < 5) return;

  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stars, category, city }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
```

- [ ] **Step 2: Commit**

```bash
git add api/lib/social-notify.ts
git commit -m "feat: add social-notify fire-and-forget webhook helpers"
```

---

## Task 7: Wire notifySocialQueue into post activation points

**Files:**
- Modify: `api/posts-router.ts`
- Modify: `api/stripe.ts`

- [ ] **Step 1: Add import to posts-router.ts**

At the top of `api/posts-router.ts`, add after the existing imports:

```typescript
import { notifySocialQueue, notifyReview } from "./lib/social-notify";
```

- [ ] **Step 2: Wire into free post activation (~line 272)**

In `posts-router.ts`, find the block that runs after free post creation when `!needsReview`:

```typescript
      if (!needsReview && profile.email) {
        void sendPostPublished(profile.email, input.title, insertId);
        void notifyMatchingSavedSearches({
```

Add the social notify call:

```typescript
      if (!needsReview && profile.email) {
        void sendPostPublished(profile.email, input.title, insertId);
        void notifySocialQueue(insertId, input.title, input.description ?? null, input.category, input.city ?? null);
        void notifyMatchingSavedSearches({
```

- [ ] **Step 3: Wire into completePayment (~line 610)**

Find the `completePayment` mutation where `sendPostPublished` is called:

```typescript
      if (profile?.email) {
        void sendPostPublished(profile.email, postResult.post.title, input.postId);
      }
      void notifyMatchingSavedSearches({
```

Add after the `sendPostPublished` call:

```typescript
      if (profile?.email) {
        void sendPostPublished(profile.email, postResult.post.title, input.postId);
      }
      void notifySocialQueue(input.postId, postResult.post.title, postResult.post.description ?? null, postResult.post.category, postResult.post.city ?? null);
      void notifyMatchingSavedSearches({
```

- [ ] **Step 4: Wire into approvePost (~line 689)**

Find `approvePost` mutation:

```typescript
  approvePost: adminQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      const postResult = await getPostWithProfile(input.postId);
      await updatePost(input.postId, { status: "active" });
      if (postResult?.profile?.email) {
        void sendPostPublished(postResult.profile.email, postResult.post.title, input.postId);
      }
```

Add after the `sendPostPublished` line:

```typescript
      if (postResult?.profile?.email) {
        void sendPostPublished(postResult.profile.email, postResult.post.title, input.postId);
      }
      if (postResult?.post) {
        void notifySocialQueue(input.postId, postResult.post.title, postResult.post.description ?? null, postResult.post.category, postResult.post.city ?? null);
        void notifyMatchingSavedSearches({
```

- [ ] **Step 5: Wire into leaveReview mutation**

Find `leaveReview` mutation. After the `insert reviews` call:

```typescript
      await getDb().insert(schema.reviews).values({
        postId: input.postId,
        reviewerId,
        revieweeId: input.revieweeId,
        stars: input.stars,
        comment: input.comment,
      }).onDuplicateKeyUpdate({ set: { stars: input.stars, comment: input.comment } });

      return { success: true };
```

Add before `return { success: true }`:

```typescript
      const reviewedPost = await getDb()
        .select({ category: schema.posts.category, city: schema.posts.city })
        .from(schema.posts)
        .where(eq(schema.posts.id, input.postId))
        .limit(1)
        .then((r) => r[0]);
      if (reviewedPost) {
        void notifyReview(input.stars, reviewedPost.category, reviewedPost.city ?? null);
      }

      return { success: true };
```

- [ ] **Step 6: Wire into stripe.ts**

In `api/stripe.ts`, add import at the top:

```typescript
import { notifySocialQueue } from "./lib/social-notify";
```

Find the Stripe webhook where post status is set to active (~line 214):

```typescript
          await updatePost(post.id, {
            status: "active",
            paidAt: new Date(),
            stripePaymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          });
          const profile = await getProfileByUserId(Number(userId));
          if (profile?.email) void sendPostPublished(profile.email, post.title, post.id);
```

Add after `sendPostPublished`:

```typescript
          const profile = await getProfileByUserId(Number(userId));
          if (profile?.email) void sendPostPublished(profile.email, post.title, post.id);
          void notifySocialQueue(post.id, post.title, post.description ?? null, post.category, post.city ?? null);
```

- [ ] **Step 7: Commit**

```bash
git add api/posts-router.ts api/stripe.ts
git commit -m "feat: fire n8n webhook on post activation and 5-star review"
```

---

## Task 8: Frontend UTM capture

**Files:**
- Create: `src/hooks/useUTM.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create useUTM hook**

Create `src/hooks/useUTM.ts`:

```typescript
import { useEffect } from "react";
import { useLocation } from "react-router";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

export function useUTM(): void {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasUtm = UTM_KEYS.some((k) => params.has(k));
    if (!hasUtm) return;
    UTM_KEYS.forEach((k) => {
      const val = params.get(k);
      if (val) sessionStorage.setItem(k, val);
    });
  }, [location.search]);
}

export function getStoredUTM(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  return {
    utm_source: sessionStorage.getItem("utm_source") ?? undefined,
    utm_medium: sessionStorage.getItem("utm_medium") ?? undefined,
    utm_campaign: sessionStorage.getItem("utm_campaign") ?? undefined,
  };
}

export function clearStoredUTM(): void {
  UTM_KEYS.forEach((k) => sessionStorage.removeItem(k));
}
```

- [ ] **Step 2: Use hook in App.tsx and send UTMs to backend**

In `src/App.tsx`, update the React import to include `useEffect` (currently only imports `lazy, Suspense`):

```typescript
import { lazy, Suspense, useEffect } from "react";
```

Add two more imports (trpc and useUTM — `useAuth` is already imported):

```typescript
import { trpc } from "@/providers/trpc";
import { useUTM, getStoredUTM, clearStoredUTM } from "@/hooks/useUTM";
```

Inside the `App` function component, before the `return`, add:

```typescript
export default function App() {
  const { user, isAuthenticated } = useAuth();
  useUTM();

  const setUtm = trpc.auth.setUtm.useMutation();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const utm = getStoredUTM();
    if (!utm.utm_source) return;
    setUtm.mutate(utm, {
      onSuccess: () => clearStoredUTM(),
    });
  }, [isAuthenticated, user?.id]);

  return (
```

Note: the existing `App` component doesn't destructure `useAuth()` — it does so in the `AdminRoute` sub-component. Add the `useAuth` call at the top of `App` function as shown. Check if `useAuth` is already imported — if not, add it to the import.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUTM.ts src/App.tsx
git commit -m "feat: capture UTM params and send to backend on first authenticated load"
```

---

## Task 9: Backend setUtm mutation + UTM on email register

**Files:**
- Modify: `api/auth-router.ts`
- Modify: `api/email-auth.ts`

- [ ] **Step 1: Add setUtm mutation to auth-router.ts**

In `api/auth-router.ts`, add inside `createRouter({...})` after the existing mutations:

```typescript
  setUtm: authedQuery
    .input(
      z.object({
        utm_source: z.string().max(100).optional(),
        utm_medium: z.string().max(100).optional(),
        utm_campaign: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.utm_source) return { success: false };
      // Idempotent: only set if not already captured (first-touch attribution)
      await getDb()
        .update(schema.users)
        .set({
          utmSource: input.utm_source,
          utmMedium: input.utm_medium ?? null,
          utmCampaign: input.utm_campaign ?? null,
        })
        .where(
          and(
            eq(schema.users.id, ctx.user.id),
            isNull(schema.users.utmSource)
          )
        );
      return { success: true };
    }),
```

Add `isNull` to the drizzle imports at the top of `auth-router.ts`:

```typescript
import { eq, isNull, and } from "drizzle-orm";
```

Also add the `z` import if not present and `schema` import if not present — check top of file, they should already be there.

- [ ] **Step 2: Add UTM to email register input**

In `api/email-auth.ts`, update the `register` mutation input schema:

```typescript
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        referralCode: z.string().optional(),
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(100).optional(),
      })
    )
```

Then in the `createUser` call, add the UTM fields:

```typescript
      const result = await createUser({
        email: input.email,
        name: input.name,
        passwordHash,
        authMethod: "email",
        role: "user",
        lastSignInAt: new Date(),
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
      });
```

- [ ] **Step 3: Verify createUser accepts UTM fields (no changes needed)**

`api/queries/users.ts` defines `createUser(data: InsertUser)` which does:
```typescript
await getDb().insert(schema.users).values(data);
```
`InsertUser` is `typeof users.$inferInsert` — it automatically includes the new `utmSource`, `utmMedium`, `utmCampaign` fields added to the schema in Task 4. No changes to `queries/users.ts` required.

- [ ] **Step 4: Update Register page to pass UTMs**

In `src/pages/Login.tsx`, add import at top:
```typescript
import { getStoredUTM } from "@/hooks/useUTM";
```

Find line 85 where `registerMutation.mutate` is called:
```typescript
      registerMutation.mutate({ name, email, password, referralCode: referralCode || undefined });
```

Replace with:
```typescript
      const utm = getStoredUTM();
      registerMutation.mutate({
        name,
        email,
        password,
        referralCode: referralCode || undefined,
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign,
      });
```

- [ ] **Step 5: Commit**

```bash
git add api/auth-router.ts api/email-auth.ts src/pages/Login.tsx
git commit -m "feat: store UTM attribution on user create and via setUtm mutation"
```

---

## Task 10: New cron endpoints

**Files:**
- Modify: `api/cron-router.ts`
- Modify: `api/lib/email.ts`

- [ ] **Step 1: Add sendRetentionEmail to email.ts**

At the end of `api/lib/email.ts`, add:

```typescript
export async function sendRetentionEmail(
  to: string,
  posts: Array<{ id: number; title: string; city: string | null; category: string }>
): Promise<void> {
  try {
    const listItems = posts
      .map(
        (p) =>
          `<li style="margin-bottom:12px;"><a href="https://jobsy.lv/post/${p.id}?utm_source=email&utm_medium=retention&utm_campaign=weekly" style="color:#064E3B;font-weight:bold;text-decoration:none;">${escHtml(p.title)}</a>${p.city ? ` — ${escHtml(p.city)}` : ""}</li>`
      )
      .join("");
    await getResend().emails.send({
      from: FROM,
      to,
      subject: "Jauni sludinājumi tev tuvumā 🔍",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #FAF6F0; padding: 40px 32px;">
          <h1 style="font-size: 28px; color: #1A1208; margin-bottom: 8px;">jobsy<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#064E3B;margin-left:2px;vertical-align:middle;"></span></h1>
          <hr style="border: 2px solid #1A1208; margin: 16px 0 32px;" />
          <h2 style="font-size: 20px; color: #1A1208; margin-bottom: 16px;">Šīs nedēļas jaunie sludinājumi</h2>
          <ul style="padding-left: 20px; color: #4A3728; font-size: 15px; line-height: 1.8;">${listItems}</ul>
          <a href="https://jobsy.lv?utm_source=email&utm_medium=retention&utm_campaign=weekly" style="display:inline-block;margin-top:24px;background:#064E3B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;">
            Skatīt visus sludinājumus →
          </a>
          <p style="color: #8A7060; font-size: 12px; margin-top: 32px;">© 2026 jobsy.lv</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[email] sendRetentionEmail failed:", err);
  }
}
```

- [ ] **Step 2: Add /weekly-report cron endpoint**

At the end of `api/cron-router.ts`, add:

```typescript
cronRouter.get("/weekly-report", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers,
    totalActivePosts,
    newPosts,
    filledPosts,
    paidPostsThisWeek,
    unresolvedReports,
    failedSocialPosts,
    utmBreakdown,
  ] = await Promise.all([
    getDb().select({ c: count() }).from(schema.users).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, weekAgo)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "active")).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(gte(schema.posts.createdAt, weekAgo)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(and(eq(schema.posts.filled, true), gte(schema.posts.updatedAt, weekAgo))).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(and(eq(schema.posts.wasFree, false), gte(schema.posts.paidAt!, weekAgo))).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.reports).where(eq(schema.reports.resolved, false)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.socialQueue).where(eq(schema.socialQueue.status, "failed")).then((r) => r[0]?.c ?? 0),
    getDb()
      .select({ source: schema.users.utmSource, cnt: count() })
      .from(schema.users)
      .where(and(gte(schema.users.createdAt, weekAgo), isNotNull(schema.users.utmSource)))
      .groupBy(schema.users.utmSource)
      .then((rows) => rows.map((r) => ({ source: r.source ?? "unknown", count: r.cnt }))),
  ]);

  return c.json({
    period: { from: weekAgo.toISOString(), to: now.toISOString() },
    users: { total: totalUsers, newThisWeek: newUsers },
    posts: { active: totalActivePosts, newThisWeek: newPosts, filledThisWeek: filledPosts },
    revenue: { paidPostsThisWeek, estimatedEur: paidPostsThisWeek * 2 },
    moderation: { unresolvedReports },
    social: { failedPosts: failedSocialPosts },
    acquisition: utmBreakdown,
  });
});
```

Add missing imports to the top of `cron-router.ts`. The file already imports `eq, and, lte, gte, isNull, or, sql, inArray` — add:
```typescript
import { eq, and, lte, gte, isNull, isNotNull, or, sql, inArray, count } from "drizzle-orm";
```

- [ ] **Step 3: Add /digest-data cron endpoint**

```typescript
cronRouter.get("/digest-data", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const topPosts = await getDb()
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      category: schema.posts.category,
      city: schema.posts.city,
      viewCount: schema.posts.viewCount,
      type: schema.posts.type,
    })
    .from(schema.posts)
    .where(eq(schema.posts.status, "active"))
    .orderBy(desc(schema.posts.viewCount))
    .limit(5);

  return c.json({ posts: topPosts, generatedAt: new Date().toISOString() });
});
```

Add `desc` to the drizzle import at the top of `cron-router.ts`:
```typescript
import { eq, and, lte, gte, isNull, isNotNull, or, sql, inArray, count, desc } from "drizzle-orm";
```

- [ ] **Step 4: Add /retention-email cron endpoint**

```typescript
cronRouter.get("/retention-email", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Users: registered >7 days ago, last sign-in >14 days ago, no retention email in last 7 days
  const candidates = await getDb()
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      city: schema.profiles.city,
      retentionEmailSentAt: schema.profiles.retentionEmailSentAt,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
    .where(
      and(
        lte(schema.users.createdAt, sevenDaysAgo),
        lte(schema.users.lastSignInAt, fourteenDaysAgo),
        eq(schema.users.role, "user"),
        or(
          isNull(schema.profiles.retentionEmailSentAt),
          lte(schema.profiles.retentionEmailSentAt, oneWeekAgo)
        )
      )
    )
    .limit(100); // batch 100 per run

  let sent = 0;
  for (const candidate of candidates) {
    if (!candidate.email || !candidate.city) continue;

    const recentPosts = await getDb()
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        city: schema.posts.city,
        category: schema.posts.category,
      })
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.status, "active"),
          eq(schema.posts.city, candidate.city)
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(3);

    if (recentPosts.length === 0) continue;

    try {
      await sendRetentionEmail(candidate.email, recentPosts);
      await getDb()
        .update(schema.profiles)
        .set({ retentionEmailSentAt: now })
        .where(eq(schema.profiles.userId, candidate.userId));
      sent++;
    } catch (err) {
      console.error("[cron/retention-email] failed for user", candidate.userId, err);
    }
  }

  return c.json({ ok: true, sent, checked: candidates.length });
});
```

Add import for `sendRetentionEmail` at the top of `cron-router.ts`:

```typescript
import { sendExpiryReminder, sendSearchAlert, sendPostExpired, sendRetentionEmail } from "./lib/email";
```

- [ ] **Step 5: Commit**

```bash
git add api/cron-router.ts api/lib/email.ts
git commit -m "feat: add /weekly-report, /digest-data, /retention-email cron endpoints"
```

---

## Task 11: Deploy and test Jobsy backend changes

- [ ] **Step 1: Push to Railway**

```bash
git push origin main
```

Railway auto-deploys from main. Watch logs in Railway dashboard for errors.

- [ ] **Step 2: Test /weekly-report endpoint**

```bash
curl -H "x-cron-secret: <your-CRON_SECRET>" https://jobsy.lv/api/cron/weekly-report
```

Expected: JSON with users, posts, revenue, acquisition objects.

- [ ] **Step 3: Test /digest-data endpoint**

```bash
curl -H "x-cron-secret: <your-CRON_SECRET>" https://jobsy.lv/api/cron/digest-data
```

Expected: JSON with `posts` array of top 5 active listings.

- [ ] **Step 4: Test webhook fires on post activation**

Publish a test post (free post). Check Railway logs for the line:
```
[social-notify] called with postId=<id>
```
(If you want logging, temporarily add `console.log` to `notifySocialQueue` — remove after test.)

- [ ] **Step 5: Test UTM capture**

Visit `https://jobsy.lv?utm_source=test&utm_medium=plan&utm_campaign=test123` in browser.
Open DevTools → Application → sessionStorage — verify `utm_source=test` is stored.
Register a new account. Check DB: `SELECT utmSource, utmMedium, utmCampaign FROM users ORDER BY createdAt DESC LIMIT 1;`
Expected: `test`, `plan`, `test123`.

---

## Task 12: Configure n8n — Workflow 1: new-listing

**Files:** n8n UI at `https://n8n-jobsy.up.railway.app`

- [ ] **Step 1: Create new workflow in n8n**

In n8n: New Workflow → name it "new-listing".

- [ ] **Step 2: Add Webhook trigger node**

Add node → "Webhook". Configure:
- HTTP Method: POST
- Path: `new-listing`
- Authentication: None (Jobsy sends to this URL without auth)
- Response Mode: Immediately

The webhook URL will be: `https://n8n-jobsy.up.railway.app/webhook/new-listing`
Copy this URL and set it as `N8N_WEBHOOK_URL` in Railway Jobsy env vars.

- [ ] **Step 3: Add HTTP Request node — Claude API captions**

Add node → "HTTP Request". Connect to Webhook node.

Configure:
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Headers:
  - `anthropic-version`: `2023-06-01`
  - `x-api-key`: `<ANTHROPIC_API_KEY from Railway env vars>`
  - `content-type`: `application/json`
- Body (JSON):
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 400,
  "messages": [
    {
      "role": "user",
      "content": "Write 3 social media captions for this Latvian job board listing. Each caption max 120 characters. Include the URL. Return JSON only: {\"lv\": \"...\", \"ru\": \"...\", \"en\": \"...\"}\n\nTitle: {{ $json.body.title }}\nCategory: {{ $json.body.category }}\nCity: {{ $json.body.city }}\nURL: https://jobsy.lv/post/{{ $json.body.postId }}?utm_source=PLATFORM&utm_medium=auto-post&utm_campaign=listing-{{ $json.body.postId }}"
    }
  ]
}
```

- [ ] **Step 4: Add Code node — parse Claude response + build captions**

Add node → "Code". Connect to Claude HTTP node.

```javascript
const raw = $input.first().json.content[0].text;
let captions;
try {
  captions = JSON.parse(raw);
} catch {
  captions = { lv: $('Webhook').first().json.body.title, ru: $('Webhook').first().json.body.title, en: $('Webhook').first().json.body.title };
}

const postId = $('Webhook').first().json.body.postId;
const platforms = ["telegram", "facebook", "instagram", "linkedin"];

return platforms.map(platform => ({
  json: {
    platform,
    caption: platform === "linkedin" ? captions.en : captions.lv,
    caption_ru: captions.ru,
    postId,
    imagePrompt: `Clean minimal job listing card, category: ${$('Webhook').first().json.body.category}, city: ${$('Webhook').first().json.body.city ?? 'Latvia'}, emerald green and white, modern flat design, no text`,
    url: `https://jobsy.lv/post/${postId}?utm_source=${platform}&utm_medium=auto-post&utm_campaign=listing-${postId}`,
  }
}));
```

- [ ] **Step 5: Add HTTP Request node — Pollinations.ai image**

Add node → "HTTP Request". Connect to Code node.

Configure:
- Method: GET
- URL: `https://image.pollinations.ai/prompt/{{ encodeURIComponent($json.imagePrompt) }}?width=1200&height=630&nologo=true`
- Response Format: File

- [ ] **Step 6: Add HTTP Request node — Postiz create post**

Add node → "HTTP Request". Connect to Pollinations node.

Configure:
- Method: POST
- URL: `https://<postiz-railway-domain>/api/posts`
- Headers:
  - `Authorization`: `Bearer <POSTIZ_API_KEY>`
  - `content-type`: `application/json`
- Body (JSON):
```json
{
  "content": "{{ $('Code').item.json.caption }}\n\n{{ $('Code').item.json.url }}",
  "channels": ["{{ $('Code').item.json.platform }}"],
  "scheduleDate": "{{ new Date(Date.now() + Math.floor(Math.random() * 25 + 5) * 60000).toISOString() }}"
}
```

Note: Postiz API structure may vary — check Postiz docs at `https://<postiz-domain>/api/docs` after deployment.

- [ ] **Step 7: Activate workflow**

Toggle workflow to Active. Test by publishing a listing on Jobsy.lv and watching n8n execution log.

---

## Task 13: Configure n8n — Workflow 5: weekly-owner-report (Monday 08:00)

**Files:** n8n UI

- [ ] **Step 1: Create workflow named "weekly-owner-report"**

New workflow → name "weekly-owner-report".

- [ ] **Step 2: Add Schedule Trigger**

Node → "Schedule Trigger":
- Trigger at: Monday, 08:00 (Europe/Riga timezone — set in n8n settings)

- [ ] **Step 3: Add HTTP Request → /weekly-report**

Node → "HTTP Request":
- Method: GET
- URL: `https://jobsy.lv/api/cron/weekly-report`
- Headers: `x-cron-secret`: `<your CRON_SECRET>`

- [ ] **Step 4: Add HTTP Request → Claude API for email formatting**

Node → "HTTP Request":
- Method: POST
- URL: `https://api.anthropic.com/v1/messages`
- Headers: same as Workflow 1
- Body:
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1000,
  "messages": [
    {
      "role": "user",
      "content": "Format this Jobsy.lv weekly stats as a clean HTML email in Latvian. Be concise. Include bar charts using unicode block characters (█░). Data: {{ JSON.stringify($json) }}"
    }
  ]
}
```

- [ ] **Step 5: Add HTTP Request → Resend email**

Node → "HTTP Request":
- Method: POST
- URL: `https://api.resend.com/emails`
- Headers:
  - `Authorization`: `Bearer <RESEND_API_KEY>`
  - `content-type`: `application/json`
- Body:
```json
{
  "from": "jobsy.lv <noreply@jobsy.lv>",
  "to": "matriks423@gmail.com",
  "subject": "Jobsy.lv nedēļas atskaite — {{ new Date().toISOString().split('T')[0] }}",
  "html": "{{ $('HTTP Request3').item.json.content[0].text }}"
}
```

- [ ] **Step 6: Activate workflow**

---

## Task 14: Configure n8n — Workflows 2-4 (digest, spotlight, monthly)

**Files:** n8n UI

- [ ] **Step 1: Create "weekly-digest" workflow (Sunday 10:00)**

New workflow → "weekly-digest".

Schedule Trigger: Sunday 10:00.

Chain:
1. HTTP GET → `https://jobsy.lv/api/cron/digest-data` (with cron secret header)
2. HTTP POST → Claude API:
   ```
   "Write a social media post in Latvian announcing top 5 listings this week on jobsy.lv. Include: {{ $json.posts.map(p => p.title + ' (' + (p.city ?? 'Latvia') + ')').join(', ') }}. Max 200 chars. Add URL: https://jobsy.lv?utm_source=PLATFORM&utm_medium=digest&utm_campaign=weekly-{{ new Date().toISOString().substring(0,10) }}"
   ```
3. HTTP GET → Pollinations.ai: `https://image.pollinations.ai/prompt/Top+jobs+Latvia+this+week+emerald+green+minimal+infographic?width=1200&height=630&nologo=true`
4. HTTP POST → Postiz: post to all channels with digest content

- [ ] **Step 2: Create "monday-spotlight" workflow (Monday 09:00)**

New workflow → "monday-spotlight".

Schedule Trigger: Monday 09:00.

Add a "Code" node first to pick this week's category (rotate by week number):
```javascript
const categories = ["household", "moving", "repairs", "garden", "auto", "childcare", "pets", "it", "tutoring", "other"];
const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
return [{ json: { category: categories[weekNum % categories.length] } }];
```

Chain:
1. HTTP GET → `https://jobsy.lv/api/trpc/posts.countByStatus?input={"json":{"category":"{{ $json.category }}"}}` (public endpoint)
2. HTTP POST → Claude API: `"Write a 120-char Latvian social post asking if anyone needs {{ $json.category }} help in Latvia. Include https://jobsy.lv/kategorija/{{ $json.category }}?utm_source=telegram&utm_medium=spotlight&utm_campaign=category-{{ $json.category }}"`
3. HTTP GET → Pollinations.ai: `https://image.pollinations.ai/prompt/{{ $json.category }}+service+Latvia+emerald+green+minimal?nologo=true`
4. HTTP POST → Postiz: post to Telegram + Facebook only

- [ ] **Step 3: Create "monthly-stats" workflow (1st of month 09:00)**

New workflow → "monthly-stats".

Schedule Trigger: 1st of each month, 09:00. (In n8n: Cron Expression `0 9 1 * *`)

Chain:
1. HTTP GET → `https://jobsy.lv/api/cron/weekly-report` (reuse — returns period stats)
2. HTTP POST → Claude API: `"Write a celebratory Latvian social post with monthly milestone stats from this data. Focus on helpers found and new users. Max 150 chars. Data: {{ JSON.stringify($json) }}. Add URL: https://jobsy.lv?utm_source=facebook&utm_medium=roundup&utm_campaign=monthly-{{ new Date().toISOString().substring(0,7) }}"`
3. HTTP POST → Postiz: all channels

---

## Task 15: Configure n8n — Workflow 6: new-review

**Files:** n8n UI

- [ ] **Step 1: Create "new-review" workflow**

New workflow → "new-review".

- [ ] **Step 2: Add Webhook trigger**

Node → "Webhook":
- Path: `new-review`
- Method: POST

URL: `https://n8n-jobsy.up.railway.app/webhook/new-review`
Set this as `N8N_REVIEW_WEBHOOK_URL` in Railway Jobsy env.

- [ ] **Step 3: Chain Claude + Postiz**

1. HTTP POST → Claude API:
   ```
   "Write a short celebratory Latvian social proof post (max 100 chars) for a 5-star review on a {{ $json.body.category }} job in {{ $json.body.city ?? 'Latvia' }} from jobsy.lv. Include ⭐⭐⭐⭐⭐"
   ```
2. HTTP POST → Postiz: post to Telegram + Instagram only

- [ ] **Step 4: Activate workflow**

---

## Task 16: Set up UptimeRobot monitoring

- [ ] **Step 1: Create UptimeRobot account**

Go to `uptimerobot.com` → Sign up free.

- [ ] **Step 2: Add monitors**

Add these monitors (HTTP type, 5-minute interval):
1. `https://jobsy.lv` — main site
2. `https://jobsy.lv/health` — backend health check
3. `https://n8n-jobsy.up.railway.app` — n8n health
4. `https://<postiz-domain>` — Postiz health

Set alert email: matriks423@gmail.com for all monitors.

---

## Manual Actions Checklist (owner does these once, NOT automated)

These require manual steps in external services — APIs cannot do them on your behalf:

### Social Accounts to Create

- [ ] **Facebook Page**: Go to facebook.com/pages/create → Business → name "Jobsy.lv" → category "Employment Agency" → set profile pic (jobsy.lv logo) + cover photo

- [ ] **Instagram Business**: Create @jobsy.lv Instagram → go to Settings → Account → Switch to Professional Account → Business → connect to the Facebook Page

- [ ] **Telegram Channel**: Open Telegram → New Channel → name "Jobsy.lv 🇱🇻" → public → username `@jobsylv` → add description: "Latvijas palīgu sludinājumu platforma. Atrodi palīgu vai darbu! 🔗 jobsy.lv" → post first message with link

- [ ] **LinkedIn Company Page**: linkedin.com/company/setup/new → Company → name "Jobsy.lv" → Employment website → URL `jobsy.lv`

- [ ] **Reddit Account**: Create `u/jobsylv` on Reddit → subscribe to r/latvia, r/riga → verify email

### Meta Developer App (Facebook + Instagram API)

- [ ] Go to `developers.facebook.com` → Create App → Business type
- [ ] Add Facebook Login + Instagram products
- [ ] Generate a Page Access Token for the Jobsy.lv Facebook Page (never expires if you request `pages_manage_posts` permission)
- [ ] Generate an Instagram Graph API token (same app, linked Instagram account)
- [ ] Enter both tokens in Postiz → Settings → Channels when connecting Facebook and Instagram

### Telegram Bot

- [ ] Open Telegram → search `@BotFather` → `/newbot` → name "Jobsy Bot" → username `JobsyLvBot`
- [ ] Copy the Bot API token
- [ ] Add the bot to your Jobsy.lv Telegram channel as admin
- [ ] Enter the token in Postiz → Settings → Channels → Telegram

### Draugiem.lv (future phase — not in this plan)

- [ ] Register at `dev.draugiem.lv` for developer access — takes 1-2 weeks for approval

### Business Outreach (manual seeding)

- [ ] Create Apollo.io free account (50 leads/month) → search "cleaning companies Riga Latvia"
- [ ] Create Brevo free account (brevo.com) — 300 emails/day free tier
- [ ] Join these Facebook Groups manually and introduce Jobsy.lv once per week (API cannot post to groups you don't own):
  - "Darbs Rīgā" (search on Facebook)
  - "Sludinājumi Latvijā"
  - "Rīgas pakalpojumi"
  - "IT darbs Latvijā"
  - "Mājas palīgi Latvijā"

### UptimeRobot

- [ ] Set up as described in Task 16 above

---

## Verification Checklist (after full deployment)

- [ ] Publish test post → wait 10 min → verify post appears on Telegram channel
- [ ] Verify post appears on Facebook Page
- [ ] Verify post appears on Instagram
- [ ] Visit `https://jobsy.lv?utm_source=test` → register → check DB `utmSource` column is populated
- [ ] Monday 08:00 → check matriks423@gmail.com for weekly report email
- [ ] Sunday 10:00 → check all channels for weekly digest post
- [ ] n8n dashboard: all workflows show green last-execution status
- [ ] UptimeRobot: all monitors green
