import rawPages from './pages.json';

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue | undefined };

export interface PageDefinition {
  component: string;
  title: string;
  description: string;
  image: string;
  bodyClass: string;
  schema: { '@context': string; '@graph': JsonValue[] };
}

export type PageSlug = keyof typeof rawPages;
export const pages: Record<PageSlug, PageDefinition> = rawPages;

export function isPageSlug(slug: string): slug is PageSlug {
  return Object.hasOwn(pages, slug);
}
