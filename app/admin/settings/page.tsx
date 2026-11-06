import type { Metadata } from 'next';
import AdminLiveDashboard from '../../../components/admin/AdminLiveDashboard';
import { getAdminData } from '../../../lib/admin/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings | Studio Admin | R.O.B' };

export default async function AdminSettingsPage() {
  return <AdminLiveDashboard data={await getAdminData()} view="settings" />;
}
