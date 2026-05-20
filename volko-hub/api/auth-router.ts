import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./lib/db";
import { signToken } from "./lib/jwt";
import { users } from "../db/schema";

export const authRouter = createRouter({
  me: authedQuery.query(({ ctx }) => {
    const { passwordHash: _, ...safe } = ctx.user;
    return safe;
  }),

  login: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Nepareizs e-pasts vai parole" });

      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Nepareizs e-pasts vai parole" });

      const token = await signToken({ sub: user.id, email: user.email, role: user.role });
      const { passwordHash: _, ...safe } = user;
      return { token, user: safe };
    }),

  register: publicQuery
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2),
      password: z.string().min(8),
      inviteCode: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "E-pasts jau reģistrēts" });

      // First user becomes admin
      const [firstUser] = await db.select().from(users).limit(1);
      const role = firstUser ? "member" : "admin";

      const passwordHash = await bcrypt.hash(input.password, 12);
      const [result] = await db.insert(users).values({
        email: input.email,
        name: input.name,
        passwordHash,
        role,
      });

      const id = (result as { insertId: number }).insertId;
      const token = await signToken({ sub: id, email: input.email, role });
      return { token, user: { id, email: input.email, name: input.name, role, avatar: null, createdAt: new Date(), updatedAt: new Date() } };
    }),

  listUsers: authedQuery.query(async () => {
    const db = getDb();
    const all = await db.select({
      id: users.id, email: users.email, name: users.name, role: users.role, avatar: users.avatar, createdAt: users.createdAt,
    }).from(users);
    return all;
  }),
});
