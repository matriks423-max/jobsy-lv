import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./auth-router";
import { crmRouter } from "./crm-router";
import { projectsRouter } from "./projects-router";
import { integrationsRouter } from "./integrations-router";
import { claudeRouter } from "./claude-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  crm: crmRouter,
  projects: projectsRouter,
  integrations: integrationsRouter,
  claude: claudeRouter,
});

export type AppRouter = typeof appRouter;
