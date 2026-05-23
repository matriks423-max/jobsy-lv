import twilio from "twilio";
import { randomInt } from "crypto";

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

// In-memory OTP store: phone → { code, expiry, userId, attempts }
const otpStore = new Map<string, { code: string; expiry: number; userId: number; attempts: number }>();
const MAX_OTP_ATTEMPTS = 5;

export function generateOtp(): string {
  // Use cryptographically secure random to prevent prediction attacks
  return String(randomInt(100000, 1000000));
}

export function storeOtp(phone: string, userId: number, code: string): void {
  otpStore.set(phone, { code, expiry: Date.now() + 10 * 60 * 1000, userId, attempts: 0 });
}

export function validateOtp(phone: string, userId: number, code: string): boolean {
  const entry = otpStore.get(phone);
  if (!entry) return false;
  if (entry.userId !== userId) return false;
  if (Date.now() > entry.expiry) { otpStore.delete(phone); return false; }

  // Brute-force protection: max 5 failed attempts
  if (entry.attempts >= MAX_OTP_ATTEMPTS) { otpStore.delete(phone); return false; }

  if (entry.code !== code) {
    entry.attempts++;
    return false;
  }

  otpStore.delete(phone);
  return true;
}
