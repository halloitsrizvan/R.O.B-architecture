# Studio database on Neon

Migrations run through npm run db:migrate using DATABASE_URL_UNPOOLED. Each migration is recorded with a SHA-256 checksum in studio_migrations, and execution is serialized with a PostgreSQL advisory lock. Rerunning the migration/seed is safe; editing an already applied migration is rejected.

Tables: projects, project_images, contact_inquiries, and studio_admins. Anonymous SQL roles receive no table privileges or inquiry-function execution. Queries run only in trusted Next.js/Neon Function code. The public website explicitly selects published projects and their images. Admin reads/writes verify Neon Auth, ADMIN_EMAILS, and studio_admins before using the database.

The first migration imports the portfolio schema without Supabase-specific roles, APIs, or storage tables. Auth is owned by Neon's managed neon_auth schema and is never manually migrated or patched. New admin identities are created through Neon Auth, then explicitly bound to studio_admins.

New uploads use Cloudinary. project_images.storage_key stores a cloudinary-public: reference for unsigned preset uploads, or cloudinary: for authenticated assets. src stores a same-origin /api/media/cloudinary/ URL. The media handler checks the project publication state before fetching the image. Public preset assets remain publicly accessible through Cloudinary itself; authenticated assets use short-lived signed downloads. Image bytes are not stored in PostgreSQL.

Existing Neon uploads remain readable and removable using their original storage keys. Keep the AWS variables until those assets have been migrated separately. Original bundled/remote image references also remain valid. No image-reference schema migration is required for the Cloudinary switch.

The submit_contact_inquiry function allows at most five submissions per hashed source in 15 minutes. It takes an advisory transaction lock before counting/inserting, which makes the limit work across app/function instances. Raw IP addresses are never stored.

Run npm run test:database for isolated PostgreSQL tests, and npm run test:neon against the connected application for actual service integration tests.
