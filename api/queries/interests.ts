import { and, eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function hasInterested(postId: number, userId: number) {
  const rows = await getDb()
    .select()
    .from(schema.interests)
    .where(and(eq(schema.interests.postId, postId), eq(schema.interests.fromUserId, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function createInterest(postId: number, fromUserId: number) {
  await getDb().insert(schema.interests).values({ postId, fromUserId }).onDuplicateKeyUpdate({ set: { postId } });
}
