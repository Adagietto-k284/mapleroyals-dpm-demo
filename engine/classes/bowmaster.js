import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "bowmaster";

const DEFAULT_PARAMS = Object.freeze({
  hurricaneNormalPct: 1,
  arrowRainNormalPct: 1.6,
  criticalBaseRate: 0.4,
  seCritRateAdd: 0.15,
  criticalBaseAdd: 1,
  seSkillAdd: 1.4,
  hurricaneArrowsPerMinute: 500,
  arrowRainArrowsPerMinute: 100,
  phoenixBaseFactor: 2.125,
  phoenixSkillPct: 5.5,
  phoenixAttacksPerMinute: 15
});

/**
 * Evaluate the canonical Bowmaster Hurricane / Arrow Rain model.
 *
 * Hurricane is used at 1–3 targets and Arrow Rain at 4–6 targets. Phoenix is
 * retained only as the small fixed passive term present in the authoritative
 * master fixture (up to four targets); it is not a separate selector branch.
 */
export function evaluate(ctx = {}) {
  const context = ctx ?? {};
  const gear = context.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? context.mw20Stats;
  const cleanWa = finiteNonNegative(gear.cleanWa ?? context.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
  const params = {
    ...DEFAULT_PARAMS,
    ...(context.skillData?.params ?? context.skillData?.canonical?.params ?? {})
  };
  validateParams(params);

  const targetCount = normalizeTargetCount(
    context.targetCount ?? context.options?.targetCount ?? 1
  );
  const buffs = context.buffs ?? {};
  const options = context.options ?? {};
  const potionWa = finiteNonNegative(
    context.potionWa ?? buffs.potionWa ?? 0,
    "potionWa"
  );
  const rageEnabled = resolveToggle(options, buffs, "rage", true);
  const seEnabled = resolveToggle(options, buffs, "se", true);
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const rageWa = rageEnabled
    ? finiteNonNegative(buffs.rageWa ?? 12, "rageWa")
    : 0;
  const echoMultiplier = echoEnabled
    ? finitePositive(buffs.echoMultiplier ?? 1.04, "echoMultiplier")
    : 1;

  const preEchoWa = cleanWa + potionWa + rageWa;
  const calculationWa = options.gameRounding
    ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const range = calculateRange({
    classId,
    rangeModelId: "bow",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true
  });
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: context.wdef ?? 0
  });
  const cap = context.cap ?? DEFAULT_LINE_CAP;
  const selectedSkill = targetCount <= 3 ? "hurricane" : "arrow-rain";
  const selected = selectedSkill === "hurricane"
    ? evaluateHurricane({ defendedRange, params, seEnabled, cap })
    : evaluateArrowRain({ defendedRange, params, seEnabled, targetCount, cap });
  const phoenix = evaluatePhoenix({
    stats,
    targetCount,
    params,
    wdef: defendedRange.wdef
  });
  const dpmM = selected.dpmM + phoenix.dpmM;

  return {
    classId,
    dpm: dpmM,
    selector: selectedSkill,
    audit: {
      cleanWa,
      potionWa,
      buffAdditiveWa: rageWa,
      wdef: defendedRange.wdef,
      defenseStatus: defendedRange.status,
      preEchoWa,
      echoMultiplier,
      echoApplied: echoEnabled,
      calculationWa,
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      selectedSkill,
      seEnabled,
      phoenixDpmM: phoenix.dpmM,
      summonDefense: {
        status: phoenix.defense.status,
        min: phoenix.defense.min,
        max: phoenix.defense.max,
        treatment: "generic WDEF range; exact summon mechanics VERIFY"
      },
      defense: {
        order: "after-element-before-skill",
        summon: "generic WDEF range; exact summon mechanics VERIFY"
      },
      capState: selected.capState,
      targetCount,
      effectiveTargetCount: selected.effectiveTargetCount,
      finalDpmM: dpmM,
      formulaVersion: context.skillData?._modelVersion === "v9.4.2"
        ? "bowmaster-hurricane-arrow-rain-v9.4.2"
        : "bowmaster-hurricane-arrow-rain-v9.5.0-wdef-v0.1"
    }
  };
}

function evaluateHurricane({ defendedRange, params, seEnabled, cap }) {
  const expectedArrow = expectedArrowDamage({
    defendedRange,
    skillPct: params.hurricaneNormalPct,
    seEnabled,
    params,
    cap
  });
  return {
    dpmM: expectedArrow * params.hurricaneArrowsPerMinute / 1_000_000,
    effectiveTargetCount: 1,
    capState: {
      normal: capState(defendedRange, params.hurricaneNormalPct, cap),
      critical: capState(
        defendedRange,
        params.hurricaneNormalPct + params.criticalBaseAdd
          + (seEnabled ? params.seSkillAdd : 0),
        cap
      )
    }
  };
}

function evaluateArrowRain({ defendedRange, params, seEnabled, targetCount, cap }) {
  const expectedArrow = expectedArrowDamage({
    defendedRange,
    skillPct: params.arrowRainNormalPct,
    seEnabled,
    params,
    cap
  });
  return {
    dpmM: expectedArrow * targetCount * params.arrowRainArrowsPerMinute / 1_000_000,
    effectiveTargetCount: targetCount,
    capState: {
      normal: capState(defendedRange, params.arrowRainNormalPct, cap),
      critical: capState(
        defendedRange,
        params.arrowRainNormalPct + params.criticalBaseAdd
          + (seEnabled ? params.seSkillAdd : 0),
        cap
      )
    }
  };
}

function expectedArrowDamage({ defendedRange, skillPct, seEnabled, params, cap }) {
  const critRate = params.criticalBaseRate + (seEnabled ? params.seCritRateAdd : 0);
  const criticalCoefficient = skillPct
    + params.criticalBaseAdd
    + (seEnabled ? params.seSkillAdd : 0);
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: skillPct,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: criticalCoefficient,
    cap
  });
  return (1 - critRate) * normalExpected + critRate * criticalExpected;
}

function evaluatePhoenix({ stats, targetCount, params, wdef }) {
  const effectiveTargetCount = Math.min(targetCount, 4);
  const baseDamage = params.phoenixBaseFactor * stats.dex + stats.str;
  const defense = applyDefense({
    min: baseDamage,
    max: baseDamage,
    wdef
  });
  const damagePerHit = ((defense.min + defense.max) / 2)
    * params.phoenixSkillPct;
  return {
    dpmM: damagePerHit
      * params.phoenixAttacksPerMinute
      * effectiveTargetCount
      / 1_000_000,
    defense
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
  if (!stats) throw new Error("Bowmaster range requires actual MW20 stats.");
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
  finitePositive(params.hurricaneNormalPct, "hurricaneNormalPct");
  finitePositive(params.arrowRainNormalPct, "arrowRainNormalPct");
  finiteNonNegative(params.criticalBaseRate, "criticalBaseRate");
  finiteNonNegative(params.seCritRateAdd, "seCritRateAdd");
  finiteNonNegative(params.criticalBaseAdd, "criticalBaseAdd");
  finiteNonNegative(params.seSkillAdd, "seSkillAdd");
  finitePositive(params.hurricaneArrowsPerMinute, "hurricaneArrowsPerMinute");
  finitePositive(params.arrowRainArrowsPerMinute, "arrowRainArrowsPerMinute");
  finitePositive(params.phoenixBaseFactor, "phoenixBaseFactor");
  finitePositive(params.phoenixSkillPct, "phoenixSkillPct");
  finitePositive(params.phoenixAttacksPerMinute, "phoenixAttacksPerMinute");
  if (params.criticalBaseRate + params.seCritRateAdd > 1) {
    throw new RangeError("Bowmaster critical chance must not exceed 1.");
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
