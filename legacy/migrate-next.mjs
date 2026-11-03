import fs from 'node:fs';
import path from 'node:path';
import { parse, parseFragment } from 'parse5';

const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
const attrs = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', fetchpriority: 'fetchPriority', srcset: 'srcSet', crossorigin: 'crossOrigin', readonly: 'readOnly', maxlength: 'maxLength', autocomplete: 'autoComplete', autofocus: 'autoFocus', viewbox: 'viewBox', 'stroke-width': 'strokeWidth', 'stroke-opacity': 'strokeOpacity', 'fill-opacity': 'fillOpacity', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'stroke-dasharray': 'strokeDasharray', patternunits: 'patternUnits' };
const voids = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'area', 'wbr', 'embed', 'col']);
const bools = new Set(['required', 'disabled', 'hidden', 'multiple', 'checked', 'selected']);
function jsx(node) {
  if (node.nodeName === '#text') return node.value.trim() ? `{${JSON.stringify(node.value)}}` : '';
  if (!node.tagName || node.tagName === 'script') return '';
  const props = node.attrs.map(({ name, value }) => {
    if (name === 'style') {
      const style = Object.fromEntries(value.split(';').filter(s => s.includes(':')).map(s => { const i=s.indexOf(':'); return [s.slice(0,i).trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()),s.slice(i+1).trim()]; }));
      return ` style={${JSON.stringify(style)}}`;
    }
    if (bools.has(name)) return ` ${name}={true}`;
    if (name === 'value' && ['input','textarea','select'].includes(node.tagName)) name = 'defaultValue';
    if (['src', 'href', 'srcset'].includes(name) && !/^(https?:|mailto:|tel:|#|\/|data:)/.test(value)) value = '/' + value;
    return ` ${attrs[name] || name}=${JSON.stringify(value)}`;
  }).join('');
  return `<${node.tagName}${props}${voids.has(node.tagName) ? ' />' : '>' + (node.childNodes || []).map(jsx).join('') + `</${node.tagName}>`}`;
}
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
const pages = {};
for (const file of files) {
  const source = fs.readFileSync(file,'utf8');
  const doc = parse(source);
  const html = doc.childNodes.find(n=>n.tagName==='html');
  const head = html.childNodes.find(n=>n.tagName==='head');
  const body = html.childNodes.find(n=>n.tagName==='body');
  const meta = name => head.childNodes.find(n=>n.tagName==='meta' && n.attrs.some(a=>(a.name==='name'||a.name==='property')&&a.value===name))?.attrs.find(a=>a.name==='content')?.value;
  const title = head.childNodes.find(n=>n.tagName==='title').childNodes[0].value;
  const schema = head.childNodes.find(n=>n.tagName==='script'&&n.attrs.some(a=>a.value==='application/ld+json'));
  const slug = file === 'index.html' ? '' : file;
  const name = file.replace('.html','').replace(/(^|-)(\w)/g,(_,s,c)=>c.toUpperCase());
  const main = body.childNodes.find(n=>n.tagName==='main');
  const header = body.childNodes.find(n=>n.tagName==='header');
  const footer = body.childNodes.find(n=>n.tagName==='footer');
  const inquiry = body.childNodes.find(n=>n.attrs?.some(a=>a.name==='class'&&a.value.includes('inquiry')));
  const whatsapp = body.childNodes.find(n=>n.attrs?.some(a=>a.name==='class'&&a.value==='whatsapp-float'));
  if (file === 'index.html') {
    // Header links derive their current-page state from the server-rendered route.
    let headerJSX = jsx(header).replace(/ aria-current="page"/g,'');
    for (const [href,key] of [['index.html',''],['projects.html','projects.html'],['about.html','about.html'],['services.html','services.html'],['contact.html','contact.html']]) {
      headerJSX=headerJSX.replace(`href="/${href}"`, `href="${href==='index.html'?'/':'/'+href}" aria-current={slug === ${JSON.stringify(key)} ? 'page' : undefined}`);
    }
    write('components/SiteHeader.jsx', `export default function SiteHeader({ slug }) { return (${headerJSX}); }\n`);
    write('components/SiteFooter.jsx', `export default function SiteFooter() { return (${jsx(footer)}); }\n`);
    write('components/Inquiry.jsx', `export default function Inquiry() { return (${jsx(inquiry)}); }\n`);
    write('components/WhatsApp.jsx', `export default function WhatsApp() { return (${jsx(whatsapp)}); }\n`);
    const intro = body.childNodes.find(n=>n.attrs?.some(a=>a.value==='intro'));
    write('components/Intro.jsx', `export default function Intro() { return (${jsx(intro)}); }\n`);
  }
  write(`components/pages/${name}.jsx`, `export default function ${name}() { return (${jsx(main)}); }\n`);
  pages[slug]={ component:name, title, description:meta('description'), image:meta('og:image'), bodyClass:body.attrs.find(a=>a.name==='class')?.value||'', schema:JSON.parse(schema.childNodes[0].value) };
}
write('data/pages.json', JSON.stringify(pages,null,2));
write('components/PageContent.jsx', Object.values(pages).map(p=>`import ${p.component} from './pages/${p.component}';`).join('\n') + `\nconst components = {${Object.values(pages).map(p=>p.component).join(',')}};\nexport default function PageContent({ name }) { const Component = components[name]; return <Component />; }\n`);
fs.mkdirSync('public', {recursive:true});
fs.cpSync('assets','public/assets',{recursive:true});
fs.copyFileSync('logo.png','public/logo.png');
fs.copyFileSync('style.css','app/globals.css');
console.log(`Migrated ${files.length} pages to JSX.`);
