import pages from '../data/pages.json';
import { origin } from '../lib/metadata';

export default function sitemap() {
  return Object.keys(pages).map(slug => ({ url: `${origin}/${slug}` }));
}
