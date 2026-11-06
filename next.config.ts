import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: '/assets/**', search: '' },
      { pathname: '/_next/static/media/**', search: '' },
      { pathname: '/logo.png', search: '' },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: '4.4mb' } },
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/:slug.html', destination: '/:slug', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default nextConfig;
