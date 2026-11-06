'use client';
import { useState, type FormEvent } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { saveProject, uploadImage } from '../../app/admin/actions';
import type { AdminProject, ActionResult } from '../../lib/admin/types';
import { disciplines } from '../../lib/admin/constants';
import ProjectImagePicker from './ProjectImagePicker';
import ProjectImageEditor from './ProjectImageEditor';
type Props = {
  editor: AdminProject;
  preview: boolean;
  pending: boolean;
  notice: string;
  onClose: () => void;
  onRemove?: (project: AdminProject) => void;
  run: (task: () => Promise<ActionResult>, complete?: () => void) => void;
};

function projectUrlFromName(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 92)
    .replace(/-+$/g, '');
  return slug ? `project-${slug}` : '';
}

export default function ProjectEditor({
  editor,
  preview,
  pending,
  notice,
  onClose,
  onRemove,
  run,
}: Props) {
  const [projectName, setProjectName] = useState(editor.title);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const [uploadVersion, setUploadVersion] = useState(0);
  const [selectedImages, setSelectedImages] = useState(0);
  const projectUrl = editor.slug || (customUrl ?? projectUrlFromName(projectName));

  return (
    <div
      className="admin-modal-backdrop"
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <section
        className="admin-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-editor-heading">
          <div>
            <span className="admin-overline">Project details</span>
            <h2 id="editor-title">{editor.slug ? editor.title : 'A new possibility.'}</h2>
          </div>
          <button
            className="admin-icon-button"
            onClick={() => onClose()}
            aria-label="Close project editor"
            disabled={pending}
          >
            <X size={20} />
          </button>
        </div>
        {preview && (
          <div className="admin-notice">
            Preview only. Connect Neon to save changes and upload images.
          </div>
        )}
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}
        <form
          key={editor.slug}
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            run(
              () => saveProject(form),
              () => onClose(),
            );
          }}
        >
          <input type="hidden" name="intent" value={editor.slug ? 'update' : 'create'} />
          <label>
            Project name
            <input
              name="title"
              required
              maxLength={160}
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="e.g. Courtyard Residence"
            />
          </label>
          <label>
            Project URL
            <input
              name="slug"
              required
              pattern="project-[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={100}
              readOnly={Boolean(editor.slug)}
              value={projectUrl}
              onChange={(event) => setCustomUrl(event.target.value)}
              placeholder="project-courtyard-residence"
            />
            <small>
              {editor.slug
                ? 'Existing project URLs stay fixed.'
                : 'Generated from the project name. You can customize it before saving.'}
            </small>
          </label>
          <label>
            The story
            <textarea
              name="description"
              rows={4}
              maxLength={10000}
              defaultValue={editor.description}
              placeholder="What makes this space special?"
            />
          </label>
          <fieldset>
            <legend>Disciplines</legend>
            <div className="admin-checkboxes">
              {disciplines.map((item) => (
                <label key={item.id}>
                  <input
                    type="checkbox"
                    name="categories"
                    value={item.id}
                    defaultChecked={editor.categories.includes(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          {!editor.slug && <ProjectImagePicker disabled={preview || pending} />}
          <div className="admin-checkboxes stacked">
            <label>
              <input type="checkbox" name="published" defaultChecked={editor.published} />
              Published on website
            </label>
            <label>
              <input type="checkbox" name="featured" defaultChecked={editor.featured} />
              Feature on homepage
            </label>
          </div>
          <button className="admin-button primary" disabled={preview || pending}>
            {pending ? 'Saving…' : 'Save project'}
            <Check size={15} />
          </button>
        </form>
        {editor.slug && (
          <div className="admin-editor-gallery">
            <div className="admin-panel-heading">
              <h3>Project images</h3>
              <span className="admin-small-caption">{editor.images.length} images</span>
            </div>
            <p className="admin-gallery-hint">JPG, PNG, WebP or AVIF. Max 4 MB.</p>
            <div className="admin-image-grid">
              {editor.images.map((image, index) => (
                <ProjectImageEditor
                  key={image.id}
                  image={image}
                  cover={index === 0}
                  disabled={preview || pending}
                  run={run}
                />
              ))}
            </div>
            <details className="admin-add-photos">
              <summary>
                <Plus size={15} /> Add photos
              </summary>
              <form
                className="admin-upload"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  run(
                    () => uploadImage(form),
                    () => {
                      setUploadVersion((version) => version + 1);
                      setSelectedImages(0);
                    },
                  );
                }}
              >
                <input type="hidden" name="slug" value={editor.slug} />
                <ProjectImagePicker
                  key={uploadVersion}
                  disabled={preview || pending}
                  mode="append"
                  onSelectionChange={setSelectedImages}
                />
                <button
                  className="admin-button secondary"
                  disabled={preview || pending || !selectedImages}
                >
                  {pending
                    ? 'Uploading...'
                    : selectedImages
                      ? `Upload ${selectedImages} ${selectedImages === 1 ? 'photo' : 'photos'}`
                      : 'Upload photos'}
                  <Plus size={15} />
                </button>
              </form>
            </details>
          </div>
        )}
        {editor.slug && onRemove && (
          <div className="admin-editor-removal">
            <button
              className="admin-button danger-outline"
              disabled={preview || pending}
              onClick={() => onRemove(editor)}
            >
              <Trash2 size={15} /> Remove project
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
