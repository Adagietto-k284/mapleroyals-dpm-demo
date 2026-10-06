> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Model sync — 2026-09-08

Runtime status: **v9.5.0 integration**, not complete workbook parity.
Machine-readable source values (private message identifiers omitted): `data/model-sync-v9.5.0.json`.

## Sources retrieved

- 統整MapleRoyals進度 p.3 (project-authored record; private provenance omitted): final v9.5.0 decisions, published DPM and chart requirements.
- 重算戰士裝備模型 (project-authored record; private provenance omitted): final aggregate gear/range table, Echo normalization, later Advanced/Late discussion.
- 建立弓手裝備進程 model (project-authored record; private provenance omitted): empirical PA timing, selector, four-stage comparison and BM policy.
- 整理 Buccaneer 公式 (project-authored record; private provenance omitted): measured rotation timings and exclusion of Energy skills without a charge model.

Chat text was retrieved directly. Generated workbook/chart links were returned as unresolved content-reference placeholders; the original v9.5.0 binary artifacts have not been imported. The source's FINAL label is not a claim that this JS integration has complete numeric parity.

## Integrated

1. Warrior End-game STR = 1353, DEX = 97. DK clean WA = 212; Hero/Paladin = 223. Range is recalculated from stats/WA. Reference ranges are checksums only.
2. Hero and DK now apply Echo after additive WA. Hero retains Enrage 26 × 240/360. This normalization applies to all four stages; only End-game gear totals changed.
3. MM uses Snipe + 7 Strafe for 1–3T and PA 1.75s for 4/6T. PA 1.20/1.40 are retired and rejected for current input; only the archived profile reproduces historical outputs. Cap-before-pierce remains unchanged. Frostprey remains included.
4. BM retains Hurricane + Phoenix 1–3T and Arrow Rain + Phoenix 4/6T. Its numbers did not change. Bomb geometry / Inferno elemental and DoT branches remain outside mainline.
5. Bucc retains 1T ST B+Demo / downtime B+DS, 2T B+DS throughout, 3T ST DS+Snatch / downtime B+DS. At 4/6T downtime now uses regular Transform DS+Shockwave at 2.400s; ST uses DS+Snatch at 1.653s. ST weighting is 75/25. Energy Blast/Orb and cancel tricks are excluded.

## Numeric verification and unresolved delta

Warrior End-game and MM outputs match source rounding precision (0.001m for p.3, 0.01m for the Archer stage table).

| Bucc stage | p.3 4T | Engine 4T | p.3 6T | Engine 6T |
|---|---:|---:|---:|---:|
| Entry | 25.108 | 25.122126 | 37.662 | 37.683189 |
| Advanced | 27.098 | 27.090506 | 40.646 | 40.635758 |
| Late-game | 29.959 | 29.971851 | 44.939 | 44.957776 |
| End-game | 32.016 | 32.041772 | 48.024 | 48.062657 |

Units: million damage/minute. p.3 says it derives new numbers from the frozen 4T/6T target slope. The engine directly evaluates skill lines with existing cap/SE rules. Shockwave 700% follows the recorded 3T comparison: (900 + 700) × 3 / 2.4 = 2000%/s. Additive SE uses the existing +140%, 15% rule. No damage coefficient was fitted to published DPM. Both results are retained; this delta remains open.

Regular Transformation is assumed available for the full 60s downtime window. Cast/positioning costs are not added. The model assumes full target retention, without Snatch control during downtime.

The v9.4.2 gear/skills snapshot lives in `reference/archive/model-inputs-v9.4.2.json`. Historical golden outputs and Potion Sweep are tested against that profile. Current tests separately cover the new Warrior/MM source values, Echo behavior, Bucc rotation arithmetic, and the full potion/stage/target grid. Current computed sweeps must not be presented as the historical golden suite.

## Latest discussion still open

- Warrior Advanced/Late: later messages propose per-slot review. Diagnostic STR values (DK 1261/1321, Hero 1247/1288) are not confirmed equipment inputs and were not adopted. WA and earlier aggregate stats remain frozen. The final source explicitly says it did not recover a complete new per-slot table.
- 1H/BW/Axe: source now contains branch conclusions (BW cap separately per motion before 60/40 weighting; ACB is indirect evidence). Exact branch gear/parameters still need importing before enabling interactive calculation. Stonetooth is excluded from scope.
- Polearm Fury: p.3 final explicitly retains a standalone 6T 64.25m alternate. Earlier Warrior text had a different provisional normalized marker (~68.7m); it is superseded. Exact polearm clean-range coordinate is not yet established here.
- Forum markers: p.3 requires all supported class median/#1 and available Extreme points. Recovered DK snapshot: median max 13603.5, #1 Puke max 15003. Other numeric payloads and each marker's DPM assumptions remain to import; no marker DPM is inferred from range alone.

## Next work: Phase 3 navigation, Progression and Library

1. Add `Comparison | Progression | Library` navigation; retain existing four-stage Comparison.
2. Progression: MW20 clean **max** on X, DPM on Y, four markers per class, class colors and stage shapes, 1/2/3/4/6T. Hover shows full min/max, stage, rotation, buffs and cap. Connect stage points without claiming a continuously reconstructed gear curve.
3. Shared combat controls: potion, MW level, SE, SI, Echo, mutually exclusive Rage/Dragon Blood, Hero average Enrage. Refactor embedded buff/timing assumptions into verified inputs. MW uses base AP, never equipment stats. Keep the X-axis MW20-clean normalization fixed when combat buffs change; combat MW affects DPM. The earlier suggestion to move a labelled MW20 X-axis with combat MW is superseded by this consistent definition.
4. Library: Classes (Gear, Skill, Rotation, Damage), Mechanics (weapons, buffs, potions, timings, cap, elements, WDEF status), Validation & Sources. Read runtime data and source metadata; distinguish confirmed totals from per-slot information not yet recovered. Do not duplicate formulas.
5. Add sourced Forum/Extreme overlays with dashed class guides and the standalone Fury point once their numeric payloads are available. Preserve explicit unresolved status for the Bucc workbook delta.

Acceptance: both graphs use identical combat settings and DPM; switching pages preserves filters; Library traces a point to the actual calculation inputs; default values pass v9.5 tests; unsupported buff/timing paths are visibly unavailable rather than silently using full-buff constants.

Custom gear/AP and Your Build markers remain Phase 5. WDEF integration requires checking the v9.4.2 audit against the changed MM/Bucc/Warrior models before unlocking its slider. All work in this sync is local and uncommitted.
