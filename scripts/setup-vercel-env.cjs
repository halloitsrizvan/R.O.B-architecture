// Secrets travel through stdin only; CLI output and environment values are never logged.
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { parseEnv } = require('node:util');

const local = parseEnv(fs.readFileSync('.env.local', 'utf8'));
const linked = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const keys = [
  'SITE_URL',
  'ADMIN_SITE_URL',
  'DATABASE_URL',
  'NEON_AUTH_BASE_URL',
  'NEON_AUTH_COOKIE_SECRET',
  'ADMIN_EMAILS',
  'AWS_ENDPOINT_URL_S3',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'NEON_FUNCTION_HELLO_BASE_URL',
  'STUDIO_FUNCTION_SECRET',
  'INQUIRY_HASH_SECRET',
  'NEON_REALTIME_URL',
  'NEON_REALTIME_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_UPLOAD_PRESET',
];
local.SITE_URL = 'https://www.robarchstudio.com';
local.ADMIN_SITE_URL = 'https://admin.robarchstudio.com';
// Unsigned public uploads use the preset; omit the previously rejected management secret.
local.CLOUDINARY_UPLOAD_PRESET ||= local.UPLOAD_PRESET;
if (!/^prj_[A-Za-z0-9]+$/.test(linked.projectId) || !/^team_[A-Za-z0-9]+$/.test(linked.orgId))
  throw new Error('Link the intended Vercel project first.');
const missing = keys.filter((key) => !local[key]?.trim());
if (missing.length) throw new Error('Missing environment variables: ' + missing.join(', '));
if (!process.argv.includes('--apply')) {
  console.log('Production variables ready: ' + keys.join(', '));
  console.log('Run with --apply to add them to the linked Vercel project.');
  process.exit(0);
}
for (const key of keys) {
  const args = [
    '--yes vercel@latest env add',
    key,
    '--environment production --sensitive --yes',
    '--project ' + linked.projectId,
    '--scope ' + linked.orgId,
  ].join(' ');
  const result = spawnSync('cmd.exe', ['/d', '/s', '/c', 'npx.cmd ' + args], {
    input: local[key],
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120000,
  });
  if (result.status !== 0) {
    console.error(
      'Could not add ' + key + '. Inspect Vercel environment settings before retrying.',
    );
    process.exit(1);
  }
  console.log('Added production variable: ' + key);
}
