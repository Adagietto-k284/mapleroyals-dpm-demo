# Model assumptions

The tool estimates damage under fixed conditions. It does not simulate an entire encounter or estimate personal attack uptime.

- Four stages are class-specific gear packages, not equal-cost budgets. Connecting lines do not enumerate intermediate equipment.
- Quick verification uses equipped totals without MW, Echo, Rage/Dragon Blood, or attack potions.
- Progression X is MW20-normalized clean maximum range; combat changes affect DPM without moving that coordinate.
- Multi-target DPM combines damage across effective targets. Available targets do not mean every skill hits every target.
- WDEF is bounded to the documented level/defense scope; zero is a normalization baseline.
- SI stays fixed on. Shadower keeps the canonical SE-off model.
- Marksman 1–3T uses Snipe + 7 Strafe; Pure Strafe is a comparison branch. 4T/6T uses the model's 1.75s Piercing Arrow assumption.

## Practical differences

**Corsair:** Dismounting, remounting, ship loss, and repositioning interrupt Battleship attacks or force another skill.

**Marksman:** Snipe timing, interrupted Strafe opportunities, target availability, and cooldown/downtime overlap change the skill mix. Piercing Arrow depends on timing and target geometry.

**Bowmaster:** Knockback, platform falls, and repositioning reduce Hurricane firing time. Phoenix must reach and attack the relevant target to supply its modeled contribution.

No fixed class-specific uptime penalty or practical ranking is asserted. Party buffs/utility add value beyond personal DPM.

Tests validate implementation behavior and fixtures, not every source mechanic. Historical comparisons use their matching inputs. See [validation status](validation-status.md) and [source index](source-index.md).
