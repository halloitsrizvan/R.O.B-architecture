const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');

(async () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const errors = [];
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', (error) => errors.push(error.message));
      let release;
      const scriptsReady = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(/\/_next\/static\/.*\.js(?:\?|$)/, async (route) => {
        await scriptsReady;
        await route.continue().catch(() => {});
      });
      try {
        await page.goto(baseURL, { waitUntil: 'commit' });
        const intro = page.locator('.intro');
        await intro.waitFor({ state: 'visible' });
        await page.waitForTimeout(1500);
        const coversPage = await intro.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return (
            getComputedStyle(element).position === 'fixed' &&
            box.top === 0 &&
            box.left === 0 &&
            box.width === innerWidth &&
            box.height === innerHeight &&
            document.elementFromPoint(10, 10)?.closest('.intro') === element
          );
        });
        assert(coversPage, 'The intro must cover the page before JavaScript runs.');
        assert(await intro.evaluate((element) => !element.classList.contains('is-done')));
        release();
        await intro.waitFor({ state: 'hidden', timeout: 45000 });
        assert(await page.locator('.hero h1').isVisible());
        assert(!(await page.locator('body').getAttribute('class')).includes('locked'));
        console.log(
          `PASS ${viewport.width}px: intro covers first paint with delayed JavaScript and reveals the homepage afterwards.`,
        );
      } finally {
        release();
        await context.close();
      }
    }
    const noScript = await browser.newContext({ javaScriptEnabled: false });
    const staticPage = await noScript.newPage();
    await staticPage.goto(baseURL);
    assert.equal(await staticPage.locator('.intro').isVisible(), false);
    assert(await staticPage.locator('main').isVisible());
    await staticPage.goto(baseURL + '/about');
    assert.equal(await staticPage.locator('.intro').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS JavaScript-disabled fallback and non-home pages; no browser runtime errors.');
    await noScript.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
