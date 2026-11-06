const { PGlite } = require('@electric-sql/pglite');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');

function loadModule(file, dependencies) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const sandboxModule = { exports: {} };
  vm.runInNewContext(
    source,
    {
      module: sandboxModule,
      exports: sandboxModule.exports,
      File,
      Buffer,
      console,
      AbortSignal,
      require: (name) => {
        if (!(name in dependencies)) throw new Error('Unexpected test dependency: ' + name);
        return dependencies[name];
      },
    },
    { filename: file },
  );
  return sandboxModule.exports;
}

(async () => {
  const db = new PGlite();
  const assets = new Map();
  let configured = true;
  let authorized = true;
  let failImageInsert = false;
  let uploadCount = 0;
  const policy = loadModule('lib/project-image-policy.ts', {});
  const imageStore = {
    uploadProjectImage: async (slug, file) => {
      uploadCount++;
      if (file.name === 'failure.png') throw new Error('Simulated provider outage');
      const key = `${slug}/${randomUUID()}.png`;
      const image = { storageKey: 'cloudinary:' + key, src: '/api/media/cloudinary/' + key };
      assets.set(image.storageKey, image);
      return image;
    },
    cleanupProjectImages: async (images) =>
      images.forEach((image) => assets.delete(image.storageKey)),
    removeProjectImage: async (key) => assets.delete(key),
    readProjectImage: async (key) => {
      if (!assets.has(key)) throw new Error('Not found');
      return { bytes: Buffer.from('image'), contentType: 'image/png' };
    },
  };
  const client = {
    query: async (sql, parameters = []) => {
      if (failImageInsert && sql.includes('insert into public.project_images'))
        throw new Error('Simulated database failure');
      const result = await db.query(sql, parameters);
      return { rows: result.rows, rowCount: result.rows.length };
    },
    release: () => {},
  };
  const database = {
    getDatabase: () => ({ connect: async () => client }),
    query: async (...args) => (await client.query(...args)).rows,
  };
  const actions = loadModule('app/admin/actions.ts', {
    'next/cache': { revalidatePath: () => {} },
    'next/navigation': {
      redirect: () => {
        throw new Error('Unauthorized');
      },
    },
    '../../lib/admin/auth': {
      requireAdmin: async () => {
        if (!authorized) throw new Error('Unauthorized');
      },
    },
    '../../lib/neon/auth': { auth: {} },
    '../../lib/db': database,
    '../../lib/cloudinary': { isCloudinaryConfigured: () => configured },
    '../../lib/project-images': imageStore,
    '../../lib/project-image-policy': policy,
  });
  function project(slug, names = [], published = false, intent = 'create') {
    const form = new FormData();
    for (const [name, value] of Object.entries({
      slug,
      intent,
      title: 'Image test project',
      description: '',
      categories: 'architecture',
    }))
      form.set(name, value);
    if (published) form.set('published', 'on');
    for (const name of names)
      form.append('images', new File(['image'], name, { type: 'image/png' }));
    return form;
  }
  try {
    for (const file of fs
      .readdirSync('database/migrations')
      .filter((name) => name.endsWith('.sql'))
      .sort())
      await db.exec(fs.readFileSync('database/migrations/' + file, 'utf8'));
    const saved = await actions.saveProject(
      project('project-create-with-images', ['cover.png', 'detail.png'], true),
    );
    assert.equal(saved.ok, true);
    const images = (await db.query('select * from project_images order by sort_order')).rows;
    assert.equal(images.length, 2);
    assert.deepEqual(
      images.map((image) => image.sort_order),
      [0, 1],
    );
    assert(images.every((image) => image.storage_key.startsWith('cloudinary:')));
    assert.equal((await db.query('select published from projects')).rows[0].published, true);
    console.log(
      'PASS Creating and publishing a project attaches multiple images in selection order.',
    );

    const media = loadModule('app/api/media/[...key]/route.ts', {
      'next/server': { NextResponse: Response },
      '../../../../lib/db': database,
      '../../../../lib/admin/auth': {
        getAdminIdentity: async () => (authorized ? { id: 'test-admin' } : null),
      },
      '../../../../lib/project-images': imageStore,
    });
    const path = images[0].src.replace('/api/media/', '').split('/');
    const getImage = () => media.GET(null, { params: Promise.resolve({ key: path }) });
    authorized = false;
    assert.equal((await getImage()).status, 200);
    await db.query('update projects set published=false');
    assert.equal((await getImage()).status, 404);
    authorized = true;
    const privateImage = await getImage();
    assert.equal(privateImage.status, 200);
    assert.equal(privateImage.headers.get('cache-control'), 'private, no-store');
    console.log('PASS Media access permits published images and protects drafts.');

    let result = await actions.saveProject(
      project('project-failed-upload', ['cover.png', 'failure.png']),
    );
    assert.equal(result.ok, false);
    assert.equal(assets.size, 2);
    assert.equal(
      (await db.query("select count(*)::int as n from projects where slug='project-failed-upload'"))
        .rows[0].n,
      0,
    );
    failImageInsert = true;
    result = await actions.saveProject(project('project-failed-insert', ['cover.png']));
    failImageInsert = false;
    assert.equal(result.ok, false);
    assert.equal(assets.size, 2);
    assert.equal(
      (await db.query("select count(*)::int as n from projects where slug='project-failed-insert'"))
        .rows[0].n,
      0,
    );
    console.log(
      'PASS Provider or database failures leave no partial project and clean up completed uploads.',
    );

    result = await actions.saveProject(project('project-create-with-images', ['duplicate.png']));
    assert.equal(result.ok, false);
    assert.equal(assets.size, 2);
    configured = false;
    const before = uploadCount;
    result = await actions.saveProject(project('project-no-config', ['cover.png']));
    assert.equal(result.ok, false);
    assert.equal(uploadCount, before);
    configured = true;
    const invalid = project('project-invalid-image');
    invalid.append('images', new File(['not an image'], 'file.txt', { type: 'text/plain' }));
    assert.equal((await actions.saveProject(invalid)).ok, false);
    assert.equal(uploadCount, before);
    authorized = false;
    await assert.rejects(
      actions.saveProject(project('project-unauthorized', ['cover.png'])),
      /Unauthorized/,
    );
    assert.equal(uploadCount, before);
    authorized = true;
    console.log(
      'PASS Duplicate URLs, missing credentials, invalid files, and unauthorized requests are handled safely.',
    );

    const upload = new FormData();
    upload.set('slug', 'project-create-with-images');
    upload.set('alt', 'Another view');
    upload.set('image', new File(['image'], 'extra.png', { type: 'image/png' }));
    assert.equal((await actions.uploadImage(upload)).ok, true);
    assert.deepEqual(
      (await db.query('select sort_order from project_images order by sort_order')).rows.map(
        (image) => image.sort_order,
      ),
      [0, 1, 2],
    );
    assert.equal((await actions.removeProject('project-create-with-images')).ok, true);
    assert.equal(assets.size, 0);
    assert.equal((await db.query('select count(*)::int as n from project_images')).rows[0].n, 0);
    assert.equal((await getImage()).status, 404);
    console.log(
      'PASS Later uploads append correctly and project removal cleans image records and assets.',
    );
    console.log(
      'PASS Project image integration tests (isolated PostgreSQL; mocked external image provider).',
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
