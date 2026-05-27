import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { createSubscriptionCheckout, createBillingPortal } from "./stripe";
import { getProfileByUserId, grantCredits, getCreditTransactions } from "./queries/profiles";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq } from "drizzle-orm";

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
      creditBalance: profile?.creditBalance ?? 0,
    };
  }),

  /** User: my credit transaction history */
  creditHistory: authedQuery.query(async ({ ctx }) => {
    return getCreditTransactions(ctx.user.id, 30);
  }),

  /** Admin: grant credits to a user by email */
  adminGrantCredits: adminQuery
    .input(z.object({
      email: z.string().email(),
      // Amount in euros (e.g. 5.00 = €5.00 = 500 cents)
      euros: z.number().positive().max(500),
      note: z.string().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const userRows = await getDb()
        .select({ id: schema.users.id, email: schema.users.email })
        .from(schema.users)
        .where(eq(schema.users.email, input.email))
        .limit(1);

      if (!userRows.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const userId = userRows[0].id;
      const cents = Math.round(input.euros * 100);
      const description = input.note ?? `Admin grant — €${input.euros.toFixed(2)}`;

      await grantCredits(userId, cents, description);
      return { ok: true, userId, cents };
    }),
});
