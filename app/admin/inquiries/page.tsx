import type { Metadata } from 'next';
import AdminLiveDashboard from '../../../components/admin/AdminLiveDashboard';
import { getAdminData } from '../../../lib/admin/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Inquiries | Studio Admin | R.O.B' };

export default async function AdminInquiriesPage() {
  return <AdminLiveDashboard data={await getAdminData()} view="inbox" />;
}
