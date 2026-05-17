import * as jose from "jose";
import { env } from "../lib/env";

const SECRET = new TextEncoder().encode(env.jwtSecret);

export async function signAppSessionToken(payload: { userId: number }): Promise<string> {
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyAppSessionToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET, { clockTolerance: 60 });
    if (typeof payload.userId === "number") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}
