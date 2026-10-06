import {
  CLASS_META,
  CLASS_ORDER,
  STAGE_ORDER,
  TARGET_COUNTS,
  buildProgressionSeries,
  formatNumber,
  summarizeCapState
} from "./ui-model.js";
import {
  DEFAULT_COMBAT,
  RANGE_MODELS_BY_CLASS,
  baseAp,
  cleanRange,
  mwPercent,
  prepareGear
} from "./engine/profile.js";

export const LIBRARY_SECTIONS = Object.freeze(["classes", "mechanics", "validation"]);
export const GEAR_CONFIDENCE = Object.freeze({
  exact: "Exact source package",
  representative: "Representative / flexible",
  confirmedTotal: "Confirmed total only"
});

const UNKNOWN = "Not provided in current source";
const ARCHIVE_HEADINGS = Object.freeze({
  hero: ["Warrior common profile"],
  paladin: ["Warrior common profile"],
  "dark-knight": ["Warrior common profile"],
  bowmaster: ["Archer common profile"],
  marksman: ["Archer common profile"],
  corsair: ["Corsair"],
  "night-lord": ["Night Lord"],
  shadower: ["Shadower"],
  buccaneer: ["Buccaneer"]
});

const SKILL_LABELS = Object.freeze({
  acb: "Advanced Combo Attack",
  assassinate: "Assassinate",
  "assassinate-bstep": "Assassinate + Boomerang Step",
  avenger: "Avenger",
  "barrage-demolition": "Barrage + Demolition",
  "barrage-dragon-strike": "Barrage + Dragon Strike",
  "brandish": "Brandish",
  "bstep-bot": "Boomerang Step + Band of Thieves",
  cannon: "Battleship Cannon",
  "dragon-strike-snatch": "Dragon Strike + Snatch",
  "hurricane": "Hurricane",
  "pa-1.75": "Piercing Arrow · 1.75s",
  "snipe-plus-7-strafe": "Snipe + 7 Strafe",
  "spear-crusher": "Spear Crusher",
  "tt-sp": "Triple Throw + Shadow Partner",
  torpedo: "Battleship Torpedo",
  "transform-dragon-strike-shockwave": "Transform + Dragon Strike + Shockwave"
});

export function normalizeLibrarySection(sectionId) {
  return LIBRARY_SECTIONS.includes(sectionId) ? sectionId : "classes";
}

export function normalizeLibraryStage(stageId) {
  return STAGE_ORDER.includes(stageId) ? stageId : "End-game";
}

export function normalizeLibraryCombat(combat = {}) {
  const attackBuff = combat.attackBuff
    ?? (combat.dragonBlood ? "dragonBlood" : combat.rage === false ? "none" : "rage");
  return {
    ...DEFAULT_COMBAT,
    ...combat,
    attackBuff,
    enrage: combat.enrage ?? combat.heroEnrage ?? DEFAULT_COMBAT.enrage,
    si: true
  };
}

export function buildLibraryModel({
  data,
  series = [],
  classId,
  stageId = "End-game",
  targetCount = 1,
  potionId = "apple",
  combat = DEFAULT_COMBAT,
  wdef = 0
} = {}) {
  const resolvedClassId = CLASS_ORDER.includes(classId) ? classId : CLASS_ORDER[0];
  const resolvedStageId = normalizeLibraryStage(stageId);
  const effectiveCombat = normalizeLibraryCombat(combat);
  const classData = data?.gearData?.classes?.[resolvedClassId] ?? {};
  const classSeries = series.find(item => item.classId === resolvedClassId)
    ?? buildSeriesForTarget({ data, targetCount, potionId, combat: effectiveCombat, wdef })
      .find(item => item.classId === resolvedClassId);
  const stages = STAGE_ORDER.map(stage => buildStageSnapshot({
    classId: resolvedClassId,
    stage,
    gear: classData.stages?.[stage],
    point: classSeries?.points?.find(item => item.stage === stage),
    combat: effectiveCombat
  }));

  const strategySeries = TARGET_COUNTS.map(target => {
    const targetSeries = target === targetCount && classSeries
      ? classSeries
      : buildSeriesForTarget({ data, targetCount: target, potionId, combat: effectiveCombat, wdef })
          .find(item => item.classId === resolvedClassId);
    const point = targetSeries?.points?.find(item => item.stage === resolvedStageId);
    return buildStrategyRow({
      classId: resolvedClassId,
      targetCount: target,
      point,
      skillData: data?.skillsData?.classes?.[resolvedClassId]
    });
  });

  return {
    classId: resolvedClassId,
    label: CLASS_META[resolvedClassId].label,
    color: CLASS_META[resolvedClassId].color,
    stageId: resolvedStageId,
    targetCount,
    potionId,
    combat: effectiveCombat,
    rangeModel: RANGE_MODELS_BY_CLASS[resolvedClassId] ?? UNKNOWN,
    source: classData.source ?? null,
    stages,
    slotTables: parseArchiveTables(data?.gearArchive, resolvedClassId),
    weaponEquipment: buildWeaponEquipment(data?.gearArchive, resolvedClassId),
    skillCards: buildSkillCards(resolvedClassId, data?.skillsData?.classes?.[resolvedClassId]),
    strategies: strategySeries,
    calculation: buildCalculationTrace({
      classId: resolvedClassId,
      stage: stages.find(item => item.stage === resolvedStageId),
      point: classSeries?.points?.find(item => item.stage === resolvedStageId),
      skillData: data?.skillsData?.classes?.[resolvedClassId],
      combat: effectiveCombat,
      targetCount
    }),
    raw: {
      gear: classData,
      skills: data?.skillsData?.classes?.[resolvedClassId] ?? null,
      buffs: data?.buffsData ?? null,
      potions: data?.potionsData ?? null
    }
  };
}

export function buildMechanicsModel(data) {
  const buffs = data?.buffsData ?? {};
  const potions = data?.potionsData?.potions ?? [];
  return {
    buffRows: [
      ["Maple Warrior", "Adds floor(base AP × level percentage) to base AP; never changes equipment stats.", "Lv 0–20"],
      ["Sharp Eyes", "Adds the source critical contribution where the class engine supports a switch.", "SE on/off"],
      ["Speed Infusion", "Canonical timing is used. Alternate attack-speed mappings are not yet verified.", "Fixed on"],
      ["Echo", "Multiplies the additive WA stack after potion and eligible buffs.", "×1.04"],
      ["Rage", "Adds +12 WA to the shared stack.", "Exclusive with Dragon Blood"],
      ["Dragon Blood", "Adds +12 WA for Dark Knight only.", "Exclusive with Rage"],
      ["Hero Enrage", "Uses the time-weighted WA average from the authoritative skill fixture.", "26 × 240/360 = 17.333 WA"]
    ],
    potionRows: potions.map(potion => [potion.label, `${potion.wa} WA`, "Additive before Echo"]),
    weaponRows: Object.entries(RANGE_MODELS_BY_CLASS).map(([id, model]) => [CLASS_META[id].label, model, rangeRule(id)]),
    ruleRows: [
      ["1 · Base AP → actual stats", "For each stat: actual = base + floor(base × ceil(MW level / 2) / 100) + equipment. MW supports levels 0–20. Example: 999 base, MW20 and 100 equipment gives 999 + 99 + 100 = 1198. Gear is never multiplied by MW."],
      ["2 · Attack stack", "Start with Clean WA (already including weapon, off-hand, ammunition/quiver and the model's passive WA). Add potion and eligible attack buffs once, then apply Echo ×1.04 when enabled. Rage and Dragon Blood are exclusive. Hero's model retains average Enrage 26 × 240/360; use the selected-class Calculation trace for the actual stack."],
      ["3 · Weapon range formulas", "Let A = WA/100, S = STR, D = DEX, L = LUK. Min/max: 2H sword (2.484S+D)A / (4.6S+D)A; spear (3.6S+D)A / (5S+D)A; knuckle (2.592S+D)A / (4.8S+D)A; gun (1.944D+S)A / (3.6D+S)A; bow (2.754D+S)A / (3.4D+S)A; crossbow (3.24D+S)A / (3.6D+S)A; claw/dagger (1.944L+D+S)A / (3.6L+D+S)A. These are the current normalized range models; skill-specific damage uses each class engine, not one universal range multiplier."],
      ["4 · Defense → skill lines", "For defense-sensitive ranges, subtract 0.6×WDEF from min and 0.5×WDEF from max, floor each at zero, then apply skill/critical/cap logic. Paladin applies its element before defense. Demolition ignores WDEF; Snipe uses its fixed-damage rule. This is a Lv200 same/lower-level-target model, not a higher-level-target formula."],
      ["5 · Expected capped damage", "The engine averages line damage over its range, caps each line at 199999, and combines normal/critical outcomes using the class probabilities. E[min(line damage, cap)] is not min(E[line damage], cap). Multi-line skills are not capped once as a total; class-specific ordering, including Piercing Arrow's cap-before-pierce rule, is retained."],
      ["6 · Rotation → DPM", "Combine expected line damage, lines per attack, attack/cycle timing and effective target count according to the class selector. Convert damage per second to per minute (×60); displayed m means divide by 1,000,000. Bucc averages ST/non-ST windows 75%/25%. Do not multiply a 1T result by target count when the rotation changes. Summon terms remain separately modeled contributions."],
      ["Clean range", "Always calculated from actual MW20 stats and clean WA; reference range is validation only."],
      ["Current range", "Uses the selected MW level, potion and eligible buffs. The chart X axis remains MW20 clean max."],
      ["Damage cap", "199,999 per line, with class-specific cap ordering retained by each engine."],
      ["Targets", "The interactive model supports 1T, 2T, 3T, 4T and 6T. 5T remains documentation-only."],
      ["WDEF", "Presets 0 / 1000 / 2000 / 3200 / 4000. Lv200 vs same/lower level: min − 0.6×WDEF, max − 0.5×WDEF before skill/crit/cap, after Paladin element. Snipe/Demolition ignore defense. Shockwave/summons: provisional; zero floor: model assumption."],
      ["Weapon branches", "Warrior BW and Axe formulas are not enabled until independently formulaized."]
    ],
    raw: { buffs, potions: data?.potionsData ?? null, gearRules: data?.gearData?.rules ?? null }
  };
}

export function buildValidationModel(data) {
  const versions = data?.versionsData ?? {};
  const sync = data?.syncData ?? {};
  const references = data?.referencesData ?? {};
  const wdef = versions.wdef ?? {};
  return {
    summaryRows: [
      ["Runtime model", versions.model?.version ?? UNKNOWN, versions.model?.integrationStatus ?? UNKNOWN],
      ["Source model", sync.sourceModelVersion ?? UNKNOWN, sync.integrationStatus ?? UNKNOWN],
      ["Retrieved", sync.retrievedOn ?? UNKNOWN, "Source recovery timestamp"],
      ["WDEF", `0–4000 · default ${wdef.default ?? 0}`, wdef.engineStatus ?? UNKNOWN],
      ["UI", versions.ui?.version ?? UNKNOWN, "Library renders normalized data and engine audits"]
    ],
    statusRows: [
      ["Confirmed inputs", "Integrated", "Gear aggregates and current class skill fixtures are loaded."],
      ["Warrior Advanced / Late", "Discussion-only", "Frozen totals remain; diagnostic linearized stats are not used."],
      ["Buccaneer workbook", "Open", "4T/6T direct engine output differs from the published slope result."],
      ["Reference DPM", "p.3 FINAL restored", "Nine Forum median/#1 pairs and DK/NL/Paladin Extreme. DPM follows the archived curve interpolation/extrapolation; not exact player damage."],
      ["WDEF engine", "Integrated · bounded", "v9.5 fixed sweep: End-game / Apple / 1,3,6T. Shockwave and summons remain VERIFY; other settings are regression-tested, not independent source validation."]
    ],
    referenceRows: (references.records ?? []).map(record => [
      CLASS_META[record.classId]?.label ?? record.classId,
      record.kind,
      record.label,
      Number.isFinite(record.cleanMin) ? `${formatNumber(record.cleanMin)}–${formatNumber(record.cleanMax)}` : formatNumber(record.cleanMax),
      Object.entries(record.dpmM ?? {}).map(([target, value]) => `${target}T ${value.toFixed(3)}m`).join("; ") || "Range only",
      record.status,
      record.source
    ]),
    sourceRows: (sync.sources ?? []).map(source => [source.title, source.url, source.finalMessageId ?? source.messageId ?? source.finalGearMessageId ?? "Message reference"]),
    pending: references.pending ?? [],
    raw: { versions, sync, references }
  };
}

function buildSeriesForTarget({ data, targetCount, potionId, combat, wdef }) {
  if (!data?.gearData || !data?.skillsData || !data?.potionsData) return [];
  return buildProgressionSeries({
    gearData: data.gearData,
    skillsData: data.skillsData,
    potionsData: data.potionsData,
    targetCount,
    potionId,
    combat,
    wdef
  });
}

function buildStageSnapshot({ classId, stage, gear, point, combat }) {
  const prepared = point?.prepared ?? (gear ? prepareGear(classId, stage, gear, combat.mwLevel) : null);
  const calculatedCleanRange = point?.cleanRange ?? (gear ? cleanRange(classId, stage, gear) : null);
  const audit = point?.audit ?? {};
  const ap = prepared?.ap ?? (gear ? baseAp(classId, stage) : {});
  const mw = Object.fromEntries(Object.entries(ap).map(([stat, value]) => [stat, Math.floor(value * mwPercent(combat.mwLevel) / 100)]));
  const confidence = gearConfidenceForStage(gear);
  return {
    stage,
    sourceConfidence: confidence,
    baseAp: ap,
    mw,
    equipmentStats: prepared?.equipmentStats ?? {},
    actualStats: prepared?.stats?.mw20 ?? {},
    cleanWa: prepared?.cleanWa ?? gear?.cleanWa ?? null,
    cleanRange: calculatedCleanRange,
    buffedRange: finiteRange(audit.buffedMin, audit.buffedMax),
    dpm: Number.isFinite(point?.dpm) ? point.dpm : null,
    selector: point?.selector ?? null,
    unavailable: point?.unavailable ?? null,
    audit
  };
}

function buildStrategyRow({ classId, targetCount, point, skillData }) {
  const plan = strategyPlan(classId, targetCount, point, skillData);
  return {
    targetCount,
    selector: point?.selector ?? null,
    plan: plan.plan,
    timing: plan.timing,
    targetRule: plan.targetRule,
    specialRule: plan.specialRule,
    dpm: Number.isFinite(point?.dpm) ? point.dpm : null,
    unavailable: point?.unavailable ?? null
  };
}

function strategyPlan(classId, targetCount, point, skillData) {
  const selector = point?.selector ?? selectorFor(classId, targetCount, skillData);
  const params = skillData?.params ?? skillData?.canonical?.params ?? {};
  if (classId === "hero") return {
    plan: "Brandish",
    timing: seconds(params.cycleSeconds),
    targetRule: "Up to 3 effective targets",
    specialRule: "Advanced Combo Attack multiplier is applied before the line cap."
  };
  if (classId === "dark-knight") return {
    plan: "Spear Crusher + Berserk",
    timing: seconds(params.cycleSeconds),
    targetRule: "Up to 3 effective targets",
    specialRule: "Rage or Dragon Blood supplies the exclusive +12 WA slot."
  };
  if (classId === "paladin") return {
    plan: targetCount === 1 ? "Blast · General Weak" : "Advanced Combo Attack · General Weak",
    timing: targetCount === 1 ? seconds(params.blastCycleSeconds) : seconds(params.acbCycleSeconds),
    targetRule: targetCount === 1 ? "Single target" : `${targetCount} targets`,
    specialRule: "General Weak elemental multiplier is the canonical condition."
  };
  if (classId === "bowmaster") return {
    plan: targetCount <= 3 ? "Hurricane + Phoenix" : "Arrow Rain + Phoenix",
    timing: targetCount <= 3 ? attacksPerMinute(params.hurricaneArrowsPerMinute) : attacksPerMinute(params.arrowRainArrowsPerMinute),
    targetRule: targetCount <= 3 ? "1–3T selector" : "4–6T selector",
    specialRule: "Phoenix is included as a summon contribution; geometry branches are excluded."
  };
  if (classId === "marksman") return {
    plan: targetCount <= 3 ? "Snipe + 7 Strafe" : "Piercing Arrow · 1.75s",
    timing: targetCount <= 3 ? seconds(skillData?.branches?.["snipe-plus-7-strafe"]?.params?.cycleSeconds) : seconds(skillData?.branches?.["pa-1.75"]?.params?.cycleSeconds),
    targetRule: targetCount <= 3 ? "1–3T selector" : "4–6T selector",
    specialRule: targetCount <= 3 ? "Pure Strafe remains a comparison branch." : "Successive target multiplier is applied after the first-target cap."
  };
  if (classId === "night-lord") return {
    plan: targetCount <= 3 ? "Triple Throw + Shadow Partner" : "Avenger",
    timing: targetCount <= 3 ? seconds(params.ttCycleSeconds) : seconds(params.avengerCycleSeconds),
    targetRule: targetCount <= 3 ? "1–3T selector" : "4–6T selector",
    specialRule: "Shadow Partner line contribution follows the class fixture."
  };
  if (classId === "corsair") return {
    plan: targetCount <= 2 ? "Battleship Cannon" : "Battleship Torpedo",
    timing: targetCount <= 2 ? seconds(params.cannonCycleSeconds) : "Per-second aggregate source",
    targetRule: targetCount <= 2 ? "1–2T selector" : "3–6T selector",
    specialRule: targetCount >= 3 ? "Torpedo SE-off coefficients are unavailable." : "Cannon uses Bullseye multiplier and source critical contribution."
  };
  if (classId === "shadower") return {
    plan: targetCount <= 2 ? "Assassinate + Boomerang Step" : "Boomerang Step + Band of Thieves",
    timing: targetCount <= 2 ? seconds(skillData?.branches?.["assassinate-bstep"]?.params?.cycleSeconds) : seconds(skillData?.branches?.["bstep-bot"]?.params?.cycleSeconds),
    targetRule: targetCount <= 2 ? "1–2T selector" : "3–6T selector",
    specialRule: "Canonical Shadower model uses SE-off timing and coefficients."
  };
  if (classId === "buccaneer") {
    const selectorData = skillData?.canonical?.exactModel?.selectors?.[String(targetCount)];
    const st = selectorData?.st;
    const nonSt = selectorData?.nonSt;
    return {
      plan: `ST 75%: ${rotationLabel(st)} · non-ST 25%: ${rotationLabel(nonSt)}`,
      timing: `ST ${seconds(st?.cycleSeconds)} · non-ST ${seconds(nonSt?.cycleSeconds)}`,
      targetRule: `${targetCount}T target multipliers from exactModel`,
      specialRule: "Barrage uses line-by-line cap; sustained output is weighted 75% ST / 25% non-ST."
    };
  }
  return { plan: selector ?? UNKNOWN, timing: UNKNOWN, targetRule: UNKNOWN, specialRule: UNKNOWN };
}

function selectorFor(classId, targetCount, skillData) {
  if (classId === "hero") return "brandish";
  if (classId === "dark-knight") return "spear-crusher";
  if (classId === "paladin") return targetCount === 1 ? "blast" : "acb";
  if (classId === "bowmaster") return targetCount <= 3 ? "hurricane" : "arrow-rain";
  if (classId === "marksman") return targetCount <= 3 ? "snipe-plus-7-strafe" : "pa-1.75";
  if (classId === "night-lord") return targetCount <= 3 ? "tt-sp" : "avenger";
  if (classId === "corsair") return targetCount <= 2 ? "cannon" : "torpedo";
  if (classId === "shadower") return targetCount <= 2 ? "assassinate-bstep" : "bstep-bot";
  if (classId === "buccaneer") return skillData?.canonical?.id ?? "sustained-cap-aware";
  return UNKNOWN;
}

function buildSkillCards(classId, data) {
  const params = data?.params ?? data?.canonical?.params ?? {};
  if (classId === "hero") return [skillCard("Brandish", "Canonical mainline", [
    fact("Skill power", percent(params.brandishSkillPct)),
    fact("Lines", value(params.lines)),
    fact("Target limit", value(data?.canonical?.targetCap)),
    fact("Cycle", seconds(params.cycleSeconds)),
    fact("SE critical add", percent(params.seSkillAdd)),
    fact("Combo multiplier", value(params.advancedComboAttackMultiplier))
  ], "Hero Enrage is time-averaged separately in the buff and calculation sections.")];
  if (classId === "dark-knight") return [
    skillCard("Spear Crusher", "Canonical mainline", [
      fact("Skill power", percent(params.skillPct)), fact("Lines", value(params.lines)),
      fact("Cycle", seconds(params.cycleSeconds)), fact("SE-on line coefficient", value(params.seAverageLineCoefficient)),
      fact("Berserk multiplier", value(params.berserkMultiplier))
    ], "Spear is the normal mainline weapon."),
    skillCard("Polearm Fury", "Alternate branch", [
      fact("Skill power", percent(data?.branches?.[0]?.params?.skillPct)),
      fact("Casts / minute", value(data?.branches?.[0]?.params?.castsPerMinute)),
      fact("Target coverage", targetWindow(data?.branches?.[0]?.targets)),
      fact("Weapon", data?.branches?.[0]?.gearOverride?.weapon)
    ], "The 5T crossover remains documentation-only; the archived polearm range is not treated as a revised exact gear build.")
  ];
  if (classId === "paladin") return [
    skillCard("Blast", "1T selector", [fact("Skill power", percent(params.blastSkill)), fact("Cycle", seconds(params.blastCycleSeconds)), fact("Lines", UNKNOWN)], "Line count is not provided in the current fixture."),
    skillCard("Advanced Combo Attack", "2T+ selector", [fact("Skill power", percent(params.acbSkill)), fact("Cycle", seconds(params.acbCycleSeconds)), fact("Lines", UNKNOWN)], `General Weak multiplier: ${value(params.elementMultipliers?.["general-weak"])}.`)
  ];
  if (classId === "bowmaster") return [
    skillCard("Hurricane", "1–3T selector", [fact("Skill power", percent(params.hurricaneNormalPct)), fact("Arrows / minute", value(params.hurricaneArrowsPerMinute)), fact("Critical base", percent(params.criticalBaseRate)), fact("SE critical add", percent(params.seCritRateAdd))]),
    skillCard("Arrow Rain", "4–6T selector", [fact("Skill power", percent(params.arrowRainNormalPct)), fact("Arrows / minute", value(params.arrowRainArrowsPerMinute)), fact("Critical base", percent(params.criticalBaseRate)), fact("SE critical add", percent(params.seCritRateAdd))]),
    skillCard("Phoenix", "Summon contribution", [fact("Skill power", percent(params.phoenixSkillPct)), fact("Attacks / minute", value(params.phoenixAttacksPerMinute)), fact("Max targets", value(data?.summon?.maxTargets))], "Bomb geometry and Inferno branches are outside the mainline selector.")
  ];
  if (classId === "marksman") return [
    skillCard("Snipe + 7 Strafe", "1–3T canonical strategy", [fact("Snipe damage", value(data?.branches?.["snipe-plus-7-strafe"]?.params?.snipeDamage)), fact("Rotation actions", value(data?.branches?.["snipe-plus-7-strafe"]?.params?.rotationActions)), fact("Cycle", seconds(data?.branches?.["snipe-plus-7-strafe"]?.params?.cycleSeconds)), fact("Strafe coefficient", value(data?.branches?.["snipe-plus-7-strafe"]?.params?.strafeExpectedCastCoeff))], "Pure Strafe is retained as a comparison branch only."),
    skillCard("Piercing Arrow", "4–6T canonical strategy", [fact("Cycle", seconds(data?.branches?.["pa-1.75"]?.params?.cycleSeconds)), fact("Successive target multiplier", value(data?.branches?.["pa-1.75"]?.params?.successiveTargetMultiplier)), fact("Cap order", data?.branches?.["pa-1.75"]?.params?.capOrder), fact("Base critical", percent(params.criticalBaseRate))], data?.branches?.["pa-1.75"]?.evidence ?? UNKNOWN),
    skillCard("Frostprey", "Summon contribution", [fact("Skill power", percent(params.frostpreySkillPct)), fact("Attacks / minute", value(params.frostpreyAttacksPerMinute)), fact("Max targets", value(data?.summon?.maxTargets))])
  ];
  if (classId === "night-lord") return [
    skillCard("Triple Throw + Shadow Partner", "1–3T selector", [fact("Skill power", percent(params.ttSkillPct)), fact("Critical throw rate", percent(params.criticalThrowRate)), fact("Shadow Partner lines", value(params.ttShadowPartnerLines)), fact("Cycle", seconds(params.ttCycleSeconds)), fact("SE critical add", percent(params.seSkillAdd))]),
    skillCard("Avenger", "4–6T selector", [fact("Skill power", percent(params.avengerSkillPct)), fact("Shadow Partner multiplier", value(params.avengerShadowPartnerMultiplier)), fact("Cycle", seconds(params.avengerCycleSeconds)), fact("SE critical add", percent(params.seSkillAdd))])
  ];
  if (classId === "corsair") return [
    skillCard("Battleship Cannon", "1–2T selector", [fact("Skill power", percent(params.cannonSkillPct)), fact("Lines", value(params.cannonLines)), fact("Cycle", seconds(params.cannonCycleSeconds)), fact("Bullseye multiplier", value(params.bullseyeMultiplier)), fact("SE critical add", percent(params.seSkillAdd))]),
    skillCard("Battleship Torpedo", "3–6T selector", [fact("Marked % / second", value(params.torpedoMarkedPctPerSecond)), fact("Secondary % / second", value(params.torpedoSecondaryPctPerSecond)), fact("Lines", UNKNOWN), fact("SE-off coefficient", "Not separated in current source")], "The current UI leaves multi-target SE-off DPM unavailable rather than estimating it.")
  ];
  if (classId === "shadower") return [
    skillCard("Assassinate + Boomerang Step", "1–2T selector", [fact("Assassinate power", percent(data?.branches?.["assassinate-bstep"]?.params?.assassinate?.skillPct)), fact("Assassinate lines", value(data?.branches?.["assassinate-bstep"]?.params?.assassinate?.lines)), fact("Boomerang Step power", percent(data?.branches?.["assassinate-bstep"]?.params?.boomerangStep?.skillPct)), fact("Boomerang Step lines", value(data?.branches?.["assassinate-bstep"]?.params?.boomerangStep?.lines)), fact("Cycle", seconds(data?.branches?.["assassinate-bstep"]?.params?.cycleSeconds))]),
    skillCard("Boomerang Step + Band of Thieves", "3–6T selector", [fact("Boomerang Step power", percent(data?.branches?.["bstep-bot"]?.params?.boomerangStep?.skillPct)), fact("Boomerang Step lines", value(data?.branches?.["bstep-bot"]?.params?.boomerangStep?.lines)), fact("Boomerang Step max targets", value(data?.branches?.["bstep-bot"]?.params?.boomerangStep?.maxTargets)), fact("Band of Thieves power", percent(data?.branches?.["bstep-bot"]?.params?.bandOfThieves?.skillPct)), fact("Band of Thieves max targets", value(data?.branches?.["bstep-bot"]?.params?.bandOfThieves?.maxTargets)), fact("Cycle", seconds(data?.branches?.["bstep-bot"]?.params?.cycleSeconds))], "Meso Explosion is excluded from the normal mainline.")
  ];
  if (classId === "buccaneer") return buildBuccSkillCards(data?.canonical?.exactModel);
  return [];
}

function buildBuccSkillCards(model) {
  const skills = model?.skills ?? {};
  return Object.entries(skills).map(([id, skill]) => {
    const lines = skill.lines ?? [];
    const normal = lines.map(line => value(line.coefficient)).join(" / ");
    const critical = lines.map(line => value(line.criticalCoefficient)).join(" / ");
    const multipliers = Object.entries(skill.targetMultipliers ?? {}).map(([target, multiplier]) => `${target}T ×${multiplier}`).join(" · ");
    return skillCard(titleCase(id), id === "barrage" ? "Six-part line model" : "Exact source skill", [
      fact("Lines", value(lines.length)),
      fact("Normal coefficients", normal || UNKNOWN),
      fact("Critical coefficients", critical || UNKNOWN),
      fact("Critical chance", percent(lines[0]?.criticalChance ?? skill.criticalChance)),
      fact("Target multipliers", multipliers || UNKNOWN),
      fact("Line-by-line cap", skill.lineByLineCap === true ? "Yes" : skill.lineByLineCap === false ? "No" : UNKNOWN)
    ], id === "barrage" ? `Line multipliers: ${(skill.lineMultipliers ?? []).join(" / ")}.` : "");
  });
}

function buildCalculationTrace({ classId, stage, point, skillData, combat, targetCount }) {
  const audit = point?.audit ?? {};
  const rows = [];
  rows.push({ step: "1 · Input", label: "Base AP", value: formatStats(stage?.baseAp), source: "Recovered AP profile" });
  rows.push({ step: "1 · Input", label: "MW contribution", value: formatStats(stage?.mw), source: `floor(AP × ${mwPercent(combat.mwLevel)}%)` });
  rows.push({ step: "1 · Input", label: "Equipment stats", value: formatStats(stage?.equipmentStats), source: "MW20 aggregate minus base AP and MW20 bonus" });
  rows.push({ step: "1 · Input", label: "Actual stats", value: formatStats(stage?.actualStats), source: `Current MW${combat.mwLevel} profile` });
  rows.push({ step: "1 · Input", label: "Clean WA", value: wa(stage?.cleanWa), source: "Gear aggregate" });
  rows.push({ step: "2 · WA stack", label: "Potion WA", value: wa(audit.potionWa), source: "Selected potion" });
  rows.push({ step: "2 · WA stack", label: "Additive buffs", value: wa(audit.buffAdditiveWa), source: classId === "hero" ? "Rage + time-averaged Enrage" : audit.buffSource ?? "Engine audit" });
  if (classId === "hero") rows.push({ step: "2 · WA stack", label: "Hero Enrage average", value: combat.enrage ? wa(skillData?.canonical?.params?.enrageAverageWa) : "Off", source: "Time-weighted skill fixture" });
  rows.push({ step: "2 · WA stack", label: "Pre-Echo WA", value: wa(audit.preEchoWa), source: "Clean WA + potion + additive buffs" });
  rows.push({ step: "2 · WA stack", label: "Echo", value: Number.isFinite(audit.echoMultiplier) ? `×${audit.echoMultiplier}` : UNKNOWN, source: audit.echoApplied === true ? "Applied" : audit.echoApplied === false ? "Off" : UNKNOWN });
  rows.push({ step: "2 · WA stack", label: "Calculation WA", value: wa(audit.calculationWa), source: "Engine audit" });
  rows.push({ step: "3 · Range", label: "MW20 clean range", value: rangeText(stage?.cleanRange), source: "Calculated from MW20 stats + clean WA" });
  rows.push({ step: "3 · Range", label: "Post-defense base range", value: rangeText(stage?.buffedRange), source: `Current stats + WA stack + WDEF ${audit.wdef ?? 0}` });
  rows.push({ step: "4 · Skill", label: "Selected skill / branch", value: audit.selectedSkill ?? point?.selector ?? UNKNOWN, source: "Class engine selector" });
  const seValue = audit.seEnabled ?? audit.seApplied;
  rows.push({
    step: "4 · Skill",
    label: "SE",
    value: seValue === undefined ? (combat.se ? "On" : "Off") : onOff(seValue),
    source: seValue === undefined ? "Global combat control; class audit does not repeat the switch" : "Engine audit"
  });
  rows.push({ step: "4 · Skill", label: "Target count", value: value(audit.targetCount ?? targetCount), source: "Interactive target selector" });
  rows.push({ step: "4 · Skill", label: "Effective targets", value: value(audit.effectiveTargetCount), source: "Class target cap" });
  rows.push({ step: "5 · Cap / rotation", label: "Cap state", value: audit.capState ? summarizeCapState(audit.capState) : UNKNOWN, source: audit.capState ? stringifyCapState(audit.capState) : "Engine audit not provided" });
  rows.push({ step: "5 · Cap / rotation", label: "Rotation", value: audit.rotations ? rotationSummary(audit.rotations) : point?.selector ?? UNKNOWN, source: audit.rotations ? "Engine audit" : "Engine selector" });
  if (audit.sustained) rows.push({ step: "5 · Cap / rotation", label: "ST / non-ST weighting", value: `${percent(audit.sustained.stUptime)} / ${percent(audit.sustained.nonStUptime)}`, source: `ST DPS ${number(audit.sustained.stDps)} · non-ST DPS ${number(audit.sustained.nonStDps)}` });
  rows.push({ step: "6 · Result", label: "DPM", value: Number.isFinite(point?.dpm) ? `${point.dpm.toFixed(3)}m` : point?.unavailable ?? "Unavailable", source: audit.formulaVersion ?? UNKNOWN });
  return rows;
}

function buildWeaponEquipment(markdown, classId) {
  const tables = parseArchiveTables(markdown, classId);
  const rows = tables.flatMap(table => table.rows.map(row => row.cells));
  const find = label => rows.find(row => row[0] === label)?.slice(1);
  const empty = Array(4).fill("Not applicable");
  let weapon;
  let offhand = empty;
  let ammo = empty;
  let note = "Weapon values are already included in the aggregate; do not add them again.";
  if (["bowmaster", "marksman"].includes(classId)) {
    const wa = find("Weapon WA (already included in Clean WA)");
    const names = find("Weapon family (confirmed progression)");
    const stats = find("Weapon stat");
    weapon = wa?.map((value, i) => `${names[i]}: ${value} WA; STR/DEX/WA stat row ${stats[i]}`);
    const source = rows.find(row => row[0] === (classId === "bowmaster" ? "Bowmaster" : "Marksman"));
    ammo = source?.[2]?.split("/").map(value => `${value.trim()} WA (quiver)`);
    note += " Quiver WA and class passive WA are separate from weapon WA.";
  } else if (["hero", "paladin", "dark-knight"].includes(classId)) {
    const label = classId === "dark-knight" ? "Dark Knight normal spear / Sky Ski" : "Hero / Paladin normal 2H sword";
    weapon = find(label)?.[0]?.split(",").map(value => `${value.trim()} WA/STR`);
  } else if (classId === "night-lord") {
    weapon = find("Claw")?.map(value => `${value} (WA/LUK)`);
    ammo = find("Star");
  } else if (classId === "shadower") {
    weapon = find("Dagger");
    offhand = find("Dragon Khanjar");
    note += " Dagger and shield stat entries are representative, not exact slot reconstructions.";
  } else if (classId === "corsair") {
    weapon = find("Gun")?.map(value => `${value} WA; attached stats: not separately archived`);
    ammo = find("Bullet WA")?.map(value => `${value} WA (bullet)`);
  } else if (classId === "buccaneer") {
    weapon = find("Weapon")?.map(value => `${value} (STR/DEX/WA)`);
  }
  return { weapon: weapon ?? Array(4).fill(UNKNOWN), offhand, ammo: ammo ?? Array(4).fill(UNKNOWN), note };
}

function parseArchiveTables(markdown, classId) {
  const headings = ARCHIVE_HEADINGS[classId] ?? [];
  const sections = headings.map(heading => archiveSection(markdown, heading)).filter(Boolean);
  const tables = sections.flatMap(section => parseMarkdownTables(section));
  // The archive stores archer WA in a separate, class-oriented table. Surface
  // that existing value beside the four-stage slot rows, without adding WA to
  // the runtime aggregate a second time.
  if (["bowmaster", "marksman"].includes(classId)) {
    const label = classId === "bowmaster" ? "Bowmaster" : "Marksman";
    const attackRow = tables.flatMap(table => table.rows).find(row => row[0] === label);
    const slots = tables.find(table => table.headers[0]?.startsWith("Slot"));
    if (attackRow && slots) {
      const stages = attackRow[1].split("/").map(value => value.trim());
      if (stages.length === 4) {
        slots.rows.push(["Weapon WA (already included in Clean WA)", ...stages]);
        slots.rows.push(["Weapon family (confirmed progression)",
          ...Array(3).fill(classId === "bowmaster" ? "Nisrock" : "Neschere"),
          classId === "bowmaster" ? "Dragon Shiner Bow" : "Dragon Shiner Cross"]);
      }
    }
  }
  const replace = (pattern, values) => {
    for (const table of tables) for (const row of table.rows) {
      if (pattern.test(row[0])) row.splice(1, row.length - 1, ...values);
    }
  };
  if (classId !== "corsair") {
    replace(/^Shoulder/, classId === "shadower" ? ["2/2/2", "2/2/2", "2/2/2", "3/3/3"]
      : classId === "night-lord" ? ["2/2", "2/2", "2/2", "3/3"] : ["2/2/0", "2/2/0", "2/2/0", "3/3/0"]);
    const thief = ["shadower", "night-lord"].includes(classId);
    replace(/^Belt/, classId === "shadower" ? ["5/8/5/0", "5/9/5/0", "3/3/3/2", "7/7/7/6"]
      : thief ? ["8/5/0", "9/5/0", "3/3/2", "7/7/6"]
      : [classId === "buccaneer" ? "White Dojo 1/4/0 (INT/LUK +1 each)" : "5/5/0", "3/3/2", "3/3/2", "7/7/6"]);
  }
  if (classId === "buccaneer") {
    replace(/^Eye$/, ["Toad Band 3/0/0", "Toad Band 5/0/0", "Toad Band 8/0/0", "Toad Band 12/0/0"]);
    replace(/^Face$/, ["Shining Nose 5/5/0", "Shining Nose 5/5/0", "Shining Nose 5/5/0", "Maple Leaf 18/0/0"]);
    replace(/^Earring$/, ["2/12/0", "12/2/0", "14/2/0", "18/2/0"]);
    replace(/^Rings aggregate$/, ["10/10/0", "14/15/0", "20/20/1", "26/26/1"]);
  }
  if (classId === "bowmaster") replace(/^Earring$/, ["12/2/0", "2/15/0", "2/18/0", "2/20/0"]);
  if (classId === "shadower") {
    replace(/^Face$/, ["5/5/5 STR/DEX/LUK", "5/5/5 STR/DEX/LUK", "5/5/10 STR/DEX/LUK", "0/0/15 STR/DEX/LUK"]);
    replace(/^Eye$/, ["~1/8/0 STR/DEX/LUK", "~3/10/0 STR/DEX/LUK", "3/8/3 STR/DEX/LUK", "3/8/5 STR/DEX/LUK"]);
    replace(/^Earring$/, ["~2/12/2 STR/DEX/LUK", "~2/16/2 STR/DEX/LUK", "2/2/18 STR/DEX/LUK", "2/2/20 STR/DEX/LUK"]);
    replace(/^Face \+ Eye CS budget$/, Array(4).fill("Included in face/eye values; do not add again"));
    replace(/^Medal$/, ["QV 7-all, 0 WA", "QV 7-all, 0 WA", "QV 7-all, 0 WA", "0 stats, 3 WA"]);
  }
  return tables.map(tableData => ({
    caption: tableData.caption,
    headers: tableData.headers,
    rows: tableData.rows.map(cells => ({
      cells,
      confidence: classifyGearConfidence(cells)
    }))
  }));
}

function archiveSection(markdown, heading) {
  if (typeof markdown !== "string") return "";
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) return "";
  const rest = markdown.slice(start + marker.length);
  const next = rest.search(/\r?\n## /);
  return next < 0 ? rest : rest.slice(0, next);
}

function parseMarkdownTables(section) {
  const lines = section.split(/\r?\n/);
  const tables = [];
  let block = [];
  let caption = "Source gear table";
  let preceding = "";
  const flush = () => {
    if (block.length >= 2) {
      const toCells = line => line.split("|").slice(1, -1).map(cell => cell.replace(/`/g, "").replace(/\*\*/g, "").trim());
      const rows = block.slice(2).map(toCells).filter(row => row.length > 0);
      tables.push({ caption: preceding || caption, headers: toCells(block[0]), rows });
    }
    block = [];
    preceding = "";
  };
  for (const line of lines) {
    if (line.trim().startsWith("|")) {
      block.push(line.trim());
      continue;
    }
    flush();
    const clean = line.replace(/^\*\*(.*?)\*\*:?$/, "$1").replace(/:$/, "").trim();
    if (clean && !clean.startsWith("#") && !clean.startsWith("Base AP") && !clean.startsWith("The ")) preceding = clean;
  }
  flush();
  return tables;
}

function classifyGearConfidence(cells) {
  const text = cells.join(" ").toLowerCase();
  if (/^pioneer$/i.test(cells[0] ?? "")) return "confirmedTotal";
  if (/(aggregate|budget|gear str\/dex|mw20|face \+ eye|cgs)/i.test(text)) return "confirmedTotal";
  if (/[~]|representative|mixed|flexible|target stat|near-perfect|band|\d+\s*[–-]\s*\d+/i.test(text)) return "representative";
  return "exact";
}

function gearConfidenceForStage(gear) {
  if (!gear) return "confirmedTotal";
  return gear.pendingStatBreakdown === false ? "confirmedTotal" : "representative";
}

function rangeRule(classId) {
  if (["hero", "paladin", "dark-knight"].includes(classId)) return "Weapon-specific warrior formula";
  if (["bowmaster", "marksman"].includes(classId)) return "DEX weapon formula";
  if (["night-lord", "shadower"].includes(classId)) return "LUK weapon formula";
  return "Pirate weapon formula";
}

function skillCard(name, role, facts, note = "") { return { name, role, facts, note }; }
function fact(label, valueText) { return { label, value: valueText ?? UNKNOWN }; }
function finiteRange(min, max) { return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : null; }
function formatStats(stats = {}) { const values = Object.entries(stats ?? {}).filter(([, v]) => Number.isFinite(v)).map(([key, v]) => `${key.toUpperCase()} ${formatNumber(v)}`); return values.length ? values.join(" · ") : UNKNOWN; }
function rangeText(range) { return range ? `${formatNumber(range.min)}–${formatNumber(range.max)}` : UNKNOWN; }
function value(input) { return Number.isFinite(input) ? formatNumber(input, Number.isInteger(input) ? 0 : 2) : input === null ? "None" : UNKNOWN; }
function number(input) { return Number.isFinite(input) ? formatNumber(input, 0) : UNKNOWN; }
function wa(input) { return Number.isFinite(input) ? `${formatNumber(input, 3)} WA` : UNKNOWN; }
function percent(input) { return Number.isFinite(input) ? `${formatNumber(input * 100, 2)}%` : UNKNOWN; }
function seconds(input) { return Number.isFinite(input) ? `${formatNumber(input, 4)}s` : UNKNOWN; }
function attacksPerMinute(input) { return Number.isFinite(input) ? `${formatNumber(input, 2)} attacks/min` : UNKNOWN; }
function targetWindow(targets) { return Array.isArray(targets) && targets.length ? targets.join(" / ") + "T" : UNKNOWN; }
function titleCase(id) { return String(id).split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
function rotationLabel(rotation) { return rotation?.id ? (SKILL_LABELS[rotation.id] ?? titleCase(rotation.id)) : UNKNOWN; }
function rotationSummary(rotations) { return Object.entries(rotations).map(([key, id]) => `${key}: ${SKILL_LABELS[id] ?? titleCase(id)}`).join(" · "); }
function stringifyCapState(state) { return typeof state === "string" ? state : Object.entries(state).map(([key, valueText]) => `${key}=${typeof valueText === "object" ? JSON.stringify(valueText) : valueText}`).join(" · "); }
function onOff(input) { return input ? "On" : "Off"; }
