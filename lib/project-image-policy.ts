export const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
// Leave room for multipart fields below Vercel's 4.5 MB request limit.
export const maxImageBytes = 4 * 1024 * 1024;
export const maxProjectImagesPerSave = 10;

export function validateProjectImages(files: readonly File[]): string | null {
  if (files.length > maxProjectImagesPerSave) return 'Choose up to 10 images at a time.';
  if (files.some((file) => !imageTypes.includes(file.type) || file.size === 0))
    return 'Choose JPG, PNG, WebP, or AVIF images.';
  if (files.reduce((size, file) => size + file.size, 0) > maxImageBytes)
    return 'Choose images totalling no more than 4 MB.';
  return null;
}
