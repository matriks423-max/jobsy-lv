import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import * as schema from "@db/schema";
import type { InsertUser, InsertProfile } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

function generateReferralCode(): string {
  // 3 random bytes → 6 uppercase hex chars (cryptographically secure)
  return randomBytes(3).toString("hex").toUpperCase();
}

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows.at(0);
}

export async function findUserByEmail(email: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return rows.at(0);
}

export async function findUserByGoogleId(googleId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.googleId, googleId))
    .limit(1);
  return rows.at(0);
}

export async function createUser(data: InsertUser) {
  const result = await getDb().insert(schema.users).values(data);
  return result;
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await getDb()
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });

  let user = null;
  if (data.unionId) {
    user = await findUserByUnionId(data.unionId);
  } else if (data.googleId) {
    user = await findUserByGoogleId(data.googleId);
  } else if (data.email) {
    user = await findUserByEmail(data.email);
  }
  if (user) {
    const existingProfile = await getDb()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, user.id))
      .limit(1);

    if (!existingProfile.length) {
      let referralCode = generateReferralCode();
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const existing = await getDb()
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.referralCode, referralCode))
          .limit(1);
        if (!existing.length) break;
        referralCode = generateReferralCode();
        attempts++;
      }

      await getDb().insert(schema.profiles).values({
        userId: user.id,
        email: data.email ?? null,
        name: data.name ?? null,
        avatarUrl: data.avatar ?? null,
        freePostsUsed: 0,
        freePostCredits: 0,
        referralCode,
      } as InsertProfile);
    } else {
      await getDb()
        .update(schema.profiles)
        .set({
          email: data.email ?? existingProfile[0].email,
          name: data.name ?? existingProfile[0].name,
          avatarUrl: data.avatar ?? existingProfile[0].avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(schema.profiles.userId, user.id));
    }
  }

  return user;
}
