import { eq, sql, and } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertProfile } from "@db/schema";
import { getDb } from "./connection";

export async function getProfileByUserId(userId: number) {
  const rows = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, userId))
    .limit(1);
  return rows.at(0);
}

export async function getProfileById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, id))
    .limit(1);
  return rows.at(0);
}

export async function updateProfile(userId: number, data: Partial<InsertProfile>) {
  await getDb()
    .update(schema.profiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId));
}

// Atomic: increments only if under limit. Returns true if the slot was consumed.
export async function useFreePost(userId: number, limit: number): Promise<boolean> {
  const result = await getDb()
    .update(schema.profiles)
    .set({ freePostsUsed: sql`freePostsUsed + 1`, updatedAt: new Date() })
    .where(and(eq(schema.profiles.userId, userId), sql`freePostsUsed < ${limit}`));
  return (result as unknown as [{ affectedRows: number }])[0].affectedRows > 0;
}

export async function addFreePostCredit(userId: number) {
  await getDb()
    .update(schema.profiles)
    .set({ freePostCredits: sql`freePostCredits + 1`, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId));
}

// Atomic: decrements only if credits > 0. Returns true if a credit was consumed.
export async function useFreePostCredit(userId: number): Promise<boolean> {
  const result = await getDb()
    .update(schema.profiles)
    .set({ freePostCredits: sql`freePostCredits - 1`, updatedAt: new Date() })
    .where(and(eq(schema.profiles.userId, userId), sql`freePostCredits > 0`));
  return (result as unknown as [{ affectedRows: number }])[0].affectedRows > 0;
}

export async function getProfileByReferralCode(code: string) {
  const rows = await getDb()
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.referralCode, code))
    .limit(1);
  return rows.at(0);
}

export async function setReferredBy(userId: number, referrerId: number) {
  await getDb()
    .update(schema.profiles)
    .set({ referredBy: referrerId, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId));
}
