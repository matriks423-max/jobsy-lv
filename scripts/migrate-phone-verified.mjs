import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

// Check if column exists first
const [cols] = await conn.execute(
  "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'phoneVerified'"
);
if (cols.length === 0) {
  await conn.execute(
    "ALTER TABLE profiles ADD COLUMN phoneVerified BOOLEAN NOT NULL DEFAULT FALSE"
  );
  console.log("phoneVerified column added ✅");
} else {
  console.log("phoneVerified column already exists, skipping ✅");
}

console.log("phoneVerified column added ✅");
await conn.end();
