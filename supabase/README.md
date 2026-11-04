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

The current page routes still come from the existing 12-project route registry. Adding a completely new project also requires adding its page/metadata entry; a full admin CMS and authentication are not part of this setup.

`npm run test:database` runs against embedded PostgreSQL with minimal Supabase role/storage fixtures. It verifies SQL and access rules without changing a hosted project. It does not replace the final hosted connectivity and advisor checks.
