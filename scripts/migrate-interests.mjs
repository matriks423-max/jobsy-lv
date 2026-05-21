import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS interests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    fromUserId BIGINT UNSIGNED NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_interests_post_user (postId, fromUserId)
  )
`);

console.log("interests table created ✅");
await conn.end();
