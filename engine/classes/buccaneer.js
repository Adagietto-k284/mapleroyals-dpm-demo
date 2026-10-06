import {
  cappedUniformExpectation,
  DEFAULT_LINE_CAP,
  calculateRange
} from "../range.js";
import { applyDefense } from "../defense.js";

export const classId = "buccaneer";

const VALID_TARGETS = Object.freeze([1, 2, 3, 4, 6]);
const DEFENSE_IMMUNE_SKILLS = new Set(["demolition"]);
const DEFAULT_PARAMS = Object.freeze({
  damageCap: DEFAULT_LINE_CAP,
  stUptime: 0.75,
  nonStUptime: 0.25,
  dsSnatchCycleSeconds: 1.653
});

/** Evaluate the frozen, source-driven Buccaneer sustained/cap model. */
export function evaluate(ctx = {}) {
  const model = ctx.exactModel
    ?? ctx.skillData?.canonical?.exactModel;
  if (!model) {
    throw new Error(
      "Buccaneer exact cap-aware source model is required: "
      + "provide skillData.canonical.exactModel or ctx.exactModel."
    );
  }

  const gear = ctx.gear ?? {};
  const stats = normalizeStats(gear.stats?.mw20 ?? ctx.mw20Stats);
  const cleanWa = finiteNonNegative(gear.cleanWa ?? ctx.cleanWa, "cleanWa");
  const params = { ...DEFAULT_PARAMS, ...model };
  validateModel(params);

  const targetCount = normalizeTargetCount(
    ctx.targetCount ?? ctx.options?.targetCount ?? 1
  );
  const buffs = ctx.buffs ?? {};
  const options = ctx.options ?? {};
  const potionWa = finiteNonNegative(
    ctx.potionWa ?? buffs.potionWa ?? 0,
    "potionWa"
  );
  const rageEnabled = resolveToggle(options, buffs, "rage", true);
  const echoEnabled = resolveToggle(options, buffs, "echo", true);
  const seEnabled = resolveToggle(options, buffs, "se", true);
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
    rangeModelId: "pirate-knuckle",
    mw20Stats: stats,
    wa: calculationWa,
    roundDown: options.gameRounding === true
  });
  const defendedRange = applyDefense({
    min: range.min,
    max: range.max,
    wdef: ctx.wdef ?? 0
  });

  const selector = params.selectors[String(targetCount)];
  const st = evaluateRotation({
    rotation: selector.st,
    skills: params.skills,
    baseRange: range,
    defendedRange,
    wdef: defendedRange.wdef,
    targetCount,
    cap: params.damageCap,
    seEnabled
  });
  const nonSt = evaluateRotation({
    rotation: selector.nonSt,
    skills: params.skills,
    baseRange: range,
    defendedRange,
    wdef: defendedRange.wdef,
    targetCount,
    cap: params.damageCap,
    seEnabled
  });
  const stDps = st.damage / selector.st.cycleSeconds;
  const nonStDps = nonSt.damage / selector.nonSt.cycleSeconds;
  const dpmM = 60 * (
    params.stUptime * stDps + params.nonStUptime * nonStDps
  ) / 1_000_000;

  return {
    classId,
    dpm: dpmM,
    selector: "sustained-cap-aware",
    audit: {
      cleanWa,
      potionWa,
      buffAdditiveWa: rageWa,
      wdef: defendedRange.wdef,
      defenseStatus: defendedRange.status,
      preEchoWa,
      echoMultiplier,
      echoApplied: echoEnabled,
      seApplied: seEnabled,
      calculationWa,
      buffedMin: defendedRange.min,
      buffedMax: defendedRange.max,
      selectedSkill: "sustained-cap-aware",
      capState: {
        st: st.capState,
        nonSt: nonSt.capState
      },
      rotations: {
        st: selector.st.id ?? null,
        nonSt: selector.nonSt.id ?? null
      },
      targetCount,
      effectiveTargetCount: targetCount,
      finalDpmM: dpmM,
      formulaVersion: "buccaneer-sustained-cap-aware-source-driven-wdef-v0.1",
      defense: {
        order: "after-element-before-skill",
        immuneSkills: [...DEFENSE_IMMUNE_SKILLS],
        shockwave: "wdef-sensitive-assumption; coefficient evidence only; VERIFY"
      },
      sustained: {
        stUptime: params.stUptime,
        nonStUptime: params.nonStUptime,
        stDps,
        nonStDps,
        dsSnatchCycleSeconds: params.dsSnatchCycleSeconds
      }
    }
  };
}

function evaluateRotation({
  rotation,
  skills,
  baseRange,
  defendedRange,
  wdef,
  targetCount,
  cap,
  seEnabled
}) {
  let damage = 0;
  const capState = {};
  for (const action of rotation.actions) {
    const skill = skills[action.skill];
    const repeats = action.repeats ?? 1;
    const result = evaluateSkill({
      skill,
      skillId: action.skill,
      baseRange,
      defendedRange,
      wdef,
      targetCount,
      cap,
      seEnabled
    });
    damage += result.damage * repeats;
    capState[action.skill] = result.capState;
  }
  return { damage, capState };
}

function evaluateSkill({
  skill,
  skillId,
  baseRange,
  defendedRange,
  wdef,
  targetCount,
  cap,
  seEnabled
}) {
  const range = isDefenseImmuneSkill(skillId) || skill.defenseImmune === true
    ? applyDefense({
        min: baseRange.min,
        max: baseRange.max,
        wdef,
        immune: true
      })
    : defendedRange;
  let damage = 0;
  const capState = [];
  for (const line of skill.lines) {
    const criticalChance = seEnabled
      ? (line.criticalChance ?? skill.criticalChance ?? 0)
      : 0;
    const criticalCoefficient = line.criticalCoefficient
      ?? skill.criticalCoefficient
      ?? line.coefficient;
    const normalExpected = cappedUniformExpectation({
      min: range.min,
      max: range.max,
      k: line.coefficient,
      cap
    });
    const criticalExpected = cappedUniformExpectation({
      min: range.min,
      max: range.max,
      k: criticalCoefficient,
      cap
    });
    const expected = (1 - criticalChance) * normalExpected
      + criticalChance * criticalExpected;
    damage += expected * targetMultiplier(skill, line, targetCount);
    const normalCapState = lineCapState(range, line.coefficient, cap);
    const criticalCapState = lineCapState(range, criticalCoefficient, cap);
    capState.push(criticalChance > 0
      ? { normal: normalCapState, critical: criticalCapState }
      : normalCapState);
  }
  return { damage, capState };
}

function isDefenseImmuneSkill(skillId) {
  return DEFENSE_IMMUNE_SKILLS.has(skillId);
}

function targetMultiplier(skill, line, targetCount) {
  const multiplier = line.targetMultipliers?.[String(targetCount)]
    ?? skill.targetMultipliers?.[String(targetCount)]
    ?? line.targetMultiplier
    ?? skill.targetMultiplier
    ?? 1;
  return finiteNonNegative(multiplier, `target multiplier for ${targetCount}T`);
}

function lineCapState(range, coefficient, cap) {
  if (range.max * coefficient <= cap) return "uncapped";
  if (range.min * coefficient >= cap) return "fully-capped";
  return "partially-capped";
}

function validateModel(model) {
  finitePositive(model.damageCap ?? DEFAULT_LINE_CAP, "damageCap");
  finiteNonNegative(model.stUptime, "stUptime");
  finiteNonNegative(model.nonStUptime, "nonStUptime");
  if (Math.abs(model.stUptime + model.nonStUptime - 1) > 1e-9) {
    throw new RangeError("Buccaneer sustained uptime must sum to 1.");
  }
  if (!model.skills || typeof model.skills !== "object") {
    throw new Error("Buccaneer exactModel.skills is required.");
  }
  for (const skill of Object.values(model.skills)) {
    if (!Array.isArray(skill.lines) || skill.lines.length === 0) {
      throw new Error("Each Buccaneer exactModel skill needs line coefficients.");
    }
    for (const line of skill.lines) {
      finitePositive(line.coefficient, "skill line coefficient");
      if (line.criticalCoefficient !== undefined) {
        finitePositive(line.criticalCoefficient, "skill critical line coefficient");
      }
      const criticalChance = line.criticalChance ?? skill.criticalChance ?? 0;
      finiteNonNegative(criticalChance, "skill critical chance");
      if (criticalChance > 1) throw new RangeError("skill critical chance cannot exceed 1.");
    }
  }
  if (!model.selectors || typeof model.selectors !== "object") {
    throw new Error("Buccaneer exactModel.selectors is required.");
  }
  for (const targetCount of VALID_TARGETS) {
    const selector = model.selectors[String(targetCount)];
    if (!selector?.st || !selector?.nonSt) {
      throw new Error(`Buccaneer selector mapping missing for ${targetCount}T.`);
    }
    validateRotation(selector.st, model.skills, `${targetCount}T ST`);
    validateRotation(selector.nonSt, model.skills, `${targetCount}T non-ST`);
  }
}

function validateRotation(rotation, skills, label) {
  finitePositive(rotation.cycleSeconds, `${label} cycleSeconds`);
  if (!Array.isArray(rotation.actions) || rotation.actions.length === 0) {
    throw new Error(`${label} rotation actions are required.`);
  }
  for (const action of rotation.actions) {
    if (!skills[action.skill]) throw new Error(`${label} uses unknown skill ${action.skill}.`);
    finitePositive(action.repeats ?? 1, `${label} repeats`);
  }
}

function resolveToggle(options, buffs, name, defaultValue) {
  const value = options[`enable${name[0].toUpperCase()}${name.slice(1)}`]
    ?? buffs[`${name}Enabled`]
    ?? buffs[name];
  return value === undefined ? defaultValue : Boolean(value);
}

function normalizeStats(stats) {
  if (!stats) throw new Error("Buccaneer range requires actual MW20 stats.");
  return {
    str: finiteNonNegative(stats.str, "mw20Stats.str"),
    dex: finiteNonNegative(stats.dex, "mw20Stats.dex")
  };
}

function normalizeTargetCount(targetCount) {
  if (!VALID_TARGETS.includes(targetCount)) {
    throw new RangeError("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  return targetCount;
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
