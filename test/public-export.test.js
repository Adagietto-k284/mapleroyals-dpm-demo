import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CLASS_ENGINES } from '../engine/index.js';
const root = fileURLToPath(new URL('../', import.meta.url));
async function walk(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) files.push(...await walk(target));
    else files.push(target);
  }
  return files;
}
test('Public data and evidence contain no private conversation identifiers', async () => {
  for (const directory of ['data','reference','docs']) for (const file of await walk(path.join(root,directory))) {
    if (!/\.(json|md|csv)$/.test(file)) continue;
    const content = await readFile(file,'utf8');
    assert.doesNotMatch(content,/https?:\/\/(?:chatgpt\.com|chat\.openai\.com)\/c\//i,file);
    assert.doesNotMatch(content,/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,file);
    if (file.endsWith('.json')) assert.doesNotMatch(content,/"[^"\n]*message[^"\n]*id"\s*:/i,file);
  }
});
test('Public snapshot reproduces the live rounded Night Lord example', async () => {
  const gear = JSON.parse(await readFile(path.join(root,'data/gear.json'),'utf8'));
  const skills = JSON.parse(await readFile(path.join(root,'data/skills.json'),'utf8'));
  for (const [stage,wa,expected] of [['Entry',140,16.253],['Advanced',156,17.530],['Late-game',173,18.902],['End-game',188,20.541]]) {
    const input = gear.classes['night-lord'].stages[stage];
    assert.equal(input.cleanWa,wa);
    const result = CLASS_ENGINES['night-lord'].evaluate({gear:input,skillData:skills.classes['night-lord'],potionWa:100,targetCount:1});
    assert.equal(Number(result.dpm.toFixed(3)),expected,stage);
  }
});
