import { z } from "zod";
import { eq, and, desc, gte, or, like } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { createRouter, authedQuery } from "./middleware";

export const savedSearchesRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    return getDb()
      .select()
      .from(schema.savedSearches)
      .where(eq(schema.savedSearches.userId, ctx.user.id))
      .orderBy(desc(schema.savedSearches.createdAt));
  }),

  save: authedQuery
    .input(z.object({
      label: z.string().min(1).max(100),
      type: z.enum(["need", "offer"]),
      category: z.string().max(50).optional(),
      city: z.string().max(100).optional(),
      keyword: z.string().max(100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getDb()
        .select({ id: schema.savedSearches.id })
        .from(schema.savedSearches)
        .where(eq(schema.savedSearches.userId, ctx.user.id));

      if (existing.length >= 10) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 10 saved searches" });
      }

      await getDb().insert(schema.savedSearches).values({
        userId: ctx.user.id,
        label: input.label,
        type: input.type,
        category: input.category ?? null,
        city: input.city ?? null,
        keyword: input.keyword ?? null,
      });

      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await getDb()
        .delete(schema.savedSearches)
        .where(
          and(
            eq(schema.savedSearches.id, input.id),
            eq(schema.savedSearches.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
