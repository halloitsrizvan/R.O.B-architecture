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
