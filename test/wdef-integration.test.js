import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../engine/range.js";
import {
  applyDefense,
  WDEF_PRESETS
} from "../engine/defense.js";
import { CLASS_ENGINES } from "../engine/index.js";

const read = name => JSON.parse(
  readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8")
);
const gearData = read("gear");
const skillsData = read("skills");
const potionsData = read("potions");
const TARGETS = Object.freeze([1, 2, 3, 4, 6]);
const AUDIT_TARGETS = Object.freeze([1, 3, 6]);

function current(classId, targetCount, wdef = 0, extra = {}) {
  return CLASS_ENGINES[classId].evaluate({
    gear: gearData.classes[classId].stages["End-game"],
    skillData: skillsData.classes[classId],
    potionWa: 100,
    targetCount,
    wdef,
    ...extra
  });
}

test("WDEF applies asymmetric subtraction and floors unsupported negative damage", () => {
  assert.deepEqual(applyDefense({ min: 1000, max: 2000, wdef: 500 }), {
    min: 700,
    max: 1750,
    wdef: 500,
    status: "applied"
  });
  assert.deepEqual(applyDefense({ min: 100, max: 200, wdef: 400 }), {
    min: 0,
    max: 0,
    wdef: 400,
    status: "applied"
  });
});

test("Paladin applies elemental weakness before WDEF", () => {
  const result = current("paladin", 1, 1000);
  const gear = gearData.classes.paladin.stages["End-game"];
  const baseRange = calculateRange({
    classId: "paladin",
    rangeModelId: "warrior-2h-sword",
    mw20Stats: gear.stats.mw20,
    wa: result.audit.calculationWa
  });
  const expectedMin = baseRange.min * 1.95 - 0.6 * 1000;
  const expectedMax = baseRange.max * 1.95 - 0.5 * 1000;
  assert.ok(Math.abs(result.audit.buffedMin - expectedMin) < 1e-9);
  assert.ok(Math.abs(result.audit.buffedMax - expectedMax) < 1e-9);
  assert.notEqual(result.audit.buffedMin, (baseRange.min - 600) * 1.95);
});

test("WDEF is applied before the line cap and PA pierces after the cap", () => {
  const result = current("marksman", 6, 0, {
    options: { includeFrostprey: false }
  });
  const { buffedMin: min, buffedMax: max } = result.audit;
  const normal = cappedUniformExpectation({
    min,
    max,
    k: 8.5,
    cap: DEFAULT_LINE_CAP
  });
  const critical = cappedUniformExpectation({
    min,
    max,
    k: 10.9,
    cap: DEFAULT_LINE_CAP
  });
  const firstTarget = 0.45 * normal + 0.55 * critical;
  let aggregate = 0;
  for (let index = 0; index < 6; index += 1) {
    aggregate += firstTarget * 1.2 ** index;
  }
  const expectedDpmM = aggregate * 60 / 1.75 / 1_000_000;
  assert.ok(Math.abs(result.dpm - expectedDpmM) < 1e-9);
  assert.equal(result.audit.capState.firstTargetCritical, "partially-capped");
  assert.equal(result.audit.capState.successiveTargets, "after-modifier-no-recap");
});

function buccModel(skillId) {
  const skills = {
    [skillId]: { lines: [{ coefficient: 1 }] }
  };
  const selectors = Object.fromEntries(TARGETS.map(targetCount => [String(targetCount), {
    st: { cycleSeconds: 1, actions: [{ skill: skillId }] },
    nonSt: { cycleSeconds: 1, actions: [{ skill: skillId }] }
  }]));
  return {
    damageCap: DEFAULT_LINE_CAP,
    stUptime: 0.75,
    nonStUptime: 0.25,
    skills,
    selectors
  };
}

test("Buccaneer applies Demolition immunity per skill, not class-wide", () => {
  const gear = gearData.classes.buccaneer.stages["End-game"];
  const demoModel = buccModel("demolition");
  const demo0 = CLASS_ENGINES.buccaneer.evaluate({
    gear,
    exactModel: demoModel,
    targetCount: 1,
    potionWa: 100,
    wdef: 0
  });
  const demo4000 = CLASS_ENGINES.buccaneer.evaluate({
    gear,
    exactModel: demoModel,
    targetCount: 1,
    potionWa: 100,
    wdef: 4000
  });
  assert.equal(demo4000.dpm, demo0.dpm);
  assert.equal(demo4000.audit.capState.st.demolition[0], "uncapped");

  const sensitiveModel = buccModel("dragon-strike");
  const sensitive0 = CLASS_ENGINES.buccaneer.evaluate({
    gear,
    exactModel: sensitiveModel,
    targetCount: 1,
    potionWa: 100,
    wdef: 0
  });
  const sensitive4000 = CLASS_ENGINES.buccaneer.evaluate({
    gear,
    exactModel: sensitiveModel,
    targetCount: 1,
    potionWa: 100,
    wdef: 4000
  });
  assert.ok(sensitive4000.dpm < sensitive0.dpm);
});

test("Marksman Snipe stays fixed while its Strafe companion takes WDEF", () => {
  const noSummon = { options: { includeFrostprey: false } };
  const atZero = current("marksman", 1, 0, noSummon);
  const at4000 = current("marksman", 1, 4000, noSummon);
  const expected = result => {
    const normal = cappedUniformExpectation({
      min: result.audit.buffedMin,
      max: result.audit.buffedMax,
      k: 1.25,
      cap: DEFAULT_LINE_CAP
    });
    const critical = cappedUniformExpectation({
      min: result.audit.buffedMin,
      max: result.audit.buffedMax,
      k: 3.65,
      cap: DEFAULT_LINE_CAP
    });
    const strafeCast = (0.45 * normal + 0.55 * critical) * 4;
    return (199999 + 7 * strafeCast) * 60 / 5.04 / 1_000_000;
  };
  assert.ok(Math.abs(atZero.dpm - expected(atZero)) < 1e-9);
  assert.ok(Math.abs(at4000.dpm - expected(at4000)) < 1e-9);
  assert.ok(at4000.dpm < atZero.dpm);
  assert.equal(at4000.audit.defense.fixedDamage.snipe, "immune");
});

test("Summon terms use the limited generic WDEF treatment and retain WDEF=0", () => {
  const bm0 = current("bowmaster", 1, 0);
  const bm4000 = current("bowmaster", 1, 4000);
  const mm0 = current("marksman", 1, 0);
  const mm4000 = current("marksman", 1, 4000);
  const bmStats = gearData.classes.bowmaster.stages["End-game"].stats.mw20;
  const mmStats = gearData.classes.marksman.stages["End-game"].stats.mw20;
  assert.ok(Math.abs(bm0.audit.phoenixDpmM - (2.125 * bmStats.dex + bmStats.str) * 5.5 * 15 / 1e6) < 1e-12);
  assert.ok(Math.abs(mm0.audit.frostpreyDpmM - (2.125 * mmStats.dex + mmStats.str) * 6 * (100 / 7) / 1e6) < 1e-12);
  assert.ok(bm4000.audit.phoenixDpmM < bm0.audit.phoenixDpmM);
  assert.ok(mm4000.audit.frostpreyDpmM < mm0.audit.frostpreyDpmM);
  assert.match(bm4000.audit.summonDefense.treatment, /VERIFY/);
  assert.match(mm4000.audit.summonDefense.treatment, /VERIFY/);
});

test("Current v9.5 End-game Apple WDEF=0 outputs remain unchanged", () => {
  const expected = {
    "night-lord": [20.251616112, 20.251616112, 35.146109546496014],
    corsair: [24.79577296395264, 27.60152906928768, 53.59535216086274],
    shadower: [17.98718104391346, 33.95618363973689, 49.17792113341205],
    bowmaster: [18.371504733, 18.849550983384002, 28.342392308524808],
    "dark-knight": [17.765028328320003, 53.29508498496002, 53.29508498496002],
    hero: [17.57454105980444, 52.72362317941332, 52.72362317941332],
    buccaneer: [15.781737277627133, 24.13066939330962, 48.06265747750916],
    marksman: [17.795998893729525, 18.292670322300953, 60.14474644230769],
    paladin: [17.540995744948493, 36.94501252930991, 73.89002505861983]
  };
  for (const [classId, values] of Object.entries(expected)) {
    AUDIT_TARGETS.forEach((targetCount, index) => {
      const historicalGear = JSON.parse(readFileSync(new URL("../reference/archive/gear-pre-alignment-v9.5.0.json", import.meta.url), "utf8"));
      const result = CLASS_ENGINES[classId].evaluate({ gear: historicalGear.classes[classId].stages["End-game"], skillData: skillsData.classes[classId], potionWa: 100, targetCount, wdef: 0 });
      assert.ok(
        Math.abs(result.dpm - values[index]) < 1e-9,
        `${classId} ${targetCount}T`
      );
      assert.equal(result.audit.wdef, 0);
    });
  }
  assert.equal(current("hero", 1, 0).audit.buffAdditiveWa, 29.333333333333332);
});

test("Current stages, potions, targets, and WDEF presets stay finite, nonnegative, and nonincreasing", () => {
  for (const [classId, classData] of Object.entries(gearData.classes)) {
    for (const gear of Object.values(classData.stages)) {
      for (const potion of potionsData.potions) {
        for (const targetCount of TARGETS) {
          let previous = Number.POSITIVE_INFINITY;
          for (const wdef of WDEF_PRESETS) {
            const result = CLASS_ENGINES[classId].evaluate({
              gear,
              skillData: skillsData.classes[classId],
              potionWa: potion.wa,
              targetCount,
              wdef
            });
            assert.ok(Number.isFinite(result.dpm), `${classId} ${potion.id} ${targetCount}T ${wdef}`);
            assert.ok(result.dpm >= 0, `${classId} ${potion.id} ${targetCount}T ${wdef}`);
            assert.ok(
              result.dpm <= previous + 1e-9,
              `${classId} ${potion.id} ${targetCount}T ${wdef}`
            );
            previous = result.dpm;
          }
        }
      }
    }
  }
});
