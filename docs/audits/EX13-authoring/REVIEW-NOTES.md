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

## NOT a gap — read before flagging a "text self-match" case

`match: "text"` on a live permanent's own inherited/digivolution-stack text is
INTENTIONAL by default (EX1-021/Q3208: "a Digimon with an [On Deletion]
effect" reads the whole stack). It only over-matches when a card's own
inherited line prints the very tokens it also gates on — set
`printedTextOnly: true` on that `Filter` (`nameOrTrait` + the flag) to scope
the match to the host's own printed information only (comprehensive
§4-23-1/§4-23-2; prior art `LM-012.ts`). EX13-021 first hit this
(coordinator fixed it after an agent misdiagnosed it as an engine gap and
shipped an `it.fails`); EX13-024 hit and correctly solved the same shape
independently. Check for this pattern on every EX13 card whose own inherited
text prints tokens it also filters by — it is a one-field fix, not a seam.

- **`whenSuspended` SubTrigger `sourceFilter.isSelfRef` ignores other predicates.**
  A dedicated payload gate (`whenSuspendedSelfGate`,
  `apps/api/src/engine/effects/interpreter/actions/subTrigger.ts:461`)
  compares suspended-permanent ids to the anchor and never evaluates the
  rest of `sourceFilter` — a `nameOrTrait` bundled into that same
  `sourceFilter` is silently inert. Put a host-identity gate in
  `hostFilter` instead (see EX13-021 above). Not a bug in any shipped
  card so far (EX13-017 rides a `Replacement`, which does evaluate the
  whole filter), but a live footgun for a future "this Digimon with [X]
  suspends" card built on `whenSuspended`.

- An optional `RevealAdd` slot surfaces as a `selectCards` decision with
  `min: 0`, not an `optional` prompt — `autoDeclineOptional` does not
  decline it, and `autoSelectCards` overrides it. To prove the decline
  path, answer `{ kind: "selectCards", instanceIds: [] }` manually while
  holding the driving promise un-awaited (awaiting it first deadlocks).
- `state.pendingDecision` exposes its candidates only through
  `payloadJson`, not an `options` object.

- **`PlayWithoutCost`/`PlayMultipleAction` ignore `totalPlayCostBudget`
  for hand/trash targets.** `pickLoose`
  (`apps/api/src/engine/effects/interpreter/targeting/loose.ts:502`) never
  reads `Target.totalPlayCostBudget` and never forwards
  `maxTotalPlayCost` to `selectCards` — that plumbing exists (`removal.ts`,
  `reveal.ts`, and `resolveTotalPlayCostBudgetTargets` in
  `targeting/permanents.ts` for battle-area targets) but is missing on the
  loose-zone (hand/trash) path. First hit: EX13-035's "up to 6 total play
  cost", retained as `it.fails`, `coverage: "partial"`.

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

- A leave `Replacement`'s once-per-turn budget is enforced by
  `frequency: "OncePerTurn"` alone; an added `oncePerTurnKey` (as in
  EX13-015) is redundant, not load-bearing. Not worth a churn-only fix, but
  don't copy the extra key into new cards.

- `useAlternateCost` is a preference in *both* directions: even set to
  `false`, the engine still takes a legal alternate route if the printed
  route is illegal. A negative that must pin the exact route needs
  `alternateRequirementIndex`, not just the boolean.
- `requiresMinRevealed` on a `RevealAdd` is behaviourally inert whenever
  every `add` slot has `count: 1` (the first slot already consumes the
  only match). It correctly encodes the rule's intent but cannot be proven
  behaviourally in that shape — say so in the report rather than claiming
  proof.

- Whether declining a `[Once Per Turn]` "by ..." cost window spends the
  use is unresolved for `CardEffect.frequency`/`sharedUseKey` (only
  `SubTrigger.oncePerTurnKey` has a documented decline-release path in
  `subtriggers.ts`). Comprehensive §15-14-1-1 supports spending it;
  manual §1 can be read either way. Assert only the unambiguous half of a
  decline until this is settled; don't claim it as an engine gap.

## Out-of-scope finding (not EX13, do not fix here)

- `BT26-033.ts` may be miscoded: its raw text says "this Digimon's top
  stacked card" (should stay in the battle area, only reparented as
  security) but its implementation uses bare `placeAsSecurity`, which
  (`costs.ts:1621`) moves the whole permanent out of the battle area,
  ignoring `detachPermanentTop`. Found while authoring EX13-032, which hits
  the identical printed sentence and uses the `place`/`detachPermanentTop`
  cost shape instead. Flagged for whoever next touches BT26, not fixed
  here — BT26 is a separate, already-audited set.

- An accepted optional action with a payable cost still pays that cost
  even when its target set resolves empty — a chosen "may" pays first,
  finds nothing to hit, and the cost is not refunded.
- `onDeletionOf` honours `excludeSelf` even though it normally matches
  against a card definition rather than a live permanent (mutation-
  confirmed, not documented elsewhere).
- Whether a mandatory cost (e.g. a trash cost gating a rewrite/replace
  effect) is spent when the controller declines the optional effect it
  gates is unresolved pre-release (§15-7 supports "declining costs
  nothing"). Default to that reading; a later ruling that pre-commits the
  cost is a one-field fix (`payCostBeforeOptional: true`).

- A `Modal`'s paid branch needs no `optionConditions` restating an
  affordability check (e.g. `selfHasMinTrash`) — `optionIsAvailable`
  already preflights through `canPayCost`; the restatement is inert.
- `countMatching` already excludes breeding-area permanents for a
  `kind: ["Digimon"]` + `nameOrTrait` filter; an explicit
  `zone: "battleArea"` on such a gate is declarative, not load-bearing.

## Per-card decisions

- EX13-027: "by deleting 1 other Digimon with [Sukamon] in its name" (no
  "of your") encoded as `controller: "any"`, matching BT11-040/BT13-065's
  identical printed sentence.

- EX13-002: substring name matching for "[Vee]" is otherwise correct
  (BT2-086 Rina Shinomiya style); only DemiVeemon's own exclusion is
  unrepresentable today.
