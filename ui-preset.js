import {
  WEAPONS,
  SLOTS,
  relevantStats,
  defaultPreset
} from "./engine/user-preset.js";

export const USER_PRESET_STORAGE_KEY = "mapleroyals.user-preset.v1";
export const USER_PRESET_SCHEMA_VERSION = 1;

const CLASS_OPTIONS = Object.freeze([
  ["hero", "Hero"],
  ["dark-knight", "Dark Knight"],
  ["paladin", "Paladin"],
  ["night-lord", "Night Lord"],
  ["shadower", "Shadower"],
  ["bowmaster", "Bowmaster"],
  ["marksman", "Marksman"],
  ["corsair", "Corsair"],
  ["buccaneer", "Buccaneer"]
]);

const CLASS_IDS = new Set(CLASS_OPTIONS.map(([id]) => id));
const SLOT_ORDER = Object.freeze(Array.isArray(SLOTS) && SLOTS.length
  ? [...SLOTS]
  : [
      "weapon", "shield", "helmet", "face", "eye", "earring", "pendant",
      "top", "bottom", "overall", "gloves", "cape", "shoes", "belt",
      "shoulder", "ring1", "ring2", "ring3", "ring4", "medal", "nxPendant", "nxRing"
    ]);
const SLOT_SET = new Set(SLOT_ORDER);
const EVENT_NX_SLOTS = Object.freeze(["nxPendant", "nxRing"]);

const SLOT_LABELS = Object.freeze({
  weapon: "武器",
  shield: "副手／盾牌",
  helmet: "頭盔",
  face: "臉部裝備",
  eye: "眼部裝備",
  earring: "耳環",
  pendant: "項鍊",
  top: "上衣",
  bottom: "下衣",
  overall: "套服",
  gloves: "手套",
  cape: "披風",
  shoes: "鞋子",
  belt: "腰帶",
  shoulder: "肩膀",
  ring1: "戒指 1",
  ring2: "戒指 2",
  ring3: "戒指 3",
  ring4: "戒指 4",
  medal: "勳章",
  nxPendant: "活動 NX 項鍊",
  nxRing: "活動 NX 戒指"
});

const STAT_LABELS = Object.freeze({
  str: "STR",
  dex: "DEX",
  int: "INT",
  luk: "LUK",
  wa: "W.att"
});

const DEFAULT_RELEVANT_STATS = Object.freeze({
  hero: ["str", "dex"],
  paladin: ["str", "dex"],
  "dark-knight": ["str", "dex"],
  buccaneer: ["str", "dex"],
  bowmaster: ["dex", "str"],
  marksman: ["dex", "str"],
  corsair: ["dex", "str"],
  "night-lord": ["luk", "dex", "str"],
  shadower: ["luk", "dex", "str"]
});

const AMMO_PRESETS = Object.freeze({
  "night-lord": [29, 30, 31, 32],
  bowmaster: [16, 24],
  marksman: [16, 24],
  corsair: [21, 24]
});

const PASSIVE_AMMO_WA = Object.freeze({ bowmaster: 10, marksman: 15 });
const INPUT_STAT_KEYS = Object.freeze(["str", "dex", "int", "luk"]);
const QUICK_STAT_KEYS = Object.freeze(["str", "dex", "luk"]);
const QUICK_INPUT_KEYS = Object.freeze(["str", "dex", "luk", "wa", "max", "waMode"]);
const SLOT_STAT_KEYS = Object.freeze(["str", "dex", "luk", "wa"]);
const MODE_VALUES = new Set(["quick", "detailed"]);
const CLOTHING_VALUES = new Set(["separate", "overall"]);
let mountSequence = 0;

/**
 * Mounts the Phase 5 User Preset form.
 *
 * `getInput()` deliberately returns null until Calculate has been pressed and
 * the draft has not changed afterwards. This lets the host invalidate a chart
 * immediately without accidentally evaluating a partially edited draft.
 * `getDraft()` is available for diagnostics/UI state, while `getState()` makes
 * the active/dirty/submitted state explicit.
 */
export function mountPreset(container, { onChange, onSubmit, storageKey = USER_PRESET_STORAGE_KEY } = {}) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError("mountPreset requires a DOM container.");
  }

  const instanceId = `user-preset-${++mountSequence}`;
  const restored = restoreDraft(storageKey);
  const state = {
    draft: restored.input ?? createBlankDraft("hero"),
    mode: restored.input?.mode ?? "quick",
    submitted: false,
    dirty: false,
    awaitingResult: false,
    result: null,
    resultStale: true,
    errors: [],
    warnings: restored.warning ? [restored.warning] : [],
    storageWarning: restored.warning ?? "",
    suppressPersistence: false,
    persistTimer: null,
    lastSubmittedRevision: 0,
    revision: 0,
    formRoot: null,
    resultRoot: null,
    statusRoot: null,
    errorRoot: null,
    requirementRoot: null
  };

  const root = document.createElement("div");
  root.className = "user-preset-root";
  root.dataset.instance = instanceId;
  container.replaceChildren(root);

  // Bind delegated handlers once. render() replaces the form contents when
  // the mode or class changes, so binding inside render would duplicate them.
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("click", handleClick);

  render();
  emitChange(null);

  function render() {
    root.replaceChildren();
    root.append(buildIntro());

    state.statusRoot = createElement("p", {
      className: "user-preset-status",
      attrs: { "aria-live": "polite", role: "status" }
    });
    root.append(state.statusRoot);

    const form = createElement("form", { className: "user-preset-form", attrs: { novalidate: "" } });
    state.formRoot = form;
    form.append(buildSelectionPanel());
    form.append(buildModePanel());
    form.append(buildBasePanel());
    if (state.mode === "quick") form.append(buildQuickPanel());
    else form.append(buildDetailedPanel());
    if (state.mode === "detailed") form.append(buildAmmoPanel());
    form.append(buildActions());
    root.append(form);

    state.errorRoot = createElement("div", {
      className: "user-preset-errors",
      attrs: { "aria-live": "assertive" }
    });
    root.append(state.errorRoot);

    state.resultRoot = createElement("section", {
      className: "user-preset-result",
      attrs: { "aria-labelledby": `${instanceId}-result-heading` }
    });
    root.append(state.resultRoot);

    updateStatus();
    updateErrors();
    updateResult();
  }

  function buildIntro() {
    return createElement("p", {
      className: "field-help user-preset-privacy-note",
      text: "輸入只保存在這個瀏覽器的本機儲存，不會上傳。按下計算後才會把個人點位送到 Progression。"
    });
  }

  function buildSelectionPanel() {
    const fieldset = createElement("fieldset", { className: "user-preset-panel user-preset-selection" });
    fieldset.append(createElement("legend", { text: "1. 選擇職業與武器" }));
    const grid = createElement("div", { className: "user-preset-field-grid user-preset-selection-grid" });

    const classField = buildSelectField({
      id: `${instanceId}-class`,
      label: "職業",
      value: state.draft.classId,
      path: "classId",
      options: CLASS_OPTIONS.map(([value, label]) => ({ value, label }))
    });
    grid.append(classField);

    const weapons = getWeapons(state.draft.classId);
    const weaponField = buildSelectField({
      id: `${instanceId}-weapon`,
      label: "武器類別／指定武器",
      value: state.draft.weaponId,
      path: "weaponId",
      options: weapons.map(item => ({ value: item.id, label: item.label })),
      placeholder: "請選擇武器"
    });
    grid.append(weaponField);
    fieldset.append(grid);

    state.requirementRoot = createElement("p", {
      className: "user-preset-requirements field-help",
      attrs: { "aria-live": "polite" }
    });
    fieldset.append(state.requirementRoot);
    updateRequirementText();
    return fieldset;
  }

  function buildModePanel() {
    const fieldset = createElement("fieldset", { className: "user-preset-panel user-preset-mode" });
    fieldset.append(createElement("legend", { text: "2. 輸入模式" }));
    const choices = createElement("div", { className: "user-preset-mode-choices" });
    choices.append(buildRadio({
      id: `${instanceId}-mode-quick`,
      name: `${instanceId}-mode`,
      value: "quick",
      checked: state.mode === "quick",
      label: "快速驗證",
      help: Object.hasOwn(AMMO_PRESETS, state.draft.classId)
        ? "無 MW Clean Max range、裝備攻擊、彈藥與主副屬性"
        : "無 MW Clean Max range、總 W.att 與主副屬性"
    }));
    choices.append(buildRadio({
      id: `${instanceId}-mode-detailed`,
      name: `${instanceId}-mode`,
      value: "detailed",
      checked: state.mode === "detailed",
      label: "逐部位配裝",
      help: "基礎 AP＋逐部位裝備數值"
    }));
    fieldset.append(choices);
    return fieldset;
  }

  function buildBasePanel() {
    const details = createElement("details", { className: "user-preset-panel user-preset-base", attrs: { open: "" } });
    details.append(createElement("summary", { text: "基礎 AP（不含裝備與 MW）" }));
    details.append(createElement("p", {
      className: "field-help",
      text: "預設為各職業 Lv.200 基礎配點；可改成自己的 AP。這些數值用於 MW 增量與 AP 合規檢查。"
    }));
    const grid = createElement("div", { className: "user-preset-stat-grid" });
    for (const stat of INPUT_STAT_KEYS) {
      grid.append(buildNumberField({
        id: `${instanceId}-base-${stat}`,
        label: `基礎 ${STAT_LABELS[stat]}`,
        path: `base.${stat}`,
        value: state.draft.base?.[stat],
        blankAsZero: false,
        integer: true,
        min: 0
      }));
    }
    details.append(grid);
    return details;
  }

  function buildQuickPanel() {
    const fieldset = createElement("fieldset", { className: "user-preset-panel user-preset-quick" });
    fieldset.append(createElement("legend", { text: "3. 無 MW Clean 面板" }));
    fieldset.append(createElement("p", {
      className: "field-help",
      text: "填入含裝備、但未開 MW 的面板總值；關閉 Echo、Rage／Dragon Blood 等攻擊 Buff，且不使用攻擊藥水。range 僅填 Clean Max；最小值由模型計算，DK 遊戲面板顯示的最小值不納入核對。"
    }));
    const stats = createElement("div", { className: "user-preset-stat-grid" });
    for (const stat of getRelevantStatNames(state.draft.classId)) {
      stats.append(buildNumberField({
        id: `${instanceId}-quick-${stat}`,
        label: `無 MW ${STAT_LABELS[stat]}`,
        path: `quick.${stat}`,
        value: state.draft.quick?.[stat],
        blankAsZero: false,
        required: true,
        integer: false,
        min: 0
      }));
    }
    const hasAmmo = Object.hasOwn(AMMO_PRESETS, state.draft.classId);
    const legacyTotal = hasAmmo && state.draft.quick?.waMode === "total";
    if (hasAmmo) fieldset.append(buildSelectField({
      id: `${instanceId}-quick-wa-mode`,
      label: "攻擊力輸入方式",
      value: legacyTotal ? "total" : "gear",
      path: "quick.waMode",
      options: [
        { value: "gear", label: "裝備攻擊（彈藥、被動另加）" },
        { value: "total", label: "舊草稿：已含彈藥與被動的總攻擊" }
      ]
    }));
    stats.append(buildNumberField({
      id: `${instanceId}-quick-wa`,
      label: !hasAmmo ? "總 W.att（無 MW）" : legacyTotal ? "舊版總 W.att（已含彈藥與被動）" : "裝備 W.att（不含彈藥與被動）",
      path: "quick.wa",
      value: state.draft.quick?.wa,
      blankAsZero: false,
      required: true,
      integer: false,
      min: 0
    }));
    if (hasAmmo && !legacyTotal) {
      const ammo = buildNumberField({
        id: `${instanceId}-quick-ammo-wa`,
        label: "箭袋／彈藥 W.att",
        path: "ammoWa",
        value: state.draft.ammoWa,
        blankAsZero: true,
        required: false,
        integer: true,
        min: 0,
        listId: `${instanceId}-quick-ammo-presets`
      });
      const presets = createElement("datalist", { attrs: { id: `${instanceId}-quick-ammo-presets` } });
      for (const value of AMMO_PRESETS[state.draft.classId]) {
        presets.append(createElement("option", { attrs: { value: String(value) } }));
      }
      ammo.append(presets);
      stats.append(ammo);
    }
    stats.append(buildNumberField({
      id: `${instanceId}-quick-max`,
      label: "Clean Max range（無 MW）",
      path: "quick.max",
      value: state.draft.quick?.max,
      blankAsZero: false,
      required: true,
      integer: false,
      min: 0
    }));
    fieldset.append(stats);
    fieldset.append(createElement("p", {
      className: "field-help user-preset-summary-note",
      text: !hasAmmo
        ? "總 W.att 直接用於計算；不含藥水或攻擊 Buff。MW 只作用於基礎 AP。"
        : legacyTotal
        ? "此草稿沿用舊版總攻擊，不會再加入彈藥與職業被動。改用裝備攻擊模式前，請先扣除原本手動加上的數值。"
        : "裝備 W.att 不含箭袋／彈藥及職業被動；後兩者由下方加總。不要輸入藥水或攻擊 Buff。MW 只作用於基礎 AP。"
    }));
    if (hasAmmo) {
      const breakdown = createElement("p", { className: "field-help user-preset-wa-breakdown", attrs: { "aria-live": "polite" } });
      fieldset.append(breakdown);
      updateQuickWaBreakdown(breakdown);
    }
    return fieldset;
  }

  function updateQuickWaBreakdown(target = root.querySelector(".user-preset-wa-breakdown")) {
    if (!target) return;
    const gear = state.draft.quick?.wa;
    if (!isFiniteNumber(gear) || gear < 0) {
      target.textContent = "填入攻擊力後，這裡會顯示計算用總 W.att。";
      return;
    }
    if (state.draft.quick?.waMode === "total") {
      target.textContent = `舊版總攻擊 ${numberText(gear)} W.att（已含彈藥與被動，不再加總）。`;
      return;
    }
    const ammo = Object.hasOwn(AMMO_PRESETS, state.draft.classId) ? Number(state.draft.ammoWa) || 0 : 0;
    const passive = PASSIVE_AMMO_WA[state.draft.classId] ?? 0;
    target.textContent = `裝備 ${numberText(gear)} + 箭袋／彈藥 ${numberText(ammo)} + 職業被動 ${numberText(passive)} = 計算用 ${numberText(gear + ammo + passive)} W.att（被動已自動加入，請勿重複輸入）。`
      + (Object.hasOwn(AMMO_PRESETS, state.draft.classId) && ammo === 0 ? " 若有使用箭袋／彈藥，請記得填入攻擊力。" : "");
  }

  function buildDetailedPanel() {
    const section = createElement("section", { className: "user-preset-panel user-preset-detailed" });
    section.append(createElement("h3", { text: "3. 逐部位裝備數值" }));
    section.append(createElement("p", {
      className: "field-help",
      text: "空白裝備欄位視為 0。只顯示目前職業相關的主／副屬性與 W.att；主屬性武器需求不納入檢查。"
    }));

    const clothing = createElement("fieldset", { className: "user-preset-clothing" });
    clothing.append(createElement("legend", { text: "衣服形式（二選一）" }));
    const clothingChoices = createElement("div", { className: "user-preset-inline-choices" });
    clothingChoices.append(buildRadio({
      id: `${instanceId}-clothing-separate`,
      name: `${instanceId}-clothing`,
      value: "separate",
      checked: state.draft.clothing === "separate",
      label: "上衣＋下衣"
    }));
    clothingChoices.append(buildRadio({
      id: `${instanceId}-clothing-overall`,
      name: `${instanceId}-clothing`,
      value: "overall",
      checked: state.draft.clothing === "overall",
      label: "套服"
    }));
    clothing.append(clothingChoices);
    section.append(clothing);

    const panels = createElement("div", { className: "user-preset-gear-panels" });
    for (const slot of visibleSlots(state.draft.classId, state.draft.clothing).filter(item => !EVENT_NX_SLOTS.includes(item))) {
      panels.append(buildSlotPanel(slot));
    }
    section.append(panels);
    const eventNx = createElement("details", { className: "user-preset-panel user-preset-event-nx" });
    eventNx.append(createElement("summary", { text: "活動 NX 加成（選填／有期限）" }));
    eventNx.append(createElement("p", {
      className: "field-help",
      text: "與一般項鍊、戒指分開加總。只填目前實際裝備中的時效性 NX 數值；到期後請手動清除。"
    }));
    const eventPanels = createElement("div", { className: "user-preset-gear-panels" });
    for (const slot of EVENT_NX_SLOTS) eventPanels.append(buildSlotPanel(slot));
    eventNx.append(eventPanels);
    section.append(eventNx);
    return section;
  }

  function buildSlotPanel(slot) {
    const details = createElement("details", {
      className: `user-preset-gear-panel${slot === "weapon" ? " user-preset-weapon-panel" : ""}`,
      attrs: { open: slot === "weapon" || slot === "shield" ? "" : undefined }
    });
    details.append(createElement("summary", { text: SLOT_LABELS[slot] ?? slot }));
    const inner = createElement("div", { className: "user-preset-slot-fields" });
    if (slot === "weapon") inner.append(createElement("p", {
      className: "field-help",
      text: "武器類別已於上方選擇；此處只填入武器本體屬性與 W.att。"
    }));
    if (slot === "shield" && state.draft.classId === "shadower") {
      inner.append(createElement("p", {
        className: "field-help",
        text: "Shadower 副手固定為 Dragon Khanjar；盾牌自身屬性不能用來滿足自己的需求。"
      }));
    }
    for (const stat of getRelevantStatNames(state.draft.classId)) {
      inner.append(buildNumberField({
        id: `${instanceId}-${slot}-${stat}`,
        label: `${SLOT_LABELS[slot] ?? slot} ${STAT_LABELS[stat]}`,
        path: `slots.${slot}.${stat}`,
        value: state.draft.slots?.[slot]?.[stat],
        blankAsZero: true,
        required: false,
        integer: true,
        min: 0
      }));
    }
    inner.append(buildNumberField({
      id: `${instanceId}-${slot}-wa`,
      label: `${SLOT_LABELS[slot] ?? slot} W.att`,
      path: `slots.${slot}.wa`,
      value: state.draft.slots?.[slot]?.wa,
      blankAsZero: true,
      required: false,
      integer: true,
      min: 0
    }));
    details.append(inner);
    return details;
  }

  function buildAmmoPanel() {
    const section = createElement("section", { className: "user-preset-ammo" });
    const heading = createElement("h3", { text: "投擲物／箭袋／子彈" });
    section.append(heading);
    const classId = state.draft.classId;
    const supported = Object.hasOwn(AMMO_PRESETS, classId);
    if (!supported) {
      section.append(createElement("p", {
        className: "field-help",
        text: "此職業沒有獨立的投擲物／箭袋／子彈欄位，數值固定為 0。"
      }));
      return section;
    }
    const field = buildNumberField({
      id: `${instanceId}-ammo-wa`,
      label: "額外 W.att",
      path: "ammoWa",
      value: state.draft.ammoWa,
      blankAsZero: true,
      required: false,
      integer: true,
      min: 0,
      listId: `${instanceId}-ammo-presets`
    });
    const presets = createElement("datalist", { attrs: { id: `${instanceId}-ammo-presets` } });
    for (const value of AMMO_PRESETS[classId]) {
      presets.append(createElement("option", { attrs: { value: String(value) } }));
    }
    field.append(presets);
    section.append(field);
    const passive = PASSIVE_AMMO_WA[classId];
    if (passive) {
      section.append(createElement("p", {
        className: "field-help user-preset-readonly-note",
        text: `${classId === "bowmaster" ? "Bowmaster" : "Marksman"} 職業固定被動：+${passive} W.att（唯讀，由引擎自動套用）。`
      }));
    }
    section.append(createElement("p", {
      className: "field-help",
      text: "常用值可由提示選擇，也可以直接輸入自訂數值。"
    }));
    return section;
  }

  function buildActions() {
    const actions = createElement("div", { className: "user-preset-actions" });
    actions.append(createElement("button", {
      className: "user-preset-submit",
      text: "計算 DPM 與 MW20 Clean range",
      attrs: { type: "submit" }
    }));
    actions.append(createElement("button", {
      className: "user-preset-clear",
      text: "清除此組設定",
      attrs: { type: "button", "data-action": "clear" }
    }));
    actions.append(createElement("a", {
      className: "user-preset-progression-link",
      text: "前往 Progression",
      attrs: { href: "#/progression" }
    }));
    return actions;
  }

  function buildSelectField({ id, label, value, path, options, placeholder }) {
    const wrapper = createElement("label", { className: "user-preset-field", attrs: { for: id } });
    wrapper.append(createElement("span", { className: "user-preset-label", text: label }));
    const select = createElement("select", {
      attrs: { id, "data-preset-path": path, "aria-label": label }
    });
    if (placeholder) {
      select.append(createElement("option", { text: placeholder, attrs: { value: "" } }));
    }
    for (const option of options) {
      select.append(createElement("option", {
        text: option.label,
        attrs: { value: option.value }
      }));
    }
    select.value = value == null ? "" : String(value);
    wrapper.append(select);
    return wrapper;
  }

  function buildNumberField({ id, label, path, value, blankAsZero, required, integer, min, listId }) {
    const wrapper = createElement("label", { className: "user-preset-field", attrs: { for: id } });
    wrapper.append(createElement("span", { className: "user-preset-label", text: label }));
    const input = createElement("input", {
      attrs: {
        id,
        type: "number",
        inputmode: integer ? "numeric" : "decimal",
        min: String(min ?? 0),
        step: integer ? "1" : "any",
        "data-preset-path": path,
        "aria-label": label
      }
    });
    if (required) input.required = true;
    if (listId) input.setAttribute("list", listId);
    input.value = formatInputValue(value, blankAsZero);
    wrapper.append(input);
    return wrapper;
  }

  function buildRadio({ id, name, value, checked, label, help }) {
    const wrapper = createElement("label", { className: "user-preset-choice", attrs: { for: id } });
    const input = createElement("input", {
      attrs: { id, name, value, type: "radio", "data-radio-group": name }
    });
    input.checked = checked;
    wrapper.append(input, createElement("span", { text: label }));
    if (help) wrapper.append(createElement("small", { text: help }));
    return wrapper;
  }

  function handleInput(event) {
    const field = event.target.closest("[data-preset-path]");
    if (!field) return;
    if (field.matches("select")) return;
    const path = field.dataset.presetPath;
    const blankAsZero = path.startsWith("slots.") || path === "ammoWa";
    const integer = field.step === "1";
    setPathValue(path, parseFieldValue(field.value, { blankAsZero, integer }));
    markDirty();
  }

  function handleChange(event) {
    const field = event.target.closest("[data-preset-path]");
    if (field) {
      // Number inputs are already synchronized on every input event. Their
      // blur/change event must not emit a second invalidation.
      if (field.matches("input")) return;
      const path = field.dataset.presetPath;
      if (path === "classId") {
        changeClass(field.value);
        return;
      }
      const blankAsZero = path.startsWith("slots.") || path === "ammoWa";
      const integer = field.matches("input") && field.step === "1";
      setPathValue(path, field.matches("select") ? field.value : parseFieldValue(field.value, { blankAsZero, integer }));
      if (path === "weaponId") updateRequirementText();
      markDirty({ rerender: path === "quick.waMode" });
      return;
    }

    const radio = event.target.closest("input[type=radio]");
    if (!radio) return;
    if (radio.name === `${instanceId}-mode`) {
      state.mode = radio.value;
      state.draft.mode = radio.value;
      markDirty({ rerender: true });
      return;
    }
    if (radio.name === `${instanceId}-clothing`) {
      changeClothing(radio.value);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    submit();
  }

  function handleClick(event) {
    const clear = event.target.closest("[data-action=clear]");
    if (clear) clearDraft();
  }

  function submit() {
    const errors = validateDraft(state.draft);
    state.errors = errors;
    if (errors.length) {
      state.submitted = false;
      state.dirty = true;
      state.awaitingResult = false;
      state.resultStale = true;
      updateErrors();
      updateStatus();
      emitChange(null);
      return null;
    }

    state.errors = [];
    state.submitted = true;
    state.dirty = false;
    state.awaitingResult = true;
    state.result = null;
    state.resultStale = false;
    state.revision += 1;
    state.lastSubmittedRevision = state.revision;
    persistDraftNow();
    updateErrors();
    updateStatus();
    updateResult();
    const input = getInput();
    emitChange(input);
    if (typeof onSubmit === "function") onSubmit(clone(input), getState());
    return clone(input);
  }

  function changeClass(classId) {
    if (!CLASS_IDS.has(classId)) return;
    const previousClass = state.draft.classId;
    if (previousClass === classId) return;
    const next = createBlankDraft(classId, state.mode);
    state.draft = next;
    state.mode = next.mode;
    state.warnings = ["已切換職業；不相容的武器、基礎 AP 與逐部位欄位已重設，請重新確認。"];
    markDirty({ rerender: true });
  }

  function changeClothing(clothing) {
    if (!CLOTHING_VALUES.has(clothing) || state.draft.clothing === clothing) return;
    state.draft.clothing = clothing;
    if (clothing === "overall") {
      state.draft.slots.top = emptySlot();
      state.draft.slots.bottom = emptySlot();
      state.warnings = ["已切換為套服；上衣與下衣數值已清除。"];
    } else {
      state.draft.slots.overall = emptySlot();
      state.warnings = ["已切換為上衣＋下衣；套服數值已清除。"];
    }
    markDirty({ rerender: true });
  }

  function markDirty({ rerender = false, persist = true } = {}) {
    state.dirty = true;
    state.submitted = false;
    state.awaitingResult = false;
    state.resultStale = true;
    state.revision += 1;
    state.errors = [];
    if (persist) {
      state.suppressPersistence = false;
      schedulePersist();
    }
    if (rerender) render();
    else {
      updateRequirementText();
      updateQuickWaBreakdown();
      updateErrors();
      updateStatus();
      updateResult();
    }
    emitChange(null);
  }

  function clearDraft() {
    cancelPersistTimer();
    const removalWarning = removeStoredDraft(storageKey);
    state.draft = createBlankDraft("hero", "quick");
    state.mode = "quick";
    state.submitted = false;
    state.dirty = false;
    state.awaitingResult = false;
    state.result = null;
    state.resultStale = true;
    state.errors = [];
    state.warnings = [
      "已清除本機設定；新的輸入變更後才會重新保存。",
      ...(removalWarning ? [removalWarning] : [])
    ];
    state.storageWarning = removalWarning;
    state.suppressPersistence = true;
    state.revision += 1;
    render();
    emitChange(null);
  }

  function setPathValue(path, value) {
    const parts = path.split(".");
    if (parts.length === 1) {
      if (path === "classId" || path === "weaponId" || path === "ammoWa") state.draft[path] = value;
      return;
    }
    if (parts[0] === "slots" && parts.length === 3 && SLOT_SET.has(parts[1])) {
      state.draft.slots[parts[1]][parts[2]] = value;
      return;
    }
    if ((parts[0] === "base" && parts.length === 2 && INPUT_STAT_KEYS.includes(parts[1]))
      || (parts[0] === "quick" && parts.length === 2 && QUICK_INPUT_KEYS.includes(parts[1]))) {
      state.draft[parts[0]][parts[1]] = value;
    }
  }

  function updateRequirementText() {
    if (!state.requirementRoot) return;
    const weapon = getWeapons(state.draft.classId).find(item => item.id === state.draft.weaponId);
    state.requirementRoot.replaceChildren();
    if (!weapon) {
      state.requirementRoot.textContent = "請選擇武器；只檢查已確認的副屬性需求。";
      return;
    }
    const requirements = formatRequirements(weapon.requirements);
    state.requirementRoot.textContent = requirements
      ? `需求摘要：${requirements}（主屬性門檻忽略）`
      : "需求摘要：無已設定的副屬性門檻（主屬性門檻忽略）。";
  }

  function updateStatus() {
    if (!state.statusRoot) return;
    state.statusRoot.replaceChildren();
    const messages = [];
    if (state.storageWarning) messages.push(state.storageWarning);
    messages.push(...state.warnings);
    if (state.dirty) messages.push("目前有尚未重新計算的變更；Progression 個人點位已暫停。",);
    else if (!state.submitted) messages.push("填寫完成後按下計算，才會啟用個人結果。" );
    else if (state.awaitingResult) messages.push("正在等待引擎結果……");
    for (const message of uniqueMessages(messages)) {
      state.statusRoot.append(createElement("span", { className: "user-preset-status-item", text: message }));
    }
  }

  function updateErrors() {
    if (!state.errorRoot) return;
    state.errorRoot.replaceChildren();
    if (!state.errors.length) return;
    const heading = createElement("p", { className: "user-preset-error-heading", text: "請先修正以下欄位：" });
    const list = createElement("ul");
    for (const error of state.errors) list.append(createElement("li", { text: error }));
    state.errorRoot.append(heading, list);
  }

  function updateResult() {
    if (!state.resultRoot) return;
    state.resultRoot.replaceChildren();
    state.resultRoot.append(createElement("h3", {
      text: "計算結果",
      attrs: { id: `${instanceId}-result-heading` }
    }));

    if (state.dirty || !state.submitted) {
      state.resultRoot.append(createElement("p", {
        className: "field-help",
        text: state.dirty ? "輸入已變更，請重新按下計算。" : "尚未計算；結果會顯示在這裡。"
      }));
      return;
    }
    if (state.awaitingResult) {
      state.resultRoot.append(createElement("p", { text: "正在計算……" }));
      return;
    }
    if (!state.result) {
      state.resultRoot.append(createElement("p", { text: "目前沒有可顯示的結果。" }));
      return;
    }

    const result = state.result;
    if (result.valid === false) {
      state.resultRoot.append(createElement("p", {
        className: "user-preset-result-invalid",
        text: "這組輸入未通過模型驗證，未建立 Progression 點位。"
      }));
      appendMessageList(state.resultRoot, result.errors, "user-preset-result-errors");
      appendMessageList(state.resultRoot, result.warnings, "user-preset-result-warnings");
      return;
    }

    const metrics = createElement("div", { className: "user-preset-result-grid" });
    metrics.append(buildResultMetric("模型計算 MW20 Clean range", rangeText(result.mw20Range ?? result.cleanRange)));
    metrics.append(buildResultMetric("DPM", dpmText(result.dpm)));
    if (result.cleanRange && result.mw20Range) {
      metrics.append(buildResultMetric("模型計算 Clean range（無 MW）", rangeText(result.cleanRange)));
    }
    if (result.cleanWa != null) metrics.append(buildResultMetric("Clean W.att", numberText(result.cleanWa)));
    if (result.selector) metrics.append(buildResultMetric("技能分支", result.selector));
    state.resultRoot.append(metrics);
    if (result.waBreakdown && Object.hasOwn(AMMO_PRESETS, state.draft.classId)) {
      const breakdown = result.waBreakdown;
      state.resultRoot.append(createElement("p", {
        className: "field-help user-preset-wa-breakdown",
        text: breakdown.legacyTotal
          ? `舊版總攻擊 ${numberText(breakdown.total)} W.att；彈藥與被動已含在輸入值內，未再加總。`
          : `裝備 ${numberText(breakdown.gear)} + 箭袋／彈藥 ${numberText(breakdown.ammo)} + 職業被動 ${numberText(breakdown.passive)} = ${numberText(breakdown.total)} W.att。`
      }));
    }
    if (result.stats?.mw20 && result.stats?.beforeMw) {
      const details = createElement("details", { className: "user-preset-panel" });
      details.append(createElement("summary", { text: "屬性計算明細" }));
      for (const stat of getRelevantStatNames(state.draft.classId)) {
        details.append(createElement("p", {
          text: `${STAT_LABELS[stat]}：無 MW ${numberText(result.stats.beforeMw[stat])}；`
            + `基礎 AP ${numberText(result.stats.base[stat])}；`
            + `當前 MW 增量 +${numberText(result.stats.mwIncrement[stat])} → ${numberText(result.stats.selected[stat])}；`
            + `MW20 標準值 ${numberText(result.stats.mw20[stat])}`
        }));
      }
      state.resultRoot.append(details);
    }
    appendMessageList(state.resultRoot, result.warnings, "user-preset-result-warnings");
    state.resultRoot.append(createElement("a", {
      className: "user-preset-result-link",
      text: "在 Progression 查看個人點位",
      attrs: { href: "#/progression" }
    }));
  }

  function buildResultMetric(label, value) {
    const article = createElement("article", { className: "user-preset-result-metric" });
    article.append(createElement("span", { className: "user-preset-result-label", text: label }));
    article.append(createElement("strong", { text: value }));
    return article;
  }

  function emitChange(value) {
    if (typeof onChange !== "function") return;
    onChange(value == null ? null : clone(value), getState());
  }

  function getInput() {
    if (!state.submitted || state.dirty) return null;
    return clone(state.draft);
  }

  function getDraft() {
    return clone(state.draft);
  }

  function getState() {
    return {
      active: Boolean(state.submitted && !state.dirty),
      submitted: state.submitted,
      dirty: state.dirty,
      awaitingResult: state.awaitingResult,
      resultStale: state.resultStale,
      mode: state.mode,
      classId: state.draft.classId,
      storageWarning: state.storageWarning,
      errors: [...state.errors]
    };
  }

  function setResult(result) {
    if (!state.submitted || state.dirty) return false;
    state.awaitingResult = false;
    state.result = result == null ? null : clone(result);
    state.resultStale = false;
    updateStatus();
    updateResult();
    return true;
  }

  return {
    getInput,
    getDraft,
    getState,
    getClassId: () => state.draft.classId,
    setResult,
    submit,
    clear: clearDraft,
    destroy() {
      cancelPersistTimer();
      root.replaceChildren();
    }
  };

  function schedulePersist() {
    cancelPersistTimer();
    state.persistTimer = window.setTimeout(() => {
      state.persistTimer = null;
      persistDraftNow();
    }, 350);
  }

  function persistDraftNow() {
    if (state.suppressPersistence) {
      state.suppressPersistence = false;
      return;
    }
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify(state.draft));
      state.storageWarning = "";
    } catch {
      state.storageWarning = "瀏覽器拒絕本機儲存；本次輸入只會保留到頁面關閉。";
      updateStatus();
    }
  }

  function cancelPersistTimer() {
    if (state.persistTimer !== null) window.clearTimeout(state.persistTimer);
    state.persistTimer = null;
  }
}

function createBlankDraft(classId = "hero", mode = "quick") {
  const source = safeDefaultPreset(classId);
  const draft = normalizeDraft(source, classId);
  draft.schemaVersion = USER_PRESET_SCHEMA_VERSION;
  draft.mode = MODE_VALUES.has(mode) ? mode : "quick";
  draft.classId = classId;
  draft.weaponId = "";
  draft.quick = {
    str: null,
    dex: null,
    luk: null,
    wa: null,
    max: null,
    waMode: "gear"
  };
  draft.ammoWa = 0;
  for (const slot of SLOT_ORDER) draft.slots[slot] = emptySlot();
  draft.clothing = "separate";
  return draft;
}

function safeDefaultPreset(classId) {
  try {
    return defaultPreset(classId);
  } catch {
    return {
      schemaVersion: USER_PRESET_SCHEMA_VERSION,
      mode: "quick",
      classId,
      weaponId: "",
      base: { str: 4, dex: 25, int: 4, luk: 4 },
      quick: { str: null, dex: null, luk: null, wa: null, max: null, waMode: "gear" },
      clothing: "separate",
      slots: Object.fromEntries(SLOT_ORDER.map(slot => [slot, emptySlot()])),
      ammoWa: 0
    };
  }
}

function normalizeDraft(input, classId = input?.classId ?? "hero") {
  const base = safeDefaultPreset(classId);
  const source = input && typeof input === "object" ? input : {};
  const slots = {};
  for (const slot of SLOT_ORDER) {
    slots[slot] = normalizeSlot(source.slots?.[slot] ?? base.slots?.[slot]);
  }
  return {
    schemaVersion: USER_PRESET_SCHEMA_VERSION,
    mode: MODE_VALUES.has(source.mode) ? source.mode : "quick",
    classId,
    weaponId: typeof source.weaponId === "string" ? source.weaponId : "",
    base: normalizeStats(source.base ?? base.base, { includeInt: true }),
    quick: normalizeQuick(source.quick ?? base.quick),
    clothing: CLOTHING_VALUES.has(source.clothing) ? source.clothing : "separate",
    slots,
    ammoWa: finiteOrZero(source.ammoWa)
  };
}

function normalizeQuick(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    str: nullableFinite(source.str),
    dex: nullableFinite(source.dex),
    luk: nullableFinite(source.luk),
    wa: nullableFinite(source.wa),
    max: nullableFinite(source.max),
    waMode: source.waMode === "gear" ? "gear" : "total"
  };
}

function normalizeStats(value, { includeInt = false } = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    str: finiteOrZero(source.str),
    dex: finiteOrZero(source.dex),
    ...(includeInt ? { int: finiteOrZero(source.int) } : {}),
    luk: finiteOrZero(source.luk)
  };
}

function normalizeSlot(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    str: finiteOrZero(source.str),
    dex: finiteOrZero(source.dex),
    luk: finiteOrZero(source.luk),
    wa: finiteOrZero(source.wa)
  };
}

function emptySlot() {
  return { str: 0, dex: 0, luk: 0, wa: 0 };
}

function restoreDraft(storageKey = USER_PRESET_STORAGE_KEY) {
  const storage = getStorage();
  if (!storage) return { input: null, warning: "本機儲存不可用；輸入不會跨頁保存。" };
  let raw;
  try {
    raw = storage.getItem(storageKey);
  } catch {
    return { input: null, warning: "無法讀取本機設定；已使用空白表單。" };
  }
  if (!raw) return { input: null, warning: "" };
  try {
    const parsed = JSON.parse(raw);
    if (!isValidStoredDraft(parsed)) {
      return { input: null, warning: "本機設定版本或格式不相容；已使用空白表單。" };
    }
    const input = normalizeDraft(parsed, parsed.classId);
    if (!CLASS_IDS.has(input.classId)) {
      return { input: null, warning: "本機設定的職業無法辨識；已使用空白表單。" };
    }
    if (input.weaponId && !getWeapons(input.classId).some(item => item.id === input.weaponId)) {
      input.weaponId = "";
    }
    return { input, warning: "已載入上次的本機草稿；請按計算後才會重新啟用結果。" };
  } catch {
    return { input: null, warning: "本機設定無法解析；已使用空白表單。" };
  }
}

function isValidStoredDraft(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.schemaVersion !== USER_PRESET_SCHEMA_VERSION) return false;
  if (!CLASS_IDS.has(value.classId) || !MODE_VALUES.has(value.mode)) return false;
  if (typeof value.weaponId !== "string") return false;
  if (!value.base || !value.quick || !value.slots) return false;
  if (!CLOTHING_VALUES.has(value.clothing)) return false;
  for (const stat of INPUT_STAT_KEYS) {
    if (!isFiniteNumber(value.base[stat])) return false;
  }
  for (const key of ["str", "dex", "luk", "wa", "max"]) {
    if (!isNullableFiniteNumber(value.quick[key])) return false;
  }
  if (value.quick.waMode !== undefined && !["gear", "total"].includes(value.quick.waMode)) return false;
  for (const slot of SLOT_ORDER) {
    if (!value.slots[slot]) {
      if (EVENT_NX_SLOTS.includes(slot)) continue;
      return false;
    }
    for (const key of SLOT_STAT_KEYS) {
      if (!isFiniteNumber(value.slots[slot][key])) return false;
    }
  }
  return isFiniteNumber(value.ammoWa);
}

function validateDraft(input) {
  const errors = [];
  if (!CLASS_IDS.has(input.classId)) errors.push("職業選擇無效。 ");
  if (!input.weaponId) errors.push("請選擇武器類別或指定武器。 ");
  else if (!getWeapons(input.classId).some(item => item.id === input.weaponId)) errors.push("所選武器不屬於目前職業。 ");

  for (const stat of INPUT_STAT_KEYS) {
    if (!isFiniteNumber(input.base?.[stat]) || input.base[stat] < 0) {
      errors.push(`${STAT_LABELS[stat]} 基礎 AP 必須是 0 以上的數值。`);
    }
  }
  if (!isFiniteNumber(input.ammoWa) || input.ammoWa < 0) errors.push("額外 W.att 必須是 0 以上的數值。 ");

  if (input.mode === "quick") {
    for (const stat of getRelevantStatNames(input.classId)) {
      if (!isFiniteNumber(input.quick?.[stat]) || input.quick[stat] < 0) {
        errors.push(`${STAT_LABELS[stat]} 無 MW 總值尚未填寫。`);
      }
    }
    if (!isFiniteNumber(input.quick?.wa) || input.quick.wa <= 0) errors.push("無 MW 總 W.att 必須大於 0。 ");
    if (!isFiniteNumber(input.quick?.max) || input.quick.max < 0) errors.push("無 MW Clean Max range 尚未填寫。 ");
  }

  if (input.mode === "detailed") {
    if (!isFiniteNumber(input.slots?.weapon?.wa) || input.slots.weapon.wa <= 0) {
      errors.push("武器 W.att 必須大於 0。 ");
    }
    if (input.clothing === "separate" && (hasPositiveSlot(input.slots?.overall))) {
      errors.push("目前選擇上衣＋下衣，套服欄位必須為空白或 0。 ");
    }
    if (input.clothing === "overall" && (hasPositiveSlot(input.slots?.top) || hasPositiveSlot(input.slots?.bottom))) {
      errors.push("目前選擇套服，上衣與下衣欄位必須為空白或 0。 ");
    }
    for (const slot of visibleSlots(input.classId, input.clothing)) {
      const values = input.slots?.[slot];
      for (const key of SLOT_STAT_KEYS) {
        if (!isFiniteNumber(values?.[key]) || values[key] < 0) {
          errors.push(`${SLOT_LABELS[slot] ?? slot} 的 ${STAT_LABELS[key]} 必須是 0 以上的數值。`);
        }
      }
    }
  }
  return uniqueMessages(errors);
}

function hasPositiveSlot(slot) {
  return SLOT_STAT_KEYS.some(key => Number(slot?.[key] ?? 0) > 0);
}

function visibleSlots(classId, clothing) {
  return SLOT_ORDER.filter(slot => {
    if (slot === "shield") return classId === "shadower";
    if (slot === "top" || slot === "bottom") return clothing === "separate";
    if (slot === "overall") return clothing === "overall";
    return true;
  });
}

function getWeapons(classId) {
  const collection = WEAPONS?.[classId];
  if (Array.isArray(collection)) return collection.filter(isWeaponRecord);
  if (Array.isArray(collection?.weapons)) return collection.weapons.filter(isWeaponRecord);
  return [];
}

function isWeaponRecord(item) {
  return item && typeof item === "object" && typeof item.id === "string" && typeof item.label === "string";
}

function getRelevantStatNames(classId) {
  let value;
  try {
    value = relevantStats(classId);
  } catch {
    value = null;
  }
  const candidates = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value.primary, value.secondary, value.tertiary, ...(Array.isArray(value.stats) ? value.stats : [])]
      : [];
  const names = candidates.filter(stat => QUICK_STAT_KEYS.includes(stat));
  if (names.length) return [...new Set(names)];
  return [...DEFAULT_RELEVANT_STATS[classId] ?? ["str", "dex"]];
}

function formatRequirements(requirements) {
  if (!requirements || typeof requirements !== "object") return "";
  return ["str", "dex", "luk"]
    .filter(stat => Number.isFinite(requirements[stat]) && requirements[stat] > 0)
    .map(stat => `${STAT_LABELS[stat]} ${requirements[stat]}`)
    .join(" · ");
}

function parseFieldValue(value, { blankAsZero }) {
  if (value.trim() === "") return blankAsZero ? 0 : null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  // Preserve the entered value. The engine owns integer/AP validation; the UI
  // must never display 4.9 while silently evaluating it as 4.
  return number;
}

function formatInputValue(value, blankAsZero) {
  if (value == null || !Number.isFinite(Number(value))) return blankAsZero ? "0" : "";
  return String(value);
}

function rangeText(value) {
  if (Array.isArray(value) && value.length >= 2) return `${numberText(value[0])}–${numberText(value[1])}`;
  if (value && typeof value === "object" && Number.isFinite(value.min) && Number.isFinite(value.max)) {
    return `${numberText(value.min)}–${numberText(value.max)}`;
  }
  return "—";
}

function dpmText(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}m` : "不可用";
}

function numberText(value) {
  return Number.isFinite(Number(value)) ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value)) : "—";
}

function appendMessageList(parent, messages, className) {
  if (!Array.isArray(messages) || messages.length === 0) return;
  const list = createElement("ul", { className });
  for (const message of messages) list.append(createElement("li", { text: displayPresetMessage(message) }));
  parent.append(list);
}

function displayPresetMessage(message) {
  const text = String(message);
  if (text.startsWith("Quick mode verifies aggregate")) return "面板比對通過僅代表總值一致；快速模式無法排除單件裝備自身屬性，裝備需求只做初步檢查。";
  if (text.startsWith("Quick mode cannot prove")) return "Dragon Khanjar 不能靠自己的屬性滿足需求；請用逐部位模式確認。";
  if (text.startsWith("Legacy quick total WA")) return "舊草稿使用已含彈藥與被動的總 W.att，不會重複加總；建議檢查後切換成拆解輸入。";
  if (text === "Base AP total must not exceed 1030.") return "基礎 AP 四屬性合計不可超過 1030。";
  if (text === "Every base stat must be an integer from 4 through 999.") return "各項基礎 AP 必須為 4～999 的整數。";
  const requirement = text.match(/^(.*?) requires (STR|DEX) ([\d.]+); missing ([\d.]+)\.$/);
  if (requirement) return `${requirement[1]} 需要 ${requirement[2]} ${requirement[3]}，目前還差 ${requirement[4]}。`;
  if (text.startsWith("Quick no-MW max range does not match")) return "無 MW Clean Max range 與屬性／W.att 重算最大值不符（容許 1 點取整差異）。請對照上方攻擊力拆解，確認箭袋／彈藥有填、被動沒有重複加，且面板已關閉 Buff。";
  if (/^Corsair .*SE off/.test(text)) return "Corsair 3T 以上尚未支援 SE 關閉的計算。";
  const base = text.match(/^base\.(str|dex|int|luk) (.*)$/);
  if (base) return `基礎 ${base[1].toUpperCase()} 必須填入有效整數。`;
  const below = text.match(/^quick\.(str|dex|luk) cannot be lower than base\./);
  if (below) return `無 MW ${below[1].toUpperCase()} 總值不可低於基礎 AP。`;
  return text;
}

function createElement(tag, { className, text, attrs } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value == null) continue;
    node.setAttribute(key, value);
  }
  return node;
}

function getStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function removeStoredDraft(storageKey = USER_PRESET_STORAGE_KEY) {
  const storage = getStorage();
  if (!storage) return "無法存取本機儲存；表單已清除，但無法確認舊資料是否移除。";
  try {
    storage.removeItem(storageKey);
    return "";
  } catch {
    return "本機設定移除失敗；表單已清除，但舊資料可能仍留在瀏覽器中。";
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isNullableFiniteNumber(value) {
  return value == null || isFiniteNumber(value);
}

function finiteOrZero(value) {
  return isFiniteNumber(value) ? value : 0;
}

function nullableFinite(value) {
  return isFiniteNumber(value) ? value : null;
}

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function uniqueMessages(messages) {
  return [...new Set(messages.filter(Boolean))];
}
