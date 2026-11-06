import { NextResponse, type NextRequest } from 'next/server';
import { auth } from './lib/neon/auth';

const protectAdmin = auth.middleware({
  loginUrl: '/admin/login',
  publicRoutes: ['/admin/login'],
});
const website = new URL(process.env.SITE_URL || 'https://www.robarchstudio.com');
const administration = new URL(process.env.ADMIN_SITE_URL || 'https://admin.robarchstudio.com');

export default async function proxy(request: NextRequest) {
  const hostname = (request.headers.get('host') || request.nextUrl.host).split(':')[0];
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminHost = hostname === administration.hostname;
  const isWebsiteHost =
    hostname === website.hostname || hostname === website.hostname.replace(/^www\./, '');

  if (isAdminRoute && isWebsiteHost && administration.hostname !== website.hostname) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, administration), 307);
  }

  if (isAdminHost) {
    if (pathname === '/robots.txt') {
      return new NextResponse('User-agent: *\nDisallow: /\n', {
        headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow' },
      });
    }
    if (pathname === '/' || isAdminRoute) {
      const response = await protectAdmin(request);
      if (pathname === '/' && response.headers.has('x-middleware-next')) {
        const destination = request.nextUrl.clone();
        destination.pathname = '/admin';
        // Preserve the SDK's refreshed cookies and forwarded session headers.
        response.headers.delete('x-middleware-next');
        response.headers.set('x-middleware-rewrite', destination.href);
      }
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      return response;
    }
    // Auth, media and live-query endpoints retain their existing authorization.
    if (pathname.startsWith('/api/')) return NextResponse.next();
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, website), 307);
  }

  // Local development and Vercel previews keep their own /admin login and cookies.
  return isAdminRoute ? protectAdmin(request) : NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|assets/|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?)$).*)'],
};
