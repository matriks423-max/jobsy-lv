import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import {
  createPost,
  getPostWithProfile,
  listPostsWithProfiles,
  updatePost,
  incrementViewCount,
  incrementContactCount,
  expireOldPosts,
  deletePost,
  countUserPostsToday,
} from "./queries/posts";
import {
  getProfileByUserId,
  useFreePost,
  useFreePostCredit,
} from "./queries/profiles";
import { createContact, hasContacted, createReport } from "./queries/reports";
import {
  getReferralByReferredId,
  markReferralPostMade,
  markReferralRewarded,
} from "./queries/referrals";
import { addFreePostCredit } from "./queries/profiles";
import { createCheckoutSession } from "./stripe";
import { moderateContent, softFlagCheck } from "./lib/moderation";

const FREE_FIRST_POST = true;
const MAX_POSTS_PER_DAY = 5;

const postTypeEnum = z.enum(["need", "offer"]);
const languageEnum = z.enum(["lv", "ru", "en"]);

export const postsRouter = createRouter({
  list: publicQuery
    .input(
      z
        .object({
          type: postTypeEnum.optional(),
          category: z.string().optional(),
          city: z.string().optional(),
          status: z.string().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(50).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      await expireOldPosts();
      const filters = {
        ...input,
        status: input?.status ?? "active",
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      };
      return listPostsWithProfiles(filters);
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      await expireOldPosts();
      const result = await getPostWithProfile(input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Post not found",
        });
      }
      await incrementViewCount(input.id);
      return result;
    }),

  create: authedQuery
    .input(
      z.object({
        type: postTypeEnum,
        title: z.string().min(5).max(80),
        description: z.string().max(500).optional(),
        category: z.string(),
        city: z.string().optional(),
        region: z.string().optional(),
        budgetText: z.string().max(100).optional(),
        whenText: z.string().max(100).optional(),
        language: languageEnum.default("lv"),
        images: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // === CONTENT MODERATION ===
      const modResult = moderateContent(input.title, input.description ?? "");
      if (!modResult.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: modResult.reason!,
        });
      }

      const softFlags = softFlagCheck(input.title, input.description ?? "");
      const needsReview = softFlags.length > 0;

      // Rate limit: max 5 posts per day
      const postsToday = await countUserPostsToday(ctx.user.id);
      if (postsToday >= MAX_POSTS_PER_DAY) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Max ${MAX_POSTS_PER_DAY} posts per day reached`,
        });
      }

      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found",
        });
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Priority: free post credits > first free post > paid
      const hasFreeCredits = profile.freePostCredits > 0;
      const canUseFreePost = FREE_FIRST_POST && !profile.freePostUsed;

      if (hasFreeCredits) {
        await useFreePostCredit(ctx.user.id);
        const post = await createPost({
          ...input,
          userId: ctx.user.id,
          status: needsReview ? "pending_review" : "active",
          wasFree: true,
          expiresAt,
        });
        const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

        // Save images
        if (input.images && input.images.length > 0) {
          for (const url of input.images) {
            await getDb().insert(schema.postImages).values({ postId: insertId, url });
          }
        }

        await checkAndRewardReferralOnPost(ctx.user.id);
        return { postId: insertId, requiresPayment: false, needsReview };
      }

      if (canUseFreePost) {
        const post = await createPost({
          ...input,
          userId: ctx.user.id,
          status: needsReview ? "pending_review" : "active",
          wasFree: true,
          expiresAt,
        });
        await useFreePost(ctx.user.id);
        const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

        // Save images
        if (input.images && input.images.length > 0) {
          for (const url of input.images) {
            await getDb().insert(schema.postImages).values({ postId: insertId, url });
          }
        }

        await checkAndRewardReferralOnPost(ctx.user.id);
        return { postId: insertId, requiresPayment: false, needsReview };
      }

      // Paid post
      const post = await createPost({
        ...input,
        userId: ctx.user.id,
        status: "pending_payment",
        wasFree: false,
        expiresAt,
      });

      const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

      try {
        const checkout = await createCheckoutSession(insertId, ctx.user.id);
        return { postId: insertId, requiresPayment: true, checkoutUrl: checkout.url };
      } catch {
        return { postId: insertId, requiresPayment: true, checkoutUrl: `/payment?postId=${insertId}` };
      }
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(5).max(80).optional(),
        description: z.string().max(500).optional(),
        category: z.string().optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        budgetText: z.string().max(100).optional(),
        whenText: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.id);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your post" });
      }

      // Moderate updated content
      if (input.title || input.description) {
        const modResult = moderateContent(
          input.title ?? postResult.post.title,
          input.description ?? (postResult.post.description ?? "")
        );
        if (!modResult.allowed) {
          throw new TRPCError({ code: "FORBIDDEN", message: modResult.reason! });
        }
      }

      const { id, ...data } = input;
      await updatePost(id, data as any);
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.id);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not your post" });
      }

      await deletePost(input.id);
      return { success: true };
    }),

  myPosts: authedQuery.query(async ({ ctx }) => {
    await expireOldPosts();
    return listPostsWithProfiles({
      userId: ctx.user.id,
      limit: 50,
    });
  }),

  contact: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.postId);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }

      const alreadyContacted = await hasContacted(input.postId, ctx.user.id);
      if (!alreadyContacted) {
        await createContact({
          postId: input.postId,
          fromUserId: ctx.user.id,
        });
        await incrementContactCount(input.postId);
      }

      return {
        email: postResult.profile?.email ?? null,
        phone: postResult.profile?.phone ?? null,
        name: postResult.profile?.name ?? null,
      };
    }),

  getImages: publicQuery
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      const { getImagesByPostId } = await import("./queries/images");
      return getImagesByPostId(input.postId);
    }),

  report: authedQuery
    .input(
      z.object({
        postId: z.number(),
        reason: z.string(),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createReport({
        postId: input.postId,
        reporterId: ctx.user.id,
        reason: input.reason,
        details: input.details ?? null,
      });
      return { success: true };
    }),

  completePayment: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.postId);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not your post",
        });
      }

      await updatePost(input.postId, {
        status: "active",
        paidAt: new Date(),
        wasFree: false,
      });

      await checkAndRewardReferralOnPost(ctx.user.id);

      return { success: true };
    }),

  // === ADMIN ONLY ===
  listReports: adminQuery.query(async () => {
    const reports = await getDb()
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.resolved, false))
      .orderBy(desc(schema.reports.createdAt));
    return reports;
  }),

  resolveReport: adminQuery
    .input(z.object({ reportId: z.number(), action: z.enum(["delete", "dismiss", "ban"]) }))
    .mutation(async ({ input }) => {
      const report = await getDb()
        .select()
        .from(schema.reports)
        .where(eq(schema.reports.id, input.reportId))
        .limit(1);
      
      if (!report.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
      }

      if (input.action === "delete") {
        await deletePost(report[0].postId);
      } else if (input.action === "ban") {
        // Ban the post owner
        const post = await getDb()
          .select()
          .from(schema.posts)
          .where(eq(schema.posts.id, report[0].postId))
          .limit(1);
        if (post.length) {
          await getDb()
            .update(schema.users)
            .set({ role: "banned" })
            .where(eq(schema.users.id, post[0].userId));
        }
      }

      await getDb()
        .update(schema.reports)
        .set({ resolved: true })
        .where(eq(schema.reports.id, input.reportId));

      return { success: true };
    }),

  // For admin: list posts pending review
  pendingReview: adminQuery.query(async () => {
    const posts = await getDb()
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.status, "pending_review"))
      .orderBy(desc(schema.posts.createdAt));
    return posts;
  }),

  approvePost: adminQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      await updatePost(input.postId, { status: "active" });
      return { success: true };
    }),

  rejectPost: adminQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      await updatePost(input.postId, { status: "rejected" });
      return { success: true };
    }),
});

import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, desc } from "drizzle-orm";

async function checkAndRewardReferralOnPost(userId: number) {
  const referral = await getReferralByReferredId(userId);
  if (!referral || referral.postMade || referral.rewarded) return;

  await markReferralPostMade(userId);
  await addFreePostCredit(referral.referrerId);
  await markReferralRewarded(userId);
}