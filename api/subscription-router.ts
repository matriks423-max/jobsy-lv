import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { createSubscriptionCheckout, createProCheckout, createBillingPortal } from "./stripe";
import { getProfileByUserId, grantCredits, getCreditTransactions } from "./queries/profiles";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

export const subscriptionRouter = createRouter({
  createProCheckout: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.plan === "pro" || ctx.user.plan === "business") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Already on a paid plan" });
    }
    const { url } = await createProCheckout(ctx.user.id);
    return { url };
  }),

  createCheckout: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.plan === "business") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Already on Business plan" });
    }
    const { url } = await createSubscriptionCheckout(ctx.user.id);
    return { url };
  }),

  createPortal: authedQuery.mutation(async ({ ctx }) => {
    if (ctx.user.plan === "free") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Paid plan required" });
    }
    const { url } = await createBillingPortal(ctx.user.id);
    return { url };
  }),

  status: authedQuery.query(async ({ ctx }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    const [{ cnt: activePostCount }] = await getDb()
      .select({ cnt: count() })
      .from(schema.posts)
      .where(and(
        eq(schema.posts.userId, ctx.user.id),
        inArray(schema.posts.status, ["active", "pending_review"]),
      ));
    const plan = ctx.user.plan as "free" | "pro" | "business";
    const CONTACT_LIMITS: Record<"free" | "pro" | "business", number | null> = {
      free: 3,
      pro: 30,
      business: null,
    };
    return {
      plan,
      planExpiresAt: ctx.user.planExpiresAt ?? null,
      freeBoostsRemaining: profile?.freeBoostsRemaining ?? 0,
      activePostCount,
      creditBalance: profile?.creditBalance ?? 0,
      contactViewsThisMonth: profile?.contactViewsThisMonth ?? 0,
      contactViewLimit: CONTACT_LIMITS[plan],
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
