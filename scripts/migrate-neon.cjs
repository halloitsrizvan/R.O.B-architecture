const fs = require('node:fs');
const crypto = require('node:crypto');
const { Client } = require('pg');

(async () => {
  if (!process.env.DATABASE_URL_UNPOOLED)
    throw new Error('DATABASE_URL_UNPOOLED is required for migrations.');
  const client = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED.replace(
      'sslmode=require',
      'sslmode=verify-full',
    ),
  });
  try {
    await client.connect();
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(702035110)');
    await client.query(
      'create table if not exists public.studio_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())',
    );
    for (const file of fs
      .readdirSync('database/migrations')
      .filter((file) => file.endsWith('.sql'))
      .sort()) {
      const sql = fs.readFileSync('database/migrations/' + file, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const { rows } = await client.query(
        'select checksum from public.studio_migrations where name=$1',
        [file],
      );
      if (rows[0]) {
        if (rows[0].checksum !== checksum)
          throw new Error('Applied migration checksum mismatch: ' + file);
        continue;
      }
      await client.query(sql);
      await client.query('insert into public.studio_migrations(name,checksum) values($1,$2)', [
        file,
        checksum,
      ]);
      console.log('Applied', file);
    }
    await client.query(fs.readFileSync('database/seed.sql', 'utf8'));
    await client.query('commit');
    const { rows } = await client.query(
      'select (select count(*)::int from public.projects) as projects,(select count(*)::int from public.project_images) as images',
    );
    console.log('Neon migration and seed verified:', JSON.stringify(rows[0]));
  } catch (error) {
    await client.query('rollback').catch(() => {});
    console.error(
      'Migration failed:',
      error.code ?? '',
      error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'),
    );
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
