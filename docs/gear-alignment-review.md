> Historical project record. Some status statements describe earlier development phases. See the root README and docs/validation-status.md for current scope.

# Shared gear alignment review — 2026-09-11

Status: approved slot rules, numeric review in progress. Runtime `data/gear.json`
has NOT been revised. Do not present candidate totals below as deployed results.
Historical source tables remain unchanged. Library now exposes archer weapon WA
in its four-stage slot table; this is display only, not an additional WA bonus.

## Approved rules

- Shoulder: STR/DEX/INT/LUK = 2/2/2/2 through Late-game, 3/3/3/3 at End-game; zero WA.
- Belt: retain class-specific Dojo Entry; NL/Shad retain their Dojo Advanced too.
  Other Advanced and all Late-game use relevant stats 3/3 (Shad 3/3/3), WA 2.
  End-game uses relevant stats 7/7 (Shad 7/7/7), WA 6.
- Bucc Entry: White Dojo STR/DEX/INT/LUK 1/4/1/1, zero WA.
- Sair non-class-specific equipment follows MM progression; gun, ammunition,
  and pirate overall remain class-specific. This supersedes the old flexible
  common-slot policy, but does not identify the old gun-stat/overall split.
- BM/MM: Nisrock/Neschere through Late-game, Dragon Shiner Bow/Cross at End-game.
- End-game weapon stat policy: clean weapon stats plus seven successful 10%
  attack scrolls. Never add the scroll stats again to an already-scrolled total.

## Archer WA reconciliation (current, before new belts)

Order: weapon + quiver + passive + CGS + pendant + belt + rings + medal.

| Stage | BM components | BM total | MM total (weapon +3, passive +5) |
| --- | --- | --- | --- |
| Entry | 124+16+10+30+0+0+1+3 | 184 | 192 |
| Advanced | 130+16+10+40+0+0+2+3 | 201 | 209 |
| Late-game | 140+24+10+50+6+2+2+3 | 237 | 245 |
| End-game | 145+24+10+55+8+4+2+3 | 251 | 259 |

All eight totals match runtime exactly. The End-game +5 weapon WA is included.
Archive weapon stats are DEX 5/6/7/7 for archers and End STR 21 for warriors;
there is no justification to add these again. Warrior old slot sums still do
not reconcile with the later aggregate; that separate issue remains open.

## Candidate secondary-stat review (MW20)

These are slot-delta calculations, not a newly reconstructed item inventory.

| Class | Entry | Advanced | Late-game | End-game |
| --- | --- | --- | --- | --- |
| Bucc DEX after approved belts/shoulders | 104 | 119 | 129 | 139 |
| Bucc weapon DEX requirement | 100 | 100 | 100 | 110 |
| Bucc DEX margin | 4 | 19 | 29 | 29 |
| Bucc face + eye DEX | 8 | 12 | 12 | 10 |
| Bucc ring DEX | 10 | 14 | 20 | 26 |
| Shad DEX after approved belts/shoulders | 154 | 156 | 160 | 170 |
| Shad margin over 150 DEX | 4 | 6 | 10 | 20 |
| Shad STR after subtracting representative shield STR | 77 | 79 | 93 | 108 |
| Shad margin over 75 STR before shield | 2 | 4 | 18 | 33 |

Bucc Entry would become STR 1179 / DEX 104 / Clean WA 145 with White Dojo alone.
Deleting all face/eye DEX at Entry would fail the requirement. At Advanced/Late/
End, even deleting it leaves DEX margins 7/17/19. Review earrings as well as
rings: archived earring DEX is 12/15/15/12. Ring all-stat gains are not freely
convertible to STR; retain intrinsic stats of actual items and remove only
unnecessary DEX scrolling/budget when a replacement is specified.

Shad Entry/Advanced are tight, not broadly overfunded in secondary stats. Later
face/eye rows are mixed/representative without an exact DEX split; do not invent
a precise replacement or subtract the CS budget twice. Shield STR numbers are
representative, so the margins are conditional, not complete equip-order proof.

BM Late-game becomes 104 STR, one below Nisrock's 105. No AP or other item has
been silently increased. MW-off can further reduce secondary stats; this review
does not certify all selectable MW settings or every armor requirement.

## Sair reconstruction boundary

With MM common slots and approved belts/shoulders, excluding overall and weapon
stats but INCLUDING MW20 base AP, the STR/DEX subtotals are:
99/1180, 95/1208, 93/1214, 109/1238.
Add the actual pirate overall and gun stat contributions once to these values.
Do not add these subtotals to the old Sair aggregate.

Gun + bullet + common WA would be 160/180/206/221. No MM passive/quiver is copied.
Exact pirate overall and gun stat breakdown is still needed to finalize new
runtime stats and a complete Library slot table.

## Requirement references

- [Bucc guide: King Cent 100 DEX, Dragon Slash Claw 110 DEX](https://royals.ms/forum/threads/donn1es-buccaneer-guide.188641/page-9)
- [Bow requirements: Nisrock 105 STR, Dragon Shiner Bow 115 STR](https://royals.ms/forum/threads/what-stat-to-raise-for-bowmaster-class.175427/)
- [Shad shield requirements and exclusion of its own stat bonus](https://royals.ms/forum/threads/what-should-i-upgrade-now.198908/)

## Remaining decisions/data

1. Specify the one-point BM Late STR correction; do not violate the shared belt rule.
2. Choose actual replacement face/eye/earring/ring packages before reducing stats.
3. Recover or explicitly redesign Sair pirate overall + gun stats.
4. Apply approved deltas to a versioned runtime fixture, keeping historical checksums
   and published DPM references separate; rerun engine and Library checks afterward.

## Follow-up: Bucc earrings / eye / face and BM earring base

User correction supersedes the earlier Bucc slot review:

- Toad Band STR 3/5/8/12. DEX is treated as zero for the candidate calculation;
  any additional item stat must be specified rather than silently inferred.
- Earring STR/DEX 2/12, 12/2, 14/2, 18/2.
- Face STR/DEX 5/5 through Late-game. End uses a high-STR Maple Leaf;
  exact STR has not been specified, and no final End aggregate is claimed.
- BM earrings use a 2/2/2/2 base before scrolling. Existing target-stat totals
  must not have their base counted twice. Adding the missing 2 STR to the old
  Advanced/Late/End earrings yields candidate STR 108/106/123 after new shared
  gear, resolving Late's 105 STR requirement. MM is not silently changed by
  this BM-specific correction.

With the approved shared gear and unchanged rings, Bucc candidate results are:

| Stage | STR | DEX | Clean WA | DEX margin |
| --- | --- | --- | --- | --- |
| Entry | 1189 | 101 | 145 | 1 |
| Advanced | 1222 | 99 | 162 | -1 |
| Late-game | 1247 | 109 | 182 | 9 |
| End-game | 1280 + Maple Leaf STR | 119 if Leaf DEX=0 | 196 | 9 if Leaf DEX=0 |

Do not lower Advanced ring DEX: it already needs one additional DEX. Do not
assume arbitrary conversion of ring DEX into STR. Late/End have at most nine
DEX of reduction at MW20 under these assumptions; lower MW reduces the buffer.
No runtime fixture or reference checksum has been overwritten during review.

Library has separate weapon, off-hand and projectile/quiver panels, sourced
from the existing archive. Shad eye/face/earring values are separately visible:
Entry/Advanced remain unchanged, approximate values stay approximate, and
unarchived Late/End splits are explicitly unknown rather than zero. Runtime
aggregates cannot prove a unique item split.
