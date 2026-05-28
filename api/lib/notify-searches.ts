import { eq, inArray } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "../queries/connection";
import { sendSearchAlert } from "./email";

/**
 * Called immediately when a post goes active.
 * Finds all saved searches whose criteria match the post, fires alert emails,
 * and updates lastNotifiedAt so the hourly cron won't double-send.
 */
export async function notifyMatchingSavedSearches(post: {
  id: number;
  authorUserId: number;
  type: "need" | "offer";
  category: string;
  city: string | null;
  title: string;
  description: string | null;
}): Promise<void> {
  try {
    const searches = await getDb()
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.type, post.type));

    if (searches.length === 0) return;

    const matchingSearches = searches.filter((s) => {
      if (s.userId === post.authorUserId) return false; // skip own posts
      if (s.category && s.category !== post.category) return false;
      if (s.city && s.city !== post.city) return false;
      if (s.keyword) {
        const kw = s.keyword.toLowerCase();
        const inTitle = post.title.toLowerCase().includes(kw);
        const inDesc = post.description?.toLowerCase().includes(kw) ?? false;
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    if (matchingSearches.length === 0) return;

    const userIds = [...new Set(matchingSearches.map((s) => s.userId))];
    const emailRows = await getDb()
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(inArray(schema.users.id, userIds));
    const emailById = new Map(emailRows.map((u) => [u.id, u.email]));

    const now = new Date();
    await Promise.all(
      matchingSearches.map(async (s) => {
        const email = emailById.get(s.userId);
        if (!email) return;
        await Promise.all([
          sendSearchAlert(email, s.label, [{ id: post.id, title: post.title, city: post.city }]),
          getDb()
            .update(schema.savedSearches)
            .set({ lastNotifiedAt: now })
            .where(eq(schema.savedSearches.id, s.id)),
        ]);
      })
    );
  } catch (err) {
    console.error("[notify-searches] failed:", err);
  }
}
