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

export async function markReferralPostMade(referredId: number) {
  await getDb()
    .update(schema.referrals)
    .set({ postMade: true })
    .where(eq(schema.referrals.referredId, referredId));
}

export async function markReferralRewarded(referredId: number) {
  await getDb()
    .update(schema.referrals)
    .set({ rewarded: true })
    .where(eq(schema.referrals.referredId, referredId));
}

export async function getPendingReferrals(referrerId: number) {
  return getDb()
    .select()
    .from(schema.referrals)
    .where(
      and(
        eq(schema.referrals.referrerId, referrerId),
        eq(schema.referrals.postMade, true),
        eq(schema.referrals.rewarded, false)
      )
    );
}
