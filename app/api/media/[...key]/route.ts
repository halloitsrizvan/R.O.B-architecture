import { NextResponse } from 'next/server';
import { query } from '../../../../lib/db';
import { getAdminIdentity } from '../../../../lib/admin/auth';
import { readProjectImage } from '../../../../lib/project-images';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/');
  if (!/^(?:cloudinary\/)?project-[a-z0-9-]+\/[0-9a-f-]+\.(jpg|png|webp|avif)$/.test(key))
    return new NextResponse('Not found', { status: 404 });
  const [image] = await query<{ published: boolean; storage_key: string }>(
    `select p.published,i.storage_key from public.project_images i join public.projects p on p.slug=i.project_slug where i.src=$1 and i.storage_key is not null`,
    ['/api/media/' + key],
  );
  if (!image || (!image.published && !(await getAdminIdentity())))
    return new NextResponse('Not found', { status: 404 });
  try {
    const imageFile = await readProjectImage(image.storage_key);
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
