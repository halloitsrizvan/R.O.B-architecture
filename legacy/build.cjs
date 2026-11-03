const fs = require('node:fs');
const path = require('node:path');
require('./seo.cjs');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of fs.readdirSync(root)) {
  if (/\.html$/.test(file) || ['style.css', 'script.js', 'motion.js', 'projects-data.js', 'logo.png', 'robots.txt', 'sitemap.xml'].includes(file)) {
    fs.copyFileSync(path.join(root, file), path.join(output, file));
  }
}
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });
console.log('Static Vercel output prepared in dist/.');
