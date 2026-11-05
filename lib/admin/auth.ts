import 'server-only';
import { redirect } from 'next/navigation';
import { auth } from '../neon/auth';
import { query } from '../db';

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.NEON_AUTH_BASE_URL &&
    process.env.NEON_AUTH_COOKIE_SECRET &&
    process.env.ADMIN_EMAILS?.trim(),
  );
}
export function isAllowedAdmin(email: string | undefined): boolean {
  return Boolean(
    email &&
    (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .some((value) => value.trim().toLowerCase() === email.toLowerCase()),
  );
}
export async function getAdminIdentity() {
  if (!isAdminConfigured()) return null;
  const { data: session, error } = await auth.getSession();
  if (error || !session?.user || !isAllowedAdmin(session.user.email)) return null;
  const [membership] = await query<{ user_id: string }>(
    'select user_id from public.studio_admins where user_id=$1 and lower(email)=lower($2)',
    [session.user.id, session.user.email],
  );
  return membership ? session.user : null;
}
export async function requireAdmin() {
  const user = await getAdminIdentity();
  if (!user) redirect('/admin/login');
  return { user };
}
