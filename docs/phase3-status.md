> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Phase 3 status — three-page integration

## p.3 FINAL reference recovery

Recovered Forum Validation from the original v9.5.0 FINAL workbook: all nine
classes have median and #1 records. Extreme is DK (awlz), NL (Xves), and Paladin
(awladin) only. The former BM Extreme entry is preserved in the pre-import archive.
All five target views now contain 18 Forum and 3 Extreme points under canonical
settings. Fury uses FINAL Alternates E2/J2: 14890.54 range and 64.2514m at 6T.

The p.3 FINAL plotting code explicitly uses piecewise linear interpolation and
endpoint extrapolation of its frozen four-stage curve for reference DPM. These
are chart projections, not measured player DPM or exact reconstructed gear results.
The UI identifies this basis; source snapshots are in
`reference/archive/forum-p3-final-source.json`. Earlier partial references are
retained in `reference/archive/chart-references-pre-p3.json`.

## September 9 chart performance pass

The focused performance pass removed the Progression end-of-line labels, connector
lines, annotations, transparent hit points, and annotation click handler. The
legend, tooltip, line hover focus, and click-to-pin behavior remain.

The old all-visible 1T chart rendered 37 Plotly traces, 9 annotations, and 68
marker nodes. The same view now renders 19 traces, 0 annotations, and 41 marker
nodes; the 6T view rendered 11 traces after the change. Focus updates are merged
per animation frame, skip an unchanged focus, and use batched restyles instead of
one restyle call per trace plus annotation relayout.

Calculation results are cached by target, potion, and combat conditions. Class
visibility, reference-layer toggles, focus/pin, ranking-stage changes, and Library
navigation reuse the cached nine-class series and avoid redrawing unrelated views.
Browser checks covered 1T/6T, all reference filters, class filtering, MW and
Rage/Dragon Blood controls, hover, zoom, pan, Fit visible data, all three routes,
and a 390px viewport. No console errors or horizontal overflow were observed.

There is no profiler-grade latency benchmark in this pass; the evidence above is
DOM trace reduction plus interactive browser checks. If stutter remains noticeable
after this reduction, the next step is targeted browser profiling rather than more
structural changes.

## September 8 integration

Comparison retains the four-stage X axis. Progression uses MW20 clean maximum
range for X and DPM for Y, with four stage markers and 1/2/3/4/6T switching.
Library exposes current aggregates, AP/equipment contributions, historical slot
tables, skills, calculation audits, mechanics and validation/source links.

Shared controls now include MW 0–20, SE, Echo, exclusive Rage/Dragon Blood/off,
and Hero time-averaged Enrage. MW affects base AP only; clean X remains MW20.
Forum/Extreme/Fury overlays show their archived DPM only under matching canonical
settings. Forum/Extreme use the recovered p.3 projection method described above.

SI-off remains disabled pending verified timings. Corsair Torpedo SE-off at
3/4/6T is explicitly unavailable. Shadower keeps its canonical SE-off model.
Forum/Extreme coverage is restored. Bucc workbook parity and Warrior Advanced/Late
review remain open independently of reference chart coverage.

## September 9 Library reading surface

The Library now presents the model through six readable views inside three sections:

- Class models: four-stage aggregate table, source slot tables, confidence labels,
  skill cards, 1/2/3/4/6T strategy matrix, and a selected-stage calculation trace.
- Mechanics: buff/AP rules, potion order, weapon/range models, caps, target rules,
  WDEF status, and unavailable weapon branches.
- Validation & sources: version summary, evidence status, published reference
  records, source index, and pending payloads.

The slot table labels are `Exact source package`, `Representative / flexible`, and
`Confirmed total only`. Historical slot budgets are not promoted into exact new
gear models. Buccaneer's Pioneer third field is explicitly shown as the CGS attack
budget; the recovered Bucc slot table does not contain a separate CGS row, while
the runtime clean WA remains the frozen aggregate.

Raw JSON is kept in a collapsed `Raw data (advanced)` section at the bottom of each
Library view. Missing audit fields remain `Not provided in current source`; the
Library does not infer intermediate values from skill names.

Library data transformation is isolated in `library-data.js`; the UI renderer is in
`ui-library.js`. The local UI is responsive at the existing 390px breakpoint and
keeps table overflow local to each table wrapper. The current working tree passes
42 automated tests, including four Library data-contract tests.

Next: recover missing timing/reference payloads from existing source artifacts,
then integrate frozen WDEF (Phase 4), without rebuilding confirmed gear models.

Phase 3 MVP is implemented as a dependency-light static UI at the repository
root. It loads the authoritative JSON data, calls the existing class engines,
and renders the results with Plotly.

## Available in the MVP

- Four-stage progression lines: Entry, Advanced, Late-game, and End-game.
- Target switching for 1T, 2T, 3T, 4T, and 6T.
- Potion switching for the current Potion Sweep inputs.
- End-game or selected-stage ranking chart.
- Class visibility toggles.
- Detail table with DPM, buffed range, clean WA, selector, and cap summary.
- Accessible labels, live status messages, responsive layout, and light/dark
  system theme support.

## Scope limits

- The UI uses canonical gear and WDEF = 0, with the supported buff controls above.
- Non-zero WDEF remains locked until the WDEF engine parity work is complete.
- Custom gear/AP remains Phase 5 work.
- Warrior BW and Axe weapon models remain unavailable until their formulas are
  authoritative.

## Local run

From the repository root:

```powershell
npm.cmd run dev
```

Open the printed `http://127.0.0.1:4173/` URL. A local server is required so
the browser can load the ES modules and JSON data.
