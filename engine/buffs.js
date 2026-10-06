import { applyEchoWa } from "./rounding.js";

export function resolveWaStack({ cleanWa, potionWa, buffIds, buffData }) {
  const selected = new Set(buffIds);
  for (const id of selected) {
    const buff = buffData[id];
    if (!buff) throw new Error(`Unknown buff: ${id}`);
    for (const other of buff.exclusiveWith ?? []) {
      if (selected.has(other)) throw new Error(`Illegal buff stack: ${id} + ${other}`);
    }
  }

  let additive = Number(potionWa ?? 0);
  let echo = 1;
  for (const id of selected) {
    const buff = buffData[id];
    if (buff.kind === "additiveWa") additive += buff.wa;
    if (buff.kind === "timeAveragedAdditiveWa") additive += buff.averageWa;
    if (buff.kind === "multiplicativeWa") echo *= buff.multiplier;
  }

  return {
    cleanWa,
    potionWa,
    buffAdditiveWa: additive - Number(potionWa ?? 0),
    preEchoWa: cleanWa + additive,
    echoMultiplier: echo,
    buffedWa: applyEchoWa(cleanWa + additive, echo)
  };
}
