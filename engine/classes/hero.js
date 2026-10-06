import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "hero";

const DEFAULT_PARAMS = Object.freeze({
  brandishSkillPct: 2.6,
  advancedComboAttackMultiplier: 1.9,
  lines: 2,
  seCritRate: 0.15,
  seSkillAdd: 1.4,
  cycleSeconds: 0.63,
  enrageAverageWa: 17.333333333333332
});

/**
 * Evaluate the canonical v9.4.2 Hero Brandish model.
 *
 * `ctx.gear` is one stage from data/gear.json. It must contain `cleanWa` and
 * `stats.mw20.str/dex`; no reference range anchor is accepted as an input.
 * Buff values may be overridden for later interactive switches, while the
 * default stack is the authoritative Rage + average Enrage + SE stack.
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
  const rageEnabled = resolveToggle(options, buffs, "rage", true);
  const enrageEnabled = resolveToggle(options, buffs, "enrage", true);
  const seEnabled = resolveToggle(options, buffs, "se", true);
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const rageWa = rageEnabled
    ? finiteNonNegative(buffs.rageWa ?? 12, "rageWa")
    : 0;
  const enrageAverageWa = enrageEnabled
    ? finiteNonNegative(buffs.enrageAverageWa ?? params.enrageAverageWa, "enrageAverageWa")
    : 0;
  const echoMultiplier = echoEnabled
    ? finitePositive(buffs.echoMultiplier ?? 1.04, "echoMultiplier")
    : 1;

  const preEchoWa = cleanWa + potionWa + rageWa + enrageAverageWa;

  // Historical fixtures remain reproducible only through their archived profile.
  const legacyNormalization = ctx.skillData?._modelVersion === "v9.4.2";
  const calculationWa = legacyNormalization ? preEchoWa
    : options.gameRounding ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const range = calculateRange({
    classId,
    rangeModelId: "warrior-2h-sword",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true
  });
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: ctx.wdef ?? 0
  });

  const normalLineCoefficient = params.brandishSkillPct * params.advancedComboAttackMultiplier;
  const criticalLineCoefficient = normalLineCoefficient + params.seSkillAdd;
  const cap = ctx.cap ?? DEFAULT_LINE_CAP;
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: normalLineCoefficient,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: criticalLineCoefficient,
    cap
  });
  const expectedLineDamage = seEnabled
    ? (1 - params.seCritRate) * normalExpected + params.seCritRate * criticalExpected
    : normalExpected;
  const dpmM = expectedLineDamage
    * params.lines
    * effectiveTargetCount
    * 60
    / params.cycleSeconds
    / 1_000_000;

  return {
    classId,
    dpm: dpmM,
    selector: "brandish",
    audit: {
      cleanWa,
      potionWa,
      buffAdditiveWa: rageWa + enrageAverageWa,
      wdef: defendedRange.wdef,
      defenseStatus: defendedRange.status,
      preEchoWa,
      echoMultiplier,
      echoApplied: echoEnabled && !legacyNormalization,
      calculationWa,
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      selectedSkill: "brandish",
      capState: {
        normal: capState(defendedRange, normalLineCoefficient, cap),
        critical: capState(defendedRange, criticalLineCoefficient, cap)
      },
      targetCount,
      effectiveTargetCount,
      finalDpmM: dpmM,
      formulaVersion: legacyNormalization
        ? "hero-brandish-v9.4.2"
        : "hero-brandish-v9.5.0-wdef-v0.1"
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
  if (!stats) throw new Error("Hero range requires actual MW20 stats.");
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
  finitePositive(params.brandishSkillPct, "brandishSkillPct");
  finitePositive(params.advancedComboAttackMultiplier, "advancedComboAttackMultiplier");
  finitePositive(params.lines, "lines");
  finiteNonNegative(params.seCritRate, "seCritRate");
  finiteNonNegative(params.seSkillAdd, "seSkillAdd");
  finitePositive(params.cycleSeconds, "cycleSeconds");
  finiteNonNegative(params.enrageAverageWa, "enrageAverageWa");
  if (params.seCritRate > 1) throw new RangeError("seCritRate must not exceed 1.");
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
