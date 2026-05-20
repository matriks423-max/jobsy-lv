import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { eq, desc, and } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./lib/db";
import { aiConversations, contacts, deals, projects, tasks, integrations, DEAL_STAGES } from "../db/schema";
import { env } from "./lib/env";

const anthropic = new Anthropic({ apiKey: env.anthropicApiKey });

const SYSTEM_PROMPT = `Tu esi Volkoengineering iekšējais biznesa asistents. Tev ir piekļuve CRM datiem (kontakti, darījumi), projektiem un uzdevumiem.

Atbildi latviski. Esi precīzs un kodolīgs. Izmanto tools lai iegūtu aktuālos datus pirms atbildes.

Pieejamie tools:
- list_contacts: saraksts ar CRM kontaktiem
- list_deals: darījumu pipeline
- get_deal: konkrēts darījums ar aktivitātēm
- list_projects: projekti
- list_tasks: uzdevumi (var filtrēt pēc projekta/izpildītāja/statusa)
- create_task: izveidot uzdevumu
- update_deal_stage: mainīt darījuma posmu
- get_emails: Outlook e-pasti (ja Microsoft savienots)
- search_files: meklēt OneDrive (ja Microsoft savienots)`;

const tools: Anthropic.Tool[] = [
  {
    name: "list_contacts",
    description: "Iegūt kontaktus no CRM. Var meklēt pēc vārda.",
    input_schema: { type: "object", properties: { search: { type: "string", description: "Meklēšanas vārds (neobligāts)" } } },
  },
  {
    name: "list_deals",
    description: "Iegūt darījumus no pipeline.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", enum: [...DEAL_STAGES], description: "Filtrēt pēc posma (neobligāts)" },
      },
    },
  },
  {
    name: "get_deal",
    description: "Iegūt darījuma detaļas un aktivitāšu žurnālu.",
    input_schema: { type: "object", required: ["id"], properties: { id: { type: "number" } } },
  },
  {
    name: "list_projects",
    description: "Saraksts ar visiem projektiem.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description: "Uzdevumu saraksts ar filtrēšanu.",
    input_schema: {
      type: "object",
      properties: {
        projectId: { type: "number", description: "Filtrēt pēc projekta ID" },
        status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
        assigneeId: { type: "number", description: "Filtrēt pēc izpildītāja ID" },
      },
    },
  },
  {
    name: "create_task",
    description: "Izveidot jaunu uzdevumu.",
    input_schema: {
      type: "object",
      required: ["projectId", "title"],
      properties: {
        projectId: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        assigneeId: { type: "number" },
      },
    },
  },
  {
    name: "update_deal_stage",
    description: "Mainīt darījuma posmu pipeline.",
    input_schema: {
      type: "object",
      required: ["id", "stage"],
      properties: {
        id: { type: "number" },
        stage: { type: "string", enum: [...DEAL_STAGES] },
      },
    },
  },
  {
    name: "get_emails",
    description: "Iegūt jaunākos Outlook e-pastus (ja Microsoft integrācija aktīva).",
    input_schema: { type: "object", properties: { limit: { type: "number", default: 10 } } },
  },
  {
    name: "search_files",
    description: "Meklēt failus OneDrive (ja Microsoft integrācija aktīva).",
    input_schema: { type: "object", required: ["query"], properties: { query: { type: "string" } } },
  },
];

async function executeTool(name: string, input: Record<string, unknown>, userId: number): Promise<unknown> {
  const db = getDb();

  switch (name) {
    case "list_contacts": {
      const { search } = input as { search?: string };
      if (search) {
        const { like } = await import("drizzle-orm");
        return db.select().from(contacts).where(like(contacts.name, `%${search}%`)).limit(20);
      }
      return db.select().from(contacts).orderBy(desc(contacts.createdAt)).limit(20);
    }

    case "list_deals": {
      const { stage } = input as { stage?: string };
      if (stage) {
        return db.select().from(deals).where(eq(deals.stage, stage as typeof DEAL_STAGES[number])).orderBy(desc(deals.createdAt)).limit(20);
      }
      return db.select().from(deals).orderBy(desc(deals.createdAt)).limit(20);
    }

    case "get_deal": {
      const { id } = input as { id: number };
      const { dealActivities } = await import("../db/schema");
      const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
      const acts = await db.select().from(dealActivities).where(eq(dealActivities.dealId, id)).orderBy(desc(dealActivities.createdAt));
      return { ...deal, activities: acts };
    }

    case "list_projects":
      return db.select().from(projects).orderBy(desc(projects.createdAt)).limit(20);

    case "list_tasks": {
      const { projectId, status, assigneeId } = input as { projectId?: number; status?: string; assigneeId?: number };
      const conditions = [];
      if (projectId) conditions.push(eq(tasks.projectId, projectId));
      if (status) conditions.push(eq(tasks.status, status as "todo" | "in_progress" | "review" | "done"));
      if (assigneeId) conditions.push(eq(tasks.assigneeId, assigneeId));
      if (conditions.length) return db.select().from(tasks).where(and(...conditions)).orderBy(tasks.sortOrder).limit(50);
      return db.select().from(tasks).orderBy(desc(tasks.createdAt)).limit(50);
    }

    case "create_task": {
      const { projectId, title, description, priority, assigneeId } = input as {
        projectId: number; title: string; description?: string; priority?: "low" | "medium" | "high" | "urgent"; assigneeId?: number;
      };
      const [r] = await db.insert(tasks).values({ projectId, title, description, priority: priority ?? "medium", assigneeId, status: "todo" });
      return { success: true, id: (r as { insertId: number }).insertId, message: `Uzdevums "${title}" izveidots.` };
    }

    case "update_deal_stage": {
      const { id, stage } = input as { id: number; stage: typeof DEAL_STAGES[number] };
      await db.update(deals).set({ stage }).where(eq(deals.id, id));
      return { success: true, message: `Darījums pārvietots uz "${stage}".` };
    }

    case "get_emails": {
      const { limit = 10 } = input as { limit?: number };
      const [integration] = await db.select().from(integrations)
        .where(and(eq(integrations.userId, userId), eq(integrations.service, "microsoft"))).limit(1);
      if (!integration?.accessToken) return { error: "Microsoft nav savienots" };
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages?$top=${limit}&$select=id,subject,from,receivedDateTime,bodyPreview,isRead`,
        { headers: { Authorization: `Bearer ${integration.accessToken}` } }
      );
      if (!res.ok) return { error: "Token beidzies, lūdzu savienojiet Microsoft no jauna" };
      const data = await res.json() as { value: unknown[] };
      return data.value;
    }

    case "search_files": {
      const { query } = input as { query: string };
      const [integration] = await db.select().from(integrations)
        .where(and(eq(integrations.userId, userId), eq(integrations.service, "microsoft"))).limit(1);
      if (!integration?.accessToken) return { error: "Microsoft nav savienots" };
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=15`,
        { headers: { Authorization: `Bearer ${integration.accessToken}` } }
      );
      if (!res.ok) return { error: "Neizdevās meklēt failus" };
      const data = await res.json() as { value: unknown[] };
      return data.value;
    }

    default:
      return { error: `Nezināms tools: ${name}` };
  }
}

export const claudeRouter = createRouter({
  listConversations: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db.select({
      id: aiConversations.id,
      title: aiConversations.title,
      createdAt: aiConversations.createdAt,
      updatedAt: aiConversations.updatedAt,
    }).from(aiConversations).where(eq(aiConversations.userId, ctx.user.id)).orderBy(desc(aiConversations.updatedAt)).limit(50);
  }),

  getConversation: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [conv] = await db.select().from(aiConversations)
        .where(and(eq(aiConversations.id, input.id), eq(aiConversations.userId, ctx.user.id))).limit(1);
      return conv ?? null;
    }),

  createConversation: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const [r] = await db.insert(aiConversations).values({ userId: ctx.user.id, messages: [] });
    return { id: (r as { insertId: number }).insertId };
  }),

  deleteConversation: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.delete(aiConversations).where(and(eq(aiConversations.id, input.id), eq(aiConversations.userId, ctx.user.id)));
    }),

  chat: authedQuery
    .input(z.object({
      conversationId: z.number(),
      message: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [conv] = await db.select().from(aiConversations)
        .where(and(eq(aiConversations.id, input.conversationId), eq(aiConversations.userId, ctx.user.id))).limit(1);
      if (!conv) throw new Error("Saruna nav atrasta");

      type StoredMessage = { role: "user" | "assistant"; content: string };
      const history: StoredMessage[] = Array.isArray(conv.messages) ? (conv.messages as StoredMessage[]) : [];

      const newUserMsg: StoredMessage = { role: "user", content: input.message };
      const updatedHistory = [...history, newUserMsg];

      // Convert to Anthropic messages format
      const apiMessages: Anthropic.MessageParam[] = updatedHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let assistantText = "";
      const toolCallRecords: Array<{ tool: string; input: Record<string, unknown>; output: unknown }> = [];

      // Agentic loop with tool use
      let loopMessages = [...apiMessages];
      for (let i = 0; i < 5; i++) {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2048,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
          ],
          tools,
          messages: loopMessages,
        });

        if (response.stop_reason === "tool_use") {
          const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const block of toolUseBlocks) {
            const output = await executeTool(block.name, block.input as Record<string, unknown>, ctx.user.id);
            toolCallRecords.push({ tool: block.name, input: block.input as Record<string, unknown>, output });
            toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
          }

          loopMessages = [
            ...loopMessages,
            { role: "assistant", content: response.content },
            { role: "user", content: toolResults },
          ];
          continue;
        }

        // End of loop — extract text
        for (const block of response.content) {
          if (block.type === "text") assistantText += block.text;
        }
        break;
      }

      const newAssistantMsg: StoredMessage = { role: "assistant", content: assistantText };
      const finalHistory = [...updatedHistory, newAssistantMsg];

      // Update title from first message
      const isFirst = history.length === 0;
      const title = isFirst ? input.message.slice(0, 60) : conv.title;

      await db.update(aiConversations).set({
        messages: finalHistory,
        title,
      }).where(eq(aiConversations.id, input.conversationId));

      return { reply: assistantText, toolCalls: toolCallRecords };
    }),
});
