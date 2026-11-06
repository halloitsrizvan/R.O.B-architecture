import { defineConfig } from '@neon/config/v1';

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: {
      allowedOrigins: [
        'http://localhost:3000',
        'http://localhost:3240',
        'http://localhost:3241',
        'https://www.robarchstudio.com',
        'https://admin.robarchstudio.com',
      ],
    },
  },
  auth: true,
  functions: {
    hello: {
      name: 'Studio Inquiry API',
      source: './hello.ts',
      env: { STUDIO_FUNCTION_SECRET: process.env.STUDIO_FUNCTION_SECRET! },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: 'private' },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: '7d' };
    }
    // Existing branch: no changes
    return {};
  },
});
