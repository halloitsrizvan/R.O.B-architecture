# Studio database on Neon

Migrations run through npm run db:migrate using DATABASE_URL_UNPOOLED. Each migration is recorded with a SHA-256 checksum in studio_migrations, and execution is serialized with a PostgreSQL advisory lock. Rerunning the migration/seed is safe; editing an already applied migration is rejected.

Tables: projects, project_images, contact_inquiries, and studio_admins. Anonymous SQL roles receive no table privileges or inquiry-function execution. Queries run only in trusted Next.js/Neon Function code. The public website explicitly selects published projects and their images. Admin reads/writes verify Neon Auth, ADMIN_EMAILS, and studio_admins before using the database.

The first migration imports the portfolio schema without Supabase-specific roles, APIs, or storage tables. Auth is owned by Neon's managed neon_auth schema and is never manually migrated or patched. New admin identities are created through Neon Auth, then explicitly bound to studio_admins.

The private assets bucket stores new uploads. project_images.storage_key records the immutable object key and src records its same-origin /api/media/ URL. Image bytes are not stored in PostgreSQL. Original bundled/remote image references remain valid.

The submit_contact_inquiry function allows at most five submissions per hashed source in 15 minutes. It takes an advisory transaction lock before counting/inserting, which makes the limit work across app/function instances. Raw IP addresses are never stored.

Run npm run test:database for isolated PostgreSQL tests, and npm run test:neon against the connected application for actual service integration tests.
