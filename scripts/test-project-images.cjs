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
  let failImageUpdate = false;
  let failCleanup = false;
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
    removeProjectImage: async (key) => {
      if (failCleanup) throw new Error('Simulated cleanup failure');
      return assets.delete(key);
    },
    readProjectImage: async (key) => {
      if (!assets.has(key)) throw new Error('Not found');
      return { bytes: Buffer.from('image'), contentType: 'image/png' };
    },
  };
  const client = {
    query: async (sql, parameters = []) => {
      if (failImageInsert && sql.includes('insert into public.project_images'))
        throw new Error('Simulated database failure');
      if (failImageUpdate && sql.includes('set src=$1,storage_key=$2'))
        throw new Error('Simulated image update failure');
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
    const edit = new FormData();
    // Imported photos can have old responsive candidates that override img.src.
    await db.query('update project_images set src_set=$1,sizes=$2 where id=$3', [
      'https://example.com/old-photo.jpg 1600w',
      '100vw',
      images[0].id,
    ]);
    edit.set('id', images[0].id);
    edit.set('alt', 'Updated cover description');
    assert.equal((await actions.updateImage(edit)).ok, true);
    assert.equal(
      (await db.query('select alt from project_images where id=$1', [images[0].id])).rows[0].alt,
      'Updated cover description',
    );
    edit.set('image', new File(['replacement'], 'replacement.png', { type: 'image/png' }));
    assert.equal((await actions.updateImage(edit)).ok, true);
    let replaced = (await db.query('select * from project_images where id=$1', [images[0].id]))
      .rows[0];
    assert.equal(replaced.sort_order, 0);
    assert.equal(replaced.src_set, null);
    assert.equal(replaced.sizes, null);
    assert.notEqual(replaced.src, images[0].src);
    assert.equal(assets.has(images[0].storage_key), false);
    assert.equal(assets.has(replaced.storage_key), true);
    assert.equal((await getImage()).status, 404);
    console.log(
      'PASS Image replacement preserves identity and cover position, updates descriptions and retires the old media URL.',
    );

    const previous = replaced;
    failImageUpdate = true;
    assert.equal((await actions.updateImage(edit)).ok, false);
    failImageUpdate = false;
    replaced = (await db.query('select * from project_images where id=$1', [images[0].id])).rows[0];
    assert.equal(replaced.src, previous.src);
    assert.equal(assets.size, 3);
    edit.set('image', new File(['bad'], 'bad.txt', { type: 'text/plain' }));
    assert.equal((await actions.updateImage(edit)).ok, false);
    edit.set('image', new File(['replacement'], 'replacement.png', { type: 'image/png' }));
    configured = false;
    assert.equal((await actions.updateImage(edit)).ok, false);
    configured = true;
    authorized = false;
    await assert.rejects(actions.updateImage(edit), /Unauthorized/);
    authorized = true;
    failCleanup = true;
    const cleanupWarning = await actions.updateImage(edit);
    failCleanup = false;
    assert.equal(cleanupWarning.ok, true);
    assert.match(cleanupWarning.message, /cleanup/);
    // The deliberately orphaned mock asset is removed without touching a real provider.
    assets.delete(previous.storage_key);
    edit.set('id', '00000000-0000-0000-0000-000000000000');
    const uploadsBefore = uploadCount;
    assert.equal((await actions.updateImage(edit)).ok, false);
    assert.equal(uploadCount, uploadsBefore);
    console.log(
      'PASS Replacement rollback, validation, authorization, stale image handling and cleanup warnings.',
    );
    const assetsBeforeBatch = assets.size;
    assert.equal(
      (await actions.saveProject(project('project-batch-upload', ['cover.png']))).ok,
      true,
    );
    const batch = new FormData();
    batch.set('slug', 'project-batch-upload');
    batch.append('images', new File(['one'], 'one.png', { type: 'image/png' }));
    batch.append('images', new File(['two'], 'two.png', { type: 'image/png' }));
    const batchResult = await actions.uploadImage(batch);
    assert.equal(batchResult.ok, true);
    assert.match(batchResult.message, /2 images/);
    assert.deepEqual(
      (
        await db.query(
          'select sort_order from project_images where project_slug=$1 order by sort_order',
          ['project-batch-upload'],
        )
      ).rows.map((row) => row.sort_order),
      [0, 1, 2],
    );
    assert.equal(assets.size, assetsBeforeBatch + 3);
    const badBatch = new FormData();
    badBatch.set('slug', 'project-batch-upload');
    badBatch.append('images', new File(['one'], 'one.png', { type: 'image/png' }));
    badBatch.append('images', new File(['bad'], 'failure.png', { type: 'image/png' }));
    assert.equal((await actions.uploadImage(badBatch)).ok, false);
    assert.equal(assets.size, assetsBeforeBatch + 3);
    failImageInsert = true;
    assert.equal((await actions.uploadImage(batch)).ok, false);
    failImageInsert = false;
    assert.equal(assets.size, assetsBeforeBatch + 3);
    assert.equal(
      (
        await db.query('select count(*)::int as n from project_images where project_slug=$1', [
          'project-batch-upload',
        ])
      ).rows[0].n,
      3,
    );
    const oversizedBatch = new FormData();
    oversizedBatch.set('slug', 'project-batch-upload');
    oversizedBatch.append(
      'images',
      new File([Buffer.alloc(4 * 1024 * 1024)], 'one.png', { type: 'image/png' }),
    );
    oversizedBatch.append('images', new File(['two'], 'two.png', { type: 'image/png' }));
    assert.equal((await actions.uploadImage(oversizedBatch)).ok, false);
    const emptyBatch = new FormData();
    emptyBatch.set('slug', 'project-batch-upload');
    assert.equal((await actions.uploadImage(emptyBatch)).ok, false);
    assert.equal((await actions.removeProject('project-batch-upload')).ok, true);
    assert.equal(assets.size, assetsBeforeBatch);
    console.log(
      'PASS Existing projects accept multiple photos, preserve image positions, validate total size and roll back incomplete batches.',
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
