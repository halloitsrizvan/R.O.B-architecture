import AdminLogin from '../../../components/admin/AdminLogin';
import { isAdminConfigured } from '../../../lib/admin/auth';

export const dynamic = 'force-dynamic';
export default function LoginPage() {
  return <AdminLogin configured={isAdminConfigured()} />;
}
