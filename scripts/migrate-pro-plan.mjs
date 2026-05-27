/**
 * Migration: Pro plan support
 *
 * 1. Extend users.plan enum to include 'pro'
 * 2. Add profiles.contactViewsThisMonth (INT, default 0)
 * 3. Add profiles.contactViewsResetAt (TIMESTAMP, nullable)
 *
 * Run: DATABASE_URL=... node scripts/migrate-pro-plan.mjs
 */

import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);

console.log("▶ Extending users.plan enum...");
await conn.execute(`
  ALTER TABLE users
  MODIFY COLUMN plan ENUM('free','pro','business') NOT NULL DEFAULT 'free'
`);
console.log("  ✓ users.plan enum updated");

console.log("▶ Adding contactViewsThisMonth to profiles...");
try {
  await conn.execute(`
    ALTER TABLE profiles
    ADD COLUMN contactViewsThisMonth INT UNSIGNED NOT NULL DEFAULT 0
  `);
  console.log("  ✓ contactViewsThisMonth added");
} catch (err) {
  if (err.code === "ER_DUP_FIELDNAME") {
    console.log("  ⚠ contactViewsThisMonth already exists, skipping");
  } else throw err;
}

console.log("▶ Adding contactViewsResetAt to profiles...");
try {
  await conn.execute(`
    ALTER TABLE profiles
    ADD COLUMN contactViewsResetAt TIMESTAMP NULL DEFAULT NULL
  `);
  console.log("  ✓ contactViewsResetAt added");
} catch (err) {
  if (err.code === "ER_DUP_FIELDNAME") {
    console.log("  ⚠ contactViewsResetAt already exists, skipping");
  } else throw err;
}

await conn.end();
console.log("\n✅ Migration complete. Create STRIPE_PRO_PRICE_ID in Railway env before deploying.");
