import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;

export async function sendSms(to: string, body: string): Promise<void> {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("SMS not configured — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER");
  }
  const client = twilio(accountSid, authToken);
  await client.messages.create({ body, from: fromNumber, to });
}

// In-memory OTP store: phone → { code, expiry, userId }
const otpStore = new Map<string, { code: string; expiry: number; userId: number }>();

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function storeOtp(phone: string, userId: number, code: string): void {
  otpStore.set(phone, { code, expiry: Date.now() + 10 * 60 * 1000, userId });
}

export function validateOtp(phone: string, userId: number, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (Date.now() > entry.expiry) { otpStore.delete(phone); return false; }
  if (entry.code !== code) return false;
  otpStore.delete(phone);
  return true;
}
