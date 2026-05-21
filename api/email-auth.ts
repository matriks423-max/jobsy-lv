import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import * as cookie from "cookie";
import bcrypt from "bcryptjs";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { signAppSessionToken } from "./auth/session";
import { createRouter, publicQuery } from "./middleware";
import { findUserByGoogleId, findUserByEmail, createUser, findUserById as findUserByIdFn } from "./queries/users";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";

// Google OAuth callback handler
export async function handleGoogleCallback(code: string, redirectUri: string) {
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResp.ok) {
    throw new Error(`Google token exchange failed: ${await tokenResp.text()}`);
  }

  const tokens = await tokenResp.json() as { access_token: string };

  const profileResp = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResp.ok) {
    throw new Error("Failed to fetch Google profile");
  }

  const profile = await profileResp.json() as {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  };

  let user = await findUserByGoogleId(profile.id);

  if (!user) {
    const existingByEmail = await findUserByEmail(profile.email);
    if (existingByEmail) {
      await getDb()
        .update(schema.users)
        .set({ googleId: profile.id, authMethod: "google", updatedAt: new Date() })
        .where(eq(schema.users.id, existingByEmail.id));
      user = existingByEmail;
    } else {
      const result = await createUser({
        googleId: profile.id,
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        avatar: profile.picture ?? null,
        authMethod: "google",
        role: "user",
        lastSignInAt: new Date(),
      });
      const insertId = Number((result as unknown as [{ insertId: bigint }])[0].insertId);
      user = await findUserByIdFn(insertId);

      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await getDb().insert(schema.profiles).values({
        id: insertId,
        userId: insertId,
        email: profile.email,
        name: profile.name ?? profile.email.split("@")[0],
        avatarUrl: profile.picture ?? null,
        freePostUsed: false,
        freePostCredits: 0,
        referralCode,
      } as any);
    }
  } else {
    await getDb()
      .update(schema.users)
      .set({ lastSignInAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));
  }

  const token = await signAppSessionToken({ userId: user!.id });
  return { token, user: user! };
}

function serializeAppCookie(token: string, secure: boolean) {
  return cookie.serialize("jobsy_session", token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure,
    maxAge: 7 * 24 * 60 * 60,
  });
}

export const emailAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        password: z.string().min(8).max(100),
        referralCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Šis e-pasts jau ir reģistrēts" });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);

      const result = await createUser({
        email: input.email,
        name: input.name,
        passwordHash,
        authMethod: "email",
        role: "user",
        lastSignInAt: new Date(),
      });

      const insertId = Number((result as unknown as [{ insertId: bigint }])[0].insertId);

      const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await getDb().insert(schema.profiles).values({
        id: insertId,
        userId: insertId,
        email: input.email,
        name: input.name,
        freePostUsed: false,
        freePostCredits: 0,
        referralCode: refCode,
      } as any);

      if (input.referralCode) {
        const referrerProfile = await getDb()
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.referralCode, input.referralCode.toUpperCase()))
          .limit(1);

        if (referrerProfile.length) {
          await getDb().insert(schema.referrals).values({
            referrerId: referrerProfile[0].userId,
            referredId: insertId,
          } as any);
          await getDb()
            .update(schema.profiles)
            .set({ referredBy: referrerProfile[0].userId })
            .where(eq(schema.profiles.userId, insertId));
        }
      }

      const token = await signAppSessionToken({ userId: insertId });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", serializeAppCookie(token, !!cookieOpts.secure));

      return { success: true, userId: insertId };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await findUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Nepareizs e-pasts vai parole" });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Nepareizs e-pasts vai parole" });
      }

      await getDb()
        .update(schema.users)
        .set({ lastSignInAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.users.id, user.id));

      const token = await signAppSessionToken({ userId: user.id });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append("set-cookie", serializeAppCookie(token, !!cookieOpts.secure));

      return { success: true, userId: user.id, name: user.name, avatar: user.avatar };
    }),
});
