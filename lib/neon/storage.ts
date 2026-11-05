import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

const bucket = 'assets';
let client: S3Client | undefined;
export function getStorage() {
  client ??= new S3Client({ forcePathStyle: true });
  return client;
}
export async function uploadObject(key: string, file: File) {
  await getStorage().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
}
export async function removeObject(key: string) {
  await getStorage().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
export async function readObject(key: string) {
  return getStorage().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}
