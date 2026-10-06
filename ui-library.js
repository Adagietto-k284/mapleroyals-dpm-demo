import { isPrivateChatSource, publicSourceData } from "./public-sources.js";
import { CLASS_META, formatNumber } from "./ui-model.js";
import {
  GEAR_CONFIDENCE,
  buildLibraryModel,
  buildMechanicsModel,
  buildValidationModel
} from "./library-data.js";

const UNKNOWN = "Not provided in current source";

const el = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
};

export function renderLibrary(container, options = {}) {
  container.replaceChildren();
  const sectionId = options.sectionId ?? "classes";
  if (sectionId === "mechanics") {
    renderMechanics(container, buildMechanicsModel(options.data));
    return;
  }
  if (sectionId === "validation") {
    renderValidation(container, buildValidationModel(options.data));
    return;
  }
  renderClassLibrary(container, buildLibraryModel(options));
}

function renderClassLibrary(container, model) {
  const current = model.stages.find(stage => stage.stage === model.stageId);
  const intro = el("div");
  intro.className = "library-class-intro";
  const title = el("div");
  title.className = "library-class-title";
  const swatch = el("span");
  swatch.className = "library-class-swatch";
  swatch.style.backgroundColor = model.color;
  swatch.setAttribute("aria-hidden", "true");
  title.append(swatch, el("div"));
  title.lastChild.append(el("p", "Class model"), el("h3", model.label));
  const state = el("div");
  state.className = "library-status-stack";
  state.append(
    badge("Aggregate inputs loaded", "confirmed"),
    badge(`Range model · ${model.rangeModel}`, "neutral"),
    badge(`Stage focus · ${model.stageId}`, "accent")
  );
  title.append(state);
  intro.append(title);
  intro.append(el("p", "The library separates confirmed aggregate inputs from representative slot descriptions. Select a stage above to inspect the matching calculation trace."));
  container.append(intro);

  appendSection(container, "Selected stage", "This summary follows the current MW, potion and buff controls. The clean range remains the fixed MW20 value used on the Progression X axis.", section => {
    const cards = el("div");
    cards.className = "library-metric-grid";
    for (const [label, valueText, tone] of [
      ["Clean WA", wa(current?.cleanWa), ""],
      ["MW20 clean range", rangeText(current?.cleanRange), ""],
      ["Current buffed range", rangeText(current?.buffedRange), ""],
      ["Current DPM", current?.dpm === null ? current?.unavailable ?? "Unavailable" : `${current?.dpm.toFixed(3)}m`, "accent"]
    ]) {
      const card = el("article");
      card.className = `library-metric ${tone ? `library-metric-${tone}` : ""}`;
      card.append(el("p", label), el("strong", valueText));
      cards.append(card);
    }
    section.append(cards);
  });

  appendSection(container, "Stage aggregates", "Base AP + floor(AP × MW%) + equipment stats gives the actual stats used by the selected combat setting. Current DPM uses the selected target and potion controls.", section => {
    section.append(table([
      "Stage", "Aggregate status", "Base AP", "MW bonus", "Equipment stats", "Actual stats", "Clean WA", "MW20 clean range", "Current buffed range", "Current DPM"
    ], model.stages.map(stage => [
      stage.stage,
      confidenceLabel(stage.sourceConfidence),
      statsText(stage.baseAp),
      statsText(stage.mw),
      statsText(stage.equipmentStats),
      statsText(stage.actualStats),
      wa(stage.cleanWa),
      rangeText(stage.cleanRange),
      rangeText(stage.buffedRange),
      stage.dpm === null ? stage.unavailable ?? "Unavailable" : `${stage.dpm.toFixed(3)}m`
    ]), "library-wide-table"));
  });

  appendSection(container, "Weapon, off-hand & ammunition", model.weaponEquipment.note, section => {
    for (const [label, values] of [
      ["Weapon", model.weaponEquipment.weapon],
      ["Off-hand / shield", model.weaponEquipment.offhand],
      ["Throwing stars / bullets / quiver", model.weaponEquipment.ammo]
    ]) {
      if (values.every(value => value === "Not applicable")) continue;
      const card = el("article");
      card.className = "library-rule-card";
      card.append(el("h4", label));
      card.append(table(["Entry", "Advanced", "Late-game", "End-game"], [values]));
      section.append(card);
    }
  });

  appendSection(container, "Equipment by slot", "Recovered source tables with approved September 11 gear corrections. Shoulder grants all four stats (2 through Late, 3 at End). Unlisted stats are not a complete slot reconstruction. Corsair remains on its old aggregate pending its overall/gun breakdown.", section => {
    const legend = el("div");
    legend.className = "library-legend";
    legend.append(
      badge(GEAR_CONFIDENCE.exact, "exact"),
      badge(GEAR_CONFIDENCE.representative, "representative"),
      badge(GEAR_CONFIDENCE.confirmedTotal, "total")
    );
    section.append(legend);
    if (model.slotTables.length === 0) {
      section.append(el("p", "No slot table was recovered for this class. Aggregate inputs remain visible above."));
    }
    for (const slotTable of model.slotTables) {
      section.append(el("h4", slotTable.caption));
      section.append(table([...slotTable.headers, "Reading status"], slotTable.rows.map(row => [
        ...row.cells,
        confidenceLabel(row.confidence)
      ]), "library-wide-table"));
    }
    if (model.classId === "buccaneer") {
      const note = el("p", "Buccaneer archive note: the Pioneer row's third value is the CGS attack budget. It is not weapon attack on Pioneer itself. The recovered slot table has no separate CGS item row; the runtime clean WA remains the frozen aggregate.");
      note.className = "library-note library-note-warning";
      section.append(note);
    }
    if (model.classId === "shadower") {
      section.append(el("h4", "Eye / face / earring stat review (STR / DEX / LUK)"));
      section.append(table(["Slot", "Entry", "Advanced", "Late-game", "End-game"], [
        ["Face", "5 / 5 / 5", "5 / 5 / 5", "5 / 5 / 10", "0 / 0 / 15"],
        ["Eye", "~1 / ~8 / 0", "~3 / ~10 / 0", "3 / 8 / 3", "3 / 8 / 5"],
        ["Earring", "~2 / ~12 / ~2", "~2 / ~16 / ~2", "2 / 2 / 18", "2 / 2 / 20"]
      ], "library-wide-table"));
      section.append(el("p", "Late/End now use the approved explicit slot values. Face/eye CS stats are included, not added a second time. Entry/Advanced retain their historical aggregates, adjusted only for the shared shoulder rule."));
    }
    if (model.source && !isPrivateChatSource(model.source)) {
      const source = el("p");
      source.className = "library-source-line";
      source.append(document.createTextNode("Class source: "), link("open recovered source conversation", model.source));
      section.append(source);
    }
  });

  appendSection(container, "Skills and damage model", "Cards show values present in the current skill fixture. A missing field is shown explicitly instead of being inferred from a familiar skill name.", section => {
    const grid = el("div");
    grid.className = "library-card-grid";
    for (const card of model.skillCards) grid.append(skillCard(card));
    section.append(grid);
  });

  appendSection(container, "Target strategy", `The DPM column uses the ${model.stageId} stage with the current controls. Buccaneer keeps separate ST and non-ST windows.`, section => {
    section.append(table(["Targets", "Mainline strategy", "Timing", "Target rule", "Special rule", `${model.stageId} DPM`], model.strategies.map(strategy => [
      `${strategy.targetCount}T`, strategy.plan, strategy.timing, strategy.targetRule, strategy.specialRule,
      strategy.dpm === null ? strategy.unavailable ?? "Unavailable" : `${strategy.dpm.toFixed(3)}m`
    ]), "library-wide-table"));
  });

  appendSection(container, "Calculation trace", "This trace is produced from the selected class stage and engine audit. Values absent from the audit stay marked as unavailable.", section => {
    section.append(table(["Step", "Item", "Current value", "Origin / rule"], model.calculation.map(row => [row.step, row.label, row.value, row.source]), "library-wide-table library-trace-table"));
  });

  appendRawData(container, "Raw data (advanced)", [
    ["Gear class record", model.raw.gear],
    ["Skill class record", model.raw.skills],
    ["Buff database", model.raw.buffs],
    ["Potion database", model.raw.potions]
  ]);
}

function renderMechanics(container, model) {
  appendPageIntro(container, "Mechanics", "Shared rules that connect the gear profile, buffs, range formulas and class engines.");
  appendSection(container, "Buff and AP rules", "These rules are shared across the interactive pages. Class-owned switches remain in the global control panel and are reflected in the selected class trace.", section => {
    section.append(table(["Rule", "Current behavior", "Control / value"], model.buffRows));
  });
  appendSection(container, "Potion inputs", "Potion WA is added before Echo. It is an engine input, not a multiplier applied to an Apple result.", section => {
    section.append(table(["Potion", "Added WA", "Order"], model.potionRows));
  });
  appendSection(container, "Weapon and range models", "Each class uses an explicit weapon model. Range anchors in reference data are validation checks only.", section => {
    section.append(table(["Class", "Range model", "Rule family"], model.weaponRows));
  });
  appendSection(container, "Calculation rules", "WDEF presets apply across all three pages. Current v9.5 results are separate from the archived v9.4.2 audit; Shockwave, summon defense and the zero floor remain model assumptions.", section => {
    const grid = el("div");
    grid.className = "library-rule-grid";
    for (const [name, description] of model.ruleRows) {
      const card = el("article");
      card.className = "library-rule-card";
      card.append(el("h4", name), el("p", description));
      grid.append(card);
    }
    section.append(grid);
  });
  appendRawData(container, "Raw data (advanced)", [
    ["Buff database", model.raw.buffs],
    ["Potion database", model.raw.potions],
    ["Gear calculation rules", model.raw.gearRules]
  ]);
}

function renderValidation(container, model) {
  appendPageIntro(container, "Validation and sources", "Validation status is shown separately from runtime calculations. A passing test means the code path ran; it does not turn every source value into a verified parity fixture.");
  appendSection(container, "Version summary", "The visible version is the model/runtime version currently loaded by the app.", section => {
    section.append(table(["Area", "Version / value", "Status"], model.summaryRows));
  });
  appendSection(container, "Published reference records", "Range-only records show no DPM value. Private conversation links are omitted; public source links are shown when available.", section => {
    section.append(table(["Class", "Kind", "Label", "Clean range", "Reference DPM (see basis)", "Evidence status", "Source"], model.referenceRows.map(row => [
      row[0], row[1], row[2], row[3], row[4], row[5], link("open source", row[6])
    ]), "library-wide-table"));
  });
  appendSection(container, "Pending source payloads", "These items are listed as pending in the current reference manifest.", section => {
    if (!model.pending.length) {
      section.append(el("p", "No pending payloads are listed."));
      return;
    }
    const list = el("ul");
    for (const pending of model.pending) list.append(el("li", pending));
    section.append(list);
  });
  appendRawData(container, "Raw data (advanced)", [
    ["Version manifest", model.raw.versions],
    ["Model sync manifest", model.raw.sync],
    ["Chart reference manifest", model.raw.references]
  ]);
}

function appendPageIntro(container, title, description) {
  const intro = el("div");
  intro.className = "library-page-intro";
  intro.append(el("p", "Reading guide"), el("h3", title), el("p", description));
  container.append(intro);
}

function appendSection(container, title, description, render) {
  const expanded = ["Selected stage", "Weapon, off-hand & ammunition", "Equipment by slot", "Calculation rules", "Version summary"].includes(title);
  const section = el(expanded ? "section" : "details");
  section.className = "library-section";
  const heading = el(expanded ? "div" : "summary");
  heading.className = "library-section-heading";
  heading.append(el("h3", title));
  if (description) heading.append(el("p", description));
  section.append(heading);
  render(section);
  container.append(section);
}

function skillCard(card) {
  const article = el("article");
  article.className = "library-skill-card";
  const heading = el("div");
  heading.className = "library-card-heading";
  heading.append(el("h4", card.name), badge(card.role, "neutral"));
  article.append(heading);
  const facts = el("dl");
  facts.className = "library-facts";
  for (const fact of card.facts) {
    facts.append(el("dt", fact.label), el("dd", fact.value));
  }
  article.append(facts);
  if (card.note) article.append(el("p", card.note));
  return article;
}

function appendRawData(container, title, sections) {
  const details = el("details");
  details.className = "library-raw-data";
  details.append(el("summary", title), el("p", "Advanced inspection only. The primary Library view is represented by the tables and cards above."));
  for (const [label, value] of sections) {
    const block = el("details");
    const pre = el("pre", JSON.stringify(publicSourceData(value), null, 2));
    block.append(el("summary", label), pre);
    details.append(block);
  }
  container.append(details);
}

function table(headers, rows, className = "") {
  const wrap = el("div");
  wrap.className = `table-wrap ${className}`.trim();
  const tableNode = el("table");
  const thead = el("thead");
  const headerRow = el("tr");
  for (const header of headers) {
    const cell = el("th", header);
    cell.scope = "col";
    headerRow.append(cell);
  }
  thead.append(headerRow);
  tableNode.append(thead);
  const tbody = el("tbody");
  for (const row of rows) {
    const rowNode = el("tr");
    for (const value of row) {
      const cell = el("td");
      if (value instanceof Node) cell.append(value);
      else cell.textContent = value === undefined || value === null || value === "" ? "—" : String(value);
      rowNode.append(cell);
    }
    tbody.append(rowNode);
  }
  tableNode.append(tbody);
  wrap.append(tableNode);
  return wrap;
}

function badge(text, tone = "neutral") {
  const node = el("span", text);
  node.className = `library-badge library-badge-${tone}`;
  return node;
}

function link(label, href) {
  if (!href || isPrivateChatSource(href)) return el("span", "—");
  const anchor = el("a", label);
  anchor.href = href || "#";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  return anchor;
}

function confidenceLabel(confidence) {
  return GEAR_CONFIDENCE[confidence] ?? UNKNOWN;
}

function statsText(stats = {}) {
  const values = Object.entries(stats).filter(([, value]) => Number.isFinite(value)).map(([stat, value]) => `${stat.toUpperCase()} ${formatNumber(value)}`);
  return values.length ? values.join(" · ") : UNKNOWN;
}

function rangeText(range) {
  return range && Number.isFinite(range.min) && Number.isFinite(range.max)
    ? `${formatNumber(range.min)}–${formatNumber(range.max)}`
    : UNKNOWN;
}

function wa(value) {
  return Number.isFinite(value) ? `${formatNumber(value, 3)} WA` : UNKNOWN;
}
