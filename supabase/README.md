# Portfolio database

This directory contains the schema and starter content for projects, project images, and contact inquiries. Hosted provisioning is pending a free Supabase project slot or a new organization; no existing Supabase project has been modified.

## Connect a hosted project

1. Create a Supabase project in the Mumbai region and wait until it is healthy.
2. Apply the SQL migration under `migrations/` using the Supabase SQL editor or the CLI migration workflow.
3. Run `seed.sql` once to import the current 12 projects and 36 image references. It preserves existing rows if rerun. These are the website's current placeholder/demo entries; review them before launch.
4. Copy `.env.example` values into `.env.local`: set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY` from the project's API settings. Repeat these settings in Vercel and redeploy. Keep the secret key server-only.
5. Run `npm run test:database`, `npm run check`, and `npm run build`. After connecting, run a real inquiry test and verify its record in the dashboard.

Use `npx supabase --help` to inspect the installed CLI before running remote commands. Do not apply this schema to an unrelated database. Database types in `types/database.ts` mirror the migration; regenerate them from the linked project when it is available.

## Access model

- `projects`: anonymous visitors can read published entries only. Editing is restricted to trusted dashboard/server access.
- `project_images`: visitors can read images belonging to published projects. The `(project_slug, sort_order)` index supports both lookups and image order.
- `contact_inquiries`: no anonymous/authenticated access. The Next.js API submits through a server-only secret and a restricted invoker function. Visitors cannot read anyone's contact details.
- Inquiry limits are enforced atomically in PostgreSQL: five submissions per hashed request source per 15 minutes. Raw IP addresses are not stored. Vercel's trusted proxy header is used in production; local requests share one test source.
- `project-images` storage bucket: publicly readable photos, maximum 10 MB, restricted image types, no public uploads. Upload via the Supabase dashboard and replace the image URL in `project_images`. Existing photos stay in `public/assets/` or at their original URLs until you explicitly move them.

## Website behavior

Projects and galleries read from Supabase when configured, with a 60-second cache. Bundled content is used when no database is configured or the database is unavailable. An empty published-project list is respected instead of restoring hidden projects.

The contact form continues to open WhatsApp and also saves an inquiry when the server is connected. It never claims an inquiry was saved after a database failure. The API validates sizes and fields, checks same-origin requests, and rejects a honeypot field. Its secret client is protected by the `server-only` module boundary.

The admin dashboard at /admin manages projects, images, publishing, and inquiry statuses. New published projects receive public detail pages, metadata, and sitemap entries automatically.

`npm run test:database` runs against embedded PostgreSQL with minimal Supabase role/storage fixtures. It verifies SQL and access rules without changing a hosted project. It does not replace the final hosted connectivity and advisor checks.

## Admin dashboard

Open /admin for the read-only portfolio preview while the database is unconfigured. No private inquiry data is loaded in preview mode.

To activate management:

1. Complete the Supabase project, migration, seed, and API environment setup above.
2. In Supabase Authentication, create a confirmed user with an email and a strong password. There is no public sign-up flow.
3. Set ADMIN_EMAILS to that email in .env.local and Vercel. Multiple approved addresses may be comma-separated.
4. Restart or redeploy, then sign in at /admin/login.

Every privileged read and server action verifies the Supabase user with getUser and checks the server-side email allowlist. Session cookies are HTTP-only and refreshed by the admin-scoped Next.js proxy. Secret keys are never sent to the browser. All admin routes are dynamic and marked noindex; the public sitemap excludes them.

Projects can be created as drafts, edited, featured, and published. Save a new draft before uploading its images. Publishing requires at least one image. Display order numbers must be unique; lower numbers appear first. New uploads accept JPG/PNG/WebP/AVIF files up to 10 MB and require alt text. Image descriptions and order can be edited. The inbox shows the latest 100 inquiries and supports new/contacted/archived statuses and email reply links.

Run npm run test:admin against a production server (default http://localhost:3210, override with TEST_BASE_URL). The test checks desktop/mobile previews, filtering, keyboard dismissal, and verifies that configured admin routes redirect anonymous visitors before loading private data. Live sign-in, uploads, and database writes still require the hosted Supabase project to be connected.
