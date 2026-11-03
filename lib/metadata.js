import pages from '../data/pages.json';
import config from '../site.config.json';

export const origin = new URL(process.env.SITE_URL || config.url).origin;
export function pageMetadata(slug) {
  const page = pages[slug];
  const url = `${origin}/${slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: { type: 'website', locale: 'en_IN', siteName: config.name, title: page.title, description: page.description, url, images: [page.image.replace(config.url, origin)] },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: [page.image.replace(config.url, origin)] }
  };
}

export function pageSchema(slug) {
  return JSON.stringify(pages[slug].schema).replaceAll(config.url, origin).replaceAll('<', '\\u003c');
}
