import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getProfileByUserId, getProfileByReferralCode, setReferredBy } from "./queries/profiles";
import { createReferral } from "./queries/referrals";

export const referralRouter = createRouter({
  me: authedQuery.query(async ({ ctx }: { ctx: { user: { id: number } } }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    }
    return {
      referralCode: profile.referralCode,
      freePostCredits: profile.freePostCredits,
      freePostUsed: profile.freePostUsed,
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
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nevar izmantot savu kodu" });
      }

      // Already referred
      if (profile.referredBy) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ieteikuma kods jau izmantots" });
      }

      const referrer = await getProfileByReferralCode(input.code.toUpperCase());
      if (!referrer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kods nav atrasts" });
      }

      await setReferredBy(ctx.user.id, referrer.userId);
      await createReferral({
        referrerId: referrer.userId,
        referredId: ctx.user.id,
      });

      return { success: true, referrerName: referrer.name };
    }),
});
