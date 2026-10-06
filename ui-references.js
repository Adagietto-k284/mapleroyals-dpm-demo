import { DEFAULT_COMBAT } from "./engine/profile.js";

export const REFERENCE_FILTER_KEYS = Object.freeze([
  "forumMedian",
  "forumFirst",
  "extreme",
  "fury"
]);

export function referenceFilterKey(record) {
  if (record?.id === "fury" || record?.kind === "Alternate") return "fury";
  if (record?.kind === "Forum median") return "forumMedian";
  if (record?.kind === "Forum #1") return "forumFirst";
  if (record?.kind === "Extreme") return "extreme";
  return null;
}

export function normalizeReferenceFilters(filters) {
  return Object.fromEntries(REFERENCE_FILTER_KEYS.map(key => [
    key,
    filters?.[key] !== false
  ]));
}

export function selectReferences(data, {
  targetCount,
  potionId,
  wdef = 0,
  combat,
  visibleClasses,
  referenceVisibility
} = {}) {
  const effectiveCombat = { ...DEFAULT_COMBAT, ...(combat ?? {}) };
  const defaultBuffs = Object.entries(DEFAULT_COMBAT).every(([key, value]) => effectiveCombat[key] === value);
  const canonical = potionId === "apple" && defaultBuffs && wdef === 0;
  const filters = normalizeReferenceFilters(referenceVisibility);
  const visible = visibleClasses instanceof Set ? visibleClasses : new Set();

  return (data?.records ?? [])
    .filter(record => visible.has(record.classId))
    .filter(record => !record.targetOnly || record.targetOnly === targetCount)
    .filter(record => {
      const key = referenceFilterKey(record);
      return key === null || filters[key];
    })
    .map(record => {
      const filterKey = referenceFilterKey(record);
      const isFury = filterKey === "fury";
      const plottedDpm = canonical && Number.isFinite(record.dpmM?.[String(targetCount)])
        ? record.dpmM[String(targetCount)]
        : null;
      return {
        ...record,
        filterKey,
        isFury,
        displayKind: isFury ? "Fury · alternate configuration" : record.kind,
        displayLabel: isFury ? `${record.label} · alternate configuration` : record.label,
        plottedDpm,
        displayStatus: canonical
          ? record.status
          : `${record.status}. Archived DPM hidden: current combat settings or WDEF differ.`
      };
    });
}
