import { Hono } from "hono";
import { eq, and, lte, gte, isNull, or, sql } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./queries/connection";
import { sendExpiryReminder, sendSearchAlert } from "./lib/email";

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

cronRouter.get("/search-alerts", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  // Find saved searches that haven't been notified in >1 hour
  const searches = await getDb()
    .select()
    .from(schema.savedSearches)
    .where(
      or(
        isNull(schema.savedSearches.lastNotifiedAt),
        sql`${schema.savedSearches.lastNotifiedAt} < ${cutoff}`
      )
    );

  let alertsSent = 0;

  for (const search of searches) {
    // Find posts created since last notification
    const since = search.lastNotifiedAt ?? new Date(Date.now() - 60 * 60 * 1000);

    const conditions = [
      eq(schema.posts.status, "active"),
      eq(schema.posts.type, search.type),
      gte(schema.posts.createdAt, since),
    ];
    if (search.category) conditions.push(eq(schema.posts.category, search.category));
    if (search.city) conditions.push(eq(schema.posts.city, search.city));
    if (search.keyword) {
      conditions.push(
        sql`(${schema.posts.title} LIKE ${`%${search.keyword}%`} OR ${schema.posts.description} LIKE ${`%${search.keyword}%`})`
      );
    }

    const newPosts = await getDb()
      .select({ id: schema.posts.id, title: schema.posts.title, city: schema.posts.city })
      .from(schema.posts)
      .where(and(...conditions))
      .limit(10);

    // Update lastNotifiedAt even if no posts — prevents hammering
    await getDb()
      .update(schema.savedSearches)
      .set({ lastNotifiedAt: new Date() })
      .where(eq(schema.savedSearches.id, search.id));

    if (newPosts.length === 0) continue;

    const userRows = await getDb()
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, search.userId))
      .limit(1);

    const email = userRows[0]?.email;
    if (!email) continue;

    await sendSearchAlert(email, search.label, newPosts);
    alertsSent++;
  }

  return c.json({ ok: true, alertsSent, searchesChecked: searches.length });
});
