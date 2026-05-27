import { eq, and, desc, asc, sql, gte, lte, inArray, gt } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertPost } from "@db/schema";
import { getDb } from "./connection";

export async function createPost(data: InsertPost) {
  const result = await getDb().insert(schema.posts).values(data);
  return result;
}

export async function getPostById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.posts)
    .where(eq(schema.posts.id, id))
    .limit(1);
  return rows.at(0);
}

export async function getPostWithProfile(id: number) {
  const post = await getPostById(id);
  if (!post) return null;

  const [profileRows, imageRows, userRows] = await Promise.all([
    getDb()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, post.userId))
      .limit(1),
    getDb()
      .select()
      .from(schema.postImages)
      .where(eq(schema.postImages.postId, id))
      .orderBy(schema.postImages.sortOrder),
    getDb()
      .select({ plan: schema.users.plan })
      .from(schema.users)
      .where(eq(schema.users.id, post.userId))
      .limit(1),
  ]);

  return {
    post,
    profile: profileRows.at(0),
    images: imageRows.map((img) => img.url),
    isBusiness: userRows.at(0)?.plan === "business",
  };
}

export async function listPosts(filters?: {
  type?: "need" | "offer";
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  userId?: number;
  sort?: "newest" | "oldest" | "budget_asc" | "budget_desc";
  limit?: number;
  offset?: number;
}) {
  const where = [];

  if (filters?.type) {
    where.push(eq(schema.posts.type, filters.type));
  }
  if (filters?.category) {
    where.push(eq(schema.posts.category, filters.category));
  }
  if (filters?.city) {
    where.push(eq(schema.posts.city, filters.city));
  }
  if (filters?.status) {
    where.push(eq(schema.posts.status, filters.status as "pending_payment" | "active" | "closed" | "expired" | "rejected"));
  }
  if (filters?.userId) {
    where.push(eq(schema.posts.userId, filters.userId));
  }
  if (filters?.search) {
    where.push(
      sql`(${schema.posts.title} LIKE ${"%" + filters.search + "%"} OR ${schema.posts.description} LIKE ${"%" + filters.search + "%"})`
    );
  }

  const baseOrder = (() => {
    switch (filters?.sort) {
      case "oldest": return asc(schema.posts.createdAt);
      // Extract first numeric sequence from budgetText for proper numeric sort
      case "budget_asc": return asc(sql`CAST(REGEXP_SUBSTR(${schema.posts.budgetText}, '[0-9]+') AS UNSIGNED)`);
      case "budget_desc": return desc(sql`CAST(REGEXP_SUBSTR(${schema.posts.budgetText}, '[0-9]+') AS UNSIGNED)`);
      default: return desc(schema.posts.createdAt);
    }
  })();

  return getDb()
    .select()
    .from(schema.posts)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(
      sql`(${schema.posts.boostType} = 'bump' AND ${schema.posts.boostExpiresAt} > NOW()) DESC`,
      baseOrder
    )
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);
}

export async function listPostsWithProfiles(filters?: {
  type?: "need" | "offer";
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  userId?: number;
  sort?: "newest" | "oldest" | "budget_asc" | "budget_desc";
  limit?: number;
  offset?: number;
}) {
  const posts = await listPosts(filters);
  if (posts.length === 0) return [];

  // Fetch profiles, user plans, and first image for each post in parallel
  const userIds = [...new Set(posts.map((p) => p.userId))];
  const postIds = posts.map((p) => p.id);
  const [profiles, users, imageRows] = await Promise.all([
    getDb()
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.userId, userIds)),
    getDb()
      .select({ id: schema.users.id, plan: schema.users.plan })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds)),
    getDb()
      .select({ postId: schema.postImages.postId, url: schema.postImages.url })
      .from(schema.postImages)
      .where(inArray(schema.postImages.postId, postIds))
      .orderBy(schema.postImages.sortOrder),
  ]);
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const planMap = new Map(users.map((u) => [u.id, u.plan]));
  // Keep only the first (lowest sortOrder) image per post
  const imageMap = new Map<number, string[]>();
  for (const row of imageRows) {
    const existing = imageMap.get(row.postId);
    if (existing) existing.push(row.url);
    else imageMap.set(row.postId, [row.url]);
  }

  return posts.map((post) => ({
    post,
    profile: profileMap.get(post.userId),
    isBusiness: planMap.get(post.userId) === "business",
    images: imageMap.get(post.id) ?? [],
  }));
}

export async function getFeaturedPosts(limit = 6) {
  const now = new Date();
  const posts = await getDb()
    .select()
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "active"),
        eq(schema.posts.boostType, "featured"),
        gt(schema.posts.boostExpiresAt, now)
      )
    )
    .orderBy(desc(schema.posts.boostExpiresAt))
    .limit(limit);

  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p) => p.userId))];
  const postIds = posts.map((p) => p.id);
  const [profiles, users, imageRows] = await Promise.all([
    getDb()
      .select()
      .from(schema.profiles)
      .where(inArray(schema.profiles.userId, userIds)),
    getDb()
      .select({ id: schema.users.id, plan: schema.users.plan })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds)),
    getDb()
      .select({ postId: schema.postImages.postId, url: schema.postImages.url })
      .from(schema.postImages)
      .where(inArray(schema.postImages.postId, postIds))
      .orderBy(schema.postImages.sortOrder),
  ]);
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const planMap = new Map(users.map((u) => [u.id, u.plan]));
  const imageMap = new Map<number, string[]>();
  for (const row of imageRows) {
    const existing = imageMap.get(row.postId);
    if (existing) existing.push(row.url);
    else imageMap.set(row.postId, [row.url]);
  }

  return posts.map((post) => ({
    post,
    profile: profileMap.get(post.userId),
    isBusiness: planMap.get(post.userId) === "business",
    images: imageMap.get(post.id) ?? [],
  }));
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  await getDb()
    .update(schema.posts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.posts.id, id));
}

export async function incrementViewCount(id: number) {
  await getDb()
    .update(schema.posts)
    .set({ viewCount: sql`${schema.posts.viewCount} + 1` })
    .where(eq(schema.posts.id, id));
}

export async function incrementContactCount(id: number) {
  await getDb()
    .update(schema.posts)
    .set({ contactCount: sql`${schema.posts.contactCount} + 1` })
    .where(eq(schema.posts.id, id));
}

export async function setPostFilled(id: number, filled: boolean) {
  await getDb()
    .update(schema.posts)
    .set({ filled, updatedAt: new Date() })
    .where(eq(schema.posts.id, id));
}

// Throttle: run expiry at most once per 5 minutes per process
let lastExpireRun = 0;
const EXPIRE_INTERVAL_MS = 5 * 60 * 1000;

export async function expireOldPosts() {
  const now = Date.now();
  if (now - lastExpireRun < EXPIRE_INTERVAL_MS) return;
  lastExpireRun = now;
  await getDb()
    .update(schema.posts)
    .set({ status: "expired" })
    .where(
      and(
        eq(schema.posts.status, "active"),
        lte(schema.posts.expiresAt, new Date(now))
      )
    );
}

export async function countPosts(filters?: {
  type?: "need" | "offer";
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  userId?: number;
}) {
  const where = [];
  if (filters?.type) where.push(eq(schema.posts.type, filters.type));
  if (filters?.category) where.push(eq(schema.posts.category, filters.category));
  if (filters?.city) where.push(eq(schema.posts.city, filters.city));
  if (filters?.status) where.push(eq(schema.posts.status, filters.status as "pending_payment" | "active" | "closed" | "expired" | "rejected"));
  if (filters?.userId) where.push(eq(schema.posts.userId, filters.userId));
  if (filters?.search) {
    where.push(
      sql`(${schema.posts.title} LIKE ${"%" + filters.search + "%"} OR ${schema.posts.description} LIKE ${"%" + filters.search + "%"})`
    );
  }
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.posts)
    .where(where.length > 0 ? and(...where) : undefined);
  return result[0]?.count ?? 0;
}

export async function countActivePosts() {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.posts)
    .where(eq(schema.posts.status, "active"));
  return result[0]?.count ?? 0;
}

export async function countPostsByType(type: "need" | "offer") {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.posts)
    .where(and(eq(schema.posts.type, type), eq(schema.posts.status, "active")));
  return result[0]?.count ?? 0;
}

export async function countUsers() {
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.users);
  return result[0]?.count ?? 0;
}

export async function countCategories() {
  const result = await getDb()
    .select({ count: sql<number>`count(distinct ${schema.posts.category})` })
    .from(schema.posts)
    .where(eq(schema.posts.status, "active"));
  return result[0]?.count ?? 0;
}

export async function deletePost(id: number) {
  // Wrap in transaction: all child-record deletes + parent delete must succeed together
  await getDb().transaction(async (tx) => {
    await Promise.all([
      tx.delete(schema.postImages).where(eq(schema.postImages.postId, id)),
      tx.delete(schema.contacts).where(eq(schema.contacts.postId, id)),
      tx.delete(schema.reports).where(eq(schema.reports.postId, id)),
      tx.delete(schema.interests).where(eq(schema.interests.postId, id)),
      tx.delete(schema.reviews).where(eq(schema.reviews.postId, id)),
      tx.delete(schema.socialQueue).where(eq(schema.socialQueue.postId, id)),
    ]);
    await tx.delete(schema.posts).where(eq(schema.posts.id, id));
  });
}

/** Batch-delete all posts belonging to a user in a single transaction (used on ban). */
export async function deletePostsByUserId(userId: number) {
  const posts = await getDb()
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.userId, userId));
  if (posts.length === 0) return;
  const ids = posts.map((p) => p.id);
  await getDb().transaction(async (tx) => {
    await Promise.all([
      tx.delete(schema.postImages).where(inArray(schema.postImages.postId, ids)),
      tx.delete(schema.contacts).where(inArray(schema.contacts.postId, ids)),
      tx.delete(schema.reports).where(inArray(schema.reports.postId, ids)),
      tx.delete(schema.interests).where(inArray(schema.interests.postId, ids)),
      tx.delete(schema.reviews).where(inArray(schema.reviews.postId, ids)),
      tx.delete(schema.socialQueue).where(inArray(schema.socialQueue.postId, ids)),
    ]);
    await tx.delete(schema.posts).where(inArray(schema.posts.id, ids));
  });
}

export async function countUserPostsToday(userId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result = await getDb()
    .select({ count: sql<number>`count(*)` })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.userId, userId),
        gte(schema.posts.createdAt, today)
      )
    );
  return result[0]?.count ?? 0;
}
