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
