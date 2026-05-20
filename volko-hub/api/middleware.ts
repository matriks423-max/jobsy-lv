import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({ transformer: superjson });

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Pierakstieties, lūdzu" });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Nepietiek tiesību" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireAdmin);
