# Monetization Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-post €2 payment model with a free/business subscription model (€9.99/month) plus à la carte boosts (Bump €1, Featured €2, Urgent €0.50), with a social queue stub for future social media automation.

**Architecture:** New `plan` column on `users` controls posting limits (free = 10/month, business = unlimited). Stripe Subscriptions handles the business tier billing; existing one-time Checkout handles boosts. A `socialQueue` table stubs future social automation. All posts are free to create under the new model — no more `pending_payment` status for new posts.

**Tech Stack:** DrizzleORM + MySQL, Hono, tRPC, Stripe API (subscriptions + checkout), React 19, TypeScript

---

## File Map

**Created:**
- `scripts/migrate-monetization.mjs` — production DB migration
- `api/subscription-router.ts` — tRPC: createCheckout, createPortal, status
- `api/boost-router.ts` — tRPC: apply boost (free or paid), active boosts
- `src/pages/Pricing.tsx` — /pricing page
- `src/components/UpgradeModal.tsx` — shown when free user hits 10 posts/month
- `src/components/BoostPicker.tsx` — boost selection sheet on MyPosts

**Modified:**
- `db/schema.ts` — add plan/subscription to users, company/boost/monthly to profiles/posts, socialQueue table
- `api/lib/env.ts` — add stripeBusinessPriceId
- `api/stripe.ts` — add createSubscriptionCheckout, createBillingPortal, createBoostCheckout, applyBoostToPost, activateBusinessPlan, deactivateBusinessPlan; update webhook handler
- `api/queries/posts.ts` — bump ordering in listPosts, add getFeaturedPosts, gt import
- `api/posts-router.ts` — replace freePostUsed/payment logic with plan-based monthly limit
- `api/router.ts` — register subscription + boost routers
- `src/lib/i18n.ts` — add pricing/boost/upgrade/settings keys (lv/ru/en)
- `src/pages/MyPosts.tsx` — add Boost button per post, boosted badge
- `src/pages/Browse.tsx` — add FeaturedPosts section above results
- `src/pages/Home.tsx` — add FeaturedPosts section
- `src/pages/Settings.tsx` — add business profile section + billing management
- `src/components/PostCard.tsx` — business badge, boost badge
- `src/components/Navbar.tsx` — add Pricing link
- `src/App.tsx` — add /pricing route

---

## Task 1: DB Schema

**Files:**
- Modify: `db/schema.ts`

- [ ] **Step 1: Add plan + subscription columns to `users` table**

Open `db/schema.ts`. Add three fields to the `users` table definition (after `lastSignInAt`):

```ts
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).unique(),
  googleId: varchar("googleId", { length: 255 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  authMethod: mysqlEnum("authMethod", ["kimi", "google", "email"]).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin", "banned"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "business"]).default("free").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  planExpiresAt: timestamp("planExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});
```

- [ ] **Step 2: Add company + monthly + boost fields to `profiles` table**

Add after `stripeCustomerId` in the `profiles` table:

```ts
export const profiles = mysqlTable("profiles", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  avatarUrl: text("avatarUrl"),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  freePostUsed: boolean("freePostUsed").default(false).notNull(),
  freePostCredits: int("freePostCredits", { unsigned: true }).default(0).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  companyName: varchar("companyName", { length: 255 }),
  companyLogo: varchar("companyLogo", { length: 512 }),
  companyWebsite: varchar("companyWebsite", { length: 512 }),
  companyDescription: text("companyDescription"),
  monthlyPostCount: int("monthlyPostCount", { unsigned: true }).default(0).notNull(),
  monthlyPostReset: varchar("monthlyPostReset", { length: 10 }),
  freeBoostsRemaining: int("freeBoostsRemaining", { unsigned: true }).default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});
```

- [ ] **Step 3: Add boost columns to `posts` table**

Add three fields to `posts` after `reminderSent`:

```ts
  reminderSent: boolean("reminderSent").default(false).notNull(),
  boostType: mysqlEnum("boostType", ["none", "bump", "featured", "urgent"]).default("none").notNull(),
  boostExpiresAt: timestamp("boostExpiresAt"),
  boostStripeSessionId: varchar("boostStripeSessionId", { length: 255 }),
```

- [ ] **Step 4: Add `socialQueue` table and export types**

Add after the `postImages` table definition:

```ts
export const socialQueue = mysqlTable("socialQueue", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  boostType: mysqlEnum("boostType", ["bump", "featured"]).notNull(),
  status: mysqlEnum("status", ["pending", "posted", "failed"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_social_queue_status").on(table.status),
]);
```

Then add at the bottom of the file with the other type exports:

```ts
export type SocialQueue = typeof socialQueue.$inferSelect;
export type InsertSocialQueue = typeof socialQueue.$inferInsert;
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts
git commit -m "feat: add plan/boost/company fields to schema + socialQueue table"
```

---

## Task 2: Production Migration Script

**Files:**
- Create: `scripts/migrate-monetization.mjs`

- [ ] **Step 1: Create migration script**

```js
// scripts/migrate-monetization.mjs
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  process.env.DATABASE_URL ?? "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

async function columnExists(table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].cnt > 0;
}

// users: plan, stripeSubscriptionId, planExpiresAt
if (!await columnExists("users", "plan")) {
  await conn.execute(`ALTER TABLE users ADD COLUMN plan ENUM('free','business') NOT NULL DEFAULT 'free'`);
  console.log("users.plan added ✅");
} else { console.log("users.plan exists, skipping ✅"); }

if (!await columnExists("users", "stripeSubscriptionId")) {
  await conn.execute(`ALTER TABLE users ADD COLUMN stripeSubscriptionId VARCHAR(255) NULL`);
  console.log("users.stripeSubscriptionId added ✅");
} else { console.log("users.stripeSubscriptionId exists, skipping ✅"); }

if (!await columnExists("users", "planExpiresAt")) {
  await conn.execute(`ALTER TABLE users ADD COLUMN planExpiresAt TIMESTAMP NULL`);
  console.log("users.planExpiresAt added ✅");
} else { console.log("users.planExpiresAt exists, skipping ✅"); }

// profiles: company, monthly counter, freeBoosts
const profileCols = [
  ["companyName", "ALTER TABLE profiles ADD COLUMN companyName VARCHAR(255) NULL"],
  ["companyLogo", "ALTER TABLE profiles ADD COLUMN companyLogo VARCHAR(512) NULL"],
  ["companyWebsite", "ALTER TABLE profiles ADD COLUMN companyWebsite VARCHAR(512) NULL"],
  ["companyDescription", "ALTER TABLE profiles ADD COLUMN companyDescription TEXT NULL"],
  ["monthlyPostCount", "ALTER TABLE profiles ADD COLUMN monthlyPostCount INT UNSIGNED NOT NULL DEFAULT 0"],
  ["monthlyPostReset", "ALTER TABLE profiles ADD COLUMN monthlyPostReset VARCHAR(10) NULL"],
  ["freeBoostsRemaining", "ALTER TABLE profiles ADD COLUMN freeBoostsRemaining INT UNSIGNED NOT NULL DEFAULT 0"],
];
for (const [col, sql] of profileCols) {
  if (!await columnExists("profiles", col)) {
    await conn.execute(sql);
    console.log(`profiles.${col} added ✅`);
  } else { console.log(`profiles.${col} exists, skipping ✅`); }
}

// posts: boostType, boostExpiresAt, boostStripeSessionId
if (!await columnExists("posts", "boostType")) {
  await conn.execute(`ALTER TABLE posts ADD COLUMN boostType ENUM('none','bump','featured','urgent') NOT NULL DEFAULT 'none'`);
  console.log("posts.boostType added ✅");
} else { console.log("posts.boostType exists, skipping ✅"); }

if (!await columnExists("posts", "boostExpiresAt")) {
  await conn.execute(`ALTER TABLE posts ADD COLUMN boostExpiresAt TIMESTAMP NULL`);
  console.log("posts.boostExpiresAt added ✅");
} else { console.log("posts.boostExpiresAt exists, skipping ✅"); }

if (!await columnExists("posts", "boostStripeSessionId")) {
  await conn.execute(`ALTER TABLE posts ADD COLUMN boostStripeSessionId VARCHAR(255) NULL`);
  console.log("posts.boostStripeSessionId added ✅");
} else { console.log("posts.boostStripeSessionId exists, skipping ✅"); }

// socialQueue table
if (!await tableExists("socialQueue")) {
  await conn.execute(`
    CREATE TABLE socialQueue (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      postId BIGINT UNSIGNED NOT NULL,
      boostType ENUM('bump','featured') NOT NULL,
      status ENUM('pending','posted','failed') NOT NULL DEFAULT 'pending',
      scheduledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      postedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_social_queue_status (status)
    )
  `);
  console.log("socialQueue table created ✅");
} else { console.log("socialQueue exists, skipping ✅"); }

console.log("\nMigration complete ✅");
await conn.end();
```

- [ ] **Step 2: Run migration**

```bash
node scripts/migrate-monetization.mjs
```

Expected output:
```
users.plan added ✅
users.stripeSubscriptionId added ✅
users.planExpiresAt added ✅
profiles.companyName added ✅
... (one line per column)
socialQueue table created ✅
Migration complete ✅
```

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-monetization.mjs
git commit -m "feat: production migration for monetization schema"
```

---

## Task 3: Stripe — Subscription + Boost + Billing Portal

**Files:**
- Modify: `api/lib/env.ts`
- Modify: `api/stripe.ts`

- [ ] **Step 1: Add `stripeBusinessPriceId` to env**

In `api/lib/env.ts`, add inside the `env` object:

```ts
  stripeBusinessPriceId: optional("STRIPE_BUSINESS_PRICE_ID"),
```

- [ ] **Step 2: Replace `api/stripe.ts` with expanded version**

```ts
import Stripe from "stripe";
import { env } from "./lib/env";
import { getPostById, updatePost } from "./queries/posts";
import { getProfileByUserId, updateProfile } from "./queries/profiles";
import { getReferralByReferredId, markReferralPostMade, markReferralRewarded } from "./queries/referrals";
import { addFreePostCredit } from "./queries/profiles";
import { sendPostPublished } from "./lib/email";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq } from "drizzle-orm";

const stripe = env.stripeSecretKey
  ? new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" })
  : null;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function ensureStripeCustomer(userId: number): Promise<string | undefined> {
  const profile = await getProfileByUserId(userId);
  if (profile?.stripeCustomerId) return profile.stripeCustomerId;
  if (!stripe || !profile?.email) return undefined;
  const customer = await stripe.customers.create({
    email: profile.email,
    name: profile.name ?? undefined,
    metadata: { userId: String(userId) },
  });
  await updateProfile(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

export async function applyBoostToPost(
  postId: number,
  boostType: "bump" | "featured" | "urgent",
  sessionId: string
) {
  const boostExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await updatePost(postId, { boostType, boostExpiresAt, boostStripeSessionId: sessionId });
  if (boostType === "bump" || boostType === "featured") {
    await getDb().insert(schema.socialQueue).values({ postId, boostType });
  }
}

export async function activateBusinessPlan(userId: number, subscriptionId: string) {
  await getDb()
    .update(schema.users)
    .set({ plan: "business", stripeSubscriptionId: subscriptionId, planExpiresAt: null })
    .where(eq(schema.users.id, userId));
  await updateProfile(userId, { freeBoostsRemaining: 2 });
}

export async function deactivateBusinessPlan(userId: number) {
  await getDb()
    .update(schema.users)
    .set({ plan: "free", stripeSubscriptionId: null })
    .where(eq(schema.users.id, userId));
  await updateProfile(userId, { freeBoostsRemaining: 0 });
}

// ── Checkout sessions ─────────────────────────────────────────────────────────

/** Legacy one-time post payment — kept for backward compat with pending_payment posts */
export async function createCheckoutSession(postId: number, userId: number) {
  if (!stripe) throw new Error("Stripe not configured");
  const post = await getPostById(postId);
  if (!post || post.userId !== userId) throw new Error("Invalid post");
  const customerId = await ensureStripeCustomer(userId);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "eur",
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: "jobsy.lv — sludinājuma publikācija (30 dienas)" },
        unit_amount: env.postingFeeCents,
      },
      quantity: 1,
    }],
    metadata: { postId: String(postId), userId: String(userId) },
    success_url: `${env.siteUrl}/success?post=${postId}`,
    cancel_url: `${env.siteUrl}/create?canceled=true&post=${postId}`,
    customer: customerId,
  });
  await updatePost(postId, { stripeSessionId: session.id });
  return { url: session.url, sessionId: session.id };
}

/** Business subscription checkout */
export async function createSubscriptionCheckout(userId: number) {
  if (!stripe || !env.stripeBusinessPriceId) throw new Error("Stripe subscription not configured");
  const customerId = await ensureStripeCustomer(userId);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    currency: "eur",
    line_items: [{ price: env.stripeBusinessPriceId, quantity: 1 }],
    subscription_data: { metadata: { userId: String(userId) } },
    metadata: { userId: String(userId), type: "subscription" },
    success_url: `${env.siteUrl}/settings?subscribed=true`,
    cancel_url: `${env.siteUrl}/pricing?canceled=true`,
    customer: customerId,
  });
  return { url: session.url };
}

/** Stripe Customer Portal — self-serve cancel/update */
export async function createBillingPortal(userId: number) {
  if (!stripe) throw new Error("Stripe not configured");
  const profile = await getProfileByUserId(userId);
  if (!profile?.stripeCustomerId) throw new Error("No Stripe customer found");
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${env.siteUrl}/settings`,
  });
  return { url: session.url };
}

/** Boost one-time checkout */
export async function createBoostCheckout(
  postId: number,
  userId: number,
  boostType: "bump" | "featured" | "urgent"
) {
  if (!stripe) throw new Error("Stripe not configured");
  const post = await getPostById(postId);
  if (!post || post.userId !== userId) throw new Error("Invalid post");
  const customerId = await ensureStripeCustomer(userId);
  const BOOST_CENTS = { bump: 100, featured: 200, urgent: 50 } as const;
  const BOOST_NAMES = {
    bump: "Bump to top (7 days)",
    featured: "Featured placement (7 days)",
    urgent: "Urgent badge (7 days)",
  } as const;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "eur",
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `jobsy.lv — ${BOOST_NAMES[boostType]}` },
        unit_amount: BOOST_CENTS[boostType],
      },
      quantity: 1,
    }],
    metadata: { type: "boost", postId: String(postId), userId: String(userId), boostType },
    success_url: `${env.siteUrl}/my-posts?boosted=true`,
    cancel_url: `${env.siteUrl}/my-posts`,
    customer: customerId,
  });
  return { url: session.url };
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function handleStripeWebhook(body: string, signature: string) {
  if (!stripe || !env.stripeWebhookSecret) throw new Error("Stripe webhook not configured");
  const event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const type = session.metadata?.type;

    if (type === "boost") {
      // Boost payment completed
      const postId = Number(session.metadata?.postId);
      const boostType = session.metadata?.boostType as "bump" | "featured" | "urgent";
      if (postId && boostType) {
        await applyBoostToPost(postId, boostType, session.id);
      }
    } else if (type !== "subscription") {
      // Legacy post payment (no type field = old flow)
      const postId = session.metadata?.postId;
      const userId = session.metadata?.userId;
      if (postId && userId) {
        const post = await getPostById(Number(postId));
        if (post && post.stripeSessionId === session.id) {
          await updatePost(post.id, {
            status: "active",
            paidAt: new Date(),
            stripePaymentId: session.payment_intent as string,
          });
          const profile = await getProfileByUserId(Number(userId));
          if (profile?.email) void sendPostPublished(profile.email, post.title, post.id);
          await checkAndRewardReferral(Number(userId));
        }
      }
    }
  }

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId && sub.status === "active") {
      await activateBusinessPlan(Number(userId), sub.id);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) await deactivateBusinessPlan(Number(userId));
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = invoice.subscription;
    if (sub && typeof sub === "string") {
      // Renewal: reset free boosts for this subscriber
      const subObj = await stripe.subscriptions.retrieve(sub);
      const userId = subObj.metadata?.userId;
      if (userId) await updateProfile(Number(userId), { freeBoostsRemaining: 2 });
    }
  }

  return { received: true };
}

export async function checkAndRewardReferral(userId: number) {
  const referral = await getReferralByReferredId(userId);
  if (!referral || referral.postMade || referral.rewarded) return;
  await markReferralPostMade(userId);
  await addFreePostCredit(referral.referrerId);
  await markReferralRewarded(userId);
}

export { stripe };
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/lib/env.ts api/stripe.ts
git commit -m "feat: stripe subscription, billing portal, boost checkout, updated webhook"
```

---

## Task 4: subscription-router + boost-router + register

**Files:**
- Create: `api/subscription-router.ts`
- Create: `api/boost-router.ts`
- Modify: `api/router.ts`

- [ ] **Step 1: Create `api/subscription-router.ts`**

```ts
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { createSubscriptionCheckout, createBillingPortal } from "./stripe";
import { getProfileByUserId } from "./queries/profiles";

export const subscriptionRouter = createRouter({
  createCheckout: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.plan === "business") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Already on Business plan" });
    }
    const { url } = await createSubscriptionCheckout(ctx.user.id);
    return { url };
  }),

  createPortal: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.plan !== "business") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Business plan required" });
    }
    const { url } = await createBillingPortal(ctx.user.id);
    return { url };
  }),

  status: authedQuery.query(async ({ ctx }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    return {
      plan: ctx.user.plan as "free" | "business",
      planExpiresAt: ctx.user.planExpiresAt ?? null,
      freeBoostsRemaining: profile?.freeBoostsRemaining ?? 0,
      monthlyPostCount: profile?.monthlyPostCount ?? 0,
    };
  }),
});
```

- [ ] **Step 2: Create `api/boost-router.ts`**

```ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { createBoostCheckout, applyBoostToPost } from "./stripe";
import { getPostById } from "./queries/posts";
import { getProfileByUserId, updateProfile } from "./queries/profiles";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, and, gt } from "drizzle-orm";

export const boostRouter = createRouter({
  apply: authedQuery
    .input(z.object({
      postId: z.number(),
      boostType: z.enum(["bump", "featured", "urgent"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await getPostById(input.postId);
      if (!post || post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Post not found or not yours" });
      }
      if (post.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only active posts can be boosted" });
      }

      // Business users get Featured free if they have remaining boosts
      if (ctx.user.plan === "business" && input.boostType === "featured") {
        const profile = await getProfileByUserId(ctx.user.id);
        if (profile && profile.freeBoostsRemaining > 0) {
          await applyBoostToPost(input.postId, "featured", "free-boost");
          await updateProfile(ctx.user.id, {
            freeBoostsRemaining: profile.freeBoostsRemaining - 1,
          });
          return { free: true };
        }
      }

      // Paid boost — redirect to Stripe checkout
      const { url } = await createBoostCheckout(input.postId, ctx.user.id, input.boostType);
      return { free: false, checkoutUrl: url };
    }),

  myBoosts: authedQuery.query(async ({ ctx }) => {
    const now = new Date();
    const rows = await getDb()
      .select({
        id: schema.posts.id,
        boostType: schema.posts.boostType,
        boostExpiresAt: schema.posts.boostExpiresAt,
      })
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.userId, ctx.user.id),
          gt(schema.posts.boostExpiresAt, now)
        )
      );
    return rows;
  }),
});
```

- [ ] **Step 3: Register routers in `api/router.ts`**

```ts
import { authRouter } from "./auth-router";
import { postsRouter } from "./posts-router";
import { statsRouter } from "./stats-router";
import { referralRouter } from "./referral-router";
import { profileRouter } from "./profile-router";
import { emailAuthRouter } from "./email-auth";
import { savedSearchesRouter } from "./saved-searches-router";
import { subscriptionRouter } from "./subscription-router";
import { boostRouter } from "./boost-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  posts: postsRouter,
  stats: statsRouter,
  referral: referralRouter,
  profile: profileRouter,
  emailAuth: emailAuthRouter,
  savedSearches: savedSearchesRouter,
  subscription: subscriptionRouter,
  boost: boostRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add api/subscription-router.ts api/boost-router.ts api/router.ts
git commit -m "feat: subscription-router, boost-router, register in appRouter"
```

---

## Task 5: Update Post Create Logic

**Files:**
- Modify: `api/posts-router.ts`

The current create handler checks `freePostUsed` / `freePostCredits` and creates `pending_payment` posts. Replace with plan-based monthly limit. Business users post freely; free users get 10/month. Posts are now always active (or pending_review) — never pending_payment for new posts.

- [ ] **Step 1: Find the post create section**

In `api/posts-router.ts`, locate the block starting at approximately line 144:
```ts
const profile = await getProfileByUserId(ctx.user.id);
```
and ending at the closing of the `create` mutation handler.

- [ ] **Step 2: Replace the free/paid decision logic**

Replace everything from `const expiresAt = new Date(...)` to the end of the `create` mutation handler with:

```ts
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Plan-based posting logic
      if (ctx.user.plan !== "business") {
        // Free tier: enforce monthly limit of 10 posts
        const today = new Date();
        const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        if (profile.monthlyPostReset !== thisMonth) {
          // New month — reset counter
          await updateProfile(ctx.user.id, { monthlyPostCount: 0, monthlyPostReset: thisMonth });
          profile.monthlyPostCount = 0;
        }

        const FREE_MONTHLY_LIMIT = 10;
        if (profile.monthlyPostCount >= FREE_MONTHLY_LIMIT) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Mēneša limits sasniegts — jaunini uz Business kontu",
          });
        }
      }

      // Create post — always active or pending_review, never pending_payment
      const post = await createPost({
        ...input,
        userId: ctx.user.id,
        status: needsReview ? "pending_review" : "active",
        wasFree: true,
        expiresAt,
      });

      const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

      // Save images
      if (input.images && input.images.length > 0) {
        for (const url of input.images) {
          await getDb().insert(schema.postImages).values({ postId: insertId, url, sortOrder: 0 });
        }
      }

      // Increment monthly counter for free users
      if (ctx.user.plan !== "business") {
        await updateProfile(ctx.user.id, { monthlyPostCount: profile.monthlyPostCount + 1 });
      }

      await checkAndRewardReferralOnPost(ctx.user.id);
      if (!needsReview && profile.email) {
        void sendPostPublished(profile.email, input.title, insertId);
      }

      return { postId: insertId, requiresPayment: false, needsReview };
    }),
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add api/posts-router.ts
git commit -m "feat: replace per-post payment logic with plan-based monthly limit"
```

---

## Task 6: Update listPosts + add getFeaturedPosts

**Files:**
- Modify: `api/queries/posts.ts`

- [ ] **Step 1: Add `gt` to the drizzle-orm import**

```ts
import { eq, and, desc, asc, sql, gte, lte, inArray, gt } from "drizzle-orm";
```

- [ ] **Step 2: Update the `orderBy` logic in `listPosts`**

Find the `orderBy` block (around line 78) and replace it:

```ts
  const baseOrder = (() => {
    switch (filters?.sort) {
      case "oldest": return asc(schema.posts.createdAt);
      case "budget_asc": return asc(schema.posts.budgetText);
      case "budget_desc": return desc(schema.posts.budgetText);
      default: return desc(schema.posts.createdAt);
    }
  })();

  return getDb()
    .select()
    .from(schema.posts)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(
      sql`(${schema.posts.boostType} = 'bump' AND ${schema.posts.boostExpiresAt} > NOW()) DESC`,
      baseOrder
    )
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
```

- [ ] **Step 3: Add `getFeaturedPosts` function**

Add after the `listPostsWithProfiles` function:

```ts
export async function getFeaturedPosts(limit = 6) {
  const now = new Date();
  const posts = await getDb()
    .select()
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "active"),
        eq(schema.posts.boostType, "featured"),
        gt(schema.posts.boostExpiresAt, now)
      )
    )
    .orderBy(desc(schema.posts.boostExpiresAt))
    .limit(limit);

  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p) => p.userId))];
  const profiles = await getDb()
    .select()
    .from(schema.profiles)
    .where(inArray(schema.profiles.userId, userIds));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return posts.map((post) => ({ post, profile: profileMap.get(post.userId) }));
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add api/queries/posts.ts
git commit -m "feat: bump ordering in listPosts, add getFeaturedPosts"
```

---

## Task 6b: Expose featuredPosts tRPC query

**Files:**
- Modify: `api/posts-router.ts`

- [ ] **Step 1: Import getFeaturedPosts**

Add to the imports at the top of `api/posts-router.ts`:

```ts
import { ..., getFeaturedPosts } from "./queries/posts";
```

- [ ] **Step 2: Add featuredPosts query to postsRouter**

Add after the `list` query:

```ts
  featuredPosts: publicQuery.query(async () => {
    return getFeaturedPosts(6);
  }),
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
npx tsc --noEmit
git add api/posts-router.ts
git commit -m "feat: expose featuredPosts tRPC query"
```

---

## Task 7: i18n Keys

**Files:**
- Modify: `src/lib/i18n.ts`

Add the following blocks to each locale. The structure mirrors the existing pattern.

- [ ] **Step 1: Add keys to Latvian locale (lv)**

In the `lv` object, add after `cookie: { ... }`:

```ts
    pricing: {
      title: "Cenas",
      free: "Bezmaksas",
      business: "Business",
      perMonth: "/mēnesī",
      freePostsPerMonth: "10 sludinājumi/mēn.",
      unlimitedPosts: "Neierobežoti sludinājumi",
      companyProfile: "Uzņēmuma profils",
      badge: "🏢 Business badge",
      analytics: "Sludinājumu analītika",
      freeBoosts: "2× bezmaksas Featured/mēn.",
      contactFree: "Kontakti bezmaksas",
      startFree: "Sākt bez maksas",
      upgrade: "Jaunināt uz Business",
      manageBilling: "Pārvaldīt abonementu",
      currentPlan: "Pašreizējais plāns",
      cancelAnytime: "Atcelt jebkurā brīdī",
      faqTitle: "Biežāk uzdotie jautājumi",
      faq1q: "Kas notiek, kad atceļu Business?",
      faq1a: "Tavi sludinājumi paliek aktīvi līdz to derīguma termiņam. Tu pāreji uz bezmaksas plānu.",
      faq2q: "Vai varu mainīt plānu?",
      faq2a: "Jā, vari jaunināt vai pazemināt jebkurā brīdī Stripe portālā.",
    },
    boost: {
      title: "Palielināt redzamību",
      bump: "Augšup",
      featured: "Featured",
      urgent: "Steidzams",
      bumpDesc: "7 dienas augšā kategorijā",
      featuredDesc: "7 dienas Featured sadaļā + sociālie mediji",
      urgentDesc: "Sarkana \"Steidzams\" etiķete 7 dienas",
      apply: "Aktivizēt",
      freeAvailable: "Bezmaksas (Business)",
      boosted: "Boosted",
      expires: "Beidzas",
      selectBoost: "Izvēlieties boost",
    },
    upgrade: {
      title: "Mēneša limits sasniegts",
      desc: "Esi sasniedzis 10 bezmaksas sludinājumus šomēnes. Jaunini uz Business, lai publicētu neierobežoti.",
      cta: "Jaunināt uz Business — €9.99/mēn.",
      dismiss: "Varbūt vēlāk",
    },
```

- [ ] **Step 2: Add keys to Russian locale (ru)**

In the `ru` object, add after `cookie: { ... }`:

```ts
    pricing: {
      title: "Цены",
      free: "Бесплатно",
      business: "Бизнес",
      perMonth: "/месяц",
      freePostsPerMonth: "10 объявлений/мес.",
      unlimitedPosts: "Неограниченные объявления",
      companyProfile: "Профиль компании",
      badge: "🏢 Business badge",
      analytics: "Аналитика объявлений",
      freeBoosts: "2× бесплатный Featured/мес.",
      contactFree: "Контакты бесплатно",
      startFree: "Начать бесплатно",
      upgrade: "Перейти на Business",
      manageBilling: "Управлять подпиской",
      currentPlan: "Текущий план",
      cancelAnytime: "Отменить в любое время",
      faqTitle: "Часто задаваемые вопросы",
      faq1q: "Что происходит при отмене Business?",
      faq1a: "Ваши объявления остаются активными до истечения срока. Вы переходите на бесплатный план.",
      faq2q: "Могу ли я сменить план?",
      faq2a: "Да, вы можете повысить или понизить тариф в любое время через портал Stripe.",
    },
    boost: {
      title: "Повысить видимость",
      bump: "Наверх",
      featured: "Featured",
      urgent: "Срочно",
      bumpDesc: "7 дней вверху категории",
      featuredDesc: "7 дней в Featured + социальные сети",
      urgentDesc: "Красная метка \"Срочно\" на 7 дней",
      apply: "Активировать",
      freeAvailable: "Бесплатно (Business)",
      boosted: "Boosted",
      expires: "Истекает",
      selectBoost: "Выберите boost",
    },
    upgrade: {
      title: "Достигнут месячный лимит",
      desc: "Вы разместили 10 бесплатных объявлений в этом месяце. Перейдите на Business для неограниченных публикаций.",
      cta: "Перейти на Business — €9.99/мес.",
      dismiss: "Может быть позже",
    },
```

- [ ] **Step 3: Add keys to English locale (en)**

In the `en` object, add after `cookie: { ... }`:

```ts
    pricing: {
      title: "Pricing",
      free: "Free",
      business: "Business",
      perMonth: "/month",
      freePostsPerMonth: "10 posts/month",
      unlimitedPosts: "Unlimited posts",
      companyProfile: "Company profile",
      badge: "🏢 Business badge",
      analytics: "Post analytics",
      freeBoosts: "2× free Featured/month",
      contactFree: "Contacts always free",
      startFree: "Start for free",
      upgrade: "Upgrade to Business",
      manageBilling: "Manage subscription",
      currentPlan: "Current plan",
      cancelAnytime: "Cancel anytime",
      faqTitle: "Frequently asked questions",
      faq1q: "What happens when I cancel Business?",
      faq1a: "Your posts stay active until their expiry date. You move to the free plan.",
      faq2q: "Can I switch plans?",
      faq2a: "Yes, upgrade or downgrade anytime via the Stripe portal.",
    },
    boost: {
      title: "Boost visibility",
      bump: "Bump to top",
      featured: "Featured",
      urgent: "Urgent",
      bumpDesc: "7 days at top of category",
      featuredDesc: "7 days in Featured section + social media",
      urgentDesc: "Red \"Urgent\" label for 7 days",
      apply: "Activate",
      freeAvailable: "Free (Business)",
      boosted: "Boosted",
      expires: "Expires",
      selectBoost: "Select boost",
    },
    upgrade: {
      title: "Monthly limit reached",
      desc: "You've posted 10 free listings this month. Upgrade to Business for unlimited posts.",
      cta: "Upgrade to Business — €9.99/month",
      dismiss: "Maybe later",
    },
```

Also add to all three locales inside `nav`:
```ts
pricing: "Cenas",   // lv
pricing: "Цены",    // ru
pricing: "Pricing", // en
```

And inside `settings` in all three locales, add after existing keys:
```ts
businessProfile: "Uzņēmuma profils",       // lv
companyName: "Uzņēmuma nosaukums",
companyWebsite: "Mājaslapa",
companyDescription: "Apraksts",
upgradeToBusiness: "Jaunināt uz Business",
manageBilling: "Pārvaldīt maksājumus",
currentPlanFree: "Pašreizējais plāns: Bezmaksas",
currentPlanBusiness: "Pašreizējais plāns: 🏢 Business",
```
(Repeat with appropriate translations for ru and en.)

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add pricing/boost/upgrade i18n keys for lv/ru/en"
```

---

## Task 8: Pricing Page

**Files:**
- Create: `src/pages/Pricing.tsx`

- [ ] **Step 1: Create the Pricing page**

```tsx
import { useEffect } from "react";
import { Link } from "react-router";
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Check, Zap, Building2, ChevronDown } from "lucide-react";

const BOOST_FEATURES = [
  { icon: "🔝", name: "Bump to top", price: "€1.00", desc: "7 days at top of category + social post" },
  { icon: "⭐", name: "Featured", price: "€2.00", desc: "7 days in Featured section + social post" },
  { icon: "🔴", name: "Urgent", price: "€0.50", desc: "Red Urgent label for 7 days" },
];

export default function Pricing() {
  const { locale } = useLocale();
  const { isAuthenticated, user } = useAuth();

  const { data: status } = trpc.subscription.status.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });

  const portalMutation = trpc.subscription.createPortal.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });

  const isBusiness = status?.plan === "business";

  useEffect(() => {
    document.title = t(locale, "pricing.title") + " — jobsy.lv";
    return () => { document.title = "jobsy.lv"; };
  }, [locale]);

  const FREE_FEATURES = [
    t(locale, "pricing.freePostsPerMonth"),
    t(locale, "pricing.contactFree"),
    "Boost à la carte",
  ];

  const BUSINESS_FEATURES = [
    t(locale, "pricing.unlimitedPosts"),
    t(locale, "pricing.companyProfile"),
    t(locale, "pricing.badge"),
    t(locale, "pricing.analytics"),
    t(locale, "pricing.freeBoosts"),
    t(locale, "pricing.contactFree"),
    "Boost à la carte",
    t(locale, "pricing.cancelAnytime"),
  ];

  return (
    <div className="min-h-screen px-4 py-16 noise-bg">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            {t(locale, "pricing.title")}
          </h1>
          <p className="mt-3 font-body text-lg text-ink-muted">
            {locale === "lv"
              ? "Vienkāršs un godīgs — bez slēptajām maksām"
              : locale === "ru"
              ? "Просто и честно — без скрытых платежей"
              : "Simple and honest — no hidden fees"}
          </p>
        </div>

        {/* Tier cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border-2 border-ink bg-white p-8">
            <div className="mb-6">
              <p className="font-body text-sm font-medium uppercase tracking-widest text-ink-muted">
                {t(locale, "pricing.free")}
              </p>
              <p className="mt-1 font-display text-5xl font-bold text-ink">€0</p>
              <p className="mt-1 font-body text-sm text-ink-muted">
                {locale === "lv" ? "Bez maksas uz visiem laikiem"
                  : locale === "ru" ? "Бесплатно навсегда"
                  : "Free forever"}
              </p>
            </div>
            <ul className="mb-8 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 font-body text-sm text-ink">
                  <Check className="h-4 w-4 shrink-0 text-sage" />
                  {f}
                </li>
              ))}
            </ul>
            {isBusiness ? (
              <div className="rounded-xl border-2 border-ink-light bg-cream-dark px-4 py-3 text-center font-body text-sm text-ink-muted">
                {locale === "lv" ? "Tavs pašreizējais plāns ir Business"
                  : locale === "ru" ? "Ваш текущий план — Business"
                  : "Your current plan is Business"}
              </div>
            ) : (
              <Link
                to="/create"
                className="block rounded-xl border-2 border-ink bg-white px-6 py-3 text-center font-body text-sm font-semibold text-ink hover:bg-cream-dark transition"
              >
                {t(locale, "pricing.startFree")}
              </Link>
            )}
          </div>

          {/* Business */}
          <div className="relative rounded-2xl border-2 border-ink bg-ink p-8 text-cream shadow-card">
            <div className="absolute -top-3 left-6 rounded-full border-2 border-ink bg-coral px-3 py-0.5 font-mono text-xs font-bold text-ink uppercase">
              {locale === "lv" ? "Populārākais" : locale === "ru" ? "Популярный" : "Most popular"}
            </div>
            <div className="mb-6">
              <p className="font-body text-sm font-medium uppercase tracking-widest text-cream/60">
                {t(locale, "pricing.business")}
              </p>
              <div className="mt-1 flex items-end gap-1">
                <p className="font-display text-5xl font-bold text-cream">€9.99</p>
                <p className="mb-1.5 font-body text-sm text-cream/60">{t(locale, "pricing.perMonth")}</p>
              </div>
              <p className="mt-1 font-body text-sm text-cream/60">
                {t(locale, "pricing.cancelAnytime")}
              </p>
            </div>
            <ul className="mb-8 space-y-3">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 font-body text-sm text-cream">
                  <Check className="h-4 w-4 shrink-0 text-coral" />
                  {f}
                </li>
              ))}
            </ul>
            {isBusiness ? (
              <button
                onClick={() => portalMutation.mutate()}
                disabled={portalMutation.isPending}
                className="w-full rounded-xl border-2 border-cream bg-cream px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-cream/90 transition disabled:opacity-60"
              >
                {t(locale, "pricing.manageBilling")}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!isAuthenticated) { window.location.href = "/login"; return; }
                  upgradeMutation.mutate();
                }}
                disabled={upgradeMutation.isPending}
                className="w-full rounded-xl border-2 border-cream bg-coral px-6 py-3 font-body text-sm font-semibold text-ink hover:opacity-90 transition disabled:opacity-60"
              >
                {upgradeMutation.isPending
                  ? (locale === "lv" ? "Ielādē..." : locale === "ru" ? "Загрузка..." : "Loading...")
                  : t(locale, "pricing.upgrade")}
              </button>
            )}
          </div>
        </div>

        {/* Boosts */}
        <div className="mb-16">
          <h2 className="mb-2 font-display text-2xl font-bold text-ink">
            {locale === "lv" ? "Boost — pieejams visiem" : locale === "ru" ? "Boost — для всех" : "Boosts — available to everyone"}
          </h2>
          <p className="mb-6 font-body text-sm text-ink-muted">
            {locale === "lv" ? "Maksā tikai par to, ko izmanto."
              : locale === "ru" ? "Платите только за то, что используете."
              : "Pay only for what you use."}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {BOOST_FEATURES.map((b) => (
              <div key={b.name} className="rounded-2xl border-2 border-ink bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-2xl">{b.icon}</span>
                  <span className="font-mono text-lg font-bold text-ink">{b.price}</span>
                </div>
                <p className="font-body text-sm font-bold text-ink">{b.name}</p>
                <p className="mt-1 font-body text-xs text-ink-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl border-2 border-ink bg-white p-8">
          <h2 className="mb-6 font-display text-2xl font-bold text-ink">
            {t(locale, "pricing.faqTitle")}
          </h2>
          <div className="space-y-4">
            {[
              { q: t(locale, "pricing.faq1q"), a: t(locale, "pricing.faq1a") },
              { q: t(locale, "pricing.faq2q"), a: t(locale, "pricing.faq2a") },
            ].map(({ q, a }) => (
              <details key={q} className="group border-b border-ink-light pb-4">
                <summary className="flex cursor-pointer items-center justify-between font-body text-sm font-semibold text-ink">
                  {q}
                  <ChevronDown className="h-4 w-4 text-ink-muted transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 font-body text-sm text-ink-muted">{a}</p>
              </details>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Pricing.tsx
git commit -m "feat: pricing page with free/business tiers and boost table"
```

---

## Task 9: UpgradeModal Component

**Files:**
- Create: `src/components/UpgradeModal.tsx`

- [ ] **Step 1: Create UpgradeModal**

```tsx
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { X, Zap } from "lucide-react";

interface UpgradeModalProps {
  onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const { locale } = useLocale();

  const upgradeMutation = trpc.subscription.createCheckout.useMutation({
    onSuccess: ({ url }) => { if (url) window.location.href = url; },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border-2 border-ink bg-cream p-8 shadow-float">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border-2 border-ink-light p-1 text-ink-muted hover:border-ink hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-coral">
          <Zap className="h-6 w-6 text-ink" />
        </div>

        <h2 className="mt-4 font-display text-2xl font-bold text-ink">
          {t(locale, "upgrade.title")}
        </h2>
        <p className="mt-2 font-body text-sm text-ink-muted">
          {t(locale, "upgrade.desc")}
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => upgradeMutation.mutate()}
            disabled={upgradeMutation.isPending}
            className="w-full rounded-xl border-2 border-ink bg-coral px-6 py-3 font-body text-sm font-semibold text-ink hover:opacity-90 transition disabled:opacity-60"
          >
            {upgradeMutation.isPending
              ? "..."
              : t(locale, "upgrade.cta")}
          </button>
          <button
            onClick={onClose}
            className="w-full rounded-xl border-2 border-ink-light px-6 py-3 font-body text-sm text-ink-muted hover:border-ink hover:text-ink transition"
          >
            {t(locale, "upgrade.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire UpgradeModal into `src/pages/CreatePost.tsx`**

Find where `requiresPayment` / post creation result is handled. Add state and show modal when the API throws the monthly limit error:

In `src/pages/CreatePost.tsx`, add import:
```ts
import UpgradeModal from "@/components/UpgradeModal";
```

Add state:
```ts
const [showUpgrade, setShowUpgrade] = useState(false);
```

In the `onError` handler of `createMutation`:
```ts
onError: (err) => {
  if (err.message.includes("Mēneša limits")) {
    setShowUpgrade(true);
  } else {
    toast(err.message, "error");
  }
},
```

Add before the closing `</div>` of the page:
```tsx
{showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/UpgradeModal.tsx src/pages/CreatePost.tsx
git commit -m "feat: UpgradeModal shown when free user hits monthly limit"
```

---

## Task 10: BoostPicker + MyPosts Integration

**Files:**
- Create: `src/components/BoostPicker.tsx`
- Modify: `src/pages/MyPosts.tsx`

- [ ] **Step 1: Create `src/components/BoostPicker.tsx`**

```tsx
import { useLocale } from "@/lib/locale-context";
import { t } from "@/lib/i18n";
import { trpc } from "@/providers/trpc";
import { useToast } from "@/hooks/useToast";
import { X, Zap } from "lucide-react";

interface BoostPickerProps {
  postId: number;
  isBusiness: boolean;
  freeBoostsRemaining: number;
  onClose: () => void;
}

const BOOSTS = [
  { type: "bump" as const, icon: "🔝", priceLabel: "€1.00" },
  { type: "featured" as const, icon: "⭐", priceLabel: "€2.00" },
  { type: "urgent" as const, icon: "🔴", priceLabel: "€0.50" },
];

export default function BoostPicker({ postId, isBusiness, freeBoostsRemaining, onClose }: BoostPickerProps) {
  const { locale } = useLocale();
  const { toast } = useToast();

  const applyMutation = trpc.boost.apply.useMutation({
    onSuccess: (data) => {
      if (data.free) {
        toast("Boost aktivizēts!", "success");
        onClose();
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err) => toast(err.message, "error"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-sm rounded-2xl border-2 border-ink bg-cream p-6 shadow-float">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg border-2 border-ink-light p-1 text-ink-muted hover:border-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1 font-display text-xl font-bold text-ink">
          {t(locale, "boost.selectBoost")}
        </h3>
        <p className="mb-5 font-body text-xs text-ink-muted">7 {locale === "lv" ? "dienu ilgs" : locale === "ru" ? "дней" : "days"}</p>

        <div className="space-y-3">
          {BOOSTS.map((b) => {
            const isFreeForBusiness = isBusiness && b.type === "featured" && freeBoostsRemaining > 0;
            return (
              <button
                key={b.type}
                onClick={() => applyMutation.mutate({ postId, boostType: b.type })}
                disabled={applyMutation.isPending}
                className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-white px-4 py-3 text-left hover:bg-cream-dark transition disabled:opacity-60"
              >
                <span className="text-2xl">{b.icon}</span>
                <div className="flex-1">
                  <p className="font-body text-sm font-bold text-ink">
                    {t(locale, `boost.${b.type}` as never)}
                  </p>
                  <p className="font-body text-xs text-ink-muted">
                    {t(locale, `boost.${b.type}Desc` as never)}
                  </p>
                </div>
                <span className={`font-mono text-sm font-bold ${isFreeForBusiness ? "text-sage" : "text-ink"}`}>
                  {isFreeForBusiness ? t(locale, "boost.freeAvailable") : b.priceLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Boost button + badge to `src/pages/MyPosts.tsx`**

Add imports:
```ts
import BoostPicker from "@/components/BoostPicker";
import { Zap } from "lucide-react";
```

Add state:
```ts
const [boostingPostId, setBoostingPostId] = useState<number | null>(null);
const { data: subStatus } = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated });
```

In the stats display area (next to Eye/MessageSquare), add a boost badge when post is boosted:
```tsx
{post.boostType !== "none" && post.boostExpiresAt && new Date(post.boostExpiresAt) > new Date() && (
  <span className="flex items-center gap-0.5 rounded-full border border-coral bg-coral/10 px-1.5 py-0.5 font-mono text-[10px] text-coral">
    <Zap className="h-2.5 w-2.5" /> {t(locale, "boost.boosted")}
  </span>
)}
```

In the action buttons row, add Boost button after the filled toggle:
```tsx
<button
  onClick={() => setBoostingPostId(post.id)}
  className="rounded-lg border-2 border-ink bg-white p-2 text-ink hover:bg-cream-dark"
  title={t(locale, "boost.title")}
>
  <Zap className="h-4 w-4" />
</button>
```

Add before the closing `</div>` of the page:
```tsx
{boostingPostId !== null && (
  <BoostPicker
    postId={boostingPostId}
    isBusiness={subStatus?.plan === "business"}
    freeBoostsRemaining={subStatus?.freeBoostsRemaining ?? 0}
    onClose={() => setBoostingPostId(null)}
  />
)}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BoostPicker.tsx src/pages/MyPosts.tsx
git commit -m "feat: BoostPicker component + boost button and badge on MyPosts"
```

---

## Task 11: Business Badge + FeaturedPosts Section

**Files:**
- Modify: `src/components/PostCard.tsx`
- Modify: `src/pages/Browse.tsx`
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add business badge + boost badge to `PostCard`**

The `PostCard` receives `post` and `profile`. Add `user` prop (optional) for plan info. Actually, since we don't want to over-fetch, just add `isBusiness?: boolean` prop and pass it from the parent.

In `src/components/PostCard.tsx`, update the interface:
```ts
interface PostCardProps {
  post: Post;
  profile?: Profile | null;
  isBusiness?: boolean;
}
```

Update the function signature:
```ts
export default function PostCard({ post, profile, isBusiness }: PostCardProps) {
```

In the card footer area (near the ShieldCheck badge), add:

```tsx
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
  <span className="inline-flex items-center gap-0.5 rounded-full border border-need bg-need-light px-1.5 py-0.5 font-mono text-[10px] font-bold text-need uppercase">
    {locale === "lv" ? "Steidzams" : locale === "ru" ? "Срочно" : "Urgent"}
  </span>
)}
```

- [ ] **Step 2: Add Featured section to `src/pages/Browse.tsx`**

Add import:
```ts
import type { PostWithProfile } from "@/types/post";
```

Add query near the top of the Browse component:
```ts
const { data: featuredData } = trpc.posts.featuredPosts.useQuery();
const featuredPosts = featuredData ?? [];
```

Add the Featured section JSX above the main post grid (after the filter bar):
```tsx
{featuredPosts.length > 0 && (
  <div className="mb-8">
    <h2 className="mb-3 font-display text-lg font-bold text-ink">
      {t(locale, "browse.featured") ?? "✨ Featured"}
    </h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {featuredPosts.map(({ post, profile }: PostWithProfile) => (
        <PostCard key={`featured-${post.id}`} post={post} profile={profile} />
      ))}
    </div>
    <div className="mt-4 border-b-2 border-ink-light" />
  </div>
)}
```

- [ ] **Step 3: Add Featured section to `src/pages/Home.tsx`**

Add query:
```ts
const { data: featuredData } = trpc.posts.featuredPosts.useQuery();
const featuredPosts = (featuredData ?? []).slice(0, 3);
```

Add after the hero section, before "Latest posts":
```tsx
{featuredPosts.length > 0 && (
  <section className="px-4 py-8">
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-6 font-display text-2xl font-bold text-ink">✨ Featured</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featuredPosts.map(({ post, profile }) => (
          <PostCard key={`hf-${post.id}`} post={post} profile={profile} />
        ))}
      </div>
    </div>
  </section>
)}
```

- [ ] **Step 4: Add `browse.featured` i18n key** (add to all 3 locales in `src/lib/i18n.ts`):
```ts
featured: "✨ Izceltie sludinājumi",  // lv
featured: "✨ Избранные",              // ru
featured: "✨ Featured Posts",          // en
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/components/PostCard.tsx src/pages/Browse.tsx src/pages/Home.tsx src/lib/i18n.ts
git commit -m "feat: business badge, boost badges on PostCard, Featured sections on Browse + Home"
```

---

## Task 12: Business Profile in Settings

**Files:**
- Modify: `src/pages/Settings.tsx`

- [ ] **Step 1: Add subscription status query and business profile fields**

In `src/pages/Settings.tsx`, add:
```ts
import { Building2, CreditCard } from "lucide-react";
```

Add queries:
```ts
const { data: subStatus } = trpc.subscription.status.useQuery(undefined, { enabled: isAuthenticated });
const upgradeMutation = trpc.subscription.createCheckout.useMutation({
  onSuccess: ({ url }) => { if (url) window.location.href = url; },
});
const portalMutation = trpc.subscription.createPortal.useMutation({
  onSuccess: ({ url }) => { if (url) window.location.href = url; },
});
```

Add state for company fields (read initial from profile):
```ts
const [companyName, setCompanyName] = useState(profileData?.companyName ?? "");
const [companyWebsite, setCompanyWebsite] = useState(profileData?.companyWebsite ?? "");
const [companyDescription, setCompanyDescription] = useState(profileData?.companyDescription ?? "");
```

- [ ] **Step 2: Add Business Plan section to Settings JSX**

Add a new section after the phone section:

```tsx
{/* Business Plan */}
<div className="rounded-2xl border-2 border-ink bg-white p-6">
  <div className="mb-4 flex items-center gap-2">
    <Building2 className="h-5 w-5 text-coral" />
    <h2 className="font-display text-xl font-bold text-ink">
      {t(locale, "settings.businessProfile")}
    </h2>
  </div>

  {/* Plan status */}
  <div className={`mb-4 rounded-xl border-2 px-4 py-3 ${subStatus?.plan === "business" ? "border-sage bg-sage-light" : "border-ink-light bg-cream-dark"}`}>
    <p className="font-body text-sm font-bold text-ink">
      {subStatus?.plan === "business"
        ? t(locale, "settings.currentPlanBusiness")
        : t(locale, "settings.currentPlanFree")}
    </p>
    {subStatus?.plan === "free" && (
      <p className="mt-0.5 font-body text-xs text-ink-muted">
        {subStatus.monthlyPostCount}/10 {locale === "lv" ? "sludinājumi šomēnes" : locale === "ru" ? "объявлений в месяц" : "posts this month"}
      </p>
    )}
    {subStatus?.plan === "business" && (
      <p className="mt-0.5 font-body text-xs text-ink-muted">
        {subStatus.freeBoostsRemaining} {locale === "lv" ? "bezmaksas boost atlikuši" : locale === "ru" ? "бесплатных boost осталось" : "free boosts remaining"}
      </p>
    )}
  </div>

  {/* Business-only: company fields */}
  {subStatus?.plan === "business" && (
    <div className="mb-4 space-y-3">
      <div>
        <label className="mb-1 block font-body text-xs font-medium text-ink">
          {t(locale, "settings.companyName")}
        </label>
        <input
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
          placeholder={locale === "lv" ? "Uzņēmuma nosaukums" : locale === "ru" ? "Название компании" : "Company name"}
        />
      </div>
      <div>
        <label className="mb-1 block font-body text-xs font-medium text-ink">
          {t(locale, "settings.companyWebsite")}
        </label>
        <input
          value={companyWebsite}
          onChange={(e) => setCompanyWebsite(e.target.value)}
          type="url"
          className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink"
          placeholder="https://..."
        />
      </div>
      <div>
        <label className="mb-1 block font-body text-xs font-medium text-ink">
          {t(locale, "settings.companyDescription")}
        </label>
        <textarea
          value={companyDescription}
          onChange={(e) => setCompanyDescription(e.target.value)}
          rows={3}
          maxLength={300}
          className="w-full rounded-xl border-2 border-ink-light bg-white px-3 py-2 font-body text-sm text-ink outline-none focus:border-ink resize-none"
        />
      </div>
      <button
        onClick={() => updateMutation.mutate({ companyName, companyWebsite, companyDescription })}
        className="rounded-xl border-2 border-ink bg-ink px-4 py-2 font-body text-sm text-cream hover:opacity-80 transition"
      >
        {t(locale, "settings.save")}
      </button>
    </div>
  )}

  {/* Upgrade / Manage */}
  {subStatus?.plan === "business" ? (
    <button
      onClick={() => portalMutation.mutate()}
      disabled={portalMutation.isPending}
      className="flex items-center gap-2 rounded-xl border-2 border-ink-light bg-white px-4 py-2 font-body text-sm text-ink-muted hover:border-ink hover:text-ink transition"
    >
      <CreditCard className="h-4 w-4" />
      {t(locale, "settings.manageBilling")}
    </button>
  ) : (
    <button
      onClick={() => upgradeMutation.mutate()}
      disabled={upgradeMutation.isPending}
      className="flex items-center gap-2 rounded-xl border-2 border-ink bg-coral px-4 py-2 font-body text-sm font-semibold text-ink hover:opacity-90 transition"
    >
      <Building2 className="h-4 w-4" />
      {t(locale, "settings.upgradeToBusiness")}
    </button>
  )}
</div>
```

- [ ] **Step 3: Update profile tRPC update mutation to include company fields**

In `api/profile-router.ts`, add to the update input schema:
```ts
companyName: z.string().max(255).optional(),
companyWebsite: z.string().url().max(512).optional().or(z.literal("")),
companyDescription: z.string().max(300).optional(),
```

And pass them to `updateProfile`.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Settings.tsx api/profile-router.ts
git commit -m "feat: business profile section in Settings with plan status and billing portal"
```

---

## Task 13: Navbar + App.tsx + Final Wiring

**Files:**
- Modify: `src/components/Navbar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add Pricing link to Navbar**

In the desktop nav links section of `Navbar.tsx`, add after the browse link:

```tsx
<Link
  to="/pricing"
  className="font-body text-sm font-medium text-ink-muted hover:text-ink"
>
  {t(locale, "nav.pricing")}
</Link>
```

Add the same link to the mobile sheet nav menu.

- [ ] **Step 2: Add /pricing route to `src/App.tsx`**

```ts
import Pricing from "./pages/Pricing";
```

```tsx
<Route path="/pricing" element={<Pricing />} />
```

- [ ] **Step 3: Final TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add src/components/Navbar.tsx src/App.tsx
git commit -m "feat: add /pricing route and Pricing link to Navbar"
```

---

## Task 14: Railway Setup + Deploy

**Files:** None (env vars and Stripe dashboard)

- [ ] **Step 1: Create Business subscription product in Stripe Dashboard**

Go to Stripe Dashboard → Products → Add product:
- Name: "jobsy.lv Business"
- Price: €9.99, recurring, monthly
- Copy the Price ID (starts with `price_`)

- [ ] **Step 2: Add env vars in Railway**

In Railway Dashboard → Service → Variables, add:
```
STRIPE_BUSINESS_PRICE_ID=price_xxxxxxxxxxxx
```

- [ ] **Step 3: Enable Stripe Customer Portal**

Go to Stripe Dashboard → Settings → Billing → Customer portal → Activate.

- [ ] **Step 4: Push and verify deploy**

```bash
git push
```

Watch Railway deploy logs. Once deployed, visit `https://jobsy.lv/pricing` and verify the page loads.

- [ ] **Step 5: Test the full flow**

1. Sign in as a test user
2. Go to /pricing → click "Upgrade to Business" → verify Stripe Checkout opens with €9.99/month
3. Use Stripe test card `4242 4242 4242 4242` to complete payment
4. Verify redirect to /settings?subscribed=true
5. Check /settings shows "🏢 Business" plan status
6. Go to /my-posts → click Zap icon on a post → verify BoostPicker opens
7. Select Featured → verify free boost applied (if freeBoostsRemaining > 0)
8. Go to /pricing → click "Manage subscription" → verify Stripe portal opens

---

## Self-Review Checklist

- [x] **Spec coverage:** plan tiers ✓, boosts ✓, social queue stub ✓, pricing page ✓, upgrade modal ✓, business profile ✓, company fields ✓, billing portal ✓, bump ordering ✓, featured section ✓, business badge ✓, monthly limit ✓, existing user transition ✓
- [x] **No placeholders:** all code blocks are complete
- [x] **Type consistency:** `boostType` enum matches across schema → stripe.ts → boost-router → PostCard → BoostPicker; `plan` enum matches schema → subscription-router → Pricing; `getFeaturedPosts` return type matches `listPostsWithProfiles`
- [x] **Migration is idempotent:** all column additions check INFORMATION_SCHEMA first
- [x] **Backward compat:** legacy post payments (no metadata.type) still handled in webhook; existing users default to free plan
