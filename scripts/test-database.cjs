const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  try {
    for (const file of fs
      .readdirSync('database/migrations')
      .filter((f) => f.endsWith('.sql'))
      .sort())
      await db.exec(fs.readFileSync('database/migrations/' + file, 'utf8'));
    const seed = fs.readFileSync('database/seed.sql', 'utf8');
    await db.exec(seed);
    await db.exec(seed);
    assert.equal((await db.query('select count(*)::int as n from projects')).rows[0].n, 12);
    assert.equal((await db.query('select count(*)::int as n from project_images')).rows[0].n, 36);
    const submit =
      "select public.submit_contact_inquiry('Test User','test@example.com','Architecture','A sample project inquiry.',repeat('a',64))";
    for (let i = 0; i < 5; i++) await db.query(submit);
    await assert.rejects(db.query(submit), /RATE_LIMITED/);
    assert.equal((await db.query('select count(*)::int as n from contact_inquiries')).rows[0].n, 5);
    await db.exec(
      'create role studio_anonymous; grant usage on schema public to studio_anonymous; set role studio_anonymous;',
    );
    await assert.rejects(db.query('select * from contact_inquiries'), /permission denied/i);
    await assert.rejects(db.query(submit), /permission denied/i);
    console.log(
      'Passed Neon schema/seed, 12 projects, 36 images, inquiry validation/rate limits, and public-access denial.',
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
