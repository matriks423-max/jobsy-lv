import { Hono } from "hono";
import { eq, and, lte, gte, isNull, isNotNull, or, sql, inArray, count, desc } from "drizzle-orm";
import * as schema from "@db/schema";
import { getDb } from "./queries/connection";
import { sendExpiryReminder, sendSearchAlert, sendPostExpired, sendRetentionEmail } from "./lib/email";

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

  // Batch-fetch emails for all expiring post owners in one query
  const reminderUserIds = [...new Set(expiringPosts.map((p) => p.userId))];
  const reminderEmailRows = reminderUserIds.length > 0
    ? await getDb()
        .select({ id: schema.users.id, email: schema.users.email })
        .from(schema.users)
        .where(inArray(schema.users.id, reminderUserIds))
    : [];
  const reminderEmailById = new Map(reminderEmailRows.map((u) => [u.id, u.email]));

  // Send reminders + mark reminderSent in parallel per post
  const results = await Promise.all(expiringPosts.map(async (post) => {
    const email = reminderEmailById.get(post.userId);
    if (!email) return false;
    try {
      await Promise.all([
        sendExpiryReminder(email, post.title, post.id),
        getDb().update(schema.posts).set({ reminderSent: true }).where(eq(schema.posts.id, post.id)),
      ]);
      return true;
    } catch (err) {
      console.error("[cron/reminders] failed to send for post", post.id, err);
      return false;
    }
  }));
  const sent = results.filter(Boolean).length;

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

  // Phase 1: find new posts for each search + update lastNotifiedAt in parallel
  const toAlert: Array<{ userId: number; label: string; posts: { id: number; title: string; city: string | null }[] }> = [];

  await Promise.all(searches.map(async (search) => {
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

    const [newPosts] = await Promise.all([
      getDb()
        .select({ id: schema.posts.id, title: schema.posts.title, city: schema.posts.city })
        .from(schema.posts)
        .where(and(...conditions))
        .limit(10),
      // Update lastNotifiedAt even if no posts — prevents hammering
      getDb()
        .update(schema.savedSearches)
        .set({ lastNotifiedAt: new Date() })
        .where(eq(schema.savedSearches.id, search.id)),
    ]);

    if (newPosts.length > 0) {
      toAlert.push({ userId: search.userId, label: search.label, posts: newPosts });
    }
  }));

  // Phase 2: batch-fetch emails for all users who need alerts
  let alertsSent = 0;
  if (toAlert.length > 0) {
    const alertUserIds = [...new Set(toAlert.map((a) => a.userId))];
    const alertEmailRows = await getDb()
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(inArray(schema.users.id, alertUserIds));
    const alertEmailById = new Map(alertEmailRows.map((u) => [u.id, u.email]));

    for (const alert of toAlert) {
      const email = alertEmailById.get(alert.userId);
      if (!email) continue;
      try {
        await sendSearchAlert(email, alert.label, alert.posts);
        alertsSent++;
      } catch (err) {
        console.error("[cron/search-alerts] failed to send for user", alert.userId, err);
      }
    }
  }

  return c.json({ ok: true, alertsSent, searchesChecked: searches.length });
});

// Expire active posts and notify owners — run hourly
cronRouter.get("/expire", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();

  // Find active posts that should be expired (join with users for email)
  const expiredPosts = await getDb()
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      userId: schema.posts.userId,
    })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "active"),
        lte(schema.posts.expiresAt, now)
      )
    );

  if (expiredPosts.length === 0) return c.json({ ok: true, expired: 0 });

  // Update by IDs — prevents double-email if two cron workers run simultaneously.
  // Only posts still in "active" status get updated; already-expired ones are skipped.
  const ids = expiredPosts.map((p) => p.id);
  const updateResult = await getDb()
    .update(schema.posts)
    .set({ status: "expired" })
    .where(
      and(
        inArray(schema.posts.id, ids),
        eq(schema.posts.status, "active")
      )
    );
  const actuallyExpired = (updateResult as unknown as [{ affectedRows: number }])[0].affectedRows;

  // If another cron worker transitioned all posts first, skip emails entirely to prevent duplicates.
  if (actuallyExpired === 0) return c.json({ ok: true, expired: 0, notified: 0 });

  // Batch-fetch all user emails in one query instead of N+1
  const userIds = [...new Set(expiredPosts.map((p) => p.userId))];
  const userEmailRows = await getDb()
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .where(inArray(schema.users.id, userIds));
  const emailById = new Map(userEmailRows.map((u) => [u.id, u.email]));

  let notified = 0;
  for (const post of expiredPosts) {
    const email = emailById.get(post.userId);
    if (!email) continue;
    try {
      await sendPostExpired(email, post.title, post.id);
      notified++;
    } catch (err) {
      console.error("[cron/expire] failed to notify for post", post.id, err);
    }
  }

  return c.json({ ok: true, expired: actuallyExpired, notified });
});

cronRouter.get("/backup", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const [users, posts, profiles] = await Promise.all([
      getDb().select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        createdAt: schema.users.createdAt,
      }).from(schema.users),
      getDb().select({
        id: schema.posts.id,
        title: schema.posts.title,
        type: schema.posts.type,
        status: schema.posts.status,
        category: schema.posts.category,
        city: schema.posts.city,
        userId: schema.posts.userId,
        wasFree: schema.posts.wasFree,
        createdAt: schema.posts.createdAt,
      }).from(schema.posts),
      getDb().select({
        userId: schema.profiles.userId,
        phone: schema.profiles.phone,
        phoneVerified: schema.profiles.phoneVerified,
        freePostsUsed: schema.profiles.freePostsUsed,
        freePostCredits: schema.profiles.freePostCredits,
      }).from(schema.profiles),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      counts: { users: users.length, posts: posts.length, profiles: profiles.length },
      users,
      posts,
      profiles,
    };

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return c.json({ error: "ADMIN_EMAIL env var not set" }, 500);

    await resend.emails.send({
      from: "jobsy.lv <noreply@jobsy.lv>",
      to: adminEmail,
      subject: `jobsy.lv daily backup — ${new Date().toISOString().split("T")[0]}`,
      html: `<p>Daily DB backup attached as JSON.</p><p>Users: ${users.length} | Posts: ${posts.length}</p>`,
      attachments: [{
        filename: `backup-${new Date().toISOString().split("T")[0]}.json`,
        content: Buffer.from(JSON.stringify(backup, null, 2)).toString("base64"),
      }],
    });

    return c.json({ ok: true, counts: backup.counts });
  } catch (err) {
    console.error("[backup] failed:", err);
    return c.json({ error: "Backup failed" }, 500);
  }
});

cronRouter.get("/weekly-report", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers,
    totalActivePosts,
    newPosts,
    filledPosts,
    paidPostsThisWeek,
    unresolvedReports,
    failedSocialPosts,
    utmBreakdown,
  ] = await Promise.all([
    getDb().select({ c: count() }).from(schema.users).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.users).where(gte(schema.users.createdAt, weekAgo)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(eq(schema.posts.status, "active")).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(gte(schema.posts.createdAt, weekAgo)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(and(eq(schema.posts.filled, true), gte(schema.posts.updatedAt, weekAgo))).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.posts).where(and(eq(schema.posts.wasFree, false), isNotNull(schema.posts.paidAt), gte(schema.posts.paidAt, weekAgo))).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.reports).where(eq(schema.reports.resolved, false)).then((r) => r[0]?.c ?? 0),
    getDb().select({ c: count() }).from(schema.socialQueue).where(eq(schema.socialQueue.status, "failed")).then((r) => r[0]?.c ?? 0),
    getDb()
      .select({ source: schema.users.utmSource, cnt: count() })
      .from(schema.users)
      .where(and(gte(schema.users.createdAt, weekAgo), isNotNull(schema.users.utmSource)))
      .groupBy(schema.users.utmSource)
      .then((rows) => rows.map((r) => ({ source: r.source ?? "unknown", count: r.cnt }))),
  ]);

  return c.json({
    period: { from: weekAgo.toISOString(), to: now.toISOString() },
    users: { total: totalUsers, newThisWeek: newUsers },
    posts: { active: totalActivePosts, newThisWeek: newPosts, filledThisWeek: filledPosts },
    revenue: { paidPostsThisWeek, estimatedEur: paidPostsThisWeek * 2 },
    moderation: { unresolvedReports },
    social: { failedPosts: failedSocialPosts },
    acquisition: utmBreakdown,
  });
});

cronRouter.get("/digest-data", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const topPosts = await getDb()
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      category: schema.posts.category,
      city: schema.posts.city,
      viewCount: schema.posts.viewCount,
      type: schema.posts.type,
    })
    .from(schema.posts)
    .where(eq(schema.posts.status, "active"))
    .orderBy(desc(schema.posts.viewCount))
    .limit(5);

  return c.json({ posts: topPosts, generatedAt: new Date().toISOString() });
});

cronRouter.get("/retention-email", async (c) => {
  const secret = c.req.header("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (!expected || !secret || secret !== expected) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const candidates = await getDb()
    .select({
      userId: schema.users.id,
      email: schema.users.email,
      city: schema.profiles.city,
      retentionEmailSentAt: schema.profiles.retentionEmailSentAt,
    })
    .from(schema.users)
    .leftJoin(schema.profiles, eq(schema.profiles.userId, schema.users.id))
    .where(
      and(
        lte(schema.users.createdAt, sevenDaysAgo),
        lte(schema.users.lastSignInAt, fourteenDaysAgo),
        eq(schema.users.role, "user"),
        or(
          isNull(schema.profiles.retentionEmailSentAt),
          lte(schema.profiles.retentionEmailSentAt, oneWeekAgo)
        )
      )
    )
    .limit(100);

  let sent = 0;
  for (const candidate of candidates) {
    if (!candidate.email || !candidate.city) continue;

    const recentPosts = await getDb()
      .select({
        id: schema.posts.id,
        title: schema.posts.title,
        city: schema.posts.city,
        category: schema.posts.category,
      })
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.status, "active"),
          eq(schema.posts.city, candidate.city)
        )
      )
      .orderBy(desc(schema.posts.createdAt))
      .limit(3);

    if (recentPosts.length === 0) continue;

    try {
      await sendRetentionEmail(candidate.email, recentPosts);
      await getDb()
        .update(schema.profiles)
        .set({ retentionEmailSentAt: now })
        .where(eq(schema.profiles.userId, candidate.userId));
      sent++;
    } catch (err) {
      console.error("[cron/retention-email] failed for user", candidate.userId, err);
    }
  }

  return c.json({ ok: true, sent, checked: candidates.length });
});
