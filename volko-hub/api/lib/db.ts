import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../../db/schema";
import * as relations from "../../db/relations";
import { env } from "./env";

type DbSchema = typeof schema & typeof relations;
type Db = MySql2Database<DbSchema>;

let _db: Db | undefined;

export function getDb(): Db {
  if (!_db) {
    const pool = mysql.createPool(env.databaseUrl);
    _db = drizzle(pool, { schema: { ...schema, ...relations }, mode: "default" }) as Db;
  }
  return _db;
}
