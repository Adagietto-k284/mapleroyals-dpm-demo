import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "night-lord";

const DEFAULT_PARAMS = Object.freeze({
  ttBaseLukFactor: 3.75,
  ttSkillPct: 1.5,
  avengerSkillPct: 2,
  criticalThrowRate: 0.5,
  seCritRate: 0.15,
  criticalThrowAdd: 1,
  seSkillAdd: 1.4,
  ttShadowPartnerLines: 4.5,
  avengerShadowPartnerMultiplier: 1.5,
  ttCycleSeconds: 0.6,
  avengerCycleSeconds: 0.63,
  clawMinLukFactor: 1.944,
  clawMaxLukFactor: 3.6
});

/**
 * Evaluate the recovered Night Lord TT+SP / Avenger model.
 *
 * The canonical selector keeps Triple Throw for 1–3 targets and uses Avenger
 * for 4–6 targets. The latter branch uses the general claw range; it is not
 * substituted with the separate LUK-only Triple Throw base identity.
 */
export function evaluate(ctx) {
  const context = ctx ?? {};
  const gear = context.gear ?? {};
  const mw20 = gear.stats?.mw20 ?? context.mw20Stats;
  const aux = gear.stats?.aux ?? {};
  const stats = normalizeStats(mw20, aux.strSubtotal ?? context.strSubtotal);
  const cleanWa = finiteNonNegative(gear.cleanWa ?? context.cleanWa, "cleanWa");
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
    rangeModelId: "thief-claw",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true,
    modelParams: {
      minLukFactor: params.clawMinLukFactor,
      maxLukFactor: params.clawMaxLukFactor
    }
  });
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: context.wdef ?? 0
  });
  const cap = context.cap ?? DEFAULT_LINE_CAP;

  const selectedSkill = targetCount <= 3 ? "tt-sp" : "avenger";
  const ttBaseDamage = params.ttBaseLukFactor * stats.luk * calculationWa / 100;
  const ttRange = applyDefense({
    min: ttBaseDamage,
    max: ttBaseDamage,
    wdef: context.wdef ?? 0
  });
  const skillResult = selectedSkill === "tt-sp"
    ? evaluateTripleThrow({ defendedRange: ttRange, params, seEnabled, cap })
    : evaluateAvenger({ defendedRange, params, seEnabled, targetCount, cap });
  const dpmM = skillResult.expectedPerTarget
    * skillResult.effectiveTargetCount
    * 60
    / skillResult.cycleSeconds
    / 1_000_000;

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
      buffedMin: skillResult.range.min,
      buffedMax: skillResult.range.max,
      selectedSkill,
      seEnabled,
      capState: skillResult.capState,
      targetCount,
      effectiveTargetCount: skillResult.effectiveTargetCount,
      finalDpmM: dpmM,
      formulaVersion: context.skillData?._modelVersion === "v9.4.2"
        ? "night-lord-tt-sp-avenger-v9.4.2"
        : "night-lord-tt-sp-avenger-v9.5.0-wdef-v0.1"
    }
  };
}

function evaluateTripleThrow({ defendedRange, params, seEnabled, cap }) {
  const critRate = params.criticalThrowRate + (seEnabled ? params.seCritRate : 0);
  const criticalCoefficient = params.ttSkillPct
    + params.criticalThrowAdd
    + (seEnabled ? params.seSkillAdd : 0);
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: params.ttSkillPct,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: criticalCoefficient,
    cap
  });
  const expectedLine = (1 - critRate) * normalExpected + critRate * criticalExpected;
  return {
    expectedPerTarget: expectedLine * params.ttShadowPartnerLines,
    effectiveTargetCount: 1,
    cycleSeconds: params.ttCycleSeconds,
    range: defendedRange,
    capState: {
      normal: capState(defendedRange, params.ttSkillPct, cap),
      critical: capState(defendedRange, criticalCoefficient, cap)
    }
  };
}

function evaluateAvenger({ defendedRange, params, seEnabled, targetCount, cap }) {
  const critRate = params.criticalThrowRate + (seEnabled ? params.seCritRate : 0);
  const criticalCoefficient = params.avengerSkillPct
    + params.criticalThrowAdd
    + (seEnabled ? params.seSkillAdd : 0);
  const normalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: params.avengerSkillPct,
    cap
  });
  const criticalExpected = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: criticalCoefficient,
    cap
  });
  const expectedMainProjectile = (1 - critRate) * normalExpected + critRate * criticalExpected;
  return {
    expectedPerTarget: expectedMainProjectile * params.avengerShadowPartnerMultiplier,
    effectiveTargetCount: targetCount,
    cycleSeconds: params.avengerCycleSeconds,
    range: defendedRange,
    capState: {
      normal: capState(defendedRange, params.avengerSkillPct, cap),
      critical: capState(defendedRange, criticalCoefficient, cap)
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

function normalizeStats(stats, fallbackStr) {
  if (!stats) throw new Error("Night Lord range requires actual MW20 stats.");
  return {
    luk: finiteNonNegative(stats.luk, "mw20Stats.luk"),
    dex: finiteNonNegative(stats.dex, "mw20Stats.dex"),
    str: finiteNonNegative(stats.str ?? fallbackStr, "mw20Stats.str or stats.aux.strSubtotal")
  };
}

function normalizeTargetCount(targetCount) {
  if (![1, 2, 3, 4, 6].includes(targetCount)) {
    throw new RangeError("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  return targetCount;
}

function validateParams(params) {
  finitePositive(params.ttBaseLukFactor, "ttBaseLukFactor");
  finitePositive(params.ttSkillPct, "ttSkillPct");
  finitePositive(params.avengerSkillPct, "avengerSkillPct");
  finiteNonNegative(params.criticalThrowRate, "criticalThrowRate");
  finiteNonNegative(params.seCritRate, "seCritRate");
  finiteNonNegative(params.criticalThrowAdd, "criticalThrowAdd");
  finiteNonNegative(params.seSkillAdd, "seSkillAdd");
  finitePositive(params.ttShadowPartnerLines, "ttShadowPartnerLines");
  finitePositive(params.avengerShadowPartnerMultiplier, "avengerShadowPartnerMultiplier");
  finitePositive(params.ttCycleSeconds, "ttCycleSeconds");
  finitePositive(params.avengerCycleSeconds, "avengerCycleSeconds");
  finitePositive(params.clawMinLukFactor, "clawMinLukFactor");
  finitePositive(params.clawMaxLukFactor, "clawMaxLukFactor");
  if (params.criticalThrowRate + params.seCritRate > 1) {
    throw new RangeError("Night Lord critical chance must not exceed 1.");
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
