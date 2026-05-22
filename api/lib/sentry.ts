import * as Sentry from "@sentry/node";

export function initSentryServer() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
  console.error("[error]", err, context ?? "");
}
