import { ArrowUpRight, Images, Search, Trash2 } from 'lucide-react';
import type { AdminProject } from '../../lib/admin/types';
export default function AdminProjectTable({
  items,
  onEdit,
  onRemove,
  disabled,
}: {
  items: AdminProject[];
  onEdit: (project: AdminProject) => void;
  onRemove?: (project: AdminProject) => void;
  disabled: boolean;
}) {
  if (!items.length) {
    return (
      <div className="admin-empty">
        <Search size={22} />
        <strong>No projects found</strong>
        <span>Try another name or change the status filter.</span>
      </div>
    );
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Discipline</th>
            <th>Status</th>
            <th>Images</th>
            <th>
              <span className="admin-sr-only">Project actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((project) => (
            <tr key={project.slug}>
              <td>
                <button className="admin-project-name" onClick={() => onEdit(project)}>
                  {project.images[0] ? (
                    <img loading="lazy" decoding="async" src={project.images[0].src} alt="" />
                  ) : (
                    <span className="admin-thumbnail">
                      <Images size={18} />
                    </span>
                  )}
                  <span>
                    <strong>{project.title}</strong>
                    <small>
                      {project.featured ? 'Featured on homepage' : 'Portfolio collection'}
                    </small>
                  </span>
                </button>
              </td>
              <td className="admin-capitalize">
                {project.categories
                  .map((category) => (category === 'interior' ? 'Interiors' : category))
                  .join(' / ')}
              </td>
              <td>
                <span className={`admin-badge ${project.published ? 'published' : 'draft'}`}>
                  <i />
                  {project.published ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="admin-photo-count">
                <Images size={14} />
                {project.images.length}
              </td>
              <td>
                <div className="admin-project-actions">
                  <button
                    className="admin-icon-button"
                    aria-label={`Edit ${project.title}`}
                    onClick={() => onEdit(project)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                  {onRemove && (
                    <button
                      className="admin-icon-button danger"
                      aria-label={`Remove ${project.title}`}
                      onClick={() => onRemove(project)}
                      disabled={disabled}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
