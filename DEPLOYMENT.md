# Vercel and Neon deployment

## Vercel website and admin subdomain

Production deployment completed on 6 November 2026:
`dpl_6eZPLmcSe9EXj8mSY7dsgnbynHNr` is READY and assigned to
`https://www.robarchstudio.com`. Required runtime variables were securely added
to Vercel production after explicit approval.

Cloud `npm run build` passed. Live checks returned HTTP 200 for the home, projects,
about, contact, services, sitemap and robots pages. Contact validation and the
public-to-admin redirect passed. Neon Auth sign-in, authenticated admin root and
all four admin pages, and sign-out passed using the verified www TLS transport
with the admin HTTP Host while DNS is pending. Normal browser access and live
WebSocket behavior on the admin domain still need verification after DNS is set.

Use the existing `rob-architects` project in `clgrizvan-8911s-projects`. Both domains
belong on the same Next.js deployment; a second Vercel project is unnecessary.

- Public website: `https://www.robarchstudio.com`.
- Admin entry: `https://admin.robarchstudio.com` (authenticated rewrite to `/admin`).
- Admin pages keep `/admin/projects`, `/admin/inquiries`, `/admin/settings`, and
  `/admin/login`. Local development and preview URLs retain `/admin` too.
- Public-domain `/admin` links redirect to the admin domain. Cookies stay on their
  own host; sign in on the admin domain after the DNS record is active.
- The admin host blocks indexing through robots.txt and admin response headers.

The project is linked in ignored `.vercel/project.json`. The root `vercel.json`
selects Next.js, `npm ci`, `npm run build`, and Singapore (`sin1`) for functions.

Neon Auth and Realtime include `https://admin.robarchstudio.com`. The existing
database, inquiry function, and storage remain in the production Neon branch.
Do not run the seed/migration command just to deploy this existing database:
the seed imports sample projects that the studio may already have removed.

Add this record at the existing DNS provider (GoDaddy nameservers), preserving
all other records. Vercel verified the `www` CNAME already.

| Type  | Name  | Value                               |
| ----- | ----- | ----------------------------------- |
| CNAME | admin | 24cb58411433f9fc.vercel-dns-017.com |

Required production values are listed in `.env.example`. For an authorized
transfer from local settings, `node scripts/setup-vercel-env.cjs` first validates
and lists variable names without printing values. `--apply` adds the runtime
variables to the linked project's production environment through stdin. It never
uploads the local Vercel OIDC token or the unpooled migration URL, and omits the
known-invalid Cloudinary management credentials. Cloudinary uploads use the
approved public `rob_arch` preset; permanent Cloudinary cleanup still needs valid
management credentials added separately. The script stops if an existing variable
would need overwriting; review it in Vercel before changing it.

After environment setup, run `npm run check`, `npm run test:admin-hosts`,
`npm run test:images`, and `npm run build`. Deploy the current workspace with
`npx vercel@latest --prod --scope clgrizvan-8911s-projects`, then check the live
contact form, admin login, published and draft images, and the live inquiry inbox.
The local build alone does not verify the deployed services.

Project uploads are limited to 4 MB total per save, including when adding images
later, leaving room for multipart fields under Vercel's 4.5 MB request limit.
Larger batches require saving in smaller groups or a future direct-upload flow.

## Neon backend

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

For public project uploads, set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET to
the unsigned image preset. Also configure valid CLOUDINARY_API_KEY and
CLOUDINARY_API_SECRET (or CLOUDINARY_URL) to enable permanent Cloudinary asset cleanup.
Without the preset, valid API credentials enable authenticated image uploads instead.
Set these values on the Next.js hosting platform. The API secret stays server-side.
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
