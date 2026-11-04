import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ['scripts/**/*.cjs'],
    rules: {
      // Node verification scripts intentionally use CommonJS.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['app/**/*.{ts,tsx}', 'components/**/*.tsx'],
    rules: {
      // Natural-size portfolio images and full-page navigation preserve the existing design.
      '@next/next/no-img-element': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      // The existing font stylesheet avoids build-time font downloads.
      '@next/next/no-page-custom-font': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'dist/**',
    'out/**',
    'legacy/**',
    'assets/**',
    'public/**',
    'artifacts/**',
  ]),
]);
