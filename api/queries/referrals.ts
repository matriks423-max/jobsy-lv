import { eq, and } from "drizzle-orm";
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

// Atomic: marks postMade+rewarded in one UPDATE only when not yet rewarded.
// Returns the referrerId if the reward was granted, null if already rewarded/no referral.
export async function atomicRewardReferral(referredId: number): Promise<number | null> {
  const referral = await getReferralByReferredId(referredId);
  if (!referral || referral.rewarded) return null;

  const result = await getDb()
    .update(schema.referrals)
    .set({ postMade: true, rewarded: true })
    .where(
      and(
        eq(schema.referrals.referredId, referredId),
        eq(schema.referrals.rewarded, false)
      )
    );
  const affected = (result as unknown as [{ affectedRows: number }])[0].affectedRows;
  return affected > 0 ? referral.referrerId : null;
}

