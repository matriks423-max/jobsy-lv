import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string): string | undefined {
  return process.env[name];
}

export const env = {
  // Kimi OAuth — optional, only used if KIMI_AUTH_URL is set
  appId: optional("APP_ID") ?? "",
  appSecret: optional("APP_SECRET") ?? "",
  kimiAuthUrl: optional("KIMI_AUTH_URL") ?? "",
  kimiOpenUrl: optional("KIMI_OPEN_URL") ?? "",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",

  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),

  // Google OAuth
  googleClientId: optional("GOOGLE_CLIENT_ID") ?? "",
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET") ?? "",

  // Stripe
  stripeSecretKey: optional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
  stripeBusinessPriceId: optional("STRIPE_BUSINESS_PRICE_ID"),

  siteUrl: optional("SITE_URL") ?? "http://localhost:3000",
  postingFeeCents: parseInt(process.env.POSTING_FEE_CENTS ?? "200"),

  // Email (Resend) — optional in dev, required in production for email features
  resendApiKey: optional("RESEND_API_KEY"),

  // Cron secret — required in production (any value, keep secret)
  cronSecret: optional("CRON_SECRET"),
};

