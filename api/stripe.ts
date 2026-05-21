import Stripe from "stripe";
import { env } from "./lib/env";
import { getPostById, updatePost } from "./queries/posts";
import { getProfileByUserId } from "./queries/profiles";
import { getReferralByReferredId, markReferralPostMade, markReferralRewarded } from "./queries/referrals";
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
    // Update profile with stripe customer id would need a new query - skipping for now
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

export async function handleStripeWebhook(body: string, signature: string) {
  if (!stripe || !env.stripeWebhookSecret) {
    throw new Error("Stripe webhook not configured");
  }

  const event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
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

        // Send post published email
        const profile = await getProfileByUserId(Number(userId));
        if (profile?.email) {
          void sendPostPublished(profile.email, post.title, post.id);
        }

        // Check referral reward
        await checkAndRewardReferral(Number(userId));
      }
    }
  }

  return { received: true };
}

export async function checkAndRewardReferral(userId: number) {
  const referral = await getReferralByReferredId(userId);
  if (!referral || referral.postMade || referral.rewarded) return;

  // Mark that the referred user made a post
  await markReferralPostMade(userId);

  // Give referrer a free post credit
  await addFreePostCredit(referral.referrerId);
  await markReferralRewarded(userId);
}

export { stripe };
