# EX13 authoring — coordinator notes

## Engine seams found (queued for an engine lane)

- **Per-card name-exclusion.** `matchNameOrTrait`
  (`apps/api/src/engine/effects/interpreter/matching/definition.ts`,
  `ref.match === "name"` branch) has no way to express a card's own
  `[Rule] Name: Not treated as including [X].` exclusion — it only ever
  widens name matching (`GrantStaticObjectGrant`), never narrows it.
  First hit: EX13-002 (DemiVeemon vs. `[Vee]`), retained as `it.fails` with
  `coverage: "partial"` / `residual: ["[Rule] Name: Not treated as
  including [Vee]."]`. Watch for repeats across EX13 — several early-game
  Digimon in the source game carry this same rule text.

- **DP-valued scaling unit.** `Scaling.unit` (`packages/shared/src/effects/ir/predicates/scaling.ts`)
  and `scaleFactor` (`apps/api/src/engine/effects/interpreter/scaling.ts`)
  have no unit derived from a permanent's live DP — only card/color/security/
  trash/stack/link/memory/named counters. First (and so far only) hit:
  EX13-020's "-4000 DP for every 5000 DP this Digimon has", retained as
  `it.fails` with `coverage: "partial"`. Single-card seam so far; low
  priority unless a repeat shows up later in the set.

## Harness notes (not engine gaps, just non-obvious)

- ＜Counter＞ opens **before** the block window when the host is attacked;
  a ＜Blocker＞ test on the same card must resolve `respondCounter` first.
- ＜Progress＞ needs `combat.currentAttackerId` set; the cleanest way to
  hold an attack open for a harness-only proof is a block window (fixture
  with printed ＜Blocker＞ only) and resolving the effect there via
  `enterEffectResolution(opponentSeat)`.

- `useAlternateCost: true` is a preference, not a gate: with no matching
  alternate route the engine silently falls back to the printed EvoCost and
  still returns `{ok: true}`. A negative test for "wrong card for the
  alternate route" must assert the memory actually charged, never
  `ok: false`. Also: memory clamps to ±10 (`MemoryGauge.MEMORY_MAX`) — a
  fixture seeding `memory > 10` silently truncates.

## Per-card decisions

- EX13-002: substring name matching for "[Vee]" is otherwise correct
  (BT2-086 Rina Shinomiya style); only DemiVeemon's own exclusion is
  unrepresentable today.
