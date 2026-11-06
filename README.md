# R.O.B Architectural Studio

Next.js App Router, strict TypeScript, React, GSAP, and Neon.

Public pages use extensionless URLs such as /projects, /about, /contact, and
/project-urban-plaza. Previous .html URLs permanently redirect to their matching
page; /index.html redirects to /.

## Development

1. Install dependencies with npm ci.
2. Link the existing Neon production project with neon init as described in DEPLOYMENT.md.
3. Run neon deploy --env .env.local to provision the declared services and pull their variables.
4. Set the application secrets and ADMIN_EMAILS shown in .env.example.
5. Run npm run db:migrate, then npm run dev.

## Commands

- npm run check: TypeScript, lint, formatting, and local content checks.
- npm run build: production build using the live Neon database.
- npm start: production web server.
- npm run test:database: isolated PostgreSQL schema and permission tests.
- npm run test:browser: public website regression checks against TEST_BASE_URL.
- npm run test:neon: live end-to-end checks for all five Neon services. Set ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD in the invoking shell; these are never committed.

See [DEPLOYMENT.md](DEPLOYMENT.md) and [database/README.md](database/README.md).

## Admin pages

- `/admin`: overview.
- `/admin/projects`: project editing, images, publishing, and removal.
- `/admin/inquiries`: the live inquiry inbox.
- `/admin/settings`: studio settings and connection details.

Each page supports direct links, reloads, and browser back/forward navigation.
Project removal controls appear only on the Projects page. Run `npm run test:realtime`
with the test admin credentials to check admin routing and connection lifecycles.

## Project images

Select images while creating a project; the first image becomes its cover. A single save
uploads the images and saves their references with the project. You can publish immediately
when images are selected, or save a draft without images. Choose up to 10 JPG, PNG, WebP,
or AVIF images, totalling at most 10 MB per save.

Public uploads use `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` (the unsigned
`rob_arch` preset). Draft images stay hidden by the website, but their Cloudinary URLs
are public. Uploads still pass through an authenticated administrator action.

Automatic permanent cleanup requires a valid `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET`, or `CLOUDINARY_URL`. Without working credentials, removing a
project removes it from the website and reports that Cloudinary files need manual cleanup.
Never use a `NEXT_PUBLIC_` prefix for credentials. Existing Neon images continue to work
using the AWS environment variables. For authenticated Cloudinary assets instead of
public preset uploads, leave the upload preset unset and configure valid API credentials.

`npm run test:images` checks transactions, validation, and media authorization using
isolated PostgreSQL and a mocked provider. The full `test:neon` image/deletion check
requires valid Cloudinary management credentials and verifies authentication before
creating test assets.
