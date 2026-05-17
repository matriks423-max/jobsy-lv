import { authRouter } from "./auth-router";
import { postsRouter } from "./posts-router";
import { statsRouter } from "./stats-router";
import { referralRouter } from "./referral-router";
import { emailAuthRouter } from "./email-auth";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  posts: postsRouter,
  stats: statsRouter,
  referral: referralRouter,
  emailAuth: emailAuthRouter,
});

export type AppRouter = typeof appRouter;
