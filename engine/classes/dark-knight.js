import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "dark-knight";

const DEFAULT_PARAMS = Object.freeze({
  skillPct: 1.7,
  lines: 3,
  seAverageLineCoefficient: 1.91,
  cycleSeconds: 0.81,
  berserkMultiplier: 2.1
});

/**
 * Evaluate the canonical v9.4.2 Dark Knight Spear Crusher model.
 *
 * The 1.91 coefficient is the authoritative SE-on expected coefficient per
 * Crusher line and already includes the 170% Crusher skill multiplier.
 * Rage and Dragon Blood are mutually exclusive +12 WA sources.
 */
export function evaluate(ctx = {}) {
  const gear = ctx.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? ctx.mw20Stats;
  const cleanWa = finiteNonNegative(gear.cleanWa ?? ctx.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
  const params = {
    ...DEFAULT_PARAMS,
    ...(ctx.skillData?.canonical?.params ?? ctx.skillData?.params ?? {})
  };
  validateParams(params);

  const targetCount = normalizeTargetCount(ctx.targetCount ?? ctx.options?.targetCount ?? 1);
  const effectiveTargetCount = Math.min(targetCount, 3);
  const buffs = ctx.buffs ?? {};
  const options = ctx.options ?? {};
  const potionWa = finiteNonNegative(ctx.potionWa ?? buffs.potionWa ?? 0, "potionWa");

  const dragonBloodEnabled = resolveToggle(options, buffs, "dragonBlood", false);
  const rageDefault = !dragonBloodEnabled;
  const rageEnabled = resolveToggle(options, buffs, "rage", rageDefault);
  if (rageEnabled && dragonBloodEnabled) {
    throw new Error("Illegal buff stack: rage + dragonBlood");
  }

  const rageWa = rageEnabled
    ? finiteNonNegative(buffs.rageWa ?? 12, "rageWa")
    : 0;
  const dragonBloodWa = dragonBloodEnabled
    ? finiteNonNegative(buffs.dragonBloodWa ?? 12, "dragonBloodWa")
    : 0;
  const seEnabled = resolveToggle(options, buffs, "se", true);
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const echoMultiplier = echoEnabled
    ? finitePositive(buffs.echoMultiplier ?? 1.04, "echoMultiplier")
    : 1;

  const buffAdditiveWa = rageWa + dragonBloodWa;
  const preEchoWa = cleanWa + potionWa + buffAdditiveWa;

  // Historical fixtures remain reproducible only through their archived profile.
  const legacyNormalization = ctx.skillData?._modelVersion === "v9.4.2";
  const calculationWa = legacyNormalization ? preEchoWa
    : options.gameRounding ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const range = calculateRange({
    classId,
    rangeModelId: "warrior-spear",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true
  });
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: ctx.wdef ?? 0
  });

  const cap = ctx.cap ?? DEFAULT_LINE_CAP;
  const lineCoefficient = seEnabled
    ? params.seAverageLineCoefficient
    : params.skillPct;
  const expectedLineDamage = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: lineCoefficient,
    cap
  });
  const dpmM = expectedLineDamage
    * params.lines
    * params.berserkMultiplier
    * effectiveTargetCount
    * 60
    / params.cycleSeconds
    / 1_000_000;

  return {
    classId,
    dpm: dpmM,
    selector: "spear-crusher",
    audit: {
      cleanWa,
      potionWa,
      buffAdditiveWa,
      buffSource: dragonBloodEnabled ? "dragonBlood" : rageEnabled ? "rage" : "none",
      wdef: defendedRange.wdef,
      defenseStatus: defendedRange.status,
      preEchoWa,
      echoMultiplier,
      echoApplied: echoEnabled && !legacyNormalization,
      calculationWa,
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      selectedSkill: "spear-crusher",
      seEnabled,
      capState: capState(defendedRange, lineCoefficient, cap),
      targetCount,
      effectiveTargetCount,
      finalDpmM: dpmM,
      formulaVersion: legacyNormalization
        ? "dark-knight-spear-crusher-v9.4.2"
        : "dark-knight-spear-crusher-v9.5.0-wdef-v0.1"
    }
  };
}

function resolveToggle(options, buffs, name, defaultValue) {
  const value = options[`enable${name[0].toUpperCase()}${name.slice(1)}`]
    ?? buffs[`${name}Enabled`]
    ?? buffs[name];
  return value === undefined ? defaultValue : Boolean(value);
}

function capState(range, coefficient, cap) {
  const scaledMin = range.min * coefficient;
  const scaledMax = range.max * coefficient;
  if (scaledMax <= cap) return "uncapped";
  if (scaledMin >= cap) return "fully-capped";
  return "partially-capped";
}

function normalizeStats(stats) {
  if (!stats) throw new Error("Dark Knight range requires actual MW20 stats.");
  return {
    str: finiteNonNegative(stats.str, "mw20Stats.str"),
    dex: finiteNonNegative(stats.dex, "mw20Stats.dex")
  };
}

function normalizeTargetCount(targetCount) {
  if (![1, 2, 3, 4, 6].includes(targetCount)) {
    throw new RangeError("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  return targetCount;
}

function validateParams(params) {
  finitePositive(params.skillPct, "skillPct");
  finitePositive(params.lines, "lines");
  finitePositive(params.seAverageLineCoefficient, "seAverageLineCoefficient");
  finitePositive(params.cycleSeconds, "cycleSeconds");
  finitePositive(params.berserkMultiplier, "berserkMultiplier");
}

function finiteNonNegative(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  if (value < 0) throw new RangeError(`${name} must be non-negative.`);
  return value;
}

function finitePositive(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
  if (value <= 0) throw new RangeError(`${name} must be positive.`);
  return value;
}
import { applyEchoWa } from "../rounding.js";
