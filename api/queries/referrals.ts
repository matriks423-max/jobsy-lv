import { eq, and, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertReferral } from "@db/schema";
import { getDb } from "./connection";

export async function createReferral(data: InsertReferral) {
  await getDb().insert(schema.referrals).values(data);
}

export async function getReferralByReferredId(referredId: number) {
  const rows = await getDb()
    .select()
    .from(schema.referrals)
    .where(eq(schema.referrals.referredId, referredId))
    .limit(1);
  return rows.at(0);
}

// Atomic: increments referredPostCount, then rewards when count reaches 2
// within 30 days of referral creation, if not yet rewarded.
// Returns the referrerId if the reward was granted, null otherwise.
export async function atomicRewardReferral(referredId: number): Promise<number | null> {
  // First increment the post count atomically
  const incrementResult = await getDb()
    .update(schema.referrals)
    .set({ referredPostCount: sql`referredPostCount + 1`, postMade: true })
    .where(
      and(
        eq(schema.referrals.referredId, referredId),
        eq(schema.referrals.rewarded, false),
        sql`createdAt > NOW() - INTERVAL 30 DAY`
      )
    );
  const affected = (incrementResult as unknown as [{ affectedRows: number }])[0].affectedRows;
  if (affected === 0) return null;

  // Now attempt to set rewarded=true only when count has reached 2
  const rewardResult = await getDb()
    .update(schema.referrals)
    .set({ rewarded: true })
    .where(
      and(
        eq(schema.referrals.referredId, referredId),
        eq(schema.referrals.rewarded, false),
        sql`referredPostCount >= 2`,
        sql`createdAt > NOW() - INTERVAL 30 DAY`
      )
    );
  const rewardAffected = (rewardResult as unknown as [{ affectedRows: number }])[0].affectedRows;
  if (rewardAffected === 0) return null;

  const referral = await getReferralByReferredId(referredId);
  return referral ? referral.referrerId : null;
}
