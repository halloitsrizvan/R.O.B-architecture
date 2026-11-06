import AdminLiveDashboard from '../../components/admin/AdminLiveDashboard';
import { getAdminData } from '../../lib/admin/data';

export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  return <AdminLiveDashboard data={await getAdminData()} view="overview" />;
}
