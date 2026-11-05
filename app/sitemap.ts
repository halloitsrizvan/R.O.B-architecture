import { getPortfolio } from '../lib/portfolio';
export const revalidate = 60;
import { pages } from '../data/pages';
import type { MetadataRoute } from 'next';
import { origin } from '../lib/metadata';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getPortfolio();
  return [
    ...Object.keys(pages)
      .filter((slug) => !slug.startsWith('project-'))
      .map((slug) => ({ url: origin + '/' + slug })),
    ...projects.map((project) => ({ url: origin + '/' + project.slug })),
  ];
}
