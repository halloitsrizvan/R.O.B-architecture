import { auth } from './lib/neon/auth';
export default auth.middleware({ loginUrl: '/admin/login', publicRoutes: ['/admin/login'] });
export const config = { matcher: ['/admin/:path*'] };
