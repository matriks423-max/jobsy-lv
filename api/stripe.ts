import Stripe from "stripe";
import { env } from "./lib/env";
import { getPostById, updatePost } from "./queries/posts";
import { getProfileByUserId, updateProfile } from "./queries/profiles";
import { atomicRewardReferral } from "./queries/referrals";
import { addFreePostCredit } from "./queries/profiles";
import { sendPostPublished } from "./lib/email";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey, { apiVersion: "2026-04-22.dahlia" }) : null;

export async function createCheckoutSession(postId: number, userId: number) {
  if (!stripe) {
    throw new Error("Stripe not configured");
  }

  const post = await getPostById(postId);
  if (!post || post.userId !== userId) {
    throw new Error("Invalid post");
  }

  const profile = await getProfileByUserId(userId);
  let customerId = profile?.stripeCustomerId ?? undefined;

  if (!customerId && profile?.email) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.name ?? undefined,
      metadata: { userId: String(userId) },
    });
    customerId = customer.id;
    // Persist customer ID so future checkouts reuse the same Stripe customer
    await updateProfile(userId, { stripeCustomerId: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "eur",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: "jobsy.lv — sludinājuma publikācija (30 dienas)",
          },
          unit_amount: env.postingFeeCents,
        },
        quantity: 1,
      },
    ],
    metadata: { postId: String(postId), userId: String(userId) },
    success_url: `${env.siteUrl}/success?post=${postId}`,
    cancel_url: `${env.siteUrl}/create?canceled=true&post=${postId}`,
    customer: customerId,
  });

  await updatePost(postId, { stripeSessionId: session.id });

  return { url: session.url, sessionId: session.id };
}

const BOOST_PRICES_CENTS: Record<number, number> = { 7: 99, 14: 199, 30: 299 };

export async function createBoostCheckoutSession(postId: number, userId: number, boostDays: number) {
  if (!stripe) throw new Error("Stripe not configured");
  if (!BOOST_PRICES_CENTS[boostDays]) throw new Error("Invalid boost duration");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "eur",
        product_data: { name: `jobsy.lv — izcelšana (${boostDays} dienas)` },
        unit_amount: BOOST_PRICES_CENTS[boostDays],
      },
      quantity: 1,
    }],
    metadata: { type: "boost", postId: String(postId), userId: String(userId), boostDays: String(boostDays) },
    success_url: `${env.siteUrl}/my-posts?boosted=1`,
    cancel_url: `${env.siteUrl}/my-posts`,
  });

  return { url: session.url };
}

export async function handleStripeWebhook(body: string, signature: string) {
  if (!stripe || !env.stripeWebhookSecret) {
    throw new Error("Stripe webhook not configured");
  }

  const event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const postId = session.metadata?.postId;
    const userId = session.metadata?.userId;

    if (session.metadata?.type === "boost" && postId) {
      const boostDays = Number(session.metadata.boostDays);
      const boostedUntil = new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000);
      await updatePost(Number(postId), { boostedUntil });
      return { received: true };
    }

    if (postId && userId) {
      const post = await getPostById(Number(postId));
      if (post && post.stripeSessionId === session.id && post.status !== "active") {
        await updatePost(post.id, {
          status: "active",
          paidAt: new Date(),
          stripePaymentId: session.payment_intent as string,
        });

        const profile = await getProfileByUserId(Number(userId));
        if (profile?.email) {
          void sendPostPublished(profile.email, post.title, post.id);
        }

        const referrerId = await atomicRewardReferral(Number(userId));
        if (referrerId) await addFreePostCredit(referrerId);
      }
    }
  }

  return { received: true };
}


export { stripe };
