const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const config = require('../site.config.json');
const origin = new URL(process.env.SITE_URL || config.url).origin;
if (!origin.startsWith('https://')) throw new Error('SITE_URL must use HTTPS.');
const absolute = value => new URL(value, origin + '/').href;
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'projects-data.js'), 'utf8'), context);
const projects = context.window.studioProjects;
const pages = {
  'index.html': ['R.O.B Architects in Kannur, Kerala | Architecture & Interiors', 'R.O.B Architectural Studio in Peravoor, Kannur, Kerala. Explore considered architecture, interior design, and landscape design. Discuss your project with us.'],
  'about.html': ['Our Studio | R.O.B Architects, Kerala', 'Meet R.O.B Architectural Studio in Peravoor, Kannur. Discover our approach to architecture, honest materials, natural light, and everyday living.'],
  'services.html': ['Architecture, Interiors & Landscape | R.O.B Studio', 'Explore architecture, interior design, and landscape design by R.O.B Architectural Studio in Kannur, Kerala. Start a conversation about your project.'],
  'projects.html': ['Architecture & Interior Projects | R.O.B Studio', 'Browse residential architecture, interior design, and landscape projects by R.O.B Architectural Studio. Explore each project through images and design details.'],
  'contact.html': ['Contact R.O.B Architects | Peravoor, Kannur, Kerala', 'Contact R.O.B Architectural Studio in Peravoor, Kannur, Kerala. Share your architecture, interior, or landscape project and connect on WhatsApp at +91 89215 33894.']
};
for (const project of projects) pages[project.url] = [project.title + ' | R.O.B Architectural Studio', project.description];
const business = {
  '@type': 'ProfessionalService', '@id': absolute('/#studio'), name: config.name,
  url: origin + '/', logo: absolute('/logo.png'), image: absolute('/assets/hero-image.png'),
  telephone: '+918921533894', email: 'robarchstudio@gmail.com',
  description: 'Architecture, interior design, and landscape design studio in Peravoor, Kannur, Kerala.',
  address: { '@type': 'PostalAddress', addressLocality: 'Peravoor, Kannur', addressRegion: 'Kerala', postalCode: '670673', addressCountry: 'IN' }
};
for (const [file, [title, description]] of Object.entries(pages)) {
  const filepath = path.join(root, file);
  let html = fs.readFileSync(filepath, 'utf8');
  const project = projects.find(item => item.url === file);
  const url = absolute(file === 'index.html' ? '/' : '/' + file);
  const image = absolute(project ? project.images[0] : '/assets/hero-image.png');
  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escape(title) + '</title>');
  html = html.replace(/<meta name="description"[^>]*>/, '<meta name="description" content="' + escape(description) + '">');
  html = html.replace(/\n?<!-- SEO:start -->[\s\S]*?<!-- SEO:end -->\n?/g, '\n');
  const graph = [business, { '@type': 'WebSite', '@id': absolute('/#website'), url: origin + '/', name: config.name, publisher: { '@id': business['@id'] } }, {
    '@type': file === 'contact.html' ? 'ContactPage' : file === 'about.html' ? 'AboutPage' : file === 'projects.html' ? 'CollectionPage' : 'WebPage',
    '@id': url + '#page', url, name: title, description, inLanguage: 'en',
    isPartOf: { '@id': absolute('/#website') }, about: { '@id': business['@id'] }, primaryImageOfPage: { '@type': 'ImageObject', url: image }
  }];
  if (project) graph.push({ '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
    { '@type': 'ListItem', position: 2, name: 'Projects', item: absolute('/projects.html') },
    { '@type': 'ListItem', position: 3, name: project.title, item: url }
  ] });
  const metadata = `<!-- SEO:start -->
<link rel="canonical" href="${escape(url)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#232620">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_IN">
<meta property="og:site_name" content="${escape(config.name)}">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${escape(url)}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:alt" content="${escape(project ? project.title : config.name + ' architecture')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${escape(image)}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>
<!-- SEO:end -->`;
  html = html.replace('</head>', metadata + '\n</head>');
  fs.writeFileSync(filepath, html);
}
const urls = Object.keys(pages).map(file => absolute(file === 'index.html' ? '/' : '/' + file));
fs.writeFileSync(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(url => '  <url><loc>' + escape(url) + '</loc></url>').join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(root, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + origin + '/sitemap.xml\n');
console.log('SEO generated for ' + urls.length + ' pages using ' + origin);
