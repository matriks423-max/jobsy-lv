import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  microsoftClientId: process.env.MICROSOFT_CLIENT_ID ?? "",
  microsoftClientSecret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
  microsoftTenantId: process.env.MICROSOFT_TENANT_ID ?? "common",
  whatsappApiToken: process.env.WHATSAPP_API_TOKEN ?? "",
  whatsappPhoneId: process.env.WHATSAPP_PHONE_ID ?? "",
  siteUrl: process.env.SITE_URL ?? "http://localhost:3001",
  port: parseInt(process.env.PORT ?? "3001"),
  isProduction: process.env.NODE_ENV === "production",
};
