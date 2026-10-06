> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Phase 2 status

Phase 2 now has a shared range/cap core, nine executable class engines, and
regression coverage for the v9.4.2 Apple and Potion Sweep outputs available in
the repository.

Implemented canonical slices:

- Hero Brandish with time-averaged Enrage.
- Dark Knight spear Crusher with Rage/Dragon Blood exclusivity.
- Paladin general-weak, neutral, and holy-weak branches.
- Bowmaster Hurricane / Arrow Rain.
- Marksman Snipe + 7 Strafe, explicit Pure Strafe, and PA 1.40 / 1.20.
- Night Lord TT + Shadow Partner / Avenger.
- Corsair Cannon / Torpedo.
- Shadower Assassinate + BStep / BStep + BoT.

Buccaneer is now source-complete. `data/skills.json` records the recovered
Barrage coefficients (`330/330/330/330/660/1320%`, with SE branches
`470/470/470/470/940/1880%`), independent 199,999 caps, and the authoritative
target strategy table: 1T `Barrage+Demolition`, 2T `Barrage+Dragon Strike`,
and 3/4/6T ST `Dragon Strike+Snatch` versus non-ST `Barrage+Dragon Strike`.
The sustained model remains `75% ST / 25% non-ST`, with `DS+Snatch = 1.653s`.

WDEF remains locked to zero. `engine/defense.js` must not be changed until the
frozen WDEF audit is integrated with parity tests.
