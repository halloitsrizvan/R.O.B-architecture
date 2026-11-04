const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase platform fixtures; application tables come only from migrations.
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      grant usage on schema public to anon, authenticated, service_role;
      create schema storage;
      create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    `);
    for (const file of fs
      .readdirSync('supabase/migrations')
      .filter((file) => file.endsWith('.sql'))
      .sort()) {
      await db.exec(fs.readFileSync(`supabase/migrations/${file}`, 'utf8'));
    }
    const seed = fs.readFileSync('supabase/seed.sql', 'utf8');
    await db.exec(seed);
    await db.exec(seed); // Rerunning seed must not duplicate or overwrite content.
    assert.equal(
      (await db.query('select count(*)::int as count from public.projects')).rows[0].count,
      12,
    );
    assert.equal(
      (await db.query('select count(*)::int as count from public.project_images')).rows[0].count,
      36,
    );
    await db.exec(
      "update public.projects set published = false where slug = 'project-urban-plaza'; set role anon;",
    );
    assert.equal(
      (await db.query('select count(*)::int as count from public.projects')).rows[0].count,
      11,
    );
    assert.equal(
      (await db.query('select count(*)::int as count from public.project_images')).rows[0].count,
      33,
    );
    await assert.rejects(db.query('select * from public.contact_inquiries'), /permission denied/i);
    await assert.rejects(
      db.exec("update public.projects set title = 'Unauthorized change'"),
      /permission denied/i,
    );
    const submit =
      "select public.submit_contact_inquiry('Database Test', 'test@example.com', 'Architecture', 'A test project inquiry.', repeat('a', 64))";
    await assert.rejects(db.query(submit), /permission denied/i);
    await db.exec('reset role; set role authenticated;');
    await assert.rejects(db.query('select * from public.contact_inquiries'), /permission denied/i);
    await assert.rejects(db.query(submit), /permission denied/i);
    await db.exec('reset role; set role service_role;');
    for (let i = 0; i < 5; i++) await db.query(submit);
    await assert.rejects(db.query(submit), /RATE_LIMITED/);
    assert.equal(
      (await db.query('select count(*)::int as count from public.contact_inquiries')).rows[0].count,
      5,
    );
    await assert.rejects(
      db.query(
        "select public.submit_contact_inquiry('Database Test', 'invalid-email', 'Architecture', 'A test project inquiry.', repeat('b',64))",
      ),
      /check constraint/i,
    );
    await db.exec('reset role;');
    const secured = await db.query(
      "select count(*)::int as count from pg_tables where schemaname = 'public' and tablename in ('projects','project_images','contact_inquiries') and rowsecurity",
    );
    assert.equal(secured.rows[0].count, 3);
    console.log(
      'Passed migration/seed, 12 projects/36 images, draft visibility, public write denial, private inquiries, validation, and database-backed rate limits.',
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
