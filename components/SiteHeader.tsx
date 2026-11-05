import { ArrowUpRight } from 'lucide-react';
import type { PageSlug } from '../data/pages';

const navigation = [
  { slug: '', href: '/', label: 'Home' },
  { slug: 'projects', href: '/projects', label: 'Projects' },
  { slug: 'about', href: '/about', label: 'Studio' },
  { slug: 'services', href: '/services', label: 'Expertise' },
  { slug: 'contact', href: '/contact', label: 'Contact' },
] as const;

export default function SiteHeader({ slug }: { slug: PageSlug }) {
  const activePage = slug.startsWith('project-') ? 'projects' : slug;
  return (
    <header className={slug === '' ? 'site-header site-header--overlay' : 'site-header'}>
      <a href="/" className="brand" aria-label="R.O.B Architectural Studio home">
        <img src="/logo.png" alt="R.O.B" />
        <span>
          ARCHITECTURAL
          <br />
          STUDIO
        </span>
      </a>
      <button
        className="menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="navigation"
      >
        <span className="hamburger" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <nav id="navigation" className="primary-navigation" aria-label="Main navigation">
        {navigation.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={activePage === item.slug ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <a
        className="cta header-cta"
        href="https://wa.me/918921533894"
        target="_blank"
        rel="noopener noreferrer"
      >
        Start a project <ArrowUpRight size={19} strokeWidth={1.3} aria-hidden="true" />
      </a>
    </header>
  );
}
