The site is a static HTML website with a dependency-free build.

Run `npm run build` to regenerate SEO metadata and prepare `dist/`. Run
`npm run check` to validate page metadata, structured data, the sitemap,
headings, and local links.

Vercel settings are provided in `vercel.json`: no framework, build command
`npm run build`, output directory `dist`.

The production project is `rob-architects` in `clgrizvan-8911s-projects`,
published at `https://rob-architects.vercel.app`. The public homepage, contact
page, project detail page, robots.txt, sitemap, and index redirect were verified.

To deploy subsequent local changes with the authenticated Vercel CLI, run:
`npx vercel deploy --prod --yes --scope clgrizvan-8911s-projects`.

If Vercel assigns a different domain, update `url` in `site.config.json` before
deploying. Alternatively, set the Vercel production environment variable
`SITE_URL` to the assigned HTTPS origin. All canonical URLs, social URLs,
structured data, robots.txt, and the sitemap regenerate from this setting.

After deployment, add the final site to Google Search Console and submit
`https://rob-architects.vercel.app/sitemap.xml`. Search Console verification needs
the site owner's Google account. Demo testimonials are not included in review
or rating structured data.

Only generated `dist/` contents are published. Local configuration, Git data,
and build scripts are excluded from the served website.
