import 'server-only';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';

const namespace = 'rob_arch';
const keyPattern = /^cloudinary:(project-[a-z0-9-]+\/[0-9a-f-]+)\.(jpg|png|webp|avif)$/;

function credentials() {
  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      if (url.protocol === 'cloudinary:' && url.hostname && url.username && url.password) {
        return {
          cloud_name: url.hostname,
          api_key: decodeURIComponent(url.username),
          api_secret: decodeURIComponent(url.password),
        };
      }
    } catch {
      return null;
    }
  }
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  return cloud_name && api_key && api_secret ? { cloud_name, api_key, api_secret } : null;
}

function publicUploadConfiguration() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.CLOUDINARY_UPLOAD_PRESET || process.env.UPLOAD_PRESET;
  return cloudName && preset ? { cloudName, preset } : null;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(publicUploadConfiguration() || credentials());
}

function getCloudinary() {
  const configuration = credentials();
  if (!configuration) throw new Error('Configure Cloudinary to upload images.');
  cloudinary.config({ ...configuration, secure: true });
  return cloudinary;
}

function assetFromKey(key: string) {
  if (key.startsWith('cloudinary-public:')) {
    const match = key
      .slice('cloudinary-public:'.length)
      .match(/^([a-zA-Z0-9_/-]+)\.(jpg|png|webp|avif)$/);
    if (!match) throw new Error('Invalid image reference.');
    return { publicId: match[1], format: match[2] };
  }
  const match = key.match(keyPattern);
  if (!match) throw new Error('Invalid image reference.');
  return { publicId: `${namespace}/${match[1]}`, format: match[2] };
}

export async function uploadCloudinaryImage(slug: string, file: File) {
  const path = `${slug}/${randomUUID()}`;
  const unsigned = publicUploadConfiguration();
  if (unsigned) {
    const form = new FormData();
    form.set('file', file);
    form.set('upload_preset', unsigned.preset);
    form.set('public_id', `${namespace}/${path}`);
    form.set('tags', `rob_arch,${slug}`);
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(unsigned.cloudName)}/image/upload`,
      {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(60000),
      },
    );
    const uploaded = await response.json();
    if (
      !response.ok ||
      uploaded.resource_type !== 'image' ||
      uploaded.type !== 'upload' ||
      !/^(jpg|png|webp|avif)$/.test(uploaded.format) ||
      !/^[a-zA-Z0-9_/-]+$/.test(uploaded.public_id)
    )
      throw new Error('Cloudinary upload failed. Check the unsigned image preset.');
    return {
      storageKey: `cloudinary-public:${uploaded.public_id}.${uploaded.format}`,
      src: `/api/media/cloudinary/${path}.${uploaded.format}`,
    };
  }
  const client = getCloudinary();
  const bytes = Buffer.from(await file.arrayBuffer());
  const uploaded = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: `${namespace}/${path}`,
        resource_type: 'image',
        type: 'authenticated',
        overwrite: false,
        allowed_formats: ['jpg', 'png', 'webp', 'avif'],
        timeout: 60000,
      },
      (error, result) => {
        if (error || !result) reject(new Error('Cloudinary upload failed. Please try again.'));
        else resolve(result);
      },
    );
    stream.on('error', () => reject(new Error('Cloudinary upload failed. Please try again.')));
    stream.end(bytes);
  });
  return {
    storageKey: `cloudinary:${path}.${uploaded.format}`,
    src: `/api/media/cloudinary/${path}.${uploaded.format}`,
  };
}

export async function readCloudinaryImage(key: string) {
  const { publicId, format } = assetFromKey(key);
  const url = key.startsWith('cloudinary-public:')
    ? cloudinary.url(publicId, {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        resource_type: 'image',
        type: 'upload',
        format,
        secure: true,
        sign_url: false,
      })
    : getCloudinary().utils.private_download_url(publicId, format, {
        resource_type: 'image',
        type: 'authenticated',
        attachment: false,
        expires_at: Math.floor(Date.now() / 1000) + 60,
      });
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Image could not be loaded.');
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType:
      response.headers.get('content-type') ?? `image/${format === 'jpg' ? 'jpeg' : format}`,
  };
}

export async function removeCloudinaryImage(key: string) {
  const { publicId } = assetFromKey(key);
  const result = await getCloudinary().uploader.destroy(publicId, {
    resource_type: 'image',
    type: key.startsWith('cloudinary-public:') ? 'upload' : 'authenticated',
    invalidate: true,
  });
  if (result.result !== 'ok' && result.result !== 'not found')
    throw new Error('Cloudinary image could not be removed.');
}
