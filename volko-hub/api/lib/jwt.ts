import { SignJWT, jwtVerify } from "jose";
import { env } from "./env";
import type { JwtPayload } from "../../contracts/types";

const secret = new TextEncoder().encode(env.jwtSecret);

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ sub: String(payload.sub), email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return { sub: Number(payload.sub), email: payload.email as string, role: payload.role as "admin" | "member" };
}

export function getTokenFromRequest(headers: Headers): string | null {
  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(/volko_session=([^;]+)/);
  if (match) return match[1];
  const auth = headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
