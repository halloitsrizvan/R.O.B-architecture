# Neon deployment

The frontend remains a Next.js app, suitable for Vercel. Its backend is Neon project floral-firefly-51122623, organization org-misty-field-06782675, branch production, in Singapore (ap-southeast-1).

## Provision services

The linked project is in .neon. Infrastructure is declared in neon.ts. Keep .neon and neon.ts in version control; credentials belong only in ignored environment files.

- neon init -y --org-id org-misty-field-06782675 --project-id floral-firefly-51122623 --branch production --services postgres,auth,object-storage,functions,realtime
- neon deploy --env .env.local
- npm run db:migrate
- npm run check
- npm run build
- npm start

Use --update-existing on deploy only after reviewing the reported configuration differences. The current Realtime origin list includes the production website, localhost:3000, localhost:3240, and localhost:3241. Add any other frontend preview origin deliberately before using its live inbox.

## Environment

Neon deploy pulls DATABASE_URL, DATABASE_URL_UNPOOLED, Auth URLs, AWS storage credentials/endpoint/region, the function URL, and Realtime URL/secret into .env.local. This project additionally uses NEON_AUTH_COOKIE_SECRET, STUDIO_FUNCTION_SECRET, INQUIRY_HASH_SECRET, ADMIN_EMAILS, and SITE_URL. Generate each application secret with a cryptographic random generator. The same STUDIO_FUNCTION_SECRET must be present in the app host and the function declaration; deploy with --env .env.local to supply it.

Copy these variables securely into the Vercel project environment before deploying the frontend. Never use NEXT_PUBLIC_ for a database URL, Auth cookie secret, S3 credentials, function secret, or Realtime secret. The Realtime URL alone is safe to send to the admin browser. Local credentials were preserved in an ignored backup before migration.

Set SITE_URL=https://www.robarchstudio.com. The production origin is registered with Neon Auth and Realtime. Vercel must use the Next.js framework preset with no dist output-directory override. Neon deploy publishes the backend services; it does not publish the Next.js frontend to Vercel.

## Architecture

For new project image uploads, configure CLOUDINARY_URL (the API environment variable from
Cloudinary Console), or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.
Set the same values on the Next.js hosting platform. The API secret stays server-side.
Existing Neon images still require the AWS variables; configuring Cloudinary does not
automatically move or delete those files.

- lib/db.ts: pooled node-postgres driver with Vercel pool lifecycle support. Runtime uses DATABASE_URL; migrations use the direct DATABASE_URL_UNPOOLED.
- database/migrations/: tracked, checksummed PostgreSQL migrations. database/seed.sql imports the original 12 projects and 36 image references without overwriting existing records.
- lib/neon/auth.ts and /api/auth/: Managed Neon Auth using its official Next.js adapter. /admin/login authenticates against Neon; admin reads and writes also require the server email allowlist and a matching studio_admins membership row.
- lib/neon/storage.ts and /api/media/: private Neon S3-compatible assets bucket. Store object keys in PostgreSQL. Published images pass through a cacheable Next.js route; draft images require an authorized admin session. Original website assets remain in public/assets.
- hello.ts: secured Neon Function handling inquiries next to PostgreSQL. Next.js validates incoming contact requests, hashes the request source, and calls the function with a server-only secret. The function validates again and uses a database-atomic rate limit.
- lib/neon/realtime.ts: seals the private inbox query. Its membership join revokes live access when an administrator is removed. The React binding refreshes sealed queries through a session-checked route and opens one connection per dashboard instance.

## Verification

Run npm run test:database and npm run check. Start a production server on port 3240 and run npm run test:neon with ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD set in the shell. It exercises incorrect/correct login, cookie restoration, draft creation, real S3 upload and byte-for-byte download, publication, Function-backed inquiry creation, live inbox delivery without refresh, status updates, access denial, and logout. Temporary records and objects are cleaned up in a finally block.

The old Supabase setup is archived under legacy/supabase and is no longer part of the app runtime.
