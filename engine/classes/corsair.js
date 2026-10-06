import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "corsair";

const DEFAULT_PARAMS = Object.freeze({
  cannonSkillPct: 3.8,
  cannonLines: 4,
  bullseyeMultiplier: 1.2,
  seCritRate: 0.15,
  seSkillAdd: 1.4,
  cannonCycleSeconds: 0.6,
  torpedoMarkedPctPerSecond: 13.29,
  torpedoSecondaryPctPerSecond: 11.21
});

/** Evaluate canonical Battleship Cannon / Torpedo with the current SI timing. */
export function evaluate(ctx = {}) {
  const gear = ctx.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? ctx.mw20Stats;
  const cleanWa = finiteNonNegative(gear.cleanWa ?? ctx.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
  const params = {
    ...DEFAULT_PARAMS,
    ...(ctx.skillData?.params ?? ctx.skillData?.canonical?.params ?? {})
  };
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

  const preEchoWa = cleanWa + potionWa + rageWa;
  const calculationWa = options.gameRounding
    ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const range = calculateRange({
    classId,
    rangeModelId: "pirate-gun",
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
  const isCannon = targetCount <= 2;
  const cannonNormalCoefficient = params.cannonSkillPct * params.bullseyeMultiplier;
  const cannonCriticalCoefficient = (params.cannonSkillPct + params.seSkillAdd)
    * params.bullseyeMultiplier;
  const cannonLineExpected = expectedCritWeighted({
    range: defendedRange,
    normalCoefficient: cannonNormalCoefficient,
    criticalCoefficient: cannonCriticalCoefficient,
    critRate: params.seCritRate,
    seEnabled,
    cap
  });
  const cannonDpmM = cannonLineExpected
    * params.cannonLines
    * 60
    / params.cannonCycleSeconds
    / 1_000_000;

  const torpedoCoefficients = [params.torpedoMarkedPctPerSecond]
    .concat(Array.from({ length: targetCount - 1 }, () => params.torpedoSecondaryPctPerSecond));
  // The authoritative Torpedo sheet defines these as aggregate %/s values
  // applied to the average base range. They are not independent line
  // coefficients, so applying Phi/cap to each term would not reproduce the
  // v9.4.2 fixture. Keep that source-specific behavior isolated here.
  const averageBase = (defendedRange.min + defendedRange.max) / 2;
  const torpedoExpected = averageBase * torpedoCoefficients
    .reduce((total, coefficient) => total + coefficient, 0);
  const torpedoDpmM = torpedoExpected * 60 / 1_000_000;
  const dpmM = isCannon ? cannonDpmM : torpedoDpmM;

  return {
    classId,
    dpm: dpmM,
    selector: isCannon ? "cannon" : "torpedo",
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
      selectedSkill: isCannon ? "cannon" : "torpedo",
      seEnabled,
      capState: isCannon
        ? {
            normal: capState(defendedRange, cannonNormalCoefficient, cap),
            critical: capState(defendedRange, cannonCriticalCoefficient, cap)
          }
        : "aggregate-average-source",
      targetCount,
      effectiveTargetCount: targetCount,
      finalDpmM: dpmM,
      formulaVersion: ctx.skillData?._modelVersion === "v9.4.2"
        ? "corsair-cannon-torpedo-v9.4.2"
        : "corsair-cannon-torpedo-v9.5.0-wdef-v0.1"
    }
  };
}

function expectedCritWeighted({ range, normalCoefficient, criticalCoefficient, critRate, seEnabled, cap }) {
  const normal = cappedUniformExpectation({
    min: range.min,
    max: range.max,
    k: normalCoefficient,
    cap
  });
  if (!seEnabled) return normal;
  const critical = cappedUniformExpectation({
    min: range.min,
    max: range.max,
    k: criticalCoefficient,
    cap
  });
  return (1 - critRate) * normal + critRate * critical;
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
  if (!stats) throw new Error("Corsair range requires actual MW20 stats.");
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
  finitePositive(params.cannonSkillPct, "cannonSkillPct");
  finitePositive(params.cannonLines, "cannonLines");
  finitePositive(params.bullseyeMultiplier, "bullseyeMultiplier");
  finiteNonNegative(params.seCritRate, "seCritRate");
  finiteNonNegative(params.seSkillAdd, "seSkillAdd");
  finitePositive(params.cannonCycleSeconds, "cannonCycleSeconds");
  finitePositive(params.torpedoMarkedPctPerSecond, "torpedoMarkedPctPerSecond");
  finitePositive(params.torpedoSecondaryPctPerSecond, "torpedoSecondaryPctPerSecond");
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
