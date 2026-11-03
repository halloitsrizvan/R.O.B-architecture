import { notFound } from 'next/navigation';
import pages from '../../data/pages.json';
import SitePage from '../../components/SitePage';
import { pageMetadata } from '../../lib/metadata';

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(pages).filter(Boolean).map(slug => ({ slug }));
}
export async function generateMetadata({ params }) {
  const { slug } = await params;
  if (!pages[slug]) notFound();
  return pageMetadata(slug);
}
export default async function Page({ params }) {
  const { slug } = await params;
  if (!pages[slug]) notFound();
  return <SitePage slug={slug} />;
}
