import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS savedSearches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    userId BIGINT UNSIGNED NOT NULL,
    label VARCHAR(100) NOT NULL,
    type ENUM('need','offer') NOT NULL DEFAULT 'need',
    category VARCHAR(50),
    city VARCHAR(100),
    keyword VARCHAR(100),
    lastNotifiedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_saved_searches_user (userId)
  )
`);

console.log("savedSearches table created ✅");
await conn.end();
