import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CLASS_ORDER,
  STAGE_ORDER,
  TARGET_COUNTS,
  buildProgressionSeries,
  buildRanking,
  formatDpm,
  summarizeCapState
} from "../ui-model.js";

const gearData = JSON.parse(readFileSync(new URL("../data/gear.json", import.meta.url), "utf8"));
const skillsData = JSON.parse(readFileSync(new URL("../data/skills.json", import.meta.url), "utf8"));
const potionsData = JSON.parse(readFileSync(new URL("../data/potions.json", import.meta.url), "utf8"));

test("Phase 3 adapter builds four-stage series for every supported target count", () => {
  for (const targetCount of TARGET_COUNTS) {
    const series = buildProgressionSeries({
      gearData,
      skillsData,
      potionsData,
      potionId: "apple",
      targetCount,
      wdef: 0
    });

    assert.equal(series.length, CLASS_ORDER.length, `${targetCount}T class count`);
    assert.deepEqual(series.map(item => item.classId), CLASS_ORDER);
    for (const item of series) {
      assert.deepEqual(item.points.map(point => point.stage), STAGE_ORDER);
      assert.equal(item.points.length, STAGE_ORDER.length);
      assert.ok(item.points.every(point => Number.isFinite(point.dpm)));
    }
  }
});

test("Phase 3 ranking sorts the selected stage without changing source series", () => {
  const series = buildProgressionSeries({
    gearData,
    skillsData,
    potionsData,
    potionId: "apple",
    targetCount: 6,
    wdef: 0
  });
  const ranking = buildRanking(series, "End-game");

  assert.equal(ranking.length, CLASS_ORDER.length);
  assert.ok(ranking.every((item, index) => index === 0 || item.point.dpm <= ranking[index - 1].point.dpm));
  assert.equal(series[0].points.length, STAGE_ORDER.length);
  assert.match(formatDpm(ranking[0].point.dpm), /^\d+\.\d{2}m$/);
  assert.ok(["Uncapped", "Partially capped", "Fully capped"].includes(
    summarizeCapState(ranking[0].point.audit.capState)
  ));
});
