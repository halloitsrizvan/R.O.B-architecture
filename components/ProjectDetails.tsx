import { Fragment } from 'react';
import type { ProjectDetailsData, ProjectImage } from '../data/projects';

function ProjectFigure({
  image,
  index,
  total,
  title,
}: {
  image: ProjectImage;
  index: number;
  total: number;
  title: string;
}) {
  return (
    <figure
      id={index === 1 ? 'project-details-views' : undefined}
      className="project-detail-figure reveal"
    >
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={image.sizes}
        alt={image.alt}
        decoding="async"
        fetchPriority={index === 0 ? 'high' : undefined}
        loading={index === 0 ? undefined : 'lazy'}
      />
      <figcaption>
        <span>{title}</span>
        <span>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </figcaption>
    </figure>
  );
}

export default function ProjectDetails({ project }: { project: ProjectDetailsData }) {
  return (
    <main id="main">
      <section className="project-detail-heading section-pad">
        <a className="text-link" href="/projects">
          &larr; All projects
        </a>
        <div className="project-detail-title">
          <span className="eyebrow reveal">{project.label}</span>
          <h1 className="reveal">{project.title}</h1>
        </div>
      </section>
      <section
        className="project-detail-gallery section-pad"
        aria-label={`${project.title} image gallery`}
      >
        {project.images.map((image, index) => (
          <Fragment key={image.src}>
            <ProjectFigure
              image={image}
              index={index}
              total={project.images.length}
              title={project.title}
            />
            {index === 0 && (
              <aside className="project-lead-note reveal">
                <span className="eyebrow">Project overview</span>
                <h2>
                  A closer <em>look.</em>
                </h2>
                <p>{project.description}</p>
                <dl>
                  {project.facts.map((fact) => (
                    <div key={fact.label}>
                      <dt>{fact.label}</dt>
                      <dd>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
                <a
                  className="cta"
                  href={project.inquiryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Discuss a similar project <span aria-hidden="true">&#8599;</span>
                </a>
              </aside>
            )}
          </Fragment>
        ))}
      </section>
      <nav className="project-detail-navigation section-pad" aria-label="Browse projects">
        <a href={project.previous.href}>
          <span className="eyebrow">&larr; Previous project</span>
          <span>{project.previous.title}</span>
        </a>
        <a href={project.next.href}>
          <span className="eyebrow">Next project &rarr;</span>
          <span>{project.next.title}</span>
        </a>
      </nav>
    </main>
  );
}
