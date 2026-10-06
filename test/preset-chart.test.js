import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../ui-app.js', import.meta.url), 'utf8');
// Exercise the actual browser chart helpers without introducing a DOM or Plotly
// dependency into the numerical tests. Top-level declarations end at column 0.
function helper(name) {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`, 'm'));
  assert.ok(match, `Missing chart helper ${name}`);
  return match[0];
}
function chartState(overrides = {}) {
  return {
    page: 'progression', wdef: 0, targetCount: 1, potionId: 'apple',
    combat: { mwLevel: 20, se: true, echo: true, rage: true },
    visibleClasses: new Set(['hero']), referenceVisibility: {},
    yZeroAxis: true, presetRevision: 1, progressionViewport: null,
    presetResults: [{ valid: true, mw20Range: { max: 20000 }, dpm: 200 }, null, null],
    ...overrides
  };
}
function evaluate(state, expression, extra = {}) {
  return runInNewContext([
    ...['personalPoint', 'personalPoints', 'buildAutoRanges', 'resolveProgressionRanges', 'progressionViewKey'].map(helper),
    expression
  ].join('\n'), { state, finiteDpm: value => Number.isFinite(value) && value >= 0, ...extra });
}

test('Personal point participates in Auto Fit, including when every class curve is hidden', () => {
  const state = chartState({ visibleClasses: new Set() });
  const range = evaluate(state, 'resolveProgressionRanges([], [], true, "new")');
  assert.ok(range.xRange[0] < 20000 && range.xRange[1] > 20000);
  assert.ok(range.yRange[1] > 200);
  const combined = evaluate(state, 'resolveProgressionRanges(series, [], true, "new")', {
    series: [{ points: [{ cleanRange: { max: 5000 }, dpm: 20 }] }]
  });
  assert.ok(combined.xRange[0] < 5000 && combined.xRange[1] > 20000);
});

test('Invalid, unsupported or cleared presets cannot retain a plotted point', () => {
  for (const result of [null, { valid: false, mw20Range: { max: 20000 }, dpm: 200 },
    { valid: true, mw20Range: { max: 20000 }, dpm: null },
    { valid: true, mw20Range: { max: NaN }, dpm: 200 }]) {
    assert.equal(evaluate(chartState({ presetResults: [result, null, null] }), 'personalPoint()'), null);
  }
});

test('All three submitted presets are independently plotted and included in Auto Fit', () => {
  const state = chartState({ visibleClasses: new Set(), presetResults: [
    { valid: true, mw20Range: { max: 10000 }, dpm: 100 },
    { valid: true, mw20Range: { max: 20000 }, dpm: 200 },
    { valid: true, mw20Range: { max: 30000 }, dpm: 300 }
  ] });
  assert.equal(evaluate(state, 'personalPoints().length'), 3);
  const range = evaluate(state, 'resolveProgressionRanges([], [], true, "three")');
  assert.ok(range.xRange[0] < 10000 && range.xRange[1] > 30000);
  assert.ok(range.yRange[1] > 300);
});

test('Preset revisions and shared settings invalidate chart render keys', () => {
  const state = chartState();
  const original = evaluate(state, 'progressionViewKey()');
  state.presetRevision += 1;
  assert.notEqual(evaluate(state, 'progressionViewKey()'), original);
  state.presetRevision -= 1;
  state.combat.mwLevel = 0;
  assert.notEqual(evaluate(state, 'progressionViewKey()'), original);
});
