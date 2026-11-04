const { chromium } = require('playwright-core');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].find(fs.existsSync);
  assert(executablePath, 'Chrome or Edge is required.');
  fs.mkdirSync('artifacts', { recursive: true });
  const browser = await chromium.launch({ executablePath, headless: true });
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3210';
  let protectedServer;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    assert.equal((await page.goto(baseURL + '/admin')).status(), 200);
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    await page.getByRole('heading', { name: 'Room for what’s next.' }).waitFor();
    await page.screenshot({ path: 'artifacts/admin-desktop.png', fullPage: true });
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('textbox', { name: 'Search projects' }).fill('curve');
    assert.equal(await page.locator('.admin-table tbody tr').count(), 1);
    await page.getByRole('button', { name: 'Edit CURVE Residence', exact: true }).click();
    await page.getByRole('dialog').waitFor();
    assert(await page.getByRole('button', { name: 'Save project', exact: true }).isDisabled());
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.getByRole('button', { name: 'draft', exact: true }).click();
    assert(await page.getByText('No projects found', { exact: true }).isVisible());
    await page.getByRole('button', { name: 'Inquiries', exact: true }).click();
    assert(
      await page.getByText('Your next conversation belongs here.', { exact: true }).isVisible(),
    );
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    assert(
      await page.getByRole('heading', { name: 'Connect your studio', exact: true }).isVisible(),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.waitForFunction(() => {
      const sidebar = document.querySelector('.admin-sidebar');
      return sidebar && sidebar.getBoundingClientRect().right <= 1;
    });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: 'artifacts/admin-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Add project', exact: true }).first().click();
    assert(await page.getByRole('dialog').isVisible());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.getByRole('button', { name: 'Close project editor' }).click();
    await page.goto(baseURL + '/admin/login');
    assert(await page.getByRole('button', { name: 'Sign in to the studio' }).isDisabled());
    assert.deepEqual(errors, [], 'Browser errors');

    // Once configured, the same dashboard must redirect anonymous visitors before reading private data.
    const port = 3297;
    protectedServer = spawn(
      process.execPath,
      [path.resolve('node_modules/next/dist/bin/next'), 'start', '--port', String(port)],
      {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: 'pipe',
        env: {
          ...process.env,
          SUPABASE_URL: 'http://127.0.0.1:1',
          SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
          SUPABASE_SECRET_KEY: 'test-server-only-key',
          ADMIN_EMAILS: 'admin@example.com',
        },
      },
    );
    protectedServer.stdout.on('data', () => {});
    protectedServer.stderr.on('data', () => {});
    let response;
    for (let i = 0; i < 30; i++) {
      try {
        response = await fetch(`http://localhost:${port}/admin`, { redirect: 'manual' });
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    assert(response, 'Protected test server started');
    assert.equal(response.status, 307);
    assert(
      new URL(response.headers.get('location'), `http://localhost:${port}`).pathname ===
        '/admin/login',
    );
    console.log(
      'Passed admin desktop/mobile, search/filter, editor/keyboard, read-only preview, private-inbox empty state, noindex, and configured-route authentication checks.',
    );
  } finally {
    protectedServer?.kill();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
