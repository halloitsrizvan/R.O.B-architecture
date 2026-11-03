# Next.js deployment

This website uses Next.js App Router, React, and GSAP. Node.js 20.9 or newer is required.

## Commands

- npm ci: install locked dependencies.
- npm run dev: start development at http://localhost:3000.
- npm run check: validate page content, assets, and metadata.
- npm run build: create the production build and prerender all 17 pages.
- npm start: run the production server.
- npm run test:browser: test a running server on port 3000 using locally installed Chrome or Edge. Screenshots are saved in the ignored artifacts/ directory.

## Editing

- app/: routes, globals.css, sitemap, and robots metadata.
- components/pages/: React page content.
- components/: shared header, footer, inquiry, WhatsApp shortcut, and client runtime.
- lib/: animations, interactions, and metadata helpers.
- data/pages.json: page titles, descriptions, structured data, and component mapping.
- public/assets/ and public/logo.png: active public images.

The existing .html page URLs are preserved; /index.html redirects permanently to /. Standard navigation links retain full-page intro and scroll behavior. GSAP is bundled locally through npm.

## Vercel

Vercel now uses the Next.js framework preset. Remove any dashboard Output Directory override pointing to dist before deploying. Next.js manages output in .next. Repository settings are in vercel.json and next.config.mjs. Local builds do not deploy the site.

The public origin comes from site.config.json or the SITE_URL environment variable. Canonicals, social metadata, schemas, /robots.txt, and /sitemap.xml use that origin.

The original HTML and scripts are retained under legacy/ for reference and are not served or built. Root assets/ remains an original asset backup; edit public/assets/ going forward. The one-time migration script in legacy/ records the original conversion and is not a build step.

Never place credentials or environment files in public/.

Production domain: https://www.robarchstudio.com. Add this domain to the Vercel project and configure the DNS records shown by Vercel. If SITE_URL is configured in Vercel, set it to this same domain before rebuilding.
