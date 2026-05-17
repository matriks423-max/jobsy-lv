import { eq, and, desc } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertContact, InsertReport } from "@db/schema";
import { getDb } from "./connection";

export async function createContact(data: InsertContact) {
  await getDb().insert(schema.contacts).values(data);
}

export async function getContactsByPostId(postId: number) {
  return getDb()
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.postId, postId))
    .orderBy(desc(schema.contacts.createdAt));
}

export async function hasContacted(postId: number, fromUserId: number) {
  const rows = await getDb()
    .select()
    .from(schema.contacts)
    .where(
      and(
        eq(schema.contacts.postId, postId),
        eq(schema.contacts.fromUserId, fromUserId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export async function createReport(data: InsertReport) {
  await getDb().insert(schema.reports).values(data);
}
