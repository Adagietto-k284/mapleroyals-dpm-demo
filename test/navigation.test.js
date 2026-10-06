import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../ui-app.js', import.meta.url), 'utf8');
test('Navigation exposes Progression, working User Preset and Library, without snapshots', () => {
  const nav = html.match(/<nav class="page-nav"[\s\S]*?<\/nav>/)[0];
  assert.deepEqual([...nav.matchAll(/href="#\/([^"]+)"/g)].map(m => m[1]), ['progression','user-preset','library']);
  assert.ok(!html.includes('施工中 · Under construction'));
  assert.match(html, /id="preset-editor"/);
  assert.match(app, /mountPreset/);
  for (const id of ['ranking-chart', 'stage-select', 'detail-body', 'summary-leader']) {
    assert.ok(!html.includes(`id="${id}"`));
  }
  assert.ok(!app.includes('renderRankingChart'));
  assert.match(app, /\["progression", "user-preset", "library"\].* : "progression"/);
  assert.match(app, /if \(state.page === "user-preset"\) \{/);
});
test('Range-only evidence defaults closed and plots only on demand', () => {
  const tag = html.match(/<details id="range-reference-section"[^>]*>/)[0];
  assert.ok(!/\bopen\b/.test(tag));
  assert.match(html, /<summary id="range-reference-heading">Range-only evidence/);
  assert.match(app, /!elements.rangeReferenceSection.open/);
  assert.match(app, /rangeReferenceSection.addEventListener\("toggle"/);
  assert.match(html, /<details id="range-reference-section"[\s\S]*?id="reference-list"[\s\S]*?<\/details>/);
});

test('Changelog sits in the header, defaults closed, and covers each development phase', () => {
  const header = html.match(/<header class="site-header">[\s\S]*?<\/header>/)[0];
  const tag = header.match(/<details class="site-changelog"[^>]*>/)[0];
  assert.ok(!/\bopen\b/.test(tag));
  assert.ok(header.indexOf('class="site-changelog"') < header.indexOf('class="header-copy"'));
  for (const phase of ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5']) {
    assert.ok(header.includes(phase));
  }
});

test('Library removes redundant evidence sections and collapses advanced content', () => {
  const library = readFileSync(new URL('../ui-library.js', import.meta.url), 'utf8');
  assert.ok(!library.includes('appendSection(container, "Evidence status"'));
  assert.ok(!library.includes('appendSection(container, "Authoritative source index"'));
  assert.match(library, /el\(expanded \? "section" : "details"\)/);
});
