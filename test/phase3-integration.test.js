import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_COMBAT, prepareGear, combatOptions } from '../engine/profile.js';
import { buildProgressionSeries, buildRanking, TARGET_COUNTS } from '../ui-model.js';
import { selectReferences } from '../ui-references.js';
const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
const inputs = { gearData: read('gear'), skillsData: read('skills'), potionsData: read('potions') };
test('MW changes base AP only and preserves normalized X at every target count', () => {
  const gear = inputs.gearData.classes.hero.stages['End-game'];
  const before = JSON.stringify(gear);
  const off = prepareGear('hero', 'End-game', gear, 0);
  assert.equal(gear.stats.mw20.str - off.stats.mw20.str, 99);
  assert.equal(gear.stats.mw20.dex - off.stats.mw20.dex, 2);
  assert.equal(JSON.stringify(gear), before);
  for (const targetCount of TARGET_COUNTS) {
    const on = buildProgressionSeries({ ...inputs, targetCount });
    const off = buildProgressionSeries({ ...inputs, targetCount, combat: { ...DEFAULT_COMBAT, mwLevel: 0 } });
    on.forEach((item, i) => item.points.forEach((point, j) => {
      assert.deepEqual(point.cleanRange, off[i].points[j].cleanRange);
      assert.ok(off[i].points[j].dpm <= point.dpm + 1e-9);
    }));
  }
});
test('Attack buffs are exclusive; Dragon Blood is DK-only; unsupported timing is rejected', () => {
  for (const classId of Object.keys(inputs.gearData.classes)) {
    const options = combatOptions(classId, { attackBuff: 'dragonBlood' });
    assert.equal(options.enableRage, false);
    assert.equal(options.enableDragonBlood, classId === 'dark-knight');
  }
  assert.throws(() => combatOptions('hero', { attackBuff: 'rage+dragonBlood' }));
  assert.throws(() => combatOptions('hero', { si: false }));
});
test('Unverified Torpedo SE-off is omitted rather than ranked', () => {
  const series = buildProgressionSeries({ ...inputs, targetCount: 6, combat: { ...DEFAULT_COMBAT, se: false } });
  assert.ok(series.find(s => s.classId === 'corsair').points.every(p => p.dpm === null && p.unavailable));
  assert.equal(buildRanking(series, 'End-game').length, 8);
});
test('Archived reference DPM requires matching settings; missing fields remain unavailable', () => {
  const data = read('chart-references');
  const settings = { targetCount: 1, potionId: 'apple', combat: DEFAULT_COMBAT, visibleClasses: new Set(Object.keys(inputs.gearData.classes)) };
  const canonical = selectReferences(data, settings);
  assert.ok(canonical.some(r => Number.isFinite(r.plottedDpm)));
  assert.ok(canonical.every(r => Number.isFinite(r.plottedDpm)));
  const ski = canonical.find(r => r.id === 'dark-knight-extreme');
  assert.equal(ski.cleanMax, 16292);
  assert.equal(ski.observedDps, 340599);
  assert.equal(ski.testPotionWa, 140);
  assert.ok(Math.abs(ski.plottedDpm - 19.9972892436404) < 1e-10);
  assert.match(ski.displayStatus, /estimate/);
  const missing = { records: [{ ...data.records[0], dpmM: {} }] };
  assert.equal(selectReferences(missing, settings)[0].plottedDpm, null);
  assert.ok(selectReferences(data, { ...settings, potionId: 'gizer' }).every(r => r.plottedDpm === null));
  assert.equal(selectReferences(data, { ...settings, visibleClasses: new Set() }).length, 0);
});

test('Reference layers filter independently and label Fury as an alternate configuration', () => {
  const data = read('chart-references');
  const visibleClasses = new Set(Object.keys(inputs.gearData.classes));
  const onlyFury = selectReferences(data, {
    targetCount: 6,
    potionId: 'apple',
    combat: DEFAULT_COMBAT,
    visibleClasses,
    referenceVisibility: {
      forumMedian: false,
      forumFirst: false,
      extreme: false,
      fury: true
    }
  });
  assert.equal(onlyFury.length, 1);
  assert.equal(onlyFury[0].isFury, true);
  assert.match(onlyFury[0].displayKind, /alternate configuration/);
  assert.equal(onlyFury[0].plottedDpm, 64.2514);

  const noExtreme = selectReferences(data, {
    targetCount: 1,
    potionId: 'apple',
    combat: DEFAULT_COMBAT,
    visibleClasses,
    referenceVisibility: { forumMedian: true, forumFirst: true, extreme: false, fury: false }
  });
  assert.ok(noExtreme.every(record => record.kind !== 'Extreme'));
  assert.ok(noExtreme.some(record => record.kind === 'Forum median'));
});
