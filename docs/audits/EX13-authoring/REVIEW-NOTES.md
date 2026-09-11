# EX13 authoring — coordinator notes

## CONFIRMED production bug — affects every DUAL card, not just EX13

`printedColorRequirementMet` (`apps/api/src/engine/GameEngine.ts:6131`):

```ts
const required = definition.optionColorRequirements ?? (mode === "option" ? (definition.colors ?? []) : []);
```

The doc comment right above it says color requirements should apply
"ONLY when this play resolves as an Option (`mode === "option"`)" and
that a DUAL card played on its Digimon side "is never gated by this
fallback." But `optionColorRequirements` is always DEFINED on a DUAL
card, so the `??` short-circuits to it regardless of `mode` — playing a
DUAL card's DIGIMON side is incorrectly gated by the OPTION side's color
requirement too. Verified by reading the source (not just a worker
report): `mode` is `"permanent" | "option"`
(`apps/api/src/engine/actions/playCard.ts:72`), and the ternary is
provably dead code whenever `optionColorRequirements` exists. Confirmed
affecting all pre-existing DUAL cards (the comment names 6 of them) plus
EX13-065/EX13-066. Fix shape: gate the whole expression on `mode`, e.g.
`mode === "option" ? (definition.optionColorRequirements ?? definition.colors ?? []) : []`.
Not fixed here (engine file, out of a card lane's allowed edits) — route
to an engine lane; this is a real gameplay-legality bug, not test noise.

- An Arts Digivolve prompt (CR §4-19, offered after a DUAL card's Option
  side resolves) surfaces as a `selectCards` decision with `min: 0` —
  `autoSelectCards: true` ACCEPTS it and `autoDeclineOptional` does NOT
  decline it. Leaving it on auto can silently digivolve a board permanent
  into the DUAL card and fire its `[When Digivolving]` clauses,
  corrupting an unrelated assertion. Either seed a board with no legal
  Arts base for the card under test, or decline it manually
  (`{ kind: "selectCards", instanceIds: [] }`).

## Flaky test found — needs an engine lane, not a card fix

`EX13-053.test.ts`'s "de-digivolves 1 opponent Digimon from under a host,
without running its own main body" test is intermittently flaky **only**
when run in the same vitest process as certain other EX13 test files
(observed with EX13-056, EX13-052) — it is 100% reliable alone. Failure:
`permanent for "subject" ... is no longer on the board` — the opponent's
permanent is fully deleted, not just de-digivolved.

EX13-053 has BOTH a main (non-inherited) `OnDeletion` effect (return +
mandatory `Delete` on an opponent Digimon, play cost ≤3 scaled by the
return count) and an inherited `OnDeletion` effect (`DeDigivolve`) — a
shape that appears to be new in this codebase (checked BT20-073 and
EX13-046, the cited peers for the inherited clause: neither also carries
its own main effect on the same trigger). The suspected defect: under
some race, the digivolution card's own MAIN `OnDeletion` body fires even
though it isn't the top card being deleted directly, and its mandatory
`Delete` then removes the wrong permanent entirely instead of only the
inherited `DeDigivolve` peeling its stack. The card's own IR encoding was
checked and reads correctly (main vs. inherited effects are separated as
the printed text requires); the race looks like it's in the interpreter's
trigger dispatch for this permanent-vs-digivolution-card distinction, not
in EX13-053.ts. Not fixed here — needs an engine lane with time to
instrument the dispatch path. The test itself is written correctly and
should stay red-if-real once the seam is found; do not "fix" it by
weakening the assertion.

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

- A card with printed ＜Alliance＞ opens an alliance decision on every real
  attack — a turn-loop test that only awaits `!isAttacking()` will
  deadlock. Answer `{ type: "respondAlliance" }` (no `allyPermanentId`) to
  decline, or with `allyPermanentId` to take it. The open window shows at
  `engine.combat.hasOpenAllianceDecision`, not via `state.pendingDecision`.
- `alternateRequirementIndex` cannot express "printed route only" —
  `digivolve.ts:524` fails the WHOLE digivolve when the explicit index
  matches nothing, so it can't be used to force the catalog EvoCost over
  an available alternate. Prove "printed route wins" cases with a
  same-cost positive plus a control that both preferences refuse, not by
  pinning the index.

- Two different suspend-lock scopes exist and must not be confused:
  `restriction: "unsuspend"` locks the permanent WHOLE-turn (any effect,
  any phase); `unsuspendDuringOwnUnsuspendPhase` locks it only for the
  controller's next unsuspend phase, leaving effect-driven unsuspends
  legal. Pick the one the printed wording actually says ("their next
  unsuspend phase" vs. a bare "can't unsuspend").

- **`UseOptionWithoutCost` has no scaled cost reduction.** It carries
  `reduceCostBy` and `reduceCostByOpponentMemory` only; unlike the sibling
  `PlayWithoutCost` path (`paidReduction` in `play.ts`), its runner
  (`runUseOptionWithoutCost`, `borrowed.ts:522`) never calls `scaleFactor`.
  First hit: EX13-043's "for each suspended Digimon, further reduce it by
  1" on the Option-USE branch, retained as `it.fails`,
  `coverage: "partial"`. Will recur on any "play OR use ... for each ..."
  card. Fix shape: add `reduceCostByScaling?: Scaling` to
  `UseOptionWithoutCostAction`, wire it into `totalReduction` and
  `costDelta`.

- **Pooled ＜Guard＞ can't express per-holder "other than itself".** Leave-
  prevention `Replacement`s are registered per SOURCE permanent, and
  `Filter.excludeSelf` is source-relative — so a ＜Guard＞ granted to a
  *pool* of Digimon (rather than printed on one card) cannot enforce
  §16-45-1's "another Guard holder, not itself" scope per holder. First
  hit: EX13-063, whose module takes the narrower `excludeSelf: true`
  reading (correct for saving itself, loses "a second holder saves this
  one") and documents the gap rather than risking an illegal self-save.
  Needs an engine ＜Guard＞ hook subscribing once per keyword holder, not
  a card-side field. EX12-072 has the same approximation, unobserved.

- Assembly material slots have no `keywords: [...]` field to express a
  printed keyword requirement. Route it through
  `nameOrTrait: [{ tokens: ["＜Blocker＞"], match: "text" }]`, which
  `matchNameOrTrait` resolves via its delimiter-anchored keyword-token
  path. This is also the ONLY way to satisfy
  `materialMatchesAssemblySlot`'s requirement that every slot carry a
  name/trait/text anchor — a colour+level-only slot is rejected as
  unenforceable.

- `advance(...).verb.suspend(ids, byEffectSeat)` bypasses target
  resolution, so it is not a valid probe for a `beAffected`/continuous
  immunity — an immune permanent will still appear to suspend through it.
  Prove immunity with `enterEffectResolution(seat, [kinds])` +
  `deletePermanent` (or the real action the immunity guards), whose
  `isRestricted` path actually reads the effect-source-kinds stack.

- `settle(predicate)` can return mid-resolution: after it settles on a
  count predicate (e.g. `trash.length === 1`), add a bare `await settle()`
  before asserting a final count, or an effect that produces more than
  expected can slip past the first settle undetected.
- `peelStackTops` (a repeated De-Digivolve) has a `levelFloor = 3` — it
  stops once a level-3 card is on top. "De-Digivolve 1" vs "De-Digivolve
  2" is only behaviourally distinguishable when the promoted source card
  is level 4+; a stack of level-3 sources makes both amounts look
  identical.

- `requiresMinRevealed` on a `RevealAdd` slot is only safe when every slot
  shares ONE filter. `reveal.ts` counts matches of a slot's OWN filter
  over the full revealed set — on a two-slot reveal with distinct filters
  (e.g. one text-only slot, one name-exact slot), a `requiresMinRevealed`
  on the name slot wrongly skips the common "one text-only + one named"
  case the printed sentence is meant to cover. Don't copy the EX13-027/
  BT24-066 pattern onto a two-distinct-filter reveal.

- An `attack` intent's target accepts a wrong `kind` string (e.g.
  `"digimon"`) without a typecheck error and without the intent failing —
  it silently no-ops the attack. The correct discriminant is
  `kind: "permanent"`. A test asserting on the *outcome* of such an attack
  can pass for the wrong reason; double check the intent actually landed.
- A `[When Attacking]` proof needs a security card whose own DP and
  effects don't interfere with the assertion — a high-DP or Security-
  effect card can delete the attacker or open an extra decision. Prefer a
  low-DP, no-effect fixture (e.g. BT1-011) over an arbitrary one.

- ＜Guard＞ has no dedicated engine hook (unlike ＜Blocker＞/etc., which
  combat legality checks directly). `combat/keywords.ts` only tokenizes
  it; the actual prevention is expressed as an explicit `Replacement`/
  `wouldLeavePlay` action, same shape as any other leave-prevention
  clause (EX12-056/EX12-072 precedent). Encode it that way, not as a
  bare `Static` keyword and nothing else.

- An `[Opponent's Turn]` inherited `Aura` does NOT materialise from
  merely flipping `state.turnSeat` and calling
  `recomputeContinuousEffects()` in a test — it needs a real turn. Build
  cross-card trait proofs for it through an actual turn, or reuse a
  `[Your Turn]` reader instead when only the trait filter (not the turn
  scope) needs proving.
- The `keywords` predicate's printed-text fallback
  (`matching/definition.ts:286`) scans BOTH `effectText` and
  `inheritedEffectText`, so "a card with ＜X＞" in a hand/deck filter also
  matches a card whose ＜X＞ is only inherited. This is shared by every
  card using the predicate — not a per-card bug, just know it's not
  top-card-only.

- **Fixture trap for `match: "text"` proofs.** `matchNameOrTrait` folds
  `effectiveStaticNames(def)` into its `names` list, so a card printing
  "also treated as [X]" already answers a `match: "name"` filter FROM ITS
  DEFINITION ALONE — such a card can look like it discriminates
  `"text"` from `"name"` when it actually doesn't (a false-green
  mutation test). A genuine text-only fixture must merely *mention* the
  token in prose, not be treated-as it.
- `Delete`'s play-cost ceiling can be scaled per-context by putting
  `playCostLteScaling` (with a `unit`, e.g. `"namedCount"`) on the
  target `Filter`, not on the action — `runAction.ts` already recognizes
  it there. Check this before declaring a scaled-Delete-ceiling an
  engine gap.

- A card's own "without paying the cost" waives the Option's cost, not
  its colour requirement — `optionUseCandidates` still enforces
  `optionColorRequirementMet` unless `waiveColorRequirement` is set. A
  Black/White or mono-color card testing a red-text Option fixture (e.g.
  BT6-093) needs a same-color permanent in play, or the candidate list is
  legitimately empty. Not a gap; a fixture requirement.
- `includeLaterEntrants` is for a grant resolved once inside a *timed*
  window (e.g. EX1-068/BT17-040's "when X happens"); a RESIDENT continuous
  clause (`[Opponent's Turn]`, `[All Turns]`, etc.) is re-derived from the
  live board every pass anyway, so the field is inert there — don't add
  it to a resident clause just because a timed-window peer has it.

- `abortOnDecline` is inert on a `CostGatedBlock` that is its effect's
  only action — it only tells the caller to skip later SIBLING actions,
  and the block's own nested actions are already skipped when its cost
  goes unpaid. Kept for peer consistency, not load-bearing; don't treat
  it as proven by a mutation test.
- A turn-loop test whose only hand card is the one the effect plays makes
  Main auto-pass, ending the turn — `state.memory` then reads the
  negated OPPONENT side's value. Keep a spare playable card in hand.
- A seeded breeding-area Digimon parks `runOneTurn` waiting for a
  hatch/move action (`waitForMainPhase` throws "...Breeding/..."); fire
  the timing directly instead of driving a full turn when breeding state
  is present but not the point of the test.

- ＜Piercing＞ granted continuously via `GainKeyword` is invisible to
  `observe().hasKeyword(p, "Piercing")` — it lands in the battle-modifier
  ledger. Use `observe().hasPierce(p)` instead, or the test gets a
  confusing false negative on a fully-active keyword.
- A GRANTED (not just printed) ＜Alliance＞ opens the alliance decision
  the same as a printed one, including on an effect-driven `forceAttack`
  — any test whose card grants Alliance to a group will park every
  attack on `combat.hasOpenAllianceDecision`, not just tests on cards
  that print the keyword themselves.
- `UseOptionWithoutCost` defaults its cost cap to 5; a printed ceiling
  above 5 must be stated explicitly on the action or it is silently
  shaved down.

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

- **Correction (superseding an earlier note in this file):** a `Static`
  effect's `keywords` entry is NOT decorative. `effect.ts` (~line 620)
  turns it into a self-targeted `GainKeyword` action that grants the
  keyword through the continuous ledger; combat legality
  (`hasBlocker`/`hasVortex`/`hasRush` etc. in `combat/legality.ts`) checks
  that ledger grant FIRST and only falls back to regex-parsing
  `effectText` (`hasPrintedKeyword`) if the ledger has nothing. Whether
  deleting the IR entry breaks a test therefore depends on whether the
  regex fallback happens to also parse that card's specific printed text
  correctly — it did for one EX13 card and did not for another. Always
  keep the `Static` keyword IR entry; do not treat it as redundant with
  printed text, and mutation-test it per card rather than assuming the
  prior finding generalizes.
- `[Rule] Trait: Has [X] Type.` is already satisfied purely from printed
  text — `staticTraitsOf` (`apps/api/src/engine/cards/cardData.ts:299`)
  regex-parses it out of `effectText` directly. A `GrantStatic` IR effect
  for the same rule is not behaviourally provable (deleting it leaves
  trait tests green); keep the entry for record completeness like peers
  do, but don't let a report claim it as proven.
- A per-card test loads only its own card module. A cross-card proof
  needs a side-effect import of the peer
  (`import "../SET/SET-NNN.js";`, per `_a3/revealAdd-cluster.test.ts`) or
  the other card behaves as vanilla in the fixture.

- `BT24-014.ts` may be miscoded: it encodes `＜Decode ([Aegiomon])＞` with
  substring `match: "name"` (should be exact per the bracketed-name
  convention) and carries a duplicated `isInherited: true` copy of both
  the keyword and the leave-prevention replacement, though the catalog
  text prints the keyword only on the Digimon's own line. Sibling
  BT24-027 has the correct shape. Found while authoring EX13-065's own
  ＜Decode＞ clause. Not fixed here — BT24 is a separate, already-audited
  set.

## Out-of-scope finding (not EX13, do not fix here)

- `BT13-048.ts` may be miscoded: it encodes the printed "[Beast], [Animal]
  or [Sovereign], other than [Sea Animal]" sentence with an exact
  `match: "trait"`, which kills the `[Sea Animal]` exclusion (nothing to
  exclude under exact match) and wrongly rejects `[Holy Beast]`,
  `[Dark Animal]`, `[Four Sovereigns]`. Found while authoring EX13-038,
  which prints the identical sentence and uses `traitContains` +
  `excludeNameOrTrait` (BT23-012's shape) instead. Not fixed here — BT13
  is a separate, already-audited set. EX13-042 (Bastemon) prints the same
  sentence and already used the correct shape.

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
