import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, cp, writeFile, readFile, access, symlink, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const dir = await realpath(await mkdtemp(path.join(tmpdir(), 'mr-build-test-')));
  t.after(async () => {
    // Only remove the exact temporary directory allocated by this test.
    assert.equal(path.dirname(dir), await realpath(tmpdir()));
    assert.ok(path.basename(dir).startsWith('mr-build-test-'));
    await rm(dir, { recursive: true, force: true });
  });
  for (const name of ['scripts', 'engine', 'data', 'index.html', 'ui-styles.css', 'ui-app.js', 'ui-i18n.js', 'ui-model.js', 'ui-library.js', 'ui-references.js', 'ui-preset.js', 'library-data.js', 'theme.js', 'public-sources.js', 'netlify.toml']) {
    await cp(path.join(repo, name), path.join(dir, name), { recursive: true });
  }
  const archive = 'reference/archive/mapleroyals_gear_model_archive_v9_4_2.md';
  await mkdir(path.dirname(path.join(dir, archive)), { recursive: true });
  await cp(path.join(repo, archive), path.join(dir, archive));
  return dir;
}
const build = dir => spawnSync(process.execPath, [path.join(dir, 'scripts/build.mjs')], { cwd: dir, encoding: 'utf8' });

test('Build replaces stale Netlify output, preserves sources and is repeatable', async t => {
  const dir = await fixture(t);
  await mkdir(path.join(dir, 'dist/old'), { recursive: true });
  await writeFile(path.join(dir, 'dist/netlify.toml'), 'stale platform config');
  await writeFile(path.join(dir, 'dist/old/private.txt'), 'must not publish');
  const config = await readFile(path.join(dir, 'netlify.toml'), 'utf8');
  for (let i = 0; i < 2; i++) {
    const result = build(dir);
    assert.equal(result.status, 0, result.stderr);
    await access(path.join(dir, 'dist/index.html'));
    await access(path.join(dir, 'dist/theme.js'));
    await access(path.join(dir, 'dist/ui-preset.js'));
    await access(path.join(dir, 'dist/ui-i18n.js'));
    await access(path.join(dir, 'dist/engine/user-preset.js'));
    await assert.rejects(access(path.join(dir, 'dist/netlify.toml')));
    await assert.rejects(access(path.join(dir, 'dist/old/private.txt')));
    await assert.rejects(access(path.join(dir, 'dist/scripts')));
    assert.equal(await readFile(path.join(dir, 'netlify.toml'), 'utf8'), config);
  }
});

for (const nested of [false, true]) test(`Build refuses ${nested ? 'nested' : 'root'} dist links without deleting target`, async t => {
  const dir = await fixture(t);
  const target = path.join(dir, 'protected');
  await mkdir(target);
  await writeFile(path.join(target, 'keep.txt'), 'preserve');
  if (nested) await mkdir(path.join(dir, 'dist'));
  try {
    await symlink(target, path.join(dir, nested ? 'dist/link' : 'dist'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error.code === 'EPERM') { t.skip('Symlink creation unavailable'); return; }
    throw error;
  }
  const result = build(dir);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /symlink/i);
  assert.equal(await readFile(path.join(target, 'keep.txt'), 'utf8'), 'preserve');
});
