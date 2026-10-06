import { CLASS_ENGINES } from "./index.js";
import {
  DEFAULT_COMBAT,
  RANGE_MODELS_BY_CLASS,
  combatOptions,
  mwPercent
} from "./profile.js";
import { calculateRange } from "./range.js";

const CLASS_IDS = Object.freeze([
  "hero",
  "paladin",
  "dark-knight",
  "bowmaster",
  "marksman",
  "corsair",
  "buccaneer",
  "night-lord",
  "shadower"
]);

export const SLOTS = Object.freeze([
  "weapon",
  "shield",
  "helmet",
  "face",
  "eye",
  "earring",
  "pendant",
  "top",
  "bottom",
  "overall",
  "gloves",
  "cape",
  "shoes",
  "belt",
  "shoulder",
  "ring1",
  "ring2",
  "ring3",
  "ring4",
  "medal",
  "nxPendant",
  "nxRing"
]);

const BASE_DEFAULTS = Object.freeze({
  str: 4,
  dex: 25,
  int: 4,
  luk: 997
});

const BASE_DEFAULTS_BY_CLASS = Object.freeze({
  hero: { str: 999, dex: 23, int: 4, luk: 4 },
  paladin: { str: 999, dex: 23, int: 4, luk: 4 },
  "dark-knight": { str: 999, dex: 23, int: 4, luk: 4 },
  bowmaster: { str: 23, dex: 999, int: 4, luk: 4 },
  marksman: { str: 23, dex: 999, int: 4, luk: 4 },
  corsair: { str: 23, dex: 999, int: 4, luk: 4 },
  buccaneer: { str: 999, dex: 23, int: 4, luk: 4 },
  "night-lord": { ...BASE_DEFAULTS },
  shadower: { ...BASE_DEFAULTS }
});

const RELEVANT_STATS = Object.freeze({
  hero: Object.freeze(["str", "dex"]),
  paladin: Object.freeze(["str", "dex"]),
  "dark-knight": Object.freeze(["str", "dex"]),
  bowmaster: Object.freeze(["dex", "str"]),
  marksman: Object.freeze(["dex", "str"]),
  corsair: Object.freeze(["dex", "str"]),
  buccaneer: Object.freeze(["str", "dex"]),
  "night-lord": Object.freeze(["luk", "dex", "str"]),
  shadower: Object.freeze(["luk", "dex", "str"])
});

const WEAPON_DEFINITIONS = {
  hero: [
    { id: "dragon-claymore", label: "Dragon Claymore", requirements: {} },
    { id: "stonetooth", label: "Stonetooth Sword", requirements: { dex: 120 } }
  ],
  paladin: [
    { id: "dragon-claymore", label: "Dragon Claymore", requirements: {} },
    { id: "stonetooth", label: "Stonetooth Sword", requirements: { dex: 120 } }
  ],
  "dark-knight": [
    { id: "sky-ski", label: "Sky Ski", requirements: {} }
  ],
  bowmaster: [
    { id: "nisrock", label: "Nisrock", requirements: { str: 105 } },
    { id: "dragon-shiner-bow", label: "Dragon Shiner Bow", requirements: { str: 115 } },
    { id: "crimson-arclancer", label: "Crimson Arclancer", requirements: { str: 90 } }
  ],
  marksman: [
    { id: "neschere", label: "Neschere", requirements: { str: 100 } },
    { id: "dragon-shiner-cross", label: "Dragon Shiner Cross", requirements: { str: 110 } }
  ],
  corsair: [
    { id: "concerto", label: "Concerto", requirements: { str: 100 } },
    { id: "dragon-revolver", label: "Dragon Revolver", requirements: { str: 110 } }
  ],
  buccaneer: [
    { id: "king-cent", label: "King Cent", requirements: { dex: 100 } },
    { id: "dragon-slash-claw", label: "Dragon Slash Claw", requirements: { dex: 110 } }
  ],
  "night-lord": [
    { id: "red-craven", label: "Red Craven", requirements: { dex: 140 } },
    { id: "dragon-purple-sleeve", label: "Dragon Purple Sleeve (DPS)", requirements: { dex: 150 } },
    { id: "no-dex-required-claw", label: "No-DEX-required Claw", requirements: {} }
  ],
  shadower: [
    { id: "gold-double-knife", label: "Gold Double Knife (GDK)", requirements: { str: 70, dex: 140 } },
    { id: "dragon-kanzir", label: "Dragon Kanzir", requirements: { str: 75, dex: 150 } }
  ]
};

const SHIELD_REQUIREMENTS = Object.freeze({ str: 75, dex: 150 });
const PASSIVE_WA = Object.freeze({ bowmaster: 10, marksman: 15 });
const VALID_TARGETS = Object.freeze([1, 2, 3, 4, 6]);
const STAT_NAMES = Object.freeze(["str", "dex", "int", "luk"]);
const GEAR_STAT_NAMES = Object.freeze(["str", "dex", "luk", "wa"]);

export const WEAPONS = Object.freeze(
  Object.fromEntries(
    Object.entries(WEAPON_DEFINITIONS).map(([classId, entries]) => [
      classId,
      Object.freeze(entries.map(entry => Object.freeze({
        ...entry,
        requirements: Object.freeze({ ...entry.requirements })
      })))
    ])
  )
);

export function relevantStats(classId) {
  assertClassId(classId);
  return [...RELEVANT_STATS[classId]];
}

export function defaultPreset(classId = "hero") {
  assertClassId(classId);
  return {
    schemaVersion: 1,
    mode: "quick",
    classId,
    weaponId: WEAPONS[classId][0].id,
    base: { ...BASE_DEFAULTS_BY_CLASS[classId] },
    quick: {
      str: "",
      dex: "",
      luk: "",
      wa: "",
      max: "",
      waMode: "gear"
    },
    clothing: "separate",
    slots: Object.fromEntries(SLOTS.map(slot => [slot, emptySlot()])),
    ammoWa: 0
  };
}

/**
 * Evaluate a user-entered preset against the existing class engines.
 *
 * Invalid browser/localStorage data is part of the public input surface. Keep
 * the boundary exception-free so the UI can render `errors` instead of losing
 * the whole page to a malformed draft.
 */
export function evaluatePreset(input = {}, options = {}) {
  try {
    return evaluatePresetInternal(input, options ?? {});
  } catch (error) {
    return {
      valid: false,
      errors: [error?.message ?? String(error)],
      warnings: [],
      cleanRange: null,
      mw20Range: null,
      dpm: null,
      selector: null,
      stats: null,
      cleanWa: null
    };
  }
}

/**
 * Quick mode supplies aggregate, pre-MW stats and a no-MW displayed range.
 * Detailed mode derives the same aggregate from the per-slot entries. In
 * both modes the MW20 range is calculated independently for the graph X axis.
 */
function evaluatePresetInternal(input = {}, {
  skillsData,
  potionWa = 0,
  targetCount = 1,
  wdef = 0,
  combat = {}
} = {}) {
  const errors = [];
  const warnings = [];
  const source = input && typeof input === "object" ? input : {};
  const classId = source.classId;
  const mode = source.mode ?? "quick";
  const weapon = findWeapon(classId, source.weaponId, errors);

  if (source.schemaVersion !== undefined && source.schemaVersion !== 1) {
    errors.push("Unsupported preset schemaVersion; expected 1.");
  }
  if (!classId || !CLASS_IDS.includes(classId)) {
    errors.push(`Unknown classId: ${String(classId)}.`);
  }
  if (!["quick", "detailed"].includes(mode)) {
    errors.push(`Unknown preset mode: ${String(mode)}.`);
  }

  const base = parseBase(source.base, errors);
  const combatState = parseCombat(combat, classId, errors);
  const parsedPotionWa = parseOptionNumber(potionWa, "potionWa", errors, 0);
  const parsedTargetCount = parseOptionInteger(targetCount, "targetCount", errors, 1);
  const parsedWdef = parseOptionNumber(wdef, "wdef", errors, 0);

  let rawStats;
  let gearStats;
  let cleanWa;
  let slotStats;
  let quickValues;
  let waBreakdown = null;

  if (mode === "quick") {
    quickValues = parseQuick(source.quick, classId, errors);
    const quickAmmo = parseNonNegative(source.ammoWa ?? 0, "ammoWa", errors, false, true);
    const ammoSupported = Object.hasOwn(PASSIVE_WA, classId) || ["night-lord", "corsair"].includes(classId);
    if (!ammoSupported && quickAmmo > 0) errors.push("ammoWa is not applicable to this class and is not counted.");
    if (quickValues && base) {
      rawStats = {
        str: quickValues.str,
        dex: quickValues.dex,
        luk: RELEVANT_STATS[classId]?.includes("luk") ? quickValues.luk : base.luk,
        int: base.int
      };
      // Missing waMode denotes a v1 saved draft whose WA was already the total.
      const waMode = source.quick?.waMode ?? "total";
      if (!["gear", "total"].includes(waMode)) errors.push("quick.waMode must be gear or total.");
      const passiveWa = PASSIVE_WA[classId] ?? 0;
      if (waMode === "gear" || !ammoSupported) {
        cleanWa = quickValues.wa + (quickAmmo ?? 0) + passiveWa;
        waBreakdown = { gear: quickValues.wa, ammo: quickAmmo ?? 0, passive: passiveWa, total: cleanWa };
      } else {
        cleanWa = quickValues.wa;
        waBreakdown = { gear: null, ammo: null, passive: null, total: cleanWa, legacyTotal: true };
        warnings.push("Legacy quick total WA already includes ammunition and passive WA; review and switch to gear WA to see the breakdown.");
      }
      gearStats = subtractBase(rawStats, base, classId, errors);
    }
    warnings.push("Quick mode verifies aggregate stats and range only; individual gear and weapon/shield qualification are only partially verified.");
  } else if (mode === "detailed") {
    const parsedDetailed = parseDetailed(source, classId, errors);
    slotStats = parsedDetailed.slots;
    if (parsedDetailed.valid && base) {
      const totals = sumSlotStats(slotStats, classId);
      rawStats = {
        str: base.str + totals.str,
        dex: base.dex + totals.dex,
        luk: base.luk + totals.luk,
        int: base.int
      };
      gearStats = totals;
      cleanWa = totals.wa + (PASSIVE_WA[classId] ?? 0) + parsedDetailed.ammoWa;
      waBreakdown = { gear: totals.wa, ammo: parsedDetailed.ammoWa, passive: PASSIVE_WA[classId] ?? 0, total: cleanWa };
    }
  }

  let stats;
  let cleanRange;
  let mw20Range;
  let selectedRange;
  let selectedWeaponOptions;

  if (base && rawStats && Number.isFinite(cleanWa)) {
    const selectedIncrement = buildMwIncrement(base, combatState.mwLevel);
    const mw20Increment = buildMwIncrement(base, 20);
    const selectedStats = addStats(rawStats, selectedIncrement);
    const mw20Stats = addStats(rawStats, mw20Increment);
    stats = {
      base: { ...base },
      beforeMw: { ...rawStats },
      raw: { ...rawStats },
      gear: { ...gearStats },
      selectedMw: { ...selectedStats },
      mw20: { ...mw20Stats },
      selected: { ...selectedStats },
      mwIncrement: { ...selectedIncrement },
      mw20Increment: { ...mw20Increment },
      mwLevel: combatState.mwLevel,
      mwPercent: mwPercent(combatState.mwLevel),
      mw20Percent: mwPercent(20)
    };

    try {
      cleanRange = calculatePresetRange(classId, rawStats, cleanWa);
      mw20Range = calculatePresetRange(classId, mw20Stats, cleanWa);
      selectedRange = calculatePresetRange(classId, selectedStats, cleanWa);
    } catch (error) {
      errors.push(error.message);
    }

    if (mode === "quick" && quickValues && cleanRange) {
      if (quickValues.max !== cleanRange.max) {
        errors.push(
          `Quick no-MW max range does not match calculated displayed max: `
          + `entered ${quickValues.max}, calculated ${cleanRange.max}.`
        );
      }
    }

    if (weapon && parsedTargetCount !== null && parsedTargetCount !== undefined) {
      validateRequirements({
        classId,
        mode,
        weapon,
        selectedStats,
        base,
        slotStats,
        selectedIncrement,
        errors,
        warnings
      });
    }
  }

  if (combatState.error) errors.push(combatState.error);
  if (classId === "corsair" && parsedTargetCount >= 3 && combatState.se === false) {
    errors.push("Corsair 3T+ with SE off is not supported by the verified model.");
  }
  if (parsedTargetCount !== null && !VALID_TARGETS.includes(parsedTargetCount)) {
    errors.push("targetCount must be one of 1, 2, 3, 4, or 6.");
  }
  if (parsedWdef !== null && (parsedWdef < 0 || parsedWdef > 4000)) {
    errors.push("wdef must be between 0 and 4000.");
  }

  let dpm = null;
  let selector = null;
  if (errors.length === 0 && stats && cleanRange && selectedRange && weapon) {
    try {
      const engine = CLASS_ENGINES[classId];
      const skillData = resolveSkillData(skillsData, classId);
      const engineGear = {
        cleanWa,
        stats: {
          mw20: { ...stats.selected },
          ...(classId === "night-lord"
            ? { aux: { strSubtotal: stats.selected.str } }
            : {})
        }
      };
      const engineResult = engine.evaluate({
        gear: engineGear,
        skillData,
        potionWa: parsedPotionWa,
        targetCount: parsedTargetCount,
        wdef: parsedWdef,
        options: { ...combatState.options, gameRounding: true }
      });
      if (!Number.isFinite(engineResult.dpm) || engineResult.dpm < 0) {
        errors.push("The selected engine returned a non-finite or negative DPM.");
      } else {
        dpm = engineResult.dpm;
        selector = engineResult.selector;
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    cleanRange: cleanRange ?? null,
    mw20Range: mw20Range ?? null,
    dpm,
    selector,
    stats: stats ?? null,
    cleanWa: Number.isFinite(cleanWa) ? cleanWa : null,
    waBreakdown
  };
}

function assertClassId(classId) {
  if (!CLASS_IDS.includes(classId)) throw new Error(`Unknown classId: ${classId}.`);
}

function findWeapon(classId, weaponId, errors) {
  if (!classId || !WEAPONS[classId]) return null;
  const weapon = WEAPONS[classId].find(entry => entry.id === weaponId);
  if (!weapon) {
    errors.push(`Unknown weaponId for ${classId}: ${String(weaponId)}.`);
  }
  return weapon ?? null;
}

function emptySlot() {
  return { str: 0, dex: 0, luk: 0, wa: 0 };
}

function parseBase(value, errors) {
  const base = {};
  let missing = false;
  for (const stat of STAT_NAMES) {
    const parsed = parseInteger(value?.[stat], `base.${stat}`, errors, true);
    if (parsed === null) missing = true;
    base[stat] = parsed ?? 0;
  }
  if (missing) return null;
  if (Object.values(base).some(value => value < 4 || value > 999)) {
    errors.push("Every base stat must be an integer from 4 through 999.");
  }
  if (Object.values(base).reduce((sum, value) => sum + value, 0) > 1030) {
    errors.push("Base AP total must not exceed 1030.");
  }
  return base;
}

function parseQuick(value, classId, errors) {
  if (!value || typeof value !== "object") {
    errors.push("Quick input is required.");
    return null;
  }
  const relevant = new Set(RELEVANT_STATS[classId] ?? []);
  const parsed = {};
  for (const stat of ["str", "dex", "luk"]) {
    const required = relevant.has(stat);
    const result = parseNonNegative(value[stat], `quick.${stat}`, errors, required, true);
    parsed[stat] = result ?? 0;
  }
  for (const field of ["wa", "max"]) {
    const result = parseNonNegative(value[field], `quick.${field}`, errors, true, false);
    parsed[field] = result ?? 0;
  }
  if (["str", "dex", "luk"].some(stat => relevant.has(stat) && parsed[stat] === null)) return null;
  if (["wa", "max"].some(field => parsed[field] === null)) return null;
  return parsed;
}

function parseDetailed(source, classId, errors) {
  const clothing = source.clothing ?? "separate";
  if (!["separate", "overall"].includes(clothing)) {
    errors.push("clothing must be either separate or overall.");
  }
  const slots = {};
  for (const slot of SLOTS) {
    const value = source.slots?.[slot] ?? {};
    const parsed = {};
    for (const stat of GEAR_STAT_NAMES) {
      parsed[stat] = parseNonNegative(value[stat], `slots.${slot}.${stat}`, errors, false, true) ?? 0;
    }
    slots[slot] = parsed;
  }
  const ammoWa = parseNonNegative(source.ammoWa, "ammoWa", errors, false, true) ?? 0;
  if (slots.weapon.wa <= 0) {
    errors.push("slots.weapon.wa must be greater than 0.");
  }
  if (classId !== "shadower" && hasPositiveSlot(slots.shield)) {
    errors.push("shield is only applicable to Shadower and is not counted for this class.");
  }
  const ammoSupported = Object.hasOwn(PASSIVE_WA, classId)
    || ["night-lord", "corsair"].includes(classId);
  if (!ammoSupported && ammoWa > 0) {
    errors.push("ammoWa is not applicable to this class and is not counted.");
  }
  const separateGear = slots.top.str + slots.top.dex + slots.top.luk + slots.top.wa
    + slots.bottom.str + slots.bottom.dex + slots.bottom.luk + slots.bottom.wa;
  const overallGear = slots.overall.str + slots.overall.dex + slots.overall.luk + slots.overall.wa;
  if (clothing === "separate" && overallGear > 0) {
    errors.push("overall cannot be used when clothing is separate.");
  }
  if (clothing === "overall" && separateGear > 0) {
    errors.push("top/bottom cannot be used when clothing is overall.");
  }
  return { slots, ammoWa: ammoSupported ? ammoWa : 0, valid: true };
}

function sumSlotStats(slots, classId) {
  return SLOTS.reduce((total, slot) => {
    if (slot === "shield" && classId !== "shadower") return total;
    const values = slots[slot];
    for (const stat of GEAR_STAT_NAMES) total[stat] += values[stat];
    return total;
  }, emptySlot());
}

function subtractBase(rawStats, base, classId, errors) {
  const gear = {};
  for (const stat of ["str", "dex", "luk"]) {
    gear[stat] = rawStats[stat] - base[stat];
    if (RELEVANT_STATS[classId]?.includes(stat) && gear[stat] < 0) {
      errors.push(`quick.${stat} cannot be lower than base.${stat}.`);
    }
    if (!RELEVANT_STATS[classId]?.includes(stat)) gear[stat] = 0;
  }
  gear.int = 0;
  gear.wa = 0;
  return gear;
}

function buildMwIncrement(base, level) {
  const percent = mwPercent(level);
  return Object.fromEntries(
    STAT_NAMES.map(stat => [stat, Math.floor(base[stat] * percent / 100)])
  );
}

function addStats(rawStats, increment) {
  return {
    str: rawStats.str + increment.str,
    dex: rawStats.dex + increment.dex,
    luk: rawStats.luk + increment.luk,
    int: rawStats.int + increment.int
  };
}

function calculatePresetRange(classId, stats, wa) {
  return calculateRange({
    classId,
    rangeModelId: RANGE_MODELS_BY_CLASS[classId],
    mw20Stats: stats,
    wa,
    roundDown: true
  });
}

function validateRequirements({
  classId,
  mode,
  weapon,
  selectedStats,
  base,
  slotStats,
  selectedIncrement,
  errors,
  warnings
}) {
  if (classId === "shadower" && mode === "detailed") {
    validateShadowerEquipOrder({
      weapon,
      base,
      selectedIncrement,
      slotStats,
      errors
    });
    return;
  }

  const weaponAvailable = mode === "detailed"
    ? requirementTotals(base, selectedIncrement, slotStats, "weapon")
    : selectedStats;
  checkRequirements(weapon.label, weapon.requirements, weaponAvailable, errors);

  if (classId !== "shadower") return;
  const shieldAvailable = mode === "detailed"
    ? requirementTotals(base, selectedIncrement, slotStats, "shield")
    : selectedStats;
  checkRequirements("Dragon Khanjar", SHIELD_REQUIREMENTS, shieldAvailable, errors);
  if (mode === "quick") {
    warnings.push("Quick mode cannot prove whether the weapon or Dragon Khanjar is contributing to its own requirement; detailed mode excludes each item's own stats.");
  }
}

function validateShadowerEquipOrder({
  weapon,
  base,
  selectedIncrement,
  slotStats,
  errors
}) {
  const beforeItems = requirementTotals(
    base,
    selectedIncrement,
    slotStats,
    ["weapon", "shield"]
  );
  const weaponStats = slotStats.weapon ?? emptySlot();
  const shieldStats = slotStats.shield ?? emptySlot();
  const afterWeapon = addRequirementStats(beforeItems, weaponStats);
  const afterShield = addRequirementStats(beforeItems, shieldStats);
  const weaponFirst = meetsRequirements(weapon.requirements, beforeItems)
    && meetsRequirements(SHIELD_REQUIREMENTS, afterWeapon);
  const shieldFirst = meetsRequirements(SHIELD_REQUIREMENTS, beforeItems)
    && meetsRequirements(weapon.requirements, afterShield);

  if (!weaponFirst && !shieldFirst) {
    errors.push(
      `${weapon.label} and Dragon Khanjar cannot be equipped in either order; `
      + "their requirements cannot be satisfied by mutually dependent stats."
    );
  }
}

function requirementTotals(base, increment, slots, excludedSlot) {
  const totals = {
    str: base.str + increment.str,
    dex: base.dex + increment.dex,
    luk: base.luk + increment.luk
  };
  const excluded = new Set(Array.isArray(excludedSlot) ? excludedSlot : [excludedSlot]);
  for (const slot of SLOTS) {
    if (excluded.has(slot)) continue;
    const values = slots?.[slot] ?? emptySlot();
    Object.assign(totals, addRequirementStats(totals, values));
  }
  return totals;
}

function addRequirementStats(left, right) {
  return {
    str: left.str + (right.str ?? 0),
    dex: left.dex + (right.dex ?? 0),
    luk: left.luk + (right.luk ?? 0)
  };
}

function meetsRequirements(requirements, available) {
  return ["str", "dex"].every(stat => (available[stat] ?? 0) >= (requirements[stat] ?? 0));
}

function checkRequirements(label, requirements, available, errors) {
  for (const stat of ["str", "dex"]) {
    const required = requirements[stat] ?? 0;
    const current = available[stat] ?? 0;
    if (current < required) {
      errors.push(`${label} requires ${stat.toUpperCase()} ${required}; missing ${required - current}.`);
    }
  }
}

function parseCombat(value, classId, errors) {
  const source = value && typeof value === "object" ? value : {};
  const mwLevel = parseOptionInteger(source.mwLevel, "combat.mwLevel", errors, DEFAULT_COMBAT.mwLevel);
  const se = parseBoolean(source.se, "combat.se", errors, DEFAULT_COMBAT.se);
  const si = parseBoolean(source.si, "combat.si", errors, DEFAULT_COMBAT.si);
  const echo = parseBoolean(source.echo, "combat.echo", errors, DEFAULT_COMBAT.echo);
  const enrage = parseBoolean(source.enrage, "combat.enrage", errors, DEFAULT_COMBAT.enrage);
  const attackBuff = source.attackBuff ?? DEFAULT_COMBAT.attackBuff;
  let error = null;
  if (si === false) error = "SI-off rotation timing is not yet verified for this profile.";
  if (!["none", "rage", "dragonBlood"].includes(attackBuff)) {
    errors.push("Unknown attack buff.");
  }
  if (mwLevel === null || mwLevel < 0 || mwLevel > 20) {
    errors.push("combat.mwLevel must be an integer from 0 through 20.");
  }
  const safeMwLevel = mwLevel !== null && mwLevel >= 0 && mwLevel <= 20
    ? mwLevel
    : DEFAULT_COMBAT.mwLevel;
  let options = {};
  if (mwLevel !== null && safeMwLevel === mwLevel && error === null) {
    try {
      options = combatOptions(classId, {
        mwLevel: safeMwLevel,
        se,
        si,
        echo,
        enrage,
        attackBuff
      });
    } catch (caught) {
      error = caught.message;
    }
  }
  return { mwLevel: safeMwLevel, se, si, echo, enrage, attackBuff, options, error };
}

function parseOptionNumber(value, name, errors, fallback) {
  if (value === undefined || value === null || isEmpty(value)) return fallback;
  return parseNonNegative(value, name, errors, true, false);
}

function parseOptionInteger(value, name, errors, fallback) {
  if (value === undefined || value === null || isEmpty(value)) return fallback;
  return parseInteger(value, name, errors, true);
}

function parseBoolean(value, name, errors, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  errors.push(`${name} must be true or false.`);
  return fallback;
}

function parseInteger(value, name, errors, required) {
  if (isEmpty(value)) {
    if (required) errors.push(`${name} is required.`);
    return null;
  }
  const number = coerceNumeric(value);
  if (!Number.isFinite(number) || !Number.isSafeInteger(number)) {
    errors.push(`${name} must be a finite integer.`);
    return null;
  }
  return number;
}

function parseNonNegative(value, name, errors, required, integer) {
  if (isEmpty(value)) {
    if (required) errors.push(`${name} is required.`);
    return null;
  }
  const number = coerceNumeric(value);
  if (!Number.isFinite(number) || (integer && !Number.isSafeInteger(number))) {
    errors.push(`${name} must be a finite${integer ? " integer" : " number"}.`);
    return null;
  }
  if (number < 0) {
    errors.push(`${name} must be non-negative.`);
    return null;
  }
  return number;
}

function isEmpty(value) {
  return value === undefined || value === null
    || (typeof value === "string" && value.trim() === "");
}

function coerceNumeric(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function hasPositiveSlot(slot) {
  return GEAR_STAT_NAMES.some(stat => Number(slot?.[stat] ?? 0) > 0);
}

function resolveSkillData(skillsData, classId) {
  const data = skillsData?.classes?.[classId]
    ?? skillsData?.[classId]
    ?? skillsData;
  if (!data || typeof data !== "object") {
    throw new Error(`skillsData for ${classId} is required.`);
  }
  return data;
}
