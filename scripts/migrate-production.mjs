/**
 * Production migration — safe, non-interactive, MySQL 5.7 compatible
 * Checks column existence before adding. All idempotent.
 */
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL env var required");
  process.exit(1);
}

const conn = await mysql.createConnection(DB_URL);
// Get the database name from the connection
const [[{ db }]] = await conn.execute("SELECT DATABASE() as db");
console.log(`Connected to production DB: ${db}`);

async function columnExists(table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [db, table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [db, table]
  );
  return rows[0].cnt > 0;
}

async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`  ⏭  ${table}.${column} already exists`);
    return;
  }
  await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`  ✅ Added ${table}.${column}`);
}

// users table
await addColumn("users", "resetToken", "VARCHAR(64)");
await addColumn("users", "resetTokenExpiry", "TIMESTAMP NULL");
await addColumn("users", "plan", "ENUM('free','business') NOT NULL DEFAULT 'free'");
await addColumn("users", "stripeSubscriptionId", "VARCHAR(255)");
await addColumn("users", "planExpiresAt", "TIMESTAMP NULL");

// profiles table
await addColumn("profiles", "companyName", "VARCHAR(255)");
await addColumn("profiles", "companyLogo", "VARCHAR(512)");
await addColumn("profiles", "companyWebsite", "VARCHAR(512)");
await addColumn("profiles", "companyDescription", "TEXT");
await addColumn("profiles", "monthlyPostCount", "INT UNSIGNED NOT NULL DEFAULT 0");
await addColumn("profiles", "monthlyPostReset", "VARCHAR(10)");
await addColumn("profiles", "freeBoostsRemaining", "INT UNSIGNED NOT NULL DEFAULT 0");

// posts table
await addColumn("posts", "boostType", "ENUM('none','bump','featured','urgent') NOT NULL DEFAULT 'none'");
await addColumn("posts", "boostExpiresAt", "TIMESTAMP NULL");
await addColumn("posts", "boostStripeSessionId", "VARCHAR(255)");

// socialQueue table
if (await tableExists("socialQueue")) {
  console.log("  ⏭  socialQueue table already exists");
} else {
  await conn.execute(`
    CREATE TABLE socialQueue (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      postId BIGINT UNSIGNED NOT NULL,
      boostType ENUM('bump','featured') NOT NULL,
      status ENUM('pending','posted','failed') NOT NULL DEFAULT 'pending',
      scheduledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      postedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_social_queue_status (status)
    )
  `);
  console.log("  ✅ Created socialQueue table");
}

await conn.end();
console.log("\nMigration complete ✅");
