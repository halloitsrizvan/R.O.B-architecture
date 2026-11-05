import 'server-only';
import { Pool, type QueryResultRow } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

const globalDatabase = globalThis as typeof globalThis & { studioPool?: Pool };

export function getDatabase(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.');
  if (!globalDatabase.studioPool) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL.replace('sslmode=require', 'sslmode=verify-full'),
      max: 5,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 15000,
    });
    pool.on('error', () => console.error('An idle database connection closed.'));
    attachDatabasePool(pool);
    globalDatabase.studioPool = pool;
  }
  return globalDatabase.studioPool;
}

export async function query<Row extends QueryResultRow>(
  sql: string,
  parameters: unknown[] = [],
): Promise<Row[]> {
  return (await getDatabase().query<Row>(sql, parameters)).rows;
}
