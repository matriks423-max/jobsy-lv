// scripts/migrate-credits.mjs — adds creditBalance to profiles + creditTransactions table
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
  // profiles.creditBalance — euro cents, signed (allows refund detection if needed)
  if (!await columnExists("profiles", "creditBalance")) {
    await conn.execute(`ALTER TABLE profiles ADD COLUMN creditBalance INT NOT NULL DEFAULT 0`);
    console.log("profiles.creditBalance added ✅");
  } else {
    console.log("profiles.creditBalance already exists ⏭️");
  }

  // creditTransactions table
  if (!await tableExists("creditTransactions")) {
    await conn.execute(`
      CREATE TABLE creditTransactions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        userId BIGINT UNSIGNED NOT NULL,
        amount INT NOT NULL,
        type ENUM('grant','spend','refund') NOT NULL,
        description VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        INDEX idx_credit_tx_user (userId)
      )
    `);
    console.log("creditTransactions table created ✅");
  } else {
    console.log("creditTransactions already exists ⏭️");
  }

  console.log("\n✅ Credits migration complete.");
} finally {
  await conn.end();
}
