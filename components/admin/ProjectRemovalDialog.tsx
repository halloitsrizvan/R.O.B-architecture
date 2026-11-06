import { Trash2, X } from 'lucide-react';
import type { AdminProject } from '../../lib/admin/types';

type Props = {
  project: AdminProject;
  pending: boolean;
  notice: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ProjectRemovalDialog({
  project,
  pending,
  notice,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <div
      className="admin-modal-backdrop admin-removal-backdrop"
      onClick={() => {
        if (!pending) onCancel();
      }}
    >
      <section
        className="admin-removal-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={pending}
        aria-labelledby="remove-project-title"
        aria-describedby="remove-project-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-editor-heading">
          <div>
            <span className="admin-overline">Project collection</span>
            <h2 id="remove-project-title">Remove project?</h2>
          </div>
          <button
            className="admin-icon-button"
            aria-label="Close removal dialog"
            onClick={onCancel}
            disabled={pending}
          >
            <X size={20} />
          </button>
        </div>
        <p id="remove-project-description">
          <strong>{project.title}</strong> and its images will be permanently removed from the
          website. This cannot be undone.
        </p>
        {notice && (
          <p className="admin-error" role="alert">
            {notice}
          </p>
        )}
        <div className="admin-removal-actions">
          <button
            className="admin-button secondary"
            onClick={onCancel}
            disabled={pending}
            data-initial-focus
          >
            Keep project
          </button>
          <button className="admin-button danger" onClick={onConfirm} disabled={pending}>
            <Trash2 size={15} />
            {pending ? 'Removing…' : 'Remove permanently'}
          </button>
        </div>
      </section>
    </div>
  );
}
