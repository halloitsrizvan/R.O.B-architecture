const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const baseURL = process.env.TEST_BASE_URL || 'http://localhost:3242';
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(baseURL);
    const hero = page.locator('.hero-image').first();
    assert.equal(await hero.getAttribute('loading'), 'eager');
    assert.equal(await hero.getAttribute('fetchpriority'), 'high');
    assert.equal(await hero.getAttribute('sizes'), '100vw');
    await hero.evaluate((image) => image.decode());
    const heroURL = await hero.evaluate((image) => image.currentSrc);
    assert(heroURL.includes('/_next/image?'));
    const response = await context.request.get(heroURL, { headers: { Accept: 'image/webp' } });
    assert.equal(response.status(), 200);
    assert.equal(response.headers()['content-type'], 'image/webp');
    const optimized = (await response.body()).length;
    const original = fs.statSync('public/assets/hero-banner.jpg').size;
    assert(optimized < original, 'Mobile hero should be smaller than the original file.');
    console.log(
      `PASS mobile hero: ${optimized} optimized bytes vs ${original} original bytes (${Math.round((1 - optimized / original) * 100)}% smaller).`,
    );

    await page.waitForFunction(() => document.querySelectorAll('.hero-slide').length === 3);
    assert.equal(await page.locator('.hero-slide:not([src])').count(), 1);
    const initial = await page.locator('.hero-slide.is-active').getAttribute('src');
    await page.waitForFunction(
      (source) => document.querySelector('.hero-slide.is-active')?.getAttribute('src') !== source,
      initial,
      { timeout: 20000 },
    );
    await page.locator('.process').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    const paused = await page.locator('.hero-slide.is-active').getAttribute('src');
    await page.waitForTimeout(3500);
    assert.equal(await page.locator('.hero-slide.is-active').getAttribute('src'), paused);
    console.log('PASS slideshow: one upcoming photo loads at a time; animation pauses offscreen.');

    for (const pathname of ['/projects', '/about', '/services', '/project-tropical-home']) {
      const navigation = await page.goto(baseURL + pathname);
      assert.equal(navigation.status(), 200, pathname);
      if (pathname === '/projects') {
        assert(
          await page
            .locator('.project-grid img')
            .evaluateAll(
              (images) => images.length > 0 && images.every((image) => image.loading === 'lazy'),
            ),
        );
      }
      if (pathname === '/about')
        assert.equal(await page.locator('.wide-image').getAttribute('loading'), 'lazy');
      if (pathname === '/services')
        assert(
          await page
            .locator('.service-row img')
            .evaluateAll((images) =>
              images.every(
                (image) => image.loading === 'lazy' && image.src.includes('/_next/image?'),
              ),
            ),
        );
      if (pathname.startsWith('/project-')) {
        assert.equal(
          await page.locator('.project-detail-gallery img').first().getAttribute('loading'),
          'eager',
        );
        assert(
          await page
            .locator('.project-detail-gallery img')
            .evaluateAll((images) => images.slice(1).every((image) => image.loading === 'lazy')),
        );
        assert(
          await page
            .locator('.project-detail-gallery img[src^="/api/media/"]')
            .evaluateAll((images) => images.every((image) => !image.getAttribute('srcset'))),
        );
      }
    }
    const blocked = await context.request.get(
      baseURL + '/_next/image?url=%2Fapi%2Fmedia%2Fprivate&w=640&q=75',
    );
    assert.equal(blocked.status(), 400);
    console.log(
      'PASS page galleries lazy-load and authenticated uploads bypass the image optimizer.',
    );

    const reduced = await browser.newContext({ reducedMotion: 'reduce' });
    const stillPage = await reduced.newPage();
    stillPage.on('pageerror', (error) => errors.push(error.message));
    await stillPage.goto(baseURL);
    await stillPage.waitForFunction(() => document.querySelectorAll('.hero-slide').length === 1);
    await stillPage.waitForTimeout(3500);
    assert.equal(await stillPage.locator('.hero-image').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS reduced-motion mode keeps a single hero photo; no browser runtime errors.');
    await reduced.close();
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
