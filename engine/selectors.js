export function selectBestCandidate(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("Auto selector requires at least one candidate.");
  }
  return candidates.reduce((best, cur) => cur.dpm > best.dpm ? cur : best);
}

export function resolveSelector({ mode, candidates, canonicalId }) {
  if (mode === "auto") return selectBestCandidate(candidates);
  const chosen = candidates.find(x => x.id === canonicalId);
  if (!chosen) throw new Error(`Canonical selector branch not found: ${canonicalId}`);
  return chosen;
}
