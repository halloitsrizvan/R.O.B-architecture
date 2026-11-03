const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
const titles = new Set();
for (const file of pages) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  assert(title && !titles.has(title), file + ': missing or duplicate title');
  titles.add(title);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, file + ': canonical');
  assert.equal((html.match(/<h1\b/g) || []).length, 1, file + ': main heading');
  assert(html.includes('property="og:image"'), file + ': social image');
  const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert(schema['@graph'].length >= 3);
  assert(!JSON.stringify(schema).includes('aggregateRating'), 'Demo reviews must not become review schema');
  for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:|#)/.test(href)) continue;
    assert(fs.existsSync(path.join(root, href)), file + ': missing asset or link ' + href);
  }
}
assert.equal((fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').match(/<loc>/g) || []).length, pages.length);
console.log('Passed SEO, structured data, headings, sitemap, and local links for ' + pages.length + ' pages.');
