import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  WEAPONS,
  SLOTS,
  defaultPreset,
  evaluatePreset,
  relevantStats
} from "../engine/user-preset.js";
import { CLASS_ENGINES } from "../engine/index.js";
import { calculateRange } from "../engine/range.js";
import {
  DEFAULT_COMBAT,
  RANGE_MODELS_BY_CLASS,
  combatOptions
} from "../engine/profile.js";

const read = name => JSON.parse(
  readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8")
);
const gearData = read("gear");
const skillsData = read("skills");
const CLASS_IDS = Object.keys(CLASS_ENGINES);

function options(classId, overrides = {}) {
  return {
    skillsData,
    potionWa: overrides.potionWa ?? 100,
    targetCount: overrides.targetCount ?? 1,
    wdef: overrides.wdef ?? 0,
    combat: {
      ...DEFAULT_COMBAT,
      attackBuff: "rage",
      ...overrides.combat
    }
  };
}

function canonicalRaw(classId, stage = "End-game") {
  const preset = defaultPreset(classId);
  const gear = gearData.classes[classId].stages[stage];
  const final = gear.stats.mw20;
  const mw20Percent = 10;
  const stat = name => {
    const canonicalValue = Number.isFinite(final[name])
      ? final[name]
      : name === "str" ? gear.stats.aux.strSubtotal : preset.base[name];
    return canonicalValue - Math.floor(preset.base[name] * mw20Percent / 100);
  };
  const raw = {
    str: stat("str"),
    dex: stat("dex"),
    luk: Number.isFinite(final.luk) ? stat("luk") : preset.base.luk
  };
  const range = calculateRange({
    classId,
    rangeModelId: RANGE_MODELS_BY_CLASS[classId],
    mw20Stats: raw,
    wa: gear.cleanWa,
    roundDown: true
  });
  return { preset, gear, raw, range };
}

function canonicalQuick(classId, stage = "End-game") {
  const { preset, gear, raw, range } = canonicalRaw(classId, stage);
  return {
    ...preset,
    weaponId: WEAPONS[classId][0].id,
    quick: {
      str: raw.str,
      dex: raw.dex,
      luk: relevantStats(classId).includes("luk") ? raw.luk : "",
      wa: gear.cleanWa,
      max: range.max
    }
  };
}

function detailedFromCanonical(classId, stage = "End-game") {
  const { preset, gear, raw } = canonicalRaw(classId, stage);
  const passive = classId === "bowmaster" ? 10 : classId === "marksman" ? 15 : 0;
  const detailed = {
    ...preset,
    mode: "detailed",
    weaponId: WEAPONS[classId][0].id,
    quick: { str: "", dex: "", luk: "", wa: "", max: "" },
    slots: Object.fromEntries(SLOTS.map(slot => [slot, { str: 0, dex: 0, luk: 0, wa: 0 }])),
    ammoWa: 0
  };
  for (const stat of ["str", "dex", "luk"]) {
    detailed.slots.helmet[stat] = raw[stat] - preset.base[stat];
  }
  detailed.slots.weapon.wa = gear.cleanWa - passive;
  return detailed;
}

test("User preset exports the finalized weapon list, slots, and class stats", () => {
  assert.deepEqual(SLOTS, [
    "weapon", "shield", "helmet", "face", "eye", "earring", "pendant",
    "top", "bottom", "overall", "gloves", "cape", "shoes", "belt",
    "shoulder", "ring1", "ring2", "ring3", "ring4", "medal",
    "nxPendant", "nxRing"
  ]);
  assert.deepEqual(WEAPONS.hero.map(item => item.id), ["dragon-claymore", "stonetooth"]);
  assert.deepEqual(WEAPONS.nightLord, undefined);
  assert.deepEqual(WEAPONS["night-lord"].map(item => item.id), [
    "red-craven", "dragon-purple-sleeve", "no-dex-required-claw"
  ]);
  assert.deepEqual(WEAPONS.bowmaster.map(item => item.requirements), [
    { str: 105 }, { str: 115 }, { str: 90 }
  ]);
  assert.deepEqual(relevantStats("hero"), ["str", "dex"]);
  assert.deepEqual(relevantStats("night-lord"), ["luk", "dex", "str"]);
});

test("defaultPreset uses complete Lv200 AP defaults and blank quick inputs", () => {
  const hero = defaultPreset();
  assert.equal(hero.weaponId, "dragon-claymore");
  assert.deepEqual(hero.base, { str: 999, dex: 23, int: 4, luk: 4 });
  assert.equal(Object.values(hero.base).reduce((sum, value) => sum + value, 0), 1030);
  assert.deepEqual(hero.quick, { str: "", dex: "", luk: "", wa: "", max: "", waMode: "gear" });
  assert.ok(SLOTS.every(slot => deepEqualSlot(hero.slots[slot], { str: 0, dex: 0, luk: 0, wa: 0 })));
  assert.deepEqual(defaultPreset("night-lord").base, { str: 4, dex: 25, int: 4, luk: 997 });
});

test("Quick mode round-trips every canonical class from raw pre-MW stats", () => {
  for (const classId of CLASS_IDS) {
    const input = canonicalQuick(classId);
    const result = evaluatePreset(input, options(classId));
    assert.equal(result.valid, true, `${classId}: ${result.errors.join("; ")}`);
    assert.equal(result.errors.length, 0, classId);
    assert.ok(Number.isFinite(result.dpm), classId);
    assert.ok(Number.isFinite(result.mw20Range.max), classId);
    assert.equal(result.cleanWa, input.quick.wa, classId);

    const direct = CLASS_ENGINES[classId].evaluate({
      gear: inputGear(classId),
      skillData: skillsData.classes[classId],
      potionWa: 100,
      targetCount: 1,
      wdef: 0,
      options: { ...combatOptions(classId, { ...DEFAULT_COMBAT, attackBuff: "rage" }), gameRounding: true }
    });
    assert.ok(Math.abs(result.dpm - direct.dpm) < 1e-12, classId);
  }
});

test("Detailed per-slot input is equivalent to the same aggregate quick input", () => {
  for (const classId of CLASS_IDS) {
    const quickInput = canonicalQuick(classId);
    const detailedInput = detailedFromCanonical(classId);
    const quick = evaluatePreset(quickInput, options(classId));
    const detailed = evaluatePreset(detailedInput, options(classId));
    assert.equal(quick.valid, true, `${classId} quick: ${quick.errors.join("; ")}`);
    assert.equal(detailed.valid, true, `${classId} detailed: ${detailed.errors.join("; ")}`);
    assert.equal(detailed.cleanWa, quick.cleanWa, classId);
    assert.deepEqual(detailed.stats.selected, quick.stats.selected, classId);
    assert.ok(Math.abs(detailed.dpm - quick.dpm) < 1e-12, classId);
  }
});

test("Detailed mode adds Bowmaster/Marksman passive WA and separate ammo once", () => {
  for (const [classId, weaponId, requirement, passive] of [
    ["bowmaster", "nisrock", 105, 10],
    ["marksman", "neschere", 100, 15]
  ]) {
    const input = defaultPreset(classId);
    input.mode = "detailed";
    input.weaponId = weaponId;
    input.slots.weapon.wa = 100;
    input.slots.helmet.str = requirement - input.base.str;
    input.ammoWa = 5;
    const result = evaluatePreset(input, options(classId));
    assert.equal(result.valid, true, `${classId}: ${result.errors.join("; ")}`);
    assert.equal(result.cleanWa, 100 + 5 + passive, classId);
  }
});

test("Quick and detailed MM count gear, quiver and passive exactly once", () => {
  const aggregate = canonicalQuick("marksman");
  const total = aggregate.quick.wa;
  aggregate.quick.waMode = "gear";
  aggregate.quick.wa = total - 24 - 15;
  aggregate.ammoWa = 24;
  const quick = evaluatePreset(aggregate, options("marksman"));
  assert.equal(quick.valid, true, quick.errors.join("; "));
  assert.equal(quick.cleanWa, total);
  assert.deepEqual(quick.waBreakdown, { gear: total - 39, ammo: 24, passive: 15, total });

  const detailed = detailedFromCanonical("marksman");
  detailed.slots.weapon.wa = total - 39;
  detailed.ammoWa = 24;
  const bySlot = evaluatePreset(detailed, options("marksman"));
  assert.equal(bySlot.valid, true, bySlot.errors.join("; "));
  assert.deepEqual(bySlot.waBreakdown, quick.waBreakdown);
  assert.equal(bySlot.dpm, quick.dpm);
  assert.deepEqual(bySlot.cleanRange, quick.cleanRange);
});

test("MM example 194 gear + 24 quiver + 15 passive yields 233 clean WA", () => {
  const input = canonicalQuick("marksman");
  input.quick.waMode = "gear";
  input.quick.wa = 194;
  input.ammoWa = 24;
  input.quick.max = calculateRange({
    classId: "marksman",
    rangeModelId: RANGE_MODELS_BY_CLASS.marksman,
    mw20Stats: { str: input.quick.str, dex: input.quick.dex, luk: input.base.luk },
    wa: 233,
    roundDown: true
  }).max;
  const result = evaluatePreset(input, options("marksman"));
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.deepEqual(result.waBreakdown, { gear: 194, ammo: 24, passive: 15, total: 233 });
});

test("Old quick total WA remains unchanged on restore or direct evaluation", () => {
  const old = canonicalQuick("marksman");
  delete old.quick.waMode;
  old.ammoWa = 24;
  const result = evaluatePreset(old, options("marksman"));
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.cleanWa, old.quick.wa);
  assert.equal(result.waBreakdown.legacyTotal, true);
});

test("Classes without ammunition use one WA field even for legacy drafts", () => {
  const input = canonicalQuick("hero");
  delete input.quick.waMode;
  const result = evaluatePreset(input, options("hero"));
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.cleanWa, input.quick.wa);
  assert.deepEqual(result.waBreakdown, { gear: input.quick.wa, ammo: 0, passive: 0, total: input.quick.wa });
  assert.ok(!result.warnings.some(message => message.startsWith("Legacy quick total WA")));
});

test("Quick ammunition is added once for BM, NL and Corsair", () => {
  for (const [classId, ammo, passive] of [
    ["bowmaster", 24, 10], ["night-lord", 30, 0], ["corsair", 24, 0]
  ]) {
    const input = canonicalQuick(classId);
    const total = input.quick.wa;
    input.quick.waMode = "gear";
    input.quick.wa = total - ammo - passive;
    input.ammoWa = ammo;
    const result = evaluatePreset(input, options(classId));
    assert.equal(result.valid, true, `${classId}: ${result.errors.join("; ")}`);
    assert.deepEqual(result.waBreakdown, { gear: total - ammo - passive, ammo, passive, total });
  }
});

test("Detailed mode requires positive weapon attack", () => {
  const input = defaultPreset("hero");
  input.mode = "detailed";
  input.weaponId = "dragon-claymore";
  const result = evaluatePreset(input, options("hero"));
  assert.equal(result.valid, false);
  assert.equal(result.dpm, null);
  assert.ok(result.errors.some(error => /weapon\.wa must be greater than 0/i.test(error)));
});

test("MW uses the selected level for DPM while MW20 remains the graph coordinate", () => {
  const input = canonicalQuick("hero");
  const mw0 = evaluatePreset(input, options("hero", { combat: { mwLevel: 0 } }));
  const mw20 = evaluatePreset(input, options("hero", { combat: { mwLevel: 20 } }));
  assert.equal(mw0.valid, true, mw0.errors.join("; "));
  assert.equal(mw20.valid, true, mw20.errors.join("; "));
  assert.equal(mw0.stats.selected.str, input.quick.str);
  assert.equal(mw20.stats.selected.str - mw0.stats.selected.str, 99);
  assert.deepEqual(mw0.mw20Range, mw20.mw20Range);
  assert.notEqual(mw0.dpm, mw20.dpm);
});

test("Weapon requirements ignore primary requirements but enforce approved secondary requirements", () => {
  const stonetooth = defaultPreset("hero");
  stonetooth.weaponId = "stonetooth";
  stonetooth.quick = {
    str: "999", dex: "23", luk: "", wa: "150", min: "3756", max: "6927"
  };
  const result = evaluatePreset(stonetooth, options("hero"));
  assert.equal(result.valid, false);
  assert.equal(result.dpm, null);
  assert.ok(result.errors.some(error => /stonetooth|DEX 120/i.test(error)));

  const claymore = canonicalQuick("hero");
  claymore.quick.dex = String(claymore.quick.dex);
  claymore.weaponId = "dragon-claymore";
  const accepted = evaluatePreset(claymore, options("hero"));
  assert.equal(accepted.valid, true, accepted.errors.join("; "));
});

test("Shadower weapon and shield requirements exclude their own slot but allow either equip order", () => {
  const selfOnly = defaultPreset("shadower");
  selfOnly.mode = "detailed";
  selfOnly.weaponId = "gold-double-knife";
  selfOnly.slots.weapon = { str: 75, dex: 0, luk: 0, wa: 200 };
  const rejected = evaluatePreset(selfOnly, options("shadower"));
  assert.equal(rejected.valid, false);
  assert.ok(rejected.errors.some(error => /Gold Double Knife|DEX 140/i.test(error)));
  assert.ok(rejected.errors.some(error => /Dragon Khanjar|DEX 150/i.test(error)));

  const circular = defaultPreset("shadower");
  circular.mode = "detailed";
  circular.weaponId = "dragon-kanzir";
  circular.slots.helmet = { str: 66, dex: 123, luk: 0, wa: 0 };
  circular.slots.weapon = { str: 5, dex: 0, luk: 0, wa: 200 };
  circular.slots.shield = { str: 5, dex: 0, luk: 0, wa: 30 };
  const circularResult = evaluatePreset(circular, options("shadower"));
  assert.equal(circularResult.valid, false);
  assert.ok(circularResult.errors.some(error => /cannot be equipped in either order/i.test(error)));

  const gdkFirst = defaultPreset("shadower");
  gdkFirst.mode = "detailed";
  gdkFirst.weaponId = "gold-double-knife";
  gdkFirst.slots.helmet = { str: 66, dex: 123, luk: 0, wa: 0 };
  gdkFirst.slots.weapon = { str: 5, dex: 0, luk: 0, wa: 200 };
  gdkFirst.slots.shield = { str: 5, dex: 0, luk: 0, wa: 30 };
  const accepted = evaluatePreset(gdkFirst, options("shadower"));
  assert.equal(accepted.valid, true, accepted.errors.join("; "));
});

test("Quick verification checks Clean Max and ignores a supplied panel minimum", () => {
  const input = canonicalQuick("hero");
  const accepted = evaluatePreset(input, options("hero"));
  assert.equal(accepted.valid, true, accepted.errors.join("; "));
  assert.ok(accepted.warnings.some(warning => /Quick mode/i.test(warning)));
  input.quick.min = accepted.cleanRange.min + 500;
  const differentMinimum = evaluatePreset(input, options("hero"));
  assert.equal(differentMinimum.valid, true, differentMinimum.errors.join("; "));
  input.quick.max += 2;
  const rejected = evaluatePreset(input, options("hero"));
  assert.equal(rejected.valid, false);
  assert.equal(rejected.dpm, null);
  assert.ok(rejected.errors.some(error => /max range does not match/i.test(error)));
});

test("Panel ranges floor both endpoints and quick mode rejects a one-point mismatch", () => {
  const input = canonicalQuick("hero");
  const accepted = evaluatePreset(input, options("hero"));
  assert.equal(accepted.valid, true);
  assert.ok(Number.isInteger(accepted.cleanRange.min));
  assert.ok(Number.isInteger(accepted.cleanRange.max));
  input.quick.max = accepted.cleanRange.max + 1;
  const rejected = evaluatePreset(input, options("hero"));
  assert.equal(rejected.valid, false);
  assert.match(rejected.errors.join(" "), /max range does not match/);
});

test("Temporary NX pendant and ring add to permanent gear without replacing it", () => {
  const plain = detailedFromCanonical("hero");
  const baseline = evaluatePreset(plain, options("hero"));
  assert.equal(baseline.valid, true);
  const withNx = structuredClone(plain);
  withNx.slots.nxPendant.str = 3;
  withNx.slots.nxPendant.dex = 3;
  withNx.slots.nxRing.wa = 1;
  const result = evaluatePreset(withNx, options("hero"));
  assert.equal(result.valid, true, result.errors.join("; "));
  assert.equal(result.stats.beforeMw.str, baseline.stats.beforeMw.str + 3);
  assert.equal(result.stats.beforeMw.dex, baseline.stats.beforeMw.dex + 3);
  assert.equal(result.cleanWa, baseline.cleanWa + 1);
  assert.ok(result.mw20Range.max > baseline.mw20Range.max);
  assert.ok(result.dpm > baseline.dpm);
});

test("Invalid stored or UI values never throw and never produce a valid result", () => {
  const cases = [];
  const missingQuick = defaultPreset("hero");
  missingQuick.weaponId = "dragon-claymore";
  cases.push(missingQuick);

  const badBase = canonicalQuick("hero");
  badBase.base.int = 0;
  cases.push(badBase);

  const overBudget = canonicalQuick("hero");
  overBudget.base.dex = 999;
  cases.push(overBudget);

  const badTypes = canonicalQuick("hero");
  badTypes.base.str = true;
  badTypes.quick.dex = {};
  cases.push(badTypes);

  const badGear = defaultPreset("hero");
  badGear.mode = "detailed";
  badGear.weaponId = "dragon-claymore";
  badGear.slots.weapon.wa = -1;
  cases.push(badGear);

  for (const input of cases) {
    let result;
    assert.doesNotThrow(() => {
      result = evaluatePreset(input, options(input.classId));
    });
    assert.equal(result.valid, false);
    assert.equal(result.dpm, null);
  }
});

test("Unsupported SI and Corsair 3T+ SE-off combinations return errors", () => {
  const corsair = canonicalQuick("corsair");
  const seOff = evaluatePreset(corsair, options("corsair", {
    targetCount: 3,
    combat: { se: false }
  }));
  assert.equal(seOff.valid, false);
  assert.ok(seOff.errors.some(error => /Corsair 3T\+/i.test(error)));

  const siOff = evaluatePreset(canonicalQuick("hero"), options("hero", {
    combat: { si: false }
  }));
  assert.equal(siOff.valid, false);
  assert.ok(siOff.errors.some(error => /SI-off/i.test(error)));
});

test("Hidden shield and non-ammo fields cannot silently add stats", () => {
  const hero = defaultPreset("hero");
  hero.mode = "detailed";
  hero.weaponId = "dragon-claymore";
  hero.slots.weapon.wa = 150;
  hero.slots.shield.wa = 100;
  hero.ammoWa = 20;
  const result = evaluatePreset(hero, options("hero"));
  assert.equal(result.valid, false);
  assert.equal(result.dpm, null);
  assert.ok(result.errors.some(error => /shield is only applicable/i.test(error)));
  assert.ok(result.errors.some(error => /ammoWa is not applicable/i.test(error)));
});

function deepEqualSlot(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function inputGear(classId) {
  const gear = gearData.classes[classId].stages["End-game"];
  return {
    cleanWa: gear.cleanWa,
    stats: {
      mw20: { ...gear.stats.mw20 },
      ...(classId === "night-lord" ? { aux: { ...gear.stats.aux } } : {})
    }
  };
}
