'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import { isAdminConfigured, isAllowedAdmin, requireAdmin } from '../../lib/admin/auth';
import { auth } from '../../lib/neon/auth';
import { query } from '../../lib/db';
import { uploadObject, removeObject } from '../../lib/neon/storage';
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
  for (const path of ['/', '/projects', `/${slug}`, '/sitemap.xml', '/admin']) revalidatePath(path);
}
function conflict(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
export async function saveProject(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const slug = String(form.get('slug') ?? ''),
    title = String(form.get('title') ?? '').trim(),
    description = String(form.get('description') ?? '').trim(),
    categories = form.getAll('categories').map(String),
    order = Number(form.get('sortOrder')),
    published = form.get('published') === 'on';
  if (
    !/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 100 ||
    !title ||
    title.length > 160 ||
    description.length > 10000 ||
    !Number.isSafeInteger(order) ||
    order < 0 ||
    order > 100000 ||
    !categories.length ||
    categories.some((v) => !['architecture', 'interior', 'landscape'].includes(v))
  )
    return { ok: false, error: 'Check the project name, categories, URL, and display order.' };
  if (published) {
    const [image] = await query(
      'select id from public.project_images where project_slug=$1 limit 1',
      [slug],
    );
    if (!image) return { ok: false, error: 'Save a draft and add an image before publishing.' };
  }
  try {
    await query(
      `insert into public.projects(slug,title,description,categories,sort_order,featured,published) values($1,$2,$3,$4,$5,$6,$7) on conflict(slug) do update set title=excluded.title,description=excluded.description,categories=excluded.categories,sort_order=excluded.sort_order,featured=excluded.featured,published=excluded.published`,
      [slug, title, description, categories, order, form.get('featured') === 'on', published],
    );
  } catch (error) {
    return {
      ok: false,
      error: conflict(error)
        ? 'That display order is already in use. Choose another number.'
        : 'Could not save the project.',
    };
  }
  refreshPortfolio(slug);
  return { ok: true, message: 'Project saved.' };
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
  revalidatePath('/admin');
  return { ok: true, message: 'Inquiry updated.' };
}
export async function uploadImage(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const slug = String(form.get('slug') ?? ''),
    alt = String(form.get('alt') ?? '').trim(),
    image = form.get('image');
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
  };
  if (
    !/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    !alt ||
    alt.length > 300 ||
    !(image instanceof File) ||
    !extensions[image.type] ||
    image.size === 0 ||
    image.size > 10 * 1024 * 1024
  )
    return { ok: false, error: 'Choose an image under 10 MB and add a description.' };
  if (!(await query('select slug from public.projects where slug=$1', [slug])).length)
    return { ok: false, error: 'Save the project before uploading images.' };
  const key = `${slug}/${randomUUID()}.${extensions[image.type]}`;
  try {
    await uploadObject(key, image);
  } catch {
    return { ok: false, error: 'Image upload failed. Please try again.' };
  }
  try {
    await query(
      `insert into public.project_images(project_slug,src,alt,sort_order,storage_key) select $1,$2,$3,coalesce(max(sort_order),-1)+1,$4 from public.project_images where project_slug=$1`,
      [slug, '/api/media/' + key, alt, key],
    );
  } catch {
    await removeObject(key);
    return { ok: false, error: 'Could not attach the image. Please try again.' };
  }
  refreshPortfolio(slug);
  return { ok: true, message: 'Image uploaded.' };
}
export async function updateImage(form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(form.get('id') ?? ''),
    alt = String(form.get('alt') ?? '').trim(),
    order = Number(form.get('sortOrder'));
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !alt ||
    alt.length > 300 ||
    !Number.isSafeInteger(order) ||
    order < 0 ||
    order > 100000
  )
    return { ok: false, error: 'Check the image description and order.' };
  try {
    const [row] = await query<{ project_slug: string }>(
      'update public.project_images set alt=$1,sort_order=$2 where id=$3 returning project_slug',
      [alt, order, id],
    );
    if (!row) return { ok: false, error: 'Image not found.' };
    refreshPortfolio(row.project_slug);
  } catch (error) {
    return {
      ok: false,
      error: conflict(error)
        ? 'That image order is in use. Choose a free number.'
        : 'Could not save the image.',
    };
  }
  return { ok: true, message: 'Image details saved.' };
}
