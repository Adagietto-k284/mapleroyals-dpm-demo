> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# WDEF Specification v0.1

Status: Frozen audit; engine integration pending.

## Status

The WDEF v0.1 quantitative audit is frozen as authoritative reference evidence.
The JavaScript engine integration is still pending. Non-zero WDEF remains locked
until the implementation passes the required parity and regression gates.

## Scope

WDEF v0.1 is an encounter-condition layer on top of Gear-driven Master v9.4.2.

This specification must not redefine:

* gear stages
* actual stats
* clean WA
* MW20 clean range derivation
* potion stacking
* class buff stacking
* canonical class selectors
* WDEF=0 Master outputs

Audited quantitative baseline:

```text
Attacker level: 200
Stage: End-game
Potion: Onyx Apple (+100 WA)
Audited target counts: 1T / 3T / 6T
WDEF sweep:
0 / 500 / 1000 / 1500 / 2000 / 2500 / 3200 / 4000
```

## Frozen calculation order

All generic physical calculations must follow this order:

```text
Gear / actual stats / clean WA
→ Potion + class buffs
→ Echo
→ Buffed base min/max range
→ Pre-defense modifiers
→ WDEF subtraction
→ Random base damage
→ Skill % / critical expectation
→ 199,999 per-line cap
→ After-modifier
→ DPM aggregation
```

Never implement WDEF by multiplying WDEF=0 DPM by a reduction ratio.

## Frozen Lv200 WDEF formula

For a Lv200 attacker against a same-level or lower-level target:

```text
baseMaxAfterDef = baseMaxBeforeDef - 0.5 × WDEF
baseMinAfterDef = baseMinBeforeDef - 0.6 × WDEF
```

Do not invent target-level-above-attacker handling in v0.1.
If such a rule is not covered by authoritative fixtures, leave it unsupported or explicitly pending.

## Class-specific WDEF rules

### Hero

* Brandish remains canonical.
* Rage +12 WA remains part of pre-range buff stacking.
* Average Enrage = +17.333333333333332 WA.
* Echo ×1.04 applies after additive WA.
* Brandish is WDEF-sensitive.
* 4T / 6T remain capped at 3 targets.

### Dark Knight

* Spear Crusher remains canonical.
* Rage OR Dragon Blood contributes exactly one +12 WA source.
* Rage and Dragon Blood never stack with each other.
* Crusher is WDEF-sensitive.
* 4T / 6T remain capped at 3 targets.
* Polearm Fury is an alternate branch and should eventually use the same WDEF layer.

### Paladin

Elemental charge / weakness is a PRE-DEFENSE modifier.

Required order:

```text
base range
→ elemental charge / weakness
→ WDEF
→ Blast / ACB skill and critical handling
→ 199,999 cap
→ DPM
```

Canonical:

* General Weak

Alternates:

* Neutral
* Holy Weak

Do not move WDEF after skill multiplication.

### Bowmaster

Canonical:

* 1-3T Hurricane
* 4-6T Arrow Rain
* Phoenix contribution retained

Hurricane / Arrow Rain physical damage is WDEF-sensitive.

For WDEF v0.1, Phoenix is treated as WDEF-sensitive.
Exact summon-defense mechanics remain a VERIFY item and must not redefine the main physical WDEF formula.

### Marksman

#### 1-2T Auto selector

Auto compares:

```text
Pure Strafe
vs
Snipe + 7 Strafe
```

Snipe:

* fixed damage
* defense-ignore

Strafe:

* WDEF-sensitive

Auto must calculate both candidates dynamically under the current potion and WDEF input.
Do not hardcode a fixed potion crossover.

End-game potion WA crossover validation points:

```text
WDEF 0    → 136.6888 WA
WDEF 500  → 142.4515 WA
WDEF 1000 → 148.2142 WA
WDEF 1500 → 153.9769 WA
WDEF 2000 → 159.7396 WA
WDEF 2500 → 165.5023 WA
WDEF 3200 → 173.5701 WA
WDEF 4000 → 182.7904 WA
```

These values are validation evidence only.

#### Piercing Arrow

Frozen PA order:

```text
base range
→ WDEF
→ PA skill / critical
→ 199,999 cap
→ successive-target 1.2^(n-1) after-modifier
```

The damage cap MUST occur before the successive-target pierce multiplier.

Canonical:

* PA 1.40 s

Theoretical alternate:

* PA 1.20 s

Frostprey is treated as WDEF-sensitive in v0.1, but exact summon-defense mechanics remain VERIFY.

### Night Lord

Canonical:

* 1-3T TT + Shadow Partner
* 4-6T Avenger

Physical base damage is WDEF-sensitive.
Apply WDEF before TT / Avenger skill and critical expectation.

### Corsair

Canonical:

* 1-2T Cannon
* 3-6T Torpedo

Physical base damage is WDEF-sensitive.
Torpedo target coefficients remain class-engine logic after the WDEF-adjusted base layer.

### Shadower

Canonical:

* 1-2T Assassinate + BStep
* 3-6T BStep + BoT

Meso Explosion is excluded.
Physical lines are WDEF-sensitive.

Existing cap-aware Phi(k) / uniform-distribution expectation must be preserved.
Do not simplify the general engine merely because the audited End-game Apple window looks approximately linear.

### Buccaneer

Canonical sustained model:

* 75% Super Transformation
* 25% non-ST

Demolition:

* defense-immune

WDEF-sensitive:

* Barrage
* Dragon Strike
* Snatch

Barrage must retain line-by-line 199,999 cap handling.
Defense immunity must be modeled per skill / line branch, not as a class-wide boolean.

## WDEF UI contract

Default:

```text
WDEF = 0
```

Audited presets:

```text
0
500
1000
1500
2000
2500
3200
4000
```

Initial audited slider domain:

```text
0-4000
```

Values above 4000 must not be labeled audited v0.1 without additional fixtures.

## Known ranking crossover validation points

These are regression evidence, not hardcoded ranking rules.

```text
1T MM vs Paladin       ≈ WDEF 1016.0
  above: Paladin > MM

1T Shad vs Paladin     ≈ WDEF 1044.1
  above: Paladin > Shad

1T Shad vs MM          ≈ WDEF 1098.4
  above: MM > Shad

1T BM vs Paladin       ≈ WDEF 1828.2
  above: Paladin > BM

1T BM vs MM            ≈ WDEF 3449.6
  above: MM > BM

1T Hero vs Bucc        ≈ WDEF 3500.0
  above: Bucc > Hero

6T MM vs Paladin       ≈ WDEF 1475.7
  above: Paladin > MM

6T Sair vs DK          ≈ WDEF 3558.2
  above: DK > Sair
```

## Current implementation gate

The intended state after this documentation and metadata integration is:

```text
WDEF audit/spec       frozen
WDEF reference data   committed
WDEF metadata         updated
WDEF engine           locked / pending integration
WDEF UI               pending
```

The non-zero WDEF lock in `engine/defense.js` must remain unchanged until the WDEF engine integration passes parity and regression tests.
