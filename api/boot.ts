import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { setCookie } from "hono/cookie";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { createCheckoutSession, handleStripeWebhook } from "./stripe";
import { handleGoogleCallback } from "./email-auth";
import { cronRouter } from "./cron-router";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq } from "drizzle-orm";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { initSentryServer, captureException } from "./lib/sentry";

initSentryServer();

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// www → canonical redirect (prevents duplicate-content SEO penalty)
app.use("*", async (c, next) => {
  const host = c.req.header("host") ?? "";
  if (host.startsWith("www.")) {
    const url = new URL(c.req.url);
    url.hostname = host.replace(/^www\./, "");
    return c.redirect(url.toString(), 301);
  }
  return next();
});

// Security headers
app.use("*", async (c, next) => {
  const host = c.req.header("host") ?? "";
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // Only apply HSTS on the custom domain (not localhost/Railway dev URLs)
  if (host === "jobsy.lv" || host === "www.jobsy.lv") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

// Health check
app.get("/health", async (c) => {
  const dbPromise = getDb()
    .select()
    .from(schema.users)
    .limit(1)
    .then(() => "connected")
    .catch(() => "disconnected");
  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve("timeout"), 10000)
  );
  const db = await Promise.race([dbPromise, timeout]);
  return c.json({ status: "ok", db, timestamp: new Date().toISOString() });
});

// Kimi OAuth callback (kept as fallback)
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// Google OAuth callback
app.get("/api/oauth/google/callback", async (c) => {
  try {
    const code = c.req.query("code");
    const stateRaw = c.req.query("state") ?? "";
    const error = c.req.query("error");

    if (error || !code) {
      return c.redirect("/login?error=google_denied", 302);
    }

    // Decode optional referral code from state
    let referralCode: string | null = null;
    try {
      const stateObj = JSON.parse(atob(stateRaw));
      referralCode = stateObj?.ref ?? null;
    } catch {
      // State may be the old plain-redirectUri format — ignore
    }

    const redirectUri = `${env.siteUrl}/api/oauth/google/callback`;
    const { token, user } = await handleGoogleCallback(code, redirectUri);

    // Apply referral if provided (safe to call on existing users — referrals.referredId is unique)
    if (referralCode && user?.id) {
      const { getReferralByReferredId } = await import("./queries/referrals");
      const existing = await getReferralByReferredId(user.id);
      if (!existing) {
        const referrerRows = await getDb()
          .select({ userId: schema.profiles.userId })
          .from(schema.profiles)
          .where(eq(schema.profiles.referralCode, referralCode.toUpperCase()))
          .limit(1);
        if (referrerRows.length && referrerRows[0].userId !== user.id) {
          await getDb().insert(schema.referrals).values({
            referrerId: referrerRows[0].userId,
            referredId: user.id,
          } as any).catch(() => {}); // ignore duplicate key on race
          await getDb()
            .update(schema.profiles)
            .set({ referredBy: referrerRows[0].userId })
            .where(eq(schema.profiles.userId, user.id));
        }
      }
    }

    const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
    setCookie(c, "jobsy_session", token, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.redirect("/", 302);
  } catch (err: unknown) {
    console.error("[Google OAuth] Callback failed", err);
    return c.redirect("/login?error=google_failed", 302);
  }
});

// Stripe Checkout
app.post("/api/checkout", async (c) => {
  try {
    const { authenticateRequest } = await import("./kimi/auth");
    let user;
    try {
      user = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if ((user as { role?: string }).role === "banned") {
      return c.json({ error: "Account suspended" }, 403);
    }
    const body = await c.req.json();
    const { postId } = body;
    const result = await createCheckoutSession(Number(postId), user.id);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return c.json({ error: message }, 500);
  }
});

// Stripe Webhook
app.post("/api/webhook", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header("stripe-signature") ?? "";
    const result = await handleStripeWebhook(body, signature);
    return c.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error("[Stripe Webhook Error]", message);
    return c.json({ error: message }, 400);
  }
});

// In-memory upload rate limiter: max 10 uploads per 5-minute window per user
const uploadRateMap = new Map<number, { count: number; windowStart: number }>();
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_WINDOW_MS = 5 * 60 * 1000;

// Image upload — HARDENED
app.post("/api/upload", async (c) => {
  try {
    // Auth check — only authenticated users may upload
    const { authenticateRequest } = await import("./kimi/auth");
    let uploadUser: { id: number };
    try {
      uploadUser = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Rate limit: max 10 uploads per 5 minutes per user
    const now = Date.now();
    const rateEntry = uploadRateMap.get(uploadUser.id);
    if (rateEntry && now - rateEntry.windowStart < UPLOAD_RATE_WINDOW_MS) {
      if (rateEntry.count >= UPLOAD_RATE_LIMIT) {
        return c.json({ error: "Too many uploads. Try again later." }, 429);
      }
      uploadRateMap.set(uploadUser.id, { count: rateEntry.count + 1, windowStart: rateEntry.windowStart });
    } else {
      uploadRateMap.set(uploadUser.id, { count: 1, windowStart: now });
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const postId = formData.get("postId") as string | null;

    if (!file || !postId) {
      return c.json({ error: "Missing file or postId" }, 400);
    }

    // === FILE SIZE CHECK ===
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return c.json({ error: "File too large. Max 5MB." }, 413);
    }

    // === FILE TYPE WHITELIST ===
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only JPEG, PNG, GIF, WebP images allowed" }, 400);
    }

    // === EXTENSION VALIDATION ===
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowedExts = ["jpg", "jpeg", "png", "gif", "webp"];
    if (!ext || !allowedExts.includes(ext)) {
      return c.json({ error: "Invalid file extension" }, 400);
    }

    // === FILENAME SANITIZATION ===
    const safeExt = ext;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const filename = `${timestamp}_${random}.${safeExt}`;

    const uploadsDir = path.join(process.cwd(), "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filepath = path.join(uploadsDir, filename);

    // Check for path traversal
    if (!filepath.startsWith(uploadsDir)) {
      return c.json({ error: "Invalid path" }, 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // === MAGIC BYTES CHECK (basic) ===
    const magic = buffer.slice(0, 4).toString("hex");
    const validMagic = [
      "ffd8ff",     // JPEG
      "89504e47",   // PNG
      "47494638",   // GIF
      "52494646",   // WebP (RIFF)
    ];
    if (!validMagic.some((m) => magic.startsWith(m))) {
      return c.json({ error: "Invalid image format" }, 400);
    }

    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;

    // Only insert into postImages if we have a real post ID (not 0 = new post not yet created)
    const realPostId = Number(postId);
    if (realPostId > 0) {
      await getDb().insert(schema.postImages).values({
        postId: realPostId,
        url,
        sortOrder: 0,
      });
    }

    return c.json({ url, success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return c.json({ error: message }, 500);
  }
});

// Serve uploaded files
app.get("/uploads/*", async (c) => {
  const filepath = c.req.path;
  const uploadsBase = path.join(process.cwd(), "uploads");
  const filePathOnDisk = path.resolve(process.cwd(), filepath.replace(/^\//, ""));
  // Guard against path traversal
  if (!filePathOnDisk.startsWith(uploadsBase + path.sep) && !filePathOnDisk.startsWith(uploadsBase + "/")) {
    return c.json({ error: "Forbidden" }, 403);
  }
  try {
    const data = await readFile(filePathOnDisk);
    const ext = path.extname(filePathOnDisk).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".gif"
        ? "image/gif"
        : ext === ".webp"
        ? "image/webp"
        : "application/octet-stream";
    return new Response(data, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000" },
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

/** Escape HTML special chars to prevent XSS in server-rendered meta tags */
function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// SEO: bot prerender for /post/:id — serves OG meta tags to social crawlers
const BOT_UA = /facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegrambot|googlebot|bingbot|discordbot|embedly/i;

app.get("/post/:id", async (c, next) => {
  const ua = c.req.header("user-agent") ?? "";
  if (!BOT_UA.test(ua)) return next();

  const postId = Number(c.req.param("id"));
  if (isNaN(postId)) return next();

  try {
    const { getPostWithProfile } = await import("./queries/posts");
    const result = await getPostWithProfile(postId);
    if (!result) return next();

    const { post, profile } = result;
    const rawTitle = `${post.title} — jobsy.lv`;
    const rawDesc = post.description?.substring(0, 160) ?? "Atrodi palīdzību vai piedāvā darbus Latvijā.";
    const title = escHtml(rawTitle);
    const desc = escHtml(rawDesc);
    const url = `https://jobsy.lv/post/${postId}`;
    const image = `https://jobsy.lv/og-image.png`;
    const authorName = escHtml(profile?.name ?? "Anonīms");

    const html = `<!DOCTYPE html>
<html lang="lv">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta name="description" content="${desc}"/>
<meta property="og:type" content="article"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${image}"/>
<meta property="og:locale" content="lv_LV"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${desc}"/>
<meta name="twitter:image" content="${image}"/>
<link rel="canonical" href="${url}"/>
<script>window.location.replace("${url}")</script>
</head>
<body><p>${title}</p><p>${desc}</p><p>Autors: ${authorName}</p></body>
</html>`;
    return c.html(html, 200);
  } catch {
    return next();
  }
});

// SEO: bot prerender for /kategorija/:slug — serves meta description to crawlers
const CATEGORY_SEO: Record<string, { heading: string; desc: string }> = {
  household: { heading: "Mājsaimniecības darbi Latvijā", desc: "Atrodi palīgus mājsaimniecībai — tīrīšanai, mazgāšanai, veļai un citiem ikdienas darbiem visā Latvijā." },
  moving:    { heading: "Pārvākšanās palīdzība Latvijā", desc: "Pieejami pārvākšanās pakalpojumi Rīgā un visā Latvijā. Kraušanas, transporta un iesaiņošanas palīgi." },
  repairs:   { heading: "Remontdarbi Latvijā", desc: "Atrodi remontdarbiniekus elektriskiem, santehnikas, apdares un citiem remontdarbiem Latvijā." },
  garden:    { heading: "Dārza darbi Latvijā", desc: "Dārznieki, zāles pļāvēji un dārza palīgi visā Latvijā. Atrodi palīgu savam dārzam." },
  auto:      { heading: "Auto pakalpojumi Latvijā", desc: "Auto remonta, mazgāšanas un citi automobiļu pakalpojumi Rīgā un visā Latvijā." },
  childcare: { heading: "Bērnu pieskatīšana Latvijā", desc: "Aukles un bērnu pieskatīšanas pakalpojumi visā Latvijā. Uzticami palīgi ģimenēm." },
  pets:      { heading: "Mājdzīvnieku kopšana Latvijā", desc: "Mājdzīvnieku pieskatīšana, pastaiga un kopšana Rīgā un visā Latvijā." },
  it:        { heading: "IT pakalpojumi Latvijā", desc: "Datorspeciālisti, web izstrādātāji un IT atbalsts privātpersonām un uzņēmumiem Latvijā." },
  tutoring:  { heading: "Repetīcijas un apmācība Latvijā", desc: "Repetitori mācību priekšmetos, valodās un citās jomās bērniem un pieaugušajiem Latvijā." },
  other:     { heading: "Citi pakalpojumi Latvijā", desc: "Dažādi palīdzības un pakalpojumu sludinājumi, kas neietilpst citās kategorijās." },
};

app.get("/kategorija/:slug", async (c, next) => {
  const ua = c.req.header("user-agent") ?? "";
  if (!BOT_UA.test(ua)) return next();

  const slug = c.req.param("slug");
  const seo = CATEGORY_SEO[slug];
  if (!seo) return next();

  const url = `https://jobsy.lv/kategorija/${slug}`;
  const title = `${seo.heading} — jobsy.lv`;
  const html = `<!DOCTYPE html>
<html lang="lv">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<meta name="description" content="${seo.desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${seo.desc}"/>
<meta property="og:image" content="https://jobsy.lv/og-image.png"/>
<meta property="og:locale" content="lv_LV"/>
<link rel="canonical" href="${url}"/>
<script>window.location.replace("${url}")</script>
</head>
<body><h1>${title}</h1><p>${seo.desc}</p></body>
</html>`;
  return c.html(html, 200);
});

// SEO: robots.txt
app.get("/robots.txt", (c) => {
  const content = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /my-posts",
    "Disallow: /settings",
    "Disallow: /create",
    "Disallow: /edit/",
    "Disallow: /payment",
    "Disallow: /success",
    "Disallow: /uploads/",
    "Disallow: /admin",
    "",
    "Sitemap: https://jobsy.lv/sitemap.xml",
    "Feed: https://jobsy.lv/feed.xml",
  ].join("\n");
  return c.text(content, 200, { "Content-Type": "text/plain; charset=utf-8" });
});

// SEO: sitemap.xml — static pages + category landing pages
app.get("/sitemap.xml", async (c) => {
  const base = "https://jobsy.lv";
  const now = new Date().toISOString().split("T")[0];
  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/browse", priority: "0.9", changefreq: "hourly" },
    { loc: "/login", priority: "0.3", changefreq: "monthly" },
    { loc: "/privacy", priority: "0.2", changefreq: "monthly" },
    { loc: "/terms", priority: "0.2", changefreq: "monthly" },
  ];
  const categories = [
    "household", "moving", "repairs", "garden", "auto",
    "childcare", "pets", "it", "tutoring", "other",
  ];
  const catPages = categories.map((slug) => ({
    loc: `/kategorija/${slug}`,
    priority: "0.8",
    changefreq: "daily",
  }));

  // Include active posts in sitemap
  let postPages: { loc: string; priority: string; changefreq: string; lastmod: string }[] = [];
  try {
    const { listPosts } = await import("./queries/posts");
    const activePosts = await listPosts({ status: "active", limit: 500 });
    postPages = activePosts.map((p) => ({
      loc: `/post/${p.id}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: p.updatedAt.toISOString().split("T")[0],
    }));
  } catch { /* ignore — sitemap still works without posts */ }

  const allPages = [
    ...staticPages.map((p) => ({ ...p, lastmod: now })),
    ...catPages.map((p) => ({ ...p, lastmod: now })),
    ...postPages,
  ];
  const urls = allPages.map((p) => `
  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`;
  return c.text(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

// RSS feed — latest active posts
app.get("/feed.xml", async (c) => {
  const base = "https://jobsy.lv";
  const now = new Date().toUTCString();

  let items = "";
  try {
    const { listPosts } = await import("./queries/posts");
    const posts = await listPosts({ status: "active", limit: 50, sort: "newest" });
    items = posts.map((p) => {
      const title = escHtml(p.title);
      const link = `${base}/post/${p.id}`;
      const desc = escHtml((p.description ?? "").substring(0, 200));
      const pubDate = new Date(p.createdAt).toUTCString();
      return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${desc}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    }).join("");
  } catch { /* ignore — return empty feed */ }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>jobsy.lv — Jaunākie sludinājumi</title>
    <link>${base}</link>
    <description>Jaunākie palīdzības un pakalpojumu sludinājumi Latvijā</description>
    <language>lv</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
  return c.text(xml, 200, { "Content-Type": "application/rss+xml; charset=utf-8" });
});

// Apple Pay domain verification
app.get("/.well-known/apple-developer-merchantid-domain-association", async (c) => {
  const { readFileSync } = await import("fs");
  const { join } = await import("path");
  try {
    const file = readFileSync(join(process.cwd(), "public", "apple-developer-merchantid-domain-association"));
    return new Response(file, { headers: { "Content-Type": "application/octet-stream" } });
  } catch {
    return c.text("Not found", 404);
  }
});

// Cron jobs
app.route("/api/cron", cronRouter);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Global error handler — catches unhandled exceptions and reports to Sentry
app.onError((err, c) => {
  captureException(err, { path: c.req.path, method: c.req.method });
  return c.json({ error: "Internal server error" }, 500);
});

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
