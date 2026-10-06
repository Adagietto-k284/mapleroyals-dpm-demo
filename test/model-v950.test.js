import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CLASS_ENGINES } from "../engine/index.js";
import { calculateRange } from "../engine/range.js";

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
// Published v9.5 numbers belong to the pre-alignment gear, not the new builds.
const gear = JSON.parse(readFileSync(new URL("../reference/archive/gear-pre-alignment-v9.5.0.json", import.meta.url), "utf8"));
const skills = read("skills");
const source = read("model-sync-v9.5.0");
const targets = [1, 2, 3, 4, 6];
const evaluate = (id, stage, targetCount, options = {}) => CLASS_ENGINES[id].evaluate({
  gear: gear.classes[id].stages[stage], skillData: skills.classes[id],
  potionWa: 100, targetCount, options
});

test("v9.5 warrior End stats and all target outputs match published rounded results", () => {
  for (const [id, expected] of Object.entries(source.warriorEndDpmM)) {
    const input = gear.classes[id].stages["End-game"];
    assert.equal(input.stats.mw20.str, 1353);
    const range = calculateRange({ rangeModelId: id === "dark-knight" ? "warrior-spear" : "warrior-2h-sword", mw20Stats: input.stats.mw20, wa: input.cleanWa });
    assert.ok(Math.abs(range.max - input.referenceCleanRange.max) < 1e-8);
    assert.ok(Math.abs(range.min - input.referenceCleanRange.min) < 0.001);
    targets.forEach((t, i) => assert.ok(Math.abs(evaluate(id, "End-game", t).dpm - expected[i]) <= 0.0005, `${id} ${t}T`));
  }
});

test("Hero/DK apply Echo once after additive WA, and disabling it changes damage", () => {
  for (const id of ["hero", "dark-knight"]) {
    const on = evaluate(id, "End-game", 1);
    const off = evaluate(id, "End-game", 1, { enableEcho: false });
    assert.equal(on.audit.echoApplied, true);
    assert.equal(off.audit.echoApplied, false);
    assert.equal(on.audit.calculationWa, on.audit.preEchoWa * 1.04);
    assert.equal(off.audit.calculationWa, off.audit.preEchoWa);
    assert.ok(Math.abs(on.dpm / off.dpm - 1.04) < 1e-10);
  }
});

test("MM empirical 1.75 cycle and 3T selector match the archived Archer results", () => {
  for (const [stage, expected] of Object.entries(source.marksmanStageDpmM)) {
    [3, 4, 6].forEach((t, i) => {
      const result = evaluate("marksman", stage, t);
      assert.equal(result.selector, t === 3 ? "snipe-plus-7-strafe" : "pa-1.75");
      assert.ok(Math.abs(result.dpm - expected[i]) <= 0.005, `${stage} ${t}T`);
    });
  }
  for (const [t, expected] of Object.entries(source.marksmanEndDpmM)) {
    assert.ok(Math.abs(evaluate("marksman", "End-game", Number(t)).dpm - expected) <= 0.0005);
  }
  for (const selector of ["pa-1.20", "pa-1.40"]) {
    assert.throws(() => evaluate("marksman", "End-game", 4, { selector }), /Unknown Marksman selector/);
  }
  assert.throws(() => evaluate("marksman", "End-game", 4, { paCycleModel: "1.20" }), /Retired/);
});

test("Bucc uses Shockwave only for 4/6T cooldown and retains 1/2/3T rotations", () => {
  for (const t of targets) {
    const result = evaluate("buccaneer", "End-game", t);
    assert.equal(result.audit.rotations.nonSt, t >= 4 ? "transform-dragon-strike-shockwave" : "barrage-dragon-strike");
    assert.equal(result.audit.rotations.st, t === 1 ? "barrage-demolition" : t === 2 ? "barrage-dragon-strike" : "dragon-strike-snatch");
  }
  // Low-stat, no-SE/no-Echo case: every line is uncapped. Independent
  // 75/25 hand equation checks the 900+600 and 900+700 rotations.
  const result = CLASS_ENGINES.buccaneer.evaluate({
    gear: { cleanWa: 10, stats: { mw20: { str: 10, dex: 10 } } },
    skillData: skills.classes.buccaneer, targetCount: 6,
    options: { enableSe: false, enableRage: false, enableEcho: false }
  });
  const meanRange = ((4.8 * 10 * 0.6 * 0.9 + 10) * 0.1 + (4.8 * 10 + 10) * 0.1) / 2;
  const expected = meanRange * 6 * 60 * (0.75 * 15 / 1.653 + 0.25 * 16 / 2.4) / 1e6;
  assert.ok(Math.abs(result.dpm - expected) < 1e-12);
});

test("Current nine-class grid stays finite across every potion and stage", () => {
  for (const [id, classGear] of Object.entries(read("gear").classes)) {
    for (const input of Object.values(classGear.stages)) {
      for (const potion of read("potions").potions) {
        for (const t of targets) {
          const result = CLASS_ENGINES[id].evaluate({ gear: input, skillData: skills.classes[id], potionWa: potion.wa, targetCount: t });
          assert.ok(Number.isFinite(result.dpm) && result.dpm > 0, `${id} ${potion.id} ${t}T`);
        }
      }
    }
  }
});
