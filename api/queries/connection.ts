import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// Create an explicit pool so we control keep-alive and connection limits
const pool = mysql.createPool({
  uri: env.databaseUrl,
  waitForConnections: true,
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  idleTimeout: 60000,       // release idle connections after 60 s
  connectTimeout: 15000,    // 15 s connect timeout (default is 10 s)
});

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance = drizzle(pool as any, {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance;
}
