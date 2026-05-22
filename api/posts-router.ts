import { z } from "zod";
import { eq, desc, sql, gte, count, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
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
  setPostFilled,
  countPosts,
} from "./queries/posts";
import { getProfileByUserId } from "./queries/profiles";
import { createContact, hasContacted, createReport } from "./queries/reports";
import { hasInterested, createInterest } from "./queries/interests";
import { sendInterestNotification } from "./lib/email";
import { atomicRewardReferral } from "./queries/referrals";
import { addFreePostCredit } from "./queries/profiles";
import { createBoostCheckoutSession } from "./stripe";
import { moderateContent, softFlagCheck } from "./lib/moderation";
import { sendPostPublished } from "./lib/email";

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
          sort: z.enum(["newest", "oldest", "budget_asc", "budget_desc"]).optional(),
          limit: z.number().min(1).max(50).optional(),
          offset: z.number().min(0).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      // Run expiry in background — failure must not block the list query
      expireOldPosts().catch((err) =>
        console.error("[expireOldPosts] failed:", err?.message ?? err)
      );
      const filters = {
        ...input,
        status: input?.status ?? "active",
        limit: input?.limit ?? 20,
        offset: input?.offset ?? 0,
      };
      return listPostsWithProfiles(filters);
    }),

  count: publicQuery
    .input(
      z.object({
        type: postTypeEnum.optional(),
        category: z.string().optional(),
        city: z.string().optional(),
        status: z.string().optional(),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return countPosts({
        ...input,
        status: input?.status ?? "active",
      });
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      expireOldPosts().catch((err) =>
        console.error("[expireOldPosts] failed:", err?.message ?? err)
      );
      const result = await getPostWithProfile(input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sludinājums nav atrasts",
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
        category: z.enum(["household","moving","repairs","garden","auto","childcare","pets","it","tutoring","other"]),
        city: z.string().optional(),
        region: z.string().max(100).optional(),
        budgetText: z.string().max(100).optional(),
        whenText: z.string().max(100).optional(),
        language: languageEnum.default("lv"),
        images: z.array(z.string().regex(/^\/uploads\/[\w.-]+$/, "Invalid image path")).max(5).optional(),
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
          message: `Dienā atļauts publicēt max ${MAX_POSTS_PER_DAY} sludinājumus`,
        });
      }

      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profils nav atrasts",
        });
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const post = await createPost({
        ...input,
        userId: ctx.user.id,
        status: needsReview ? "pending_review" : "active",
        wasFree: true,
        expiresAt,
      });
      const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

      if (input.images && input.images.length > 0) {
        for (const url of input.images) {
          await getDb().insert(schema.postImages).values({ postId: insertId, url });
        }
      }

      await checkAndRewardReferralOnPost(ctx.user.id);
      if (!needsReview && profile.email) {
        void sendPostPublished(profile.email, input.title, insertId);
      }
      return { postId: insertId, requiresPayment: false, needsReview };
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Šis sludinājums nepieder tev" });
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Šis sludinājums nepieder tev" });
      }

      await deletePost(input.id);
      return { success: true };
    }),

  setFilled: authedQuery
    .input(z.object({ postId: z.number(), filled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await getPostWithProfile(input.postId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      if (result.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Šis sludinājums nepieder tev" });
      }
      await setPostFilled(input.postId, input.filled);
      return { success: true };
    }),

  boost: authedQuery
    .input(z.object({ postId: z.number(), boostDays: z.union([z.literal(7), z.literal(14), z.literal(30)]) }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.postId);
      if (!postResult) throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      if (postResult.post.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Šis sludinājums nepieder tev" });
      if (postResult.post.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Sludinājums nav aktīvs" });
      const checkout = await createBoostCheckoutSession(input.postId, ctx.user.id, input.boostDays);
      return { checkoutUrl: checkout.url };
    }),

  myPosts: authedQuery.query(async ({ ctx }) => {
    expireOldPosts().catch((err) =>
      console.error("[expireOldPosts] failed:", err?.message ?? err)
    );
    const posts = await listPostsWithProfiles({
      userId: ctx.user.id,
      limit: 50,
    });
    if (posts.length === 0) return [];

    // Fetch interest counts for all user's posts in one query
    const postIds = posts.map((p) => p.post.id);
    const interestRows = await getDb()
      .select({ postId: schema.interests.postId, cnt: count() })
      .from(schema.interests)
      .where(inArray(schema.interests.postId, postIds))
      .groupBy(schema.interests.postId);
    const interestMap = new Map(interestRows.map((r) => [r.postId, r.cnt]));

    return posts.map((p) => ({
      ...p,
      interestCount: interestMap.get(p.post.id) ?? 0,
    }));
  }),

  contact: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.postId);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
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

  expressInterest: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.postId);
      if (!postResult) throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      if (postResult.post.userId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Nevar izteikt interesi par savu sludinājumu" });

      const already = await hasInterested(input.postId, ctx.user.id);
      if (!already) {
        await createInterest(input.postId, ctx.user.id);
        const helperProfile = await getProfileByUserId(ctx.user.id);
        const helperName = helperProfile?.name ?? "Kāds";
        if (postResult.profile?.email) {
          void sendInterestNotification(postResult.profile.email, helperName, postResult.post.title, input.postId);
        }
      }
      return { success: true, already };
    }),

  hasInterested: authedQuery
    .input(z.object({ postId: z.number() }))
    .query(async ({ ctx, input }) => {
      return { interested: await hasInterested(input.postId, ctx.user.id) };
    }),

  report: authedQuery
    .input(
      z.object({
        postId: z.number(),
        reason: z.enum(["misleading","offensive","fraud","spam","other"]),
        details: z.string().max(500).optional(),
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Sludinājums nav atrasts" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Šis sludinājums nepieder tev",
        });
      }

      // Idempotent: if already active (webhook already fired), skip to avoid duplicate email
      if (postResult.post.status === "active") {
        return { success: true, alreadyActive: true };
      }

      await updatePost(input.postId, {
        status: "active",
        paidAt: new Date(),
        wasFree: false,
      });

      await checkAndRewardReferralOnPost(ctx.user.id);

      // Send post published email (fallback path when Stripe redirects back without webhook)
      const profile = await getProfileByUserId(ctx.user.id);
      if (profile?.email) {
        void sendPostPublished(profile.email, postResult.post.title, input.postId);
      }

      return { success: true, alreadyActive: false };
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Ziņojums nav atrasts" });
      }

      if (input.action === "delete") {
        await deletePost(report[0].postId);
      } else if (input.action === "ban") {
        const post = await getDb()
          .select()
          .from(schema.posts)
          .where(eq(schema.posts.id, report[0].postId))
          .limit(1);
        if (post.length) {
          const userId = post[0].userId;
          await getDb()
            .update(schema.users)
            .set({ role: "banned" })
            .where(eq(schema.users.id, userId));
          // Delete all posts by banned user
          const userPosts = await getDb()
            .select({ id: schema.posts.id })
            .from(schema.posts)
            .where(eq(schema.posts.userId, userId));
          for (const p of userPosts) {
            await deletePost(p.id);
          }
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
      const postResult = await getPostWithProfile(input.postId);
      await updatePost(input.postId, { status: "active" });
      // Notify the post author that their post passed review
      if (postResult?.profile?.email) {
        void sendPostPublished(postResult.profile.email, postResult.post.title, input.postId);
      }
      return { success: true };
    }),

  rejectPost: adminQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      await updatePost(input.postId, { status: "rejected" });
      return { success: true };
    }),

  adminStats: adminQuery.query(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers, totalPosts, activePosts, postsToday, usersToday,
      paidPosts, pendingCount, reportsCount, totalInterests, totalReviews, verifiedPhones,
    ] = await Promise.all([
      getDb().select({ c: count() }).from(schema.users).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "active")).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(gte(schema.posts.createdAt, today)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, today)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.wasFree, false)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "pending_review")).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.reports).where(eq(schema.reports.resolved, false)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.interests).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.reviews).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.profiles).where(eq(schema.profiles.phoneVerified, true)).then((r) => r[0]?.c ?? 0),
    ]);

    return { totalUsers, totalPosts, activePosts, postsToday, usersToday, paidPosts, pendingCount, reportsCount, totalInterests, totalReviews, verifiedPhones };
  }),

  listUsers: adminQuery
    .input(z.object({ search: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({
          id: schema.users.id,
          email: schema.users.email,
          name: schema.users.name,
          role: schema.users.role,
          authMethod: schema.users.authMethod,
          createdAt: schema.users.createdAt,
          lastSignInAt: schema.users.lastSignInAt,
          phoneVerified: schema.profiles.phoneVerified,
          postCount: sql<number>`(SELECT COUNT(*) FROM ${schema.posts} WHERE ${schema.posts.userId} = ${schema.users.id})`,
        })
        .from(schema.users)
        .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
        .where(input.search ? sql`${schema.users.email} LIKE ${"%" + input.search + "%"} OR ${schema.users.name} LIKE ${"%" + input.search + "%"}` : undefined)
        .orderBy(desc(schema.users.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  setUserRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["user", "banned", "admin"]) }))
    .mutation(async ({ input }) => {
      await getDb().update(schema.users).set({ role: input.role }).where(eq(schema.users.id, input.userId));
      if (input.role === "banned") {
        const userPosts = await getDb().select({ id: schema.posts.id }).from(schema.posts).where(eq(schema.posts.userId, input.userId));
        for (const p of userPosts) await deletePost(p.id);
      }
      return { success: true };
    }),

  listAllPosts: adminQuery
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({
          id: schema.posts.id,
          title: schema.posts.title,
          status: schema.posts.status,
          type: schema.posts.type,
          category: schema.posts.category,
          city: schema.posts.city,
          userId: schema.posts.userId,
          wasFree: schema.posts.wasFree,
          viewCount: schema.posts.viewCount,
          createdAt: schema.posts.createdAt,
        })
        .from(schema.posts)
        .where(input.status ? eq(schema.posts.status, input.status as any) : undefined)
        .orderBy(desc(schema.posts.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  adminDeletePost: adminQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ input }) => {
      await deletePost(input.postId);
      return { success: true };
    }),

  leaveReview: authedQuery
    .input(z.object({
      postId: z.number(),
      revieweeId: z.number(),
      stars: z.number().min(1).max(5),
      comment: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const post = await getDb()
        .select({ userId: schema.posts.userId, filled: schema.posts.filled })
        .from(schema.posts)
        .where(eq(schema.posts.id, input.postId))
        .limit(1)
        .then((r) => r[0]);
      if (!post) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      if (!post.filled) throw new TRPCError({ code: "BAD_REQUEST", message: "Post not filled yet" });

      const reviewerId = ctx.user.id;
      const isPostOwner = post.userId === reviewerId;
      const isRevieweePostOwner = input.revieweeId === post.userId;
      if (!isPostOwner && !isRevieweePostOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not eligible to leave this review" });
      }
      // Non-owner reviewer must have expressed interest on this post
      if (!isPostOwner && !(await hasInterested(input.postId, reviewerId))) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must have expressed interest to leave a review" });
      }
      if (reviewerId === input.revieweeId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot review yourself" });
      }

      await getDb().insert(schema.reviews).values({
        postId: input.postId,
        reviewerId,
        revieweeId: input.revieweeId,
        stars: input.stars,
        comment: input.comment,
      }).onDuplicateKeyUpdate({ set: { stars: input.stars, comment: input.comment } });

      return { success: true };
    }),

  postReviews: publicQuery
    .input(z.object({ postId: z.number() }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({
          id: schema.reviews.id,
          reviewerId: schema.reviews.reviewerId,
          revieweeId: schema.reviews.revieweeId,
          stars: schema.reviews.stars,
          comment: schema.reviews.comment,
          createdAt: schema.reviews.createdAt,
          reviewerName: schema.users.name,
        })
        .from(schema.reviews)
        .leftJoin(schema.users, eq(schema.reviews.reviewerId, schema.users.id))
        .where(eq(schema.reviews.postId, input.postId))
        .orderBy(desc(schema.reviews.createdAt));
      return rows;
    }),

  userRating: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({ stars: schema.reviews.stars })
        .from(schema.reviews)
        .where(eq(schema.reviews.revieweeId, input.userId));
      if (rows.length === 0) return { avg: null, count: 0 };
      const avg = rows.reduce((s, r) => s + r.stars, 0) / rows.length;
      return { avg: Math.round(avg * 10) / 10, count: rows.length };
    }),

  myReviewForPost: authedQuery
    .input(z.object({ postId: z.number(), revieweeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const row = await getDb()
        .select()
        .from(schema.reviews)
        .where(
          sql`${schema.reviews.postId} = ${input.postId} AND ${schema.reviews.reviewerId} = ${ctx.user.id} AND ${schema.reviews.revieweeId} = ${input.revieweeId}`
        )
        .limit(1)
        .then((r) => r[0] ?? null);
      return row;
    }),
});

async function checkAndRewardReferralOnPost(userId: number) {
  const referrerId = await atomicRewardReferral(userId);
  if (referrerId) await addFreePostCredit(referrerId);
}