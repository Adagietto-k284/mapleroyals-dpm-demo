# MapleRoyals Gear Model Archive v9.4.2

**Status:** recovered authoritative class gear/stat source  
**Recovered:** 2026-09-03 from the signed-in ChatGPT MapleRoyals project  
**Runtime aggregate:** `data/gear.json`  
**Master checksum:** `reference/master/mapleroyals_gear_driven_master_v9_4_2.csv`

This archive restores the four-stage gear packages that existed before the repository handoff. The previous repository archive retained formulas and Master outputs, but omitted several class stat and slot breakdowns. A `pendingStatBreakdown` value in the old runtime JSON therefore meant “not archived in this repository,” not “the class model was unfinished.”

## Authority and interpretation

1. The class artifact named below is the authoritative gear package.
2. Master v9.4.2 is the authoritative aggregate clean-WA/range/DPM checksum.
3. Exact aggregate MW20 stats in `data/gear.json` are runtime inputs.
4. A tilde (`~`) or band is intentionally representative. Do not convert it into a falsely exact item.
5. Forum range entries and End-game+/Extreme equipment are validation or sensitivity only; they do not define the four normal stages.

Stage order in every slash-separated row is:

`Entry / Advanced / Late-game / End-game`

Stat notation is `STR/DEX`, `DEX/LUK`, or `STR/DEX/LUK` as labelled. `CGS` means the combined Cape + Glove + Shoes weapon attack budget.

## Canonical aggregate checksums

| Class | Artifact model | MW20 stats by stage | Clean WA |
| --- | --- | --- | --- |
| Night Lord | NL Gear-derived model | LUK/DEX `1201/141, 1219/149, 1237/146, 1274/142` | `140, 156, 173, 184` |
| Corsair | Sair Gear-driven v0.1 | STR/DEX `119/1208, 118/1248, 113/1272, 122/1306` | `160, 178, 206, 219` |
| Shadower | Shad Gear Progression v0.5 | STR/DEX/LUK `84/154/1220, 87/156/1244, 101/161/1272, 120/168/1288` | `193, 211, 229, 245` |
| Bowmaster | Archer branch v0.3 | STR/DEX `110/1217, 109/1257, 109/1276, 122/1306` | `184, 201, 237, 251` |
| Marksman | Archer branch v0.3 | STR/DEX `110/1217, 109/1257, 109/1276, 122/1306` | `192, 209, 245, 259` |
| Hero | Warrior Gear-driven v0.3 | STR/DEX `1204/99, 1219/110, 1251/116, 1338/97` | `172, 191, 209, 223` |
| Paladin | Warrior Gear-driven v0.3 | STR/DEX `1204/99, 1219/110, 1251/116, 1338/97` | `172, 191, 209, 223` |
| Dark Knight | Warrior Gear-driven v0.3 | STR/DEX `1204/99, 1218/110, 1273/85, 1338/97` | `161, 178, 194, 212` |
| Buccaneer | Bucc Four-Stage Gear-Derived Prototype v1 | STR/DEX `1180/102, 1199/118, 1230/129, 1267/136` | `147, 162, 183, 194` |

## Night Lord

**Project conversation:** `[private provenance identifier omitted]`  
**Normal mainline:** Red Craven. All-LUK/NRC is a separate branch. End helmet is normal Targa/Scarga progression, not an 87/87 Auf baseline.

Base AP is `997 LUK / 25 DEX`; MW20 is applied before gear.

| Slot | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Claw | RC `76 WA/16 LUK` | RC `81/17` | RC `86/18` | perfect RC `91/19` |
| Star | Crystal Ilbi `29 WA` | Balanced Fury `30` | MTK `31` | RTK `32` |
| Helmet (DEX/LUK) | `30/18` | `32/21` | `36/23` | LUK Targa `40/24` |
| Top (DEX/LUK) | `10/16` | `10/20` | `7/25` | `7/27` |
| Bottom (DEX/LUK) | `16/6` | `20/9` | `21/9` | `22/9` |
| Face (DEX/LUK) | `5/5` | `5/5` | `4/10` | `0/15` |
| Eye (DEX/LUK) | `2/0` | `2/0` | `2/0` | `0/10` |
| Earring (DEX/LUK) | `10/4` | `10/4` | `10/4` | `2/15` |
| HTP (DEX/LUK) | `23/23` | `24/24` | `25/25` | `26/26` |
| Belt (DEX/LUK/WA) | `8/5/0` | `9/5/0` | `4/4/2` | `6/6/2` |
| Rings aggregate (DEX/LUK/WA) | `8/10/2` | `8/15/2` | `8/20/1` | `10/24/1` |
| Shoulder (DEX/LUK) | `2/2` | `2/3` | `2/3` | `2/3` |
| Medal | `3 WA` | `3 WA` | `3 WA` | `3 WA` |
| CGS | `30 WA` | `40 WA` | `50 WA` | `55 WA` |

Gear LUK is `105 / 123 / 141 / 178`; gear DEX is `114 / 122 / 119 / 115`. The range engine also retains the verified STR subtotals `63 / 66 / 62 / 68`.

## Archer common profile: Bowmaster and Marksman

**Project conversation:** `[private provenance identifier omitted]`  
**Artifacts:** `mm_bm_gear_progression_v0_3.xlsx`, `.csv`, and `_inputs.json`  
**Model:** Archer branch v0.3

Base AP is `23 STR / 999 DEX`; MW20 base is `25 STR / 1098 DEX`.

| Slot (STR/DEX/WA) | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Helmet | `18/30/0` | `20/35/0` | `22/40/0` | `24/45/0` |
| Pendant | `23/23/0` | `25/25/0` | `8/8/6` | `10/10/8` |
| Belt | `5/5/0` | `6/6/0` | `7/7/2` | `8/8/4` |
| Rings aggregate | `12/12/1` | `16/16/2` | `25/25/2` | `30/30/2` |
| Face + Eye | `2/10/0` | `4/14/0` | `8/20/0` | `10/25/0` |
| Earring | `12/0/0` | `0/15/0` | `0/18/0` | `0/20/0` |
| Overall | `11/32/0` | `11/40/0` | `11/50/0` | `12/60/0` |
| Shoulder | `2/2/0` | `2/2/0` | `3/3/0` | `3/3/0` |
| Weapon stat | `0/5/0` | `0/6/0` | `0/7/0` | `0/7/0` |
| Medal | `0/0/3` | `0/0/3` | `0/0/3` | `0/0/3` |
| CGS | `30 WA` | `40 WA` | `50 WA` | `55 WA` |

Class-specific attack components:

| Class | Weapon WA | Quiver WA | Passive WA |
| --- | --- | --- | --- |
| Bowmaster | `124 / 130 / 140 / 145` | `16 / 16 / 24 / 24` | Bow Expert `+10` |
| Marksman | `127 / 133 / 143 / 148` | `16 / 16 / 24 / 24` | Marksman Boost `+15` |

Normal End uses perfect/near-perfect Scarlion/Zakum helmet progression. `87/87 Auf` is End-game+ sensitivity only.

## Warrior common profile: Hero, Paladin, and Dark Knight

**Project conversation:** `[private provenance identifier omitted]`  
**Artifact:** `mapleroyals_warrior_progression_v0_3_fullbuff112.xlsx`  
**Model:** Warrior Gear-driven Progression v0.3

Base AP is `999 STR / 23 DEX`; MW20 base is `1098 STR / 25 DEX`.

| Slot (STR/DEX/WA) | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Helmet Hero/Paladin | `18/32/0` | `20/35/0` | `22/38/0` | STR Auf `67/7/0` |
| Helmet Dark Knight | `18/32/0` | `20/35/0` | STR Auf `43/7/0` | STR Auf `67/7/0` |
| Top | `20/6/0` | `23/8/0` | `27/8/0` | `33/8/0` |
| Bottom | `9/7/0` | `9/10/0` | `9/11/0` | representative `9/13/0` |
| Earring | `12/2/0` | `15/2/0` | `18/0/0` | `21/0/0` |
| Eye | `3/0/0` | `5/0/0` | `8/0/0` | representative `20/0/0` |
| Face | `5/5/0` | `5/5/0` | representative `15/0/0` | perfect Leaf `25/0/0` |
| MoN | `5/5/6` | `6/6/7` | `7/7/8` | `8/8/8` |
| Rings aggregate | `10/10/1` | `14/14/1` | `20/20/1` | `26/26/1` |
| Belt | `5/5/0` | `3/3/2` | `5/5/2` | representative `7/7/6` |
| Shoulder | `2/2/0` | `2/2/0` | `2/2/0` | `3/3/0` |
| Medal | `0/0/3` | `0/0/3` | `0/0/3` | `0/0/3` |
| CGS | `30 WA` | `40 WA` | `50 WA` | `55 WA` |

Weapons:

| Class | Weapon (WA/STR) |
| --- | --- |
| Hero / Paladin normal 2H sword | `132/17, 138/19, 145/20, 150/21` |
| Dark Knight normal spear / Sky Ski | `121/17, 125/18, 130/21, 139/21` |

The DK Late helmet transition is the source of the branch-specific `1273 STR / 85 DEX` aggregate. Paladin Stonetooth and 1H blunt-weapon + shield remain secondary/provisional branches and do not replace the normal 2H mainline.

## Corsair

**Project conversation:** `[private provenance identifier omitted]`  
**Artifacts:** `mapleroyals_sair_gear_progression_v0_1.xlsx`, `sair_gear_progression_v0_1.md`  
**Model:** Sair Gear-driven v0.1

Base AP is `23 STR / 999 DEX`. Archer v0.3 supplies the common DEX-attacker quality bands. Pirate Overall is the STR requirement regulator; Face/Eye/Rings deliberately remain flexible within the same quality band.

| Component | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Gun | `105 Concerto` | `112 Concerto` | `119 Concerto` | `123 Dragon Revolver` |
| Bullet WA | `21` | `21` | `24` | `24` |
| CGS | `30` | `40` | `50` | `55` |
| Gear STR/DEX | `94/110` | `93/150` | `88/174` | `97/208` |
| MW20 STR/DEX | `119/1208` | `118/1248` | `113/1272` | `122/1306` |
| Clean WA | `160` | `178` | `206` | `219` |

The artifact explicitly freezes Late `119 Concerto`, End `123 Dragon Revolver`, bullet WA, aggregate stats, and total clean WA. It does **not** claim one unique exact Face/Eye/Ring split. End helmet is perfect/near-perfect Scarlion + Helmet DEX scrolling; Auf/87-87 is End-game+/Extreme only.

## Shadower

**Project conversation:** `[private provenance identifier omitted]`  
**Model:** Shad Gear Progression v0.5

The following is the authoritative representative package. Tildes are intentional gear-quality centres.

| Slot | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Dagger | `130 WA`, ~18 LUK | `135 WA`, ~18 LUK | `140 WA`, ~21 LUK | `144 WA Kanzir`, ~21 LUK |
| Dragon Khanjar | `31 WA`, ~7S/3L | `34 WA`, ~8S/4L | `36 WA`, ~7S/6L | `43 WA`, ~14S/6L |
| Helmet (S/D/L) | `18/30/18` | `20/32/21` | `21/36/23` | `22/40/24` |
| Top (D/L) | `6/24` | `8/24` | `7/27` | `8/27` |
| Bottom (D/L) | `18/9` | `21/9` | `21/9` | `21/9` |
| Face | Rudolph 5-all | Rudolph 5-all | mixed CS | mixed CS |
| Eye | ~`1S/8D` Specs | ~`3S/10D` Specs | high mixed Specs/Toad | high mixed Specs/Toad |
| Face + Eye CS budget | `0` | `0` | ~`+5S/+8L` | ~`+8S/+12L` |
| Earring | ~`2S/12D/2L` | ~`2S/15–16D/2L` | ~`16–18` target stat | ~`18–20` target stat |
| HTP (S/D/L) | `23/23/23` | `23/23/23` | ~`27/27/27` | `28/28/28` |
| CGS | `30 WA` | `40 WA` | `50 WA` | `55 WA` |
| Belt (S/D/L/WA) | ~`5/8/5/0` | ~`5/9/5/0` | VL ~`4/4/4/2` | VL ~`6/6/6/2` |
| Rings aggregate (S/D/L/WA) | ~`8/8/10/2` | ~`8/8/15/2` | ~`10/10/20/1` | ~`12/12/24/1` |
| Shoulder (S/D/L) | ~`2/2/2` | ~`2/2/3` | ~`2/2/3` | ~`2/2/3` |
| Medal | Quest Virtuoso 7-all | Quest Virtuoso 7-all | QV, ~`3 WA` | QV, ~`3 WA` |
| Base AP (S/D/L) | `6/25/995` | `4/25/997` | `4/25/997` | `4/25/997` |

Excluded from normal End: 145 Kanzir, +20 Auf, extreme EP/Specs/Rudolph/VL Belt, and 60+ CGS.

## Buccaneer

**Project conversation:** `[private provenance identifier omitted]`  
**Artifact:** `29_bucc_four_stage_gear_derived_prototype.md`  
**Model:** Bucc Four-Stage Gear-Derived Prototype v1

Base AP is `999 STR / 23 DEX`; MW20 base is `1098 STR / 25 DEX`.

| Slot (STR/DEX/WA) | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Weapon | King Cent `15/0/105` | King Cent `17/0/109` | King Cent `21/0/119` | Dragon Slash Claw `21/0/123` |
| Pioneer | `30/6/30` | `40/7/40` | `47/7/50` | `62/8/55` |
| Helmet | `18/32/0` | `20/35/0` | `22/38/0` | `25/40/0` |
| Earring | `0/12/0` | `0/15/0` | `5/15/0` | `10/12/0` |
| MoN | `5/5/5` | `6/6/6` | `7/7/7` | `8/8/8` |
| Rings aggregate | `10/10/0` | `14/14/0` | `20/20/1` | `26/26/1` |
| Belt | `2/2/2` | `2/2/2` | `3/3/3` | `4/4/4` |
| Face | `0/5/0` | `0/7/0` | `3/7/0` | `5/5/0` |
| Eye | `0/3/0` | `0/5/0` | `2/5/0` | `5/5/0` |
| Shoulder | `2/2/0` | `2/2/0` | `2/2/0` | `3/3/0` |
| Medal | `0/0/3` | `0/0/3` | `0/0/3` | `0/0/3` |

Clean range checksums are `4646–8476 / 5226–9515 / 6070–11040 / 6635–12062`. The 87/87 Auf package is sensitivity only.

## Recovery invariants

- All nine supported classes now have non-pending MW20 aggregate stats in `data/gear.json`.
- `referenceCleanRange` remains checksum-only and must never become a range-first input.
- No class formula, skill selector, buff rule, cap rule, or WDEF rule is changed by this recovery.
- If future artifact extraction yields a more detailed Corsair flexible-slot table, it may refine this archive only if the frozen stage aggregate remains unchanged or a new model version is declared.
