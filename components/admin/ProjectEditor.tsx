'use client';
import type { FormEvent } from 'react';
import { Check, ImagePlus, Plus, X } from 'lucide-react';
import { saveProject, uploadImage, updateImage } from '../../app/admin/actions';
import type { AdminProject, ActionResult } from '../../lib/admin/types';
import { disciplines } from '../../lib/admin/constants';
type Props = {
  editor: AdminProject;
  preview: boolean;
  pending: boolean;
  notice: string;
  onClose: () => void;
  run: (task: () => Promise<ActionResult>, complete?: () => void) => void;
};
export default function ProjectEditor({ editor, preview, pending, notice, onClose, run }: Props) {
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
          <label>
            Project name
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={editor.title}
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
              defaultValue={editor.slug}
              placeholder="project-courtyard-residence"
            />
            <small>Use lowercase words with hyphens. Existing URLs stay fixed.</small>
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
          <div className="admin-editor-row">
            <label>
              Display order
              <input
                name="sortOrder"
                type="number"
                required
                min={0}
                max={100000}
                defaultValue={editor.sortOrder}
              />
            </label>
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
          </div>
          <button className="admin-button primary" disabled={preview || pending}>
            {pending ? 'Saving…' : 'Save project'}
            <Check size={15} />
          </button>
        </form>
        <div className="admin-editor-gallery">
          <div className="admin-panel-heading">
            <h3>Project images</h3>
            <span className="admin-small-caption">{editor.images.length} images</span>
          </div>
          {editor.images.map((image) => (
            <form
              className="admin-image-row"
              key={image.id}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(() => updateImage(form));
              }}
            >
              <img src={image.src} alt={image.alt} />
              <input type="hidden" name="id" value={image.id} />
              <label>
                <span className="admin-sr-only">Image description</span>
                <input
                  name="alt"
                  aria-label="Image description"
                  defaultValue={image.alt}
                  required
                  maxLength={300}
                />
              </label>
              <label className="admin-image-order">
                Order
                <input
                  name="sortOrder"
                  aria-label="Image order"
                  type="number"
                  min={0}
                  max={100000}
                  defaultValue={image.sortOrder}
                />
              </label>
              <button
                className="admin-icon-button"
                disabled={preview || pending}
                aria-label="Save image details"
              >
                <Check size={17} />
              </button>
            </form>
          ))}
          {editor.slug ? (
            <form
              className="admin-upload"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                run(
                  () => uploadImage(form),
                  () => onClose(),
                );
              }}
            >
              <input type="hidden" name="slug" value={editor.slug} />
              <ImagePlus size={22} />
              <strong>Add another perspective</strong>
              <label>
                Image
                <input
                  name="image"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={preview}
                />
              </label>
              <label>
                Description
                <input name="alt" required maxLength={300} placeholder="Describe this view" />
              </label>
              <small>JPG, PNG, WebP, or AVIF · Up to 10 MB</small>
              <button className="admin-button secondary" disabled={preview || pending}>
                Upload image
                <Plus size={15} />
              </button>
            </form>
          ) : (
            <p className="admin-small-caption">Save your project first, then add its images.</p>
          )}
        </div>
      </section>
    </div>
  );
}
