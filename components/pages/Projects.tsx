import { getPortfolio } from '../../lib/portfolio';
import ProjectGrid from '../ProjectGrid';
export default async function Projects() {
  return (
    <main id="main">
      <section className="page-heading">
        <span className="eyebrow reveal">{'Selected work / Portfolio'}</span>
        <h1 className="reveal">
          {'Considered spaces.'}
          <br />
          <em>{'Distinct perspectives.'}</em>
        </h1>
        <p className="reveal">
          {
            'An exploration of architecture, interiors, and landscape. Each project begins with its own context and a new conversation.'
          }
        </p>
      </section>
      <section className="portfolio section-pad">
        <div className="filters" aria-label="Filter projects">
          <button data-filter="all" aria-pressed="true">
            {'All work'}
          </button>
          <button data-filter="architecture" aria-pressed="false">
            {'Architecture'}
          </button>
          <button data-filter="interior" aria-pressed="false">
            {'Interiors'}
          </button>
          <button data-filter="landscape" aria-pressed="false">
            {'Landscape'}
          </button>
          <span id="project-total">{(await getPortfolio()).length} projects</span>
        </div>
        <ProjectGrid />
      </section>
    </main>
  );
}
