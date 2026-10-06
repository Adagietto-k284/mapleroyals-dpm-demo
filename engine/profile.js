import { calculateRange } from "./range.js";

export const DEFAULT_COMBAT = Object.freeze({ mwLevel: 20, se: true, si: true, echo: true, attackBuff: "rage", enrage: true });
export const RANGE_MODELS_BY_CLASS = Object.freeze({ hero: "warrior-2h-sword", paladin: "warrior-2h-sword", "dark-knight": "warrior-spear", bowmaster: "bow", marksman: "marksman-crossbow", corsair: "pirate-gun", buccaneer: "pirate-knuckle", "night-lord": "thief-claw", shadower: "thief-dagger" });
export const BASE_AP_SOURCE = "reference/archive/mapleroyals_gear_model_archive_v9_4_2.md";

export function baseAp(classId, stage) {
  if (classId === "night-lord") return { str: 4, dex: 25, luk: 997 };
  if (classId === "shadower") return { str: stage === "Entry" ? 6 : 4, dex: 25, luk: stage === "Entry" ? 995 : 997 };
  if (["bowmaster", "marksman", "corsair"].includes(classId)) return { str: 23, dex: 999 };
  if (["hero", "paladin", "dark-knight", "buccaneer"].includes(classId)) return { str: 999, dex: 23 };
  throw new Error(`Unknown AP model: ${classId}`);
}

export function mwPercent(level) {
  if (!Number.isInteger(level) || level < 0 || level > 20) throw new Error("MW level must be an integer from 0 to 20.");
  return Math.ceil(level / 2);
}

export function prepareGear(classId, stage, gear, level = 20) {
  const ap = baseAp(classId, stage);
  const stats = { ...gear.stats.mw20 };
  if (classId === "night-lord") stats.str = gear.stats.aux.strSubtotal;
  const equipmentStats = {};
  for (const [stat, base] of Object.entries(ap)) {
    if (!Number.isFinite(stats[stat])) throw new Error(`Missing ${classId} ${stat} aggregate.`);
    equipmentStats[stat] = stats[stat] - base - Math.floor(base * 10 / 100);
    stats[stat] = base + Math.floor(base * mwPercent(level) / 100) + equipmentStats[stat];
  }
  return { ...gear, stats: { ...gear.stats, mw20: stats }, ap, equipmentStats };
}

export function cleanRange(classId, stage, gear) {
  const input = prepareGear(classId, stage, gear, 20);
  return calculateRange({ classId, rangeModelId: RANGE_MODELS_BY_CLASS[classId], mw20Stats: input.stats.mw20, wa: input.cleanWa });
}

export function combatOptions(classId, combat = DEFAULT_COMBAT) {
  const c = { ...DEFAULT_COMBAT, ...combat };
  mwPercent(c.mwLevel);
  if (!["none", "rage", "dragonBlood"].includes(c.attackBuff)) throw new Error("Unknown attack buff.");
  if (c.si !== true) throw new Error("SI-off rotation timing is not yet verified for this profile.");
  return {
    enableSe: classId === "shadower" ? false : c.se,
    enableEcho: c.echo, enableEnrage: c.enrage,
    enableRage: c.attackBuff === "rage",
    enableDragonBlood: classId === "dark-knight" && c.attackBuff === "dragonBlood"
  };
}

export function combatSummary(combat) {
  return `MW${combat.mwLevel} (${mwPercent(combat.mwLevel)}%) · SE ${combat.se ? "on" : "off"} · SI on · Echo ${combat.echo ? "on" : "off"} · ${combat.attackBuff} · Enrage ${combat.enrage ? "average" : "off"}`;
}
