'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PoolClient } from 'pg';
import { isAdminConfigured, isAllowedAdmin, requireAdmin } from '../../lib/admin/auth';
import { auth } from '../../lib/neon/auth';
import { getDatabase, query } from '../../lib/db';
import { isCloudinaryConfigured } from '../../lib/cloudinary';
import {
  cleanupProjectImages,
  removeProjectImage,
  uploadProjectImage,
  type StoredProjectImage,
} from '../../lib/project-images';
import { validateProjectImages } from '../../lib/project-image-policy';
import type { ActionResult } from '../../lib/admin/types';

export async function signIn(
  _state: { error: string },
  form: FormData,
): Promise<{ error: string }> {
  if (!isAdminConfigured())
    return { error: 'Connect Neon and configure ADMIN_EMAILS to enable sign-in.' };
  const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase(),
    password = String(form.get('password') ?? '');
  if (!email || email.length > 254 || !password || password.length > 1024)
    return { error: 'Enter your email and password.' };
  const { data, error } = await auth.signIn.email({ email, password });
  if (error || !data?.user || !isAllowedAdmin(data.user.email)) {
    await auth.signOut();
    return { error: 'Sign-in failed. Check your credentials and studio access.' };
  }
  const [member] = await query('select user_id from public.studio_admins where user_id=$1', [
    data.user.id,
  ]);
  if (!member) {
    await auth.signOut();
    return { error: 'This account does not have studio access.' };
  }
  redirect('/admin');
}
export async function signOut() {
  await auth.signOut();
  redirect('/admin/login');
}
function refreshPortfolio(slug: string) {
  for (const path of ['/', '/projects', `/${slug}`, '/sitemap.xml']) revalidatePath(path);
  revalidatePath('/admin', 'layout');
}

class ProjectSaveError extends Error {}

async function attachImages(
  client: PoolClient,
  slug: string,
  images: readonly (StoredProjectImage & { alt: string })[],
) {
  if (!images.length) return;
  await client.query(
    `insert into public.project_images(project_slug,src,alt,sort_order,storage_key)
     select $1,batch.src,batch.alt,base.position+batch.ordinality::integer,batch.storage_key
     from unnest($2::text[],$3::text[],$4::text[]) with ordinality as batch(src,alt,storage_key,ordinality)
     cross join (select coalesce(max(sort_order),-1) as position from public.project_images where project_slug=$1) base`,
    [
      slug,
      images.map((image) => image.src),
      images.map((image) => image.alt),
      images.map((image) => image.storageKey),
    ],
  );
}

export async function saveProject(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const slug = String(form.get('slug') ?? ''),
    intent = form.get('intent'),
    title = String(form.get('title') ?? '').trim(),
    description = String(form.get('description') ?? '').trim(),
    categories = form.getAll('categories').map(String),
    published = form.get('published') === 'on';
  if (
    (intent !== 'create' && intent !== 'update') ||
    !/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 100 ||
    !title ||
    title.length > 160 ||
    description.length > 10000 ||
    !categories.length ||
    categories.some((v) => !['architecture', 'interior', 'landscape'].includes(v))
  )
    return { ok: false, error: 'Check the project name, categories, and URL.' };
  const imageEntries = form.getAll('images');
  if (imageEntries.some((entry) => !(entry instanceof File)))
    return { ok: false, error: 'Choose valid project images.' };
  const files = (imageEntries as File[]).filter((file) => file.name || file.size);
  const imageError = validateProjectImages(files);
  if (imageError) return { ok: false, error: imageError };
  if (files.length && !isCloudinaryConfigured())
    return { ok: false, error: 'Configure Cloudinary to upload images.' };
  const uploads = await Promise.allSettled(files.map((file) => uploadProjectImage(slug, file)));
  const images = uploads.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
  if (uploads.some((result) => result.status === 'rejected')) {
    await cleanupProjectImages(images);
    return {
      ok: false,
      error: 'Images could not be uploaded. The project was not saved. Please try again.',
    };
  }

  let client: PoolClient | undefined;
  try {
    client = await getDatabase().connect();
    await client.query('BEGIN');
    // Allocate new positions serially; editing a project preserves its position.
    await client.query('LOCK TABLE public.projects IN SHARE ROW EXCLUSIVE MODE');
    const existing = await client.query(
      'select slug from public.projects where slug=$1 for update',
      [slug],
    );
    if ((intent === 'update' && !existing.rowCount) || (intent === 'create' && existing.rowCount)) {
      throw new ProjectSaveError(
        intent === 'update'
          ? 'This project no longer exists.'
          : 'That project URL is already in use.',
      );
    }
    if (published && !images.length) {
      const image = await client.query(
        'select id from public.project_images where project_slug=$1 limit 1',
        [slug],
      );
      if (!image.rowCount) {
        throw new ProjectSaveError('Add at least one image before publishing.');
      }
    }
    const parameters = [
      slug,
      title,
      description,
      categories,
      form.get('featured') === 'on',
      published,
    ];
    if (intent === 'update') {
      await client.query(
        'update public.projects set title=$2,description=$3,categories=$4,featured=$5,published=$6 where slug=$1',
        parameters,
      );
    } else {
      await client.query(
        `insert into public.projects(slug,title,description,categories,sort_order,featured,published)
         select $1,$2,$3,$4,coalesce(max(sort_order),-1)+1,$5,$6 from public.projects`,
        parameters,
      );
    }
    await attachImages(
      client,
      slug,
      images.map((image, index) => ({ ...image, alt: `${title} — view ${index + 1}` })),
    );
    await client.query('COMMIT');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    await cleanupProjectImages(images);
    return {
      ok: false,
      error:
        error instanceof ProjectSaveError
          ? error.message
          : 'Could not save the project. Please try again.',
    };
  } finally {
    client?.release();
  }
  refreshPortfolio(slug);
  return { ok: true, message: 'Project saved.' };
}

export async function removeProject(slug: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
    return { ok: false, error: 'Invalid project.' };

  const client = await getDatabase().connect();
  let storageKeys: string[] = [];
  try {
    await client.query('BEGIN');
    // Match the save lock order, then block uploads while collecting owned files.
    await client.query('LOCK TABLE public.projects IN SHARE ROW EXCLUSIVE MODE');
    const project = await client.query(
      'select slug from public.projects where slug=$1 for update',
      [slug],
    );
    if (!project.rowCount) {
      await client.query('ROLLBACK');
      refreshPortfolio(slug);
      revalidatePath('/[slug]', 'page');
      return { ok: true, message: 'Project already removed.' };
    }
    const images = await client.query<{ storage_key: string }>(
      'select storage_key from public.project_images where project_slug=$1 and storage_key is not null',
      [slug],
    );
    storageKeys = images.rows.map((image) => image.storage_key);
    // The foreign key removes image metadata with the project in this transaction.
    await client.query('delete from public.projects where slug=$1', [slug]);
    await client.query('COMMIT');
  } catch {
    await client.query('ROLLBACK');
    return { ok: false, error: 'Could not remove the project. Please try again.' };
  } finally {
    client.release();
  }

  refreshPortfolio(slug);
  // Neighbouring project pages also contain previous/next links to this project.
  revalidatePath('/[slug]', 'page');
  const cleanup = await Promise.allSettled(storageKeys.map((key) => removeProjectImage(key)));
  const remainingKeys = storageKeys.filter((_, index) => cleanup[index].status === 'rejected');
  if (remainingKeys.length) {
    console.error('Project upload cleanup failed.', { project: slug, storageKeys: remainingKeys });
    return { ok: true, message: 'Project removed. Some uploaded images still need cleanup.' };
  }
  return { ok: true, message: 'Project removed.' };
}
export async function updateInquiry(id: string, status: string): Promise<ActionResult> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['new', 'contacted', 'archived'].includes(status))
    return { ok: false, error: 'Invalid inquiry update.' };
  const rows = await query(
    'update public.contact_inquiries set status=$1 where id=$2 returning id',
    [status, id],
  );
  if (!rows.length) return { ok: false, error: 'Could not update the inquiry.' };
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Inquiry updated.' };
}
export async function uploadImage(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const slug = String(form.get('slug') ?? ''),
    alt = String(form.get('alt') ?? '').trim(),
    image = form.get('image');
  if (
    !/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    !alt ||
    alt.length > 300 ||
    !(image instanceof File) ||
    validateProjectImages([image])
  )
    return { ok: false, error: 'Choose an image under 10 MB and add a description.' };
  if (!isCloudinaryConfigured())
    return { ok: false, error: 'Configure Cloudinary to upload images.' };
  let uploaded: StoredProjectImage | undefined;
  let client: PoolClient | undefined;
  try {
    uploaded = await uploadProjectImage(slug, image);
    client = await getDatabase().connect();
    await client.query('BEGIN');
    const project = await client.query(
      'select slug from public.projects where slug=$1 for update',
      [slug],
    );
    if (!project.rowCount) throw new ProjectSaveError('This project no longer exists.');
    await attachImages(client, slug, [{ ...uploaded, alt }]);
    await client.query('COMMIT');
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (uploaded) await cleanupProjectImages([uploaded]);
    return {
      ok: false,
      error:
        error instanceof ProjectSaveError
          ? error.message
          : 'Image upload failed. Please try again.',
    };
  } finally {
    client?.release();
  }
  refreshPortfolio(slug);
  return { ok: true, message: 'Image uploaded.' };
}
export async function updateImage(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('id') ?? ''),
    alt = String(form.get('alt') ?? '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !alt || alt.length > 300)
    return { ok: false, error: 'Check the image description.' };
  try {
    const [row] = await query<{ project_slug: string }>(
      'update public.project_images set alt=$1 where id=$2 returning project_slug',
      [alt, id],
    );
    if (!row) return { ok: false, error: 'Image not found.' };
    refreshPortfolio(row.project_slug);
  } catch {
    return { ok: false, error: 'Could not save the image.' };
  }
  return { ok: true, message: 'Image details saved.' };
}
