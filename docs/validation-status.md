# Validation status

Export prepared October 7, 2026.

| Area | Baseline |
| --- | --- |
| Source model | v9.5.0 |
| Runtime | v9.5.0-gear-alignment-1 |
| UI | phase5-v0.1 |
| Package | 0.5.0-phase5 |
| Export source commit | d43d9ed00c39441d332bd6b5bdf7859283363cd6 |

Live Library version markers matched on October 7. This does not establish the exact Netlify deployment commit.

## Night Lord check

1T / Apple / WDEF0 / MW20 / SE / SI / Echo / Rage +12:

| Stage | Clean WA | DPM m |
| --- | --- | --- |
| Entry | 140 | 16.253 |
| Advanced | 156 | 17.530 |
| Late-game | 173 | 18.902 |
| End-game | 188 | 20.541 |

Rounded values were read from the live Library; the suite checks the matching local calculation.

## Export

- Provenance cleanup removes private URLs/message IDs at file level, including runtime data and the gear archive.
- All numerical fields in exported JSON were compared with the source snapshot before publication and retained unchanged.
- Fresh history excludes private branches/commits, handoff files, personal inputs, deployment-account records, and binary workbooks.
- README describes current behavior; inherited older development notes are labeled historical.
- Runnable source, tests, text evidence and five screenshots are included. `dist/` is generated, not committed.

## Pending

Publication checks: 101 tests passed (0 failures), the production build checked 38 public files, and the local Progression page loaded successfully on October 7, 2026.

Bucc 4T/6T workbook reconciliation; Corsair overall/gun details; documented Shockwave/summon-defense assumptions; original formula/gear attribution; Forum snapshot and record-source mapping.

Passing tests does not resolve these mechanics/evidence questions. Re-run `npm test` and `npm run build` when changing source/data.
