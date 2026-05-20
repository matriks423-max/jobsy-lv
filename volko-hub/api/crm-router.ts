import { z } from "zod";
import { eq, like, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./lib/db";
import { contacts, companies, deals, dealActivities, DEAL_STAGES } from "../db/schema";

export const crmRouter = createRouter({
  // ── Companies ──────────────────────────────────────────────
  listCompanies: authedQuery
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      if (input?.search) {
        return db.select().from(companies).where(like(companies.name, `%${input.search}%`)).orderBy(desc(companies.createdAt));
      }
      return db.select().from(companies).orderBy(desc(companies.createdAt));
    }),

  createCompany: authedQuery
    .input(z.object({
      name: z.string().min(1),
      website: z.string().optional(),
      industry: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(companies).values({ ...input, createdBy: ctx.user.id });
      return { id: (r as { insertId: number }).insertId };
    }),

  updateCompany: authedQuery
    .input(z.object({ id: z.number(), name: z.string().optional(), website: z.string().optional(), industry: z.string().optional(), notes: z.string().optional() }))
    .mutation(async ({ input: { id, ...data } }) => {
      const db = getDb();
      await db.update(companies).set(data).where(eq(companies.id, id));
    }),

  deleteCompany: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(companies).where(eq(companies.id, input.id));
    }),

  // ── Contacts ───────────────────────────────────────────────
  listContacts: authedQuery
    .input(z.object({ search: z.string().optional(), companyId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.search) conditions.push(like(contacts.name, `%${input.search}%`));
      if (input?.companyId) conditions.push(eq(contacts.companyId, input.companyId));
      const query = db.select().from(contacts).orderBy(desc(contacts.createdAt));
      if (conditions.length) return query.where(and(...conditions));
      return query;
    }),

  getContact: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [c] = await db.select().from(contacts).where(eq(contacts.id, input.id)).limit(1);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      return c;
    }),

  createContact: authedQuery
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      companyId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(contacts).values({ ...input, ownerId: ctx.user.id });
      return { id: (r as { insertId: number }).insertId };
    }),

  updateContact: authedQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      companyId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input: { id, ...data } }) => {
      const db = getDb();
      await db.update(contacts).set(data).where(eq(contacts.id, id));
    }),

  deleteContact: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [c] = await db.select().from(contacts).where(eq(contacts.id, input.id)).limit(1);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      if (c.ownerId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await db.delete(contacts).where(eq(contacts.id, input.id));
    }),

  // ── Deals ──────────────────────────────────────────────────
  listDeals: authedQuery
    .input(z.object({
      stage: z.enum(DEAL_STAGES as [string, ...string[]]).optional(),
      contactId: z.number().optional(),
      companyId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.stage) conditions.push(eq(deals.stage, input.stage as typeof DEAL_STAGES[number]));
      if (input?.contactId) conditions.push(eq(deals.contactId, input.contactId));
      if (input?.companyId) conditions.push(eq(deals.companyId, input.companyId));
      const query = db.select().from(deals).orderBy(desc(deals.createdAt));
      if (conditions.length) return query.where(and(...conditions));
      return query;
    }),

  getDeal: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [d] = await db.select().from(deals).where(eq(deals.id, input.id)).limit(1);
      if (!d) throw new TRPCError({ code: "NOT_FOUND" });
      const activities = await db.select().from(dealActivities).where(eq(dealActivities.dealId, input.id)).orderBy(desc(dealActivities.createdAt));
      return { ...d, activities };
    }),

  createDeal: authedQuery
    .input(z.object({
      title: z.string().min(1),
      contactId: z.number().optional(),
      companyId: z.number().optional(),
      value: z.string().optional(),
      currency: z.string().default("EUR"),
      stage: z.enum(DEAL_STAGES as [string, ...string[]]).default("lead"),
      expectedClose: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(deals).values({
        ...input,
        stage: input.stage as typeof DEAL_STAGES[number],
        ownerId: ctx.user.id,
      });
      return { id: (r as { insertId: number }).insertId };
    }),

  updateDeal: authedQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      contactId: z.number().optional(),
      companyId: z.number().optional(),
      value: z.string().optional(),
      stage: z.enum(DEAL_STAGES as [string, ...string[]]).optional(),
      expectedClose: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input: { id, ...data } }) => {
      const db = getDb();
      await db.update(deals).set({
        ...data,
        stage: data.stage as typeof DEAL_STAGES[number] | undefined,
      }).where(eq(deals.id, id));
    }),

  deleteDeal: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(deals).where(eq(deals.id, input.id));
    }),

  // ── Activities ─────────────────────────────────────────────
  addActivity: authedQuery
    .input(z.object({
      dealId: z.number(),
      type: z.enum(["call", "email", "meeting", "note"]),
      description: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(dealActivities).values({ ...input, userId: ctx.user.id });
      return { id: (r as { insertId: number }).insertId };
    }),
});
