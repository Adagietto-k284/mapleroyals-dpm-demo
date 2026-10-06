import * as bowmaster from "./classes/bowmaster.js";
import * as buccaneer from "./classes/buccaneer.js";
import * as corsair from "./classes/corsair.js";
import * as darkKnight from "./classes/dark-knight.js";
import * as hero from "./classes/hero.js";
import * as marksman from "./classes/marksman.js";
import * as nightLord from "./classes/night-lord.js";
import * as paladin from "./classes/paladin.js";
import * as shadower from "./classes/shadower.js";

export const CLASS_ENGINES = Object.freeze({
  bowmaster,
  buccaneer,
  corsair,
  "dark-knight": darkKnight,
  hero,
  marksman,
  "night-lord": nightLord,
  paladin,
  shadower
});

export function getClassEngine(classId) {
  const engine = CLASS_ENGINES[classId];
  if (!engine) throw new Error(`Unknown class engine: ${classId}.`);
  return engine;
}

export function evaluateClass(classId, context = {}) {
  return getClassEngine(classId).evaluate({ ...context, classId });
}
