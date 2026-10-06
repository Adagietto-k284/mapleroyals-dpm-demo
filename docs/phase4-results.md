> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Phase 4 WDEF results — 2026-09-10

Status: accepted by the user as the Phase 4 baseline on 2026-09-10.
Release: 0.4.0-phase4. UI refinements are deferred; the VERIFY items below
remain explicit limitations, not resolved source claims. Final integration
passes 54 tests. Netlify packaging and deployment are separate next steps.

## UI integration

Comparison, Progression and Library now share WDEF. Five discrete UI presets
are offered: 0 / 1000 / 2000 / 3200 / 4000. These sample the tested sweep from
baseline through intermediate defense to its ceiling without crowding controls;
they are not claims about particular bosses. No continuous slider is used.
Changing WDEF invalidates calculation caches and fits charts; clean X is fixed.
Library stage tables, target strategies and traces use the selected WDEF.
Archived Forum/Extreme/Fury DPM is hidden outside WDEF=0; clean-range references
remain available. No dynamic reference fitting or Krex integration was added.

## Bounded implementation

The v9.5.0 engine now supports the frozen WDEF v0.1 slice. The implementation
is limited to a Lv200 attacker against a same-level or lower-level target,
WDEF 0–4000, and the existing nine canonical class engines. No UI, Krex,
BW/Axe branch, custom gear/AP, or high-level target rule was added.

The calculation path is:

```text
existing gear/stats/WA and buffs
→ existing base range
→ Paladin element modifier, where applicable
→ base min − 0.6 × WDEF / base max − 0.5 × WDEF
→ existing skill and critical handling
→ existing 199,999 line cap
→ existing after-modifier logic
→ DPM aggregation
```

The supported WDEF presets are `0 / 500 / 1000 / 1500 / 2000 / 2500 / 3200 /
4000`. Values outside 0–4000 are rejected. Since the frozen formula does not
define negative damage and the bounded sweep reaches that boundary for some
lower stages, the raw defended base range is floored at zero before skill
coefficients.

## Fixed End-game Apple sweep

The rerunnable [wdef-sweep.mjs](../scripts/wdef-sweep.mjs) uses current
`data/gear.json` and `data/skills.json` with Apple +100 WA, MW20, SE, SI,
Echo, Rage, and average Hero Enrage (+17.333333333333332 WA). It evaluates
1T/3T/6T at every audited preset. The complete 216-row output is
[mapleroyals_wdef_v9_5_0_endgame_apple_sweep.json](../reference/audits/mapleroyals_wdef_v9_5_0_endgame_apple_sweep.json).

The table shows DPM in millions per minute as `WDEF 0 → WDEF 4000`; the
percentage is the mean loss across the three audited target counts.

| Class | 1T | 3T | 6T | Mean loss at 4000 |
|---|---:|---:|---:|---:|
| Hero | 17.575 → 15.416 | 52.724 → 46.249 | 52.724 → 46.249 | 12.28% |
| Dark Knight | 17.765 → 15.804 | 53.295 → 47.412 | 53.295 → 47.412 | 11.04% |
| Paladin | 17.541 → 16.811 | 36.945 → 34.522 | 73.890 → 69.044 | 5.76% |
| Bowmaster | 18.372 → 15.638 | 18.850 → 15.753 | 28.342 → 23.762 | 15.82% |
| Marksman | 17.796 → 15.723 | 18.293 → 15.842 | 60.145 → 52.074 | 12.82% |
| Night Lord | 20.252 → 17.222 | 20.252 → 17.222 | 35.146 → 28.433 | 16.34% |
| Corsair | 24.796 → 20.561 | 27.602 → 22.888 | 53.595 → 44.442 | 17.08% |
| Shadower | 17.987 → 15.225 | 33.956 → 28.741 | 49.178 → 41.625 | 15.36% |
| Buccaneer | 15.782 → 14.683 | 24.131 → 20.728 | 48.063 → 41.172 | 11.80% |

Every row is finite, nonnegative, and nonincreasing as WDEF rises through the
fixed presets.

## Special branches

- Buccaneer Demolition is independently defense-immune. Barrage, Dragon
  Strike, Snatch, and Shockwave still use the generic defended range, so the
  class is not treated as class-wide immune.
- Snipe remains a fixed 199,999 defense-immune component of the current 1–3T
  Marksman rotation. Its seven Strafe casts still use the defended range.
- Paladin applies General Weak before WDEF. The test suite explicitly rejects
  the alternate order.
- PA keeps the current 1.75s cycle, 1–3T Snipe + 7 Strafe policy, and
  cap-before-successive-target multiplier order.
- The only local Shockwave evidence is the existing 700% coefficient evidence
  and the v9.5 4/6T rotation. With no local evidence for defense immunity, it
  is treated as a generic WDEF-sensitive assumption and remains VERIFY.
- Phoenix and Frostprey use the same generic base-range WDEF layer so their
  WDEF=0 terms remain unchanged. Exact summon-defense mechanics were not
  researched or expanded; this treatment remains explicitly VERIFY.

## Comparison with earlier conclusions

The archived CSV is a v9.4.2 audit and is retained unchanged. It is not used
as a v9.5 input. The earlier broad sensitivity grouping is directionally
supported by the current sweep: Corsair, Night Lord, and Bowmaster are the
most WDEF-sensitive; Buccaneer/Shadower are intermediate in the old note;
Hero/Dark Knight are lower; Marksman and Paladin retain fixed/cap-shielded or
branch-dependent protection. The exact ordering is not frozen as a new rule.

The current v9.5 numbers differ where the model intentionally changed:

- Hero and Dark Knight include the v9.5 Echo normalization and current
  warrior inputs; their WDEF=0 baselines are therefore above the archived
  v9.4.2 rows.
- Marksman uses Snipe + 7 Strafe through 3T and PA 1.75s at 4/6T. Historical
  PA 1.40s values and the old 6T MM/Paladin crossing are not current targets.
- Buccaneer keeps the direct line/cap engine and the v9.5 4/6T Shockwave
  cooldown rotation. The known workbook/direct-engine delta remains open; no
  coefficient was fitted to remove it.

Notable current ranking changes are ordinary consequences of those inputs:
Paladin moves ahead of Shadower in the 1T sweep by the 1000 preset, and
Paladin remains first at 6T because current PA is 1.75s rather than the
retired 1.40s branch. These are observed sweep results, not hardcoded rank
rules.

## Verification and unresolved items

`npm test` passes all 52 tests, retaining the prior 44-test suite (with the
old WDEF lock replaced by the bounded WDEF contract test). Added coverage
checks asymmetric subtraction, Paladin ordering, cap ordering, Bucc
Demolition immunity, Snipe immunity, summon treatment, WDEF=0 regression,
domain validation, and the full current stage/potion/target monotonic grid.

Remaining VERIFY/open items are exact summon-defense mechanics, Shockwave
defense classification, Bucc workbook parity, and any WDEF behavior outside
the 0–4000 same/lower-level slice. No conclusion is made for higher-level
enemies or WDEF above 4000.
