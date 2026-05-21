import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS reviews (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    postId BIGINT UNSIGNED NOT NULL,
    reviewerId BIGINT UNSIGNED NOT NULL,
    revieweeId BIGINT UNSIGNED NOT NULL,
    stars INT UNSIGNED NOT NULL,
    comment TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_reviews_post_reviewer_reviewee (postId, reviewerId, revieweeId),
    KEY idx_reviews_reviewee (revieweeId)
  )
`);

console.log("reviews table created ✅");
await conn.end();
