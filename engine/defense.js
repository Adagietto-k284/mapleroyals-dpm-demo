export const WDEF_SPEC_VERSION = "v0.1";
export const WDEF_MIN = 0;
export const WDEF_MAX = 4000;
export const WDEF_PRESETS = Object.freeze([
  0, 500, 1000, 1500, 2000, 2500, 3200, 4000
]);

const MIN_WDEF_FACTOR = 0.6;
const MAX_WDEF_FACTOR = 0.5;

/**
 * Apply the frozen Lv200 same/lower-level WDEF layer.
 *
 * The subtraction happens on the physical base range, before skill/critical
 * coefficients and the line cap. A zero floor is the smallest supported
 * low-damage boundary: the frozen audit specifies the subtraction but does
 * not define negative damage, while the supported sweep must remain physical.
 * Skills with a verified fixed-defense exception can pass `immune: true`.
 */
export function applyDefense({
  min,
  max,
  wdef = 0,
  immune = false,
  ignoreDefense = false
} = {}) {
  assertFiniteNumber(min, "min");
  assertFiniteNumber(max, "max");
  if (min > max) throw new RangeError("min must not exceed max.");

  const normalizedWdef = normalizeWdef(wdef);
  if (immune || ignoreDefense) {
    return {
      min,
      max,
      wdef: normalizedWdef,
      status: "immune"
    };
  }

  const defendedMin = Math.max(0, min - MIN_WDEF_FACTOR * normalizedWdef);
  const defendedMax = Math.max(0, max - MAX_WDEF_FACTOR * normalizedWdef);
  return {
    min: defendedMin,
    max: defendedMax,
    wdef: normalizedWdef,
    status: normalizedWdef === 0 ? "normalized-zero" : "applied"
  };
}

export function normalizeWdef(wdef = 0) {
  assertFiniteNumber(wdef, "wdef");
  if (wdef < WDEF_MIN || wdef > WDEF_MAX) {
    throw new RangeError(`wdef must be between ${WDEF_MIN} and ${WDEF_MAX}.`);
  }
  return wdef;
}

export const WDEF_FORMULA = Object.freeze({
  specVersion: WDEF_SPEC_VERSION,
  min: "baseMin - 0.6 × WDEF",
  max: "baseMax - 0.5 × WDEF",
  order: "after-element-before-skill",
  nonNegativeFloor: 0
});

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
}
