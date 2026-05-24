import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getProfileByUserId, getProfileByReferralCode } from "./queries/profiles";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";

export const referralRouter = createRouter({
  me: authedQuery.query(async ({ ctx }: { ctx: { user: { id: number } } }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    }
    return {
      referralCode: profile.referralCode,
      freePostCredits: profile.freePostCredits,
      freePostsUsed: profile.freePostsUsed,
      referredBy: profile.referredBy,
    };
  }),

  claim: authedQuery
    .input(z.object({ code: z.string().min(4).max(20) }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { code: string } }) => {
      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
      }

      // Can't refer yourself
      if (profile.referralCode?.toUpperCase() === input.code.toUpperCase()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot use your own referral code" });
      }

      // Already referred
      if (profile.referredBy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Referral code already used" });
      }

      const referrer = await getProfileByReferralCode(input.code.toUpperCase());
      if (!referrer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Referral code not found" });
      }

      // Atomic: both writes succeed together or neither does
      await getDb().transaction(async (tx) => {
        await tx
          .update(schema.profiles)
          .set({ referredBy: referrer.userId, updatedAt: new Date() })
          .where(eq(schema.profiles.userId, ctx.user.id));
        await tx.insert(schema.referrals).values({
          referrerId: referrer.userId,
          referredId: ctx.user.id,
        });
      });

      return { success: true, referrerName: referrer.name };
    }),
});
