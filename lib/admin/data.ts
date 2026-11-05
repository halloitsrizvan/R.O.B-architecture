import { sealInbox, inboxSQL, type LiveInquiry } from '../neon/realtime';
import { query } from '../db';
import type { ProjectRow, ProjectImageRow } from '../../types/database';
import 'server-only';
import { projects as bundled } from '../../data/projects';
import listing from '../../data/project-list.json';
import { isAdminConfigured, requireAdmin } from './auth';
import type { AdminData } from './types';

export async function getAdminData(): Promise<AdminData> {
  if (!isAdminConfigured()) {
    return {
      preview: true,
      email: null,
      inquiries: [],
      projects: Object.entries(bundled)
        .map(([slug, project]) => {
          const entry = Object.entries(listing).find(([key]) => key === slug)?.[1];
          return {
            slug,
            title: project.title,
            description: project.description,
            categories: entry?.categories ?? [],
            published: true,
            featured: entry?.featured ?? false,
            sortOrder: entry?.sortOrder ?? 0,
            images: project.images.map((image, index) => ({
              id: `${slug}-${index}`,
              src: image.src,
              alt: image.alt,
              sortOrder: index,
            })),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder),
    };
  }
  const { user } = await requireAdmin();
  const [projectRows, imageRows, inquiryRows] = await Promise.all([
    query<ProjectRow>(
      'select slug,title,description,categories,featured,published,sort_order from public.projects order by sort_order',
    ),
    query<ProjectImageRow>(
      'select id,project_slug,src,alt,sort_order from public.project_images order by sort_order',
    ),
    query<LiveInquiry>(inboxSQL, [user.id]),
  ]);
  return {
    realtime: {
      url: process.env.NEON_REALTIME_URL!,
      userId: user.id,
      sealedQuery: await sealInbox(user.id),
    },
    preview: false,
    email: user.email ?? null,
    projects: projectRows.map((project) => ({
      slug: project.slug,
      title: project.title,
      description: project.description,
      categories: project.categories,
      published: project.published,
      featured: project.featured,
      sortOrder: project.sort_order,
      images: imageRows
        .filter((image) => image.project_slug === project.slug)
        .map((image) => ({
          id: image.id,
          src: image.src,
          alt: image.alt,
          sortOrder: image.sort_order,
        })),
    })),
    inquiries: inquiryRows.map((inquiry) => ({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      service: inquiry.service,
      message: inquiry.message,
      status:
        inquiry.status === 'contacted' || inquiry.status === 'archived' ? inquiry.status : 'new',
      createdAt: inquiry.created_at,
    })),
  };
}
