import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildProgressionSeries } from '../ui-model.js';
import { buildLibraryModel } from '../library-data.js';
import { selectReferences } from '../ui-references.js';
const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const data = { gearData: read('gear'), skillsData: read('skills'), potionsData: read('potions') };

test('WDEF presets preserve clean X and Library target matrix uses the same defense', () => {
  for (const targetCount of [1, 2, 3, 4, 6]) {
    const baseline = buildProgressionSeries({ ...data, targetCount });
    for (const wdef of [0, 1000, 2000, 3200, 4000]) {
      const series = buildProgressionSeries({ ...data, targetCount, wdef });
      for (const [i, item] of series.entries()) {
        item.points.forEach((point, j) => {
          assert.deepEqual(point.cleanRange, baseline[i].points[j].cleanRange);
          assert.ok(point.dpm <= baseline[i].points[j].dpm + 1e-9);
        });
        const model = buildLibraryModel({ data, series, classId: item.classId, targetCount, wdef });
        assert.equal(model.calculation.find(row => row.label === 'DPM').value, `${item.points[3].dpm.toFixed(3)}m`);
        assert.match(model.calculation.find(row => row.label === 'Post-defense base range').source, new RegExp(`WDEF ${wdef}$`));
      }
    }
  }
});

test('Archived reference DPM stays hidden at nonzero WDEF but clean coordinates survive', () => {
  const source = read('chart-references');
  const options = { targetCount: 6, potionId: 'apple', visibleClasses: new Set(Object.keys(data.gearData.classes)) };
  const zero = selectReferences(source, options);
  const defended = selectReferences(source, { ...options, wdef: 1000 });
  assert.ok(zero.some(row => row.plottedDpm !== null));
  assert.equal(defended.length, zero.length);
  defended.forEach((row, i) => {
    assert.equal(row.plottedDpm, null);
    assert.equal(row.cleanMax, zero[i].cleanMax);
  });
});
