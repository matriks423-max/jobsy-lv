import mysql from "mysql2/promise";

const conn = await mysql.createConnection(
  "mysql://root:kKVCYslorDcVseKGsOogjAedIsXFjIVl@autorack.proxy.rlwy.net:56656/railway"
);
const [r] = await conn.execute(
  "UPDATE users SET role='admin' WHERE email='matriks423@gmail.com'"
);
console.log("Updated rows:", r.affectedRows);
const [rows] = await conn.execute(
  "SELECT id, email, role FROM users WHERE email='matriks423@gmail.com'"
);
console.log(rows);
await conn.end();
