import { origin } from '../lib/metadata';
export default function robots() {
  return { rules: { userAgent: '*', allow: '/' }, sitemap: `${origin}/sitemap.xml` };
}
