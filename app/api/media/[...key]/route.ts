import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getAdminIdentity } from '../../../../lib/admin/auth';
import { readProjectImage } from '../../../../lib/project-images';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  if (!/^(?:cloudinary\/)?project-[a-z0-9-]+\/[0-9a-f-]+\.(jpg|png|webp|avif)$/.test(key))
    return new NextResponse('Not found', { status: 404 });
  const storageKey = key.startsWith('cloudinary/')
    ? 'cloudinary:' + key.slice('cloudinary/'.length)
    : key;
  const [image] = await query<{ published: boolean }>(
    `select p.published from public.project_images i join public.projects p on p.slug=i.project_slug where i.storage_key=$1`,
    [storageKey],
  );
  if (!image || (!image.published && !(await getAdminIdentity())))
    return new NextResponse('Not found', { status: 404 });
  try {
    const imageFile = await readProjectImage(storageKey);
    return new NextResponse(imageFile.bytes, {
      headers: {
        'Content-Type': imageFile.contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': image.published ? 'public, max-age=60, s-maxage=300' : 'private, no-store',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}
