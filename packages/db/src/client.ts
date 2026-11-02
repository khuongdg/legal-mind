import { Pool, type QueryResult, type QueryResultRow } from "pg";
import { getServerEnv } from "@legal-mind/env";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const env = getServerEnv();
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("❌ Unexpected error on idle Postgres client", err);
    });
  }
  return pool;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const p = getDbPool();
  return p.query<R>(text, params);
}
