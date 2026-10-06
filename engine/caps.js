export const DEFAULT_LINE_CAP = 199999;

export function capLine(value, cap = DEFAULT_LINE_CAP) {
  assertFiniteNumber(value, "value");
  assertFiniteNumber(cap, "cap");
  if (cap < 0) throw new RangeError("cap must be non-negative.");
  return Math.min(value, cap);
}

/**
 * Return Phi(k) = E[min(kD, cap)] for D ~ Uniform[min, max].
 *
 * `min` and `max` are the uncapped base range. Keeping the multiplier (`k`)
 * separate makes the helper reusable for skill coefficients and buff branches.
 */
export function cappedUniformExpectation({ min, max, k = 1, cap = DEFAULT_LINE_CAP } = {}) {
  assertFiniteNumber(min, "min");
  assertFiniteNumber(max, "max");
  assertFiniteNumber(k, "k");
  assertFiniteNumber(cap, "cap");

  if (min > max) throw new RangeError("min must not exceed max.");
  if (k < 0) throw new RangeError("k must be non-negative.");
  if (cap < 0) throw new RangeError("cap must be non-negative.");
  if (k === 0 || cap === 0) return 0;

  const scaledMin = k * min;
  const scaledMax = k * max;
  if (scaledMax <= cap) return (scaledMin + scaledMax) / 2;
  if (scaledMin >= cap) return cap;

  // The crossover point is inside the uniform interval:
  // integral(kx, min..cap/k) + integral(cap, cap/k..max), divided by range.
  const cutoff = cap / k;
  const uncappedIntegral = (k * (cutoff ** 2 - min ** 2)) / 2;
  const cappedIntegral = cap * (max - cutoff);
  return (uncappedIntegral + cappedIntegral) / (max - min);
}

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number.`);
}
