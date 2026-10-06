import { DEFAULT_LINE_CAP, cappedUniformExpectation } from "./caps.js";

export { DEFAULT_LINE_CAP, cappedUniformExpectation } from "./caps.js";

/**
 * Range engine contract.
 *
 * Range anchors from the reference workbook are never calculation inputs.
 * Each class engine supplies an explicit weapon/range model and actual MW20
 * stats plus clean or buffed WA.
 */
export function calculateRange({ classId, mw20Stats, wa, rangeModelId, modelParams = {}, roundDown = false } = {}) {
  if (!mw20Stats || wa == null) throw new Error("Range requires actual MW20 stats and WA.");
  if (!rangeModelId) throw new Error("Range requires an explicit range model.");

  const model = RANGE_MODELS[rangeModelId];
  if (!model) throw new Error(`Unknown range model: ${rangeModelId}.`);

  const stats = normalizeStats(mw20Stats);
  const normalizedWa = nonNegativeFinite(wa, "wa");
  const result = model.calculate({ ...stats, ...modelParams, wa: normalizedWa });

  return {
    classId,
    modelId: rangeModelId,
    min: roundDown ? Math.floor(result.min) : result.min,
    max: roundDown ? Math.floor(result.max) : result.max,
    average: ((roundDown ? Math.floor(result.min) : result.min)
      + (roundDown ? Math.floor(result.max) : result.max)) / 2,
    stats,
    wa: normalizedWa
  };
}

/**
 * The shared two-handed sword and normal-spear models used by the
 * authoritative Hero/Paladin/DK stat fixtures. Warrior blunt/axe models are
 * intentionally not aliased here; they need their own verified formula before
 * they can be enabled.
 */
const RANGE_MODELS = Object.freeze({
  "warrior-2h-sword": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (4.6 * requiredStat(str, "mw20Stats.str") * 0.6 * 0.9
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100,
      max: (4.6 * requiredStat(str, "mw20Stats.str")
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100
    })
  }),
  "warrior-spear": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (3.6 * requiredStat(str, "mw20Stats.str")
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100,
      max: (5 * requiredStat(str, "mw20Stats.str")
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100
    })
  }),
  "pirate-gun": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (3.6 * requiredStat(dex, "mw20Stats.dex") * 0.6 * 0.9
        + requiredStat(str, "mw20Stats.str")) * wa / 100,
      max: (3.6 * requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100
    })
  }),
  "pirate-knuckle": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (4.8 * requiredStat(str, "mw20Stats.str") * 0.6 * 0.9
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100,
      max: (4.8 * requiredStat(str, "mw20Stats.str")
        + requiredStat(dex, "mw20Stats.dex")) * wa / 100
    })
  }),
  "bow": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (2.754 * requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100,
      max: (3.4 * requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100
    })
  }),
  "marksman-crossbow": Object.freeze({
    calculate: ({ str, dex, wa }) => ({
      min: (3.24 * requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100,
      max: (3.6 * requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100
    })
  }),
  "thief-claw": Object.freeze({
    calculate: ({ luk, dex, str, wa, minLukFactor = 1.944, maxLukFactor = 3.6 }) => ({
      min: (minLukFactor * requiredStat(luk, "mw20Stats.luk")
        + requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100,
      max: (maxLukFactor * requiredStat(luk, "mw20Stats.luk")
        + requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100
    })
  }),
  "thief-dagger": Object.freeze({
    calculate: ({ luk, dex, str, wa, minLukFactor = 1.944, maxLukFactor = 3.6 }) => ({
      min: (minLukFactor * requiredStat(luk, "mw20Stats.luk")
        + requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100,
      max: (maxLukFactor * requiredStat(luk, "mw20Stats.luk")
        + requiredStat(dex, "mw20Stats.dex")
        + requiredStat(str, "mw20Stats.str")) * wa / 100
    })
  })
});

function normalizeStats(stats) {
  if (!stats || typeof stats !== "object") {
    throw new Error("Range requires actual MW20 stats.");
  }
  return {
    str: optionalNonNegative(stats.str, "mw20Stats.str"),
    dex: optionalNonNegative(stats.dex, "mw20Stats.dex"),
    luk: optionalNonNegative(stats.luk, "mw20Stats.luk")
  };
}

function requiredStat(value, name) {
  if (value === undefined) throw new TypeError(`${name} must be a finite number.`);
  return value;
}

function optionalNonNegative(value, name) {
  if (value === undefined || value === null) return undefined;
  return nonNegativeFinite(value, name);
}

function nonNegativeFinite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  if (value < 0) throw new RangeError(`${name} must be non-negative.`);
  return value;
}
