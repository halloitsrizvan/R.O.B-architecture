const { chromium } = require('playwright-core');
const { Client } = require('pg');
const { v2: cloudinary } = require('cloudinary');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3240';
  const email = process.env.ADMIN_TEST_EMAIL;
  const password = process.env.ADMIN_TEST_PASSWORD;
  assert(email && password, 'Set ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD for a live admin test.');
  if (!process.env.CLOUDINARY_URL)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  assert(
    cloudinary.config().cloud_name && cloudinary.config().api_key && cloudinary.config().api_secret,
    'Configure Cloudinary before running the live image test.',
  );
  const publicId = (key) => 'rob_arch/' + key.replace(/^cloudinary:/, '').replace(/\.[^.]+$/, '');
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
  const browser = await chromium.launch({ executablePath, headless: true });
  const tag = randomUUID().slice(0, 8);
  const slug = 'project-neon-e2e-' + tag;
  const title = 'Neon integration ' + tag;
  const inquiryEmail = 'neon-test-' + tag + '@example.com';
  const inquiryName = 'Neon live inquiry ' + tag;
  let storageKey;
  let storageKeys = [];
  let page;
  try {
    await db.connect();
    const tables = await db.query(
      'select (select count(*)::int from projects) as projects,(select count(*)::int from project_images) as images,(select coalesce(max(sort_order),-1) from projects) as highest_order',
    );
    console.log('PASS Postgres: the current project collection can be read.');
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    page = await adminContext.newPage();
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
    assert.equal(await page.locator('[role=dialog] input[name=sortOrder]').count(), 0);
    await page.getByLabel('Project name', { exact: true }).fill(title);
    await page.locator('input[name=slug]').fill(slug);
    await page
      .locator('input[name=images]')
      .setInputFiles([path.resolve('public/logo.png'), path.resolve('public/assets/image1.jpg')]);
    assert.equal(await page.locator('.admin-image-previews img').count(), 2);
    await page
      .getByLabel('The story', { exact: true })
      .fill('A temporary project for Neon end-to-end verification.');
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const [draft] = (
      await db.query('select published,sort_order from projects where slug=$1', [slug])
    ).rows;
    assert.equal(draft.published, false);
    assert(draft.sort_order > tables.rows[0].highest_order, 'New projects append automatically.');
    storageKeys = (
      await db.query(
        'select storage_key from project_images where project_slug=$1 order by sort_order',
        [slug],
      )
    ).rows.map((image) => image.storage_key);
    assert.equal(storageKeys.length, 2, 'Images must be attached during the initial project save.');
    assert(storageKeys.every((key) => key.startsWith('cloudinary:')));
    console.log(
      'PASS Project creation: selected images were saved with the new project through Cloudinary.',
    );
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search projects' }).fill(title);
    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await page
      .locator('.admin-upload input[type=file]')
      .setInputFiles(path.resolve('public/logo.png'));
    await page.locator('.admin-upload input[name=alt]').fill('Cloudinary storage integration test');
    await page.getByRole('button', { name: 'Upload image', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 30000 });
    const [image] = (
      await db.query(
        'select id,storage_key,src from project_images where project_slug=$1 order by sort_order',
        [slug],
      )
    ).rows;
    assert(image?.storage_key);
    storageKey = image.storage_key;
    storageKeys = (
      await db.query('select storage_key from project_images where project_slug=$1', [slug])
    ).rows.map((item) => item.storage_key);
    assert.equal(storageKeys.length, 3);
    const stored = await cloudinary.api.resource(publicId(storageKey), {
      resource_type: 'image',
      type: 'authenticated',
    });
    assert.equal(stored.public_id, publicId(storageKey));
    const draftRead = await page.request.get(baseURL + image.src);
    assert.equal(draftRead.status(), 200);
    const storedBytes = await draftRead.body();
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
    // Use a nonzero position so an accidental reset to zero cannot pass this check.
    await db.query('update project_images set sort_order=7 where id=$1', [image.id]);
    await page.reload();
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search projects' }).fill(title);
    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    assert.equal(await page.locator('[role=dialog] input[name=sortOrder]').count(), 0);
    const imageRow = page.locator(`.admin-image-row:has(input[name="id"][value="${image.id}"])`);
    await imageRow
      .getByLabel('Image description', { exact: true })
      .fill('Updated image description');
    await imageRow.getByRole('button', { name: 'Save image details', exact: true }).click();
    await page
      .locator('[role=dialog] [role=status]')
      .filter({ hasText: 'Image details saved.' })
      .waitFor();
    const [updatedImage] = (
      await db.query('select alt,sort_order from project_images where id=$1', [image.id])
    ).rows;
    assert.equal(updatedImage.alt, 'Updated image description');
    assert.equal(updatedImage.sort_order, 7, 'Editing descriptions must preserve image positions.');
    await page.setViewportSize({ width: 390, height: 844 });
    const rowFits = await imageRow.evaluate((row) => {
      const bounds = row.getBoundingClientRect();
      return [...row.querySelectorAll('img,label,button')].every((child) => {
        const rect = child.getBoundingClientRect();
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      });
    });
    assert(rowFits, 'Image details must fit the mobile editor without empty order columns.');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Close project editor', exact: true }).click();
    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await page.getByLabel('Published on website', { exact: true }).check();
    await page.getByLabel('Feature on homepage', { exact: true }).check();
    await page.getByRole('button', { name: 'Save project', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      (await db.query('select sort_order from projects where slug=$1', [slug])).rows[0].sort_order,
      draft.sort_order,
      'Saving project details must preserve the project position.',
    );
    console.log(
      'PASS Project editor: no order controls; automatic project placement and existing project/image positions are preserved.',
    );
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
    assert((await (await anonymous.request.get(baseURL + '/')).text()).includes(`href="/${slug}"`));
    const media = await anonymous.request.get(baseURL + image.src);
    assert.equal(media.status(), 200);
    assert.equal(
      createHash('sha256')
        .update(await media.body())
        .digest('hex'),
      createHash('sha256').update(storedBytes).digest('hex'),
    );
    console.log(
      'PASS Cloudinary + publishing: initial and later uploads reached Cloudinary; draft reads denied; published image round-tripped byte-for-byte through the app.',
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
      .getByRole('link', { name: 'Inquiries' })
      .click();
    const contact = await anonymous.newPage();
    await contact.goto(baseURL + '/contact');
    await contact.waitForFunction(() => document.body.classList.contains('gsap-motion'));
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
      { timeout: 60000 },
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
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search projects' }).fill(title);
    await page.getByRole('button', { name: 'Remove ' + title, exact: true }).click();
    const removal = page.getByRole('dialog', { name: 'Remove project?', exact: true });
    await removal.waitFor();
    assert(await removal.getByText(title, { exact: true }).isVisible());
    assert(
      await removal
        .getByRole('button', { name: 'Keep project' })
        .evaluate((button) => button === document.activeElement),
    );
    await page.keyboard.press('Escape');
    await removal.waitFor({ state: 'hidden' });
    assert.equal(
      (await db.query('select count(*)::int as n from projects where slug=$1', [slug])).rows[0].n,
      1,
    );
    await page.getByRole('button', { name: 'Remove ' + title, exact: true }).click();
    await removal.getByRole('button', { name: 'Keep project' }).click();
    await removal.waitFor({ state: 'hidden' });
    assert.equal(
      (await db.query('select count(*)::int as n from projects where slug=$1', [slug])).rows[0].n,
      1,
    );

    const staleEditor = await page.context().newPage();
    await staleEditor.goto(baseURL + '/admin');
    await staleEditor.getByRole('link', { name: 'Projects', exact: true }).click();
    await staleEditor.getByRole('textbox', { name: 'Search projects' }).fill(title);
    await staleEditor.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await staleEditor.getByLabel('Published on website', { exact: true }).uncheck();

    await page.getByRole('button', { name: 'Edit ' + title, exact: true }).click();
    await page.getByRole('button', { name: 'Remove project', exact: true }).click();
    await removal.waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await removal.evaluate((dialog) => {
        const bounds = dialog.getBoundingClientRect();
        return (
          bounds.left >= 0 &&
          bounds.right <= innerWidth &&
          bounds.top >= 0 &&
          bounds.bottom <= innerHeight
        );
      }),
    );
    await page.screenshot({ path: 'artifacts/project-removal-mobile.png' });
    let removalRequest;
    const captureRemoval = (request) => {
      if (request.method() === 'POST' && request.headers()['next-action']) {
        removalRequest = {
          url: request.url(),
          headers: request.headers(),
          body: request.postData(),
        };
      }
    };
    page.on('request', captureRemoval);
    await removal.getByRole('button', { name: 'Remove permanently', exact: true }).click();
    await removal.waitFor({ state: 'hidden', timeout: 45000 });
    page.off('request', captureRemoval);
    await page.getByText('Project removed.', { exact: true }).waitFor();
    await page
      .getByRole('button', { name: 'Remove ' + title, exact: true })
      .waitFor({ state: 'hidden' });
    assert.equal(
      await page.getByRole('button', { name: 'Remove ' + title, exact: true }).count(),
      0,
    );
    assert.equal(
      (await db.query('select count(*)::int as n from projects where slug=$1', [slug])).rows[0].n,
      0,
    );
    assert.equal(
      (
        await db.query('select count(*)::int as n from project_images where project_slug=$1', [
          slug,
        ])
      ).rows[0].n,
      0,
    );
    for (const key of storageKeys)
      await assert.rejects(
        cloudinary.api.resource(publicId(key), { resource_type: 'image', type: 'authenticated' }),
        (error) => error.error?.http_code === 404 || error.http_code === 404,
      );
    assert.equal((await anonymous.request.get(baseURL + '/' + slug)).status(), 404);
    assert(
      !(await (await anonymous.request.get(baseURL + '/projects')).text()).includes(
        `href="/${slug}"`,
      ),
    );
    assert(
      !(await (await anonymous.request.get(baseURL + '/')).text()).includes(`href="/${slug}"`),
    );
    assert(
      !(await (await anonymous.request.get(baseURL + '/sitemap.xml')).text()).includes(
        '/' + slug + '</loc>',
      ),
    );
    assert.equal((await anonymous.request.get(baseURL + image.src)).status(), 404);
    assert.equal(
      (await anonymous.request.get(baseURL + '/assets/image1.jpg')).status(),
      200,
      'Bundled images must remain intact.',
    );

    assert(removalRequest, 'The removal server action must have been exercised.');
    const unauthenticatedRemoval = await anonymous.request.post(removalRequest.url, {
      headers: {
        Origin: baseURL,
        'Next-Action': removalRequest.headers['next-action'],
        'Content-Type': removalRequest.headers['content-type'],
      },
      data: removalRequest.body,
      maxRedirects: 0,
    });
    assert(
      [303, 307, 401, 403].includes(unauthenticatedRemoval.status()) ||
        unauthenticatedRemoval.headers()['x-action-redirect']?.includes('/admin/login'),
      'Anonymous project removal must be denied or redirected to sign-in.',
    );
    await staleEditor.getByRole('button', { name: 'Save project', exact: true }).click();
    await staleEditor
      .locator('[role=dialog] [role=status]')
      .filter({ hasText: 'This project no longer exists.' })
      .waitFor();
    assert.equal(
      (await db.query('select count(*)::int as n from projects where slug=$1', [slug])).rows[0].n,
      0,
      'An older editor must not recreate a removed project.',
    );
    await staleEditor.close();
    console.log(
      'PASS Project removal: confirmation/cancel, mobile dialog, authorized deletion, image cleanup, public 404/listing/sitemap refresh, and stale-editor protection.',
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/admin/login');
    await page.goto(baseURL + '/admin');
    await page.waitForURL('**/admin/login');
    assert.deepEqual(errors, [], 'No browser runtime errors');
    console.log('PASS Auth sign-out: protected dashboard redirects after logout.');
    console.log(
      'PASS APPLICATION SERVICES: Postgres, Neon Auth, Cloudinary images, Functions, and Realtime.',
    );
  } catch (error) {
    await page
      ?.screenshot({ path: 'artifacts/neon-e2e-failure.png', fullPage: true })
      .catch(() => {});
    throw error;
  } finally {
    const remaining = await db
      .query('select storage_key from project_images where project_slug=$1', [slug])
      .catch(() => ({ rows: [] }));
    const cleanupKeys = [
      ...new Set([...storageKeys, ...remaining.rows.map((image) => image.storage_key)]),
    ].filter((key) => key?.startsWith('cloudinary:'));
    await Promise.allSettled(
      cleanupKeys.map((key) =>
        cloudinary.uploader.destroy(publicId(key), {
          resource_type: 'image',
          type: 'authenticated',
          invalidate: true,
        }),
      ),
    );
    await db
      .query('delete from public.contact_inquiries where email=$1', [inquiryEmail])
      .catch(() => {});
    await db.query('delete from public.projects where slug=$1', [slug]).catch(() => {});
    await db.end();
    await browser.close();
  }
})().catch((error) => {
  let message = String(
    error.stack ?? error.message ?? error.error?.message ?? 'Integration test failed.',
  );
  for (const value of [
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_API_SECRET,
    process.env.CLOUDINARY_URL,
  ])
    if (value) message = message.replaceAll(value, '[redacted]');
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'));
  process.exit(1);
});
