import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { cappedUniformExpectation } from "../engine/caps.js";
import { evaluate as evaluateCorsair } from "../engine/classes/corsair.js";
import { evaluate as evaluateDarkKnight } from "../engine/classes/dark-knight.js";
import { evaluate as evaluateBowmaster } from "../engine/classes/bowmaster.js";
import { evaluate as evaluateBuccaneer } from "../engine/classes/buccaneer.js";
import { evaluate as evaluateHero } from "../engine/classes/hero.js";
import { evaluate as evaluateNightLord } from "../engine/classes/night-lord.js";
import { evaluate as evaluatePaladin } from "../engine/classes/paladin.js";
import { evaluate as evaluateShadower } from "../engine/classes/shadower.js";
import { evaluate as evaluateMarksman } from "../engine/classes/marksman.js";
import { applyDefense } from "../engine/defense.js";
import { CLASS_ENGINES, getClassEngine } from "../engine/index.js";
import { calculateRange } from "../engine/range.js";

// These tests verify the frozen v9.4.2 baseline and historical potion sweep.
const legacy = JSON.parse(readFileSync(new URL("../reference/archive/model-inputs-v9.4.2.json", import.meta.url), "utf8"));
const gearData = legacy.gear;
const skillsData = legacy.skills;
const validationData = JSON.parse(readFileSync(new URL("../data/validation.json", import.meta.url), "utf8"));

test("cappedUniformExpectation handles uncapped, partial, and fully capped ranges", () => {
  assert.equal(cappedUniformExpectation({ min: 100, max: 200, k: 0.5 }), 75);
  assert.equal(cappedUniformExpectation({ min: 250000, max: 300000 }), 199999);

  const partial = cappedUniformExpectation({ min: 100000, max: 300000 });
  assert.ok(Math.abs(partial - 174999.4999975) < 1e-7);
});

test("cappedUniformExpectation handles degenerate and zero-multiplier inputs", () => {
  assert.equal(cappedUniformExpectation({ min: 100, max: 100, k: 2 }), 200);
  assert.equal(cappedUniformExpectation({ min: 100, max: 100, k: 2000, cap: 199999 }), 199999);
  assert.equal(cappedUniformExpectation({ min: 100, max: 200, k: 0 }), 0);
});

test("class registry exposes all nine Phase 2 class ids", () => {
  assert.deepEqual(Object.keys(CLASS_ENGINES).sort(), [
    "bowmaster",
    "buccaneer",
    "corsair",
    "dark-knight",
    "hero",
    "marksman",
    "night-lord",
    "paladin",
    "shadower"
  ]);
  assert.equal(getClassEngine("hero").classId, "hero");
});

test("warrior two-handed sword range uses actual stats and WA", () => {
  const range = calculateRange({
    classId: "hero",
    rangeModelId: "warrior-2h-sword",
    mw20Stats: { str: 1338, dex: 97 },
    wa: 223
  });

  assert.ok(Math.abs(range.min - 7627.92016) < 1e-9);
  assert.ok(Math.abs(range.max - 13941.514) < 1e-9);
  assert.ok(Math.abs(range.average - (7627.92016 + 13941.514) / 2) < 1e-9);
});

test("warrior spear range uses the authoritative DK coefficients", () => {
  const range = calculateRange({
    classId: "dark-knight",
    rangeModelId: "warrior-spear",
    mw20Stats: { str: 1338, dex: 97 },
    wa: 212
  });

  assert.ok(Math.abs(range.min - 10417.256) < 1e-9);
  assert.ok(Math.abs(range.max - 14388.44) < 1e-9);
});

test("Buccaneer knuckle range matches the four authoritative clean anchors", () => {
  for (const [stage, expected] of Object.entries({
    Entry: [4646, 8476],
    Advanced: [5226, 9515],
    "Late-game": [6070, 11040],
    "End-game": [6635, 12062]
  })) {
    const gear = gearData.classes.buccaneer.stages[stage];
    const range = calculateRange({
      classId: "buccaneer",
      rangeModelId: "pirate-knuckle",
      mw20Stats: gear.stats.mw20,
      wa: gear.cleanWa
    });
    assert.deepEqual([Math.round(range.min), Math.round(range.max)], expected, stage);
  }
});

test("Hero reproduces the four authoritative v9.4.2 Apple stages", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "hero");

  for (const row of expectedRows) {
    const result = evaluateHero({
      gear: gearData.classes.hero.stages[row.stage],
      potionWa: 100,
      targetCount: 1,
      wdef: 0,
      skillData: skillsData.classes.hero
    });
    assert.ok(
      Math.abs(result.dpm - row.expectedDpmM["1"]) < 1e-9,
      `${row.stage}: expected ${row.expectedDpmM["1"]}, got ${result.dpm}`
    );
  }
});

test("Hero keeps the canonical three-target cap", () => {
  const gear = gearData.classes.hero.stages["End-game"];
  const oneTarget = evaluateHero({ gear, potionWa: 100, targetCount: 1 });
  const sixTargets = evaluateHero({ gear, potionWa: 100, targetCount: 6 });
  assert.ok(Math.abs(sixTargets.dpm - oneTarget.dpm * 3) < 1e-9);
  assert.equal(sixTargets.audit.effectiveTargetCount, 3);
});

test("Dark Knight reproduces the four authoritative v9.4.2 Apple stages", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "dark-knight");

  for (const row of expectedRows) {
    const result = evaluateDarkKnight({
      gear: gearData.classes["dark-knight"].stages[row.stage],
      potionWa: 100,
      targetCount: 3,
      wdef: 0,
      skillData: skillsData.classes["dark-knight"]
    });
    assert.ok(
      Math.abs(result.dpm - row.expectedDpmM["3"]) < 1e-9,
      `${row.stage}: expected ${row.expectedDpmM["3"]}, got ${result.dpm}`
    );
  }
});

test("Dark Knight rejects Rage and Dragon Blood overlap", () => {
  const gear = gearData.classes["dark-knight"].stages["End-game"];
  assert.throws(
    () => evaluateDarkKnight({
      gear,
      potionWa: 100,
      targetCount: 1,
      buffs: { rage: true, dragonBlood: true }
    }),
    /rage \+ dragonBlood/
  );
});

test("Paladin reproduces the four authoritative v9.4.2 General Weak stages", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "paladin");

  for (const row of expectedRows) {
    const result = evaluatePaladin({
      gear: gearData.classes.paladin.stages[row.stage],
      potionWa: 100,
      targetCount: 3,
      wdef: 0,
      skillData: skillsData.classes.paladin
    });
    assert.ok(
      Math.abs(result.dpm - row.expectedDpmM["3"]) < 1e-9,
      `${row.stage}: expected ${row.expectedDpmM["3"]}, got ${result.dpm}`
    );
  }
});

test("Paladin retains Neutral and Holy Weak branches", () => {
  const gear = gearData.classes.paladin.stages["End-game"];
  const neutral = evaluatePaladin({ gear, potionWa: 100, targetCount: 1, condition: "neutral" });
  const generalWeak = evaluatePaladin({ gear, potionWa: 100, targetCount: 1 });
  const holyWeak = evaluatePaladin({ gear, potionWa: 100, targetCount: 1, condition: "holy-weak" });

  assert.equal(neutral.audit.condition, "neutral");
  assert.equal(generalWeak.audit.condition, "general-weak");
  assert.equal(holyWeak.audit.condition, "holy-weak");
  assert.ok(neutral.dpm < generalWeak.dpm);
  assert.ok(generalWeak.dpm < holyWeak.dpm);
});

test("Night Lord reproduces all authoritative v9.4.2 Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "night-lord");

  for (const row of expectedRows) {
    const gear = gearData.classes["night-lord"].stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateNightLord({
        gear,
        potionWa: 100,
        targetCount,
        wdef: 0,
        skillData: skillsData.classes["night-lord"]
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 1e-9,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
    }
  }
});

test("Night Lord keeps TT primary through three targets and Avenger at four-plus", () => {
  const gear = gearData.classes["night-lord"].stages["End-game"];
  assert.equal(evaluateNightLord({ gear, potionWa: 100, targetCount: 3 }).selector, "tt-sp");
  assert.equal(evaluateNightLord({ gear, potionWa: 100, targetCount: 4 }).selector, "avenger");
});

test("Shadower reproduces all authoritative v9.4.2 Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "shadower");

  for (const row of expectedRows) {
    const gear = gearData.classes.shadower.stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateShadower({
        gear,
        potionWa: 100,
        targetCount,
        wdef: 0,
        skillData: skillsData.classes.shadower
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 1e-9,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
    }
  }
});

test("Shadower keeps the canonical 1–2T and 3–6T rotation split", () => {
  const gear = gearData.classes.shadower.stages["End-game"];
  assert.equal(evaluateShadower({ gear, potionWa: 100, targetCount: 2 }).selector, "assassinate-bstep");
  assert.equal(evaluateShadower({ gear, potionWa: 100, targetCount: 3 }).selector, "bstep-bot");
});

test("Bowmaster reproduces all authoritative v9.4.2 Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "bowmaster");

  for (const row of expectedRows) {
    const gear = gearData.classes.bowmaster.stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateBowmaster({
        gear,
        potionWa: 100,
        targetCount,
        wdef: 0,
        skillData: skillsData.classes.bowmaster
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 1e-9,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
    }
  }
});

test("Bowmaster keeps Hurricane primary through three targets and Arrow Rain at four-plus", () => {
  const gear = gearData.classes.bowmaster.stages["End-game"];
  assert.equal(evaluateBowmaster({ gear, potionWa: 100, targetCount: 3 }).selector, "hurricane");
  assert.equal(evaluateBowmaster({ gear, potionWa: 100, targetCount: 4 }).selector, "arrow-rain");
});

test("Marksman reproduces all authoritative v9.4.2 Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "marksman");

  for (const row of expectedRows) {
    const gear = gearData.classes.marksman.stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateMarksman({
        gear,
        potionWa: 100,
        targetCount,
        wdef: 0,
        skillData: skillsData.classes.marksman
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 1e-9,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
    }
  }
});

test("Marksman keeps Snipe+7 Strafe canonical and exposes Pure Strafe only explicitly", () => {
  const gear = gearData.classes.marksman.stages["End-game"];
  assert.equal(evaluateMarksman({ gear, potionWa: 100, targetCount: 1 }).selector, "snipe-plus-7-strafe");
  assert.equal(evaluateMarksman({ gear, potionWa: 100, targetCount: 3, skillData: skillsData.classes.marksman }).selector, "pa-1.40");
  assert.equal(
    evaluateMarksman({ gear, potionWa: 100, targetCount: 1, options: { selector: "pure-strafe" } }).selector,
    "pure-strafe"
  );
});

test("Corsair reproduces all authoritative v9.4.2 Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "corsair");

  for (const row of expectedRows) {
    const gear = gearData.classes.corsair.stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateCorsair({
        gear,
        potionWa: 100,
        targetCount,
        wdef: 0,
        skillData: skillsData.classes.corsair
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 1e-9,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
    }
  }
});

test("Buccaneer reproduces the recovered authoritative Apple target outputs", () => {
  const expectedRows = validationData.goldenSuites.masterAppleV942
    .filter(row => row.classId === "buccaneer");
  const exactModel = skillsData.classes.buccaneer.canonical.exactModel;

  assert.deepEqual(
    exactModel.skills.barrage.lines.map(line => line.coefficient),
    [3.3, 3.3, 3.3, 3.3, 6.6, 13.2]
  );
  assert.deepEqual(
    exactModel.skills.barrage.lines.map(line => line.criticalCoefficient),
    [4.7, 4.7, 4.7, 4.7, 9.4, 18.8]
  );

  for (const row of expectedRows) {
    const gear = gearData.classes.buccaneer.stages[row.stage];
    for (const targetCount of [1, 2, 3, 4, 6]) {
      const result = evaluateBuccaneer({
        gear,
        potionWa: 100,
        targetCount,
        wdef: row.wdef,
        skillData: skillsData.classes.buccaneer
      });
      assert.ok(
        Math.abs(result.dpm - row.expectedDpmM[String(targetCount)]) < 0.006,
        `${row.stage} ${targetCount}T: expected ${row.expectedDpmM[String(targetCount)]}, got ${result.dpm}`
      );
      assert.equal(result.audit.seApplied, true);
    }
  }
});

test("Buccaneer keeps the recovered target strategy table", () => {
  const gear = gearData.classes.buccaneer.stages["End-game"];
  const expected = {
    1: ["barrage-demolition", "barrage-dragon-strike"],
    2: ["barrage-dragon-strike", "barrage-dragon-strike"],
    3: ["dragon-strike-snatch", "barrage-dragon-strike"],
    4: ["dragon-strike-snatch", "barrage-dragon-strike"],
    6: ["dragon-strike-snatch", "barrage-dragon-strike"]
  };

  for (const targetCount of [1, 2, 3, 4, 6]) {
    const result = evaluateBuccaneer({
      gear,
      potionWa: 100,
      targetCount,
      skillData: skillsData.classes.buccaneer
    });
    assert.deepEqual(
      [result.audit.rotations.st, result.audit.rotations.nonSt],
      expected[targetCount],
      `${targetCount}T selector`
    );
  }
});

test("Buccaneer source-driven contract applies the cap per line", () => {
  const exactModel = {
    damageCap: 100,
    skills: {
      barrage: {
        lines: [
          { coefficient: 1 },
          { coefficient: 20 }
        ]
      }
    },
    selectors: Object.fromEntries([1, 2, 3, 4, 6].map(targetCount => [
      String(targetCount),
      {
        st: { cycleSeconds: 1, actions: [{ skill: "barrage" }] },
        nonSt: { cycleSeconds: 1, actions: [{ skill: "barrage" }] }
      }
    ]))
  };
  const result = evaluateBuccaneer({
    gear: { cleanWa: 10, stats: { mw20: { str: 10, dex: 10 } } },
    targetCount: 1,
    exactModel
  });

  assert.equal(result.selector, "sustained-cap-aware");
  assert.equal(result.audit.capState.st.barrage[0], "uncapped");
  assert.equal(result.audit.capState.st.barrage[1], "fully-capped");
  assert.ok(Math.abs(result.dpm - 0.00664466688) < 1e-12);
});

test("WDEF applies the frozen asymmetric subtraction within the supported domain", () => {
  assert.deepEqual(applyDefense({ min: 10, max: 20, wdef: 0 }), {
    min: 10,
    max: 20,
    wdef: 0,
    status: "normalized-zero"
  });
  assert.deepEqual(applyDefense({ min: 1000, max: 2000, wdef: 500 }), {
    min: 700,
    max: 1750,
    wdef: 500,
    status: "applied"
  });
  assert.throws(() => applyDefense({ min: 10, max: 20, wdef: -1 }), /between 0 and 4000/);
  assert.throws(() => applyDefense({ min: 10, max: 20, wdef: 4001 }), /between 0 and 4000/);
});
