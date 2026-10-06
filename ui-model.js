import { CLASS_ENGINES } from "./engine/index.js";
import { DEFAULT_COMBAT, prepareGear, cleanRange, combatOptions } from "./engine/profile.js";

export const STAGE_ORDER = Object.freeze(["Entry", "Advanced", "Late-game", "End-game"]);
export const TARGET_COUNTS = Object.freeze([1, 2, 3, 4, 6]);
export const CLASS_ORDER = Object.freeze([
  "hero",
  "dark-knight",
  "paladin",
  "night-lord",
  "shadower",
  "bowmaster",
  "marksman",
  "corsair",
  "buccaneer"
]);

export const CLASS_META = Object.freeze({
  hero: { label: "Hero", color: "#f59e0b" },
  "dark-knight": { label: "Dark Knight", color: "#ef4444" },
  paladin: { label: "Paladin", color: "#f97316" },
  "night-lord": { label: "Night Lord", color: "#a855f7" },
  shadower: { label: "Shadower", color: "#8b5cf6" },
  bowmaster: { label: "Bowmaster", color: "#10b981" },
  marksman: { label: "Marksman", color: "#14b8a6" },
  corsair: { label: "Corsair", color: "#3b82f6" },
  buccaneer: { label: "Buccaneer", color: "#06b6d4" }
});

export function getPotion(potionsData, potionId) {
  const potion = potionsData.potions.find(item => item.id === potionId);
  if (!potion) throw new Error(`Unknown potion: ${potionId}.`);
  return potion;
}

export function buildProgressionSeries({
  gearData,
  skillsData,
  potionsData,
  potionId = "apple",
  targetCount = 1,
  wdef = 0,
  combat = DEFAULT_COMBAT
}) {
  if (!TARGET_COUNTS.includes(targetCount)) {
    throw new RangeError("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  const potion = getPotion(potionsData, potionId);

  return CLASS_ORDER.map(classId => {
    const engine = CLASS_ENGINES[classId];
    const classGear = gearData.classes[classId];
    const skillData = skillsData.classes[classId];
    if (!engine || !classGear || !skillData) {
      throw new Error(`Incomplete Phase 3 data for ${classId}.`);
    }

    const points = STAGE_ORDER.map(stage => {
      const options = combatOptions(classId, combat);
      const range = cleanRange(classId, stage, classGear.stages[stage]);
      const prepared = prepareGear(classId, stage, classGear.stages[stage], combat.mwLevel ?? 20);
      if (classId === "corsair" && targetCount >= 3 && options.enableSe === false) {
        return { stage, dpm: null, cleanRange: range, prepared, selector: "torpedo", unavailable: "Torpedo SE-off coefficients are not yet separated from the source aggregate.", audit: {} };
      }
      const result = engine.evaluate({
        gear: prepared,
        potionWa: potion.wa,
        targetCount,
        wdef,
        skillData,
        options
      });
      return {
        stage,
        cleanRange: range,
        prepared,
        dpm: result.dpm,
        selector: result.selector,
        audit: result.audit
      };
    });

    return {
      classId,
      label: CLASS_META[classId].label,
      color: CLASS_META[classId].color,
      points
    };
  });
}

export function buildRanking(series, stage) {
  const ranked = series
    .map(item => ({
      classId: item.classId,
      label: item.label,
      color: item.color,
      point: item.points.find(point => point.stage === stage)
    }))
    .filter(item => item.point && Number.isFinite(item.point.dpm))
    .sort((left, right) => right.point.dpm - left.point.dpm);
  return ranked;
}

export function formatDpm(value) {
  return `${value.toFixed(2)}m`;
}

export function formatNumber(value, fractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits
  }).format(value);
}

export function formatRange(point) {
  return `${formatNumber(Math.floor(point.audit.buffedMin))}–${formatNumber(Math.floor(point.audit.buffedMax))}`;
}

export function summarizeCapState(capState) {
  const states = collectCapStates(capState);
  if (states.length === 0 || states.every(state => state === "uncapped")) return "Uncapped";
  if (states.every(state => state === "fully-capped")) return "Fully capped";
  return "Partially capped";
}

function collectCapStates(value) {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectCapStates);
}
