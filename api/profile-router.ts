import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getProfileByUserId, updateProfile } from "./queries/profiles";
import { generateOtp, storeOtp, validateOtp, sendSms } from "./lib/sms";

export const profileRouter = createRouter({
  me: authedQuery.query(async ({ ctx }: { ctx: { user: { id: number } } }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    return {
      name: profile.name,
      email: profile.email,
      phone: profile.phone ?? null,
      phoneVerified: profile.phoneVerified,
      avatarUrl: profile.avatarUrl ?? null,
      companyName: profile.companyName ?? null,
      companyWebsite: profile.companyWebsite ?? null,
      companyDescription: profile.companyDescription ?? null,
    };
  }),

  update: authedQuery
    .input(z.object({
      phone: z.string().max(50).optional(),
      name: z.string().min(1).max(100).optional(),
      companyName: z.string().max(255).optional(),
      companyWebsite: z.string().max(512).optional().or(z.literal("")),
      companyDescription: z.string().max(300).optional(),
    }))
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: { phone?: string; name?: string; companyName?: string; companyWebsite?: string; companyDescription?: string } }) => {
      const updates: Record<string, unknown> = {};
      if (input.phone !== undefined) {
        updates.phone = input.phone || null;
        // Reset verification if phone changes
        updates.phoneVerified = false;
      }
      if (input.name !== undefined) updates.name = input.name;
      if (input.companyName !== undefined) updates.companyName = input.companyName;
      if (input.companyWebsite !== undefined) updates.companyWebsite = input.companyWebsite;
      if (input.companyDescription !== undefined) updates.companyDescription = input.companyDescription;
      await updateProfile(ctx.user.id, updates as any);
      return { success: true };
    }),

  sendPhoneOtp: authedQuery
    .input(z.object({ phone: z.string().min(5).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const code = generateOtp();
      storeOtp(input.phone, ctx.user.id, code);
      await sendSms(input.phone, `Tavs jobsy.lv verifikācijas kods: ${code}`);
      return { success: true };
    }),

  verifyPhoneOtp: authedQuery
    .input(z.object({ phone: z.string(), code: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const valid = validateOtp(input.phone, ctx.user.id, input.code);
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "Nepareizs vai derīguma termiņš beidzies kods" });
      await updateProfile(ctx.user.id, { phone: input.phone, phoneVerified: true } as any);
      return { success: true };
    }),
});
