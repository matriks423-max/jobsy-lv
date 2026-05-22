import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // gracefully skip if not configured

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Only sample 20% of traces in production to keep quota low
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    // Capture unhandled promise rejections
    integrations: [Sentry.browserTracingIntegration()],
    // Don't report known benign errors
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Failed to fetch",
    ],
  });
}

export { Sentry };
