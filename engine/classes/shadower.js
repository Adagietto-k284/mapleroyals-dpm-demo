import { cappedUniformExpectation, DEFAULT_LINE_CAP, calculateRange } from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "shadower";

const DEFAULT_PARAMS = Object.freeze({
  assassinateBstep: {
    cycleSeconds: 1.9353,
    assassinate: { skillPct: 9.5, lines: 3 },
    boomerangStep: { skillPct: 6, lines: 2 }
  },
  bstepBot: {
    cycleSeconds: 1.1011,
    boomerangStep: { skillPct: 6, lines: 2, maxTargets: 4 },
    bandOfThieves: { skillPct: 2.5, maxTargets: 6 }
  },
  clawMinLukFactor: 1.944,
  clawMaxLukFactor: 3.6
});

/**
 * Evaluate the current Shadower canonical rotation.
 *
 * The source fixture deliberately keeps SE off and excludes Meso Explosion.
 * Assassinate+BStep is used at 1–2 targets; BStep+BoT is used at 3–6 targets.
 * Clean dagger ranges are rounded to the displayed integer range before the
 * additive-buff/Echo ratio is applied, matching the authoritative sheet.
 */
export function evaluate(ctx = {}) {
  const context = ctx ?? {};
  const gear = context.gear ?? {};
  const mw20Stats = gear.stats?.mw20 ?? context.mw20Stats;
  const cleanWa = finitePositive(gear.cleanWa ?? context.cleanWa, "cleanWa");
  const stats = normalizeStats(mw20Stats);
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
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const seEnabled = resolveToggle(options, buffs, "se", false);
  if (seEnabled) {
    throw new Error("Shadower canonical model requires SE disabled.");
  }
  const rageWa = rageEnabled
    ? finiteNonNegative(buffs.rageWa ?? 12, "rageWa")
    : 0;
  const echoMultiplier = echoEnabled
    ? finitePositive(buffs.echoMultiplier ?? 1.04, "echoMultiplier")
    : 1;

  const preEchoWa = cleanWa + potionWa + rageWa;
  const calculationWa = options.gameRounding
    ? applyEchoWa(preEchoWa, echoMultiplier) : preEchoWa * echoMultiplier;
  const cleanRange = calculateRange({
    classId,
    rangeModelId: "thief-dagger",
    mw20Stats: stats,
    wa: cleanWa,
    modelParams: {
      minLukFactor: params.clawMinLukFactor,
      maxLukFactor: params.clawMaxLukFactor
    }
  });
  const buffRatio = calculationWa / cleanWa;
  const range = options.gameRounding
    ? calculateRange({
      classId,
      rangeModelId: "thief-dagger",
      mw20Stats: stats,
      wa: calculationWa,
      modelParams: {
        minLukFactor: params.clawMinLukFactor,
        maxLukFactor: params.clawMaxLukFactor
      },
      roundDown: true
    })
    : {
      min: Math.round(cleanRange.min) * buffRatio,
      max: Math.round(cleanRange.max) * buffRatio
    };
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: context.wdef ?? 0
  });
  const cap = context.cap ?? DEFAULT_LINE_CAP;
  const selectedSkill = targetCount <= 2 ? "assassinate-bstep" : "bstep-bot";
  const result = selectedSkill === "assassinate-bstep"
    ? evaluateAssassinateBstep({ defendedRange, targetCount, params, cap })
    : evaluateBstepBot({ defendedRange, targetCount, params, cap });
  const dpmM = result.cycleDamage * 60 / result.cycleSeconds / 1_000_000;

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
      buffRatio,
      cleanMin: Math.round(cleanRange.min),
      cleanMax: Math.round(cleanRange.max),
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      selectedSkill,
      seEnabled,
      capState: result.capState,
      targetCount,
      effectiveTargetCount: targetCount,
      finalDpmM: dpmM,
      formulaVersion: context.skillData?._modelVersion === "v9.4.2"
        ? "shadower-dagger-canonical-v9.4.2"
        : "shadower-dagger-canonical-v9.5.0-wdef-v0.1"
    }
  };
}

function evaluateAssassinateBstep({ defendedRange, targetCount, params, cap }) {
  const branch = params.assassinateBstep;
  const assassinate = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: branch.assassinate.skillPct,
    cap
  });
  const boomerangStep = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: branch.boomerangStep.skillPct,
    cap
  });
  return {
    cycleDamage: branch.assassinate.lines * assassinate
      + branch.boomerangStep.lines * targetCount * boomerangStep,
    cycleSeconds: branch.cycleSeconds,
    capState: {
      assassinate: capState(defendedRange, branch.assassinate.skillPct, cap),
      boomerangStep: capState(defendedRange, branch.boomerangStep.skillPct, cap)
    }
  };
}

function evaluateBstepBot({ defendedRange, targetCount, params, cap }) {
  const branch = params.bstepBot;
  const boomerangStep = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: branch.boomerangStep.skillPct,
    cap
  });
  const bandOfThieves = cappedUniformExpectation({
    min: defendedRange.min,
    max: defendedRange.max,
    k: branch.bandOfThieves.skillPct,
    cap
  });
  return {
    cycleDamage: branch.boomerangStep.lines
      * Math.min(targetCount, branch.boomerangStep.maxTargets)
      * boomerangStep
      + Math.min(targetCount, branch.bandOfThieves.maxTargets) * bandOfThieves,
    cycleSeconds: branch.cycleSeconds,
    capState: {
      boomerangStep: capState(defendedRange, branch.boomerangStep.skillPct, cap),
      bandOfThieves: capState(defendedRange, branch.bandOfThieves.skillPct, cap)
    }
  };
}

function mergeParams(skillData = {}) {
  const branches = skillData.branches ?? {};
  const assaSource = branches["assassinate-bstep"]?.params ?? {};
  const botSource = branches["bstep-bot"]?.params ?? {};
  return {
    ...DEFAULT_PARAMS,
    ...skillData.params,
    clawMinLukFactor: skillData.params?.clawMinLukFactor ?? DEFAULT_PARAMS.clawMinLukFactor,
    clawMaxLukFactor: skillData.params?.clawMaxLukFactor ?? DEFAULT_PARAMS.clawMaxLukFactor,
    assassinateBstep: {
      ...DEFAULT_PARAMS.assassinateBstep,
      ...assaSource,
      assassinate: {
        ...DEFAULT_PARAMS.assassinateBstep.assassinate,
        ...(assaSource.assassinate ?? {})
      },
      boomerangStep: {
        ...DEFAULT_PARAMS.assassinateBstep.boomerangStep,
        ...(assaSource.boomerangStep ?? {})
      }
    },
    bstepBot: {
      ...DEFAULT_PARAMS.bstepBot,
      ...botSource,
      boomerangStep: {
        ...DEFAULT_PARAMS.bstepBot.boomerangStep,
        ...(botSource.boomerangStep ?? {})
      },
      bandOfThieves: {
        ...DEFAULT_PARAMS.bstepBot.bandOfThieves,
        ...(botSource.bandOfThieves ?? {})
      }
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
  if (!stats) throw new Error("Shadower range requires actual MW20 stats.");
  return {
    luk: finiteNonNegative(stats.luk, "mw20Stats.luk"),
    dex: finiteNonNegative(stats.dex, "mw20Stats.dex"),
    str: finiteNonNegative(stats.str, "mw20Stats.str")
  };
}

function normalizeTargetCount(targetCount) {
  if (![1, 2, 3, 4, 6].includes(targetCount)) {
    throw new RangeError("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  return targetCount;
}

function validateParams(params) {
  validateBranch(params.assassinateBstep, "assassinateBstep");
  validateBranch(params.bstepBot, "bstepBot");
  finitePositive(params.clawMinLukFactor, "clawMinLukFactor");
  finitePositive(params.clawMaxLukFactor, "clawMaxLukFactor");
}

function validateBranch(branch, name) {
  finitePositive(branch.cycleSeconds, `${name}.cycleSeconds`);
  finitePositive(branch.boomerangStep.skillPct, `${name}.boomerangStep.skillPct`);
  finitePositive(branch.boomerangStep.lines, `${name}.boomerangStep.lines`);
  if (name === "assassinateBstep") {
    finitePositive(branch.assassinate.skillPct, `${name}.assassinate.skillPct`);
    finitePositive(branch.assassinate.lines, `${name}.assassinate.lines`);
  } else {
    finitePositive(branch.boomerangStep.maxTargets, `${name}.boomerangStep.maxTargets`);
    finitePositive(branch.bandOfThieves.skillPct, `${name}.bandOfThieves.skillPct`);
    finitePositive(branch.bandOfThieves.maxTargets, `${name}.bandOfThieves.maxTargets`);
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
