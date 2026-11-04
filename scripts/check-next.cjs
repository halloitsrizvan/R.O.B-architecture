const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pages = require('../data/pages.json');
const root = path.resolve(__dirname, '..');
const titles = new Set();
for (const [slug, page] of Object.entries(pages)) {
  assert(!titles.has(page.title), `Duplicate title: ${slug}`);
  titles.add(page.title);
  assert(page.description && page.image && page.schema['@graph'].length >= 3);
  let component = fs.readFileSync(
    path.join(root, 'components/pages', `${page.component}.tsx`),
    'utf8',
  );
  if (component.includes('<ProjectDetails')) {
    component = fs.readFileSync(path.join(root, 'components/ProjectDetails.tsx'), 'utf8');
  }
  assert.equal((component.match(/<h1\b/g) || []).length, 1, `Heading: ${slug}`);
  for (const [, asset] of component.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
    if (asset === '/' || pages[asset.slice(1)] || asset === '/index.html') continue;
    assert(fs.existsSync(path.join(root, 'public', asset)), `Missing asset: ${asset}`);
  }
}
console.log(`Validated ${titles.size} Next.js pages, metadata, schemas, and local assets.`);
