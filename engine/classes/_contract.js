/**
 * @typedef {Object} EngineContext
 * @property {string} classId
 * @property {string} stage
 * @property {1|2|3|4|6} targetCount
 * @property {string} potionId
 * @property {number} wdef
 * @property {Object} gear
 * @property {Object} buffs
 * @property {Object} skillData
 * @property {Object} options
 *
 * @typedef {Object} EngineResult
 * @property {number} dpm
 * @property {string} selector
 * @property {Object} audit
 *
 * audit MUST expose:
 * clean WA, additive WA, Echo, buffed min/max, selector,
 * cap state, target count, final DPM, formula version.
 */
export function phase2NotImplemented(classId) {
  throw new Error(`Phase 2 class engine not implemented: ${classId}`);
}
