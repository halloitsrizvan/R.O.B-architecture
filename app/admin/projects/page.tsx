import type { Metadata } from 'next';
import AdminLiveDashboard from '../../../components/admin/AdminLiveDashboard';
import { getAdminData } from '../../../lib/admin/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Projects | Studio Admin | R.O.B' };

export default async function AdminProjectsPage() {
  return <AdminLiveDashboard data={await getAdminData()} view="projects" />;
}
