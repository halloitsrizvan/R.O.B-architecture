'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';
import {
  createAdminAuthClient,
  isAdminConfigured,
  isAllowedAdmin,
  requireAdmin,
} from '../../lib/admin/auth';
import type { ActionResult } from '../../lib/admin/types';

export async function signIn(
  _state: { error: string },
  form: FormData,
): Promise<{ error: string }> {
  if (!isAdminConfigured())
    return { error: 'Connect Supabase and configure ADMIN_EMAILS to enable sign-in.' };
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || email.length > 254 || !password || password.length > 1024)
    return { error: 'Enter your email and password.' };
  const auth = await createAdminAuthClient();
  if (!auth) return { error: 'Authentication is unavailable.' };
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email_confirmed_at || !isAllowedAdmin(data.user.email)) {
    await auth.auth.signOut();
    return { error: 'Sign-in failed. Check your credentials and studio access.' };
  }
  redirect('/admin');
}

export async function signOut() {
  const auth = await createAdminAuthClient();
  await auth?.auth.signOut();
  redirect('/admin/login');
}

function refreshPortfolio(slug: string) {
  revalidatePath('/');
  revalidatePath('/projects.html');
  revalidatePath(`/${slug}.html`);
  revalidatePath('/sitemap.xml');
  revalidatePath('/admin');
}

export async function saveProject(form: FormData): Promise<ActionResult> {
  const { database } = await requireAdmin();
  const slug = String(form.get('slug') ?? '');
  const title = String(form.get('title') ?? '').trim();
  const description = String(form.get('description') ?? '').trim();
  const categories = form.getAll('categories').map(String);
  const sortOrder = Number(form.get('sortOrder'));
  if (
    !/^project-[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 100 ||
    !title ||
    title.length > 160 ||
    description.length > 10000 ||
    !Number.isSafeInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 100000 ||
    !categories.length ||
    categories.some((value) => !['architecture', 'interior', 'landscape'].includes(value))
  )
    return { ok: false, error: 'Check the project name, categories, URL, and display order.' };
  if (form.get('published') === 'on') {
    const { count, error } = await database
      .from('project_images')
      .select('id', { count: 'exact', head: true })
      .eq('project_slug', slug);
    if (error || !count)
      return {
        ok: false,
        error: 'Save this project as a draft and add at least one image before publishing.',
      };
  }
  const { error } = await database.from('projects').upsert(
    {
      slug,
      title,
      description,
      categories,
      sort_order: sortOrder,
      featured: form.get('featured') === 'on',
      published: form.get('published') === 'on',
    },
    { onConflict: 'slug' },
  );
  if (error)
    return {
      ok: false,
      error:
        error.code === '23505'
          ? 'That display order is already in use. Choose another number.'
          : 'Could not save the project. Please try again.',
    };
  refreshPortfolio(slug);
  return { ok: true, message: 'Project saved.' };
}

export async function updateInquiry(id: string, status: string): Promise<ActionResult> {
  const { database } = await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id) || !['new', 'contacted', 'archived'].includes(status))
    return { ok: false, error: 'Invalid inquiry update.' };
  const { data, error } = await database
    .from('contact_inquiries')
    .update({ status })
    .eq('id', id)
    .select('id');
  if (error || !data?.length) return { ok: false, error: 'Could not update the inquiry.' };
  revalidatePath('/admin');
  return { ok: true, message: 'Inquiry updated.' };
}

export async function uploadImage(form: FormData): Promise<ActionResult> {
  const { database } = await requireAdmin();
  const slug = String(form.get('slug') ?? '');
  const alt = String(form.get('alt') ?? '').trim();
  const image = form.get('image');
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
    return {
      ok: false,
      error: 'Choose a JPG, PNG, WebP, or AVIF image under 10 MB and add a description.',
    };
  const { data: project } = await database
    .from('projects')
    .select('slug')
    .eq('slug', slug)
    .maybeSingle();
  if (!project) return { ok: false, error: 'Save the project before uploading images.' };
  const object = `${slug}/${randomUUID()}.${extensions[image.type]}`;
  const { error: uploadError } = await database.storage
    .from('project-images')
    .upload(object, image, { contentType: image.type, upsert: false });
  if (uploadError)
    return {
      ok: false,
      error: 'Upload failed. Check that the project-images storage bucket exists.',
    };
  const { data: lastImage } = await database
    .from('project_images')
    .select('sort_order')
    .eq('project_slug', slug)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: url } = database.storage.from('project-images').getPublicUrl(object);
  const { error } = await database.from('project_images').insert({
    project_slug: slug,
    src: url.publicUrl,
    alt,
    sort_order: (lastImage?.sort_order ?? -1) + 1,
    src_set: null,
    sizes: null,
  });
  if (error) {
    await database.storage.from('project-images').remove([object]);
    return { ok: false, error: 'Could not attach the image. Please try again.' };
  }
  refreshPortfolio(slug);
  return { ok: true, message: 'Image uploaded.' };
}

export async function updateImage(form: FormData): Promise<ActionResult> {
  const { database } = await requireAdmin();
  const id = String(form.get('id') ?? '');
  const alt = String(form.get('alt') ?? '').trim();
  const order = Number(form.get('sortOrder'));
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    !alt ||
    alt.length > 300 ||
    !Number.isSafeInteger(order) ||
    order < 0 ||
    order > 100000
  )
    return { ok: false, error: 'Check the image description and order.' };
  const { data, error } = await database
    .from('project_images')
    .update({ alt, sort_order: order })
    .eq('id', id)
    .select('project_slug');
  if (error || !data?.length)
    return {
      ok: false,
      error:
        error?.code === '23505'
          ? 'That image order is in use. Choose a free number.'
          : 'Could not update the image.',
    };
  refreshPortfolio(data[0].project_slug);
  return { ok: true, message: 'Image details saved.' };
}
