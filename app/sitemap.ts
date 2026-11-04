import { pages } from '../data/pages';
import type { MetadataRoute } from 'next';
import { origin } from '../lib/metadata';

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.keys(pages).map((slug) => ({ url: `${origin}/${slug}` }));
}
