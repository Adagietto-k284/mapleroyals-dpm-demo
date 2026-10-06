import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CLASS_ENGINES } from "../engine/index.js";
import {
  WDEF_FORMULA,
  WDEF_MAX,
  WDEF_MIN,
  WDEF_PRESETS,
  WDEF_SPEC_VERSION
} from "../engine/defense.js";

const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));
const OUTPUT_PATH = join(
  REPO_ROOT,
  "reference",
  "audits",
  "mapleroyals_wdef_v9_5_0_endgame_apple_sweep.json"
);
const GEAR_PATH = join(REPO_ROOT, "data", "gear.json");
const SKILLS_PATH = join(REPO_ROOT, "data", "skills.json");

const gearData = readJson(GEAR_PATH);
const skillsData = readJson(SKILLS_PATH);
const CLASS_IDS = Object.freeze([
  "hero",
  "dark-knight",
  "paladin",
  "bowmaster",
  "marksman",
  "night-lord",
  "corsair",
  "shadower",
  "buccaneer"
]);
const TARGET_COUNTS = Object.freeze([1, 3, 6]);

const rows = [];
for (const wdef of WDEF_PRESETS) {
  for (const targetCount of TARGET_COUNTS) {
    for (const classId of CLASS_IDS) {
      const result = evaluate(classId, targetCount, wdef);
      rows.push({
        wdef,
        targetCount,
        classId,
        selector: result.selector,
        dpmM: result.dpm,
        buffedMin: result.audit.buffedMin,
        buffedMax: result.audit.buffedMax,
        capState: result.audit.capState,
        formulaVersion: result.audit.formulaVersion,
        defenseStatus: result.audit.defenseStatus,
        summonDefense: result.audit.summonDefense ?? null,
        notes: result.audit.defense ?? null
      });
    }
  }
}

const summary = Object.fromEntries(CLASS_IDS.map(classId => {
  const byTarget = Object.fromEntries(TARGET_COUNTS.map(targetCount => {
    const values = rows
      .filter(row => row.classId === classId && row.targetCount === targetCount)
      .sort((a, b) => a.wdef - b.wdef);
    const atZero = values[0].dpmM;
    const at4000 = values.at(-1).dpmM;
    return [String(targetCount), {
      wdef0DpmM: atZero,
      wdef4000DpmM: at4000,
      lossFractionAt4000: 1 - at4000 / atZero,
      nonincreasing: values.every((row, index) => index === 0 || row.dpmM <= values[index - 1].dpmM + 1e-9)
    }];
  }));
  const lossFractions = Object.values(byTarget).map(value => value.lossFractionAt4000);
  return [classId, {
    byTarget,
    meanLossFractionAt4000: lossFractions.reduce((sum, value) => sum + value, 0) / lossFractions.length
  }];
}));

const audit = {
  schemaVersion: "1.0.0",
  auditVersion: "v9.5.0-wdef-v0.1",
  generatedBy: "scripts/wdef-sweep.mjs",
  sourceModelVersion: "v9.5.0",
  conditions: {
    attackerLevel: 200,
    targetLevel: "same-or-lower",
    stage: "End-game",
    potion: { id: "apple", wa: 100 },
    fullBuffs: {
      mwLevel: 20,
      se: true,
      si: true,
      echo: true,
      attackBuff: "rage",
      heroEnrage: "average (+17.333333333333332 WA)"
    },
    targetCounts: TARGET_COUNTS,
    classes: CLASS_IDS
  },
  defense: {
    specVersion: WDEF_SPEC_VERSION,
    allowedRange: { min: WDEF_MIN, max: WDEF_MAX },
    presets: WDEF_PRESETS,
    formula: WDEF_FORMULA,
    lowDamageBoundary: "max(0, raw defended base range); negative damage is unsupported"
  },
  skillPolicies: {
    marksman: "1–3T Snipe + 7 Strafe; 4–6T PA 1.75s",
    buccaneer: "Demolition immune per skill; Shockwave generic WDEF-sensitive assumption",
    summons: "Phoenix/Frostprey use generic base-range WDEF treatment; exact summon defense VERIFY",
    excluded: ["Krex", "MM selector expansion", "BW/Axe research", "summon mechanics research"]
  },
  historicalComparison: {
    archivedAudit: "reference/audits/mapleroyals_wdef_endgame_apple_sweep_v0_1.csv",
    archivedModelVersion: "v9.4.2",
    oldQualitativeLabels: {
      higherSensitivity: ["night-lord", "corsair", "bowmaster"],
      moderate: ["buccaneer", "shadower"],
      lower: ["hero", "dark-knight"],
      protectedOrBranchDependent: ["marksman", "paladin"]
    },
    comparisonMethod: "Compare current v9.5 lossFractionAt4000 and ranking rows; archived values are evidence, not current inputs."
  },
  summary,
  rows
};

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Wrote ${rows.length} rows to ${OUTPUT_PATH}`);

function evaluate(classId, targetCount, wdef) {
  const buffs = {
    rage: true,
    echo: true,
    ...(classId === "shadower" ? {} : { se: true }),
    ...(classId === "hero"
      ? { enrage: true, enrageAverageWa: 17.333333333333332 }
      : {})
  };
  const options = classId === "paladin"
    ? { condition: "general-weak" }
    : {};
  return CLASS_ENGINES[classId].evaluate({
    gear: gearData.classes[classId].stages["End-game"],
    skillData: skillsData.classes[classId],
    potionWa: 100,
    targetCount,
    wdef,
    buffs,
    options
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
