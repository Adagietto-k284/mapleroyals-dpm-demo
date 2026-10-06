import { publicSourceData } from "./public-sources.js";
import {
  CLASS_META,
  CLASS_ORDER,
  STAGE_ORDER,
  TARGET_COUNTS,
  buildProgressionSeries,
  formatDpm,
  formatNumber,
  formatRange,
  getPotion,
  summarizeCapState
} from "./ui-model.js";
import { DEFAULT_COMBAT } from "./engine/profile.js";
import { renderLibrary } from "./ui-library.js";
import { mountPreset, USER_PRESET_STORAGE_KEY } from "./ui-preset.js";
import { evaluatePreset } from "./engine/user-preset.js";
import { getLanguage, setLanguage, tr, localizeText, localizePage } from "./ui-i18n.js";
import {
  REFERENCE_FILTER_KEYS,
  normalizeReferenceFilters,
  selectReferences
} from "./ui-references.js";

const DEFAULT_UI_COMBAT = Object.freeze({
  ...DEFAULT_COMBAT,
  rage: DEFAULT_COMBAT.attackBuff === "rage",
  heroEnrage: DEFAULT_COMBAT.enrage,
  dragonBlood: false
});

const REFERENCE_INPUT_IDS = Object.freeze({
  forumMedian: "reference-forum-median",
  forumFirst: "reference-forum-first",
  extreme: "reference-extreme",
  fury: "reference-fury"
});

const NO_FOCUS_APPLIED = Symbol("no-focus-applied");
const PRESET_COUNT = 3;
const PRESET_NAMES_KEY = "mapleroyals.user-preset.names.v1";
const PRESET_COLORS = ["#55a7ff", "#ffab55", "#c894ff"];
let focusRafHandle = null;
let focusUpdatePromise = Promise.resolve();
const presetEditors = [];

const state = {
  data: null,
  page: "progression",
  combat: { ...DEFAULT_UI_COMBAT },
  showReferences: true,
  referenceVisibility: normalizeReferenceFilters(),
  libraryClass: "hero",
  librarySection: "classes",
  libraryStage: "End-game",
  targetCount: 1,
  potionId: "apple",
  wdef: 0,
  visibleClasses: new Set(CLASS_ORDER),
  hoveredClass: null,
  pinnedClass: null,
  progressionViewport: null,
  progressionViewportKey: null,
  progressionFitRevision: 0,
  yZeroAxis: true,
  progressionRendering: false,
  progressionEventsBound: false,
  progressionPlotRevision: 0,
  appliedFocus: NO_FOCUS_APPLIED,
  appliedFocusPlotRevision: -1,
  focusRequestRevision: 0,
  calculationCache: null,
  progressionRenderKey: null,
  libraryRenderKey: null,
  activePresetSlot: 0,
  presetNames: readPresetNames(),
  presetInputs: Array(PRESET_COUNT).fill(null),
  presetResults: Array(PRESET_COUNT).fill(null),
  presetRevision: 0
};

const elements = {
  targetControls: document.querySelector("#target-controls"),
  potionSelect: document.querySelector("#potion-select"),
  wdefSelect: document.querySelector("#wdef-select"),
  classToggles: document.querySelector("#class-toggles"),
  classBuffControls: document.querySelector("#class-buff-controls"),
  classBuffEmpty: document.querySelector("#class-buff-empty"),
  mwSelect: document.querySelector("#mw-select"),
  seToggle: document.querySelector("#se-toggle"),
  siToggle: document.querySelector("#si-toggle"),
  echoToggle: document.querySelector("#echo-toggle"),
  rageToggle: document.querySelector("#rage-toggle"),
  resetCombat: document.querySelector("#reset-combat"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error-message"),
  status: document.querySelector("#result-status"),
  progressionChart: document.querySelector("#progression-chart"),
  progressionEmpty: document.querySelector("#progression-empty"),
  progressionFocusStatus: document.querySelector("#progression-focus-status"),
  progressionNotes: document.querySelector("#progression-notes"),
  progressionCaption: document.querySelector("#progression-caption"),
  referenceControls: document.querySelector("#reference-controls"),
  referenceList: document.querySelector("#reference-list"),
  rangeReferenceSection: document.querySelector("#range-reference-section"),
  rangeReferenceChart: document.querySelector("#range-reference-chart"),
  rangeReferenceEmpty: document.querySelector("#range-reference-empty"),
  fitVisible: document.querySelector("#fit-visible"),
  yZeroToggle: document.querySelector("#y-zero-toggle"),
  libraryClass: document.querySelector("#library-class"),
  libraryStage: document.querySelector("#library-stage"),
  libraryContext: document.querySelector("#library-context"),
  librarySectionTabs: document.querySelectorAll("[data-library-section]"),
  presetTabs: document.querySelector("#preset-tabs"),
  presetName: document.querySelector("#preset-name"),
  presetComparison: document.querySelector("#preset-comparison"),
  languageSelect: document.querySelector("#language-select")
};

bindControls();
bindNavigation();
syncCombatState();
loadApp();

async function loadApp() {
  setLoading(true);
  try {
    const [gearData, skillsData, potionsData, versionsData, buffsData, syncData, referencesData, gearArchive] = await Promise.all([
      loadJson("./data/gear.json"),
      loadJson("./data/skills.json"),
      loadJson("./data/potions.json"),
      loadJson("./data/versions.json"),
      loadJson("./data/buffs.json"),
      loadJson("./data/model-sync-v9.5.0.json"),
      loadJson("./data/chart-references.json"),
      fetch("./reference/archive/mapleroyals_gear_model_archive_v9_4_2.md").then(response => {
        if (!response.ok) throw new Error("Gear archive unavailable");
        return response.text();
      })
    ]);
    state.data = { gearData, skillsData, potionsData, versionsData, buffsData, syncData, referencesData, gearArchive };
    let mountingPresets = true;
    for (let slot = 0; slot < PRESET_COUNT; slot++) {
      presetEditors[slot] = mountPreset(document.querySelector(`#preset-editor-${slot}`), {
        storageKey: slot === 0 ? USER_PRESET_STORAGE_KEY : `${USER_PRESET_STORAGE_KEY}.slot${slot + 1}`,
        onChange(input) {
          state.presetInputs[slot] = input;
          state.presetResults[slot] = null;
          state.presetRevision += 1;
          state.progressionRenderKey = null;
          state.progressionViewport = null;
          if (!mountingPresets) {
            renderClassBuffControls();
            render();
          }
        }
      });
    }
    mountingPresets = false;
    renderPresetTabs();
    populatePotionOptions(potionsData);
    populateClassToggles();
    renderClassBuffControls();
    for (const classId of CLASS_ORDER) {
      const option = document.createElement("option");
      option.value = classId;
      option.textContent = CLASS_META[classId].label;
      elements.libraryClass.append(option);
    }
    populateLibraryStageOptions();
    syncCombatControls();
    syncReferenceControls();
    applyRoute();
    render();
    setLoading(false);
  } catch (error) {
    setLoading(false);
    showError(error instanceof Error ? error.message : String(error));
  }
}

async function loadJson(path) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw new Error(`Unable to load ${path} (${response.status}).`);
  return publicSourceData(await response.json());
}

function bindControls() {
  elements.languageSelect.value = getLanguage();
  document.documentElement.lang = getLanguage();
  elements.languageSelect.addEventListener("change", event => setLanguage(event.target.value));
  window.addEventListener("languagechange", () => {
    state.progressionRenderKey = null;
    state.libraryRenderKey = null;
    renderPresetTabs();
    applyRoute();
    render();
    localizePage();
  });
  elements.rangeReferenceSection.addEventListener("toggle", () => {
    if (state.page === "progression" && state.data) renderRangeReferenceChart(getSelectedReferences());
  });
  window.addEventListener("themechange", () => {
    state.progressionRenderKey = null;
    state.libraryRenderKey = null;
    render();
  });
  elements.wdefSelect.addEventListener("change", event => {
    state.wdef = Number(event.target.value);
    requestProgressionFit();
    render();
  });
  elements.targetControls.addEventListener("click", event => {
    const button = event.target.closest("button[data-target]");
    if (!button) return;
    state.targetCount = Number(button.dataset.target);
    updateTargetButtons();
    requestProgressionFit();
    render();
  });

  elements.potionSelect.addEventListener("change", event => {
    state.potionId = event.target.value;
    requestProgressionFit();
    render();
  });


  elements.classToggles.addEventListener("change", event => {
    const input = event.target.closest("input[data-class-id]");
    if (!input) return;
    if (input.checked) state.visibleClasses.add(input.dataset.classId);
    else state.visibleClasses.delete(input.dataset.classId);
    if (!input.checked && state.pinnedClass === input.dataset.classId) {
      state.pinnedClass = null;
      state.hoveredClass = null;
    }
    renderClassBuffControls();
    requestProgressionFit();
    render();
  });

  elements.mwSelect.addEventListener("change", event => {
    state.combat.mwLevel = Number(event.target.value);
    requestProgressionFit();
    render();
  });

  elements.seToggle.addEventListener("change", event => {
    state.combat.se = event.target.checked;
    requestProgressionFit();
    render();
  });

  elements.echoToggle.addEventListener("change", event => {
    state.combat.echo = event.target.checked;
    requestProgressionFit();
    render();
  });

  elements.rageToggle.addEventListener("change", event => {
    state.combat.rage = event.target.checked;
    if (state.combat.rage) state.combat.dragonBlood = false;
    syncCombatState();
    syncCombatControls();
    requestProgressionFit();
    render();
  });

  elements.classBuffControls.addEventListener("change", event => {
    const input = event.target.closest("input[data-owned-buff]");
    if (!input) return;
    if (input.dataset.ownedBuff === "heroEnrage") {
      state.combat.heroEnrage = input.checked;
    }
    if (input.dataset.ownedBuff === "dragonBlood") {
      state.combat.dragonBlood = input.checked;
      if (input.checked) state.combat.rage = false;
    }
    syncCombatState();
    syncCombatControls();
    requestProgressionFit();
    render();
  });

  elements.resetCombat.addEventListener("click", () => {
    state.combat = { ...DEFAULT_UI_COMBAT };
    syncCombatState();
    syncCombatControls();
    requestProgressionFit();
    render();
  });

  for (const key of REFERENCE_FILTER_KEYS) {
    document.querySelector(`#${REFERENCE_INPUT_IDS[key]}`).addEventListener("change", event => {
      state.referenceVisibility[key] = event.target.checked;
      requestProgressionFit();
      render();
    });
  }

  elements.fitVisible.addEventListener("click", () => {
    requestProgressionFit();
    render();
  });

  elements.yZeroToggle.addEventListener("change", () => {
    state.yZeroAxis = elements.yZeroToggle.checked;
    requestProgressionFit();
    render();
  });

  elements.presetTabs.addEventListener("click", event => {
    const button = event.target.closest("button[data-preset-slot]");
    if (!button) return;
    const slot = Number(button.dataset.presetSlot);
    if (!Number.isInteger(slot) || slot < 0 || slot >= PRESET_COUNT) return;
    state.activePresetSlot = slot;
    renderPresetTabs();
    renderClassBuffControls();
    renderComparison();
    localizePage();
  });
  elements.presetTabs.addEventListener("keydown", event => {
    const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -state.activePresetSlot, End: PRESET_COUNT - 1 - state.activePresetSlot };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const slot = (state.activePresetSlot + keys[event.key] + PRESET_COUNT) % PRESET_COUNT;
    elements.presetTabs.querySelector(`button[data-preset-slot="${slot}"]`)?.click();
    elements.presetTabs.querySelector(`button[data-preset-slot="${slot}"]`)?.focus();
  });
  elements.presetName.addEventListener("change", event => {
    const slot = state.activePresetSlot;
    const entered = event.target.value.trim().slice(0, 30);
    state.presetNames[slot] = entered === `配裝 ${slot + 1}` || !entered ? `Preset ${slot + 1}` : entered;
    persistPresetNames();
    renderPresetTabs();
    renderComparison();
    state.presetRevision += 1;
    render();
  });
}

function bindNavigation() {
  window.addEventListener("hashchange", () => {
    applyRoute();
    render();
  });

  for (let level = 0; level <= 20; level++) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = `${level === 0 ? "Off" : `Lv ${level}`} · ${Math.ceil(level / 2)}%`;
    option.selected = level === DEFAULT_UI_COMBAT.mwLevel;
    elements.mwSelect.append(option);
  }

  elements.librarySectionTabs.forEach(button => button.addEventListener("click", event => {
    state.librarySection = event.currentTarget.dataset.librarySection;
    syncLibraryControls();
    render();
  }));
  elements.libraryClass.addEventListener("change", event => {
    state.libraryClass = event.target.value;
    render();
  });
  elements.libraryStage.addEventListener("change", event => {
    state.libraryStage = event.target.value;
    render();
  });
}

function populatePotionOptions(potionsData) {
  elements.potionSelect.replaceChildren();
  for (const potion of potionsData.potions) {
    const option = document.createElement("option");
    option.value = potion.id;
    option.textContent = `${potion.label} · ${potion.wa} WA`;
    option.selected = potion.id === state.potionId;
    elements.potionSelect.append(option);
  }
}


function populateLibraryStageOptions() {
  elements.libraryStage.replaceChildren();
  for (const stage of STAGE_ORDER) {
    const option = document.createElement("option");
    option.value = stage;
    option.textContent = stage;
    option.selected = stage === state.libraryStage;
    elements.libraryStage.append(option);
  }
}

function populateClassToggles() {
  elements.classToggles.replaceChildren();
  for (const classId of CLASS_ORDER) {
    const meta = CLASS_META[classId];
    const label = document.createElement("label");
    label.className = "class-toggle";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = state.visibleClasses.has(classId);
    input.dataset.classId = classId;

    const swatch = document.createElement("span");
    swatch.className = "class-swatch";
    swatch.style.backgroundColor = meta.color;
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = meta.label;

    label.append(input, swatch, text);
    elements.classToggles.append(label);
  }
}

function readPresetNames() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRESET_NAMES_KEY));
    if (Array.isArray(saved)) return Array.from({ length: PRESET_COUNT }, (_, slot) =>
      typeof saved[slot] === "string" && saved[slot].trim()
        ? saved[slot].trim().slice(0, 30)
        : `Preset ${slot + 1}`);
  } catch { /* Storage is optional. */ }
  return Array.from({ length: PRESET_COUNT }, (_, slot) => `Preset ${slot + 1}`);
}

function persistPresetNames() {
  try { localStorage.setItem(PRESET_NAMES_KEY, JSON.stringify(state.presetNames)); } catch { /* Keep session names. */ }
}

function displayPresetName(slot) {
  const name = state.presetNames[slot];
  return name === `Preset ${slot + 1}` ? tr(name, `配裝 ${slot + 1}`) : name;
}

function renderPresetTabs() {
  for (const button of elements.presetTabs.querySelectorAll("button[data-preset-slot]")) {
    const slot = Number(button.dataset.presetSlot);
    const active = slot === state.activePresetSlot;
    button.textContent = displayPresetName(slot);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    document.querySelector(`#preset-editor-${slot}`).hidden = !active;
  }
  elements.presetName.value = displayPresetName(state.activePresetSlot);
}

function renderComparison() {
  const container = elements.presetComparison;
  container.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = "Preset comparison";
  container.append(heading);
  const table = document.createElement("table");
  table.className = "preset-comparison-table";
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["Preset", "Class", "MW20 Clean Max", "DPM", "Status"]) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    headerRow.append(cell);
  }
  head.append(headerRow);
  table.append(head);
  const body = document.createElement("tbody");
  for (let slot = 0; slot < PRESET_COUNT; slot++) {
    const row = document.createElement("tr");
    if (slot === state.activePresetSlot) row.className = "is-active";
    const result = state.presetResults[slot];
    const input = state.presetInputs[slot];
    const values = [
      displayPresetName(slot),
      input ? CLASS_META[input.classId]?.label ?? input.classId : "—",
      result?.valid ? formatNumber(result.mw20Range.max) : "—",
      result?.valid ? `${result.dpm.toFixed(2)}m` : "—",
      result?.valid ? "Ready" : input ? "Invalid" : "Not calculated"
    ];
    values.forEach((value, index) => {
      const cell = document.createElement(index === 0 ? "th" : "td");
      if (index === 0) cell.scope = "row";
      cell.textContent = value;
      if (index === 0) cell.style.setProperty("--preset-color", PRESET_COLORS[slot]);
      row.append(cell);
    });
    body.append(row);
  }
  table.append(body);
  container.append(table);
}

function renderClassBuffControls() {
  elements.classBuffControls.replaceChildren();
  const visibleOwnedClasses = [];
  const presetClass = presetEditors[state.activePresetSlot]?.getClassId?.() ?? "hero";
  const owns = classId => state.page === "user-preset"
    ? presetClass === classId
    : state.visibleClasses.has(classId) || state.presetInputs.some(input => input?.classId === classId);

  if (owns("hero")) {
    visibleOwnedClasses.push("hero");
    elements.classBuffControls.append(createOwnedBuffControl({
      classId: "hero",
      buffId: "heroEnrage",
      label: "Hero Enrage average",
      checked: state.combat.heroEnrage
    }));
  }
  if (owns("dark-knight")) {
    visibleOwnedClasses.push("dark-knight");
    elements.classBuffControls.append(createOwnedBuffControl({
      classId: "dark-knight",
      buffId: "dragonBlood",
      label: "Dragon Blood +12",
      checked: state.combat.dragonBlood,
      hint: "DK only"
    }));
  }

  elements.classBuffEmpty.hidden = visibleOwnedClasses.length > 0;
}

function createOwnedBuffControl({ classId, buffId, label, checked, hint = "" }) {
  const wrapper = document.createElement("label");
  wrapper.className = "owned-buff-control";
  wrapper.dataset.classId = classId;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = `${classId}-${buffId}-toggle`;
  input.checked = checked;
  input.dataset.ownedBuff = buffId;
  input.dataset.classId = classId;

  const text = document.createElement("span");
  text.textContent = label;
  if (hint) {
    const small = document.createElement("small");
    small.textContent = ` · ${hint}`;
    text.append(small);
  }

  wrapper.append(input, text);
  return wrapper;
}

function syncCombatState() {
  if (state.combat.rage && state.combat.dragonBlood) state.combat.dragonBlood = false;
  state.combat.attackBuff = state.combat.dragonBlood
    ? "dragonBlood"
    : state.combat.rage
      ? "rage"
      : "none";
  state.combat.enrage = state.combat.heroEnrage;
  state.combat.si = true;
}

function syncCombatControls() {
  elements.mwSelect.value = String(state.combat.mwLevel);
  elements.seToggle.checked = state.combat.se;
  elements.siToggle.checked = true;
  elements.echoToggle.checked = state.combat.echo;
  elements.rageToggle.checked = state.combat.rage;
  renderClassBuffControls();
  syncReferenceControls();
}

function syncReferenceControls() {
  for (const key of REFERENCE_FILTER_KEYS) {
    document.querySelector(`#${REFERENCE_INPUT_IDS[key]}`).checked = state.referenceVisibility[key];
  }
  elements.yZeroToggle.checked = state.yZeroAxis;
}

function requestProgressionFit() {
  state.progressionViewport = null;
  state.progressionViewportKey = null;
  state.progressionFitRevision += 1;
}

function render() {
  if (!state.data) return;
  clearError();
  refreshPresetResults();
  if (state.page === "user-preset") {
    document.querySelector("#combat-status").textContent = combatSummaryText();
    localizePage();
    return;
  }

  try {
    const { potionsData } = state.data;
    const allSeries = getAllSeries();
    const visibleSeries = allSeries.filter(item => state.visibleClasses.has(item.classId));
    const potion = getPotion(potionsData, state.potionId);
    const unavailable = collectUnavailable(visibleSeries);

    document.querySelector("#combat-status").textContent = `${combatSummaryText()}${unavailable.length ? ` · ${unavailable[0].label}: ${unavailable[0].reason}` : ""}`;
    if (state.page === "library") {
      const libraryKey = JSON.stringify({
        calculation: calculationConditionKey(),
        classId: state.libraryClass,
        stageId: state.libraryStage,
        sectionId: state.librarySection,
        targetCount: state.targetCount,
        potionId: state.potionId
      });
      if (state.libraryRenderKey !== libraryKey || !document.querySelector("#library-content")?.hasChildNodes()) {
        renderLibrary(document.querySelector("#library-content"), {
          data: state.data,
          series: allSeries,
          classId: state.libraryClass,
          stageId: state.libraryStage,
          sectionId: state.librarySection,
          targetCount: state.targetCount,
          potionId: state.potionId,
          combat: {
            ...state.combat,
            enrage: state.combat.heroEnrage,
            attackBuff: state.combat.dragonBlood
              ? "dragonBlood"
              : state.combat.rage
                ? "rage"
                : "none"
          },
          wdef: state.wdef
        });
        state.libraryRenderKey = libraryKey;
      }
      elements.libraryContext.textContent = state.librarySection === "classes"
        ? `Selected class: ${CLASS_META[state.libraryClass]?.label ?? state.libraryClass} · stage focus: ${state.libraryStage}`
        : "Select Class models to inspect a class, or use the global controls before returning to the model trace.";
      localizePage();
      return;
    }

    renderSummary();
    renderProgressionChart(visibleSeries, potion);
    setStatus(`${visibleSeries.length} of ${allSeries.length} classes · ${state.targetCount}T · ${potion.label}`);
    localizePage();
  } catch (error) {
    showError(error instanceof Error ? error.message : String(error));
  }
}

function buildUiSeries() {
  const { gearData, skillsData, potionsData } = state.data;
  const baseOptions = {
    gearData,
    skillsData,
    potionsData,
    potionId: state.potionId,
    targetCount: state.targetCount,
    wdef: state.wdef
  };
  const sharedCombat = {
    ...state.combat,
    enrage: state.combat.heroEnrage,
    attackBuff: state.combat.rage ? "rage" : "none"
  };
  const standardSeries = buildProgressionSeries({ ...baseOptions, combat: sharedCombat });
  if (!state.combat.dragonBlood) return standardSeries;

  const dragonSeries = buildProgressionSeries({
    ...baseOptions,
    combat: { ...sharedCombat, attackBuff: "dragonBlood" }
  });
  const dragonKnight = dragonSeries.find(item => item.classId === "dark-knight");
  return standardSeries.map(item => item.classId === "dark-knight" ? dragonKnight : item);
}

function refreshPresetResults() {
  for (let slot = 0; slot < PRESET_COUNT; slot++) {
    const input = state.presetInputs[slot];
    if (!input) {
      state.presetResults[slot] = null;
      continue;
    }
    const classId = input.classId;
    state.presetResults[slot] = evaluatePreset(input, {
      skillsData: state.data.skillsData,
      potionWa: getPotion(state.data.potionsData, state.potionId).wa,
      targetCount: state.targetCount,
      wdef: state.wdef,
      combat: {
        ...state.combat,
        enrage: state.combat.heroEnrage,
        attackBuff: classId === "dark-knight" && state.combat.dragonBlood
          ? "dragonBlood" : state.combat.rage ? "rage" : "none"
      }
    });
    presetEditors[slot]?.setResult(state.presetResults[slot]);
  }
  renderComparison();
  const status = document.querySelector("#personal-point-status");
  const submitted = state.presetInputs.filter(Boolean).length;
  const plotted = personalPoints().length;
  status.hidden = submitted === 0;
  status.textContent = submitted ? `★ ${plotted} / ${PRESET_COUNT} presets plotted · ${state.targetCount}T · ${combatSummaryText()}` : "";
}

function personalPoint(slot = 0) {
  const result = state.presetResults[slot];
  if (!result?.valid || !Number.isFinite(result.dpm) || !Number.isFinite(result.mw20Range?.max)) return null;
  return { slot, x: result.mw20Range.max, y: result.dpm };
}

function personalPoints() {
  return state.presetResults.map((_, slot) => personalPoint(slot)).filter(Boolean);
}

function calculationConditionKey() {
  return JSON.stringify({
    targetCount: state.targetCount,
    potionId: state.potionId,
    mwLevel: state.combat.mwLevel,
    se: state.combat.se,
    si: true,
    echo: state.combat.echo,
    rage: state.combat.rage,
    dragonBlood: state.combat.dragonBlood,
    heroEnrage: state.combat.heroEnrage,
    wdef: state.wdef
  });
}

function getAllSeries() {
  const key = calculationConditionKey();
  if (!state.calculationCache || state.calculationCache.key !== key) {
    state.calculationCache = { key, series: buildUiSeries() };
    state.progressionRenderKey = null;
    state.libraryRenderKey = null;
  }
  return state.calculationCache.series;
}

function combatSummaryText() {
  const attackBuff = state.combat.dragonBlood
    ? tr("Dragon Blood +12 (DK only)", "Dragon Blood +12（僅 DK）")
    : state.combat.rage
      ? tr("Rage +12 (shared)", "Rage +12（共用）")
      : tr("Attack buff off", "攻擊 Buff 關閉");
  const enabled = value => value ? tr("on", "開啟") : tr("off", "關閉");
  return `WDEF ${state.wdef} · MW${state.combat.mwLevel} · SE ${enabled(state.combat.se)} · SI ${enabled(true)} · Echo ${enabled(state.combat.echo)} · ${attackBuff} · Hero Enrage ${state.combat.heroEnrage ? tr("average", "平均值") : enabled(false)}`;
}

function renderSummary() {
  elements.progressionCaption.textContent = tr(
    "Four gear stages per class · MW20 clean max on X · combat DPM on Y. Lines connect discrete builds.",
    "每個職業四個裝備階段 · X 軸為 MW20 Clean Max · Y 軸為戰鬥 DPM；曲線連接各階段配裝。"
  );
  document.querySelector("#progression-heading").textContent = tr("DPM vs MW20 clean range", "DPM 與 MW20 Clean range");
}

function renderProgressionChart(series, potion) {
  const rangeView = true;
  const records = rangeView && state.showReferences ? getSelectedReferences() : [];
  const dpmRecords = records.filter(record => Number.isFinite(record.plottedDpm));
  const viewKey = progressionViewKey();
  const renderKey = `${viewKey}:${state.progressionFitRevision}`;

  const hasChartData = Boolean(elements.progressionChart?.data?.length);
  if (state.progressionRenderKey === renderKey && (series.length === 0 && personalPoints().length === 0 ? !hasChartData : hasChartData)) return;
  state.progressionRenderKey = renderKey;

  elements.referenceList.replaceChildren();
  renderReferenceList(records);
  renderProgressionNotes(series, records);
  renderRangeReferenceChart(records);
  elements.referenceControls.hidden = !rangeView;

  if (series.length === 0 && personalPoints().length === 0) {
    hidePlot(elements.progressionChart);
    elements.progressionEmpty.hidden = false;
    setFocusStatus();
    return;
  }
  elements.progressionEmpty.hidden = true;
  if (!window.Plotly) {
    showError("Plotly did not load. Check the network connection and reload the page.");
    return;
  }

  if (state.progressionViewportKey !== viewKey) state.progressionViewport = null;
  const theme = readTheme();
  const axisRanges = resolveProgressionRanges(series, dpmRecords, rangeView, viewKey);
  const traces = series.map(item => createClassTrace(item, potion, rangeView));
  appendReferenceDpmTraces(traces, series, dpmRecords);
  for (const personal of personalPoints()) {
    const input = state.presetInputs[personal.slot];
    traces.push({
      type: "scatter", mode: "markers", name: `${displayPresetName(personal.slot)} · ${CLASS_META[input.classId].label}`,
      x: [personal.x], y: [personal.y],
      marker: { symbol: "star", size: 19, color: PRESET_COLORS[personal.slot], line: { color: theme.ink, width: 1.5 } },
      meta: { kind: "user-preset", slot: personal.slot },
      hovertemplate: tr(
        "<b>%{fullData.name}</b><br>MW20 clean max: %{x:,.0f}<br>DPM: %{y:.2f}m<extra></extra>",
        "<b>%{fullData.name}</b><br>MW20 Clean Max：%{x:,.0f}<br>DPM：%{y:.2f}m<extra></extra>"
      )
    });
  }

  const layout = {
    autosize: true,
    height: window.innerWidth < 600 ? 700 : 650,
    margin: {
      l: 58,
      r: 28,
      t: 18,
      b: window.innerWidth < 600 ? 112 : 92
    },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: theme.ink, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 14 },
    hovermode: "closest",
    legend: {
      orientation: "h",
      y: -0.18,
      x: 0,
      font: { color: theme.muted, size: 14 }
    },
    xaxis: {
      title: { text: rangeView ? tr("MW20 clean max range", "MW20 Clean Max range") : tr("Gear progression stage", "裝備進程階段"), font: { color: theme.muted, size: 14 } },
      type: "linear",
      tickvals: rangeView ? undefined : [0, 1, 2, 3],
      ticktext: rangeView ? undefined : STAGE_ORDER.map(localizeText),
      range: axisRanges.xRange,
      gridcolor: theme.grid,
      linecolor: theme.grid,
      tickfont: { color: theme.muted },
      fixedrange: false
    },
    yaxis: {
      title: { text: tr("DPM (millions / minute)", "DPM（百萬／分鐘）"), font: { color: theme.muted, size: 14 } },
      range: axisRanges.yRange,
      gridcolor: theme.grid,
      zerolinecolor: theme.grid,
      tickfont: { color: theme.muted },
      tickformat: ".2f",
      fixedrange: false
    },
    uirevision: renderKey
  };

  state.progressionRendering = true;
  state.progressionPlotRevision += 1;
  state.appliedFocus = NO_FOCUS_APPLIED;
  state.appliedFocusPlotRevision = state.progressionPlotRevision;
  window.Plotly.react(elements.progressionChart, traces, layout, {
    responsive: true,
    displayModeBar: "hover",
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
    scrollZoom: true
  }).then(() => {
    state.progressionRendering = false;
    state.progressionViewportKey = viewKey;
    bindProgressionChartEvents();
    scheduleProgressionFocus();
  }).catch(error => {
    state.progressionRendering = false;
    showError(`Progression chart error: ${error.message}`);
  });
}

function createClassTrace(item, potion, rangeView) {
  const focus = focusedClass();
  const active = !focus || focus === item.classId;
  return {
    type: "scatter",
    mode: "lines+markers",
    name: item.label,
    x: item.points.map((point, index) => rangeView ? point.cleanRange.max : index),
    y: item.points.map(point => finiteDpm(point.dpm) ? point.dpm : null),
    customdata: item.points.map(pointCustomData),
    connectgaps: false,
    line: { color: item.color, width: active ? 3.6 : 2.2 },
    marker: {
      color: item.color,
      size: active ? 9 : 7,
      opacity: active ? 1 : 0.24,
      symbol: ["circle", "square", "diamond", "triangle-up"]
    },
    opacity: active ? 1 : 0.18,
    meta: { kind: "class-line", classId: item.classId },
    hovertemplate: classHoverTemplate(potion.label)
  };
}

function appendReferenceDpmTraces(traces, series, records) {
  for (const record of records) {
    if (!Number.isFinite(record.plottedDpm) || !Number.isFinite(record.cleanMax)) continue;
    const item = series.find(candidate => candidate.classId === record.classId);
    const end = item?.points.find(point => point.stage === "End-game");
    if (!item) continue;
    if (end && finiteDpm(end.dpm)) {
      traces.push({
        type: "scatter",
        mode: "lines",
        x: [end.cleanRange.max, record.cleanMax],
        y: [end.dpm, record.plottedDpm],
        line: { color: item.color, dash: "dot", width: 1.1 },
        opacity: 0.45,
        hoverinfo: "skip",
        showlegend: false,
        meta: { kind: "reference-connector", classId: item.classId }
      });
    }
    traces.push({
      type: "scatter",
      mode: "markers",
      name: `${record.displayLabel} · ${record.displayKind}`,
      x: [record.cleanMax],
      y: [record.plottedDpm],
      customdata: [[
        record.displayLabel,
        record.displayKind,
        Number.isFinite(record.cleanMin) ? record.cleanMin : record.cleanMax,
        record.cleanMax,
        record.plottedDpm,
        record.displayStatus
      ]],
      marker: {
        color: item.color,
        size: 13,
        symbol: record.isFury ? "cross" : record.kind === "Extreme" ? "star" : record.kind === "Forum #1" ? "diamond-open" : "circle-open",
        line: { color: item.color, width: 1.5 }
      },
      showlegend: false,
      meta: { kind: "reference", classId: item.classId },
      hovertemplate: referenceHoverTemplate()
    });
  }
}

function resolveProgressionRanges(series, records, rangeView, viewKey) {
  const validPoints = series.flatMap(item => item.points
    .filter(point => finiteDpm(point.dpm))
    .map(point => ({ x: rangeView ? point.cleanRange.max : null, y: point.dpm })));
  const validReferences = records
    .filter(record => finiteDpm(record.plottedDpm) && Number.isFinite(record.cleanMax))
    .map(record => ({ x: record.cleanMax, y: record.plottedDpm }));
  const allPoints = [...validPoints, ...validReferences, ...personalPoints()];
  const auto = buildAutoRanges(allPoints, rangeView);
  if (state.progressionViewportKey === viewKey && state.progressionViewport) {
    return {
      ...auto,
      xRange: state.progressionViewport.xRange ?? auto.xRange,
      yRange: state.progressionViewport.yRange ?? auto.yRange
    };
  }
  return auto;
}

function buildAutoRanges(points, rangeView) {
  const ys = points.map(point => point.y).filter(Number.isFinite);
  const xs = points.map(point => point.x).filter(Number.isFinite);
  const maxY = ys.length ? Math.max(...ys) : 1;
  const minYValue = ys.length ? Math.min(...ys) : 0;
  const ySpread = Math.max(maxY - minYValue, maxY * 0.1, 1);
  const yPadding = Math.max(ySpread * 0.08, 0.4);
  const yRange = state.yZeroAxis
    ? [0, Math.max(maxY + yPadding * 1.5, 1)]
    : [Math.max(0, minYValue - yPadding), Math.max(maxY + yPadding, 1)];

  if (!rangeView) {
    return {
      xRange: [-0.35, 3.35],
      yRange
    };
  }

  const minX = xs.length ? Math.min(...xs) : 0;
  const maxX = xs.length ? Math.max(...xs) : 1;
  const xSpread = Math.max(maxX - minX, Math.abs(maxX) * 0.1, 1);
  const xPadding = Math.max(xSpread * 0.04, 30);
  return {
    xRange: [minX - xPadding, maxX + xPadding],
    yRange
  };
}

function getSelectedReferences() {
  return selectReferences(state.data.referencesData, {
    targetCount: state.targetCount,
    potionId: state.potionId,
    combat: state.combat,
    wdef: state.wdef,
    visibleClasses: state.visibleClasses,
    referenceVisibility: state.referenceVisibility
  });
}

function renderRangeReferenceChart(records) {
  const rangeView = state.page === "progression";
  elements.rangeReferenceSection.hidden = !rangeView || !state.showReferences;
  if (!rangeView || !state.showReferences || !elements.rangeReferenceSection.open) {
    hidePlot(elements.rangeReferenceChart);
    return;
  }

  const rangeRecords = records.filter(record => Number.isFinite(record.cleanMax) && !Number.isFinite(record.plottedDpm));
  elements.rangeReferenceEmpty.hidden = rangeRecords.length > 0;
  elements.rangeReferenceEmpty.textContent = rangeRecords.length
    ? ""
    : "No range-only references are enabled for this view.";
  if (rangeRecords.length === 0) {
    hidePlot(elements.rangeReferenceChart);
    return;
  }
  if (!window.Plotly) return;

  const theme = readTheme();
  const traces = rangeRecords.map((record, index) => {
    const min = Number.isFinite(record.cleanMin) ? record.cleanMin : record.cleanMax;
    const custom = [
      record.displayLabel,
      record.displayKind,
      min,
      record.cleanMax,
      record.displayStatus
    ];
    return {
      type: "scatter",
      mode: "lines+markers",
      name: record.displayLabel,
      x: [min, record.cleanMax],
      y: [index, index],
      customdata: [custom, custom],
      line: { color: referenceColor(record), width: 5 },
      marker: { color: referenceColor(record), size: 9 },
      hovertemplate: tr(
        "<b>%{customdata[0]}</b><br>%{customdata[1]}<br>Clean range: %{customdata[2]:,.0f}–%{customdata[3]:,.0f}<br>DPM unavailable for this view<br>%{customdata[4]}<extra>Range-only reference</extra>",
        "<b>%{customdata[0]}</b><br>%{customdata[1]}<br>Clean range：%{customdata[2]:,.0f}–%{customdata[3]:,.0f}<br>此檢視沒有 DPM<br>%{customdata[4]}<extra>僅 Range 參考資料</extra>"
      ),
      showlegend: false
    };
  });
  const height = Math.max(160, rangeRecords.length * 40 + 76);
  window.Plotly.react(elements.rangeReferenceChart, traces, {
    autosize: true,
    height,
    margin: { l: window.innerWidth < 600 ? 122 : 158, r: 18, t: 8, b: 48 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: theme.ink, family: "Inter, ui-sans-serif, system-ui, sans-serif", size: 14 },
    xaxis: {
      title: { text: tr("Published clean range (MW20)", "已發布 Clean range（MW20）"), font: { color: theme.muted, size: 14 } },
      gridcolor: theme.grid,
      linecolor: theme.grid,
      tickfont: { color: theme.muted },
      fixedrange: false
    },
    yaxis: {
      tickvals: rangeRecords.map((_, index) => index),
      ticktext: rangeRecords.map(record => record.displayLabel),
      autorange: "reversed",
      gridcolor: "rgba(0,0,0,0)",
      zeroline: false,
      tickfont: { color: theme.muted, size: 14 },
      fixedrange: true
    },
    showlegend: false,
    uirevision: `${state.targetCount}-${state.potionId}-${JSON.stringify(state.referenceVisibility)}`
  }, {
    responsive: true,
    displayModeBar: false,
    scrollZoom: false
  }).catch(error => showError(`Range reference chart error: ${error.message}`));
}


function renderReferenceList(records) {
  if (!state.showReferences) return;
  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No enabled reference layers match the current class filter and target count.";
    elements.referenceList.append(empty);
  }
  for (const record of records) {
    const paragraph = document.createElement("p");
    paragraph.className = Number.isFinite(record.plottedDpm) ? "reference-record reference-record-dpm" : "reference-record reference-record-range";
    const link = document.createElement(record.source ? "a" : "span");
    link.textContent = record.displayLabel;
    if (record.source) link.href = record.source;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const range = publishedRange(record);
    const dpm = Number.isFinite(record.plottedDpm)
      ? ` / ${record.plottedDpm.toFixed(3)}m ${record.dpmBasis === "p3-final-interpolation" ? "p.3 projected DPM" : "published DPM"}`
      : " / DPM unavailable for this view";
    paragraph.append(link, document.createTextNode(` — ${record.displayKind} · ${range}${dpm}. ${record.displayStatus}`));
    elements.referenceList.append(paragraph);
  }
  const pending = document.createElement("p");
  const pendingRecords = state.data.referencesData.pending ?? [];
  pending.textContent = pendingRecords.length
    ? `Pending source payloads: ${pendingRecords.join("; ")}.`
    : "";
  if (pending.textContent) elements.referenceList.append(pending);
}

function renderProgressionNotes(series, records) {
  elements.progressionNotes.replaceChildren();
  const unavailable = collectUnavailable(series);
  if (unavailable.length) {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = "DPM unavailable:";
    paragraph.append(strong, document.createTextNode(` ${unavailable.map(item => `${item.label} · ${item.stage} — ${item.reason}`).join("; ")}`));
    elements.progressionNotes.append(paragraph);
  }
  const hiddenDpm = records.filter(record => !Number.isFinite(record.plottedDpm));
  if (hiddenDpm.length) {
    const paragraph = document.createElement("p");
    paragraph.textContent = `${hiddenDpm.length} range-only reference${hiddenDpm.length === 1 ? "" : "s"} shown below; no DPM value was inferred.`;
    elements.progressionNotes.append(paragraph);
  }
  if (!unavailable.length && !hiddenDpm.length) {
    const paragraph = document.createElement("p");
    paragraph.textContent = "Forum / Extreme points reproduce p.3 FINAL curve projections, not measured player DPM. They appear only when source settings match.";
    elements.progressionNotes.append(paragraph);
  }
}


function appendCell(row, value, className = "") {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = value;
  row.append(cell);
}

function bindProgressionChartEvents() {
  if (state.progressionEventsBound || !elements.progressionChart?.on) return;
  state.progressionEventsBound = true;
  elements.progressionChart.on("plotly_hover", event => {
    const classId = classIdFromPlotEvent(event);
    if (!classId) return;
    state.hoveredClass = classId;
    scheduleProgressionFocus();
  });
  elements.progressionChart.on("plotly_unhover", () => {
    state.hoveredClass = null;
    scheduleProgressionFocus();
  });
  elements.progressionChart.on("plotly_click", event => {
    const classId = classIdFromPlotEvent(event);
    if (!classId) return;
    togglePinnedClass(classId);
  });
  elements.progressionChart.on("plotly_relayout", event => {
    if (state.progressionRendering) return;
    const viewKey = progressionViewKey();
    const xRange = readRelayoutRange(event, "xaxis");
    const yRange = readRelayoutRange(event, "yaxis");
    if (!xRange && !yRange) return;
    const existing = state.progressionViewportKey === viewKey ? state.progressionViewport ?? {} : {};
    state.progressionViewport = {
      xRange: xRange ?? existing.xRange,
      yRange: yRange ?? existing.yRange
    };
    state.progressionViewportKey = viewKey;
    setFocusStatus("Manual zoom preserved. Use Fit visible data to return to the current data extent.");
  });
  elements.progressionChart.on("plotly_doubleclick", () => {
    requestProgressionFit();
    render();
  });
}

function classIdFromPlotEvent(event) {
  const point = event?.points?.[0];
  return point?.data?.meta?.classId ?? point?.fullData?.meta?.classId ?? null;
}

function togglePinnedClass(classId) {
  state.pinnedClass = state.pinnedClass === classId ? null : classId;
  state.hoveredClass = classId;
  scheduleProgressionFocus();
}

function scheduleProgressionFocus() {
  state.focusRequestRevision += 1;
  setFocusStatus();
  if (focusRafHandle !== null) return;
  const schedule = window.requestAnimationFrame ?? (callback => window.setTimeout(callback, 0));
  focusRafHandle = schedule(() => {
    focusRafHandle = null;
    const requestedRevision = state.focusRequestRevision;
    const requestedFocus = focusedClass();
    const plotRevision = state.progressionPlotRevision;
    focusUpdatePromise = focusUpdatePromise
      .catch(() => {})
      .then(async () => {
        if (requestedRevision !== state.focusRequestRevision) {
          scheduleProgressionFocus();
          return;
        }
        if (state.progressionRendering || plotRevision !== state.progressionPlotRevision) {
          scheduleProgressionFocus();
          return;
        }
        await applyProgressionFocus(requestedFocus, plotRevision);
        if (requestedRevision !== state.focusRequestRevision) scheduleProgressionFocus();
      });
  });
}

async function applyProgressionFocus(focus, plotRevision) {
  const plot = elements.progressionChart;
  if (!window.Plotly || !plot?.data) {
    setFocusStatus();
    return;
  }
  if (state.appliedFocus === focus && state.appliedFocusPlotRevision === plotRevision) return;

  const classIndices = [];
  const classOpacity = [];
  const lineWidths = [];
  const markerSizes = [];
  const markerOpacities = [];
  const associatedIndices = [];
  const associatedOpacity = [];
  plot.data.forEach((trace, index) => {
    const classId = trace.meta?.classId;
    if (!classId) return;
    const active = !focus || classId === focus;
    if (trace.meta.kind === "class-line") {
      classIndices.push(index);
      classOpacity.push(active ? 1 : 0.18);
      lineWidths.push(active ? 3.6 : 2.2);
      markerSizes.push(active ? 9 : 7);
      markerOpacities.push(active ? 1 : 0.24);
      return;
    }
    associatedIndices.push(index);
    associatedOpacity.push(active ? 1 : 0.16);
  });

  const updates = [];
  if (classIndices.length) {
    updates.push(window.Plotly.restyle(plot, {
      opacity: classOpacity,
      "line.width": lineWidths,
      "marker.size": markerSizes,
      "marker.opacity": markerOpacities
    }, classIndices));
  }
  if (associatedIndices.length) {
    updates.push(window.Plotly.restyle(plot, { opacity: associatedOpacity }, associatedIndices));
  }
  await Promise.all(updates);
  if (plotRevision !== state.progressionPlotRevision) return;
  state.appliedFocus = focus;
  state.appliedFocusPlotRevision = plotRevision;
  setFocusStatus();
}

function focusedClass() {
  return state.pinnedClass ?? state.hoveredClass;
}

function setFocusStatus(message = "") {
  if (!elements.progressionFocusStatus) return;
  if (message) {
    elements.progressionFocusStatus.textContent = localizeText(message);
    return;
  }
  const classId = focusedClass();
  if (!classId) {
    elements.progressionFocusStatus.textContent = tr("Hover a line to focus it. Click to pin or release a class.", "將滑鼠移到曲線可聚焦；點擊可固定或解除職業焦點。");
    return;
  }
  const label = CLASS_META[classId]?.label ?? classId;
  elements.progressionFocusStatus.textContent = state.pinnedClass === classId
    ? tr(`${label} pinned · click its line again to release.`, `${label} 已固定 · 再次點擊曲線可解除。`)
    : tr(`${label} focused · click to pin it.`, `${label} 已聚焦 · 點擊曲線可固定。`);
}

function pointCustomData(point) {
  const audit = point.audit ?? {};
  return [
    localizeText(point.stage),
    point.cleanRange?.min ?? null,
    point.cleanRange?.max ?? null,
    finiteDpm(point.dpm) ? point.dpm : null,
    audit.buffedMin ?? null,
    audit.buffedMax ?? null,
    point.selector ?? "—",
    summarizeCapState(audit.capState),
    point.unavailable ?? ""
  ];
}

function classHoverTemplate(potionLabel) {
  return tr(
    "<b>%{fullData.name}</b><br>Stage: %{customdata[0]}<br>MW20 clean range: %{customdata[1]:,.0f}–%{customdata[2]:,.0f}<br><b>%{customdata[3]:.2f}m DPM</b><br>Buffed range: %{customdata[4]:,.0f}–%{customdata[5]:,.0f}<br>Selector: %{customdata[6]}<br>Cap: %{customdata[7]}<extra>",
    "<b>%{fullData.name}</b><br>階段：%{customdata[0]}<br>MW20 Clean range：%{customdata[1]:,.0f}–%{customdata[2]:,.0f}<br><b>%{customdata[3]:.2f}m DPM</b><br>Buff 後 Range：%{customdata[4]:,.0f}–%{customdata[5]:,.0f}<br>技能分支：%{customdata[6]}<br>傷害上限：%{customdata[7]}<extra>"
  ) + escapeHtml(potionLabel) + "</extra>";
}

function referenceHoverTemplate() {
  return tr(
    "<b>%{customdata[0]}</b><br>%{customdata[1]}<br>MW20 clean max range: %{customdata[3]:,.0f}<br><b>%{customdata[4]:.3f}m reference DPM</b><br>%{customdata[5]}<extra>p.3 FINAL reference</extra>",
    "<b>%{customdata[0]}</b><br>%{customdata[1]}<br>MW20 Clean Max：%{customdata[3]:,.0f}<br><b>%{customdata[4]:.3f}m 參考 DPM</b><br>%{customdata[5]}<extra>p.3 FINAL 參考值</extra>"
  );
}

function readRelayoutRange(event, axis) {
  const first = Number(event?.[`${axis}.range[0]`]);
  const second = Number(event?.[`${axis}.range[1]`]);
  return Number.isFinite(first) && Number.isFinite(second) ? [first, second] : null;
}

function progressionViewKey() {
  return JSON.stringify({
    presetRevision: state.presetRevision,
    page: state.page,
    wdef: state.wdef,
    targetCount: state.targetCount,
    potionId: state.potionId,
    combat: {
      mwLevel: state.combat.mwLevel,
      se: state.combat.se,
      echo: state.combat.echo,
      rage: state.combat.rage,
      dragonBlood: state.combat.dragonBlood,
      heroEnrage: state.combat.heroEnrage
    },
    visibleClasses: [...state.visibleClasses].sort(),
    references: state.page === "progression" ? state.referenceVisibility : null,
    yZero: state.yZeroAxis
  });
}

function collectUnavailable(series) {
  return series.flatMap(item => item.points
    .filter(point => point.unavailable || !finiteDpm(point.dpm))
    .map(point => ({
      label: item.label,
      stage: point.stage,
      reason: point.unavailable ?? "No finite DPM for this condition"
    })));
}

function cleanRangeText(point) {
  return `${formatNumber(point.cleanRange.min)}–${formatNumber(point.cleanRange.max)}`;
}

function publishedRange(record) {
  const min = Number.isFinite(record.cleanMin) ? record.cleanMin : record.cleanMax;
  return Number.isFinite(min) && Number.isFinite(record.cleanMax)
    ? `${formatNumber(min)}–${formatNumber(record.cleanMax)} clean range`
    : "clean range unavailable";
}

function referenceColor(record) {
  return CLASS_META[record.classId]?.color ?? "#94a3b8";
}

function finiteDpm(value) {
  return Number.isFinite(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function updateTargetButtons() {
  for (const button of elements.targetControls.querySelectorAll("button[data-target]")) {
    const selected = Number(button.dataset.target) === state.targetCount;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}

function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  return {
    ink: styles.getPropertyValue("--ink").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    grid: styles.getPropertyValue("--grid").trim()
  };
}

function hidePlot(plot) {
  if (window.Plotly && plot) window.Plotly.purge(plot);
  if (plot === elements.progressionChart) state.progressionEventsBound = false;
}

function applyRoute() {
  const parts = location.hash.replace(/^#\//, "").split("/");
  state.page = ["progression", "user-preset", "library"].includes(parts[0]) ? parts[0] : "progression";
  if (state.page === "library" && CLASS_ORDER.includes(parts[1])) state.libraryClass = parts[1];
  elements.libraryClass.value = state.libraryClass;
  elements.libraryStage.value = state.libraryStage;
  syncLibraryControls();
  for (const node of document.querySelectorAll("[data-analysis]")) node.hidden = state.page !== "progression";
  document.querySelector("#user-preset-page").hidden = state.page !== "user-preset";
  document.querySelector(".controls-panel").hidden = false;
  document.querySelector(".class-filter-row").hidden = state.page === "user-preset";
  renderClassBuffControls();
  document.querySelector("#library-page").hidden = state.page !== "library";
  document.querySelector("#reference-controls").hidden = state.page !== "progression";
  for (const anchor of document.querySelectorAll(".page-nav a")) {
    if (anchor.hash === `#/${state.page}`) anchor.setAttribute("aria-current", "page");
    else anchor.removeAttribute("aria-current");
  }
  const title = state.page === "user-preset" ? tr("User Preset", "自訂配裝")
    : state.page === "library" ? tr("Library", "模型資料庫") : tr("Progression", "成長曲線");
  document.title = `${title} · MapleRoyals DPM Lab`;
}

function syncLibraryControls() {
  elements.libraryClass.value = state.libraryClass;
  elements.libraryStage.value = state.libraryStage;
  elements.librarySectionTabs.forEach(button => {
    const selected = button.dataset.librarySection === state.librarySection;
    button.setAttribute("aria-pressed", String(selected));
  });
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
}

function setStatus(message) {
  elements.status.textContent = message;
}

function showError(message) {
  elements.error.hidden = false;
  elements.error.textContent = message;
  elements.status.textContent = "Unable to render the selected view.";
  localizePage();
}

function clearError() {
  elements.error.hidden = true;
  elements.error.textContent = "";
}

window.addEventListener("resize", () => {
  if (!window.Plotly) return;
  for (const plot of [elements.progressionChart, elements.rangeReferenceChart]) {
    if (plot?.data) window.Plotly.Plots.resize(plot);
  }
});

updateTargetButtons();
setFocusStatus();
