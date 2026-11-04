import type { PageSlug } from '../data/pages';
export default function SiteHeader({ slug }: { slug: PageSlug }) {
  return (
    <header className="site-header">
      <a
        href="/"
        aria-current={slug === '' ? 'page' : undefined}
        className="brand"
        aria-label="R.O.B Architectural Studio home"
      >
        <img src="/logo.png" alt="R.O.B" />
        <span>
          {'ARCHITECTURAL'}
          <br />
          {'STUDIO'}
        </span>
      </a>
      <button
        className="menu-toggle"
        aria-label="Toggle navigation"
        aria-expanded="false"
        aria-controls="navigation"
      >
        <span className="hamburger" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
      <nav id="navigation" aria-label="Main navigation">
        <a href="/index.html">{'Home'}</a>
        <a href="/projects.html" aria-current={slug === 'projects.html' ? 'page' : undefined}>
          {'Projects'}
        </a>
        <a href="/about.html" aria-current={slug === 'about.html' ? 'page' : undefined}>
          {'Studio'}
        </a>
        <a href="/services.html" aria-current={slug === 'services.html' ? 'page' : undefined}>
          {'Expertise'}
        </a>
        <a href="/contact.html" aria-current={slug === 'contact.html' ? 'page' : undefined}>
          {'Contact'}
        </a>
      </nav>
      <a
        className="cta header-cta"
        href="https://wa.me/918921533894"
        target="_blank"
        rel="noopener noreferrer"
      >
        {'Start a project'}
        <span aria-hidden="true">{'↗'}</span>
      </a>
    </header>
  );
}
