import { eq, sql, and, desc } from "drizzle-orm";
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

// ── Credit wallet ─────────────────────────────────────────────────────────────

/** Grant credits (positive cents). Always succeeds — admin-only path. */
export async function grantCredits(
  userId: number,
  cents: number,
  description: string
): Promise<void> {
  await getDb().transaction(async (tx) => {
    await tx
      .update(schema.profiles)
      .set({ creditBalance: sql`creditBalance + ${cents}`, updatedAt: new Date() })
      .where(eq(schema.profiles.userId, userId));
    await tx.insert(schema.creditTransactions).values({
      userId,
      amount: cents,
      type: "grant",
      description,
    });
  });
}

/**
 * Atomically deduct credits for a boost purchase.
 * Returns true if deduction succeeded (balance was sufficient), false otherwise.
 */
export async function spendCredits(
  userId: number,
  cents: number,
  description: string
): Promise<boolean> {
  let succeeded = false;
  await getDb().transaction(async (tx) => {
    const result = await tx
      .update(schema.profiles)
      .set({ creditBalance: sql`creditBalance - ${cents}`, updatedAt: new Date() })
      .where(and(eq(schema.profiles.userId, userId), sql`creditBalance >= ${cents}`));
    succeeded = (result as unknown as [{ affectedRows: number }])[0].affectedRows > 0;
    if (succeeded) {
      await tx.insert(schema.creditTransactions).values({
        userId,
        amount: -cents,
        type: "spend",
        description,
      });
    }
  });
  return succeeded;
}

// ── Contact view limits ───────────────────────────────────────────────────────

const CONTACT_LIMITS: Record<"free" | "pro" | "business", number | null> = {
  free: 3,
  pro: 30,
  business: null, // unlimited
};
const RESET_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Lazy-reset monthly counter if needed, then atomically increment.
 * Returns { allowed, limit, used } — only call for NEW contacts (skip if already contacted).
 */
export async function checkAndIncrementContactViews(
  userId: number,
  plan: "free" | "pro" | "business"
): Promise<{ allowed: boolean; limit: number | null; used: number }> {
  const limit = CONTACT_LIMITS[plan];
  if (limit === null) return { allowed: true, limit: null, used: 0 };

  const profile = await getProfileByUserId(userId);
  if (!profile) return { allowed: false, limit, used: 0 };

  const now = new Date();
  const needsReset =
    !profile.contactViewsResetAt ||
    now.getTime() - new Date(profile.contactViewsResetAt).getTime() > RESET_MS;

  if (needsReset) {
    // Reset counter and use first slot atomically
    await getDb()
      .update(schema.profiles)
      .set({ contactViewsThisMonth: 1, contactViewsResetAt: now, updatedAt: now })
      .where(eq(schema.profiles.userId, userId));
    return { allowed: true, limit, used: 1 };
  }

  if (profile.contactViewsThisMonth >= limit) {
    return { allowed: false, limit, used: profile.contactViewsThisMonth };
  }

  // Atomic increment with guard — prevents race beyond limit
  const result = await getDb()
    .update(schema.profiles)
    .set({ contactViewsThisMonth: sql`contactViewsThisMonth + 1`, updatedAt: now })
    .where(and(eq(schema.profiles.userId, userId), sql`contactViewsThisMonth < ${limit}`));
  const ok = (result as unknown as [{ affectedRows: number }])[0].affectedRows > 0;

  return { allowed: ok, limit, used: ok ? profile.contactViewsThisMonth + 1 : profile.contactViewsThisMonth };
}

/** Last N credit transactions for a user (for settings history). */
export async function getCreditTransactions(userId: number, limit = 20) {
  return getDb()
    .select()
    .from(schema.creditTransactions)
    .where(eq(schema.creditTransactions.userId, userId))
    .orderBy(desc(schema.creditTransactions.createdAt))
    .limit(limit);
}
