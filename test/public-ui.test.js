import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSourceData } from '../public-sources.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
test('Public UI hides private ChatGPT provenance without changing numerical fixtures', () => {
  const original = { source: 'https://chatgpt.com/c/private', rows: [{ source: 'https://chat.openai.com/c/private', dpm: 12.5 }], forum: 'https://royals.ms/forum/threads/example' };
  const clean = publicSourceData(original);
  assert.equal(clean.source, null);
  assert.equal(clean.rows[0].source, null);
  assert.equal(clean.rows[0].dpm, 12.5);
  assert.equal(clean.forum, original.forum);
  assert.ok(original.source);
});

test('Appearance follows OS, persists explicit choices and survives blocked storage', () => {
  const code = readFileSync(new URL('../theme.js', import.meta.url), 'utf8');
  for (const blocked of [false, true]) {
    const listeners = {};
    const selector = { value: '', addEventListener: (name, callback) => { listeners.select = callback; } };
    const root = { dataset: {} };
    const media = { matches: false, addEventListener: (name, callback) => { listeners.media = callback; } };
    let stored;
    runInNewContext(code, {
      matchMedia: () => media,
      document: { documentElement: root, querySelector: () => selector, addEventListener: (name, callback) => { listeners.ready = callback; } },
      localStorage: { getItem() { if (blocked) throw Error(); return stored; }, setItem(key, value) { if (blocked) throw Error(); stored = value; } },
      window: { dispatchEvent() {} }, Event: class {}
    });
    assert.equal(root.dataset.theme, 'light');
    listeners.ready();
    media.matches = true; listeners.media();
    assert.equal(root.dataset.theme, 'dark');
    selector.value = 'light'; listeners.select(); listeners.media();
    assert.equal(root.dataset.theme, 'light');
    if (!blocked) assert.equal(stored, 'light');
    selector.value = 'system'; listeners.select();
    assert.equal(root.dataset.theme, 'dark');
  }
});
