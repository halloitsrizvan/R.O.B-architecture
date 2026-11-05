const { chromium } = require('playwright-core');
const { Client } = require('pg');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3240';
  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;
  assert(email && password, 'Set ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD for a live admin test.');
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(fs.existsSync);
  assert(executablePath, 'Chrome or Edge is required.');
  const db = new Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED.replace(
      'sslmode=require',
      'sslmode=verify-full',
    ),
  });
  const s3 = new S3Client({ forcePathStyle: true });
  const browser = await chromium.launch({ executablePath, headless: true });
  const tag = randomUUID().slice(0, 8);
  const slug = 'project-neon-e2e-' + tag;
  const title = 'Neon integration ' + tag;
  const inquiryEmail = 'neon-test-' + tag + '@example.com';
  const inquiryName = 'Neon live inquiry ' + tag;
  let storageKey;
  let page;
  try {
    await db.connect();
    const tables = await db.query(
      'select (select count(*)::int from projects) as projects,(select count(*)::int from project_images) as images',
    );
    assert(tables.rows[0].projects >= 12 && tables.rows[0].images >= 36);
    console.log('PASS Postgres: migrated portfolio rows are available.');
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL + '/admin');
    await page.waitForURL('**/admin/login');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill('incorrect-test-password');
    await page.getByRole('button', { name: 'Sign in to the studio' }).click();
    await page.locator('.admin-error').waitFor();
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in to the studio' }).click();
    await page.waitForURL(baseURL + '/admin', { timeout: 30000 });
    await page.getByRole('heading', { name: 'Room for what’s next.' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Room for what’s next.' }).waitFor();
    await page.getByText('Live inbox', { exact: true }).waitFor({ timeout: 30000 });
    console.log(
      'PASS Auth: incorrect password denied; admin sign-in, protected access, and session restoration work.',
    );
    await page.getByRole('button', { name: 'Add project', exact: true }).first().click();
    await page.getByLabel('Project name', { exact: true }).fill(title);
    await page.locator('input[name=slug]').fill(slug);
    await page
      .getByLabel('The story', { exact: true })
      .fill('A temporary project for Neon end-to-end verification.');
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      (await db.query('select published from projects where slug=$1', [slug])).rows[0].published,
      false,
    );
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search projects' }).fill(title);
    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await page
      .locator('.admin-upload input[type=file]')
      .setInputFiles(path.resolve('public/logo.png'));
    await page.locator('.admin-upload input[name=alt]').fill('Neon storage integration test');
    await page.getByRole('button', { name: 'Upload image', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 30000 });
    const [image] = (
      await db.query('select storage_key,src from project_images where project_slug=$1', [slug])
    ).rows;
    assert(image?.storage_key);
    storageKey = image.storage_key;
    const stored = await s3.send(new GetObjectCommand({ Bucket: 'assets', Key: storageKey }));
    const storedBytes = await stored.Body.transformToByteArray();
    assert.equal(
      createHash('sha256').update(storedBytes).digest('hex'),
      createHash('sha256').update(fs.readFileSync('public/logo.png')).digest('hex'),
    );
    const anonymous = await browser.newContext();
    assert.equal(
      (await anonymous.request.get(baseURL + image.src)).status(),
      404,
      'Draft image must not be public',
    );
    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await page.getByLabel('Published on website', { exact: true }).check();
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal((await anonymous.request.get(baseURL + '/' + slug)).status(), 200);
    const oldProjectURL = await anonymous.request.get(baseURL + '/' + slug + '.html', {
      maxRedirects: 0,
    });
    assert.equal(oldProjectURL.status(), 308);
    assert.equal(new URL(oldProjectURL.headers().location, baseURL).pathname, '/' + slug);
    const publishedListing = await anonymous.request.get(baseURL + '/projects');
    assert.equal(publishedListing.status(), 200);
    assert(
      (await publishedListing.text()).includes(`href="/${slug}"`),
      'Publishing must refresh the clean projects listing with the new project link.',
    );
    const publishedSitemap = await anonymous.request.get(baseURL + '/sitemap.xml');
    assert.equal(publishedSitemap.status(), 200);
    const sitemapXML = await publishedSitemap.text();
    assert(sitemapXML.includes('/' + slug + '</loc>'));
    assert(!sitemapXML.includes('.html'));
    const media = await anonymous.request.get(baseURL + image.src);
    assert.equal(media.status(), 200);
    assert.equal(
      createHash('sha256')
        .update(await media.body())
        .digest('hex'),
      createHash('sha256').update(storedBytes).digest('hex'),
    );
    console.log(
      'PASS Storage + publishing: admin upload reached Neon S3; draft reads denied; published image round-tripped byte-for-byte through the app.',
    );

    const functionURL = new URL('health', process.env.NEON_FUNCTION_HELLO_BASE_URL);
    assert.equal((await fetch(functionURL)).status, 401);
    const health = await fetch(functionURL, {
      headers: { 'X-Secret': process.env.STUDIO_FUNCTION_SECRET },
    });
    assert.equal(health.status, 200);
    assert.equal((await health.json()).database, true);
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('button', { name: 'Inquiries' })
      .click();
    const contact = await anonymous.newPage();
    await contact.goto(baseURL + '/contact');
    await contact.locator('[name=name]').fill(inquiryName);
    await contact.locator('[name=email]').fill(inquiryEmail);
    await contact.locator('[name=service]').selectOption({ label: 'Architecture' });
    await contact
      .locator('[name=message]')
      .fill('Testing the Neon Function and live inquiry delivery.');
    await contact.evaluate(() => {
      window.open = () => null;
    });
    const submission = contact.waitForResponse(
      (response) =>
        response.url() === baseURL + '/api/inquiries' && response.request().method() === 'POST',
    );
    await contact.getByRole('button', { name: 'Continue to WhatsApp' }).click();
    assert.equal((await submission).status(), 201);
    await contact.getByRole('status').filter({ hasText: 'Your inquiry has been saved.' }).waitFor();
    assert.equal(
      (
        await db.query('select count(*)::int as n from contact_inquiries where email=$1', [
          inquiryEmail,
        ])
      ).rows[0].n,
      1,
    );
    console.log(
      'PASS Functions: anonymous native calls denied; app contact form saved through the secured deployed function.',
    );
    await page.getByText(inquiryName, { exact: true }).waitFor({ timeout: 20000 });
    await page.getByRole('button').filter({ hasText: inquiryName }).click();
    await page.locator('.admin-inquiry-detail select').selectOption('contacted');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      (await db.query('select status from contact_inquiries where email=$1', [inquiryEmail]))
        .rows[0].status,
      'contacted',
    );
    assert.equal(
      (
        await anonymous.request.post(baseURL + '/api/admin/live', {
          headers: { Origin: baseURL },
          data: { userId: 'unauthorized' },
        })
      ).status(),
      401,
    );
    console.log(
      'PASS Realtime: inquiry appeared in the signed-in inbox without refresh; status mutation persisted; unauthorized query renewal denied.',
    );
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/admin/login');
    await page.goto(baseURL + '/admin');
    await page.waitForURL('**/admin/login');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('PASS Auth sign-out: protected dashboard redirects after logout.');
    console.log('PASS ALL FIVE SERVICES: postgres, auth, object-storage, functions, realtime.');
  } catch (error) {
    await page
      ?.screenshot({ path: 'artifacts/neon-e2e-failure.png', fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    if (storageKey)
      await s3.send(new DeleteObjectCommand({ Bucket: 'assets', Key: storageKey })).catch(() => {});
    await db
      .query('delete from public.contact_inquiries where email=$1', [inquiryEmail])
      .catch(() => {});
    await db.query('delete from public.projects where slug=$1', [slug]).catch(() => {});
    await db.end();
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exit(1);
});
