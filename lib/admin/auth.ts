import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServiceClient } from '../supabase/server';
import type { Database } from '../../types/database';

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.ADMIN_EMAILS?.trim(),
  );
}

export function isAllowedAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export async function createAdminAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* The admin proxy refreshes cookies when rendering server components. */
        }
      },
    },
  });
}

/** Every privileged read and write verifies the user with Supabase Auth and the server allowlist. */
export async function requireAdmin() {
  if (!isAdminConfigured())
    throw new Error('Connect Supabase and configure an administrator first.');
  const auth = await createAdminAuthClient();
  if (!auth) throw new Error('Authentication is not configured.');
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user || !data.user.email_confirmed_at || !isAllowedAdmin(data.user.email))
    redirect('/admin/login');
  const database = createServiceClient();
  if (!database) throw new Error('The admin database connection is unavailable.');
  return { database, user: data.user };
}
