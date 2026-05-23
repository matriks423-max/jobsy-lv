import * as cookie from "cookie";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import * as bcrypt from "bcryptjs";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "../db";
import * as schema from "../db/schema";
import { sendEmail } from "./lib/email";
import { env } from "./lib/env";

// In-memory rate limit: max 3 forgot-password requests per email per hour
const forgotRateMap = new Map<string, { count: number; windowStart: number }>();

export const authRouter = createRouter({
  me: authedQuery.query((opts) => opts.ctx.user),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    // Clear Kimi session
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    // Clear app session (Google/Email)
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize("jobsy_session", "", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),

  // Forgot password — sends reset link if email matches an account with password auth
  forgotPassword: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [user] = await db
        .select({ id: schema.users.id, email: schema.users.email, authMethod: schema.users.authMethod })
        .from(schema.users)
        .where(eq(schema.users.email, input.email.toLowerCase()))
        .limit(1);

      // Rate limit: 3 requests per email per hour
      const key = input.email.toLowerCase();
      const now = Date.now();
      const rateEntry = forgotRateMap.get(key);
      if (rateEntry && now - rateEntry.windowStart < 60 * 60 * 1000) {
        if (rateEntry.count >= 3) {
          return { success: true }; // Silent rate limit — don't reveal enumeration
        }
        forgotRateMap.set(key, { count: rateEntry.count + 1, windowStart: rateEntry.windowStart });
      } else {
        forgotRateMap.set(key, { count: 1, windowStart: now });
      }

      // Always return success to prevent email enumeration
      if (!user || user.authMethod !== "email") {
        return { success: true };
      }

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db
        .update(schema.users)
        .set({ resetToken: token, resetTokenExpiry: expiry })
        .where(eq(schema.users.id, user.id));

      const resetUrl = `${env.siteUrl}/reset-password?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: "Atjaunot paroli — jobsy.lv",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#1a1a1a;">Paroles atjaunošana</h2>
            <p>Mēs saņēmām pieprasījumu atjaunot Tavu paroli jobsy.lv kontam.</p>
            <p>Noklikšķini uz pogas zemāk, lai izveidotu jaunu paroli. Saite ir spēkā <strong>1 stundu</strong>.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#C8A97E;color:#1a1a1a;text-decoration:none;border-radius:8px;font-weight:600;">
              Atjaunot paroli
            </a>
            <p style="color:#888;font-size:13px;">Ja Tu nepieprasīji šo, vienkārši ignorē šo e-pastu.</p>
            <p style="color:#888;font-size:12px;">Vai kopē saiti: ${resetUrl}</p>
          </div>
        `,
      });

      return { success: true };
    }),

  // Reset password — validates token, updates password, clears token
  resetPassword: publicQuery
    .input(z.object({ token: z.string().min(1), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [user] = await db
        .select({ id: schema.users.id, resetToken: schema.users.resetToken, resetTokenExpiry: schema.users.resetTokenExpiry })
        .from(schema.users)
        .where(eq(schema.users.resetToken, input.token))
        .limit(1);

      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new Error("Invalid or expired reset link");
      }

      const hash = await bcrypt.hash(input.password, 10);
      await db
        .update(schema.users)
        .set({ passwordHash: hash, resetToken: null, resetTokenExpiry: null })
        .where(eq(schema.users.id, user.id));

      return { success: true };
    }),
});
