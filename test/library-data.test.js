import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  GEAR_CONFIDENCE,
  buildLibraryModel,
  buildMechanicsModel,
  buildValidationModel
} from "../library-data.js";
import { buildProgressionSeries, CLASS_ORDER, STAGE_ORDER } from "../ui-model.js";

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const data = {
  gearData: read("gear"),
  skillsData: read("skills"),
  potionsData: read("potions"),
  buffsData: read("buffs"),
  versionsData: read("versions"),
  syncData: read("model-sync-v9.5.0"),
  referencesData: read("chart-references"),
  gearArchive: readFileSync(new URL("../reference/archive/mapleroyals_gear_model_archive_v9_4_2.md", import.meta.url), "utf8")
};

test("Library model exposes readable four-stage data for every class", () => {
  const series = buildProgressionSeries({ ...data, targetCount: 6 });
  for (const classId of CLASS_ORDER) {
    const model = buildLibraryModel({ data, series, classId, stageId: "Late-game", targetCount: 6 });
    assert.deepEqual(model.stages.map(stage => stage.stage), STAGE_ORDER);
    assert.equal(model.strategies.length, 5);
    assert.equal(model.calculation.at(-1).label, "DPM");
    assert.ok(model.skillCards.length > 0, classId);
    assert.ok(model.slotTables.length > 0, classId);
    for (const slot of ["weapon", "offhand", "ammo"]) {
      assert.equal(model.weaponEquipment[slot].length, 4, `${classId} ${slot}`);
      assert.ok(model.weaponEquipment[slot].every(value => typeof value === "string"));
    }
  }
});

test("Library keeps aggregate and representative gear meanings visible", () => {
  const series = buildProgressionSeries({ ...data, targetCount: 6 });
  const bucc = buildLibraryModel({ data, series, classId: "buccaneer", targetCount: 6 });
  const rows = bucc.slotTables.flatMap(table => table.rows);
  const pioneer = rows.find(row => row.cells[0] === "Pioneer");
  assert.equal(pioneer.confidence, "confirmedTotal");
  assert.equal(rows.some(row => row.cells[0] === "CGS"), false);
  assert.match(bucc.strategies.find(row => row.targetCount === 6).plan, /ST 75%/);
  assert.match(bucc.strategies.find(row => row.targetCount === 6).plan, /non-ST 25%/);
  assert.equal(GEAR_CONFIDENCE.confirmedTotal, "Confirmed total only");
});

test("Weapon equipment separates shield and projectiles without inventing missing gun stats", () => {
  const shad = buildLibraryModel({ data, classId: "shadower" }).weaponEquipment;
  assert.match(shad.offhand[3], /43 WA/);
  assert.match(shad.weapon[3], /144 WA/);
  const sair = buildLibraryModel({ data, classId: "corsair" }).weaponEquipment;
  assert.match(sair.weapon[3], /123 Dragon Revolver WA/);
  assert.match(sair.weapon[3], /not separately archived/);
  assert.equal(sair.ammo[3], "24 WA (bullet)");
  const nl = buildLibraryModel({ data, classId: "night-lord" }).weaponEquipment;
  assert.match(nl.ammo[0], /29 WA/);
});

test("Archer slot tables expose weapon WA already present in all four runtime totals", () => {
  for (const [classId, weapons, passive] of [
    ["bowmaster", [124, 130, 140, 145], 10],
    ["marksman", [127, 133, 143, 148], 15]
  ]) {
    const model = buildLibraryModel({ data, classId });
    const rows = model.slotTables.flatMap(table => table.rows);
    const weapon = rows.find(row => row.cells[0] === "Weapon WA (already included in Clean WA)");
    assert.deepEqual(weapon.cells.slice(1).map(Number), weapons);
    assert.equal(weapons[3] - weapons[2], 5);
    const component = name => rows.find(row => row.cells[0] === name).cells.slice(1);
    const attack = value => Number(value.split("/")[2]);
    STAGE_ORDER.forEach((stage, i) => {
      const total = weapons[i] + [16, 16, 24, 24][i] + passive + [30, 40, 50, 55][i]
        + ["Pendant", "Belt", "Rings aggregate", "Medal"].reduce((sum, name) => sum + attack(component(name)[i]), 0);
      assert.equal(total, data.gearData.classes[classId].stages[stage].cleanWa);
    });
  }
});

test("Library strategy matrix follows current target selectors without inventing fields", () => {
  const series = buildProgressionSeries({ ...data, targetCount: 4 });
  const marksman = buildLibraryModel({ data, series, classId: "marksman", targetCount: 4 });
  assert.match(marksman.strategies[0].plan, /Snipe \+ 7 Strafe/);
  assert.match(marksman.strategies[3].plan, /Piercing Arrow/);
  assert.equal(marksman.calculation.find(row => row.label === "DPM").value, `${marksman.stages[3].dpm.toFixed(3)}m`);

  const paladinSeries = buildProgressionSeries({ ...data, targetCount: 1 });
  const paladin = buildLibraryModel({ data, series: paladinSeries, classId: "paladin", targetCount: 1 });
  assert.equal(paladin.skillCards[0].facts.find(fact => fact.label === "Lines").value, "Not provided in current source");
});

test("Mechanics and validation models expose summaries while retaining raw data separately", () => {
  const mechanics = buildMechanicsModel(data);
  const validation = buildValidationModel(data);
  assert.equal(mechanics.buffRows.length, 7);
  assert.equal(mechanics.potionRows.length, data.potionsData.potions.length);
  assert.equal(mechanics.weaponRows.length, CLASS_ORDER.length);
  assert.ok(mechanics.raw.buffs && mechanics.raw.potions);
  assert.ok(validation.summaryRows.some(row => row[0] === "WDEF"));
  assert.equal(validation.referenceRows.length, data.referencesData.records.length);
  assert.deepEqual(validation.pending, data.referencesData.pending);
  assert.ok(validation.raw.references && validation.raw.sync);
});
