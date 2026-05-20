import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./lib/db";
import { integrations } from "../db/schema";
import { env } from "./lib/env";

const MS_AUTH_URL = `https://login.microsoftonline.com/${env.microsoftTenantId}/oauth2/v2.0`;
const MS_SCOPES = "openid email profile Mail.Read Mail.Send Calendars.Read Files.Read.All offline_access";

export const integrationsRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select({
      id: integrations.id,
      service: integrations.service,
      expiresAt: integrations.expiresAt,
      metadata: integrations.metadata,
      createdAt: integrations.createdAt,
    }).from(integrations).where(eq(integrations.userId, ctx.user.id));
    return rows;
  }),

  getMicrosoftAuthUrl: authedQuery.query(({ ctx }) => {
    const params = new URLSearchParams({
      client_id: env.microsoftClientId,
      response_type: "code",
      redirect_uri: `${env.siteUrl}/api/oauth/microsoft/callback`,
      scope: MS_SCOPES,
      state: String(ctx.user.id),
    });
    return { url: `${MS_AUTH_URL}/authorize?${params}` };
  }),

  saveWhatsApp: authedQuery
    .input(z.object({ apiToken: z.string().min(1), phoneId: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [existing] = await db.select().from(integrations)
        .where(and(eq(integrations.userId, ctx.user.id), eq(integrations.service, "whatsapp")))
        .limit(1);

      if (existing) {
        await db.update(integrations).set({
          accessToken: input.apiToken,
          metadata: { phoneId: input.phoneId },
        }).where(eq(integrations.id, existing.id));
      } else {
        await db.insert(integrations).values({
          userId: ctx.user.id,
          service: "whatsapp",
          accessToken: input.apiToken,
          metadata: { phoneId: input.phoneId },
        });
      }
    }),

  disconnect: authedQuery
    .input(z.object({ service: z.enum(["microsoft", "whatsapp"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(integrations).where(
        and(eq(integrations.userId, ctx.user.id), eq(integrations.service, input.service))
      );
    }),

  // Get Outlook emails via Microsoft Graph
  getEmails: authedQuery
    .input(z.object({ limit: z.number().default(20) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [integration] = await db.select().from(integrations)
        .where(and(eq(integrations.userId, ctx.user.id), eq(integrations.service, "microsoft")))
        .limit(1);

      if (!integration?.accessToken) return { emails: [], connected: false };

      try {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages?$top=${input.limit}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead`,
          { headers: { Authorization: `Bearer ${integration.accessToken}` } }
        );
        if (!res.ok) return { emails: [], connected: false, error: "Token expired" };
        const data = await res.json() as { value: unknown[] };
        return { emails: data.value, connected: true };
      } catch {
        return { emails: [], connected: false };
      }
    }),

  // Search OneDrive files
  searchFiles: authedQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [integration] = await db.select().from(integrations)
        .where(and(eq(integrations.userId, ctx.user.id), eq(integrations.service, "microsoft")))
        .limit(1);

      if (!integration?.accessToken) return { files: [], connected: false };

      try {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(input.query)}')?$top=20`,
          { headers: { Authorization: `Bearer ${integration.accessToken}` } }
        );
        if (!res.ok) return { files: [], connected: false };
        const data = await res.json() as { value: unknown[] };
        return { files: data.value, connected: true };
      } catch {
        return { files: [], connected: false };
      }
    }),
});
