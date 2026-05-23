import Stripe from "stripe";
import { env } from "./lib/env";
import { getPostById, updatePost } from "./queries/posts";
import { getProfileByUserId, updateProfile } from "./queries/profiles";
import { getReferralByReferredId, markReferralPostMade, markReferralRewarded } from "./queries/referrals";
import { addFreePostCredit } from "./queries/profiles";
import { sendPostPublished, sendPaymentFailed, sendBusinessWelcome } from "./lib/email";
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
  await getDb().transaction(async (tx) => {
    await tx
      .update(schema.posts)
      .set({ boostType, boostExpiresAt, boostStripeSessionId: sessionId })
      .where(eq(schema.posts.id, postId));
    if (boostType === "bump" || boostType === "featured") {
      await tx.insert(schema.socialQueue).values({ postId, boostType });
    }
  });
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
  if (!customerId) throw new Error("Could not resolve Stripe customer");
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
  if (!customerId) throw new Error("Could not resolve Stripe customer");
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
      const rawBoostType = session.metadata?.boostType;
      if (!postId || !["bump", "featured", "urgent"].includes(rawBoostType ?? "")) return;
      const boostType = rawBoostType as "bump" | "featured" | "urgent";
      await applyBoostToPost(postId, boostType, session.id);
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
            stripePaymentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
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
      // Send welcome email only on first activation
      if (event.type === "customer.subscription.created") {
        try {
          const customer = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
          if (customer.email) void sendBusinessWelcome(customer.email);
        } catch (err) {
          console.error("[stripe] welcome email customer lookup failed:", err);
        }
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.userId;
    if (userId) await deactivateBusinessPlan(Number(userId));
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const sub = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
    if (sub && typeof sub === "string") {
      // Renewal: reset free boosts for this subscriber
      const subObj = await stripe.subscriptions.retrieve(sub);
      const userId = subObj.metadata?.userId;
      if (userId) await updateProfile(Number(userId), { freeBoostsRemaining: 2 });
    }
  }

  if (event.type === "invoice.payment_failed") {
    // Do NOT downgrade — Stripe will retry. Just notify the user.
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string" ? invoice.customer : null;
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        if (customer.email) {
          void sendPaymentFailed(customer.email);
        }
      } catch (err) {
        console.error("[stripe] invoice.payment_failed customer lookup failed:", err);
      }
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
