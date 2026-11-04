import type { PortfolioProject } from './portfolio';
import type { Metadata } from 'next';
import { pages, type PageSlug } from '../data/pages';
import config from '../site.config.json';

export const origin = new URL(process.env.SITE_URL || config.url).origin;
export function pageMetadata(slug: PageSlug): Metadata {
  const page = pages[slug];
  const url = `${origin}/${slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: {
      type: 'website',
      locale: 'en_IN',
      siteName: config.name,
      title: page.title,
      description: page.description,
      url,
      images: [page.image.replace(config.url, origin)],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: [page.image.replace(config.url, origin)],
    },
  };
}

export function pageSchema(slug: PageSlug): string {
  return JSON.stringify(pages[slug].schema)
    .replaceAll(config.url, origin)
    .replaceAll('<', '\\u003c');
}

export function projectMetadata(project: PortfolioProject): Metadata {
  const url = origin + '/' + project.slug + '.html';
  const image = project.images[0]
    ? new URL(project.images[0].src, origin).href
    : origin + '/assets/hero-image.png';
  const title = project.title + ' | R.O.B Architectural Studio';
  return {
    title,
    description: project.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: config.name,
      title,
      description: project.description,
      url,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: project.description,
      images: [image],
    },
  };
}
export function projectSchema(project: PortfolioProject): string {
  const url = origin + '/' + project.slug + '.html';
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url + '#page',
        url,
        name: project.title,
        description: project.description,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: origin + '/' },
          { '@type': 'ListItem', position: 2, name: 'Projects', item: origin + '/projects.html' },
          { '@type': 'ListItem', position: 3, name: project.title, item: url },
        ],
      },
    ],
  }).replaceAll('<', '\\u003c');
}
