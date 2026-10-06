import { copyFile, mkdir, readdir, lstat, readFile, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const output = path.join(root, 'dist');
const files = [
  'index.html', 'ui-styles.css', 'ui-app.js', 'ui-model.js', 'theme.js', 'public-sources.js',
  'ui-references.js', 'ui-library.js', 'library-data.js', 'ui-preset.js', 'ui-i18n.js',
  ...['gear', 'skills', 'potions', 'versions', 'buffs', 'model-sync-v9.5.0', 'chart-references'].map(name => `data/${name}.json`),
  'reference/archive/mapleroyals_gear_model_archive_v9_4_2.md'
];

async function walk(directory, relative = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink not allowed: ${directory}/${entry.name}`);
    if (entry.isDirectory()) result.push(...await walk(path.join(directory, entry.name), name));
    else result.push(name);
  }
  return result;
}
files.push(...(await walk(path.join(root, 'engine'))).filter(name => name.endsWith('.js')).map(name => `engine/${name}`));
const allowed = new Set(files);
// dist is disposable build output, never a source directory. Resolve its exact
// target and reject links (including Windows junctions) before recursive removal.
// Stale platform/cache files such as dist/netlify.toml must not block a rebuild.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') {
  throw new Error('Refusing to clean a directory other than this project\'s dist');
}
try {
  const info = await lstat(output);
  if (info.isSymbolicLink() || !info.isDirectory()) {
    throw new Error('dist must be a real directory, not a file or symlink');
  }
  if (await realpath(output) !== output) throw new Error('dist resolves outside its expected path');
  await walk(output); // Reject nested symlinks before touching any output.
  await rm(output, { recursive: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const name of files) {
  const source = path.join(root, name);
  if (!(await lstat(source)).isFile()) throw new Error(`Expected regular source file: ${name}`);
  await mkdir(path.dirname(path.join(output, name)), { recursive: true });
  await copyFile(source, path.join(output, name));
}
// Check relative ES imports, static HTML assets and explicit runtime data fetches.
for (const name of files.filter(name => /\.(js|html)$/.test(name))) {
  const content = await readFile(path.join(output, name), 'utf8');
  const patterns = [/(?:from\s*|import\s*)["'](\.[^"']+)["']/g, /(?:src|href)=["'](\.\/[^"']+)["']/g, /(?:loadJson|fetch)\(["'](\.[^"']+)["']/g];
  for (const pattern of patterns) for (const match of content.matchAll(pattern)) {
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
    if (!allowed.has(target)) throw new Error(`Unpackaged dependency: ${name} -> ${target}`);
  }
}
console.log(`Built and checked ${files.length} public files in dist. No server, credentials, tests or bulk research archives included.`);
