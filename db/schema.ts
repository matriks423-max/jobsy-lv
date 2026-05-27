import {
  mysqlTable,
  mysqlEnum,
  bigint,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).unique(),
  googleId: varchar("googleId", { length: 255 }).unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  resetToken: varchar("resetToken", { length: 64 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  authMethod: mysqlEnum("authMethod", ["kimi", "google", "email"]).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin", "banned"]).default("user").notNull(),
  plan: mysqlEnum("plan", ["free", "pro", "business"]).default("free").notNull(),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  planExpiresAt: timestamp("planExpiresAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: bigint("id", { mode: "number", unsigned: true }).primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .unique(),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  city: varchar("city", { length: 100 }),
  avatarUrl: text("avatarUrl"),
  phoneVerified: boolean("phoneVerified").default(false).notNull(),
  freePostsUsed: int("freePostsUsed", { unsigned: true }).default(0).notNull(),
  freePostCredits: int("freePostCredits", { unsigned: true }).default(0).notNull(),
  referralCode: varchar("referralCode", { length: 20 }).unique(),
  referredBy: bigint("referredBy", { mode: "number", unsigned: true }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  companyName: varchar("companyName", { length: 255 }),
  companyLogo: varchar("companyLogo", { length: 512 }),
  companyWebsite: varchar("companyWebsite", { length: 512 }),
  companyDescription: text("companyDescription"),
  monthlyPostCount: int("monthlyPostCount", { unsigned: true }).default(0).notNull(),
  monthlyPostReset: varchar("monthlyPostReset", { length: 10 }),
  freeBoostsRemaining: int("freeBoostsRemaining", { unsigned: true }).default(0).notNull(),
  creditBalance: int("creditBalance").default(0).notNull(),
  contactViewsThisMonth: int("contactViewsThisMonth", { unsigned: true }).default(0).notNull(),
  contactViewsResetAt: timestamp("contactViewsResetAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export const posts = mysqlTable("posts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  type: mysqlEnum("type", ["need", "offer"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(),
  city: varchar("city", { length: 100 }),
  region: varchar("region", { length: 100 }),
  budgetText: varchar("budgetText", { length: 100 }),
  whenText: varchar("whenText", { length: 100 }),
  language: mysqlEnum("language", ["lv", "ru", "en"]).default("lv").notNull(),
  status: mysqlEnum("status", [
    "pending_payment",
    "pending_review",
    "active",
    "closed",
    "expired",
    "rejected",
  ])
    .default("pending_payment")
    .notNull(),
  wasFree: boolean("wasFree").default(false).notNull(),
  stripeSessionId: varchar("stripeSessionId", { length: 255 }),
  stripePaymentId: varchar("stripePaymentId", { length: 255 }),
  paidAt: timestamp("paidAt"),
  expiresAt: timestamp("expiresAt"),
  viewCount: int("viewCount", { unsigned: true }).default(0).notNull(),
  contactCount: int("contactCount", { unsigned: true }).default(0).notNull(),
  filled: boolean("filled").default(false).notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  boostType: mysqlEnum("boostType", ["none", "bump", "featured", "urgent"]).default("none").notNull(),
  boostExpiresAt: timestamp("boostExpiresAt"),
  boostStripeSessionId: varchar("boostStripeSessionId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => [
  // Indexes for common query patterns
  index("idx_posts_status_created").on(table.status, table.createdAt),
  index("idx_posts_status_category").on(table.status, table.category),
  index("idx_posts_status_city").on(table.status, table.city),
  index("idx_posts_user").on(table.userId),
  index("idx_posts_expires").on(table.status, table.expiresAt),
]);

export const contacts = mysqlTable("contacts", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  fromUserId: bigint("fromUserId", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  // Unique constraint prevents duplicate contacts from race conditions + speeds up hasContacted()
  uniqueIndex("idx_contacts_post_user").on(table.postId, table.fromUserId),
]);

export const reports = mysqlTable("reports", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  reporterId: bigint("reporterId", { mode: "number", unsigned: true }).notNull(),
  reason: varchar("reason", { length: 50 }).notNull(),
  details: text("details"),
  resolved: boolean("resolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  // Admin panel filters unresolved reports; index speeds up that query
  index("idx_reports_resolved").on(table.resolved),
]);

export const referrals = mysqlTable("referrals", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  referrerId: bigint("referrerId", { mode: "number", unsigned: true }).notNull(),
  referredId: bigint("referredId", { mode: "number", unsigned: true }).notNull().unique(),
  postMade: boolean("postMade").default(false).notNull(),
  rewarded: boolean("rewarded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const interests = mysqlTable("interests", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  fromUserId: bigint("fromUserId", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_interests_post_user").on(table.postId, table.fromUserId),
]);

export const reviews = mysqlTable("reviews", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  reviewerId: bigint("reviewerId", { mode: "number", unsigned: true }).notNull(),
  revieweeId: bigint("revieweeId", { mode: "number", unsigned: true }).notNull(),
  stars: int("stars", { unsigned: true }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_reviews_post_reviewer_reviewee").on(table.postId, table.reviewerId, table.revieweeId),
  index("idx_reviews_reviewee").on(table.revieweeId),
]);

export const savedSearches = mysqlTable("savedSearches", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  label: varchar("label", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["need", "offer"]).default("need").notNull(),
  category: varchar("category", { length: 50 }),
  city: varchar("city", { length: 100 }),
  keyword: varchar("keyword", { length: 100 }),
  lastNotifiedAt: timestamp("lastNotifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_saved_searches_user").on(table.userId),
]);

export const postImages = mysqlTable("postImages", {
  id: int("id", { unsigned: true }).autoincrement().primaryKey(),
  postId: int("postId", { unsigned: true }).notNull(),
  url: text("url").notNull(),
  sortOrder: int("sortOrder", { unsigned: true }).default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_post_images_post").on(table.postId),
]);

export const socialQueue = mysqlTable("socialQueue", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  postId: bigint("postId", { mode: "number", unsigned: true }).notNull(),
  boostType: mysqlEnum("boostType", ["bump", "featured"]).notNull(),
  status: mysqlEnum("status", ["pending", "posted", "failed"]).default("pending").notNull(),
  scheduledAt: timestamp("scheduledAt").defaultNow().notNull(),
  postedAt: timestamp("postedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_social_queue_status").on(table.status),
]);

// Credit wallet — tracks every grant and spend for audit
export const creditTransactions = mysqlTable("creditTransactions", {
  id: bigint("id", { mode: "number", unsigned: true }).autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  // Positive = grant/refund, negative = spend. Stored in euro cents.
  amount: int("amount").notNull(),
  type: mysqlEnum("type", ["grant", "spend", "refund"]).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [
  index("idx_credit_tx_user").on(table.userId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
export type Interest = typeof interests.$inferSelect;
export type InsertInterest = typeof interests.$inferInsert;
export type PostImage = typeof postImages.$inferSelect;
export type InsertPostImage = typeof postImages.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;
export type SavedSearch = typeof savedSearches.$inferSelect;
export type InsertSavedSearch = typeof savedSearches.$inferInsert;
export type SocialQueue = typeof socialQueue.$inferSelect;
export type InsertSocialQueue = typeof socialQueue.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
