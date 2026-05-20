import { Hono } from "hono";
import { eq, and, lte, gte } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./queries/connection";
import { sendExpiryReminder } from "./lib/email";

export const cronRouter = new Hono();

cronRouter.get("/reminders", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  // Guard: reject if secret is missing, empty, or doesn't match
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringPosts = await getDb()
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      userId: schema.posts.userId,
    })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "active"),
        eq(schema.posts.reminderSent, false),
        gte(schema.posts.expiresAt, now),
        lte(schema.posts.expiresAt, threeDaysLater)
      )
    );

  let sent = 0;
  for (const post of expiringPosts) {
    const userRows = await getDb()
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, post.userId))
      .limit(1);

    const email = userRows[0]?.email;
    if (!email) continue;

    await sendExpiryReminder(email, post.title, post.id);
    await getDb()
      .update(schema.posts)
      .set({ reminderSent: true })
      .where(eq(schema.posts.id, post.id));
    sent++;
  }

  return c.json({ ok: true, sent, checked: expiringPosts.length });
});
