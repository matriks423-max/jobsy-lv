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
          // Use a transaction to prevent race conditions
          await getDb().transaction(async (tx) => {
            // Re-read inside transaction to get current value
            const [freshProfile] = await tx
              .select({ freeBoostsRemaining: schema.profiles.freeBoostsRemaining })
              .from(schema.profiles)
              .where(eq(schema.profiles.userId, ctx.user.id))
              .limit(1);

            if (!freshProfile || freshProfile.freeBoostsRemaining <= 0) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "No free boosts remaining" });
            }

            const boostExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await tx
              .update(schema.posts)
              .set({ boostType: "featured", boostExpiresAt, boostStripeSessionId: "free-boost" })
              .where(eq(schema.posts.id, input.postId));

            await tx.insert(schema.socialQueue).values({ postId: input.postId, boostType: "featured" });

            await tx
              .update(schema.profiles)
              .set({ freeBoostsRemaining: freshProfile.freeBoostsRemaining - 1 })
              .where(eq(schema.profiles.userId, ctx.user.id));
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
