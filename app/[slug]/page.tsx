export const revalidate = 60;

import { notFound } from 'next/navigation';
import { pages, isPageSlug } from '../../data/pages';
import SitePage from '../../components/SitePage';
import { pageMetadata } from '../../lib/metadata';

type RouteProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(pages)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}
export async function generateMetadata({ params }: RouteProps) {
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();
  return pageMetadata(slug);
}
export default async function Page({ params }: RouteProps) {
  const { slug } = await params;
  if (!isPageSlug(slug)) notFound();
  return <SitePage slug={slug} />;
}
