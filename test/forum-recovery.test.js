import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectReferences } from '../ui-references.js';
import { CLASS_ORDER, TARGET_COUNTS } from '../ui-model.js';
import { DEFAULT_COMBAT } from '../engine/profile.js';
const data = JSON.parse(readFileSync(new URL('../data/chart-references.json', import.meta.url)));
const source = JSON.parse(readFileSync(new URL('../reference/archive/forum-p3-final-source.json', import.meta.url)));

test('Every target restores nine Forum pairs and only the three p.3 Extreme classes', () => {
  for (const targetCount of TARGET_COUNTS) {
    const settings = { targetCount, potionId: 'apple', combat: DEFAULT_COMBAT, visibleClasses: new Set(CLASS_ORDER) };
    const records = selectReferences(data, settings);
    for (const classId of CLASS_ORDER) {
      const pair = records.filter(r => r.classId === classId && r.kind.startsWith('Forum'));
      assert.equal(pair.length, 2, classId);
      assert.ok(pair.every(r => Number.isFinite(r.plottedDpm) && r.dpmBasis === 'p3-final-interpolation'));
    }
    assert.deepEqual(records.filter(r => r.kind === 'Extreme').map(r => r.classId).sort(), ['dark-knight', 'night-lord', 'paladin']);
    assert.equal(records.length, targetCount === 6 ? 22 : 21);
    const onlyFirst = selectReferences(data, { ...settings, referenceVisibility: { forumMedian:false, forumFirst:true, extreme:false, fury:false } });
    assert.equal(onlyFirst.length, 9);
    assert.ok(onlyFirst.every(r => r.kind === 'Forum #1'));
    assert.ok(selectReferences(data, { ...settings, combat: { ...DEFAULT_COMBAT, echo:false } }).every(r => r.plottedDpm === null));
  }
});

test('Reference slopes reproduce FINAL source segments at every imported target', () => {
  const labels = { 'dark-knight':'Dark Knight', hero:'Hero', paladin:'Paladin', corsair:'Corsair', shadower:'Shadower', buccaneer:'Buccaneer', 'night-lord':'Night Lord', marksman:'Marksman', bowmaster:'Bowmaster' };
  for (const record of data.records.filter(r => r.dpmBasis === 'p3-final-interpolation')) {
    const rows = source.master.filter(r => r.A === labels[record.classId]);
    let left = 0;
    while (left < rows.length - 2 && record.cleanMax > rows[left + 1].E) left++;
    const a = rows[left], b = rows[left+1];
    for (const [target, column] of [['1','F'],['2','G'],['3','H'],['4','I'],['6','J']]) {
      const expected = a[column] * (b.E - record.cleanMax) / (b.E - a.E) + b[column] * (record.cleanMax - a.E) / (b.E - a.E);
      assert.ok(Math.abs(record.dpmM[target] - expected) < 1e-9, `${record.id} ${target}T`);
    }
  }
  assert.equal(data.records.find(r => r.id === 'hero-first').cleanMax, 15595);
  assert.equal(data.records.find(r => r.id === 'marksman-median').cleanMax, 10756);
  assert.equal(data.records.find(r => r.id === 'fury').cleanMax, 14890.54);
});
