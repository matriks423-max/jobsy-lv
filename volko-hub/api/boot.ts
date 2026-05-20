import { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./lib/db";
import { integrations } from "../db/schema";
import { eq, and } from "drizzle-orm";

const app = new Hono<{ Bindings: HttpBindings }>();

// Health check
app.get("/health", async (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Microsoft OAuth callback
app.get("/api/oauth/microsoft/callback", async (c) => {
  const code = c.req.query("code");
  const stateUserId = c.req.query("state");

  if (!code || !stateUserId) return c.redirect("/integrations?error=oauth_denied", 302);

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.microsoftClientId,
          client_secret: env.microsoftClientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: `${env.siteUrl}/api/oauth/microsoft/callback`,
        }),
      }
    );

    const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number };
    if (!tokens.access_token) throw new Error("No access token");

    const db = getDb();
    const userId = parseInt(stateUserId);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get user info from Microsoft
    const meRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = await meRes.json() as { mail?: string; userPrincipalName?: string; displayName?: string };

    const [existing] = await db.select().from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.service, "microsoft"))).limit(1);

    if (existing) {
      await db.update(integrations).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        metadata: { email: me.mail ?? me.userPrincipalName, name: me.displayName },
      }).where(eq(integrations.id, existing.id));
    } else {
      await db.insert(integrations).values({
        userId,
        service: "microsoft",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        metadata: { email: me.mail ?? me.userPrincipalName, name: me.displayName },
      });
    }

    return c.redirect("/integrations?success=microsoft", 302);
  } catch (err) {
    console.error("[Microsoft OAuth]", err);
    return c.redirect("/integrations?error=oauth_failed", 302);
  }
});

// tRPC handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");

  // Serve static files in production
  const { readFile, stat } = await import("fs/promises");
  const { existsSync } = await import("fs");
  const path = await import("path");
  const distDir = path.join(process.cwd(), "dist/public");

  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    const filePath = path.join(distDir, url.pathname);
    if (existsSync(filePath)) {
      const stats = await stat(filePath);
      if (stats.isFile()) {
        const data = await readFile(filePath);
        return new Response(data);
      }
    }
    const index = await readFile(path.join(distDir, "index.html"));
    return new Response(index, { headers: { "Content-Type": "text/html" } });
  });

  const port = env.port;
  serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 Volko Hub running on http://localhost:${port}/`);
  });
}
