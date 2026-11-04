import AdminDashboard from '../../components/admin/AdminDashboard';
import { getAdminData } from '../../lib/admin/data';

export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  return <AdminDashboard data={await getAdminData()} />;
}
