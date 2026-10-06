import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "marksman";

const DEFAULT_PARAMS = Object.freeze({
  strafeNormalPct: 1.25,
  criticalBaseRate: 0.4,
  seCritRateAdd: 0.15,
  criticalBaseAdd: 1,
  seSkillAdd: 1.4,
  frostpreyBaseFactor: 2.125,
  frostpreySkillPct: 6,
  frostpreyAttacksPerMinute: 14.285714285714286,
  snipeDamage: 199999,
  snipeCycleSeconds: 5.04,
  snipeStrafeCount: 7,
  pureStrafeCycleSeconds: 0.6,
  paCycleSeconds: 1.75,
  paTheoreticalCycleSeconds: 1.2,
  paNormalPct: 8.5,
  paCriticalPct: 10.9,
  paSuccessiveTargetMultiplier: 1.2
});

/**
 * Evaluate the canonical Marksman branches.
 *
 * Snipe+7 Strafe is the 1–3T baseline; PA uses the measured 1.75s cycle
 * at 4–6T. Retired timings are available only with archived v9.4.2 input.
 */
export function evaluate(ctx = {}) {
  const context = ctx ?? {};
  const gear = context.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? context.mw20Stats;
  const cleanWa = finiteNonNegative(gear.cleanWa ?? context.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
  if (context.skillData?._modelVersion !== "v9.4.2" && context.options?.paCycleModel !== undefined) {
    throw new Error("Retired paCycleModel input is not supported; use PA 1.75 empirical.");
  }
  const params = mergeParams(context.skillData);
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
    rangeModelId: "marksman-crossbow",
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
  const requestedSelector = options.selector ?? context.selector;
  const selectedSkill = resolveSkill(targetCount, requestedSelector, context.skillData);
  const skillResult = selectedSkill === "snipe-plus-7-strafe"
    ? evaluateSnipeStrafe({ defendedRange, params, seEnabled, cap })
    : selectedSkill === "pure-strafe"
      ? evaluatePureStrafe({ defendedRange, params, seEnabled, cap })
      : evaluatePiercingArrow({ defendedRange, params, seEnabled, targetCount, cap, options });
  const frostprey = evaluateFrostprey({
    stats,
    targetCount,
    params,
    include: options.includeFrostprey ?? true,
    wdef: defendedRange.wdef
  });
  const dpmM = skillResult.dpmM + frostprey.dpmM;

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
      frostpreyDpmM: frostprey.dpmM,
      summonDefense: {
        status: frostprey.defense.status,
        min: frostprey.defense.min,
        max: frostprey.defense.max,
        treatment: "generic WDEF range; exact summon mechanics VERIFY"
      },
      defense: {
        order: "after-element-before-skill",
        fixedDamage: { snipe: "immune" },
        summon: "generic WDEF range; exact summon mechanics VERIFY"
      },
      capState: skillResult.capState,
      targetCount,
      effectiveTargetCount: skillResult.effectiveTargetCount,
      finalDpmM: dpmM,
      formulaVersion: context.skillData?._modelVersion === "v9.4.2"
        ? "marksman-v9.4.2"
        : "marksman-v9.5.0-wdef-v0.1"
    }
  };
}

function resolveSkill(targetCount, requestedSelector, skillData) {
  const legacy = skillData?._modelVersion === "v9.4.2";
  if (requestedSelector) {
    const allowed = ["snipe-plus-7-strafe", "pure-strafe", ...(legacy ? ["pa-1.40", "pa-1.20"] : ["pa-1.75"])];
    if (!allowed.includes(requestedSelector)) {
      throw new Error(`Unknown Marksman selector: ${requestedSelector}.`);
    }
    if (requestedSelector === "pure-strafe" && targetCount > 2) {
      throw new Error("Pure Strafe is only available for 1–2 targets.");
    }
    if (requestedSelector === "snipe-plus-7-strafe" && targetCount > (legacy ? 2 : 3)) {
      throw new Error("Snipe+7 Strafe exceeds the supported target range.");
    }
    if (requestedSelector.startsWith("pa-") && targetCount < 3) {
      throw new Error("Piercing Arrow is only available for 3–6 targets.");
    }
    return requestedSelector;
  }

  const singleTargetPolicy = targetCount <= (legacy ? 2 : 3);
  const key = legacy ? (singleTargetPolicy ? "1-2" : "3-6") : (singleTargetPolicy ? "1-3" : "4-6");
  return skillData?.selectors?.[key]?.branch
    ?? (singleTargetPolicy ? "snipe-plus-7-strafe" : legacy ? "pa-1.40" : "pa-1.75");
}

function evaluateSnipeStrafe({ defendedRange, params, seEnabled, cap }) {
  const strafe = expectedStrafeCast({ defendedRange, params, seEnabled, cap });
  return {
    dpmM: (params.snipeDamage + params.snipeStrafeCount * strafe.expectedCast)
      * 60 / params.snipeCycleSeconds / 1_000_000,
    effectiveTargetCount: 1,
    capState: {
      snipe: "fixed-cap",
      strafe: strafe.capState
    }
  };
}

function evaluatePureStrafe({ defendedRange, params, seEnabled, cap }) {
  const strafe = expectedStrafeCast({ defendedRange, params, seEnabled, cap });
  return {
    dpmM: strafe.expectedCast * 60 / params.pureStrafeCycleSeconds / 1_000_000,
    effectiveTargetCount: 1,
    capState: strafe.capState
  };
}

function evaluatePiercingArrow({ defendedRange, params, seEnabled, targetCount, cap, options }) {
  const theoretical = options.paCycleModel === "1.20"
    || options.selector === "pa-1.20";
  const cycleSeconds = theoretical ? params.paTheoreticalCycleSeconds : params.paCycleSeconds;
  const normalFirstTarget = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: params.paNormalPct,
    cap
  });
  const criticalFirstTarget = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: params.paCriticalPct - (seEnabled ? 0 : params.seSkillAdd),
    cap
  });
  const critRate = params.criticalBaseRate + (seEnabled ? params.seCritRateAdd : 0);
  const firstTarget = (1 - critRate) * normalFirstTarget + critRate * criticalFirstTarget;
  let aggregate = 0;
  for (let index = 0; index < targetCount; index += 1) {
    aggregate += firstTarget * params.paSuccessiveTargetMultiplier ** index;
  }
  return {
    dpmM: aggregate * 60 / cycleSeconds / 1_000_000,
    effectiveTargetCount: targetCount,
    capState: {
      firstTargetNormal: capState(defendedRange, params.paNormalPct, cap),
      firstTargetCritical: capState(defendedRange, params.paCriticalPct, cap),
      successiveTargets: "after-modifier-no-recap"
    }
  };
}

function expectedStrafeCast({ defendedRange, params, seEnabled, cap }) {
  const critRate = params.criticalBaseRate + (seEnabled ? params.seCritRateAdd : 0);
  const criticalCoefficient = params.strafeNormalPct
    + params.criticalBaseAdd
    + (seEnabled ? params.seSkillAdd : 0);
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: params.strafeNormalPct,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: criticalCoefficient,
    cap
  });
  return {
    expectedCast: ((1 - critRate) * normalExpected + critRate * criticalExpected) * 4,
    capState: {
      normal: capState(defendedRange, params.strafeNormalPct, cap),
      critical: capState(defendedRange, criticalCoefficient, cap)
    }
  };
}

function evaluateFrostprey({ stats, targetCount, params, include, wdef }) {
  if (!include) {
    return {
      dpmM: 0,
      defense: applyDefense({ min: 0, max: 0, wdef })
    };
  }
  const effectiveTargetCount = Math.min(targetCount, 4);
  const baseDamage = params.frostpreyBaseFactor * stats.dex + stats.str;
  const defense = applyDefense({
    min: baseDamage,
    max: baseDamage,
    wdef
  });
  const damagePerHit = ((defense.min + defense.max) / 2)
    * params.frostpreySkillPct;
  return {
    dpmM: damagePerHit
      * params.frostpreyAttacksPerMinute
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
  if (!stats) throw new Error("Marksman range requires actual MW20 stats.");
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

function mergeParams(skillData = {}) {
  const params = skillData.params ?? {};
  const snipe = skillData.branches?.["snipe-plus-7-strafe"]?.params ?? {};
  const legacy = skillData._modelVersion === "v9.4.2";
  const pa = skillData.branches?.[legacy ? "pa-1.40" : "pa-1.75"]?.params ?? {};
  const paTheo = skillData.branches?.["pa-1.20"]?.params ?? {};
  return {
    ...DEFAULT_PARAMS,
    ...params,
    snipeDamage: snipe.snipeDamage ?? DEFAULT_PARAMS.snipeDamage,
    snipeCycleSeconds: snipe.cycleSeconds ?? DEFAULT_PARAMS.snipeCycleSeconds,
    snipeStrafeCount: (snipe.rotationActions ?? 8) - 1,
    paCycleSeconds: pa.cycleSeconds ?? DEFAULT_PARAMS.paCycleSeconds,
    paTheoreticalCycleSeconds: paTheo.cycleSeconds ?? DEFAULT_PARAMS.paTheoreticalCycleSeconds,
    paSuccessiveTargetMultiplier: pa.successiveTargetMultiplier
      ?? DEFAULT_PARAMS.paSuccessiveTargetMultiplier
  };
}

function validateParams(params) {
  for (const name of [
    "strafeNormalPct", "criticalBaseRate", "seCritRateAdd", "criticalBaseAdd",
    "seSkillAdd", "frostpreyBaseFactor", "frostpreySkillPct",
    "frostpreyAttacksPerMinute", "snipeDamage", "snipeCycleSeconds",
    "snipeStrafeCount", "pureStrafeCycleSeconds", "paCycleSeconds",
    "paTheoreticalCycleSeconds", "paNormalPct", "paCriticalPct",
    "paSuccessiveTargetMultiplier"
  ]) finitePositive(params[name], name);
  if (params.criticalBaseRate + params.seCritRateAdd > 1) {
    throw new RangeError("Marksman critical chance must not exceed 1.");
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
