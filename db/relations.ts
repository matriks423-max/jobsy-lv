import { relations } from "drizzle-orm";
import { users, profiles, posts, contacts, reports } from "./schema";

export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ many }) => ({
  contacts: many(contacts),
  reports: many(reports),
}));
