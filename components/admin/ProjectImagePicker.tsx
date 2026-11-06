'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { imageTypes, validateProjectImages } from '../../lib/project-image-policy';

export default function ProjectImagePicker({ disabled }: { disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  const [previews, setPreviews] = useState<{ name: string; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => objectUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function clear() {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
    setPreviews([]);
    setError(null);
    if (input.current) {
      input.current.value = '';
      input.current.setCustomValidity('');
    }
  }

  return (
    <fieldset className="admin-initial-images">
      <legend>
        <ImagePlus size={16} /> Project images
      </legend>
      <label>
        Choose images
        <input
          ref={input}
          type="file"
          name="images"
          accept={imageTypes.join(',')}
          multiple
          disabled={disabled}
          aria-describedby="initial-image-help"
          onChange={(event) => {
            objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrls.current = [];
            const files = [...(event.target.files ?? [])];
            const message = validateProjectImages(files);
            event.target.setCustomValidity(message ?? '');
            setError(message);
            const next = message
              ? []
              : files.map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
            objectUrls.current = next.map((file) => file.url);
            setPreviews(next);
          }}
        />
      </label>
      <p id="initial-image-help">
        Choose up to 10 images, totalling 10 MB. The first image becomes the cover. Images upload
        when you save the project.
      </p>
      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}
      {previews.length > 0 && (
        <div className="admin-image-previews">
          {previews.map((image, index) => (
            <figure key={image.url}>
              <img src={image.url} alt={`Selected image: ${image.name}`} />
              <figcaption>{index === 0 ? 'Cover image' : `Image ${index + 1}`}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {(previews.length > 0 || error) && (
        <button type="button" className="admin-text-button" onClick={clear} disabled={disabled}>
          <X size={14} /> Clear selection
        </button>
      )}
    </fieldset>
  );
}
