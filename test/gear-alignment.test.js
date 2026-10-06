import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanRange } from '../engine/profile.js';
const gear = JSON.parse(readFileSync(new URL('../data/gear.json', import.meta.url), 'utf8'));
test('Revised range checksums follow the engine without modifying historical anchors', () => {
  for (const [id, c] of Object.entries(gear.classes)) for (const [stage, p] of Object.entries(c.stages)) {
    if (id === 'corsair') continue;
    const range = cleanRange(id, stage, p);
    assert.ok(Math.abs(range.min - p.referenceCleanRange.min) < 1e-8, `${id} ${stage} min`);
    assert.ok(Math.abs(range.max - p.referenceCleanRange.max) < 1e-8, `${id} ${stage} max`);
    assert.ok(p.historicalReferenceCleanRange);
  }
});
test('Shad complete Late/End slots reconcile both stats and WA, with exclusive medal choices', () => {
  const expected = [
    ['Late-game', { str: 4+7+21+5+3+2+27+3+10+2+7, dex: 27+36+7+21+5+8+2+27+3+10+2+7, luk: 1096+21+6+23+27+9+10+3+18+27+3+20+2+7 }, 140+36+50+2+1],
    ['End-game', { str: 4+14+22+3+2+28+7+12+3, dex: 27+40+8+21+8+2+28+7+12+3, luk: 1096+21+6+24+27+9+15+5+20+28+7+24+3 }, 144+43+55+6+1+3]
  ];
  for (const [stage, stats, wa] of expected) {
    const p = gear.classes.shadower.stages[stage];
    assert.deepEqual(p.stats.mw20, stats);
    assert.equal(p.cleanWa, wa);
    assert.ok(stats.dex >= 150);
    assert.ok(stats.str - (stage === 'Late-game' ? 7 : 14) >= 75);
  }
});
test('Bucc approved rings and face preserve MW20 weapon requirements; BM earring fixes Late STR', () => {
  const expected = [[1189,101,145],[1222,100,162],[1247,109,182],[1298,119,196]];
  gear.rules.stageOrder.forEach((stage, i) => {
    const p = gear.classes.buccaneer.stages[stage];
    assert.deepEqual([p.stats.mw20.str,p.stats.mw20.dex,p.cleanWa],expected[i]);
    assert.ok(p.stats.mw20.dex >= (i === 3 ? 110 : 100));
  });
  assert.equal(gear.classes.bowmaster.stages['Late-game'].stats.mw20.str,106);
});
