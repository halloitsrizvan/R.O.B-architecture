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
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].find(fs.existsSync);
  assert(executablePath, 'Install Chrome or Edge to run the browser smoke test.');
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const [slug, data] of Object.entries(pages)) {
      const response = await page.goto(`${baseURL}/${slug}`);
      assert.equal(response.status(), 200, slug);
      assert.equal(new URL(page.url()).pathname, '/' + slug);
      assert.equal(await page.title(), data.title);
      assert.equal(await page.locator('h1').count(), 1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert.equal(new URL(canonical).pathname, '/' + slug);
      assert.equal(
        await page.locator('meta[property="og:url"]').getAttribute('content'),
        canonical,
      );
      assert(
        !(await page.locator('script[type="application/ld+json"]').textContent()).includes('.html'),
      );
      assert.deepEqual(
        await page
          .locator('a[href]')
          .evaluateAll((links) =>
            links
              .map((link) => link.getAttribute('href'))
              .filter(
                (href) =>
                  href.startsWith('/') && new URL(href, location.origin).pathname.endsWith('.html'),
              ),
          ),
        [],
        `Outdated links on ${slug || '/'}`,
      );
      if (slug) {
        const oldURL = await page.request.get(`${baseURL}/${slug}.html?ref=old-link`, {
          maxRedirects: 0,
        });
        assert.equal(oldURL.status(), 308, `Legacy redirect: ${slug}`);
        const destination = new URL(oldURL.headers().location, baseURL);
        assert.equal(destination.pathname, '/' + slug);
        assert.equal(destination.searchParams.get('ref'), 'old-link');
      }
    }
    await page.goto(`${baseURL}/`);
    await page.waitForFunction(
      () =>
        !document.body.classList.contains('locked') &&
        document.querySelectorAll('.hero-slide').length === 3,
    );
    assert.equal(await page.locator('#navigation a[aria-current="page"]').textContent(), 'Home');
    assert.equal(
      await page.locator('.hero').evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      0,
    );
    assert.equal(
      await page.locator('.site-header').evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgba(0, 0, 0, 0)',
    );
    assert(
      await page
        .locator('#navigation')
        .evaluate(
          (el) =>
            Math.abs(
              el.getBoundingClientRect().left +
                el.getBoundingClientRect().width / 2 -
                innerWidth / 2,
            ) < 2,
        ),
    );
    await page.screenshot({ path: 'artifacts/header-desktop.png' });
    await page.evaluate(() => scrollTo(0, 140));
    await page.waitForFunction(() => {
      const header = document.querySelector('.site-header');
      return (
        header.classList.contains('is-scrolled') &&
        getComputedStyle(header).backgroundColor === 'rgb(245, 244, 240)'
      );
    });
    await page.waitForFunction(() => {
      const header = document.querySelector('.site-header');
      return (
        Math.round(header.getBoundingClientRect().height) === 64 &&
        getComputedStyle(header, '::before').opacity === '1'
      );
    });
    assert.equal(
      await page
        .locator('.brand img')
        .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
      64,
    );
    assert.equal(
      await page.locator('.site-header').evaluate((el) => getComputedStyle(el, '::before').opacity),
      '1',
    );
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(
      () => !document.querySelector('.site-header').classList.contains('is-scrolled'),
    );
    await page.waitForTimeout(5100);
    assert(await page.locator('.whatsapp-popup').isVisible());
    await page.locator('.whatsapp-popup-close').click();
    assert(!(await page.locator('.whatsapp-popup').isVisible()));
    await page.locator('.selected').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    assert.equal(
      await page
        .locator('.selected .project-card')
        .first()
        .evaluate((el) => getComputedStyle(el).opacity),
      '1',
    );
    await page.screenshot({ path: 'artifacts/next-desktop.png', fullPage: false });
    await page.goto(`${baseURL}/projects`);
    await page.locator('[data-filter="interior"]').click();
    const visible = await page.locator('.project-card:not([hidden])').count();
    assert(visible > 0 && visible < 12);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.waitForFunction(() => document.body.classList.contains('gsap-motion'));
    await page.evaluate(() => scrollTo({ top: 140, behavior: 'instant' }));
    await page.waitForFunction(
      () =>
        Math.round(document.querySelector('.site-header').getBoundingClientRect().height) === 60,
    );
    await page.locator('.menu-toggle').click();
    await page.waitForFunction(
      () =>
        Math.round(document.querySelector('.site-header').getBoundingClientRect().height) === 74,
    );
    assert(await page.locator('#navigation').isVisible());
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.goto(`${baseURL}/project-urban-plaza`);
    assert.equal(
      await page.locator('#navigation a[aria-current="page"]').textContent(),
      'Projects',
    );
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: 'artifacts/next-mobile.png', fullPage: true });
    await page.goto(`${baseURL}/contact`);
    await page.locator('[name="name"]').fill('Website test');
    await page.locator('[name="email"]').fill('test@example.com');
    await page.locator('[name="service"]').selectOption({ label: 'Architecture' });
    await page.locator('[name="message"]').fill('Testing the migrated inquiry form.');
    await page.evaluate(() => {
      window.open = (url) => {
        window.testWhatsAppURL = url;
        return null;
      };
    });
    await page.route('**/api/inquiries', (route) =>
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.locator('.submit-button').click();
    assert(
      await page.evaluate(
        () =>
          window.testWhatsAppURL.includes('wa.me') &&
          window.testWhatsAppURL.includes('Website%20test'),
      ),
    );
    const inquiryURL = baseURL + '/api/inquiries';
    const validInquiry = {
      name: 'Website Test',
      email: 'test@example.com',
      service: 'Architecture',
      message: 'A test project inquiry.',
    };
    assert.equal((await page.request.post(inquiryURL, { data: validInquiry })).status(), 403);
    assert.equal(
      (
        await page.request.post(inquiryURL, {
          headers: { Origin: baseURL },
          data: { ...validInquiry, email: 'invalid' },
        })
      ).status(),
      400,
    );
    assert.equal(
      (
        await page.request.post(inquiryURL, {
          headers: { Origin: baseURL },
          data: { ...validInquiry, website: 'bot' },
        })
      ).status(),
      200,
    );
    assert.equal((await page.goto(`${baseURL}/missing-page`)).status(), 404);
    const redirect = await page.request.get(`${baseURL}/index.html`, { maxRedirects: 0 });
    assert.equal(redirect.status(), 308);
    assert.equal(new URL(redirect.headers().location, baseURL).pathname, '/');
    const sitemap = await page.request.get(`${baseURL}/sitemap.xml`);
    assert.equal(sitemap.status(), 200);
    const sitemapXML = await sitemap.text();
    assert(!sitemapXML.includes('.html'), 'Sitemap URLs must not include .html.');
    const sitemapPaths = new Set(
      [...sitemapXML.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname),
    );
    for (const slug of Object.keys(pages)) {
      assert(sitemapPaths.has('/' + slug), `Missing sitemap URL: ${slug || '/'}`);
    }
    assert.equal((await page.request.get(`${baseURL}/robots.txt`)).status(), 200);
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(
      'Passed 17 clean routes, canonical/OG/schema URLs, internal links, permanent redirects with query strings, slideshow, popup, reveals, filters, mobile menu/layout, inquiry form, sitemap, robots, and 404 checks.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
