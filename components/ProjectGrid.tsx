import { getPortfolio } from '../lib/portfolio';

export default async function ProjectGrid({ featured = false }: { featured?: boolean }) {
  const projects = (await getPortfolio()).filter((project) => !featured || project.featured);
  return (
    <div className="project-grid">
      {projects.map((project, index) => {
        const cover = project.images[0];
        return (
          <a
            className="project-card reveal"
            key={project.slug}
            data-project={index}
            data-category={project.categories.join(' ')}
            href={`/${project.slug}`}
          >
            <span className="project-image">
              {cover && (
                <img
                  src={cover.src}
                  srcSet={cover.srcSet}
                  sizes={cover.sizes}
                  alt={cover.alt}
                  loading="lazy"
                />
              )}
            </span>
            <span className="project-caption">
              <span>
                <small>
                  {String(index + 1).padStart(2, '0')} / {project.categories[0]}
                </small>
                <span className="project-title">{project.title}</span>
              </span>
              <span className="project-caption-arrow" aria-hidden="true">
                &#8599;
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}
