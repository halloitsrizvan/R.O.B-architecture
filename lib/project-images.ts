import 'server-only';
import { uploadCloudinaryImage, readCloudinaryImage, removeCloudinaryImage } from './cloudinary';
import { readObject, removeObject } from './neon/storage';

export type StoredProjectImage = { storageKey: string; src: string };

export const uploadProjectImage = uploadCloudinaryImage;

export async function readProjectImage(key: string) {
  if (key.startsWith('cloudinary:')) return readCloudinaryImage(key);
  const object = await readObject(key);
  const bytes = await object.Body?.transformToByteArray();
  if (!bytes) throw new Error('Image could not be loaded.');
  return {
    bytes: Buffer.from(bytes),
    contentType: object.ContentType ?? 'application/octet-stream',
  };
}

export async function removeProjectImage(key: string) {
  if (key.startsWith('cloudinary:')) return removeCloudinaryImage(key);
  return removeObject(key);
}

export async function cleanupProjectImages(images: readonly StoredProjectImage[]) {
  const results = await Promise.allSettled(
    images.map((image) => removeProjectImage(image.storageKey)),
  );
  if (results.some((result) => result.status === 'rejected'))
    console.error('Some unused project images could not be cleaned up.');
}
