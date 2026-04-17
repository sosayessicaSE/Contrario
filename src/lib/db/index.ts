import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function poolMaxConnections() {
  const raw = process.env.DATABASE_POOL_MAX?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 1) return Math.min(n, 10);
  return 4;
}

export function getDb() {
  if (db) return db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  client = postgres(url, {
    max: poolMaxConnections(),
    prepare: false,
    idle_timeout: 20,
  });
  db = drizzle(client, { schema });
  return db;
}

export type Db = ReturnType<typeof getDb>;
