import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import * as bowmaster from "../engine/classes/bowmaster.js";
import * as buccaneer from "../engine/classes/buccaneer.js";
import * as corsair from "../engine/classes/corsair.js";
import * as darkKnight from "../engine/classes/dark-knight.js";
import * as hero from "../engine/classes/hero.js";
import * as marksman from "../engine/classes/marksman.js";
import * as nightLord from "../engine/classes/night-lord.js";
import * as paladin from "../engine/classes/paladin.js";
import * as shadower from "../engine/classes/shadower.js";

// These tests verify the frozen v9.4.2 baseline and historical potion sweep.
const legacy = JSON.parse(readFileSync(new URL("../reference/archive/model-inputs-v9.4.2.json", import.meta.url), "utf8"));
const gearData = legacy.gear;
const skillsData = legacy.skills;
const engines = Object.freeze({
  Hero: ["hero", hero],
  "Dark Knight": ["dark-knight", darkKnight],
  Paladin: ["paladin", paladin],
  Corsair: ["corsair", corsair],
  "Night Lord": ["night-lord", nightLord],
  Shadower: ["shadower", shadower],
  Bowmaster: ["bowmaster", bowmaster],
  Marksman: ["marksman", marksman],
  Buccaneer: ["buccaneer", buccaneer]
});
const targets = Object.freeze([1, 2, 3, 4, 6]);
const targetColumns = Object.freeze({
  1: "1T DPM m",
  2: "2T DPM m",
  3: "3T DPM m",
  4: "4T DPM m",
  6: "6T DPM m"
});

test("implemented class engines reproduce every Potion Sweep row", () => {
  const rows = parseCsv(
    readFileSync(new URL("../reference/potion/mapleroyals_attack_potion_sweep_v0_1.csv", import.meta.url), "utf8")
  );

  for (const row of rows) {
    const entry = engines[row.Class];
    if (!entry) continue;
    const [classId, engine] = entry;
    const skillData = skillsData.classes[classId];
    const gear = gearData.classes[classId].stages[row.Stage];
    for (const targetCount of targets) {
      const result = engine.evaluate({
        gear,
        potionWa: Number(row["Potion WA"]),
        targetCount,
        skillData
      });
      const expected = Number(row[targetColumns[targetCount]]);
      // The Buccaneer CSV predates the recovered exact source model and has
      // a small cross-artifact precision delta; the authoritative rounded
      // Apple fixture is asserted separately in core.test.js.
      const tolerance = row.Class === "Buccaneer" ? 2.5e-3 : 1e-8;
      assert.ok(
        Math.abs(result.dpm - expected) < tolerance,
        `${row.Class} ${row.Stage} ${row.Potion} ${targetCount}T: expected ${expected}, got ${result.dpm}`
      );
    }
  }
});

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map(line => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}
