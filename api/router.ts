import { authRouter } from "./auth-router";
import { postsRouter } from "./posts-router";
import { statsRouter } from "./stats-router";
import { referralRouter } from "./referral-router";
import { profileRouter } from "./profile-router";
import { emailAuthRouter } from "./email-auth";
import { savedSearchesRouter } from "./saved-searches-router";
import { subscriptionRouter } from "./subscription-router";
import { boostRouter } from "./boost-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  posts: postsRouter,
  stats: statsRouter,
  referral: referralRouter,
  profile: profileRouter,
  emailAuth: emailAuthRouter,
  savedSearches: savedSearchesRouter,
  subscription: subscriptionRouter,
  boost: boostRouter,
});

export type AppRouter = typeof appRouter;
