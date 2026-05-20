import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "../db/schema";
import { getTokenFromRequest, verifyToken } from "./lib/jwt";
import { getDb } from "./lib/db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const token = getTokenFromRequest(opts.req.headers);
    if (token) {
      const payload = await verifyToken(token);
      const db = getDb();
      const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
      if (user) ctx.user = user;
    }
  } catch {
    // unauthenticated
  }
  return ctx;
}
