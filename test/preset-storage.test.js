import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { WEAPONS, SLOTS, relevantStats, defaultPreset } from '../engine/user-preset.js';

const code = readFileSync(new URL('../ui-preset.js', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from "\.\/engine\/user-preset\.js";/, '')
  .replace(/^export /gm, '');
function run(expression, storage) {
  return runInNewContext(`${code}\n${expression}`, {
    WEAPONS, SLOTS, relevantStats, defaultPreset, structuredClone,
    window: { localStorage: storage },
    setTimeout, clearTimeout
  });
}

test('Saved input restores as a draft, not a computed result', () => {
  const draft = run('createBlankDraft("hero")');
  draft.quick = { str: 999, dex: 23, luk: null, wa: 150, max: 6927 };
  const restored = run('restoreDraft()', { getItem: () => JSON.stringify(draft) });
  assert.equal(restored.input.classId, 'hero');
  assert.equal(restored.input.quick.str, 999);
  assert.equal(restored.input.quick.waMode, 'total');
  assert.ok(restored.warning.includes('計算'));
  assert.ok(!('dpm' in restored.input));
  assert.ok(!('result' in restored.input));
});

test('Unavailable storage and malformed or incompatible saved data fall back safely', () => {
  for (const raw of ['{', 'null', '{}', '{"schemaVersion":99}', '{"schemaVersion":1,"classId":"mage"}']) {
    const restored = run('restoreDraft()', { getItem: () => raw });
    assert.equal(restored.input, null);
    assert.ok(restored.warning.length > 0);
  }
  const denied = run('restoreDraft()', { getItem() { throw new Error('denied'); } });
  assert.equal(denied.input, null);
  assert.ok(denied.warning);
});

test('AP input never silently truncates decimal values', () => {
  const value = run('parseFieldValue("4.9", {blankAsZero:false, integer:true})');
  assert.ok(value === 4.9 || value === null, 'Invalid integer must be rejected or retained for validation, never rounded');
});

test('Unknown restored weapon cannot be silently evaluated as a supported weapon', () => {
  const draft = run('createBlankDraft("hero")');
  draft.weaponId = 'axe-not-supported';
  const restored = run('restoreDraft()', { getItem: () => JSON.stringify(draft) });
  assert.ok(!restored.input || restored.input.weaponId === '');
});
