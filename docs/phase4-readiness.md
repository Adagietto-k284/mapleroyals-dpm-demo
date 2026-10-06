> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Phase 4 readiness — 2026-09-10

Assessment only; WDEF remains locked. Confirmed gear fixtures are not being rebuilt.

## Available

- Frozen `docs/wdef-spec-v0.1.md`: Lv200 attacker, same/lower-level target; min minus 0.6 WDEF, max minus 0.5 WDEF; defense before skill/critical/cap, after Paladin elemental modifiers.
- Archived WDEF CSV and XLSX under `reference/audits`: End-game Apple, 1/3/6 targets, WDEF 0/500/1000/1500/2000/2500/3200/4000. CSV inspected; XLSX not re-audited in this assessment.
- Existing cap-aware engines and archived v9.4.2 inputs. Current 44 tests pass, including the intentional nonzero-WDEF rejection.
- Fixed Snipe defense immunity is already structurally separate. Paladin already applies element before the shared defense call.

## Gaps / version alignment

- Audit is v9.4.2, runtime is v9.5: updated Warrior inputs/Echo, MM PA 1.75s and 1–3T policy, Bucc 4/6T Shockwave rotation. Old ranking crossings and MM auto-selection requirements are historical, not current acceptance targets.
- `engine/defense.js` currently rejects nonzero values. Bucc currently passes one defended range to all skills: Demolition needs a separate immune path before unlocking. The old WDEF spec does not explicitly classify newly adopted Shockwave; check its existing source for that narrow point.
- Frozen summon-defense behavior remains VERIFY. Per user scope, do not expand summon research; keep its limitation explicit without changing WDEF=0 output.
- Frozen quantitative coverage is End-game/Apple/1,3,6T only. Other stages, potions, buffs and 2/4T need implementation regression checks, not claims of pre-existing authoritative sweep parity.
- Low-damage boundary/clamping is not specified in the frozen formula. Check whether the supported minimum-stat/buff domain can reach it; resolve only if relevant. Higher-level enemies remain unsupported.
- Existing Bucc workbook/direct-engine delta is separate from defense correctness. Do not fit coefficients to erase it.

## Minimal proposed next work (not implemented)

1. Align the short WDEF implementation contract with current models; retain the historical audit unchanged. Resolve only Shockwave and any reachable low-damage boundary from existing sources.
2. Implement base defense and per-skill immunity; test subtraction order, cap ordering and unchanged WDEF=0 results. Use legacy fixtures only with matching legacy inputs; document any existing baseline differences rather than overwriting evidence.
3. Check current-model sweeps for finite/nonnegative results and nonincreasing DPM as WDEF increases, fixed MW20 clean X, and correct immunity. Add 0–4000 slider/presets and shared page state only after these pass.

No Krex integration, new weapon branches, MM selector expansion, summon research, or custom gear/AP in this scope. Dynamic Forum/Extreme estimates remain a separate unimplemented follow-up; archived projections must not silently be presented as nonzero-WDEF results.
