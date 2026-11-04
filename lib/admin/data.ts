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
  const { database, user } = await requireAdmin();
  const [projects, images, inquiries] = await Promise.all([
    database.from('projects').select('*').order('sort_order'),
    database.from('project_images').select('*').order('sort_order'),
    database
      .from('contact_inquiries')
      .select('id,name,email,service,message,status,created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (projects.error || images.error || inquiries.error)
    return {
      preview: false,
      email: user.email ?? null,
      projects: [],
      inquiries: [],
      error:
        'Could not load studio content. Check the database connection and migrations, then reload.',
    };
  return {
    preview: false,
    email: user.email ?? null,
    projects: projects.data.map((project) => ({
      slug: project.slug,
      title: project.title,
      description: project.description,
      categories: project.categories,
      published: project.published,
      featured: project.featured,
      sortOrder: project.sort_order,
      images: images.data
        .filter((image) => image.project_slug === project.slug)
        .map((image) => ({
          id: image.id,
          src: image.src,
          alt: image.alt,
          sortOrder: image.sort_order,
        })),
    })),
    inquiries: inquiries.data.map((inquiry) => ({
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
