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
    for (const tab of ['Projects', 'Inquiries', 'Overview']) {
      await page
        .getByRole('navigation', { name: 'Admin navigation' })
        .getByRole('button', { name: tab })
        .click();
      await assertLive();
    }
    console.log('PASS Dashboard rerenders keep one active Realtime connection.');
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
