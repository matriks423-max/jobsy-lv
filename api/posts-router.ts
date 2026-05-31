import { z } from "zod";
import { eq, desc, sql, gte, count, avg, inArray, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { env } from "./lib/env";
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
  deletePostsByUserId,
  countUserPostsToday,
  setPostFilled,
  countPosts,
  getFeaturedPosts,
} from "./queries/posts";
import {
  getProfileByUserId,
  updateProfile,
  useFreePostCredit,
  checkAndIncrementContactViews,
} from "./queries/profiles";
import { createContact, hasContacted, createReport } from "./queries/reports";
import { hasInterested, createInterest } from "./queries/interests";
import { sendInterestNotification, sendContactNotification } from "./lib/email";
import { atomicRewardReferral } from "./queries/referrals";
import { grantCredits } from "./queries/profiles";
import { createCheckoutSession } from "./stripe";
import { moderateContent, softFlagCheck } from "./lib/moderation";
import { sendPostPublished } from "./lib/email";
import { notifyMatchingSavedSearches } from "./lib/notify-searches";
import { notifySocialQueue, notifyReview } from "./lib/social-notify";

const MAX_POSTS_PER_DAY = 5;

const reportRateLimit = new Map<string, number[]>();
const MAX_REPORTS_PER_HOUR = 5;

const postTypeEnum = z.enum(["need", "offer"]);
const languageEnum = z.enum(["lv", "ru", "en"]);
const categoryEnum = z.enum(["household", "moving", "repairs", "garden", "auto", "childcare", "pets", "it", "tutoring", "other"]);

// Uploaded image URLs must come from our own upload system only
const imageUrlSchema = z.string()
  .max(512)
  .refine(
    (url) => {
      if (url.startsWith("/uploads/")) return true;
      const r2Base = env.r2PublicUrl?.replace(/\/$/, "");
      return !!r2Base && url.startsWith(r2Base + "/");
    },
    { message: "Invalid image URL" }
  );

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

  featuredPosts: publicQuery.query(async () => {
    return getFeaturedPosts(6);
  }),

  categoryCounts: publicQuery.query(async () => {
    const rows = await getDb()
      .select({ category: schema.posts.category, cnt: count() })
      .from(schema.posts)
      .where(eq(schema.posts.status, "active"))
      .groupBy(schema.posts.category);
    return Object.fromEntries(rows.map((r) => [r.category, r.cnt])) as Record<string, number>;
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

  myAnalytics: authedQuery.query(async ({ ctx }) => {
    const userPosts = await getDb()
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        status: schema.posts.status,
        viewCount: schema.posts.viewCount,
        createdAt: schema.posts.createdAt,
      })
      .from(schema.posts)
      .where(eq(schema.posts.userId, ctx.user.id))
      .orderBy(desc(schema.posts.createdAt));

    if (userPosts.length === 0) return [];

    const postIds = userPosts.map((p) => p.id);

    const [contactCounts, interestCounts] = await Promise.all([
      getDb()
        .select({ postId: schema.contacts.postId, cnt: count() })
        .from(schema.contacts)
        .where(inArray(schema.contacts.postId, postIds))
        .groupBy(schema.contacts.postId),
      getDb()
        .select({ postId: schema.interests.postId, cnt: count() })
        .from(schema.interests)
        .where(inArray(schema.interests.postId, postIds))
        .groupBy(schema.interests.postId),
    ]);

    const contactMap = new Map(contactCounts.map((r) => [r.postId, r.cnt]));
    const interestMap = new Map(interestCounts.map((r) => [r.postId, r.cnt]));

    return userPosts.map((post) => ({
      ...post,
      contactCount: contactMap.get(post.id) ?? 0,
      interestCount: interestMap.get(post.id) ?? 0,
    }));
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
        category: categoryEnum,
        city: z.string().optional(),
        region: z.string().optional(),
        budgetText: z.string().max(100).optional(),
        whenText: z.string().max(100).optional(),
        language: languageEnum.default("lv"),
        images: z.array(imageUrlSchema).max(5).optional(),
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
          message: `Daily limit: max ${MAX_POSTS_PER_DAY} posts per day`,
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

      // Plan-based posting logic
      if (ctx.user.plan !== "business") {
        // Free tier: 1 active post at a time
        const [{ cnt }] = await getDb()
          .select({ cnt: count() })
          .from(schema.posts)
          .where(and(
            eq(schema.posts.userId, ctx.user.id),
            inArray(schema.posts.status, ["active", "pending_review"]),
          ));
        if (cnt >= 1) {
          // Try spending a referral credit before blocking
          const creditUsed = profile.freePostCredits > 0
            ? await useFreePostCredit(ctx.user.id)
            : false;
          if (!creditUsed) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Free plan: 1 active post at a time — upgrade to Business",
            });
          }
        }
      }

      // Create post — always active or pending_review, never pending_payment
      const post = await createPost({
        ...input,
        userId: ctx.user.id,
        status: needsReview ? "pending_review" : "active",
        wasFree: true,
        expiresAt,
      });

      const insertId = Number((post as unknown as [{ insertId: bigint }])[0].insertId);

      // Save images (batch insert — use index as sortOrder so ordering is stable)
      if (input.images && input.images.length > 0) {
        await getDb().insert(schema.postImages).values(
          input.images.map((url, i) => ({ postId: insertId, url, sortOrder: i }))
        );
      }

      // Increment monthly counter for free users
      if (ctx.user.plan !== "business") {
        await updateProfile(ctx.user.id, { monthlyPostCount: profile.monthlyPostCount + 1 });
      }

      await checkAndRewardReferralOnPost(ctx.user.id);
      if (!needsReview && profile.email) {
        void sendPostPublished(profile.email, input.title, insertId);
        void notifySocialQueue(insertId, input.title, input.description ?? null, input.category, input.city ?? null);
        void notifyMatchingSavedSearches({
          id: insertId,
          authorUserId: ctx.user.id,
          type: input.type,
          category: input.category,
          city: input.city ?? null,
          title: input.title,
          description: input.description ?? null,
        });
      }

      return { postId: insertId, requiresPayment: false, needsReview };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(5).max(80).optional(),
        description: z.string().max(500).optional(),
        category: categoryEnum.optional(),
        city: z.string().optional(),
        region: z.string().optional(),
        budgetText: z.string().max(100).optional(),
        whenText: z.string().max(100).optional(),
        images: z.array(imageUrlSchema).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const postResult = await getPostWithProfile(input.id);
      if (!postResult) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      if (postResult.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Post does not belong to you" });
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

      const { id, images, ...data } = input;
      await updatePost(id, data as any);

      // Sync images atomically: delete + re-insert in one transaction
      if (images !== undefined) {
        await getDb().transaction(async (tx) => {
          await tx.delete(schema.postImages).where(eq(schema.postImages.postId, id));
          if (images.length > 0) {
            await tx.insert(schema.postImages).values(
              images.map((url, i) => ({ postId: id, url, sortOrder: i }))
            );
          }
        });
      }

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
        throw new TRPCError({ code: "FORBIDDEN", message: "Post does not belong to you" });
      }

      await deletePost(input.id);
      return { success: true };
    }),

  setFilled: authedQuery
    .input(z.object({ postId: z.number(), filled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const result = await getPostWithProfile(input.postId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      if (result.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Post does not belong to you" });
      }
      await setPostFilled(input.postId, input.filled);
      return { success: true };
    }),

  // Renew an expired/closed post — creates a fresh copy with 30-day expiry
  renew: authedQuery
    .input(z.object({ postId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const result = await getPostWithProfile(input.postId);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      if (result.post.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Post does not belong to you" });
      }

      const profile = await getProfileByUserId(ctx.user.id);
      if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });

      // Rate limit check
      const postsToday = await countUserPostsToday(ctx.user.id);
      if (postsToday >= MAX_POSTS_PER_DAY) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: `Daily limit: max ${MAX_POSTS_PER_DAY} posts per day` });
      }

      // Plan limit check for free users
      if (ctx.user.plan !== "business") {
        const [{ cnt }] = await getDb()
          .select({ cnt: count() })
          .from(schema.posts)
          .where(and(
            eq(schema.posts.userId, ctx.user.id),
            inArray(schema.posts.status, ["active", "pending_review"]),
          ));
        if (cnt >= 1) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Free plan: 1 active post at a time — upgrade to Business" });
        }
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const orig = result.post;
      const newPost = await createPost({
        type: orig.type,
        title: orig.title,
        description: orig.description ?? undefined,
        category: orig.category,
        city: orig.city ?? undefined,
        region: orig.region ?? undefined,
        budgetText: orig.budgetText ?? undefined,
        whenText: orig.whenText ?? undefined,
        language: (orig.language as "lv" | "ru" | "en") ?? "lv",
        userId: ctx.user.id,
        status: "active",
        wasFree: true,
        expiresAt,
      });
      const insertId = Number((newPost as unknown as [{ insertId: bigint }])[0].insertId);

      // Copy images from original post to renewed post (batch insert)
      const originalImages = await getDb()
        .select({ url: schema.postImages.url, sortOrder: schema.postImages.sortOrder })
        .from(schema.postImages)
        .where(eq(schema.postImages.postId, input.postId))
        .orderBy(schema.postImages.sortOrder);
      if (originalImages.length > 0) {
        await getDb().insert(schema.postImages).values(
          originalImages.map((img) => ({ postId: insertId, url: img.url, sortOrder: img.sortOrder }))
        );
      }

      if (ctx.user.plan !== "business") {
        await updateProfile(ctx.user.id, { monthlyPostCount: profile.monthlyPostCount + 1 });
      }
      return { postId: insertId };
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
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }

      const alreadyContacted = await hasContacted(input.postId, ctx.user.id);
      if (!alreadyContacted) {
        // Check monthly contact view limit (free: 3, pro: 30, business: ∞)
        const plan = (ctx.user.plan ?? "free") as "free" | "pro" | "business";
        const limitCheck = await checkAndIncrementContactViews(ctx.user.id, plan);
        if (!limitCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Contact limit reached: ${limitCheck.used}/${limitCheck.limit} this month — upgrade to see more`,
          });
        }

        await createContact({
          postId: input.postId,
          fromUserId: ctx.user.id,
        });
        await incrementContactCount(input.postId);

        // Notify post owner (fire-and-forget, non-blocking)
        // Use profile contact email if set, otherwise look up user login email
        const ownerEmail = postResult.profile?.email
          ?? await getDb()
            .select({ email: schema.users.email })
            .from(schema.users)
            .where(eq(schema.users.id, postResult.post.userId))
            .limit(1)
            .then((r) => r[0]?.email ?? null);

        if (ownerEmail && postResult.post.userId !== ctx.user.id) {
          const contactorProfile = await getProfileByUserId(ctx.user.id);
          const contactorName = contactorProfile?.name ?? ctx.user.email;
          void sendContactNotification(ownerEmail, postResult.post.title, input.postId, contactorName);
        }
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
      if (!postResult) throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      if (postResult.post.userId === ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot express interest in your own post" });

      const already = await hasInterested(input.postId, ctx.user.id);
      if (!already) {
        await createInterest(input.postId, ctx.user.id);
        const helperProfile = await getProfileByUserId(ctx.user.id);
        const helperName = helperProfile?.name ?? "Kāds";
        // Fall back to login email if profile email not set
        const ownerEmail = postResult.profile?.email
          ?? await getDb()
            .select({ email: schema.users.email })
            .from(schema.users)
            .where(eq(schema.users.id, postResult.post.userId))
            .limit(1)
            .then((r) => r[0]?.email ?? null);
        if (ownerEmail) {
          void sendInterestNotification(ownerEmail, helperName, postResult.post.title, input.postId);
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
        reason: z.string().max(200),
        details: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = Date.now();
      const window = 60 * 60 * 1000;
      const key = String(ctx.user.id);
      const timestamps = (reportRateLimit.get(key) ?? []).filter((t) => now - t < window);
      if (timestamps.length >= MAX_REPORTS_PER_HOUR) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many reports. Try again later." });
      }
      timestamps.push(now);
      reportRateLimit.set(key, timestamps);

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
          message: "Post does not belong to you",
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
      void notifySocialQueue(input.postId, postResult.post.title, postResult.post.description ?? null, postResult.post.category, postResult.post.city ?? null);
      void notifyMatchingSavedSearches({
        id: input.postId,
        authorUserId: ctx.user.id,
        type: postResult.post.type,
        category: postResult.post.category,
        city: postResult.post.city ?? null,
        title: postResult.post.title,
        description: postResult.post.description ?? null,
      });

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
        throw new TRPCError({ code: "NOT_FOUND", message: "Report not found" });
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
          // Delete all posts by banned user in a single transaction
          await deletePostsByUserId(userId);
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
      if (postResult?.profile?.email) {
        void sendPostPublished(postResult.profile.email, postResult.post.title, input.postId);
      }
      if (postResult?.post) {
        void notifySocialQueue(input.postId, postResult.post.title, postResult.post.description ?? null, postResult.post.category, postResult.post.city ?? null);
        void notifyMatchingSavedSearches({
          id: input.postId,
          authorUserId: postResult.post.userId,
          type: postResult.post.type,
          category: postResult.post.category,
          city: postResult.post.city ?? null,
          title: postResult.post.title,
          description: postResult.post.description ?? null,
        });
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
      businessUsers, pendingCount, reportsCount, totalInterests, totalReviews, verifiedPhones,
    ] = await Promise.all([
      getDb().select({ c: count() }).from(schema.users).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "active")).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(gte(schema.posts.createdAt, today)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, today)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.users).where(eq(schema.users.plan, "business")).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "pending_review")).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.reports).where(eq(schema.reports.resolved, false)).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.interests).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.reviews).then((r) => r[0]?.c ?? 0),
      getDb().select({ c: count() }).from(schema.profiles).where(eq(schema.profiles.phoneVerified, true)).then((r) => r[0]?.c ?? 0),
    ]);

    return { totalUsers, totalPosts, activePosts, postsToday, usersToday, businessUsers, pendingCount, reportsCount, totalInterests, totalReviews, verifiedPhones };
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
          plan: schema.users.plan,
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
        await deletePostsByUserId(input.userId);
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

  socialQueue: adminQuery
    .input(z.object({ status: z.enum(["pending", "posted", "failed"]).optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const rows = await getDb()
        .select({
          id: schema.socialQueue.id,
          postId: schema.socialQueue.postId,
          boostType: schema.socialQueue.boostType,
          status: schema.socialQueue.status,
          scheduledAt: schema.socialQueue.scheduledAt,
          postedAt: schema.socialQueue.postedAt,
          createdAt: schema.socialQueue.createdAt,
          postTitle: schema.posts.title,
        })
        .from(schema.socialQueue)
        .leftJoin(schema.posts, eq(schema.posts.id, schema.socialQueue.postId))
        .where(input.status ? eq(schema.socialQueue.status, input.status) : undefined)
        .orderBy(desc(schema.socialQueue.createdAt))
        .limit(input.limit);
      return rows;
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
      // Post owner can review someone who expressed interest; interested party can review post owner
      const isPostOwner = post.userId === reviewerId;
      const isRevieweePostOwner = input.revieweeId === post.userId;
      if (!isPostOwner && !isRevieweePostOwner) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not eligible to leave this review" });
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

      const reviewedPost = await getDb()
        .select({ category: schema.posts.category, city: schema.posts.city })
        .from(schema.posts)
        .where(eq(schema.posts.id, input.postId))
        .limit(1)
        .then((r) => r[0]);
      if (reviewedPost) {
        void notifyReview(input.stars, reviewedPost.category, reviewedPost.city ?? null);
      }

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
      const [row] = await getDb()
        .select({ avgStars: avg(schema.reviews.stars), cnt: count() })
        .from(schema.reviews)
        .where(eq(schema.reviews.revieweeId, input.userId));
      if (!row || row.cnt === 0) return { avg: null, count: 0 };
      const rounded = Math.round(Number(row.avgStars) * 10) / 10;
      return { avg: rounded, count: row.cnt };
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

  // Public user profile — name, avatar, city, business info, active posts, reviews received
  publicProfile: publicQuery
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [profileRows, userRows] = await Promise.all([
        db.select({
          name: schema.profiles.name,
          avatarUrl: schema.profiles.avatarUrl,
          city: schema.profiles.city,
          phoneVerified: schema.profiles.phoneVerified,
          companyName: schema.profiles.companyName,
          companyWebsite: schema.profiles.companyWebsite,
          companyDescription: schema.profiles.companyDescription,
          createdAt: schema.profiles.createdAt,
        })
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, input.userId))
          .limit(1),
        db.select({ plan: schema.users.plan, createdAt: schema.users.createdAt })
          .from(schema.users)
          .where(eq(schema.users.id, input.userId))
          .limit(1),
      ]);

      const profile = profileRows[0];
      if (!profile) return null;

      // Active posts by this user
      const posts = await db
        .select({
          id: schema.posts.id,
          title: schema.posts.title,
          type: schema.posts.type,
          category: schema.posts.category,
          city: schema.posts.city,
          budgetText: schema.posts.budgetText,
          viewCount: schema.posts.viewCount,
          createdAt: schema.posts.createdAt,
          boostType: schema.posts.boostType,
          boostExpiresAt: schema.posts.boostExpiresAt,
          filled: schema.posts.filled,
        })
        .from(schema.posts)
        .where(sql`${schema.posts.userId} = ${input.userId} AND ${schema.posts.status} = 'active'`)
        .orderBy(desc(schema.posts.createdAt))
        .limit(20);

      // Reviews received (last 10 for display) + aggregate over all reviews for accurate avg
      const [reviews, ratingRow] = await Promise.all([
        db
          .select({
            id: schema.reviews.id,
            stars: schema.reviews.stars,
            comment: schema.reviews.comment,
            createdAt: schema.reviews.createdAt,
            reviewerName: schema.profiles.name,
          })
          .from(schema.reviews)
          .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.reviews.reviewerId))
          .where(eq(schema.reviews.revieweeId, input.userId))
          .orderBy(desc(schema.reviews.createdAt))
          .limit(10),
        db
          .select({ avgStars: avg(schema.reviews.stars), cnt: count() })
          .from(schema.reviews)
          .where(eq(schema.reviews.revieweeId, input.userId))
          .then((r) => r[0]),
      ]);

      const reviewCount = ratingRow?.cnt ?? 0;
      const avgRating = reviewCount > 0
        ? Math.round(Number(ratingRow!.avgStars) * 10) / 10
        : null;

      return {
        profile,
        isBusiness: userRows[0]?.plan === "business",
        memberSince: userRows[0]?.createdAt ?? profile.createdAt,
        posts,
        reviews,
        avgRating,
        reviewCount,
      };
    }),
});

async function checkAndRewardReferralOnPost(userId: number) {
  // atomicRewardReferral does check+update in one DB round-trip,
  // preventing double-reward if two posts are created simultaneously.
  const referrerId = await atomicRewardReferral(userId);
  if (referrerId !== null) {
    await grantCredits(referrerId, 500, "Referral reward: referred user published 2 posts within 30 days");
  }
}