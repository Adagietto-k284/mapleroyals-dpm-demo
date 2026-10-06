> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Gear alignment 1 — 2026-09-11

Implemented approved shared Belt/Shoulder deltas for eight classes, Bucc Toad
Band/earrings/Nose/18 STR Leaf and Advanced ring +1 DEX, BM 2-all-stat earring
base, and Shad explicit Late/End slots with QV at Late and 3 WA medal at End.
No skill formulas, AP allocations or attack timings changed.

Shad final MW20 totals: Late 91/155/1272, End 95/156/1285 (STR/DEX/LUK).
Corrected WA is 229/252, NOT the earlier review's 226/249. The original aggregate
was already 3 WA below the displayed slot sum. Direct sums now establish:
Late 140+36+50+2+1+0=229; End 144+43+55+6+1+3=252.
These sums and the stat sums are regression-tested.

Bucc STR/DEX/WA: 1189/101/145, 1222/100/162, 1247/109/182, 1298/119/196.
Rings are not reduced beyond the approved +1 Advanced DEX correction.
BM Entry gains the earring's previously absent 2 DEX; target-stat totals are
not increased again. MM receives shared slot deltas, not BM-specific earrings.

Library exposes weapon, off-hand and projectile/quiver panels and the current
corrected slot rows. Source archive files remain historical and unmodified.
Entry/Advanced Shad and warrior old slot/aggregate discrepancies are not claimed
to be fully reconstructed. Corsair remains UNCHANGED: its exact pirate overall
and gun-stat breakdown is still unresolved, so the proposed MM common-slot
reconstruction has not been silently applied. Lower-MW equip requirements are
not enforced by this release; the above requirement checks are MW20 only.

The pre-change v9.5 gear is archived for published-result regression tests.
New range checksums are derived from the gear, with original anchors preserved
separately. Published Forum/Extreme/WDEF audit snapshots remain historical, not
newly measured or revalidated sources. The earlier review document is a decision
history; this release note supersedes its tentative totals and pending wording.
