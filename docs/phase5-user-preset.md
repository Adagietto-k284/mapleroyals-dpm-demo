# Phase 5 — User Preset

## Run and verify

In PowerShell, open this repository and run `npm.cmd run dev`. Open
`http://127.0.0.1:4173/#/user-preset`. If port 4173 is already serving this
repository, use the existing page and refresh it; do not start a second server.

Run `npm.cmd test` and `npm.cmd run build` for automated checks and the static
Netlify output. This feature does not need a backend or account.

## Input contract

- Fixed level 200 and existing max-skill models, SI on. Canonical gear and class
  engine formulas are unchanged.
- Quick mode: enter the no-MW, no-attack-buff Clean Max range, gear-only WA,
  applicable ammunition/quiver WA separately, and gear-inclusive no-MW relevant
  stats. Bowmaster +10 / Marksman +15 passive WA is added automatically.
  The displayed breakdown must sum to the modeled clean WA exactly once.
  The user does not enter a minimum range; the model calculates it and does
  not validate against the DK panel's displayed minimum. Do not enter potion,
  Rage/Dragon Blood, Echo or Enrage bonuses here. Existing saved drafts with
  no WA mode retain the old already-inclusive total WA until explicitly changed.
  Classes without ammunition or passive WA show only one total-WA field;
  old and new values have identical arithmetic for those classes.
- Base AP always excludes equipment and MW. Four values, integers 4–999,
  sum at most 1030; unspent/HP/MP-invested points are permitted. Defaults are
  the existing level-200 model distributions, not mandatory allocations.
- Detailed mode: input finished item stats/WA per slot. Blank optional gear
  fields mean zero. Overall and separate top/bottom are mutually exclusive.
  Time-limited event NX pendant/ring bonuses use separate additive slots,
  default to zero, and must be cleared manually after expiry. Existing stored
  drafts are migrated with both slots set to zero.
  Shield is Dragon Khanjar for Shadower only. Ammo/quiver is separate;
  Bowmaster +10 / Marksman +15 passive WA is automatic in detailed mode too.
- Weapon primary-stat requirements are deliberately ignored by user decision;
  secondary requirements follow the approved weapon list. This does not certify
  item roll/scroll feasibility or all armor requirements.
- MW increment is `floor(baseStat * ceil(skillLevel / 2) / 100)`. Equipment
  stats do not receive MW. Plot X is always normalized MW20 clean maximum;
  plot Y uses the selected shared combat conditions.
- Quick Clean Max verification floors the displayed panel maximum and requires
  an exact integer match. A mismatch blocks DPM and plotting;
  the minimum is model-calculated only and is not used as an input or validation
  condition. Neither range endpoint is used to fit a damage coefficient.
  The personal DPM path also floors Echo-adjusted integer WA and the model
  range endpoints; archived Progression DPM baselines retain their frozen
  floating-point model. Hero's time-averaged Enrage WA remains continuous.
- Detailed requirements exclude the item itself and require a valid equipment
  order for weapon/shield. Quick mode cannot remove individual item bonuses,
  so qualification is explicitly provisional, even when panel verification passes.
- Corsair 3+ targets with SE off remains unsupported. Existing model caveats,
  including Bucc workbook reconciliation, remain unchanged.

## Storage and recalculation

Three independent, nameable input drafts are stored in localStorage for this browser and origin.
No personal inputs are sent to a server. Results are recomputed by the current
model, not stored. Refresh restores the draft; calculate again to activate the
personal point. Clearing personal settings removes the saved draft. Clearing
site data/private browsing or changing browser/domain may lose this data.
Shared combat controls remain session settings, separate from the saved draft.

Editing a draft invalidates only that slot's old result and personal marker until calculation.
Changing shared conditions recomputes submitted inputs. The three comparison rows and
matching colored chart stars show all submitted slots together. Personal markers are stars
and participate in Auto Fit independently of the standard class-curve filters.

The English/Traditional Chinese selector saves its choice locally; on a browser without
a saved choice, the browser language determines the initial UI language.

## AP evidence

- [Royals staff clarification: 1030 includes initial stats; NL 4/25/4/997](https://royals.ms/forum/threads/kind-of-desperately-need-help-with-my-characters-stats.138863/)
- [Level-200 total and advancement accounting](https://royals.ms/forum/threads/how-many-raw-ap-should-i-have.210917/)

## Manual acceptance checklist

1. In detailed Hero / Dragon Claymore, keep base STR999 DEX23 INT4 LUK4,
   enter weapon WA150 only. Calculate; compare quick mode with no-MW STR999,
   DEX23, clean WA150, and Clean Max range 6927. Both modes should agree; the
   model supplies the minimum without requiring a panel minimum input.
2. Change MW20 to MW0: DPM changes, MW20-normalized X does not.
3. Select Stonetooth with insufficient DEX: no DPM/point; clear shortage message.
4. Increase a base stat beyond 999 or total beyond 1030: calculation blocked.
5. Add Shadower shield stats without sufficient stats to equip it: it must not
   qualify itself. Detailed and quick limitations must be visibly distinct.
6. Change a field after calculation: previous result/point disappears until submit.
7. Reload: inputs return, but old computed DPM is not restored. Clear inputs and
   reload: defaults return. Verify no stale point survives a failed calculation.
8. Inspect mobile width and light/dark themes; forms and error text stay readable.

## Deferred

SI-off, slow spears, polearm/Axe/BW branches, full gear database or item legality,
accounts/cloud sync, price/scrolling/HP-washing calculations.
