const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const pages = require('../data/pages.json');
const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
fs.mkdirSync('artifacts', { recursive: true });

(async () => {
  const executablePath = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].find(fs.existsSync);
  assert(executablePath, 'Install Chrome or Edge to run the browser smoke test.');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [slug, data] of Object.entries(pages)) {
      const response = await page.goto(`${baseURL}/${slug}`);
      assert.equal(response.status(), 200, slug);
      assert.equal(await page.title(), data.title);
      assert.equal(await page.locator('h1').count(), 1);
    }
    await page.goto(`${baseURL}/`);
    await page.waitForFunction(() => !document.body.classList.contains('locked') && document.querySelectorAll('.hero-slide').length === 3);
    await page.waitForTimeout(5100);
    assert(await page.locator('.whatsapp-popup').isVisible());
    await page.locator('.whatsapp-popup-close').click();
    assert(!(await page.locator('.whatsapp-popup').isVisible()));
    await page.locator('.selected').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.selected .project-card').first().evaluate(el => getComputedStyle(el).opacity), '1');
    await page.screenshot({ path: 'artifacts/next-desktop.png', fullPage: false });
    await page.goto(`${baseURL}/projects.html`);
    await page.locator('[data-filter="interior"]').click();
    const visible = await page.locator('.project-card:not([hidden])').count();
    assert(visible > 0 && visible < 12);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.locator('.menu-toggle').click();
    assert(await page.locator('#navigation').isVisible());
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.goto(`${baseURL}/project-urban-plaza.html`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: 'artifacts/next-mobile.png', fullPage: true });
    await page.goto(`${baseURL}/contact.html`);
    await page.locator('[name="name"]').fill('Website test');
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('[name="service"]').selectOption({ label: 'Architecture' });
    await page.locator('[name="message"]').fill('Testing the migrated inquiry form.');
    await page.evaluate(() => { window.open = url => { window.testWhatsAppURL = url; return null; }; });
    await page.locator('.submit-button').click();
    assert(await page.evaluate(() => window.testWhatsAppURL.includes('wa.me') && window.testWhatsAppURL.includes('Website%20test')));
    assert.equal((await page.goto(`${baseURL}/missing-page`)).status(), 404);
    const redirect = await page.request.get(`${baseURL}/index.html`, { maxRedirects: 0 });
    assert.equal(redirect.status(), 308);
    assert.equal((await page.request.get(`${baseURL}/sitemap.xml`)).status(), 200);
    assert.equal((await page.request.get(`${baseURL}/robots.txt`)).status(), 200);
    assert.deepEqual(errors, [], 'Browser errors');
    console.log('Passed 17 routes, metadata, slideshow, popup, reveals, filters, mobile menu/layout, inquiry form, redirects, sitemap, robots, and 404 checks.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
