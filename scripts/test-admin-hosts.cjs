const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { NextRequest, NextResponse } = require('next/server');

let protectedRequests = 0;
let authenticated = false;
const sandboxModule = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync('proxy.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  {
    module: sandboxModule,
    exports: sandboxModule.exports,
    process: { env: {} },
    URL,
    require: (name) => {
      if (name === 'next/server') return { NextResponse };
      assert.equal(name, './lib/neon/auth');
      return {
        auth: {
          middleware: (config) => async (request) => {
            protectedRequests++;
            if (!authenticated && !config.publicRoutes.includes(request.nextUrl.pathname))
              return NextResponse.redirect(new URL(config.loginUrl, request.url));
            const response = NextResponse.next({
              request: { headers: new Headers({ 'x-session-check': 'verified' }) },
            });
            response.cookies.set('test-session', 'refreshed');
            return response;
          },
        },
      };
    },
  },
);
const route = sandboxModule.exports.default;
const request = (host, path = '/') => new NextRequest('https://' + host + path);

(async () => {
  let response = await route(request('www.robarchstudio.com', '/admin/projects?view=all'));
  assert.equal(
    response.headers.get('location'),
    'https://admin.robarchstudio.com/admin/projects?view=all',
  );
  response = await route(request('admin.robarchstudio.com'));
  assert.equal(response.headers.get('location'), 'https://admin.robarchstudio.com/admin/login');
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
  authenticated = true;
  response = await route(request('admin.robarchstudio.com'));
  assert.equal(
    response.headers.get('x-middleware-rewrite'),
    'https://admin.robarchstudio.com/admin',
  );
  assert.equal(response.headers.get('x-middleware-next'), null);
  assert.equal(response.headers.get('x-middleware-request-x-session-check'), 'verified');
  assert.equal(response.cookies.get('test-session').value, 'refreshed');
  for (const path of ['/admin', '/admin/projects', '/admin/inquiries', '/admin/settings']) {
    const before = protectedRequests;
    response = await route(request('admin.robarchstudio.com', path));
    assert.equal(protectedRequests, before + 1);
    assert.equal(response.headers.get('x-middleware-next'), '1');
  }
  response = await route(request('admin.robarchstudio.com', '/robots.txt'));
  assert.equal(await response.text(), 'User-agent: *\nDisallow: /\n');
  response = await route(request('admin.robarchstudio.com', '/about'));
  assert.equal(response.headers.get('location'), 'https://www.robarchstudio.com/about');
  response = await route(request('admin.robarchstudio.com', '/api/admin/live'));
  assert.equal(response.headers.get('x-middleware-next'), '1');
  const before = protectedRequests;
  await route(request('www.robarchstudio.com', '/projects'));
  assert.equal(protectedRequests, before);
  authenticated = false;
  for (const host of ['localhost:3000', 'rob-preview.vercel.app']) {
    response = await route(request(host, '/admin/projects'));
    assert.equal(response.headers.get('location'), 'https://' + host + '/admin/login');
  }
  console.log(
    'PASS: admin host routing, authentication, session forwarding, indexing and local/preview isolation.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
