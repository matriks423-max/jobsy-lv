// scripts/migrate-monetization.mjs
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  process.env.DATABASE_URL ?? "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

async function columnExists(table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function tableExists(table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows[0].cnt > 0;
}

try {
  // users: plan, stripeSubscriptionId, planExpiresAt
  if (!await columnExists("users", "plan")) {
    await conn.execute(`ALTER TABLE users ADD COLUMN plan ENUM('free','business') NOT NULL DEFAULT 'free'`);
    console.log("users.plan added ✅");
  } else { console.log("users.plan exists, skipping ✅"); }

  if (!await columnExists("users", "stripeSubscriptionId")) {
    await conn.execute(`ALTER TABLE users ADD COLUMN stripeSubscriptionId VARCHAR(255) NULL`);
    console.log("users.stripeSubscriptionId added ✅");
  } else { console.log("users.stripeSubscriptionId exists, skipping ✅"); }

  if (!await columnExists("users", "planExpiresAt")) {
    await conn.execute(`ALTER TABLE users ADD COLUMN planExpiresAt TIMESTAMP NULL`);
    console.log("users.planExpiresAt added ✅");
  } else { console.log("users.planExpiresAt exists, skipping ✅"); }

  // profiles: company, monthly counter, freeBoosts
  const profileCols = [
    ["companyName", "ALTER TABLE profiles ADD COLUMN companyName VARCHAR(255) NULL"],
    ["companyLogo", "ALTER TABLE profiles ADD COLUMN companyLogo VARCHAR(512) NULL"],
    ["companyWebsite", "ALTER TABLE profiles ADD COLUMN companyWebsite VARCHAR(512) NULL"],
    ["companyDescription", "ALTER TABLE profiles ADD COLUMN companyDescription TEXT NULL"],
    ["monthlyPostCount", "ALTER TABLE profiles ADD COLUMN monthlyPostCount INT UNSIGNED NOT NULL DEFAULT 0"],
    ["monthlyPostReset", "ALTER TABLE profiles ADD COLUMN monthlyPostReset VARCHAR(10) NULL"],
    ["freeBoostsRemaining", "ALTER TABLE profiles ADD COLUMN freeBoostsRemaining INT UNSIGNED NOT NULL DEFAULT 0"],
  ];
  for (const [col, sql] of profileCols) {
    if (!await columnExists("profiles", col)) {
      await conn.execute(sql);
      console.log(`profiles.${col} added ✅`);
    } else { console.log(`profiles.${col} exists, skipping ✅`); }
  }

  // posts: boostType, boostExpiresAt, boostStripeSessionId
  if (!await columnExists("posts", "boostType")) {
    await conn.execute(`ALTER TABLE posts ADD COLUMN boostType ENUM('none','bump','featured','urgent') NOT NULL DEFAULT 'none'`);
    console.log("posts.boostType added ✅");
  } else { console.log("posts.boostType exists, skipping ✅"); }

  if (!await columnExists("posts", "boostExpiresAt")) {
    await conn.execute(`ALTER TABLE posts ADD COLUMN boostExpiresAt TIMESTAMP NULL`);
    console.log("posts.boostExpiresAt added ✅");
  } else { console.log("posts.boostExpiresAt exists, skipping ✅"); }

  if (!await columnExists("posts", "boostStripeSessionId")) {
    await conn.execute(`ALTER TABLE posts ADD COLUMN boostStripeSessionId VARCHAR(255) NULL`);
    console.log("posts.boostStripeSessionId added ✅");
  } else { console.log("posts.boostStripeSessionId exists, skipping ✅"); }

  // socialQueue table
  if (!await tableExists("socialQueue")) {
    await conn.execute(`
      CREATE TABLE socialQueue (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        postId BIGINT UNSIGNED NOT NULL,
        boostType ENUM('bump','featured') NOT NULL,
        status ENUM('pending','posted','failed') NOT NULL DEFAULT 'pending',
        scheduledAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        postedAt TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_social_queue_status (status)
      )
    `);
    console.log("socialQueue table created ✅");
  } else { console.log("socialQueue exists, skipping ✅"); }

  console.log("\nMigration complete ✅");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
