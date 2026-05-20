import { relations } from "drizzle-orm";
import {
  users,
  companies,
  contacts,
  deals,
  dealActivities,
  projects,
  tasks,
  taskComments,
  integrations,
  aiConversations,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  ownedContacts: many(contacts),
  ownedDeals: many(deals),
  ownedProjects: many(projects),
  assignedTasks: many(tasks),
  activities: many(dealActivities),
  taskComments: many(taskComments),
  integrations: many(integrations),
  conversations: many(aiConversations),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  contacts: many(contacts),
  deals: many(deals),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
  activities: many(dealActivities),
}));

export const dealActivitiesRelations = relations(dealActivities, ({ one }) => ({
  deal: one(deals, { fields: [dealActivities.dealId], references: [deals.id] }),
  user: one(users, { fields: [dealActivities.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, { fields: [projects.ownerId], references: [users.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, { fields: [taskComments.taskId], references: [tasks.id] }),
  user: one(users, { fields: [taskComments.userId], references: [users.id] }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, { fields: [integrations.userId], references: [users.id] }),
}));

export const aiConversationsRelations = relations(aiConversations, ({ one }) => ({
  user: one(users, { fields: [aiConversations.userId], references: [users.id] }),
}));
