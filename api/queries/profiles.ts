import { eq, sql } from "drizzle-orm";
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

export async function useFreePost(userId: number) {
  await getDb()
    .update(schema.profiles)
    .set({ freePostsUsed: sql`freePostsUsed + 1`, updatedAt: new Date() })
    .where(eq(schema.profiles.userId, userId));
}

export async function addFreePostCredit(userId: number) {
  const profile = await getProfileByUserId(userId);
  if (!profile) return;
  await getDb()
    .update(schema.profiles)
    .set({
      freePostCredits: profile.freePostCredits + 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, userId));
}

export async function useFreePostCredit(userId: number) {
  const profile = await getProfileByUserId(userId);
  if (!profile || profile.freePostCredits <= 0) return false;
  await getDb()
    .update(schema.profiles)
    .set({
      freePostCredits: profile.freePostCredits - 1,
      updatedAt: new Date(),
    })
    .where(eq(schema.profiles.userId, userId));
  return true;
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
