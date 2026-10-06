import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "paladin";

const DEFAULT_PARAMS = Object.freeze({
  blastSkill: 5.8,
  blastCycleSeconds: 0.63,
  acbSkill: 3.5,
  acbCycleSeconds: 0.6,
  seCritRate: 0.15,
  seSkillAdd: 1.4,
  elementMultipliers: {
    neutral: 1.4,
    "general-weak": 1.95,
    "holy-weak": 2.1
  }
});

/**
 * Evaluate the canonical Paladin 2H sword model.
 *
 * Elemental charge/weakness is applied before defense, then each skill line is
 * evaluated through the shared cap-aware uniform expectation. General Weak is
 * the canonical condition; Neutral and Holy Weak remain selectable branches.
 */
export function evaluate(ctx = {}) {
  const gear = ctx.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? ctx.mw20Stats;
  const cleanWa = finiteNonNegative(gear.cleanWa ?? ctx.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
  const params = mergeParams(ctx.skillData?.params ?? ctx.skillData?.canonical?.params);
  validateParams(params);

  const targetCount = normalizeTargetCount(ctx.targetCount ?? ctx.options?.targetCount ?? 1);
  const buffs = ctx.buffs ?? {};
  const options = ctx.options ?? {};
  const potionWa = finiteNonNegative(ctx.potionWa ?? buffs.potionWa ?? 0, "potionWa");
  const rageEnabled = resolveToggle(options, buffs, "rage", true);
  const rageWa = rageEnabled
    ? finiteNonNegative(buffs.rageWa ?? 12, "rageWa")
    : 0;
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const echoMultiplier = echoEnabled
    ? finitePositive(buffs.echoMultiplier ?? 1.04, "echoMultiplier")
    : 1;
  const seEnabled = resolveToggle(options, buffs, "se", true);
  const condition = options.condition ?? ctx.condition ?? "general-weak";
  const elementMultiplier = params.elementMultipliers[condition];
  if (elementMultiplier == null) {
    throw new Error(`Unknown Paladin condition: ${condition}.`);
  }

  const buffAdditiveWa = rageWa;
  const preEchoWa = cleanWa + potionWa + buffAdditiveWa;
  const calculationWa = options.gameRounding
    ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const baseRange = calculateRange({
    classId,
    rangeModelId: "warrior-2h-sword",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true
  });
  const elementRange = {
    min: baseRange.min * elementMultiplier,
    max: baseRange.max * elementMultiplier
  };
  const defendedRange = applyDefense({
    min: elementRange.min,
    max: elementRange.max,
    wdef: ctx.wdef ?? 0
  });

  const cap = ctx.cap ?? DEFAULT_LINE_CAP;
  const isBlast = targetCount === 1;
  const skillCoefficient = isBlast ? params.blastSkill : params.acbSkill;
  const cycleSeconds = isBlast ? params.blastCycleSeconds : params.acbCycleSeconds;
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: skillCoefficient,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: skillCoefficient + (seEnabled ? params.seSkillAdd : 0),
    cap
  });
  const expectedPerTarget = seEnabled
    ? (1 - params.seCritRate) * normalExpected + params.seCritRate * criticalExpected
    : normalExpected;
  const dpmM = expectedPerTarget
    * (isBlast ? 1 : targetCount)
    * 60
    / cycleSeconds
    / 1_000_000;

  return {
    classId,
    dpm: dpmM,
    selector: isBlast ? "blast" : "acb",
    audit: {
      cleanWa,
      potionWa,
      buffAdditiveWa,
      wdef: defendedRange.wdef,
      defenseStatus: defendedRange.status,
      preEchoWa,
      echoMultiplier,
      echoApplied: echoEnabled,
      calculationWa,
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      condition,
      elementMultiplier,
      selectedSkill: isBlast ? "blast" : "acb",
      seEnabled,
      capState: {
        normal: capState(defendedRange, skillCoefficient, cap),
        critical: capState(
          defendedRange,
          skillCoefficient + (seEnabled ? params.seSkillAdd : 0),
          cap
        )
      },
      targetCount,
      effectiveTargetCount: isBlast ? 1 : targetCount,
      finalDpmM: dpmM,
      formulaVersion: ctx.skillData?._modelVersion === "v9.4.2"
        ? "paladin-2h-sword-v9.4.2"
        : "paladin-2h-sword-v9.5.0-wdef-v0.1"
    }
  };
}

function mergeParams(source = {}) {
  return {
    ...DEFAULT_PARAMS,
    ...source,
    elementMultipliers: {
      ...DEFAULT_PARAMS.elementMultipliers,
      ...(source.elementMultipliers ?? {})
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
  if (!stats) throw new Error("Paladin range requires actual MW20 stats.");
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
  finitePositive(params.blastSkill, "blastSkill");
  finitePositive(params.blastCycleSeconds, "blastCycleSeconds");
  finitePositive(params.acbSkill, "acbSkill");
  finitePositive(params.acbCycleSeconds, "acbCycleSeconds");
  finiteNonNegative(params.seCritRate, "seCritRate");
  finiteNonNegative(params.seSkillAdd, "seSkillAdd");
  if (params.seCritRate > 1) throw new RangeError("seCritRate must not exceed 1.");
  for (const condition of ["neutral", "general-weak", "holy-weak"]) {
    finitePositive(params.elementMultipliers[condition], `elementMultipliers.${condition}`);
  }
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
