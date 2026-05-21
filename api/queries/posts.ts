import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";
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

  const profileRows = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, post.userId))
    .limit(1);

  return { post, profile: profileRows.at(0) };
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

  const query = getDb()
    .select()
    .from(schema.posts)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(schema.posts.createdAt))
    .limit(filters?.limit ?? 50)
    .offset(filters?.offset ?? 0);

  return query;
}

export async function listPostsWithProfiles(filters?: {
  type?: "need" | "offer";
  category?: string;
  city?: string;
  status?: string;
  search?: string;
  userId?: number;
  limit?: number;
  offset?: number;
}) {
  const posts = await listPosts(filters);
  if (posts.length === 0) return [];

  // Only fetch profiles for the users who authored these posts
  const userIds = [...new Set(posts.map((p) => p.userId))];
  const profiles = await getDb()
    .select()
    .from(schema.profiles)
    .where(inArray(schema.profiles.userId, userIds));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return posts.map((post) => ({
    post,
    profile: profileMap.get(post.userId),
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
  await getDb()
    .delete(schema.posts)
    .where(eq(schema.posts.id, id));
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
