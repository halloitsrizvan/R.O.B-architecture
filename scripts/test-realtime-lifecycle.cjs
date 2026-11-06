const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const { ADMIN_TEST_EMAIL: email, ADMIN_TEST_PASSWORD: password, NEON_REALTIME_URL } = process.env;
  assert(
    email && password && NEON_REALTIME_URL,
    'Set the test admin credentials and Realtime URL.',
  );
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ].find(fs.existsSync);
  assert(executablePath, 'Chrome or Edge is required.');
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript((realtimeURL) => {
    const sockets = new Set();
    const NativeWebSocket = window.WebSocket;
    const host = new URL(realtimeURL).host;
    window.WebSocket = class extends NativeWebSocket {
      constructor(...args) {
        super(...args);
        if (new URL(this.url).host === host) {
          sockets.add(this);
          this.addEventListener('close', () => sockets.delete(this));
        }
      }
    };
    window.activeRealtimeConnections = () =>
      [...sockets].filter((socket) => socket.readyState === NativeWebSocket.OPEN).length;
  }, NEON_REALTIME_URL);

  async function signIn() {
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in to the studio' }).click();
    await page.waitForURL(baseURL + '/admin', { timeout: 60000 });
  }

  async function assertLive() {
    await page.getByText('Live inbox', { exact: true }).waitFor({ timeout: 45000 });
    await page.waitForFunction(() => window.activeRealtimeConnections() === 1);
    assert.deepEqual(errors, [], 'Dashboard must not raise browser runtime errors.');
  }

  try {
    await page.goto(baseURL + '/admin');
    await page.waitForURL('**/admin/login');
    await signIn();
    await assertLive();
    console.log('PASS Realtime survives the development Strict Mode effect cycle.');
    const sections = [
      ['Projects', '/admin/projects'],
      ['Inquiries', '/admin/inquiries'],
      ['Settings', '/admin/settings'],
      ['Overview', '/admin'],
    ];
    assert.equal(await page.locator('button[aria-label^="Remove "]').count(), 0);
    if (await page.getByRole('button', { name: /^Edit / }).count()) {
      await page
        .getByRole('button', { name: /^Edit / })
        .first()
        .click();
      assert.equal(
        await page.getByRole('button', { name: 'Remove project', exact: true }).count(),
        0,
      );
      await page.getByRole('button', { name: 'Close project editor' }).click();
    }
    for (const [tab, pathname] of sections) {
      await page
        .getByRole('navigation', { name: 'Admin navigation' })
        .getByRole('link', { name: tab })
        .click();
      await page.waitForURL(baseURL + pathname);
      await page.locator('.admin-topbar strong').filter({ hasText: tab }).waitFor();
      await assertLive();
      assert.equal(
        await page
          .getByRole('link', { name: tab, exact: tab !== 'Inquiries' })
          .getAttribute('aria-current'),
        'page',
      );
      assert.equal(
        (await page.locator('button[aria-label^="Remove "]').count()) > 0,
        tab === 'Projects' && (await page.getByRole('button', { name: /^Edit / }).count()) > 0,
      );
      if (tab === 'Projects' && (await page.getByRole('button', { name: /^Edit / }).count()) > 0) {
        await page
          .getByRole('button', { name: /^Edit / })
          .first()
          .click();
        assert(await page.getByRole('button', { name: 'Remove project', exact: true }).isVisible());
        await page.getByRole('button', { name: 'Close project editor' }).click();
      }
      await page.reload();
      assert.equal(new URL(page.url()).pathname, pathname);
      await assertLive();
      assert(
        (await page.locator('meta[name="robots"]').getAttribute('content')).includes('noindex'),
      );
      console.log(
        `PASS ${pathname}: direct URL, reload, active navigation, live inbox, and project-removal visibility.`,
      );
    }
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.waitForURL(baseURL + '/admin/projects');
    await page.getByRole('link', { name: 'Inquiries' }).click();
    await page.waitForURL(baseURL + '/admin/inquiries');
    await page.goBack();
    await page.waitForURL(baseURL + '/admin/projects');
    await assertLive();
    await page.goForward();
    await page.waitForURL(baseURL + '/admin/inquiries');
    await assertLive();
    console.log(
      'PASS Back/forward navigation restores the correct admin section and one live connection.',
    );

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: 'Projects', exact: true }).click();
    await page.waitForURL(baseURL + '/admin/projects');
    await page.locator('.admin-main h1').waitFor();
    await page.evaluate(() => scrollTo({ top: 350, behavior: 'instant' }));
    assert.equal(
      await page
        .locator('.admin-topbar')
        .evaluate((header) => Math.round(header.getBoundingClientRect().top)),
      0,
    );
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByRole('link', { name: 'Overview', exact: true }).click();
    await page.waitForURL(baseURL + '/admin');
    await assertLive();
    assert.equal(await page.locator('button[aria-label^="Remove "]').count(), 0);
    console.log('PASS Mobile navigation uses real URLs and retains the fixed header.');
    await page.setViewportSize({ width: 1440, height: 1000 });

    const anonymous = await browser.newContext();
    for (const [, pathname] of sections) {
      const response = await anonymous.request.get(baseURL + pathname, { maxRedirects: 0 });
      assert([302, 303, 307, 308].includes(response.status()));
      assert.equal(new URL(response.headers().location, baseURL).pathname, '/admin/login');
    }
    await anonymous.close();
    console.log('PASS Every admin section requires sign-in.');
    await page.reload();
    await assertLive();
    console.log('PASS Reload restores the live connection without runtime errors.');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/admin/login', { timeout: 30000 });
    await page.waitForFunction(() => window.activeRealtimeConnections() === 0);
    await signIn();
    await assertLive();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL('**/admin/login', { timeout: 30000 });
    await page.waitForFunction(() => window.activeRealtimeConnections() === 0);
    assert.deepEqual(errors, []);
    console.log('PASS Sign-out closes the connection; signing in creates a working replacement.');
  } catch (error) {
    fs.mkdirSync('artifacts', { recursive: true });
    await page.screenshot({ path: 'artifacts/realtime-lifecycle-failure.png' }).catch(() => {});
    if (errors.length) console.error('Browser errors:', errors.join('; '));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
