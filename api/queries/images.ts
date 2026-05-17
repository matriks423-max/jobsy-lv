import { eq } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./connection";

export async function getImagesByPostId(postId: number) {
  return getDb()
    .select()
    .from(schema.postImages)
    .where(eq(schema.postImages.postId, postId))
    .orderBy(schema.postImages.sortOrder);
}
