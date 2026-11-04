import type { PageSlug } from '../data/pages';
import type { ReactNode } from 'react';
import { pages } from '../data/pages';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import Inquiry from './Inquiry';
import WhatsApp from './WhatsApp';
import Intro from './Intro';
import PageContent from './PageContent';
import SiteRuntime from './SiteRuntime';
import { pageSchema } from '../lib/metadata';

export default function SitePage({
  slug,
  content,
  structuredData,
}: {
  slug: PageSlug;
  content?: ReactNode;
  structuredData?: string;
}) {
  return (
    <>
      {slug === '' && <Intro />}
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader slug={slug} />
      {content ?? <PageContent name={pages[slug].component} />}
      <Inquiry />
      <SiteFooter />
      <WhatsApp />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData ?? pageSchema(slug) }}
      />
      <SiteRuntime key={slug} bodyClass={pages[slug].bodyClass} />
    </>
  );
}
