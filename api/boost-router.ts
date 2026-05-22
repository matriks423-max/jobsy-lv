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
