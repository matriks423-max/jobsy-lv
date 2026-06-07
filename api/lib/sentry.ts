import * as Sentry from "@sentry/node";

export function initSentryServer() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "production",
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    // Defensive: never let request auth headers (NVIDIA/Unsplash keys, session
    // cookies) reach Sentry, regardless of future integrations.
    beforeSend(event) {
      const h = event.request?.headers;
      if (h) {
        for (const k of Object.keys(h)) {
          if (/^(authorization|cookie|x-cron-secret)$/i.test(k)) h[k] = "[redacted]";
        }
      }
      return event;
    },
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  }
  console.error("[error]", err, context ?? "");
}
