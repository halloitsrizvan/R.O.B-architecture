import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { projects, type ProjectDetailsData } from '../data/projects';
import rawListing from '../data/project-list.json';
const listing: Record<string, { categories: string[]; sortOrder: number; featured: boolean }> =
  rawListing;
import { query } from './db';
import type { ProjectRow, ProjectImageRow } from '../types/database';
import type { Json } from '../types/database';

export interface PortfolioProject extends ProjectDetailsData {
  slug: string;
  categories: string[];
  sortOrder: number;
  featured: boolean;
}

function parseFacts(value: Json): ProjectDetailsData['facts'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((fact) => {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)) return [];
    if (typeof fact.label !== 'string' || typeof fact.value !== 'string') return [];
    return [{ label: fact.label, value: fact.value }];
  });
}

export const getPortfolio = cache(async (): Promise<PortfolioProject[]> => {
  const fallback = Object.entries(projects)
    .map(([slug, project]) => ({
      ...project,
      slug,
      categories: listing[slug].categories,
      sortOrder: listing[slug].sortOrder,
      featured: listing[slug].featured,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!process.env.DATABASE_URL) return fallback;
  const [content, photos] = await Promise.all([
    query<ProjectRow>(
      'select slug,title,description,categories,facts,sort_order,featured,published from public.projects where published order by sort_order',
    ),
    query<ProjectImageRow>(
      'select i.id,i.project_slug,i.src,i.alt,i.src_set,i.sizes,i.sort_order from public.project_images i join public.projects p on p.slug=i.project_slug where p.published order by i.sort_order',
    ),
  ]);
  return content.map((project, index, all) => {
    const previous = all[(index - 1 + all.length) % all.length];
    const next = all[(index + 1) % all.length];
    return {
      slug: project.slug,
      title: project.title,
      description: project.description,
      label: `Selected work / ${String(index + 1).padStart(2, '0')}`,
      categories: project.categories,
      featured: project.featured,
      sortOrder: project.sort_order,
      facts: parseFacts(project.facts),
      inquiryUrl: `https://wa.me/918921533894?text=${encodeURIComponent(`Hello R.O.B Studio, I would like to discuss a project inspired by ${project.title}.`)}`,
      previous: { href: `/${previous.slug}`, title: previous.title },
      next: { href: `/${next.slug}`, title: next.title },
      images: photos
        .filter((image) => image.project_slug === project.slug)
        .map((image) => ({
          src: image.src,
          alt: image.alt,
          srcSet: image.src_set ?? undefined,
          sizes: image.sizes ?? undefined,
        })),
    };
  });
});

export async function getProject(slug: string): Promise<PortfolioProject> {
  const project = (await getPortfolio()).find((project) => project.slug === slug);
  if (!project) notFound();
  return project;
}
