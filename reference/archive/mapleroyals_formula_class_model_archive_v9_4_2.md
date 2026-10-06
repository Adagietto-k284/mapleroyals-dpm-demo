# MapleRoyals Gear-driven DPS — Formula & Class Model Archive

**Archive version:** v9.4.2  
**Purpose:** authoritative handoff for future WDEF audit and Netlify / Plotly interactive implementation.

---

## 1. Global framework

Pipeline:

`Gear package → actual stats / clean WA → MW20 clean min/max → buffs → skill engine → cap / after-modifier → 1/2/3/4/6T DPM`

Core stages:
- Entry
- Advanced
- Late-game
- End-game

Target counts:
- 1T
- 2T
- 3T
- 4T
- 6T

5T is not a presentation / interactive target condition. It is retained only as a DK Fury crossover reference.

Current static model:
- Lv200 attacker
- WDEF = 0 normalized
- Echo = ×1.04
- current standard stackable +12 WA

---

## 2. Attack potion profiles

Potion tiers:
- Gizer / Energizer = +25 WA
- Heartstopper = +60 WA
- Onyx Apple = +100 WA
- Gelt Chocolate = +120 WA
- Naricain Elixir / VL Pot = +140 WA

Standard pre-Echo additive WA:
- Gizer: +37
- Stopper: +72
- Apple: +112
- Gelt: +132
- Nari/VL: +152

Formula:
`buffed WA = 1.04 × (clean WA + potion WA + 12)`

Hero:
`buffed WA = 1.04 × (clean WA + potion WA + 12 + 17⅓)`

DK:
+12 comes from Rage OR Dragon Blood, never both.

---

## 3. Hero

Canonical skill:
- Brandish

Target handling:
- 1T = 1 target
- 2T = 2 targets
- 3T = 3 targets
- 4T / 6T remain 3-target cap

Critical buff rule:
- Rage = +12 WA
- Enrage active = +26 WA
- optimal long-run uptime = 240 / 360
- time-average = +17⅓ WA
- Enrage stacks with Rage and attack potion

Canonical Hero full-buff:
`Potion + Rage 12 + Enrage 17⅓ → Echo`

v9.4.2 End-game:
- clean WA = 223
- clean max = 13941.514
- 1T = 16.714968086m
- 2T = 33.429936172m
- 3T / 4T / 6T = 50.144904259m

Regression history:
- Earlier Warrior gear-driven baseline temporarily excluded class-self buffs.
- Enrage was accidentally not restored during later Master integration.
- Fixed in v9.4.2.

---

## 4. Dark Knight

Canonical:
- normal spear
- Spear Crusher
- 1/2/3T linear
- 4/6T remain 3T cap

Frozen range formula:
- max = `(5STR + DEX) × WA / 100`
- effective min = `(3.6STR + DEX) × WA / 100`
- equivalent average = `(4.3STR + DEX) × WA / 100`
- effective mastery = 80%

Crusher:
- 170% × 3 lines
- SE average line coefficient = 191%
- SI + Booster cycle = 0.81s
- Berserk canonical = 210%

End-game canonical:
- 139/21 Perfect +7 Sky Ski
- clean WA = 212
- MW20 STR/DEX = 1338 / 97
- clean max = 14388.44
- 1T = 16.895487168m
- 2T = 33.790974336m
- 3–6T = 50.686461504m

Buff rule:
- Apple + Rage OR Dragon Blood = +112 before Echo
- Rage and Dragon Blood do NOT stack
- canonical Crusher was already correct

Polearm Fury alternate:
- End-game 144/21 Perfect +7 Purple Surfboard
- total clean WA = 217
- polearm swing primary multiplier = 5.0 STR
- effective min coefficient = 3.6 STR
- Fury = 250%
- Berserk = 210%
- SE normal/crit expectation
- Fast PSB + Booster + SI = 94 casts/min

Corrected Apple values:
- 3T = 32.1257m
- 4T = 42.8343m
- 5T = 53.5428m
- 6T = 64.2514m

Crossover vs 3T-capped Crusher:
- 4T: Fury below
- 5T: Fury crosses over
- 6T: Fury clearly above

5T is documentation-only, not an interactive target selector.

---

## 5. Paladin

Canonical condition:
- General Elemental Weak

Integrated branches:
- Neutral
- Holy Weak

Weapon:
- 2H sword mainline
- End-game Perfect +7 Dragon Claymore 150/21
- clean WA = 223
- STR/DEX = 1338 / 97
- clean max = 13941.514

Sword range:
- max = `(4.6STR + DEX) × WA / 100`
- min uses mastery / coefficient as preserved in current engine

1T:
- Blast
- canonical General Weak coefficient stack uses current elemental multiplier model

2T+:
- ACB
- target count scales 2 / 3 / 4 / 6

Cap-aware expectation:
`Phi(k)` against uniform min/max with 199999 hard cap

End-game General Weak:
- 1T = 17.449438945m
- 2T = 24.368765841m
- 3T = 36.553148761m
- 4T = 48.737531681m
- 6T = 73.106297522m

End-game branches:
Neutral:
- 2T ≈17.5031m
- 3T ≈26.2546m
- 4T ≈35.0061m
- 6T ≈52.5092m

Holy Weak:
- 1T ≈18.0153m
- 2T ≈26.1685m
- 3T ≈39.2528m
- 4T ≈52.3371m
- 6T ≈78.5056m

Potion sweep finding:
- Strong cap compression at high potion WA, especially 1T Blast.
- At End-game 6T +140 potion, General Weak Pally overtakes canonical MM PA1.40.

---

## 6. Bowmaster

Canonical:
- 1–3T Hurricane
- 4–6T Arrow Rain
- Phoenix fixed summon contribution

Phoenix:
- max 4 targets

End-game:
- clean WA = 251
- clean max = 11451.624
- 1T = 18.371504733m
- 2T = 18.610527858m
- 3T = 18.849550983m
- 4T = 19.213625706m
- 6T = 28.342392309m

Current potion sweep uses exact Hurricane / Arrow Rain + Phoenix engine.

---

## 7. Marksman

Canonical:
- 1–2T: Snipe + Strafe at current static Apple baseline
- 3–6T: Piercing Arrow 1.40s practical
- PA 1.20s = theoretical alternate

Snipe / Strafe:
- SI action time = 0.63s
- Snipe + 7 Strafe rotation = 8 actions = 5.04s
- Snipe = 199999
- Strafe under SE expected cast = `10.28 × average base damage`

Pure Strafe selector:
- compare 8 Strafe vs Snipe + 7 Strafe
- crossover occurs when:
  `Strafe cast > 199999`
- equivalently:
  `average buffed base damage > 199999 / 10.28 ≈ 19455.16`

End-game potion crossover:
- exact potion WA crossover ≈ +136.69
- Gelt +120: Snipe+7 still slightly higher
- +140: Pure Strafe slightly higher

Therefore future interactive 1–2T selector should be:
`max(Pure Strafe, Snipe+7 Strafe)`

PA:
- PA successive target after-modifier:
  `1, 1.2, 1.44, 1.728, ...`
- cap-before-pierce
- do NOT approximate 3T as 3/4 of 4T
- Frostprey max 4 targets

End-game:
- clean WA = 259
- clean max = 12493.124
- 1T Apple Snipe+7 = 17.795998894m
- 2T = 18.044334608m
- 3T PA1.40 = 27.848839431m
- 4T PA1.40 = 40.964049374m
- 6T PA1.40 = 74.932597339m

PA1.20 theoretical:
- 3T ≈32.3661m
- 4T ≈47.7914m
- 6T ≈87.4214m

Potion sweep:
- PA shows strong high-WA cap compression.

---

## 8. Night Lord

Canonical:
- 1–3T TT+SP
- 4–6T Avenger

Normal progression:
- Red Craven mainline
- all-LUK / NRC excluded from this normal model and handled separately

End-game:
- clean WA = 184
- MW20 LUK/DEX = 1274 / 142
- clean max = 8825.376
- 1/2/3T = 20.251616112m
- 4T = 23.430739698m
- 6T = 35.146109546m

Current modeled potion interval is approximately WA-linear.

---

## 9. Corsair

Canonical:
- 1–2T Cannon
- 3–6T Torpedo

End-game:
- clean WA = 219
- clean max = 10563.684
- 1/2T = 24.795772964m
- 3T = 27.601529069m
- 4T = 36.266136766m
- 6T = 53.595352161m

Potion sweep uses exact current Cannon/Torpedo stage engine.

---

## 10. Shadower

Canonical:
- Regular Combo
- 1–2T Assassinate + BStep
- 3–6T BStep + BoT
- Meso Explosion excluded

Cap-aware:
- uses `Phi(k)` expectation against uniform range and hard cap

End-game:
- clean WA = 245
- clean max = 12066
- 1T = 17.987181044m
- 2T = 23.316716168m
- 3T = 33.956183640m
- 4T = 45.274911520m
- 6T = 49.177921133m

Potion sweep:
- despite cap-aware engine, +25→+140 range is close to linear in current normal End-game window.

---

## 11. Buccaneer

Canonical:
- exact cap-aware sustained engine
- 75% Super Transformation uptime
- 25% non-ST long-run share
- line-by-line Barrage cap

Important timing:
- DS + Snatch macro / cycle = 1.653s in current model
- Barrage-related cycles preserved from authoritative audit

End-game:
- clean WA = 194
- clean max = 12062
- 1T = 15.78m
- 2T = 16.37m
- 3T = 24.13m
- 4T = 31.30m
- 6T = 45.62m

Potion sweep:
- shows moderate cap compression at high WA.

---

## 12. Current End-game Apple canonical ordering snapshots

1T:
- Sair 24.80
- NL 20.25
- BM 18.37
- Shad 17.99
- MM 17.80
- Pally General Weak 17.45
- DK 16.90
- Hero 16.71
- Bucc 15.78

2T:
- DK 33.79
- Hero 33.43
- Sair 24.80
- Pally General Weak 24.37
- Shad 23.32
- NL 20.25
- BM 18.61
- MM 18.04
- Bucc 16.37

3T:
- DK 50.69
- Hero 50.14
- Pally General Weak 36.55
- Shad 33.96
- Sair 27.60
- MM PA1.40 27.85
- Bucc 24.13
- NL 20.25
- BM 18.85

4T:
- Pally General Weak 48.74
- Shad 45.27
- MM PA1.40 40.96
- Sair 36.27
- Hero 50.14 remains 3T cap
- DK 50.69 remains 3T cap
- Bucc 31.30
- NL 23.43
- BM 19.21

6T:
- MM PA1.40 74.93
- Pally General Weak 73.11
- Sair 53.60
- DK 50.69
- Hero 50.14
- Shad 49.18
- Bucc 45.62
- NL 35.15
- BM 28.34

Integrated alternates alter these rankings.

---

## 13. Potion sweep key findings

Canonical potion tiers:
- +25
- +60
- +100
- +120
- +140

Not all classes scale linearly:
- NL / Sair / Hero / DK / BM: nearly linear in current normal range
- MM PA: strong cap compression
- Paladin: strong cap compression, especially 1T Blast
- Bucc: moderate compression
- Shad: near-linear over current potion interval despite cap-aware engine

End-game 6T:
- +25: MM > Pally
- +60: MM > Pally
- +100: MM > Pally
- +120: MM > Pally, gap very small
- +140: Pally General Weak overtakes MM PA1.40

This potion dimension should be implemented as a true engine input, not as a multiplier on Apple DPM.

---

## 14. WDEF status

Current static Master:
- WDEF = 0 normalized

WDEF is NOT yet authoritative.
Next dedicated audit should verify:
- exact MAX/MIN subtraction
- level term
- ordering before skill / crit / cap / after-modifier
- class-specific fixed-damage and cap shielding behavior

Expected qualitative direction before audit:
- higher sensitivity: NL / Sair / BM
- moderate: Bucc / Shad
- lower: Hero / DK
- MM Snipe and PA / Paladin weak-state branches may have strong protection due fixed damage or cap shielding

Do not freeze these qualitative labels until quantitative audit is complete.

---

## 15. Authoritative / current files

Master:
- `mapleroyals_gear_driven_master_v9_4_2_final.xlsx`
- `mapleroyals_gear_driven_master_v9_4_2.csv`

Attack potion sweep:
- `mapleroyals_attack_potion_sweep_v0_1.xlsx`
- `mapleroyals_attack_potion_sweep_v0_1.csv`
- `mapleroyals_attack_potion_branches_v0_1.csv`

Hero:
- `mapleroyals_hero_enrage_audit_v9_4_2.csv`

DK:
- `mapleroyals_dk_buff_fury_audit_v9_4_1.csv`

MM selector:
- `mapleroyals_mm_strafe_vs_snipe_potion_audit_v0_1.csv`

Presentation:
- v9.4.2 1T / 2T / 3T / 4T / 6T progression / ranking files

---

## 16. Superseded / retired outputs

Do NOT reuse:
- v9.3 DK Polearm Fury outputs
  - used wrong polearm multiplier
  - wrong mastery
  - wrong weapon swap
- v9.3.1 Fury outputs
  - double-counted DK class WA / Dragon Blood in Fury branch
- v9.4.1 as final master
  - DK fixed, but Hero Enrage regression still present
- old MM 3T selector using Snipe+Strafe
  - canonical 3T is PA1.40 since v9.4
- old MM 3T PA linear 3/4 scaling
  - invalid because PA uses 1.2^(n-1) target ordering

Current Master authority:
**v9.4.2**

---

## 17. Interactive-engine invariants

These should become hard rules in code:

1. Potion is an input, not a DPM multiplier.
2. Calculation order:
   `Gear → buffs → range → WDEF → skill / crit → cap → after-modifier → DPM`
3. DK:
   Rage XOR Dragon Blood.
4. Hero:
   Rage + Enrage average both apply.
5. MM 1–2T:
   Auto compare Pure Strafe vs Snipe+7.
6. MM PA:
   cap-before-pierce, exact target multiplier.
7. Frostprey / Phoenix:
   max 4 targets.
8. Target selector:
   1 / 2 / 3 / 4 / 6 only.
9. Every output should expose formula / model version for auditability.
