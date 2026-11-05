export const revalidate = 60;

import { notFound } from 'next/navigation';
import { pages, isPageSlug } from '../../data/pages';
import SitePage from '../../components/SitePage';
import { pageMetadata, projectMetadata, projectSchema } from '../../lib/metadata';
import { getProject } from '../../lib/portfolio';
import ProjectDetails from '../../components/ProjectDetails';

type RouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export function generateStaticParams() {
  return Object.keys(pages)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params;
  if (/^project-[a-z0-9-]+$/.test(slug)) return projectMetadata(await getProject(slug));
  if (!isPageSlug(slug)) notFound();
  return pageMetadata(slug);
}
export default async function Page({ params }: RouteProps) {
  const { slug } = await params;
  if (/^project-[a-z0-9-]+$/.test(slug)) {
    const project = await getProject(slug);
    return (
      <SitePage
        slug={isPageSlug(slug) ? slug : 'projects'}
        content={<ProjectDetails project={project} />}
        structuredData={projectSchema(project)}
      />
    );
  }
  if (!isPageSlug(slug)) notFound();
  return <SitePage slug={slug} />;
}
