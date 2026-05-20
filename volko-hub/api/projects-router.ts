import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./lib/db";
import { projects, tasks, taskComments } from "../db/schema";

export const projectsRouter = createRouter({
  // ── Projects ───────────────────────────────────────────────
  list: authedQuery.query(async () => {
    const db = getDb();
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }),

  get: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [p] = await db.select().from(projects).where(eq(projects.id, input.id)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND" });
      const projectTasks = await db.select().from(tasks).where(eq(tasks.projectId, input.id)).orderBy(tasks.sortOrder);
      return { ...p, tasks: projectTasks };
    }),

  create: authedQuery
    .input(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      dueDate: z.date().optional(),
      color: z.string().default("#6366f1"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(projects).values({ ...input, ownerId: ctx.user.id });
      return { id: (r as { insertId: number }).insertId };
    }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
      dueDate: z.date().optional(),
      color: z.string().optional(),
    }))
    .mutation(async ({ input: { id, ...data } }) => {
      const db = getDb();
      await db.update(projects).set(data).where(eq(projects.id, id));
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(tasks).where(eq(tasks.projectId, input.id));
      await db.delete(projects).where(eq(projects.id, input.id));
    }),

  // ── Tasks ──────────────────────────────────────────────────
  listTasks: authedQuery
    .input(z.object({
      projectId: z.number().optional(),
      assigneeId: z.number().optional(),
      status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.projectId) conditions.push(eq(tasks.projectId, input.projectId));
      if (input?.assigneeId) conditions.push(eq(tasks.assigneeId, input.assigneeId));
      if (input?.status) conditions.push(eq(tasks.status, input.status));
      const query = db.select().from(tasks).orderBy(tasks.sortOrder, desc(tasks.createdAt));
      if (conditions.length) return query.where(and(...conditions));
      return query;
    }),

  getTask: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [task] = await db.select().from(tasks).where(eq(tasks.id, input.id)).limit(1);
      if (!task) throw new TRPCError({ code: "NOT_FOUND" });
      const comments = await db.select().from(taskComments).where(eq(taskComments.taskId, input.id)).orderBy(taskComments.createdAt);
      return { ...task, comments };
    }),

  createTask: authedQuery
    .input(z.object({
      projectId: z.number(),
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      assigneeId: z.number().optional(),
      dueDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [r] = await db.insert(tasks).values({ ...input, status: "todo" });
      return { id: (r as { insertId: number }).insertId };
    }),

  updateTask: authedQuery
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["todo", "in_progress", "review", "done"]).optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      assigneeId: z.number().optional(),
      dueDate: z.date().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input: { id, ...data } }) => {
      const db = getDb();
      await db.update(tasks).set(data).where(eq(tasks.id, id));
    }),

  deleteTask: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(taskComments).where(eq(taskComments.taskId, input.id));
      await db.delete(tasks).where(eq(tasks.id, input.id));
    }),

  addComment: authedQuery
    .input(z.object({ taskId: z.number(), content: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [r] = await db.insert(taskComments).values({ ...input, userId: ctx.user.id });
      return { id: (r as { insertId: number }).insertId };
    }),
});
