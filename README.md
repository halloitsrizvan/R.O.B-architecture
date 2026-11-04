# R.O.B Architectural Studio

Architecture portfolio built with Next.js App Router, strict TypeScript, React, and GSAP. Preserves the existing design, .html URLs, metadata, hero slideshow, animations, filters, inquiry form, and WhatsApp greeting.

## Development

Run npm ci, then npm run dev.

- npm run check: type checking, linting, formatting, and content validation.
- npm run format: format active source with Prettier.
- npm run build: create the production build.
- npm start: serve the production build.
- npm run test:browser: test a running production server with Chrome or Edge.

Shared project layouts live in components/ProjectDetails.tsx, with editable content in data/projects.json. All active React components are formatted .tsx files. See [DEPLOYMENT.md](DEPLOYMENT.md) for editing locations, browser checks, and deployment settings.
