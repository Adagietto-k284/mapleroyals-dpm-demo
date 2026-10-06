import assert from "node:assert/strict";
import test from "node:test";

import { applyEchoWa } from "../engine/rounding.js";
import { calculateRange } from "../engine/range.js";
import { evaluate as evaluateDarkKnight } from "../engine/classes/dark-knight.js";
import { formatRange } from "../ui-model.js";

test("Echo floors integer weapon attack after additive buffs", () => {
  assert.equal(applyEchoWa(352, 1.04), 366);
  assert.equal(applyEchoWa(352, 1), 352);
  assert.equal(applyEchoWa(352.5, 1.04), 366.6);
});

test("Game panel range floors the final formula while legacy range remains continuous", () => {
  const input = {
    classId: "hero",
    rangeModelId: "warrior-2h-sword",
    mw20Stats: { str: 1338, dex: 97 },
    wa: 223
  };
  const legacy = calculateRange(input);
  const panel = calculateRange({ ...input, roundDown: true });
  assert.equal(panel.min, Math.floor(legacy.min));
  assert.equal(panel.max, Math.floor(legacy.max));
  assert.equal(formatRange({ audit: { buffedMin: 100.9, buffedMax: 200.9 } }), "100–200");
});

test("Personal DK DPM uses floored Echo attack without changing legacy baseline", () => {
  const gear = { cleanWa: 212, stats: { mw20: { str: 1338, dex: 97 } } };
  const legacy = evaluateDarkKnight({ gear, targetCount: 1, options: { echo: true } });
  const game = evaluateDarkKnight({ gear, targetCount: 1, options: { echo: true, gameRounding: true } });
  assert.equal(game.audit.calculationWa, Math.floor(game.audit.preEchoWa * 1.04));
  assert.ok(Number.isInteger(game.audit.buffedMax));
  assert.notEqual(game.dpm, legacy.dpm);
});
