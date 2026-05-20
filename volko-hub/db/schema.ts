import {
  mysqlTable,
  mysqlEnum,
  bigint,
  int,
  varchar,
  text,
  timestamp,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ── Auth ──────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).default("member").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── CRM: Companies ────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 500 }),
  industry: varchar("industry", { length: 100 }),
  notes: text("notes"),
  createdBy: bigint("createdBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── CRM: Contacts ─────────────────────────────────────────────────
export const contacts = mysqlTable("contacts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── CRM: Deals ────────────────────────────────────────────────────
export const deals = mysqlTable("deals", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  contactId: bigint("contactId", { mode: "number", unsigned: true }),
  companyId: bigint("companyId", { mode: "number", unsigned: true }),
  value: decimal("value", { precision: 12, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("EUR"),
  stage: mysqlEnum("stage", ["lead", "qualified", "proposal", "negotiation", "won", "lost"])
    .default("lead")
    .notNull(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
  expectedClose: timestamp("expectedClose"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── CRM: Deal Activities ──────────────────────────────────────────
export const dealActivities = mysqlTable("deal_activities", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  dealId: bigint("dealId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["call", "email", "meeting", "note"]).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Projects ──────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["active", "on_hold", "completed", "archived"])
    .default("active")
    .notNull(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
  dueDate: timestamp("dueDate"),
  color: varchar("color", { length: 7 }).default("#6366f1"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Tasks ─────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["todo", "in_progress", "review", "done"])
    .default("todo")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"])
    .default("medium")
    .notNull(),
  assigneeId: bigint("assigneeId", { mode: "number", unsigned: true }),
  dueDate: timestamp("dueDate"),
  sortOrder: int("sortOrder", { unsigned: true }).default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Task Comments ─────────────────────────────────────────────────
export const taskComments = mysqlTable("task_comments", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  taskId: bigint("taskId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ── Integrations ──────────────────────────────────────────────────
export const integrations = mysqlTable("integrations", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  service: mysqlEnum("service", ["microsoft", "whatsapp"]).notNull(),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── AI Conversations ──────────────────────────────────────────────
export const aiConversations = mysqlTable("ai_conversations", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).default("Jauna saruna"),
  messages: json("messages").notNull().$default(() => []),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ── Types ─────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type InsertDeal = typeof deals.$inferInsert;
export type DealActivity = typeof dealActivities.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type TaskComment = typeof taskComments.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type AiConversation = typeof aiConversations.$inferSelect;

export type DealStage = Deal["stage"];
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];

export const DEAL_STAGES: DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  lead: "Potenciāls",
  qualified: "Kvalificēts",
  proposal: "Piedāvājums",
  negotiation: "Sarunas",
  won: "Uzvarēts",
  lost: "Zaudēts",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Darāms",
  in_progress: "Procesā",
  review: "Pārskatīšana",
  done: "Pabeigts",
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-slate-500",
  medium: "text-yellow-600",
  high: "text-orange-500",
  urgent: "text-red-600",
};
