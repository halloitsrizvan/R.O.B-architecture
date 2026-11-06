'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Pencil, X } from 'lucide-react';
import { updateImage } from '../../app/admin/actions';
import { imageTypes, validateProjectImages } from '../../lib/project-image-policy';
import type { ActionResult, AdminImage } from '../../lib/admin/types';

type Props = {
  image: AdminImage;
  disabled: boolean;
  cover: boolean;
  run: (task: () => Promise<ActionResult>, complete?: () => void) => void;
};

export default function ProjectImageEditor({ image, disabled, cover, run }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = Boolean(preview || error || (description !== null && description !== image.alt));

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function clear() {
    setPreview(null);
    setDescription(null);
    setError(null);
    if (input.current) {
      input.current.value = '';
      input.current.setCustomValidity('');
    }
  }

  return (
    <form
      className="admin-image-card"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run(() => updateImage(form), clear);
      }}
    >
      <input type="hidden" name="id" value={image.id} />
      <div className="admin-image-preview">
        <img src={preview || image.src} alt={description ?? image.alt} />
        {cover && <span className="admin-image-badge">Cover</span>}
        {preview && <span className="admin-image-badge pending">Unsaved</span>}
        <button
          type="button"
          className="admin-change-photo"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={14} /> Change photo
        </button>
      </div>
      <input
        ref={input}
        className="admin-image-file"
        aria-label="Replacement photo"
        name="image"
        type="file"
        accept={imageTypes.join(',')}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          const message = file ? validateProjectImages([file]) : null;
          event.target.setCustomValidity(message || '');
          setError(message);
          setPreview(file && !message ? URL.createObjectURL(file) : null);
        }}
      />
      <details className="admin-image-description">
        <summary>
          <Pencil size={12} /> Edit description
        </summary>
        <label>
          <span className="admin-sr-only">Image description</span>
          <input
            name="alt"
            value={description ?? image.alt}
            onChange={(event) => setDescription(event.target.value)}
            required
            maxLength={300}
            disabled={disabled}
            onInvalid={(event) => {
              const details = event.currentTarget.closest('details');
              if (details) details.open = true;
            }}
          />
        </label>
      </details>
      {error && (
        <p className="admin-field-error" role="alert">
          {error}
        </p>
      )}
      {dirty && (
        <div className="admin-image-actions">
          <button className="admin-button primary" disabled={disabled || Boolean(error)}>
            <Check size={14} /> Save
          </button>
          <button type="button" className="admin-text-button" disabled={disabled} onClick={clear}>
            <X size={13} /> Cancel
          </button>
        </div>
      )}
    </form>
  );
}
