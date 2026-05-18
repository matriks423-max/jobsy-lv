import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getProfileByUserId, updateProfile } from "./queries/profiles";

export const profileRouter = createRouter({
  me: authedQuery.query(async ({ ctx }: { ctx: { user: { id: number } } }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    return {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? null,
      avatarUrl: profile.avatarUrl ?? null,
    };
  }),

  update: authedQuery
    .input(z.object({
      phone: z.string().max(50).optional(),
      name: z.string().min(1).max(100).optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { phone?: string; name?: string } }) => {
      await updateProfile(ctx.user.id, {
        ...(input.phone !== undefined ? { phone: input.phone || null } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
      });
      return { success: true };
    }),
});
