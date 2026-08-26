# BT26 Card Implementation Audit

This ledger records the evidence gathered in ascending card ID order. A card is
marked 10/10 only when its catalog text and local knowledge-base evidence map
completely to compiled IR and the shared primitives have been traced.

Scope note: this audit reviewed catalog text, the knowledge base, compiled IR and
the shared primitives by reading. Focused tests were not re-run per card; the
collection suite and the workspace typecheck were run once at closeout, and their
results are recorded under "Collection closeout" below.

## BT26-001 — Yokomon — 10/10

- Catalog evidence: Red DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [Bulb]/[Iliad]/[TS], rarity C, max 4. No main or Security text. Single
  inherited clause: "[Your Turn] [Once Per Turn] When your effects add to decks, this
  Digimon may digivolve into a Digimon card with [Chronomon] in its text in the hand
  with the cost reduced by 1."
- Knowledge base: Q6948 defines "a card with X in its text" as the union of name,
  traits, effects, inherited effects, (Rule), and every requirement line — not
  effectText alone. Q6949 scopes the watcher: it fires when a card enters a deck from
  any other area, top or bottom, but not when a revealed card is merely restored.
  Q6950 confirms it still fires when an effect removes from and then adds to the deck
  (either order). Q6951 confirms an effect of yours that adds to the OPPONENT's deck
  also triggers it ("your effects", not "your deck").
- Implementation: one inherited effect, `trigger: "YourTurn"`,
  `frequency: "OncePerTurn"`, wrapping a `SubTrigger` on `whenEffectAddsToDeck` with a
  single `Digivolve` action — `target: { filter: { isSelfRef: true }, isSelf: true }`
  (the host permanent, "this Digimon"), `from: ["hand"]`,
  `into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] }`,
  `payCost: true`, `costDelta: -1`, `optional: true`. Registration is exclusively
  `registerIrCard("BT26-001", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `matchNameOrTrait` (interpreter/matching/definition.ts) implements
  `match: "text"` as the full union of normalized names, traits, and the concatenated
  effect/inherited/security/link/dual/option text — exactly Q6948's reading, and
  deliberately not effectText-only. `whenEffectAddsToDeck` is one of the events with a
  dedicated gate rather than the generic `subjectMatchesFilter` (subTrigger.ts), so the
  absent `sourceFilter` correctly leaves the event seat-agnostic, satisfying Q6951. The
  `Digivolve` action keeps `payCost: true` and applies the signed `costDelta`, so the
  printed evolution cost is paid minus 1 rather than waived. `trigger: "YourTurn"`
  restricts activation to the controller's own turn.
- Behavioral proof: 7 cases. Positive path proves an opponent-deck addition triggers it
  (Q6951), the stack top becomes BT26-015, memory drops by the reduced cost, and the
  evolution's own draw lands. Boundary cases: a Chronomon-text Digimon that cannot
  legally evolve onto the current top is never offered; the "may" is refused with no
  memory spent and no card moved; nothing fires during the opponent's turn; the
  once-per-turn budget is consumed only after a successful evolution (second
  add-to-deck leaves the second copy in hand); and a revealed-then-restored deck card
  produces no trigger at all (Q6949).
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-002 — Budmon — 10/10

- Catalog evidence: Green DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [Vegetation]/[DATA SQUAD], rarity C, max 4. No main or Security text. Single
  inherited clause: "[Your Turn] [Once Per Turn] When effects trash cards from under
  your Tamers, ＜Draw 1＞".
- Knowledge base: `node tools/kb/query.mjs card BT26-002` returns no entries. No
  errata, ruling, or restriction applies, so the printed text governs. The only latent
  ambiguity — whether a rule-driven stack trash counts — is resolved by the engine
  event, not by a card ruling (see Primitive trace).
- Implementation: one inherited effect, `trigger: "YourTurn"`,
  `frequency: "OncePerTurn"`, whose sole action is a `SubTrigger` on
  `whenDigivolutionTrashed` with `sourceFilter: { controller: "mine", kind: ["Tamer"] }`
  and `actions: [{ kind: "Draw", controller: "mine", amount: 1 }]`. Registration is
  exclusively `registerIrCard("BT26-002", compiled)` with `coverage: "full"`,
  `residual: []`.
- Primitive trace: `whenDigivolutionTrashed` is fired only from the
  `trashDigivolutionCards` primitive (subTriggerSeams.test.ts documents the seam and
  proves a return-to-hand bounce that clears a stack does NOT fire it, Q4113), so the
  event is already effect-scoped and the printed "effects trash" needs no extra
  `byEffect` gate. The `sourceFilter` reaches the generic `subjectMatchesFilter` path
  (this event is not in subTrigger.ts's dedicated-gate exemption list), so
  `controller: "mine"` plus `kind: ["Tamer"]` matches the host permanent — cards under
  a Digimon and cards under an opponent Tamer are both excluded. `trigger: "YourTurn"`
  gates activation on turn ownership, not on who caused the trash.
- Behavioral proof: 4 cases. Positive path drives the real primitive
  (`trashDigivolutionCards(..., { byEffectSeat: 0 })`) against a Tamer stack and
  asserts exactly one drawn instance, then a second trash the same turn draws nothing
  (once per turn). Negative path bundles three misses in one fixture: a card under a
  Digimon, a card under an opponent's Tamer, and — with `turnSeat` flipped and the
  Tamer's `controllerSeat` reassigned to the watcher — an event during the opponent's
  turn. A fourth case proves once-per-turn identity is per copy: two Budmon under two
  different hosts each draw off a single qualifying trash.
- Cross-card check: the encoding is byte-for-byte the peer shape used by ST24-11 for
  the same printed pattern (`event: "whenDigivolutionTrashed"`,
  `sourceFilter: { controller: "mine", kind: ["Tamer"] }`), and narrower peers such as
  BT21-094 add `requireTrashedDigivolutionCardWasTop` only where the text demands it —
  Budmon's text does not.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-003 — Kyaromon — 10/10

- Catalog evidence: Black DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [Lesser]/[Glowing Dawn]/[BEATBREAK], rarity C, max 4. No main or Security
  text. Single inherited clause: "[Opponent's Turn] [Once Per Turn] When one of your
  opponent's Digimon attacks, by trashing the bottom face-down card from under any of
  your Tamers, change the attack target to 1 of your [Glowing Dawn] trait Digimon."
- Knowledge base: Q6952 — an effect that "changes the attack target" works even on an
  attacker that is unaffected by your effects (the redirect targets the attack, not the
  attacker). Q6953 — the "by" cost may be paid even when you control no [Glowing Dawn]
  Digimon to redirect to; the cost is not gated on the existence of a redirect target.
- Implementation: one inherited effect, `trigger: "OpponentsTurn"`,
  `frequency: "OncePerTurn"`, wrapping a `SubTrigger` on `whenOpponentAttacks` with a
  single `RedirectAttack` action — target is 1 permanent matching
  `{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] }`,
  cost `{ kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 }`, plus
  `optional: true`, `abortOnDecline: true`, and `allowCostWithoutTarget: true`.
  Registration is exclusively `registerIrCard("BT26-003", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: `trashBottomFaceDownUnderTamer` (interpreter/costs.ts:102 for
  affordability, :450 for payment) scopes to `cost.controller`'s seat, keeps only
  battle-area permanents whose `topCard` is a Tamer AND whose `stack[0].faceUp === false`,
  then offers exactly the bottom face-down card of each such Tamer — "the bottom
  face-down card from under ANY of your Tamers", with a prompt when more than one Tamer
  qualifies. A face-up bottom card makes the whole cost unpayable rather than sliding to
  the next card up. `allowCostWithoutTarget: true` is the direct encoding of Q6953:
  the cost resolves even when the redirect finds no [Glowing Dawn] Digimon.
  `abortOnDecline: true` stops the effect cleanly on refusal without touching the stack.
- Behavioral proof: 7 cases. Positive path runs a real `attack` intent on the
  opponent's turn and asserts the bottom face-down Tamer card lands in trash, the upper
  card stays, and the [Glowing Dawn] Digimon survives having absorbed the attack.
  Q6953 case pays the cost with no redirect target on the board. Q6952 case redirects a
  ＜Progress＞ attacker that is unaffected by opposing effects. Optional refusal leaves
  the Tamer stack and trash untouched while the attack proceeds to security.
  Once-per-turn is proven across two separate opponent attacks in one turn (only the
  first cost card is spent). The face-up boundary case proves a face-up bottom card is
  never taken.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-004 — Pagumon — 10/10

- Catalog evidence: Purple DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [Lesser]/[Glowing Dawn]/[BEATBREAK], rarity C, max 4. No main or Security
  text. Single inherited clause: "[When Attacking] [Once Per Turn] By placing 1 card
  from your hand face down under any of your [Glowing Dawn] trait Tamers, ＜Draw 1＞".
- Knowledge base: Q6954 — the placed card goes to the BOTTOM of the cards already under
  that Tamer. Q6955 — the stacking order of face-down cards under a Tamer cannot be
  rearranged. Q6956 — only the owner may look at those face-down cards. Q6957 — a
  face-down card under a Tamer that is trashed is placed face-UP in the trash.
- Implementation: one inherited effect, `trigger: "WhenAttacking"`,
  `frequency: "OncePerTurn"`, whose sole action is
  `{ kind: "Draw", controller: "mine", amount: 1 }` carrying a `place` cost: target is
  1 hand card (`{ controller: "mine", zone: "hand", kind: ["Digimon", "Tamer", "Option"] }`
  — every kind that can legally sit in hand), `underFilter` is
  `{ controller: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] }`,
  and `faceDown: true`, with `optional: true` and `abortOnDecline: true`. Registration
  is exclusively `registerIrCard("BT26-004", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: none.
- Primitive trace: the cost carries no `destination`, so it takes the default
  `placeUnder` branch of `payCost` (interpreter/costs.ts, "By placing N card(s) from
  your hand ..."). Source zones default to `["hand"]`; `cost.underFilter` resolves the
  destination through `resolvePermanentTargets`, prompting when more than one
  [Glowing Dawn] Tamer qualifies and failing the whole cost when none does. The
  placement call is `placeUnder(hostId, [...chosen].reverse(), { belowTop: false, faceUp: cost.faceDown !== true })`
  — `belowTop: false` is bottom insertion (Q6954) and `faceUp: false` keeps the card
  hidden (Q6955/Q6956). Because the cost is all-or-nothing (`chosen.length < want`
  returns false) and `abortOnDecline` is set, a missing Tamer or a refusal means no
  card leaves hand and no draw happens.
- Behavioral proof: 6 cases. The Q6954-Q6957 case is the strongest: it asserts the
  placed card is `stack[0]` (bottom, ahead of the pre-existing card), `faceUp === false`,
  that the draw landed, that the controller's state view carries the card-identity tag
  while the opponent's does not (Q6956), and then trashes it and asserts it reaches the
  trash `faceUp: true` and becomes visible to the opponent (Q6957). Destination
  boundary: with two own [Glowing Dawn] Tamers, one plain Tamer, and an opponent
  [Glowing Dawn] Tamer on the board, exactly one of the two eligible own Tamers
  receives the card and neither the plain nor the opponent Tamer is touched.
  Once-per-turn is proven across two attack windows. Negative path: no own
  [Glowing Dawn] Tamer means no hand card is spent and no draw. Optional refusal leaves
  hand and deck untouched. A structural case pins `faceDown: true` and the Tamer
  `underFilter` in the compiled IR.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-005 — Pinamon — 10/10

- Catalog evidence: Purple DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [Bird]/[DATA SQUAD], rarity C, max 4. No main or Security text. Single
  inherited clause: "[On Deletion] By trashing the bottom face-down card from under any
  of your Tamers, you may play 1 play cost 5 or lower [Avian] trait or [DATA SQUAD]
  trait card from your trash without paying the cost." Note the printed text carries NO
  [Once Per Turn].
- Knowledge base: Q6958 — the card just trashed from under the Tamer to pay the cost is
  itself a legal play target, because the cost is paid before the effect chooses from
  the trash.
- Implementation: one inherited effect, `trigger: "OnDeletion"`, deliberately with no
  `frequency` (matching the printed text), whose sole action is a `PlayWithoutCost`
  with `from: ["trash"]`, `payCost: false`, `optional: true`, target
  `{ controller: "mine", kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait: [{ tokens: ["Avian"], match: "trait" }, { tokens: ["DATA SQUAD"], match: "trait" }] }`,
  and cost `{ kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 }`.
  Registration is exclusively `registerIrCard("BT26-005", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: `nameOrTrait` is a disjunction, so the two trait refs encode
  "[Avian] trait OR [DATA SQUAD] trait" rather than requiring both. `playCostLte: 5`
  is the inclusive "5 or lower" boundary. `kind: ["Digimon", "Tamer"]` is the correct
  reading of "play ... card": Option cards are USED, never played, so admitting them
  would over-reach. `payCost: false` implements "without paying the cost", leaving the
  memory gauge alone. The cost primitive is the same
  `trashBottomFaceDownUnderTamer` traced for BT26-003 (interpreter/costs.ts:102/:450):
  it requires a Tamer whose `stack[0].faceUp === false` and takes that exact card. Cost
  payment strictly precedes target resolution in `runAction`, which is what makes
  Q6958's self-referential play legal for free rather than a special case.
- Behavioral proof: 5 cases. Positive path deletes the host by effect, asserts the
  Tamer's bottom face-down card is gone and the [Avian] card from trash is now a
  battle-area permanent. Q6958 case uses the same instance as both cost and target and
  asserts it ends up on the battle area, not in the trash. Boundary case builds a mixed
  trash pool — an eligible cost-5 [DATA SQUAD] Tamer, an over-cost card, and an
  unrelated card — and proves only the eligible one is played while the other two stay
  in trash; this simultaneously proves the Tamer kind and the inclusive cost-5 edge.
  Optional refusal leaves the Tamer stack intact and the candidate in trash.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-006 — Monimon — 10/10

- Catalog evidence: Purple DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no evo costs,
  traits [CRT]/[Bagra Army], rarity C, max 4. No main or Security text. Single
  inherited clause: "[When Attacking] [Once Per Turn] By trashing any 2 digivolution
  cards from your [Bagra Army] trait Digimon, you may play or use 1 [Bagra Army] trait
  card from your hand with the cost reduced by 2." The printed "play OR use" and the
  bare word "card" (not "Digimon card") are the two load-bearing details.
- Knowledge base: Q6959 — a "by" cost is all-or-nothing; trashing only 1 of the 2
  required cards does not meet it. Q6960 — if the played card has DigiXros and the
  attacking Digimon is consumed as its material, the attack does not succeed (no
  security check). Q6961 — a card trashed by this cost whose own "when effects trash
  this card from digivolution cards" effect is pending loses that effect if it leaves
  the trash before activation (EX10-064 interaction).
- Implementation: one inherited effect, `trigger: "WhenAttacking"`,
  `frequency: "OncePerTurn"`, whose sole action is a `Modal` with `choose: 1` over two
  branches sharing one `cost` object:
  `{ kind: "trash", target: { filter: { zone: "digivolutionCards", controllerDefault: "mine", hostFilter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] } }, count: 2 } }`.
  Branch 1 is `PlayWithoutCost` from hand with `payCost: true`, `reduceCostBy: 2`,
  `allowDigiXros: true`, `optional: true`; branch 2 is `UseOptionWithoutCost` over hand
  Option cards with the same reduction. Registration is exclusively
  `registerIrCard("BT26-006", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: branch 1's play filter was `kind: ["Digimon"]`, which silently
  dropped the only two [Bagra Army] cards in the catalog that are played but are not
  Digimon — BT10-093 Yuu Amano and EX10-064 Yuu Amano & Nene Amano. The printed text
  says "play or use 1 [Bagra Army] trait card", and in this game "play" covers Digimon
  AND Tamer cards while "use" covers Option cards, so the play branch now reads
  `kind: ["Digimon", "Tamer"]`. A catalog sweep confirms the split is exhaustive: of
  the 33 [Bagra Army] cards, 2 are Tamers and 0 are Options, so before this fix the
  effect could never reach either Tamer, and the `UseOptionWithoutCost` branch remains
  a faithful-but-currently-unreachable encoding of the printed "or use".
- Primitive trace: the cost's `hostFilter` restricts digivolution-card candidates to
  hosts whose top card is a [Bagra Army] Digimon; `candidateLooseInstances`
  (targeting/loose.ts) applies `hostFilter` only for the `digivolutionCards`/`linked`
  zones and pools candidates ACROSS every qualifying host, which is the correct reading
  of "from your [Bagra Army] trait Digimon" (plural sourcing, 2 cards total). `count: 2`
  with the non-`upTo` path in `pickLoose` returns nothing when fewer than 2 candidates
  exist, giving Q6959's all-or-nothing behavior for free. `reduceCostBy: 2` with
  `payCost: true` reduces rather than waives the play cost. `runModal`
  (actions/modal.ts) filters branches through `canAttemptModalAction`, which gates on
  cost payability, so an unpayable cost removes both branches and the effect resolves
  to nothing.
- Behavioral proof: 8 cases. Positive path trashes exactly 2 sources from the attacker's
  own stack and plays a [Bagra Army] Digimon for 2 less (memory 1 -> 0), leaving the
  non-[Bagra Army] hand card behind. Cross-host case pays 1 card from each of two
  [Bagra Army] hosts and then proves the second attack window in the same turn does
  nothing (once per turn). Q6959 gets two cases: a single available source pays nothing,
  and a cross-host selection where one chosen source is protected is rejected
  atomically — neither card moves, no card is played, memory unchanged. A negative case
  proves sources under a non-[Bagra Army] Digimon are invisible to the cost. Optional
  refusal leaves both sources and the hand card in place. Q6960 runs a real attack,
  DigiXroses the attacker into the played card, and asserts the attack ends with the
  opponent's security intact and no `securityChecked` event. Q6961 reproduces the
  EX10-064 interaction and asserts the pending draw never happens.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. The kind widening is additive: the existing assertions use
  `toMatchObject` without pinning `kind`, and every fixture's play candidate is a
  Digimon, so no assertion changes.

## BT26-007 — Swipemon — 10/10

- Catalog evidence: White DigiEgg, Lv.2, form [Appmon], attribute Navi, trait [Swipe],
  play cost -1, DP 0, no evo costs, rarity C, max 4. No main or Security text. Single
  inherited clause: "[When Attacking] [Once Per Turn] You may link 1 [Seven Code] trait
  Digimon card from your hand or this Digimon's digivolution cards to this Digimon with
  the cost reduced by 2." Two source zones, one of which is pinned to THIS Digimon's own
  stack; the recipient is also this Digimon.
- Knowledge base: Q6962 — a "you may link" effect still cannot link a card that lacks
  ＜Link＞. The engine enforces this server-side rather than trusting the IR filter.
- Implementation: one inherited effect, `trigger: "WhenAttacking"`,
  `frequency: "OncePerTurn"`, whose sole action is a `Link` with
  `from: ["hand", "digivolutionCards"]`, `costDelta: -2`, `optional: true`, no
  `recipient` (so the recipient defaults to the source permanent, "this Digimon"), and
  a target of 1 card matching
  `{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }], or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }] }`.
  Registration is exclusively `registerIrCard("BT26-007", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: the target filter previously carried
  `hostFilter: { isSelfRef: true }` on the PRIMARY filter, applying to both source
  zones at once. In `candidateLooseInstances` (interpreter/targeting/loose.ts) a filter
  branch that names a `hostFilter` is rejected outright for any zone other than
  `digivolutionCards`/`linked` — a hosted-card qualifier cannot describe a loose hand
  card. The single-branch encoding therefore matched nothing in hand, so the hand half
  of "from your hand or this Digimon's digivolution cards" was dead: no link, no memory
  paid, card left in hand. Replaced with a two-branch `or` union that flattens the
  common trait/kind/controller predicates over one hand branch (no `hostFilter`) and one
  digivolution-card branch pinned to the source permanent via
  `hostFilter: { isSelfRef: true }`. This is the same union shape BT13-019 uses to mix a
  trash source with a host-qualified stack source. This defect was the sole cause of the
  two known failing tests in this file; both assert on the hand path and neither was
  wrong, so no test assertion was changed.
- Primitive trace: `candidateLooseInstances` splits `filter.or` into
  `{...commonFilter, ...branch}` filters, matches each candidate against the union, then
  applies the MATCHED branch's `hostFilter` (loose.ts:301/:323) — so the hand branch
  never sees a host gate and the stack branch resolves `isSelfRef` against
  `ctx.source.permanent()`, correctly excluding another Digimon's digivolution cards.
  `runLink` (interpreter/actions/link.ts) then filters the chosen pool through
  `linkEligible` before any prompt, which is Q6962's server-authoritative gate, and
  prices each card as `linkCostOf(def, costDelta - recipientReduction)` — the printed
  "Cost N" from `linkRequirement`, adjusted by the signed delta and floored at 0. The
  link limit is deliberately not a declaration gate (CR §4-8-5); excess link cards are
  trimmed by the §17-1-3-2-5 rule sweep instead.
- Behavioral proof: 8 cases. Hand path proves BT26-010's printed link cost 3 becomes 1
  (memory 0 -> -1), the card is linked face-up, and hand empties. Stack path links out
  of the host's own digivolution cards for the same reduced cost and leaves Swipemon
  itself in the stack. Negative path proves a [Seven Code] card under ANOTHER Digimon is
  never taken (memory unchanged, the other stack intact). Once-per-turn is proven across
  two attack windows with two eligible hand cards. Two trait/keyword boundaries: an
  Option carrying [Seven Code] but no ＜Link＞ is refused (Q6962), and EX10-024, a
  Link-capable [Appmon] WITHOUT [Seven Code], is refused — the pair proves the filter
  discriminates trait and Link capability independently. Optional refusal spends no
  memory and moves no card.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. The IR fix is expected to turn the 2 known failures green
  without disturbing the 6 already-passing cases; the structural assertion still holds
  because it pins only `kind`, `costDelta`, and `optional`.

## BT26-008 — Kotemon — 10/10

- Catalog evidence: Red Digimon, Lv.3 Rookie, Data, play cost 3, DP 1000, printed
  evo cost `{ Red, level 2, memoryCost 0 }`, traits [Reptile]/[Shambala]/[TB]/[TS],
  rarity C, max 4. Main text: "[Digivolve] Lv.2 w/[Shambala]/[TS] trait: Cost 0" plus
  "[When Moving] [On Play] 1 of your [Shambala] or [TS] trait Digimon gains ＜Piercing＞
  and +3000 DP for the turn." Inherited: "[Your Turn] This Digimon gets +2000 DP."
- Knowledge base: `node tools/kb/query.mjs card BT26-008` returns no entries. No
  errata, ruling, or restriction applies; the printed text governs.
- Implementation: two identical main effects, `trigger: "OnPlay"` and
  `trigger: "WhenMoving"`, each running `SelectBind` -> `GainKeyword` -> `ModifyDP`.
  `SelectBind` picks 1 permanent matching
  `{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }, { tokens: ["TS"], match: "trait" }] }`
  and binds it as `kotemonBonusTarget`; both follow-ups address that binding via
  `target: { fromSelectionRef: "kotemonBonusTarget" }` with `duration: "forTheTurn"`.
  The third effect is inherited, `trigger: "YourTurn"`, granting
  `ModifyDP +2000 / forTheTurn` to `{ isSelf: true }`. The alternate digivolution
  requirement is not IR at all — it is parsed from the printed text by
  `digivolutionRequirementsFor` in `@aegis/shared`. Registration is exclusively
  `registerIrCard("BT26-008", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: the `SelectBind` -> `fromSelectionRef` chain is what makes
  "1 of your ... Digimon gains ＜Piercing＞ AND +3000 DP" land on ONE Digimon; two
  independently targeted actions would have allowed the keyword and the DP to split
  across different permanents. `nameOrTrait` is a disjunction, so [Shambala] OR [TS]
  matches — Kotemon itself carries both and is therefore a legal self-target, as the
  printed "1 of your ... Digimon" allows. `duration: "forTheTurn"` scopes both grants
  to the turn. The inherited clause uses the standard repo encoding for
  "[Your Turn] This Digimon gets +N DP" — a `YourTurn`-triggered `ModifyDP` on
  `isSelf`, byte-identical to the peer BT1-015 — so the bonus applies only while its
  controller holds the turn.
- Behavioral proof: 6 cases. A structural case pins the trigger/inherited layout and
  the three-action bound chain for both main triggers. The requirement case asserts
  `digivolutionRequirementsFor("BT26-008")` contains exactly
  `{ level: 2, traits: ["Shambala", "TS"], cost: 0, isAlternate: true }`. A stack case
  digivolves for zero over an off-color Lv.2 [TS] egg via a real `digivolve` intent
  with `useAlternateCost: true` (memory unchanged at 0) and proves an off-color Lv.2
  egg WITHOUT the traits is rejected. The On Play case grants Piercing and takes the
  chosen Digimon to 9000 DP while a non-matching board-mate is untouched. The binding
  case, with two qualifying targets and a steered selection, proves Piercing and the
  +3000 stay on the SAME permanent and the other keeps its base 5000. The When Moving
  case repeats that through a real `moveFromBreeding` intent. The inherited case
  asserts 7000 DP on the controller's turn and 5000 on the opponent's.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-009 — Hyokomon — 10/10

- Catalog evidence: Red Digimon, Lv.3, Rookie, Vaccine, types [Bird]/[Iliad]/[TS],
  play cost 3, DP 2000, printed evo cost Red Lv.2 for 0, rarity C, max 4. Header
  alternate: "[Digivolve] Lv.2 w/[TS] trait: Cost 0". Main text: "[Start of Your Main
  Phase] By trashing 1 card with [Chronomon] in its text or the [Shaman] trait from your
  hand, ＜Draw 1＞ and gain 1 memory." Inherited: "[When Attacking] ＜Draw 1＞ Then, if
  your hand has 6 or more cards, return 1 card in your hand to the bottom of the deck."
  No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-009` returns Q6963 — "a card with X
  in its text" spans name, traits, effects, inherited effects, (Rule), and every
  requirement line. So the cost filter must accept a card that only mentions
  [Chronomon] in its INHERITED text, and must not be narrowed to effectText.
- Implementation: two effects. (1) `StartOfYourMainPhase` → `Draw` 1, `controller:
  "mine"`, `optional: true`, `abortOnDecline: true`, `cost: { kind: "trash", target: {
  filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["Chronomon"],
  match: "text" }, { tokens: ["Shaman"], match: "trait" }] }, count: 1 } }`, followed by
  `GainMemory` 1. (2) `WhenAttacking`, `isInherited: true` → `Draw` 1 then `Return` 1
  hand card `to: "deckBottom"` gated by `condition: { kind: "zoneCount", seat: "mine",
  zone: "hand", op: "gte", value: 6 }`. Registration is exclusively
  `registerIrCard("BT26-009", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: the alternate digivolve path is NOT carried in this module; it is
  served by `digivolutionRequirementsFor` (packages/shared/src/effects/data.ts:1026),
  whose `GENERATED_DIGIVOLUTION_OVERRIDES` entry for BT26-009 is
  `[{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]` and takes precedence over
  a compiled record, so the IR omission is correct rather than a gap.
  `matchNameOrTrait` (interpreter/matching/definition.ts:264) resolves `match: "text"` as
  the union name ∪ traits ∪ effectText ∪ inheritedEffectText ∪ securityEffectText ∪
  link/dual/option text — exactly Q6963's reading — while `match: "trait"` is a
  normalized whole-token equality over `staticTraitsOf` = forms ∪ attributes ∪ types, so
  [Shaman] cannot over-match. `runAction` (actions/runAction.ts:259) applies the generic
  "You may" prompt and then the cost; `abortOnDecline` stops the effect before
  `GainMemory` runs, which is what makes "and gain 1 memory" share the single payment.
  `zoneCount` is evaluated at the `Return` action, i.e. AFTER the draw resolved, which is
  the printed "Then, if your hand has 6 or more cards" ordering.
- Behavioral proof: 7 cases. Evolution: BT24-002 ([TS] Lv.2 egg) accepts the cost-0
  alternate and leaves memory at 0; BT21-005 (plain Lv.2 egg) is rejected. Q6963: pays
  with BT26-001 Yokomon, which mentions [Chronomon] only in inherited text, then draws
  and gains 1 memory. Alternative cost branch: BT26-032 Ceresmon pays on the [Shaman]
  trait while an unrelated BT1-009 in the same hand is never taken. Negative: with no
  matching hand card the effect draws nothing, gains no memory, and trashes nothing.
  Optional refusal: with an eligible BT26-016 in hand, declining leaves hand, trash,
  deck, and memory untouched. Inherited boundary is proven at exactly 6: a 5-card hand +
  the effect draw = 6 triggers the return, the chosen card lands at `deck.at(-1)` with
  `faceUp === false`; a 4-card hand + draw = 5 stops after the draw. The inherited case
  runs from a real stack (BT26-009 under BT26-014), so source identity and inherited
  scope are exercised rather than assumed.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 7 cases are expected to stay green.

## BT26-010 — Roleplaymon — 10/10

- Catalog evidence: Red Digimon, Lv.3, forms [Stnd.]/[Appmon], attribute [Game], types
  [Role-playing (App Name)]/[Seven Code], play cost 4, DP 4000, printed evo cost Red Lv.2
  for 0, rarity C, max 4. Header alternate: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0".
  Main text: "＜Detach ([Seven Code] trait)＞ / [When Attacking] By trashing 1 [Game],
  [Open] or [Seven Code] trait card from your hand, ＜Draw 2＞". Link requirement
  "[Link] [Appmon] trait: Cost 3"; link effect "＜Progress＞ ＜Piercing＞"; `linkDp` null.
  No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-010` returns Q6964 — ＜Detach＞
  triggers immediately BEFORE both Digimon in a tied battle would be deleted, so
  detaching this card removes ＜Piercing＞ from its link effects before the opponent's
  Digimon is gone; the ＜Piercing＞ security check therefore does not happen.
- Implementation: three effects. (1) `Static` carrying `keywords: [{ keyword: "Detach",
  raw: "＜Detach ([Seven Code] trait)＞" }]`. (2) `WhenAttacking` with an explicit
  `isInherited: false` → `Draw` 2, `optional: true`, `cost: { kind: "trash", target: {
  filter: handCost, count: 1 } }` where `handCost` is `{ controllerDefault: "mine", zone:
  "hand", nameOrTrait: [{ tokens: ["Game"], match: "trait" }, { tokens: ["Open", "Open
  (App Name)"], match: "trait" }, { tokens: ["Seven Code"], match: "trait" }] }`. (3)
  `Static` with `isLinked: true` and `keywords: [Progress, Piercing]`. The module also
  carries `digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate:
  true }]` and `linkRequirement: [{ traits: ["Appmon"], cost: 3 }]`. Registration is
  exclusively `registerIrCard("BT26-010", compiled)`, `coverage: "full"`, `residual: []`.
- Primitive trace: the three bracketed cost tokens are NOT all types in the catalog —
  "Game" exists only as an ATTRIBUTE and "Open" only as the type "Open (App Name)". Both
  are still reachable because `matchNameOrTrait` normalizes against `staticTraitsOf`
  (engine/cards/cardData.ts:293), which is forms ∪ attributes ∪ types ∪ [Rule]-granted
  traits, and `match: "trait"` compares whole tokens with whitespace/hyphen folding — so
  ["Open", "Open (App Name)"] covers the printed and the catalog spelling while never
  collapsing into an unrelated trait. ＜Detach＞ itself is not driven by this keyword ref:
  `detachTraitTokens` (engine/effects/detach.ts) re-reads the printed effectText for
  `＜Detach ([X] trait)＞` and `detachableLinkedCards` filters the permanent's own linked
  cards by that trait, so the IR entry only publishes the keyword for observation while
  combat owns the reaction window. `isLinked: true` keeps ＜Progress＞/＜Piercing＞ alive
  only while this card sits in a host's link area, and `irCardModule` passes `isLinked`
  through to the builder rather than treating it as a plain static.
- Behavioral proof: 12 cases. Scope: ＜Detach＞ is published on Roleplaymon itself, and a
  BT26-010 sitting only as a digivolution SOURCE does not fire the [When Attacking]
  clause — the isInherited:false split is proven, not assumed. Evolution: BT21-001
  ([Appmon] Lv.2) accepts cost 0; BT1-003 is rejected. Link: BT21-009 ([Appmon]) links for
  exactly 3 and gains both Progress and Piercing; BT1-010 is rejected with
  `link-requirement-unmet` and no memory spent; trashing the link card removes both
  keywords in the same recompute. Cost pool is exercised across all three tokens with
  distinct real cards — BT21-054 (attribute [Game]), BT26-086 (type [Open (App Name)]),
  BT26-019 (type [Seven Code]) — each trashed for exactly 2 draws, plus a negative case
  where BT1-009 matches none and nothing moves, plus an optional-refusal case. Q6964 is
  proven end to end: a tied 4000/4000 battle offers Detach, the attacker survives, the
  link card is in trash, and the opponent's security is untouched because linked Piercing
  is already gone. Companion cases prove declining Detach deletes both, two eligible
  losers each get their own decision, a linked card without [Seven Code] is never offered,
  and effect deletion never opens the battle-only window.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 12 cases are expected to stay green.

## BT26-011 — Buraimon — 10/10

- Catalog evidence: Red Digimon, Lv.4, Champion, Vaccine, types [Birdkin]/[Iliad]/[TS],
  play cost 5, DP 5000, printed evo cost Red Lv.3 for 2, rarity U, max 4. Header
  alternate: "[Digivolve] Lv.3 w/[TS] trait: Cost 2". Main text: "＜Raid＞ / [On Play]
  [When Digivolving] By trashing 1 card with [Chronomon] in its text or the [Shaman]
  trait from your hand, ＜Draw 2＞". Inherited: "＜Raid＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-011` returns Q6965, the same
  "a card with X in its text" ruling as BT26-009's Q6963 — the text union spans name,
  traits, effects, inherited effects, (Rule), and every requirement line.
- Implementation: four effects. (1) `Static` with `keywords: [Raid]`. (2) `OnPlay` and
  (3) `WhenDigivolving`, both running the same shared `drawTwoWithCost` action: `Draw` 2,
  `controller: "mine"`, `optional: true`, `abortOnDecline: true`, `cost: { kind: "trash",
  target: { filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens:
  ["Chronomon"], match: "text" }, { tokens: ["Shaman"], match: "trait" }] }, count: 1 } }`.
  (4) `Static` with `isInherited: true` and `keywords: [Raid]`. Registration is exclusively
  `registerIrCard("BT26-011", compiled)`, `coverage: "full"`, `residual: []`.
- Primitive trace: the alternate digivolve path is served by `digivolutionRequirementsFor`
  (shared/effects/data.ts:1026); its committed override for BT26-011 is
  `[{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]`, which takes precedence
  over any compiled `digivolutionRequirement`, so this module's omission is deliberate and
  not a coverage gap. There is no printed [Once Per Turn], so [On Play] and [When
  Digivolving] are correctly modelled as two independent effects with separate default
  `ir-<timing>-<index>` use keys rather than a `sharedUseKey`; only one of the two windows
  can ever fire for a given entry into play, so this cannot double-draw. The cost filter's
  `match: "text"` / `match: "trait"` semantics are the ones traced for BT26-009. ＜Raid＞
  is published twice — once as the printed top-card keyword and once as an inherited
  static — and `irCardModule` routes both through the keyword ledger the combat
  redirection reads.
- Behavioral proof: 8 cases. Evolution: BT25-078 Gazimon (off-color Lv.3 with [TS])
  accepts the cost-2 alternate and lands as the stack's top card; EX8-056 is rejected with
  memory unchanged. [On Play] path pays with BT26-016 and draws exactly 2. [When
  Digivolving] path pays with BT26-032 ([Shaman]) and proves the effect draw lands AFTER
  the evolution draw while an unrelated hand card is untouched. Q6965 is proven with
  BT26-001, which carries [Chronomon] only in inherited text. Negative: accepting with a
  hand of only BT1-009 trashes and draws nothing. Optional refusal leaves hand, trash, and
  deck exactly as they were. Keyword scope: ＜Raid＞ is observable both on a BT26-011 top
  card and on an ST8-07 host carrying BT26-011 as a digivolution source, and a real
  ＜Raid＞ player attack is redirected to the highest-DP unsuspended defender with the
  opponent's security intact.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 8 cases are expected to stay green. Minor note for the coordinator: this test
  file imports `EffectTiming` and `digivolutionRequirementsFor` without using either. It
  is inert for `tsc` (no `noUnusedLocals` in tsconfig.base.json) but oxlint may flag it; I
  left it alone because it is not an incorrect assertion.

## BT26-012 — Manekimon — 10/10

- Catalog evidence: Red/Yellow Digimon, Lv.4, Champion, Vaccine, types
  [Puppet]/[Shambala]/[TB], play cost 5, DP 6000, printed evo costs Red Lv.3 for 3 and
  Yellow Lv.3 for 3, rarity C, max 4. Header alternate: "[Digivolve] Lv.3 w/[Shambala]
  trait: Cost 2". Main text: "[Main] [Once Per Turn] You may play or use 1 [TB] trait card
  from your hand with the cost reduced by 2." Inherited: "[When Attacking] [Once Per Turn]
  1 of your opponent's Digimon gets -2000 DP for the turn." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-012` returns three rulings. Q6966 —
  two copies in the battle area cannot stack their reductions onto one play; you cannot
  simultaneously activate several effects that play or use a card. Q6967 — under a
  "players can't reduce play costs" effect (ST12-03 Solarmon) the effect still activates
  and the card is still played, at full cost. Q6968 — under a "players can't play Digimon
  by effects" effect (BT9-047 Pomumon) the effect still activates but the card cannot be
  played. All three describe the effect as ACTIVATING regardless, with the prohibition
  applied by the engine's own ledgers rather than by suppressing the ability.
- Implementation: two effects. (1) `Main`, `frequency: "OncePerTurn"`, whose sole action
  is a `Modal` with `choose: 1` over two branches: `PlayWithoutCost` from `["hand"]` with
  `payCost: true`, `reduceCostBy: 2`, `optional: true` against `tbPlayable`; and
  `UseOptionWithoutCost` from `["hand"]` with `payCost: true`, `reduceCostBy: 2`,
  `allowMultiColor: true`, `optional: true` against `tbOption`. Both filters extend
  `tbHand = { controllerDefault: "mine", zone: "hand", nameOrTrait: [{ tokens: ["TB"],
  match: "trait" }] }`. (2) `WhenAttacking`, `isInherited: true`, `frequency:
  "OncePerTurn"` → `ModifyDP` -2000, `duration: "forTheTurn"`, target 1 card matching
  `{ controllerDefault: "opponent", kind: ["Digimon"] }`. The module also carries
  `digivolutionRequirement: [{ level: 3, traits: ["Shambala"], cost: 2, isAlternate: true }]`.
  Registration is exclusively `registerIrCard("BT26-012", compiled)`, `coverage: "full"`,
  `residual: []`.
- Defect corrected: the play branch filtered on `kind: ["Digimon"]`, so a [TB] TAMER
  could never be selected. The printed clause is "play or use 1 [TB] trait card", and in
  the Digimon TCG "play" covers Digimon AND Tamer cards; the catalog contains exactly one
  such card today — BT26-104 Kunlun, a White [TB] Tamer with play cost 5 — which the
  branch silently excluded. The filter is now `tbPlayable = { ...tbHand, kind: ["Digimon",
  "Tamer"] }`. This is safe against the sibling branch: `runPlayWithoutCost`
  (interpreter/actions/play.ts:436) routes a selected card to `useOptionFromHand` only
  when its definition has an Option kind and no permanent side, or when the REQUESTED
  kinds name Option without Digimon/Tamer — neither holds for this branch, so a Tamer is
  played as a permanent and an Option still belongs to the second branch. The catalog's
  only other non-Digimon [TB] cards are three EX12 Options (already served by branch 2)
  and EX12-004, a Digi-Egg, which is hatched rather than played and stays correctly out
  of both branches. No test assertion was changed; no existing case puts a Tamer in hand,
  and the structural assertion pins only `{ kind: "Modal", choose: 1 }`.
- Primitive trace: `runModal` (interpreter/actions/modal.ts) resolves `choose: 1` by
  asking `ctx.ask.chooseOption` over the branches `canAttemptModalAction` admits, then
  runs the winning branch's actions; each branch action's own `optional: true` is applied
  by the generic "You may" gate in `runAction` (actions/runAction.ts:259), which is what
  makes the whole printed "You may" refusable. Q6967 and Q6968 are satisfied structurally
  rather than by card IR: `reduceCostBy` is consumed by the play path, which consults the
  continuous ledger's cost-reduction block, and `isPlayProhibited` filters candidates
  inside `runPlayWithoutCost` — so in both rulings the effect activates and the ledger
  decides the outcome. Q6966 needs no IR support: the once-per-turn ledger keys on
  (instanceId, effectKey), so two copies are two independent single uses and neither can
  contribute its reduction to the other's play. The inherited `ModifyDP` targets through
  `controllerDefault: "opponent"` + `kind: ["Digimon"]`, which excludes Tamers and the
  breeding area, and `forTheTurn` is the printed duration.
- Behavioral proof: 9 cases. Evolution: BT26-008 ([Shambala] Lv.3) accepts the cost-2
  alternate; BT1-030 is rejected. Positive: BT26-014 (cost 7, [TB]) is played for 5 memory
  while a non-[TB] BT1-009 in the same hand is never offered, and the second activation in
  the same turn does nothing — proving both the trait filter and the once-per-turn limit.
  Q6967 uses a real cost-reduction block and asserts the Option's full cost is paid.
  Q6966 activates two copies and asserts the total spend is 3 + 7 - 2 = one reduction
  only. Q6968 installs a by-effect play prohibition and asserts the card stays in hand
  with memory untouched. Optional refusal spends nothing and moves nothing. The inherited
  clause is exercised from a real BT26-014-over-BT26-012 stack: -2000 lands once, a second
  attack window changes nothing, an ALLY's attack does not trigger it, and the candidate
  pool excludes an opposing Tamer and an opposing breeding Digimon.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. The Tamer widening only enlarges a candidate pool that no
  existing fixture populates, so all 9 cases are expected to stay green. Engine seam
  observed but NOT changed: `UseOptionWithoutCost` in
  `engine/effects/interpreter/actions/borrowed.ts:376` defaults `costCap` to 5 when the
  IR names no `playCostLte`, then drops any Option with `playCost > costCap`. Manekimon
  prints no cost ceiling at all, so that default is a latent divergence. It is currently
  unobservable — every [TB] Option in the catalog (EX12-070, EX12-074, EX12-075) costs 3 —
  and every peer card using this action relies on the same default, so I left it to the
  coordinator rather than papering over it with a synthetic `playCostLte` on one card.

## BT26-013 — Musyamon — 10/10

- Catalog evidence: Red/Purple Digimon, Lv.4, Champion, Virus, types
  [Wizard]/[Shambala]/[TB]/[TS], play cost 4, DP 5000, printed evo costs Red Lv.3 for 3
  and Purple Lv.3 for 3, rarity C, max 4. Header alternate: "[Digivolve] Lv.3
  w/[Shambala]/[TS] trait: Cost 2" — one path satisfied by EITHER trait. Main text:
  "＜Blocker＞ / [On Play] [On Deletion] By trashing 1 card in your hand, delete 1 of your
  opponent's Digimon with 6000 DP or less." Inherited: "[Your Turn] This Digimon gets
  +2000 DP." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-013` returns no entries, so there are
  no local rulings, errata, or restrictions to apply and no unresolved ambiguity. The one
  general rule that governs the effect is CR §15-7-5: an optional "by [cost]" processing
  condition may be paid even when the processing that follows can do nothing.
- Implementation: four effects. (1) `Static` with `keywords: [Blocker]`. (2) `OnPlay` and
  (3) `OnDeletion`, both running the same shared `trashThenDelete` action: `Delete`,
  `optional: true`, `abortOnDecline: true`, `allowCostWithoutTarget: true`, `target: {
  count: 1, filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value:
  6000 } } }`, `cost: { kind: "trash", target: { filter: { zone: "hand", controller:
  "mine" }, count: 1 } }`. (4) `YourTurn`, `isInherited: true` → `ModifyDP` +2000,
  `duration: "forTheTurn"`, `target: { filter: { isSelfRef: true }, count: 1, isSelf:
  true }`. Registration is exclusively `registerIrCard("BT26-013", compiled)`,
  `coverage: "full"`, `residual: []`.
- Primitive trace: the alternate digivolve path is served by `digivolutionRequirementsFor`
  (shared/effects/data.ts:1026); its committed override is
  `[{ level: 3, traits: ["Shambala", "TS"], cost: 2, isAlternate: true }]`, an ANY-of
  trait list matching the printed "[Shambala]/[TS]", and it takes precedence over any
  compiled record, so this module's omission is deliberate. `allowCostWithoutTarget: true`
  is the flag that encodes CR §15-7-5 — without it the engine would refuse the payment
  when no opponent Digimon is within 6000 DP; with it the cost is paid and the deletion
  simply does nothing, which is the printed reading. `optional: true` is correct because a
  "by [cost]" clause is the player's choice, and `abortOnDecline` keeps a refusal from
  spending the hand card. The cost filter is deliberately unrestricted (`zone: "hand",
  controller: "mine"`) because the text says "1 card in your hand" with no further gate.
  `timingsForTrigger` (interpreter/effect.ts:172) maps `YourTurn` to `EffectTiming.None`,
  the continuous/static window, and `turnOwnerGuard("YourTurn")` gates it to the owner's
  turn — so the inherited +2000 is a live continuous modifier, not a one-shot. This is the
  same shape peer BT26-008 uses for its identical inherited clause.
- Behavioral proof: 8 cases. Evolution: BT24-019 (off-color Lv.3 with [TS]) accepts the
  cost-2 alternate, proving the OR half of the "[Shambala]/[TS]" requirement is live;
  BT1-030 is rejected with memory unchanged. The exact 6000 DP boundary is proven with a
  mixed opposing board — a 6000 DP BT26-012 is deleted while a 7000 DP BT26-014 survives.
  Both trigger windows are exercised independently: once by playing the card, once by
  deleting Musyamon from the battle area, with the same boundary asserted and the
  Musyamon instance itself confirmed in trash alongside the paid card. CR §15-7-5 has its
  own case: with only a 7000 DP opponent on the board the hand card is still trashed and
  nothing is deleted. Optional refusal keeps the hand card, the trash empty, and the legal
  6000 DP target alive. ＜Blocker＞ is observed on the live permanent. The inherited buff
  is proven on a real BT26-014-over-BT26-013 stack: 9000 DP on the owner's turn and 7000
  DP once `turnSeat` is the opponent's, which is the turn-ownership boundary.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 8 cases are expected to stay green.

## BT26-014 — Darumamon — 10/10

- Catalog evidence: Red/Yellow Digimon, Lv.5, Ultimate, Vaccine, types
  [Mutant]/[Shambala]/[TB], play cost 7, DP 7000, printed evo costs Red Lv.4 for 4 and
  Yellow Lv.4 for 4, rarity R, max 4. Header: "[Digivolve] Lv.4 w/[Shambala] trait: Cost
  3" and "[Assembly -2] Lv.4 or lower [TB] trait card". Main text: "[On Play] [When
  Digivolving] Delete 1 of your opponent's Digimon with 7000 DP or less. / [On Deletion]
  You may return 1 [Shambala] trait card from your trash to the hand. Then, you may play 1
  [TB] trait Digimon card with 6000 DP or less from your hand without paying the cost."
  Inherited: "[On Deletion] You may play 1 [TB] trait Digimon card with 6000 DP or less
  from your hand without paying the cost." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-014` returns Q6969 — after the first
  half of the [On Deletion] effect returns THIS card from the trash to the hand, the part
  after "Then" still resolves: an activated effect is fully resolved even when the card
  that activated it leaves the area mid-resolution.
- Implementation: four effects. (1) `OnPlay` and (2) `WhenDigivolving`, both running the
  shared `delete7000` action: `Delete`, `target: { count: 1, filter: { controller:
  "opponent", kind: ["Digimon"], dp: { op: "lte", value: 7000 } } }`, mandatory — the
  printed clause has no "may". (3) `OnDeletion` running two actions in printed order: a
  `Return` `to: "hand"`, `optional: true`, over `{ zone: "trash", controller: "mine",
  nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] }`, then the shared `playTb`
  action — `PlayWithoutCost`, `from: ["hand"]`, `payCost: false`, `optional: true`,
  `target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], dp: { op: "lte",
  value: 6000 }, nameOrTrait: [{ tokens: ["TB"], match: "trait" }] } }`. (4) `OnDeletion`
  with `isInherited: true` running the same `playTb`. Registration is exclusively
  `registerIrCard("BT26-014", compiled)`, `coverage: "full"`, `residual: []`.
- Primitive trace: neither structural header lives in this module and neither is missing.
  `digivolutionRequirementsFor` (shared/effects/data.ts:1026) serves
  `[{ level: 4, traits: ["Shambala"], cost: 3, isAlternate: true }]` from the committed
  overrides, and `assemblyRequirementFor` (shared/effects/data.ts:1371) serves
  `[{ reduceCost: 2, materials: [{ traits: ["TB"], levelMax: 4, count: 1 }] }]` from
  `ASSEMBLY_REQUIREMENT_OVERRIDES` (data.ts:108); both readers prefer the override over a
  compiled record, so an IR copy would be dead weight. The two [On Deletion] entries are
  correctly separate effects rather than one shared clause: the printed main text has the
  extra "return a [Shambala] card" half that the inherited text does not, and sharing the
  `playTb` object is safe because `runAction` reads it, never mutates it. `payCost: false`
  is what makes "without paying the cost" free, distinct from BT26-012's
  `payCost: true` + `reduceCostBy`. Q6969 needs no card-specific support: `runEffect`
  iterates the whole action list of an effect that has already been collected, so the
  `Return` moving Darumamon itself out of the trash cannot interrupt the following
  `PlayWithoutCost`. The `dp: { op: "lte", value: 6000 }` gate is read off the card
  DEFINITION for a hand card, which is the printed "with 6000 DP or less".
- Behavioral proof: 8 cases. Structural: both header requirements are asserted through the
  shared readers. Assembly is exercised through the real `playCard` intent — a Lv.4 [TB]
  material in trash is accepted, drops the cost from 7 to 5, and ends up in the stack,
  while a Lv.5 [TB] near-match is rejected with memory untouched, so the `levelMax: 4`
  boundary is proven against the trait rather than only against a single fixture. The
  exact 7000 DP boundary is proven twice — once via [On Play] and once via [When
  Digivolving] over a real BT26-013 base using the alternate cost — with a 7000 DP target
  deleted and an 8000 DP peer surviving. Q6969 is proven directly: Darumamon is deleted,
  returns itself from the trash to hand, and the "Then" half still plays BT26-012 from
  hand. The inherited half runs from a real BT1-009-over-BT26-014 stack. Negatives: a [TB]
  Digimon above 6000 DP (BT26-014 itself, 7000) and a low-DP non-[TB] card (BT1-009) are
  both refused, so the DP and trait gates are proven independently. Optional refusal
  declines both halves and leaves the play candidate in hand and the board empty.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 8 cases are expected to stay green.

## BT26-015 — Butenmon — 10/10

- Catalog evidence: Red/Yellow Digimon, Lv.5, Ultimate, Vaccine, types
  [Shaman]/[Iliad]/[TS], play cost 7, DP 7000, printed evo costs Red Lv.4 for 4 and Yellow
  Lv.4 for 4, rarity R, max 4. Header alternate: "[Digivolve] Lv.4 w/[TS] trait: Cost 3".
  Main text: "[On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP
  until their turn ends. Then, by returning 1 card in your trash to the bottom of the
  deck, delete 1 of your opponent's 5000 DP or lower Digimon. / [Your Turn] [Once Per
  Turn] When your effects add to decks, 1 of your Digimon may get +3000 DP until your
  opponent's turn ends and attack." Inherited: "[All Turns] [Once Per Turn] When your
  effects add to decks, this Digimon with [Chronomon] in its text may unsuspend." No
  Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-015` returns six rulings. Q6970 —
  the "in its text" union (as BT26-009's Q6963). Q6971 — a Digimon reduced to 0 DP is not
  deleted mid-effect; all activated effects resolve, then one rule check deletes every 0
  DP Digimon at once. Q6972 — the Digimon that gains DP from the [Your Turn] effect MUST
  attack if it can; the attack is not optional. Q6973 — "when your effects add to decks"
  fires whenever a card enters a deck from any other area, top or bottom, but NOT when a
  card revealed from the deck is merely returned. Q6974 — it fires even when the effect
  first removes cards from that deck and then adds to it, and in the reverse order.
  Q6975 — it fires when one of YOUR effects adds cards to your OPPONENT'S deck.
- Implementation: four effects. (1) `OnPlay` and (2) `WhenDigivolving`, sharing
  `onPlayBody`: `ModifyDP` -4000 `duration: "untilOpponentTurnEnd"` on 1 opponent Digimon
  (mandatory); then `Return` 1 card from `{ controller: "mine", zone: "trash" }`
  `to: "deckBottom"`, `optional: true`, `trackCount: "returnedTrash"`; then `Delete` 1
  opponent Digimon with `dp: { op: "lte", value: 5000 }` gated by `condition: { kind:
  "ifThisEffectActed" }`. (3) `YourTurn`, `frequency: "OncePerTurn"` → a `SubTrigger` on
  `whenEffectAddsToDeck` whose body is `SelectBind` (1 of `{ controller: "mine", kind:
  ["Digimon"] }`, `bindAs: "buffTarget"`, `optional: true`, `abortOnDecline: true`),
  `ModifyDP` +3000 `untilOpponentTurnEnd` on the bound ref, and `Attack` on the bound ref
  with `mandatory: true`. (4) `AllTurns`, `isInherited: true`, `frequency: "OncePerTurn"`
  → a `SubTrigger` on the same event with `fireCondition: { kind: "selfTopHasText", filter:
  { nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] } }` and an `Unsuspend` of
  self. The module also carries `digivolutionRequirement: [{ level: 4, traits: ["TS"],
  cost: 3, isAlternate: true }]`. Registration is exclusively
  `registerIrCard("BT26-015", compiled)`, `coverage: "full"`, `residual: []`.
- Defect corrected: the inherited `Unsuspend` was mandatory. The printed clause is "this
  Digimon with [Chronomon] in its text MAY unsuspend", so the unsuspension is the player's
  choice; added `optional: true` to that action. `runAction`
  (interpreter/actions/runAction.ts:259) applies the "You may" prompt generically before
  the `Unsuspend` case in `actions/board.ts:90` — the case itself carries no optionality —
  so this is the only place the choice can live. This matches peer BT26-057, BT26-080, and
  BT26-101, all of which spell "may unsuspend" as `{ kind: "Unsuspend", ..., optional:
  true }`. No test assertion was changed; the existing inherited case runs under
  `autoAcceptOptional`, so it still unsuspends.
- Primitive trace: `ifThisEffectActed` (interpreter/conditions.ts:689) reads
  `ctx.lastEffectActed`, which the `Return` action sets to `moved.length > 0`
  (actions/removal.ts:621/647/704) and which `ModifyDP` never sets — so "Then, by
  returning 1 card..., delete" correctly refuses to delete when the return is declined.
  `whenEffectAddsToDeck` is already scoped in the engine by
  `effectAddsToDeckGate` (interpreter/actions/subTrigger.ts:541): it compares
  `effectAddedToDeckBySeat ?? effectAddedToDeckSeat` to the SOURCE OWNER's seat, not to the
  recipient deck's owner — exactly Q6975 — so the card needs no extra IR for that reading,
  and the "revealed then restored" exclusion of Q6973 is likewise an event-emission
  property rather than a filter. `selfTopMatchesText` resolves the inherited clause's
  "this Digimon with [Chronomon] in its text" against the live HOST's top card through the
  same name ∪ traits ∪ text union as Q6970, which is why a source under a plain host does
  nothing. `Attack` with `mandatory: true` encodes Q6972; the optionality of the whole
  clause lives one action earlier on the `SelectBind`, so declining skips buff and attack
  together. `withSubTriggerFrequency` binds each `[Once Per Turn]` to the effect key, so
  the two reactive clauses count separately and per source instance.
- Behavioral proof: 9 cases. Evolution: BT24-022 (off-color Lv.4 with [TS]) accepts the
  cost-3 alternate; BT1-032 is rejected. The [On Play] body is proven in both directions:
  accepting the return puts the trash card at `deck.at(-1)` and deletes the 4000 DP
  target while a 9000 DP peer survives, and DECLINING the return still applies the
  mandatory -4000 and deletes nothing even though the debuffed 9000 DP Digimon has landed
  at exactly 5000 — which is the assertion that proves the `ifThisEffectActed` gate rather
  than a coincidence. Q6971 asserts two `chooseTargets` decisions and that the second
  offers BOTH the 4000 DP (now 0 DP) and the 5000 DP boundary Digimon, i.e. no mid-effect
  rule check. Q6972/Q6975 run a real BT26-023 play that returns an OPPONENT'S Digimon to
  the OPPONENT'S deck, then assert the chosen ally is at 10000 DP and suspended — buff and
  forced attack together. Q6974 fires the reaction from BT26-009's inherited
  draw-then-return-to-deck-bottom chain. Q6973 asserts a reveal-and-restore changes
  nothing. Optional refusal leaves DP, suspension, and the opponent's security untouched.
  The inherited clause runs from two real stacks side by side: a BT26-009 host (whose
  printed text does contain [Chronomon]) unsuspends, a BT1-009 host does not, and a second
  event in the same turn is refused — proving the text gate and the once-per-turn limit at
  once.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. The added `optional: true` only inserts a prompt that the
  existing inherited case auto-accepts, so all 9 cases are expected to stay green. Gap
  recorded rather than tested: there is no case that DECLINES the inherited unsuspension.
  I did not add one because I cannot run the suite to confirm the decision shape, and the
  existing `autoDeclineOptional` case targets the main [Your Turn] clause instead.

## BT26-016 — Chronomon: Holy Mode — 10/10

- Catalog evidence: Red/Yellow Digimon, Lv.6, Mega, Vaccine, types
  [Shaman]/[Iliad]/[TS], play cost 12, DP 12000, printed evo costs Red Lv.5 for 4 and
  Yellow Lv.5 for 4, rarity SR, max 4. Header alternate: "[Digivolve] Lv.5 w/[TS] trait:
  Cost 3". Main text: "＜Piercing＞ ＜Engage＞ / [On Play] [When Digivolving] [When
  Attacking] [Once Per Turn] You may delete 1 of your opponent's Digimon with as much DP
  as this Digimon or less. Then, by returning 3 cards in trashes to the bottom of the
  deck, ＜Recovery +1＞ / [All Turns] [Once Per Turn] When this Digimon would leave the
  battle area, by returning your top security card to the bottom of the deck, it doesn't
  leave." No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-016` returns six rulings. Q6976 — the
  "by" condition needs all three cards; returning only one does not meet it. Q6977 — a
  Digimon deleted by the first half whose card is then returned from the trash by the
  second half loses its pending [On Deletion]: the effect triggers but the card leaves the
  trash before it can activate. Q6978 — the three cards may come from either trash, in any
  mix. Q6979 — the ACTIVATING player chooses which cards and in what order, including out
  of the opponent's trash. Q6980 — a Digi-Egg among the three still counts even though the
  rules route it to the bottom of the Digi-Egg deck. Q6981 — the security card returned by
  the [All Turns] effect may not be looked at.
- Implementation: top-level `keywords: [Piercing, Engage]`, `digivolutionRequirement:
  [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }]`, and four effects. Three of
  them — `OnPlay`, `WhenDigivolving`, `WhenAttacking` — each carry `frequency:
  "OncePerTurn"` and the SAME `sharedUseKey: "BT26-016/delete-recover"`, and each runs
  `deleteAndRecover` then `recovery`. `deleteAndRecover` is `Delete`, `optional: true`,
  `target: { count: 1, filter: { controllerDefault: "opponent", kind: ["Digimon"], dp: {
  op: "lte", relativeToSource: true } } }`. `recovery` is `SecurityManipulation`,
  `op: "addTop"`, `controller: "mine"`, `source: "deck"`, `amount: 1`, `optional: true`,
  `cost: { kind: "return", target: { filter: { zone: "trash", orFilters: [{
  controllerDefault: "mine" }, { controllerDefault: "opponent" }] }, count: 3 }, to:
  "deckBottom", orderReturnedCards: true }`. The fourth effect is `AllTurns`,
  `frequency: "OncePerTurn"` → `Replacement`, `event: "wouldLeavePlay"`, `mode: "prevent"`,
  `sourceFilter: { isSelfRef: true }`, `optional: true`, `cost: { kind: "return", target: {
  filter: { zone: "security", controllerDefault: "mine", position: "top" }, count: 1 },
  to: "deckBottom" }`. Registration is exclusively `registerIrCard("BT26-016", compiled)`,
  `coverage: "full"`, `residual: []`.
- Primitive trace: `irCardModule`
  (interpreter/registration/module.ts) appends a synthetic `Static` effect for a top-level
  `keywords` array, so the printed ＜Piercing＞/＜Engage＞ line is equivalent to the
  in-effect `Static` shape peers use; `declaresUnimplementedEngageKeyword` additionally
  installs the ＜Engage＞ activated ability from that same declaration. The `sharedUseKey`
  is the load-bearing part of the printed single [Once Per Turn] across three timings:
  `effectKey` becomes `${cardId}/${sharedUseKey}` for all three clauses instead of the
  default `${cardId}/ir-<timing>-<index>`, and the UseTracker keys on (instanceId,
  effectKey), collapsing them to one use per physical card per turn. `dp: { op: "lte",
  relativeToSource: true }` reads this Digimon's live DP rather than the printed 12000, so
  the boundary tracks buffs. Q6976 needs no card IR: `count: 3` on a cost target is
  all-or-nothing in `canPayCost`/the return path, so a partial selection cannot satisfy it.
  Q6978/Q6979 are carried by the two-branch `orFilters` union (both trashes) plus
  `orderReturnedCards: true`, which raises the `orderCards` decision for the ACTIVATING
  seat. Q6977 is a consequence of ordering, not of a flag: the deletion resolves first and
  the return is part of the same effect's cost, so the deleted card leaves the trash before
  its pending [On Deletion] can activate. `Replacement` with `mode: "prevent"` and a
  `position: "top"` security cost is the only shape that satisfies Q6981 — the cost names
  the top card positionally, so no `selectCards` decision that would reveal it is ever
  opened.
- Behavioral proof: 12 cases. Evolution: BT24-061 (off-color Lv.5 with [TS]) accepts the
  cost-3 alternate; BT1-038 is rejected. The DP boundary is proven at exactly equal DP — a
  12000 DP opponent is deleted while a 13000 DP one survives. Q6978/Q6979: the three-card
  cost is paid from a MIXED pool spanning both trashes, the `selectCards` decision belongs
  to seat 0 and offers cards that came from both players' trashes, and an `orderCards`
  decision is raised for seat 0. ＜Recovery +1＞ lands the deck's top card on security
  face-down. Q6977 deletes a BT10-008 with an [On Deletion], returns it to the opponent's
  deck, and asserts nothing was placed under the opposing Tamer. Q6976: with only two cards
  in trash, neither is returned and no recovery happens. Independence of the two halves is
  proven by a hand-driven case that accepts the deletion decision and then declines a
  DISTINCT recovery decision, asserting all three trash cards stay put. The shared use key
  is proven across two different windows — [On Play] consumes it, then [When Attacking] in
  the same turn deletes nothing and recovers nothing. Q6980 puts BT26-001 (a Digi-Egg) in
  the paid three, asserts it lands in the egg deck and that the cost was still met. Both
  printed keywords are observed on the permanent, ＜Piercing＞ checks security after a
  battle deletion, and ＜Engage＞ makes its end-of-turn attack. The leave replacement is
  proven three ways: accepted (deletion returns 0, board intact, security spent, the card
  is at `deck.at(-1)` face-down), declined (deletion returns 1, security untouched), and
  once-per-turn (the second deletion in the same turn returns 1) — with an explicit
  assertion that no `selectCards` decision was opened, which is Q6981.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 12 cases are expected to stay green.

## BT26-017 — Zanbamon — 10/10

- Catalog evidence: Red/Purple Digimon, Lv.6, form [Mega], attribute [Virus], types
  [Wizard]/[Shambala]/[TB]/[TS], play cost 12, DP 12000, printed evo costs Red Lv.5 for 4
  and Purple Lv.5 for 4, rarity U, max 4. Headers: "[Digivolve] Lv.5 w/[Shambala]/[TS]
  trait: Cost 3" and "[Assembly -4] 2 Lv.5 or lower [Shambala] trait cards w/different
  levels". Main text: "＜Blocker＞ ＜Retaliation＞ / [On Play] [When Digivolving] 1 of your
  Digimon with the [Shambala] trait gains ＜Security A. +1＞ and ＜Progress＞ for the turn.
  / [On Deletion] You may play 1 [Shambala] or [TS] trait card with a play cost of 5 or
  less from your trash without paying the cost." No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-017` returns Q6982 — when several
  effects trigger on this card's deletion they are simultaneous, so the controller chooses
  the activation order. Nothing else is card-specific; the rest of the text is unambiguous.
- Implementation: four effects. (1) `Static` publishing `Blocker` and `Retaliation`.
  (2) `OnPlay` and (3) `WhenDigivolving` share one `grantActions` array: `SelectBind` over
  `{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shambala"], match:
  "trait" }] }` bound as `zanbamonGrantTarget`, then two `GainKeyword` actions on
  `fromSelectionRef` — `{ keyword: "SecurityAttack", amount: 1 }` and `{ keyword:
  "Progress" }` — both `duration: "forTheTurn"`. (4) `OnDeletion` runs one
  `PlayWithoutCost` with `from: ["trash"]`, `payCost: false`, `optional: true`, and target
  `{ controller: "mine", kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait:
  [Shambala | TS] }`, count 1. Registration is exclusively
  `registerIrCard("BT26-017", compiled)`, `coverage: "full"`, `residual: []`.
- Primitive trace: the two header requirements are NOT in this module and do not need to
  be — `digivolutionRequirementsFor` (packages/shared/src/effects/data.ts:1026) resolves
  the alternate from `generated-digivolve-overrides.json`, which holds
  `{ level: 5, traits: ["Shambala", "TS"], cost: 3, isAlternate: true }`, and
  `assemblyRequirementFor` resolves `ASSEMBLY_REQUIREMENT_OVERRIDES["BT26-017"] =
  [{ reduceCost: 4, materials: [{ traits: ["Shambala"], levelMax: 5, count: 2,
  differentLevels: true }] }]`; both overrides take precedence over any compiled entry, so
  duplicating them here could only drift. `SelectBind` + `fromSelectionRef` is the shared
  idiom that makes ONE selection feed both grants (the same seam BT26-051 uses), so the
  card cannot grant ＜Security A. +1＞ to one Digimon and ＜Progress＞ to another.
  `forTheTurn` maps to `EffectDuration.UntilEachTurnEnd` (interpreter/duration.ts), which
  the continuous sweep clears at ANY turn end. The `kind: ["Digimon", "Tamer"]` bound on
  the trash play is correct rather than narrow: "play" in this game covers Digimon and
  Tamer cards only — the interpreter's own reveal disposition gate encodes the same rule
  (`to: "play"` accepts Digimon/Tamer, Options go through `useOption`,
  interpreter/actions/reveal.ts), so the many [TS]/[Shambala] Option cards in BT24–EX12 are
  correctly not offered. `nameOrTrait` refs are OR-ed, giving "Shambala or TS".
- Behavioral proof: 9 cases. IR shape and the shared-selection contract for both entry
  triggers; the exact Assembly recipe including a rejected equal-level pair; the grant
  landing on a [Shambala] ally and NOT on a non-Shambala ally, plus expiry at the
  `eachTurnEnd` sweep for both keywords; the grant through a real BT26-014 [Shambala]
  digivolution; the alternate evolution accepted from an off-color [TS] Lv.5 (BT24-028) and
  rejected from a plain Lv.5; ＜Blocker＞/＜Retaliation＞ published and then exercised end
  to end (a block that saves security, a Retaliation trade); the [On Deletion] play
  choosing the cost-5-or-less card while the cost-6 peer stays in trash; the TS-only branch
  plus an optional refusal that leaves the eligible card in trash; and Q6982 proven
  directly — the top card's and an inherited source's [On Deletion] effects are offered as
  two distinct ordering keys in one `orderTriggers` request.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 9 cases are expected to stay green.

## BT26-018 — Sangomon — 10/10

- Catalog evidence: Blue Digimon, Lv.3, form [Rookie], attribute [Data], types
  [Mollusk]/[DS], play cost 3, DP 1000, printed evo cost Blue Lv.2 for 0, rarity C, max 4.
  Header: "[Digivolve] Lv.2 w/[DS] trait: Cost 0". Main text: "[When Moving] [On Play]
  Reveal the top 3 cards of your deck. Add 1 card with [Aqua] or [Sea Animal] in any of its
  traits or 1 card with the [DS] trait among them to the hand. Return the rest to the
  bottom of the deck. Then, trash the bottom digivolution card of 1 of your opponent's
  Digimon. / [Rule] Trait: Has [Aquatic] Type." Inherited text: "＜Jamming＞". No Security
  text.
- Knowledge base: `node tools/kb/query.mjs card BT26-018` returns no entries. The printed
  clause is unambiguous once the "in any of its traits" idiom is read correctly (see the
  defect below); the "or" between the two add conditions makes it ONE card total, not one
  of each — contrast BT19-017/BT21-033, which print "and" and therefore add two.
- Implementation: four effects. `OnPlay` and `WhenMoving` share one `revealAndTrash` array:
  (a) `RevealAdd` with `revealCount: 3`, a single `add` slot of `count: 1` whose primary
  filter is `nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }]`
  with `orFilters: [{ nameOrTrait: [{ tokens: ["DS"], match: "trait" }] }]`, and
  `rest: "deckBottom"`; (b) `TrashDigivolution` on
  `{ controllerDefault: "opponent", kind: ["Digimon"] }`, `amount: 1`, `fromTop: false`.
  Then an inherited `Static` carrying ＜Jamming＞, and a self-targeting `Static`
  `GrantStatic { grant: "trait", tokens: ["Aquatic"], duration: "permanent" }` for the
  [Rule] line. `digivolutionRequirement: [{ level: 2, traits: ["DS"], cost: 0, isAlternate:
  true }]`. Registration is exclusively `registerIrCard("BT26-018", compiled)`,
  `coverage: "full"`, `residual: []`.
- Defect corrected: the add filter matched the [Aqua] and [Sea Animal] tokens with
  `match: "trait"`, i.e. whole-trait equality. The printed idiom "with [Aqua] or [Sea
  Animal] **in any of its traits**" is the containment form — it is what lets [Aquatic],
  [Aqua Beast], [Sea Animal] and friends qualify, and it is exactly why this card's own
  [Rule] line grants it the [Aquatic] type. As written, almost no real card could be added
  through that branch: the effect quietly degraded to a [DS]-only search. Corrected to a
  single `{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }` ref, matching the
  peer precedent BT19-017 (identical wording) and EX12-031 (the same token pair in an
  Assembly recipe). The [DS] branch stays exact-trait in `orFilters`, preserving the "or"
  union with a shared `count: 1`.
- Primitive trace: `definitionMatches` (interpreter/matching/definition.ts:322) resolves
  `match: "trait"` as `traits.some(x => x === token)` and `match: "traitContains"` as
  `traits.some(x => x.includes(token))`, both over `staticTraitsOf` (forms ∪ attributes ∪
  types ∪ [Rule]-granted traits) with whitespace/hyphen folding — so "Sea Animal" folds to
  `seaanimal` and cannot leak into an unrelated trait. `RevealAdd` unions the primary
  filter with `orFilters` inside ONE `qualifies` predicate and spends a single shared
  `count`, so the player adds one card from either branch, never one per branch
  (interpreter/actions/reveal.ts:199-206). A slot with no `to` falls through to the hand
  disposition. `rest: "deckBottom"` returns the unchosen cards through `returnToDeck(...,
  { toTop: false })` in the player's chosen order. `TrashDigivolution` with
  `fromTop: false` takes the bottom source; index 0 of `permanent.stack` is the bottom, as
  the peer BT26-021 stack assertions confirm. The `GrantStatic` trait is `permanent`, so
  the sweep never strips the [Rule] type, and `requireCardDefinition` + `definitionMatches`
  see it even while Sangomon is a loose card.
- Behavioral proof: 6 cases. A seam-level unit test drives the resolver directly and pins
  the exact candidate set (`["aqua", "sea", "ds"]` from a mixed pool that includes a
  non-matching card), the `min: 1, max: 1` bound, the ordered `deckBottom` return of the
  remaining three, and the retention of a pick whose hand move fails. The public path plays
  Sangomon for 3, adds the [DS] card, leaves the two plain cards in deck order, and trashes
  exactly the opponent's bottom source. [When Moving] out of breeding is proven to still run
  the "Then" clause with an empty deck. The [Rule] trait is proven both on a loose
  definition and on a battle-area permanent, and ＜Jamming＞ is proven inherited-only:
  granted to a host carrying Sangomon as a source, absent on a Sangomon top card, and used
  to survive a losing security battle that kills the top-card copy.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. The `traitContains` correction cannot change any existing
  assertion: the unit fixture's traits are exactly `Aqua` / `Sea Animal` / `DS` / none, and
  the public fixture's revealed cards are [Mini Dragon], [Reptile] and [Crustacean]/[DS] —
  none of which gains or loses eligibility under containment.

## BT26-019 — Mailmon — 8/10

- Catalog evidence: Blue Digimon, Lv.3, forms [Stnd.]/[Appmon], attribute [Social], types
  [Mail (App Name)]/[Seven Code], play cost 4, DP 4000, printed evo cost Blue Lv.2 for 0,
  rarity C, max 4. Header: "[Digivolve] Lv.2 w/[Appmon] trait: Cost 0". Main text:
  "＜Detach ([Seven Code] trait)＞ / [When Attacking] If your hand has 7 or fewer cards,
  ＜Draw 1＞". Link requirement "[Link] [Appmon] trait: Cost 3"; link effect "[When Linking]
  1 of your opponent's Digimon or Tamers can't suspend until their turn ends"; `linkDp`
  null. No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-019` returns no entries. The nearest
  authority for the link clause is the BT23-024 ruling quoted inside the engine
  (combat/legality.ts:196-203, KB Q5247): a "can't suspend" Digimon cannot declare a
  tapping attack, because declaring one suspends the attacker. That is the load-bearing
  consequence this card is played for.
- Implementation: two effects. (1) `WhenAttacking` → `Draw` 1 for `controller: "mine"`
  gated by `{ kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 }`.
  (2) `Static` with `isLinked: true` carrying a `SubTrigger { event: "whenLinked",
  sourceFilter: { isSelfRef: true } }` whose body is
  `Restrict { target: { filter: { controllerDefault: "opponent", kind: ["Digimon",
  "Tamer"] }, count: 1 }, restriction: "suspend", duration: "untilOpponentTurnEnd" }`.
  Top-level `keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }]`.
  Registration is exclusively `registerIrCard("BT26-019", compiled)`, `coverage: "full"`,
  `residual: []`. The card carries no `linkRequirement` array and does not need one: the
  §17-1-3-2-6 category gate and the link cost are parsed from the printed
  `CardDefinition.linkRequirement` header (GameEngine.parseLinkCategory, ~line 4186), which
  is the only source that covers every auto-generated link card.
- Blocking defect (engine seam, NOT applied): the IR is faithful, but the shared
  interpreter now rewrites the restriction token before it reaches the ledger.
  `apps/api/src/engine/effects/interpreter/actions/restrictions.ts:60-70` maps
  `action.restriction === "suspend"` to the ledger kind `"beSuspended"`. Those are two
  DIFFERENT mechanics: `"suspend"` is "this permanent can't suspend" and is consumed by
  `canAttackerDeclare` (combat/legality.ts:203); `"beSuspended"` is "can't BE suspended by
  effects" (EffectContext.ts:43, KB BT19-101 Q3185) and is consumed only by the
  effect-suspend primitive and the suspend-as-cost gate (primitives.ts:3262/3285). With the
  rewrite in place, Mailmon's link face records a protection instead of a prohibition: the
  chosen opponent can still declare a tapping attack, and `isRestricted(target, "suspend")`
  is false. The rewrite was introduced by commit `0f9ca174d` ("fix(cards): audit BT20-024
  Seadramon X") one day before this audit; BT20-024 targets a Tamer, whose only suspension
  is a cost, so `beSuspended` happened to satisfy it. The rewrite is global: 129 card
  modules author `restriction: "suspend"`, and card suites outside BT26 (EX8-024, EX8-026,
  EX12-029, EX12-032, EX12-035, EX12-036 among them) assert the ledger `"suspend"` kind
  after exactly this IR, so the regression is repo-wide rather than BT26-specific.
  Required fix, in the engine and therefore out of scope for this worker: treat IR
  `"suspend"` the way `"attackOrBlock"` is already treated a few lines below — record BOTH
  ledger kinds for each resolved target (`ctx.fx.restrict(id, "suspend", ...)` and
  `ctx.fx.restrict(id, "beSuspended", ...)`) instead of replacing one with the other. That
  keeps BT20-024 correct, restores every "can't suspend" card, and is also the rules-true
  reading: a permanent that can't suspend can't be suspended by an effect either. No card-
  side workaround exists — the interpreter intercepts the only IR token that reaches the
  `"suspend"` ledger kind, so this card cannot be made correct without that seam change.
- Primitive trace: `link` (primitives.ts:1868-1918) inserts the card, recomputes DP,
  recomputes continuous effects so a newly linked card can install its own watcher, then
  publishes ONE `whenLinked` SubTrigger dispatch carrying `subjectPermanentId` and
  `linkedCardInstanceIds`, followed by `fireWhenLinking`. `whenLinked` always routes through
  `runSubTriggersInChosenOrder` (GameEngine.ts:2235), so a host effect and a link face are
  simultaneous and the controller orders them. `linkedSelfSourceGate`
  (interpreter/actions/subTrigger.ts:835-851) applies the instance gate only when the
  watcher's own source is itself linked, which is what stops an already-linked Mailmon from
  re-firing when a different card links to the same host. `untilOpponentTurnEnd` is framed
  from the SOURCE's seat: `clearsAt` (continuous.ts:456-462) clears it on an `eachTurnEnd`
  sweep only when the sweeping seat is not the owner — i.e. at the end of the opponent's
  turn, which is exactly "until their turn ends". ＜Detach＞ is not driven by the keyword
  entry: `detachTraitTokens`/`detachableLinkedCards` (effects/detach.ts) re-read the printed
  `＜Detach ([X] trait)＞` text and filter the host's own linked cards.
- Behavioral proof: 10 cases. Evolution: BT21-005 ([Appmon] Lv.2) at cost 0, rejected
  against a plain egg. Hand boundary: draws at exactly 7, refuses at 8, and is a safe
  no-op on an empty deck at the eligible boundary. Link: BT21-009 accepted for exactly 3
  and face up, BT1-010 rejected as `link-requirement-unmet` with no memory spent, and an
  underfunded attempt rejected as `insufficient-memory`. Link face: the candidate set is
  exactly the opponent's Digimon and Tamer (the opponent's Option and the controller's own
  Tamer are excluded), the restriction survives the controller's own turn-end sweep and
  clears on the opponent's, the locked Digimon cannot declare an attack and security is
  untouched, the window is shared with a host's own `whenLinked` effect (BT26-051), and an
  already-linked Mailmon does not re-fire. ＜Detach＞ eligibility is proven against a mixed
  link area (a [Seven Code] card and a near-match) and then used in battle to save Mailmon.
  Two of these cases — "public When Linking selects only an opposing Digimon/Tamer and locks
  suspension through that turn end" and "prevents the chosen opposing Digimon from
  suspending to attack" — currently fail, and they fail for the right reason: they are the
  only two that assert the ledger consequence the seam defect suppresses. The tests are
  correct as written and were deliberately left unchanged.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. 8 of the 10 cases are expected green; the 2 named above stay
  red until the `restrictions.ts` seam records both ledger kinds.

## BT26-020 — ShellNumemon — 10/10

- Catalog evidence: Blue Digimon, Lv.4, form [Champion], attribute [Virus], types
  [Crustacean]/[DS], play cost 4, DP 4000, printed evo cost Blue Lv.3 for 2, rarity C,
  max 4. Header: "[Digivolve] Lv.3 w/[DS] trait: Cost 2". Main text: "[On Play] ＜Draw 1＞
  Then, 1 of your opponent's Digimon can't attack or block until their turn ends."
  Inherited text: "＜Evade＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-020` returns no entries. Every clause
  is unambiguous: the draw is unconditional, the "Then" restriction is mandatory and
  single-target, and the duration runs to the opponent's turn end.
- Implementation: two effects. (1) `OnPlay` → `Draw { controller: "mine", amount: 1 }`
  followed by `Restrict { target: { count: 1, filter: { controller: "opponent", kind:
  ["Digimon"] } }, restriction: "attackOrBlock", duration: "untilOpponentTurnEnd" }`.
  (2) inherited `Static` carrying ＜Evade＞. Registration is exclusively
  `registerIrCard("BT26-020", compiled)`, `coverage: "full"`, `residual: []`. The alternate
  requirement is resolved by `digivolutionRequirementsFor` from
  `generated-digivolve-overrides.json` (`{ level: 3, traits: ["DS"], cost: 2, isAlternate:
  true }`), which takes precedence over any compiled entry.
- Primitive trace: `restriction: "attackOrBlock"` is one of the interpreter's two
  fan-out restrictions — `runRestrictionAction` (interpreter/actions/restrictions.ts:104)
  records `"attack"` AND `"block"` on each resolved target rather than a single composite
  kind, so both halves are enforced independently by `canAttackerDeclare` and the block
  gate. This is the reason the card does NOT hit the `"suspend"` → `"beSuspended"` rewrite
  a few lines above it that blocks BT26-019. `untilOpponentTurnEnd` is framed from the
  source's seat: `clearsAt` (continuous.ts:456-462) clears it on an `eachTurnEnd` sweep
  only when the sweeping seat is not the owner. The two actions are sequential, not
  conditional on one another, so an empty deck cannot swallow the "Then" clause. ＜Evade＞
  lives on an inherited `Static`, so `irCardModule` keeps it scoped to a host carrying
  ShellNumemon as a digivolution source.
- Behavioral proof: 6 cases. IR shape including the inherited split; the public play draws
  the named card and restricts EXACTLY one of two eligible opponent Digimon (proved by
  counting the restricted set, not by asserting a fixed pick), both halves are recorded,
  the locked Digimon's attack intent is rejected with no suspension and no security loss,
  and the restriction survives the controller's own `eachTurnEnd` sweep while clearing on
  the opponent's; the "Then" restriction still lands when the draw finds an empty deck;
  the Lv.3 [DS] alternate at exactly cost 2 over a real BT26-018 base, rejected against a
  plain Lv.3 with no memory spent; ＜Evade＞ granted to a host and absent on a ShellNumemon
  top card; and ＜Evade＞ used end to end — the prompt fires, the accepted response suspends
  the host and cancels the effect deletion.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 6 cases are expected to stay green.

## BT26-021 — Gekomon — 10/10

- Catalog evidence: Blue/Purple Digimon, Lv.4, form [Champion], attribute [Virus], types
  [Amphibian]/[Titan]/[TS], play cost 4, DP 4000, printed evo costs Blue Lv.3 for 3 and
  Purple Lv.3 for 3, rarity C, max 4. Header: "[Digivolve] Lv.3 w/[TS] trait: Cost 2".
  Main text: "[On Play] [When Digivolving] 1 of your [TS] trait Digimon's attack target
  can't change for the turn. / [Main] [Once Per Turn] You may play 1 [TS] trait Tamer card
  from your trash with the cost reduced by 2." Inherited text: "[All Turns] [Once Per
  Turn] When a Digimon attacks, by trashing 1 card in your hand, trash the bottom 2
  digivolution cards of 1 of your opponent's Digimon." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-021` returns Q6983 and Q6984. Q6983:
  two copies of this card cannot stack their reductions on one played card, because two
  card-playing effects cannot be activated simultaneously. Q6984: under a "players can't
  reduce play costs" effect (ST12-03 Solarmon) the [Main] effect still activates and still
  plays the card — only the reduction is lost.
- Implementation: four effects. (1) `OnPlay` and (2) `WhenDigivolving` share
  `lockAttackTarget` = `Restrict { target: { filter: { controllerDefault: "mine", kind:
  ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }, count: 1 },
  restriction: "attackTargetChange", duration: "untilEachTurnEnd" }`. (3) `Main` with
  `effectKey: "BT26-021/main-play-ts-tamer-from-trash"` and `frequency: "OncePerTurn"` →
  `PlayWithoutCost { from: ["trash"], payCost: true, reduceCostBy: 2, optional: true }`
  over `{ controllerDefault: "mine", zone: "trash", kind: ["Tamer"], nameOrTrait: [TS] }`.
  (4) inherited `AllTurns` with `frequency: "OncePerTurn"` carrying
  `SubTrigger { event: "whenAttacking", cost: { kind: "trash", target: { filter: {
  controllerDefault: "mine", zone: "hand" }, count: 1 } }, actions: [TrashDigivolution {
  target: opponent Digimon, amount: 2, fromTop: false }] }`.
  `digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]`.
  Registration is exclusively `registerIrCard("BT26-021", compiled)`, `coverage: "full"`,
  `residual: []`.
- Primitive trace: `"untilEachTurnEnd"` is not a named case in `toDuration`
  (interpreter/duration.ts) and falls to the default `EffectDuration.UntilEachTurnEnd` —
  the same value `"forTheTurn"` maps to, so "for the turn" is honored exactly and clears at
  the first turn end of either player. The explicit `effectKey` is what makes the [Main]
  clause addressable by `activateEffect` and what keys the once-per-turn ledger, so two
  copies each get their own budget while a single copy cannot re-activate (Q6983 is
  enforced upstream of the card by the interpreter's "one card-playing effect at a time"
  rule; the card only has to not invent a second activation). `payCost: true` with
  `reduceCostBy: 2` deliberately routes through the normal cost path rather than the free
  path, which is what lets a `RestrictCostReduction` seat lock strip the discount while the
  play still happens (Q6984). `fromTop: false` takes the bottom of the stack; index 0 of
  `permanent.stack` is the bottom, which the test's residual `[third, fourth]` assertion
  pins. `withSubTriggerFrequency` binds the inherited watcher's once-per-turn budget to the
  effect key, and the declined hand-trash cost sets `oncePerTurnActivationDeclined` so a
  refusal does not burn the turn's use.
- Behavioral proof: 8 cases. A seam-level unit test proves the watcher installs with no
  `matches` gate and that declining the hand-trash cost leaves the once-per-turn budget
  unspent. Publicly: the play costs 4, the lock candidates are exactly the controller's own
  [TS] Digimon (including Gekomon itself) while a non-TS ally and the OPPONENT's TS Digimon
  are excluded, a real attack then resolves without the opposing ＜Blocker＞ intercepting,
  and the lock clears on the `eachTurnEnd` sweep. The Lv.3 [TS] alternate is accepted on a
  red [TS] base for exactly 2 and rejected as `invalid-evolution` on a plain red Lv.3 with
  the card still in hand. Q6983 is proven with two Gekomon in play — one activation, a
  cost-3 TS Tamer played for 1, memory 1 → 0. Q6984 is proven with ST12-03 opposite — the
  effect activates and the Tamer still reaches the battle area at full cost. The optional
  refusal leaves the Tamer in trash and memory untouched. The inherited clause is exercised
  on the OPPONENT's attack: one hand card paid, exactly the bottom 2 sources trashed, and
  the second attack of the same turn does nothing.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 8 cases are expected to stay green.

## BT26-022 — Sorcermon — 10/10

- Catalog evidence: Blue/Yellow Digimon, Lv.4, form [Champion], attribute [Vaccine], types
  [Wizard]/[Witchelny]/[Iliad]/[TS], play cost 4, DP 4000, printed evo costs Blue Lv.3 for
  3 and Yellow Lv.3 for 3, rarity U, max 4. Header: "[Digivolve] Lv.3 w/[TS] trait: Cost
  2". Main text: "[On Play] [When Digivolving] Add your top security card to the hand and
  ＜Recovery +1＞ / [End of Your Turn] If you have a red or purple Digimon, by placing this
  Digimon as the bottom security card, you may play 1 blue or red [Iliad] trait Digimon
  card from your hand with the cost reduced by 4." Inherited text: "＜Barrier＞". No
  Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-022` returns Q6985 — with 0 security
  cards the [On Play]/[When Digivolving] effect can still be activated and ＜Recovery +1＞
  still happens; the add half simply does nothing.
- Implementation: four effects. `OnPlay` and `WhenDigivolving` share `recoveryBody` =
  `SecurityManipulation { op: "toHand", controller: "mine", source: "securityTop", amount:
  1 }` then `SecurityManipulation { op: "addTop", controller: "mine", source: "deck",
  amount: 1 }`. `EndOfYourTurn` carries one `CostGatedBlock` with `optional: true`,
  `abortOnDecline: true`, `condition: anyOf(youHave red Digimon, youHave purple Digimon)`,
  `cost: { kind: "place", destination: "security", position: "bottom", targetIsPermanent:
  true, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }`, and a body of
  `PlayWithoutCost { from: ["hand"], payCost: true, reduceCostBy: 4, optional: true }` over
  `eligibleIliad` = blue [Iliad] Digimon in hand with `orFilters` for the red [Iliad]
  branch. Then an inherited `Static` carrying ＜Barrier＞.
  `digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }]`.
  Registration is exclusively `registerIrCard("BT26-022", compiled)`, `coverage: "full"`,
  `residual: []`.
- Primitive trace: the two `SecurityManipulation` actions are ordered and independent —
  `toHand` from `securityTop` is a no-op on an empty stack and does not abort the block, so
  `addTop` from `deck` still runs, which is exactly Q6985. ＜Recovery +1＞ is modelled as
  `addTop` from the DECK (not a reshuffle), and the placed card stays face down, matching
  the printed keyword. `CostGatedBlock` with `abortOnDecline: true` makes the whole clause
  a single "may": the gate condition is checked first, the cost prompt comes second, and
  only a paid cost reaches the body — while the body's own `optional: true` preserves the
  printed second "may" ("you MAY play"), so paying the security cost and then declining the
  play is legal and does not roll the cost back. `targetIsPermanent: true` on the cost is
  what lets the source Digimon PERMANENT be placed into security rather than a loose card.
  `payCost: true` with `reduceCostBy: 4` keeps the play on the normal cost path, so the
  reduction is a discount rather than a free play. The color condition uses two `youHave`
  filters under `anyOf` rather than a single multi-color filter, which is the correct
  reading of "a red or purple Digimon" (either color qualifies; a multicolor Digimon
  qualifies through either branch). ＜Barrier＞ lives on an inherited `Static`, so it is
  scoped to a host carrying Sorcermon as a source.
- Behavioral proof: 9 cases. The Lv.3 [TS] alternate at exactly cost 2 over a real BT26-009
  base, rejected against an off-color non-TS Lv.3, with the recovery observed on the same
  digivolution. The [On Play] path moves the old security top to hand and then places the
  new deck top FACE DOWN as the new security top. Q6985 is proven directly with 0 security
  — recovery still lands. The end-of-turn clause is proven with a red gate (Sorcermon leaves
  the battle area, sits as the BOTTOM security card face down, and a blue [Iliad] is played
  for 4 less with memory unchanged from 0), with a purple gate feeding the red [Iliad]
  branch while an unrelated hand card is untouched, with the negative case (no red or purple
  Digimon → no cost paid, no play, hand intact), and with a two-decision case that proves
  the cost prompt and the play prompt are distinct decisions and that declining the second
  keeps the paid cost. ＜Barrier＞ is proven inherited-only and then used end to end: the
  prompt fires, the top security card is spent, and the effect deletion is cancelled.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 9 cases are expected to stay green.

## BT26-023 — Mojyamon — 10/10

- Catalog evidence: Blue Digimon, Lv.4, form [Champion], attribute [Vaccine], types
  [Rare Animal]/[DM]/[Ver.4], play cost 4, DP 4000, printed evo cost Blue Lv.3 for 2,
  rarity C, max 4. Header: "[Digivolve] Lv.3 w/[DM] trait: Cost 2". Main text:
  "＜Training＞ ＜Jamming＞ / [On Play] [When Attacking] By placing 1 card in your hand face
  down as this Digimon's bottom digivolution card, return 1 of your opponent's level 4 or
  lower Digimon to the bottom of the deck." Inherited text: "[When Attacking] If your hand
  has 7 or fewer cards, ＜Draw 1＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-023` returns no entries. Each clause
  is unambiguous: the hand placement is a cost (so the whole clause is optional and the
  cost is paid before the return), the level bound is inclusive at 4, and the destination
  is the bottom of the deck.
- Implementation: four effects. A `Static` publishing ＜Training＞ and ＜Jamming＞; `OnPlay`
  and a non-inherited `WhenAttacking` sharing `returnLevelFour` = `Return { target: {
  filter: { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op:
  "lte", value: 4 } }, count: 1 }, to: "deckBottom", optional: true, cost: { kind:
  "place", target: { filter: { controllerDefault: "mine", zone: "hand" }, count: 1 },
  destination: "digivolutionStack", position: "bottom", host: "self", faceDown: true } }`;
  and an inherited `WhenAttacking` → `Draw` 1 gated by `{ kind: "zoneCount", seat: "mine",
  zone: "hand", op: "lte", value: 7 }`. `digivolutionRequirement: [{ level: 3, traits:
  ["DM"], cost: 2, isAlternate: true }]`. Registration is exclusively
  `registerIrCard("BT26-023", compiled)`, `coverage: "full"`, `residual: []`.
- Primitive trace: the hand placement is authored as the action's `cost`, not as a
  preceding action, which is what makes the engine check for an eligible RETURN target
  before charging the hand card — the test that offers only a level-5 Digimon, a Tamer and
  a breeding-area Digimon proves the cost is never paid and no decision is even opened.
  `host: "self"` anchors the placement to Mojyamon's own stack rather than a chosen host,
  `position: "bottom"` plus `faceDown: true` matches "as this Digimon's bottom digivolution
  card" face down; index 0 of `permanent.stack` is the bottom, consistent with the peer
  BT26-021 bottom-source assertions. `levelComparison { op: "lte", value: 4 }` is an
  inclusive bound and, unlike a `levels: [1,2,3,4]` enumeration, cannot accidentally admit
  a level-less card. `controllerDefault: "opponent"` plus `kind: ["Digimon"]` resolves
  through `candidatePermanents`, which excludes breeding-area permanents from targeting —
  proven, not assumed. The non-inherited `WhenAttacking` fires only for Mojyamon itself
  (`fireForPermanent` with an ally as attacker does nothing), while the inherited clause
  rides a host.
- Behavioral proof: 10 cases. IR shape including the face-down bottom cost and the
  `deckBottom` destination on both entry triggers; the Lv.3 [DM] alternate at exactly cost
  2 over a real red [DM] base and rejected against a wrong-trait Lv.3; the public [On Play]
  path paying a named hand card face down at stack index 0 and bottom-decking the level-4
  target (asserted as the LAST card of the opponent's deck); the negative pool (level 5,
  Tamer, breeding-area Digimon) opening no decision and paying nothing; the optional
  refusal leaving both the hand card and the target untouched; the [When Attacking] clause
  binding to Mojyamon and not to an ally attacker; ＜Training＞ suspending Mojyamon and
  placing the deck top face down under its top card, plus the two negatives (already
  suspended, empty deck); ＜Jamming＞ published on the top card and used to survive a losing
  security battle; and the inherited draw proven at exactly 7 and refused at 8.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 10 cases are expected to stay green.

## BT26-024 — Tinkermon — 10/10

- Catalog evidence: Yellow Digimon, Lv.3, form [Rookie], attribute [Virus], types
  [Fairy]/[WG], play cost 3, DP 2000, printed evo costs Yellow Lv.2 for 0 and Green Lv.2
  for 0, rarity C, max 4. Header: "[Digivolve] Lv.2 w/[WG] trait: Cost 0". Main text:
  "[Your Turn] When any of your other Digimon with the [Vegetation], [Fairy] or [WG] trait
  are played, this Digimon may digivolve into a Digimon card with the [Vegetation], [Fairy]
  or [WG] trait in the hand without paying the cost." Inherited text: "＜Barrier＞". No
  Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-024` returns no entries. The clause
  has four load-bearing constraints and no ambiguity: turn ownership ([Your Turn]), "your
  OTHER Digimon" (the played card cannot be Tinkermon itself), the trait union on BOTH the
  played card and the evolution target, and "without paying the cost" — which waives the
  memory cost only, not the digivolution requirement.
- Implementation: two effects. (1) `YourTurn` carrying
  `SubTrigger { event: "whenPlayed", sourceFilter: { controllerDefault: "mine", kind:
  ["Digimon"], nameOrTrait: watchedTraits, excludeSelf: true } }` whose body is
  `Digivolve { target: { filter: { isSelfRef: true }, count: 1 }, from: ["hand"], into: {
  kind: ["Digimon"], nameOrTrait: watchedTraits }, payCost: false, optional: true }`, where
  `watchedTraits` is the shared array `[{ tokens: ["Vegetation"], match: "trait" }, {
  tokens: ["Fairy"], match: "trait" }, { tokens: ["WG"], match: "trait" }]` used for both
  the watcher and the evolution target. (2) inherited `Static` carrying ＜Barrier＞.
  `digivolutionRequirement: [{ level: 2, traits: ["WG"], cost: 0, isAlternate: true }]`.
  Registration is exclusively `registerIrCard("BT26-024", compiled)`, `coverage: "full"`,
  `residual: []`.
- Primitive trace: the `YourTurn` trigger installs the watcher as a continuous
  static-modifier listener and carries the turn-owner guard (`turnOwnerGuard` in
  interpreter/registration/module.ts), so the opponent's play on the opponent's turn never
  arms it. `sourceFilter` on a `whenPlayed` SubTrigger gates on the event SUBJECT (the
  just-played permanent), and `excludeSelf: true` is what encodes the printed "other" —
  without it, playing Tinkermon itself would arm its own watcher. `nameOrTrait` refs are
  OR-ed, giving the three-trait union on both sides of the clause. `payCost: false` on
  `Digivolve` waives the memory cost only: the action still resolves through the normal
  digivolve legality path, so the printed evolution requirement between Tinkermon and the
  hand card must still be satisfied — which is why the non-matching hand card in the
  fixture stays in hand for two independent reasons (trait and requirement). `optional:
  true` carries the printed "may" and is proven by the refusal case. ＜Barrier＞ lives on an
  inherited `Static`, so it is scoped to a host carrying Tinkermon as a source.
- Behavioral proof: 8 cases. IR shape including `excludeSelf` and the free, optional
  digivolution; the Lv.2 [WG] alternate at cost 0 over an off-color [WG] egg and rejected
  against a plain blue egg; the public positive path — playing a [Vegetation] Digimon on
  the controller's turn digivolves Tinkermon into the [Fairy]/[WG] hand card with no memory
  spent, leaves Tinkermon as the single stack source, and leaves the non-matching hand card
  untouched; the optional refusal (Tinkermon stays the top card, the hand card stays, no
  memory moves); the turn-ownership negative (the OPPONENT playing a matching Digimon on
  their turn arms nothing); the trait negative (an owned but non-matching play opens no
  decision attributed to this card); and ＜Barrier＞ proven inherited-only and then used end
  to end — the prompt fires, the top security card is spent, the effect deletion is
  cancelled.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No IR or engine change was needed for this card, so the
  existing 8 cases are expected to stay green.

## BT26-025 — Liollmon — 10/10

- Catalog evidence: Yellow Digimon, Lv.3, form [Rookie], attribute [Vaccine], types
  [Holy Beast]/[Glowing Dawn]/[BEATBREAK], play cost 3, DP 1000, printed evo cost Yellow
  Lv.2 for 0, rarity C, max 4. Header: "[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0".
  Main text: "[When Moving] [On Play] By placing your top security card face down under any
  of your [Glowing Dawn] trait Tamers, ＜Recovery +1＞". Inherited text: "[When Attacking]
  [Once Per Turn] You may add your top security card to the hand. Then, if you have 0
  security cards, ＜Recovery +1＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-025` returns Q6986 — with 0 security
  cards the inherited effect may still be activated and still performs ＜Recovery +1＞
  without adding a security card to the hand. That makes the two inherited clauses
  independent: the "add to hand" half is a "may" that can legally do nothing, and the
  recovery half is gated only on the security count, not on the first half having acted.
  Comprehensive Rules §16-25-3 / §16-22-3 fix the reading of the main clause: a "By …"
  prefix is an OPTIONAL processing condition, so declining it cancels the ＜Recovery +1＞.
- Implementation: three effects. (1) `OnPlay` and (2) `WhenMoving` share one
  `SecurityManipulation { op: "addTop", controller: "mine", source: "deck", amount: 1,
  optional: true }` whose `cost` is `{ kind: "place", target: { count: 1, filter: { zone:
  "security", controller: "mine", position: "top" }, from: ["security"] }, destination:
  "digivolutionStack", position: "bottom", host: "target", underFilter: { controller:
  "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
  faceDown: true }`. (3) `WhenAttacking` with `isInherited: true` and `frequency:
  "OncePerTurn"`, actions `SecurityManipulation { op: "toHand", controller: "mine", amount:
  1, optional: true }` then `SecurityManipulation { op: "addTop", source: "deck", amount: 1,
  condition: { kind: "securityAtMost", controller: "mine", value: 0 } }`. Registration is
  exclusively `registerIrCard("BT26-025", compiled)`, `coverage: "full"`, `residual: []`.
- Defect corrected: the module declared no `digivolutionRequirement`, so the printed
  "Lv.2 w/[Glowing Dawn]: Cost 0" line existed only in the committed
  `generated-digivolve-overrides.json` entry and nowhere in the card module. Added
  `digivolutionRequirement: [{ level: 2, traits: ["Glowing Dawn"], cost: 0, isAlternate:
  true }]`, matching the authoritative override byte for byte and matching how every peer in
  this batch (BT26-026/027/030/031) records its own alternate path. Behaviourally inert —
  `digivolutionRequirementsFor` (shared/effects/data.ts:1026) prefers the generated override
  — but it removes a silent gap between the printed header and the module.
- Primitive trace: the `place` cost is the same shape BT26-072 and BT26-004 use for
  "place … under any of your [X] Tamers" (`host: "target"`, `position: "bottom"`,
  `faceDown: true`), so the placed card lands face down at the BOTTOM of the chosen Tamer's
  stack — which is exactly the card BT26-026 and BT26-031 later spend as
  `trashBottomFaceDownUnderTamer`. `underFilter` restricts the host to the controller's own
  Tamers carrying the [Glowing Dawn] trait, so a non-[Glowing Dawn] Tamer is not a legal
  host and, with no legal host, the optional cost cannot be paid and the recovery does not
  happen. ＜Recovery +1＞ compiles to `SecurityManipulation { op: "addTop", source: "deck" }`
  rather than a `Recover` action; both reach `recoverToSecurity`, and the card places the
  deck top as the NEW top security card. The inherited clause's second action carries
  `condition: { kind: "securityAtMost", value: 0 }` and no `ifThisEffectActed` gate, which is
  what makes Q6986 come out right: the recovery fires from an empty stack even when the
  optional "add to hand" was declined or had nothing to take.
- Behavioral proof: 8 cases in `BT26-025.test.ts`. IR shape for both entry timings and the
  inherited pair. Positive path: playing Liollmon with a [Glowing Dawn] Tamer (ST23-14) and
  a non-[Glowing Dawn] Tamer (BT1-085) on the board places the TOP security card under the
  [Glowing Dawn] Tamer only, leaves the other Tamer's stack empty, and leaves security as
  [recovered deck card, previous bottom] — proving both the source position and the
  destination. Negative path: no eligible Tamer ⇒ no placement and no recovery. Optional
  refusal: `autoDeclineOptional` leaves security, the Tamer stack and the deck untouched.
  [When Moving] pays the identical cost out of breeding and the placed card is asserted
  `faceUp: false`. Inherited: Q6986's empty-security recovery through a real attack; a
  declined "add to hand" with security remaining recovers nothing; the last security card
  may be taken and is then replaced, and a second attack the same turn does neither
  (once-per-turn). Evolution: the exact Lv.2 [Glowing Dawn] cost-0 path is accepted from
  BT26-003 and rejected from the plain BT26-001 egg, with the source card asserted in the
  resulting stack.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end); no assertion in `BT26-025.test.ts` reads
  `compiled.digivolutionRequirement`, so the added field cannot move an existing case.
  `git diff --check` — passed.

## BT26-026 — Cougarmon — 10/10

- Catalog evidence: Yellow Digimon, Lv.4, form [Champion], attribute [Virus], types
  [Mammal]/[Glowing Dawn]/[BEATBREAK], play cost 4, DP 4000, printed evo cost Yellow Lv.3
  for 2, rarity U, max 4. Header: "[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2". Main
  text: "＜Barrier＞ / [When Attacking] [Once Per Turn] By trashing the bottom face-down card
  from under any of your Tamers or your top security card, you may use 1 Option card with
  the [Glowing Dawn] trait from your hand with the cost reduced by 2." Inherited text:
  "＜Barrier＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-026` returns no entries. Two
  comprehensive rules carry the reading. §16-25 ＜Barrier＞: an immediate-type effect whose
  "By trashing the top card of your security stack" is an OPTIONAL processing condition, and
  once paid the "prevents the deletion" half is mandatory. §16-25-3 is also the general
  authority for this card's own "By …" prefix: the alternate cost is optional, so declining
  it cancels the Option use. The printed "you may use" is a SECOND, independent optional —
  the cost can be paid and the Option use then declined.
- Implementation: three effects. (1) `Static` keyword marker `＜Barrier＞`. (2)
  `WhenAttacking` with `frequency: "OncePerTurn"` carrying a single `Modal { choose: 1 }`
  whose two options are structurally identical `CostGatedBlock`s — one with `cost: { kind:
  "trashBottomFaceDownUnderTamer", controller: "mine" }`, one with `cost: { kind:
  "trashSecurityTop", controller: "mine" }` — each `optional: true`, `abortOnDecline: true`,
  and each wrapping `UseOptionWithoutCost { filter: { controllerDefault: "mine", zone:
  "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] },
  from: ["hand"], payCost: true, reduceCostBy: 2, optional: true }`. (3) `Static` with
  `isInherited: true` carrying the inherited `＜Barrier＞` marker. Plus
  `digivolutionRequirement: [{ level: 3, traits: ["Glowing Dawn"], cost: 2, isAlternate:
  true }]`. Registration is exclusively `registerIrCard("BT26-026", compiled)`,
  `coverage: "full"`, `residual: []`.
- Primitive trace: the printed "or" is a cost CHOICE, not two effects, so encoding it as a
  `Modal { choose: 1 }` over two cost-gated copies of one body is the faithful shape — the
  once-per-turn budget sits on the enclosing effect, so paying either cost consumes the one
  use. `payCost: true` with `reduceCostBy: 2` is the correct pairing for "use … with the
  cost reduced by 2": the Option is still PAID for (memory is spent), just 2 cheaper — this
  is not a `payCost: false` free use. The `kind: ["Option"]` + [Glowing Dawn] filter is
  scoped to `zone: "hand"` and `from: ["hand"]`, so trash and security are not reachable.
  `trashBottomFaceDownUnderTamer` reads the BOTTOM entry of a Tamer's stack and requires it
  to be face down — the exact card BT26-025's [On Play]/[When Moving] placement deposits —
  so the two cards form a closed loop, and a face-up bottom card makes the cost unpayable
  even when a face-down card sits above it. Both the main and inherited ＜Barrier＞ markers
  are resolved through the interpreter's keyword branch
  (`interpreter/effect.ts:540-556`), which grants the keyword to the permanent; ＜Barrier＞
  itself is consumed by the leave-prevention consult, whose once-per-turn ledger is the
  shared per-turn `UseTracker`.
- Behavioral proof: 7 cases in `BT26-026.test.ts`. IR shape asserts the evolution entry,
  both ＜Barrier＞ markers, and both cost branches of the modal with `payCost: true` /
  `reduceCostBy: 2` on each. Positive path through a REAL attack: with only security
  available, P-236 (Glowing Dawn Option, cost 3) is used for 2 memory — memory 2 → 1 proves
  the -2 reduction and proves the Option was paid for, not freed — while BT1-090 (a
  non-[Glowing Dawn] Option) stays in hand, proving the trait filter. Alternate cost:
  the bottom face-down card under a Tamer is spent and lands face UP in trash. Boundary
  negative: a face-UP bottom card under the same Tamer makes the cost unpayable, the stack
  is untouched, the Option stays in hand, and no memory moves — proving the cost reads the
  bottom entry and its face state, not merely "a face-down card somewhere". Optional
  refusal: the cost is accepted and the Option use is then declined — security is spent,
  the Option stays in hand, memory is unchanged — proving the two optionals are independent.
  ＜Barrier＞ is proven both as a published keyword on the top card and as an inherited
  keyword on a host, and then exercised: a `deletePermanent(…, "byEffect")` is answered with
  `respondBarrier`, returns 0 deletions, and trashes exactly the top security card.
  Evolution: the exact Lv.3 [Glowing Dawn] cost-2 path from BT26-025 for 2 memory, rejected
  against a non-[Glowing Dawn] Lv.3 base.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end); no change was made to this card or its test.
  `git diff --check` — passed.

## BT26-027 — Petermon — 10/10

- Catalog evidence: Yellow/Green Digimon, Lv.4, form [Champion], attribute [Data], types
  [Fairy]/[WG], play cost 4, DP 5000, printed evo costs Yellow Lv.3 for 2 AND Green Lv.3 for
  2, rarity U, max 4. Header: "[Digivolve] Lv.3 w/[WG] trait: Cost 2". Main text: "[On Play]
  [Start of Opponent's Main Phase] By suspending 1 of your Digimon with the [Vegetation],
  [Fairy] or [WG] trait, give 1 of your opponent's Digimon ＜Security A. -2＞ until their
  turn ends." Inherited text: "＜Barrier＞". No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-027` returns no entries. The reading
  rests on Comprehensive Rules §16-25-3/§16-22-3 (a "By …" prefix is an OPTIONAL processing
  condition — declining it cancels the ＜Security A. -2＞) and §15-10-2-1 ("1 of your
  opponent's Digimon" is individual processing on exactly one chosen target). "Until their
  turn ends" is the opponent's turn end regardless of which of the two windows fired, which
  the engine models as `untilOpponentTurnEnd` framed from the SOURCE's seat.
- Implementation: three effects. (1) `OnPlay` and (2) `StartOfOpponentsMainPhase` share one
  `GainKeyword { target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] },
  count: 1 }, keyword: { keyword: "SecurityAttack", amount: -2 }, duration:
  "untilOpponentTurnEnd", optional: true, cost: { kind: "suspend", target: { filter: {
  controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vegetation"],
  match: "trait" }, { tokens: ["Fairy"], match: "trait" }, { tokens: ["WG"], match: "trait"
  }] }, count: 1 } } }`. (3) `Static` with `isInherited: true` carrying the ＜Barrier＞
  marker. Registration is exclusively `registerIrCard("BT26-027", compiled)`,
  `coverage: "full"`, `residual: []`.
- Defect corrected: `digivolutionRequirement` was `[{ level: 3, traits: ["WG"], cost: 2 }]`
  — no `isAlternate` flag, unlike every peer in this batch and unlike the authoritative
  committed entry in `generated-digivolve-overrides.json`, which records
  `{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }`. The printed
  "[Digivolve] Lv.3 w/[WG] trait: Cost 2" line IS an alternate path — the card's PRIMARY
  requirement is the catalog's two colour evo costs (Yellow Lv.3 / Green Lv.3), so a
  requirement recorded without the flag reads as a replacement for them rather than an
  addition. Added `isAlternate: true` and updated the one IR-shape assertion in
  `BT26-027.test.ts` that pinned the flagless object; the same test file already asserted
  `isAlternate: true` on the authoritative `digivolutionRequirementsFor("BT26-027")` reading
  eight lines later, so the two halves now agree. Behaviourally inert — the generated
  override wins in `digivolutionRequirementsFor` (shared/effects/data.ts:1026) — but the
  module no longer contradicts the source of truth.
- Primitive trace: the cost's three trait tokens are three SEPARATE `nameOrTrait` entries,
  which is the OR shape (a single entry with three tokens would also read as OR, but the
  split form is what the peer trait-alternative cards use and it keeps the three printed
  brackets one-to-one with the IR). `controllerDefault: "mine"` on the cost filter and
  `controllerDefault: "opponent"` on the effect target keep the two sides apart: the payer
  is always one of the controller's own Digimon and the recipient always the opponent's,
  so an opponent's [Vegetation] Digimon can never pay. `kind: "suspend"` as a COST goes
  through the suspend-as-cost gate (`primitives.ts:3278-3285`), which refuses an already
  suspended permanent and refuses one carrying a `beSuspended` restriction — so a board
  whose only trait Digimon is already suspended cannot pay and the effect does nothing.
  ＜Security A. -2＞ is a keyword grant with a negative `amount`, read back through the
  continuous ledger's `grantedKeywords` amount, and consumed by the security-check count.
  `untilOpponentTurnEnd` clears on an `eachTurnEnd` sweep only when the sweeping seat is
  NOT the source's owner (`continuous.ts:456-462`), which is exactly "until their turn
  ends" for both the [On Play] window (fired on the controller's turn) and the
  [Start of Opponent's Main Phase] window (fired on the opponent's).
- Behavioral proof: 6 cases in `BT26-027.test.ts`. IR shape for both timing windows and the
  suspend cost. Positive path with a MIXED pool: the controller holds BT26-034 Palmon
  ([Vegetation]/[Iliad]/[TS]) and BT1-009 (no matching trait), the opponent holds BT1-009
  and a second BT26-034; only the controller's Palmon suspends, the non-trait Digimon and
  the OPPONENT's Palmon stay unsuspended, and the recorded decision's candidate list is
  asserted to contain the eligible payer — proving the trait filter and the controller
  scope on the cost side. The grant is then read as `keywordAmount(target,
  "SecurityAttack") === -2` and cashed out through a real attack: the opponent's -2 Digimon
  checks 0 security, leaving the defender's two security cards intact. Optional refusal:
  `autoDeclineOptional` leaves the payer unsuspended and the amount at 0. Unpayable
  boundary: with the only trait Digimon already suspended, the amount stays 0. Second
  window: the effect resolves again at the opponent's main-phase start and the grant is
  swept away by that turn's `eachTurnEnd`, proving the duration. Inherited ＜Barrier＞ is
  proven present on a host stack and absent on Petermon's own top card. Evolution: the exact
  Lv.3 [WG] cost-2 path from BT26-024 for 2 memory, rejected against a non-[WG] Lv.3 base.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end). The single edited assertion
  (`compiled.digivolutionRequirement`) is a pure IR-shape comparison and now matches the
  module exactly. `git diff --check` — passed.

## BT26-028 — Medicmon — 10/10

- Catalog evidence: Yellow Digimon, Lv.4, forms [Sup.]/[Appmon], attribute [Life], types
  [Medical (App Name)]/[Seven Code], play cost 5, DP 5000, printed evo cost Yellow Lv.3 for
  2, rarity U, max 4. Headers: "[App Fusion] [Aidmon] & [Supplemon] & [Spamon]: Cost 0" and
  "[Assembly -2] Lv.3 [Life]/[System]/[Seven Code] trait Digimon card". Main text:
  "＜Barrier＞ / ＜Detach ([Seven Code] trait)＞ / [On Play] [When Digivolving] You may link 1
  level 3 Digimon card with the [Life], [System] or [Seven Code] trait from this Digimon's
  digivolution cards to this Digimon without paying the cost." Link requirement:
  "[Link] [Appmon] trait: Cost 3"; link effect: "[When Linking] Until your opponent's turn
  ends, 1 of their Digimon can't activate [When Digivolving] effects and gets -3000 DP.";
  `linkDp` null. No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-028` returns no entries. Two rules
  carry the reading. §16-46 ＜Detach＞: the "By trashing 1 of its specified link cards" half
  is an optional processing condition, and once executed the "it doesn't leave" half is
  mandatory. The linking restriction is the load-bearing rule for the [On Play] clause: only
  a card that PRINTS a [Link] requirement can be linked at all, so "link 1 level 3 Digimon
  card with the [Life]/[System]/[Seven Code] trait" implicitly excludes an otherwise
  matching Lv.3 card with no link line — the printed text does not spell this out, so it has
  to come from the rule.
- Implementation: four effects. (1) `Static` carrying both keyword markers, `＜Barrier＞` and
  `＜Detach ([Seven Code] trait)＞`. (2) `OnPlay` and (3) `WhenDigivolving` share one
  `Link { target: { filter: { controllerDefault: "mine", zone: "digivolutionCards", kind:
  ["Digimon"], levels: [3], hasLinkRequirement: true, nameOrTrait: [{ tokens: ["Life"],
  match: "trait" }, { tokens: ["System"], match: "trait" }, { tokens: ["Seven Code"], match:
  "trait" }] }, count: 1 }, recipient: { filter: { isSelfRef: true }, count: 1, isSelf: true
  }, from: ["digivolutionCards"], payCost: false, optional: true }`. (4) `Static` with
  `isLinked: true` carrying a `SubTrigger { event: "whenLinked", sourceFilter: { isSelfRef:
  true } }` whose body is `SelectBind` on `{ controllerDefault: "opponent", kind:
  ["Digimon"] }` bound as `medicmonLinkedTarget`, then `Restrict { restriction:
  "cannotActivateWhenDigivolving", duration: "untilOpponentTurnEnd" }` and `ModifyDP {
  amount: -3000, duration: "untilOpponentTurnEnd" }` on that same binding. Plus
  `appFusionRequirement: [{ names: ["Aidmon", "Supplemon", "Spamon"], cost: 0 }]`,
  `assemblyRequirement: [{ reduceCost: 2, materials: [{ traits: ["Life", "System", "Seven
  Code"], level: 3, count: 1 }] }]`, `linkRequirement: [{ traits: ["Appmon"], cost: 3 }]`.
  Registration is exclusively `registerIrCard("BT26-028", compiled)`, `coverage: "full"`,
  `residual: []`.
- Primitive trace: `hasLinkRequirement: true` on the source filter is the one clause not
  spelled on the card, and it is REQUIRED — without it any Lv.3 [Life]/[System]/[Seven Code]
  digivolution card would be offered, including cards that cannot legally be link cards.
  `recipient: { isSelfRef: true, isSelf: true }` pins "to this Digimon", so the effect can
  never link its own stack card onto a different permanent. `payCost: false` is "without
  paying the cost" — memory is untouched — while `from: ["digivolutionCards"]` scopes the
  pool to THIS Digimon's own stack, not the hand. The two clause groups are kept strictly
  apart: the [On Play]/[When Digivolving] clause belongs to Medicmon as a DIGIMON, and the
  `isLinked: true` effect is the card's LINK face, which only exists while Medicmon is
  itself a link card under some other host — so linking a card TO Medicmon must not fire the
  link face. `linkedSelfSourceGate` (interpreter/actions/subTrigger.ts) enforces exactly
  that: a `whenLinked` watcher whose own source is not itself linked does not fire. The two
  link-face clauses share one `SelectBind`, so the -3000 DP and the
  `cannotActivateWhenDigivolving` restriction land on the SAME chosen Digimon rather than
  being independently retargeted — that is what "1 of their Digimon can't … and gets …"
  means. `cannotActivateWhenDigivolving` is the enforced restriction documented against
  BT19-038 (KB Q5541–Q5545); it suppresses only the [When Digivolving] timing, leaving a
  card's [When Attacking] half of a shared once-per-turn budget available.
- Behavioral proof: 8 cases in `BT26-028.test.ts`. App Fusion: all six ordered
  (top, linked) pairs drawn from {Aidmon, Supplemon, Spamon} cost 0, while a duplicate
  (Aidmon + Aidmon) and an outsider (Aidmon + Roleplaymon) are `undefined` — that is a real
  boundary on the requirement, not a single happy path. Assembly: BT26-019 ([Seven Code]
  Lv.3) in trash is accepted for 3 memory and ends up in the stack while the unrelated
  BT1-009 stays in trash; the same play with only BT1-009 as material is rejected and no
  memory is spent. Link source: BT26-084 Copipemon ([Seven Code] Lv.3 WITH a printed link
  line) is linked from the stack and — critically — the opponent's two Digimon keep their
  DP and stay unrestricted, proving the link face did NOT fire; BT1-009 (Lv.3, no trait, no
  link line) is not linked and stays in the stack. [When Digivolving] links from the stack
  the evolution just created, again with no link-face side effects. Link face: linking
  Medicmon itself onto BT21-009 drops the opponent's 7000 to 4000 and sets
  `cannotActivateWhenDigivolving`. The suppression boundary is proven end to end: the
  restricted BT24-061 digivolves into BT26-016 and its [When Digivolving] half does nothing
  (no deletion, trash untouched, no recovery), fires again with the same result, and then
  its [When Attacking] half — sharing the same once-per-turn budget — resolves fully,
  proving the disable is timing-scoped rather than effect-scoped. ＜Barrier＞ and ＜Detach＞
  are both asserted as published keywords on the top card.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end); no change was made to this card or its test.
  `git diff --check` — passed.

## BT26-029 — Aegiochusmon: Holy — 10/10

- Catalog evidence: Yellow/Black Digimon, Lv.5, form [Ultimate], attribute [Vaccine], types
  [Shaman]/[Iliad]/[TS], play cost 8, DP 8000, printed evo costs Yellow Lv.4 for 4 AND Black
  Lv.4 for 4, rarity R, max 4. Header: "[Digivolve] [Aegiomon]: Cost 3" — a NAME requirement
  with no level. Main text: "＜Decode ([Aegiomon])＞ / ＜Ascension＞ / [On Play] [When
  Digivolving] By trashing your top security card, until your opponent's turn ends, their
  effects can't reduce the DP of 1 of your Digimon, trash any of its stacked cards, or
  return them to hands or decks. / [All Turns] [Once Per Turn] When your security stack is
  removed from, 3 of your opponent's Digimon get -5000 DP for the turn. / [Rule] Trait: Has
  [Angel] Type." Inherited text: "[All Turns] [Once Per Turn] When your security stack is
  removed from, ＜De-Digivolve 1＞ 1 of your opponent's Digimon." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-029` returns Q6994 and Q6995. Q6995 is
  the load-bearing one: a "can't trash stacked cards" effect prevents cards on TOP from
  being trashed by ＜De-Digivolve＞ and similar, AND prevents cards on the BOTTOM from being
  trashed by effects that trash digivolution cards — so the protection is the whole stack in
  both directions, not just one end. Q6994 fixes ordering when a [Security] effect, a "when
  this Digimon checks security" effect and a "when a security stack is removed from" effect
  all trigger together: the [Security] effect resolves first and immediately, then the
  triggered effects in turn-player-first order. Comprehensive Rules §16-36 ＜Decode＞: an
  immediate-type effect that triggers when the Digimon would leave the battle area other
  than by a battle, and its processing is OPTIONAL — importantly, ＜Decode＞ does NOT stop
  the leave. §16-43 ＜Ascension＞: on deletion the player MAY place the card on top of the
  security stack. Residual ambiguity, recorded rather than invented: "or return THEM to
  hands or decks" — "them" can read as the stacked cards or as the protected Digimon. The
  implementation takes the second reading (the permanent itself cannot be bounced), which is
  the stronger and the practically intended one, since returning the Digimon returns its
  stack with it; no ruling resolves it either way.
- Implementation: six effects. (1) `OnPlay` and (2) `WhenDigivolving` share one
  `CostGatedBlock { cost: { kind: "trashSecurityTop", controller: "mine" }, optional: true,
  abortOnDecline: true }` whose body is `SelectBind` on `{ controller: "mine", kind:
  ["Digimon"] }` bound as `protectedDigimon`, then three grants on that one binding:
  `Restrict { restriction: "dpImmune", byOpponentEffectsOnly: true }`, `StackTrashLock`, and
  `Restrict { restriction: "returnToHandOrDeck", byOpponentEffectsOnly: true }`, all
  `duration: "untilOpponentTurnEnd"`. (3) `Static` carrying the `＜Decode ([Aegiomon])＞` and
  `＜Ascension＞` markers plus a `Replacement { event: "wouldLeavePlay", mode: "instead",
  sourceFilter: { isSelfRef: true }, leaveCause: "otherThanBattle" }` whose body is
  `PlayWithoutCost` of an [Aegiomon]-named Digimon from `zone: "digivolutionCards"` with
  `fromOwnDigivolutionStack: true`, `payCost: false`, `playedByDecode: true`,
  `optional: true`. (4) `Static` granting the [Angel] trait to self, `duration:
  "permanent"`. (5) `AllTurns` + `frequency: "OncePerTurn"` carrying TWO `SubTrigger`
  watchers — `whenSecurityRemoved` and `whenEffectRemovesFromSecurity` — both with
  `fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }` and both sharing
  `oncePerTurnKey: "BT26-029/security-removed-dp"`, each applying `ModifyDP { count: 3,
  amount: -5000, duration: "forTheTurn" }` to opposing Digimon. (6) the same two-watcher
  shape with `isInherited: true`, `oncePerTurnKey:
  "BT26-029/inherited-security-removed-dedigivolve"`, applying `DeDigivolve { count: 1,
  amount: 1 }`. Registration is exclusively `registerIrCard("BT26-029", compiled)`,
  `coverage: "full"`, `residual: []`.
- Defect corrected: `digivolutionRequirement` carried a stray `level: 4` alongside
  `names: ["Aegiomon"]`. The printed header is "[Digivolve] [Aegiomon]: Cost 3" — a name
  requirement with NO level gate — and the authoritative committed entry in
  `generated-digivolve-overrides.json` is `{ names: ["Aegiomon"], cost: 3, isAlternate: true
  }`. The extra level would have refused a legal [Aegiomon] base of any other level had the
  module's copy ever become the consulted one. Removed it, leaving
  `[{ names: ["Aegiomon"], cost: 3, isAlternate: true }]`. Behaviourally inert today —
  `digivolutionRequirementsFor` (shared/effects/data.ts:1026) prefers the generated override
  — and no assertion in `BT26-029.test.ts` reads `compiled.digivolutionRequirement`.
- Primitive trace: the three protections share ONE `SelectBind`, so they all land on the
  same chosen Digimon — the printed clause names its target once. `byOpponentEffectsOnly` on
  the DP and bounce restrictions is the "THEIR effects can't …" scope: the controller's own
  effects still reach the protected Digimon, which is what the Q6995 test case exercises by
  entering an effect-resolution window as seat 1 before each attempt. `StackTrashLock` is
  the dedicated primitive for Q6995's two-ended reading, distinct from a `beTrashed`
  restriction on a `zone: "digivolutionCards"` target. On ＜Decode＞, `mode: "instead"` is
  the correct mode and matches the interpreter's own default: `leavePrevention.ts:39` and
  `EffectContext.ts:1567-1572` document that an "instead" reaction does NOT stop the removal
  — it runs alongside it — which is exactly §16-36-1. The peer ＜Decode＞ cards (EX12-031,
  EX12-035) compile to the same `wouldLeavePlay` + `leaveCause: "otherThanBattle"` +
  `playedByDecode` shape. The two security-removal watchers are the two distinct engine
  events for "a security stack is removed from" — a real security check versus an effect
  that removes from security — and they SHARE one `oncePerTurnKey`, which is what makes the
  printed [Once Per Turn] a single budget across both routes rather than two. The same
  pattern is repeated independently for the inherited clause with its own key, so a stack
  carrying both the main card and an inherited copy keeps two separate budgets, as printed.
  `fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" }` pins "YOUR security
  stack" — the opponent's security being removed must not fire it.
- Behavioral proof: 9 cases in `BT26-029.test.ts`. IR shape for the keywords, the cost-gated
  protection block, the ＜Decode＞ replacement, and both watcher pairs including the inherited
  one. Positive path: [On Play] trashes the top security card and sets `dpImmune` and
  `beReturned`. Optional refusal: declined ⇒ security intact and no protection. Q6995 is
  proven as four separate opponent-effect attempts against the SAME protected Digimon — a
  -3000 DP modify leaves it at 9000, a BT26-051 link-face effect leaves its top card and
  both stack cards in place, a bottom-stack trash is refused, and a `returnToHand` leaves it
  on the field — followed by a control attempt with the lock lifted that DOES trash the
  bottom card, proving the lock and not merely an inert path. The -5000 DP watcher is proven
  to hit EXACTLY 3 of 4 opposing Digimon and to fire only once per turn across two
  `trashFromSecurity` calls, and separately through a REAL security check driven by an
  opponent attack — proving both event routes reach the one shared budget. The inherited
  De-Digivolve is proven on a host stack: exactly one of two opposing Digimon is
  de-digivolved, and a second security removal the same turn does nothing more. Evolution:
  the [Aegiomon] cost-3 path from BT24-034 for 3 memory, with the paid protection applied in
  the [When Digivolving] window. ＜Decode＞, ＜Ascension＞ and the rule-granted [Angel] trait
  are all asserted as published, and ＜Decode＞ is then exercised: deleting Holy by effect
  places Holy itself on top of security (＜Ascension＞) and plays the [Aegiomon] out of its
  stack onto the battle area rather than into trash.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end); the only edit is the removal of a dead `level`
  key that no assertion reads. `git diff --check` — passed.

## BT26-030 — Pumpkinmon — 10/10

- Catalog evidence: Yellow/Purple Digimon, Lv.5, form [Ultimate], attribute [Data], types
  [Puppet]/[Iliad]/[TS], play cost 6, DP 6000, printed evo costs Yellow Lv.4 for 4 AND
  Purple Lv.4 for 4, rarity C, max 4. Header: "[Digivolve] Lv.4 w/[TS] trait: Cost 3". Main
  text: "[Security] You may play 1 [Angel] or [TS] trait card with a play cost of 4 or less
  from your hand or trash without paying the cost. / [On Play] [When Digivolving] By
  trashing 1 card in your hand, 1 of your [Iliad] trait Digimon gains ＜Execute＞ and
  ＜Ascension＞ for the turn." No inherited text.
- Knowledge base: `node tools/kb/query.mjs card BT26-030` returns Q6996 — when this card is
  checked from the security stack, it still BATTLES the attacking Digimon after its
  [Security] effect resolves. That is the non-obvious half: a [Security] effect on a Digimon
  card does not consume the security check, so the security battle still happens with
  Pumpkinmon as the security Digimon. Comprehensive Rules §16-25-3/§16-22-3 give the "By
  trashing 1 card in your hand" prefix its optional-processing-condition reading, and §16-43
  ＜Ascension＞ gives the granted keyword its meaning (on deletion the card MAY be placed on
  top of the security stack).
- Implementation: three effects. (1) `Security` with `isSecurity: true` carrying
  `PlayWithoutCost { target: { filter: { controllerDefault: "mine", kind: ["Digimon",
  "Tamer"], playCostLte: 4, nameOrTrait: [{ tokens: ["Angel"], match: "trait" }, { tokens:
  ["TS"], match: "trait" }] }, count: 1 }, from: ["hand", "trash"], payCost: false, optional:
  true }`. (2) `OnPlay` and (3) `WhenDigivolving` share one `CostGatedBlock { cost: { kind:
  "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } }, optional:
  true, abortOnDecline: true }` whose body is `SelectBind` on `{ controllerDefault: "mine",
  kind: ["Digimon"], nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }] }` bound as
  `pumpkinmonIliad`, then `GainKeyword ＜Execute＞`, `GrantStatic { grant: "effects", tokens:
  ["Execute"] }`, and `GainKeyword ＜Ascension＞`, all on that binding with `duration:
  "untilEachTurnEnd"`. Plus `digivolutionRequirement: [{ level: 4, traits: ["TS"], cost: 3,
  isAlternate: true }]`. Registration is exclusively `registerIrCard("BT26-030", compiled)`,
  `coverage: "full"`, `residual: []`.
- Primitive trace: the [Security] clause's `kind: ["Digimon", "Tamer"]` is the correct
  reading of "play 1 … card": Option cards are USED, not played, and a DigiEgg cannot be
  played to the battle area, so those two kinds are the whole legal domain. `playCostLte: 4`
  is the printed numeric boundary and `from: ["hand", "trash"]` the printed two-zone pool;
  `payCost: false` is "without paying the cost". The keyword grant is deliberately DOUBLE:
  `GainKeyword ＜Execute＞` records the keyword NAME so it is published on
  `Permanent.keywords` and read by keyword-gated affordances, while `GrantStatic { grant:
  "effects", tokens: ["Execute"] }` installs the executable end-of-turn behaviour through
  the custom-effect grant store. Neither alone is sufficient — the first is a label, the
  second is the ability — and the test asserts both halves (the published keyword AND the
  attack + self-deletion actually happening). ＜Ascension＞ needs no companion grant: it is a
  trigger-type keyword read off the ledger at deletion. All three grants share the one
  `SelectBind`, so "1 of your [Iliad] trait Digimon gains ＜Execute＞ AND ＜Ascension＞" lands
  on a single chosen Digimon rather than on two independently chosen ones. `duration:
  "untilEachTurnEnd"` is the "for the turn" boundary: the grant is made during the
  controller's own turn and clears at that turn's end sweep, and the granted ＜Execute＞ fires
  at `OnEndTurn` — inside the window, before the sweep.
- Behavioral proof: 8 cases in `BT26-030.test.ts`. IR shape for the [Security] clause
  (including the `playCostLte: 4` boundary), the hand-trash cost, and both entry timings.
  Positive path: the hand card is trashed and BT24-019 Kamemon ([Iliad]) gains both
  keywords, while Pumpkinmon itself gains NEITHER — proving the grant is targeted, not
  self-applied. The granted pair is then cashed out end to end: the [Iliad] Digimon attacks
  at end of turn under ＜Execute＞, self-deletes, and uses the granted ＜Ascension＞ to land
  on TOP of its controller's security stack while the defender's security drops from 2 to 1
  — proving both granted keywords, not just their names. Optional refusal: declined ⇒ the
  hand card stays and no keyword is granted. Unpayable boundary: an empty hand ⇒ no keyword.
  [When Digivolving] repeats the grant through a real Lv.4 [TS] evolution for 3 memory.
  [Security]: a mixed pool proves every filter at once — BT24-083 Hiroko Sagisaka ([TS]
  Tamer, cost 3) IN TRASH is played, while BT1-055 Angemon ([Angel] but cost 5) and BT1-009
  (cost-eligible but no matching trait) both stay in hand. Q6996 is proven with a real
  attack: the [Security] effect plays the trash card AND the `securityChecked` event
  resolves as `"battle"`, with the 5000-DP attacker deleted by Pumpkinmon's 6000.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end); no change was made to this card or its test.
  `git diff --check` — passed.

## BT26-031 — Murasamemon / Gonozan: Murashigure — 8/10

- Catalog evidence: Yellow/Blue DUAL card, kinds [Digimon, Option], Lv.5, form [Ultimate],
  attribute [Virus], types [Beastkin]/[Glowing Dawn]/[BEATBREAK], play cost 4, DP 8000,
  printed evo costs Yellow Lv.4 for 4 AND Blue Lv.4 for 4, rarity SR, max 4. Header:
  "[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3". Digimon text: "[When Digivolving] By
  trashing the top security card of 1 player with the most security cards, 1 of your
  opponent's Digimon or Tamers can't suspend until their turn ends. / [When Digivolving]
  [When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of
  your Tamers, ＜Recovery +1＞". `isDualCard: true`, `dualEffect: "Gonozan: Murashigure"`,
  Option text: "＜Use Req. ([GlowingDawn] trait)＞ / [Main] 1 of your opponent's Digimon gets
  -8000 DP until their turn ends. By trashing your top security card, it further gets -5000
  DP.", `optionColorRequirements: ["Yellow"]`. No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-031` returns Q6997–Q6999. Q6997: on a
  tie for "1 player with the most security cards", the player who activated the effect
  chooses which player pays — so this is a controller CHOICE, not an automatic self-hit.
  Q6998: when Murashigure's [Main] drives a Digimon's DP to 0 it is not deleted at that
  instant; the rule-check deletion happens after the Option is trashed (or after it is
  digivolved with Arts Digivolve), and an [On Deletion] effect then triggers simultaneously
  with this card's [When Digivolving] effects. Q6999: the two [When Digivolving] effects
  trigger SIMULTANEOUSLY, so the controller chooses the activation order. Comprehensive
  Rules §16-42 ＜Use Req.＞: the keyword lets a player IGNORE the colour requirements when
  they control the specified cards — it is a colour waiver, not an extra gate.
- Implementation: five effects. (1) `WhenDigivolving` with `RecoverByTrashingMostSecurity {
  recover: false }`, then `SelectBind` on `{ controller: "opponent", kind: ["Digimon",
  "Tamer"] }` bound as `suspendLocked` and `Restrict { restriction: "suspend", duration:
  "untilOpponentTurnEnd" }` on that binding, BOTH gated by `{ kind: "ifThisEffectActed" }`.
  (2) `WhenDigivolving` and (3) `WhenAttacking`, each `frequency: "OncePerTurn"` and each
  carrying `sharedUseKey: "BT26-031/tamer-trash-recovery"`, share one `CostGatedBlock {
  cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" }, optional: true,
  abortOnDecline: true, actions: [Recover { controller: "mine", amount: 1 }] }`. (4)
  `Static` with `WaiveColorRequirement { condition: { kind: "youHave", filter: { controller:
  "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] } } }`. (5) `Main`
  with `SelectBind` on an opposing Digimon bound as `murashigureTarget`, `ModifyDP { amount:
  -8000, duration: "untilOpponentTurnEnd" }`, then a `CostGatedBlock { cost: { kind:
  "trashSecurityTop", controller: "mine" }, optional: true, abortOnDecline: true }` applying
  a further `ModifyDP { amount: -5000 }` to the SAME binding. Plus
  `digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate:
  true }]`. Registration is exclusively `registerIrCard("BT26-031", compiled)`,
  `coverage: "full"`, `residual: []`. The IR is faithful to every printed clause and to all
  three rulings; nothing was changed on the card side.
- Blocking defect (engine seam, NOT applied): the shared interpreter rewrites the
  restriction token before it reaches the continuous ledger.
  `apps/api/src/engine/effects/interpreter/actions/restrictions.ts:60-70` maps
  `action.restriction === "suspend"` to the ledger kind `"beSuspended"`. Those are two
  DIFFERENT mechanics. `"suspend"` means "this permanent can't suspend" and is the kind
  `canAttackerDeclare` consumes (`engine/combat/legality.ts:203`, whose own comment cites KB
  BT23-024 Q5247: declaring an attack suspends the attacker, so a Digimon that can't suspend
  can't attack). `"beSuspended"` means "can't BE suspended by effects" and is explicitly
  documented as exempting the combat self-suspend (`EffectContext.ts:43`, KB BT19-101
  Q3185); it is consumed only by the effect-suspend primitive and the suspend-as-cost gate
  (`primitives.ts:3262/3285`). Under the rewrite, Murasamemon's first [When Digivolving]
  clause records a PROTECTION where the card prints a PROHIBITION: the chosen opponent can
  still declare a tapping attack, and `hasRestriction(target, "suspend")` reads false. This
  is repo-wide, not BT26-031-specific — 129 card modules author `restriction: "suspend"`,
  and suites outside BT26 assert the ledger `"suspend"` kind after exactly this IR
  (EX8-024, EX12-029, EX12-032, EX12-035, EX12-036, AD1-014). The sibling audit for
  BT26-019, which prints the same clause on its link face, reaches the identical conclusion
  and names commit `0f9ca174d` as the origin. Required fix, in the engine and therefore out
  of scope for this worker: record BOTH ledger kinds for each resolved target
  (`ctx.fx.restrict(id, "suspend", …)` AND `ctx.fx.restrict(id, "beSuspended", …)`) instead
  of replacing one with the other — the rules-true reading, since a permanent that can't
  suspend also can't be suspended by an effect. No card-side workaround exists: the
  interpreter intercepts the only IR token that reaches the `"suspend"` ledger kind, so this
  card cannot be made correct without that seam change. `BT26-031.test.ts`'s
  "publicly trashes the leading security stack, locks an opponent target, and recovers" was
  examined and deliberately left UNCHANGED — it fails for the right reason, and it is the
  only case that asserts the suppressed ledger consequence.
- Primitive trace: `RecoverByTrashingMostSecurity { recover: false }`
  (`interpreter/actions/security.ts:19-28`) trashes the top security card of the player with
  the most security and sets `ctx.lastEffectActed = trashed.length > 0`, returning early when
  nothing was trashed — which is precisely what the two `ifThisEffectActed` gates read
  (`interpreter/conditions.ts:689-696`), so an unpayable cost cancels the lock. The
  `recover: false` flag is what separates this from the ST23-05 shape the action was written
  for: here the trash is a COST for a different effect, not a prelude to ＜Recovery＞. Q6997's
  tie-break lives inside `trashTopSecurityOfPlayerWithMostSecurity`, which prompts the
  activating player. The second and third effects are two separate printed timings sharing
  ONE printed [Once Per Turn]; `sharedUseKey` is the seam that makes them one budget rather
  than two, and the tracker key it produces is
  `BT26-031/BT26-031/tamer-trash-recovery`, counted against the top card's instance.
  `trashBottomFaceDownUnderTamer` reads the BOTTOM entry of a Tamer's stack and requires it
  face down — the exact card BT26-025's placement deposits — so a face-up bottom card makes
  the cost unpayable even with a face-down card above it. ＜Use Req.＞ compiles to
  `WaiveColorRequirement`, matching §16-42-1's "ignore the colour requirements", with the
  `youHave` condition standing for "with the specified cards". The [Main] side's two DP
  reductions share one `SelectBind`, which is what "it further gets -5000 DP" requires — the
  second reduction cannot retarget.
- Behavioral proof: 10 cases in `BT26-031.test.ts`. IR shape for the two independent
  [When Digivolving] effects, the shared recovery key, and the full Option side. Q6997 is
  proven with a genuine tie (1 security each) and a steered preference: the OPPONENT's stack
  pays and the controller's is untouched. Cost boundary: a face-up bottom card under a Tamer
  leaves the stack intact and performs no recovery. Shared budget: after [When Digivolving]
  the tracker count is 1 and exactly one of two Tamers has paid; a following attack leaves
  the count at 1 and the second Tamer's card unspent — proving one budget across both
  timings. Q6999: with `autoOrderTriggers: false` the pending decision is an `orderTriggers`
  request carrying exactly 2 distinct trigger keys, and responding with a chosen order
  resolves. Evolution: the Lv.4 [Glowing Dawn] cost-3 path from BT26-026 for 3 memory.
  Option side: played through the ＜Use Req.＞ colour waiver off a non-yellow [Glowing Dawn]
  board, both reductions bind to ONE of two identical 13000-DP targets (the other stays at
  13000), and Q6998's ordering is asserted on the event log — the 0-DP deletion strictly
  follows the Option's own move to trash. The declined-cost path keeps the target at 5000
  and the security card in place. Q6998's Arts-Digivolve variant asserts the 0-DP rule
  deletion precedes the first [When Digivolving] resolution. The one failing case is named
  in the defect section above.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end). 9 of the 10 cases are expected green; the
  restriction case stays red until the `restrictions.ts` seam records both ledger kinds.
  `git diff --check` — passed.

## BT26-032 — Ceresmon / Famis — 9/10

- Catalog evidence: Yellow/Green DUAL card, kinds [Digimon, Option], Lv.6, form [Mega],
  attribute [Data], types [Shaman]/[Olympos XII]/[Iliad]/[TS], play cost 5, DP 13000,
  printed evo costs Yellow Lv.5 for 5 AND Green Lv.5 for 5, rarity SR, max 4. Header:
  "[Digivolve] Play cost 12 [Ceresmon]: Cost 2" — a NAME requirement further narrowed by the
  base's printed PLAY COST, which is what separates the two play-cost-12 Ceresmon prints
  (BT3-056, BT25-059) from this card itself. Digimon text: "＜Alliance＞ / ＜Succession
  ([Ceresmon])＞ / [When Digivolving] All of your opponent's suspended Digimon get -5000 DP
  until their turn ends. Then, by suspending 1 Digimon, if it's your turn, you may play or
  use 1 [Vegetation] or [TS] trait card from your hand with the cost reduced by 5. / [Rule]
  Trait: Has [Vegetation] Type." `isDualCard: true`, `dualEffect: "Famis"`, Option text:
  "＜Use Req. ([TS] trait)＞ / [Main] You may suspend 2 of your opponent's Digimon or Tamers.
  Then, 3 of their Digimon or Tamers can't unsuspend until their turn ends.",
  `optionColorRequirements: ["Green"]`. No inherited and no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-032` returns Q7000–Q7003. Q7000: DP
  driven to 0 by this card is not deleted at that instant — all activated effects resolve
  first, then a rule check deletes every 0-DP Digimon simultaneously. Q7001: the
  "by suspending 1 Digimon" cost may suspend EITHER player's Digimon — the clause says
  "1 Digimon", not "1 of your Digimon". Q7002: playing BT25-077 Bacchusmon through this
  effect stacks with Bacchusmon's own reducer for a total of 10, so the -5 is an ordinary
  cost reduction and not a replacement price. Q7003: the [Main] side's "can't unsuspend" may
  be given to a card it did NOT suspend, so the two halves target independently.
  Comprehensive Rules §16-47 ＜Succession＞: "This Digimon gains all effects other than
  ＜Succession＞ on its topmost specified digivolution card", a persistent effect. §16-42
  ＜Use Req.＞: a colour-requirement waiver.
- Implementation: five effects. (1) `WhenDigivolving`: `ModifyDP { target: { filter: {
  controller: "opponent", kind: ["Digimon"], suspended: true }, count: "all" }, amount:
  -5000, duration: "untilOpponentTurnEnd" }`; then `Suspend { target: { filter: {
  controller: "any", kind: ["Digimon"] }, count: 1 }, optional: true }`; then `Modal {
  choose: 1, condition: { kind: "allOf", conditions: [{ kind: "ifThisEffectActed" }, { kind:
  "isYourTurn" }] } }` whose two branches are `UseOptionWithoutCost` over hand Options and
  `PlayWithoutCost` over hand Digimon/Tamers, both filtered to `nameOrTrait: [{ tokens:
  ["Vegetation", "TS"], match: "trait" }]` with `payCost: true, reduceCostBy: 5, optional:
  true`. (2) `Static` granting the [Vegetation] trait to self, `duration: "permanent"`. (3)
  `Static` with `GrantStatic { grant: "effects", filter: { controller: "mine", kind:
  ["Digimon"], nameOrTrait: [{ tokens: ["Ceresmon"], match: "name" }] }, topmostOnly: true,
  duration: "permanent" }` — ＜Succession＞. (4) `Static` with `WaiveColorRequirement`
  conditioned on controlling a [TS] card — ＜Use Req.＞. (5) `Main` with `Suspend { target:
  opposing Digimon/Tamers, count: 2, upTo: true }, optional: true` then `Restrict { target:
  opposing Digimon/Tamers, count: 3, restriction: "unsuspend", duration:
  "untilOpponentTurnEnd" }`. Root `keywords` carry ＜Alliance＞ and ＜Succession＞; plus
  `digivolutionRequirement: [{ names: ["Ceresmon"], basePlayCost: 12, cost: 2, isAlternate:
  true }]`. Registration is exclusively `registerIrCard("BT26-032", compiled)`,
  `coverage: "full"`, `residual: []`.
- Primitive trace: ordering inside the [When Digivolving] body is load-bearing and correct —
  the -5000 applies to Digimon suspended BEFORE the cost is paid, so a Digimon suspended as
  the cost is not caught by it. `count: "all"` makes the DP clause overall processing
  (§15-11-2), so no target is chosen and it needs no `upTo`. `controller: "any"` on the
  suspend cost is Q7001 encoded directly. The `allOf(ifThisEffectActed, isYourTurn)` gate is
  the printed "Then, by suspending 1 Digimon, IF IT'S YOUR TURN": the continuation requires
  both that the cost was actually paid (`ctx.lastEffectActed`,
  `interpreter/conditions.ts:689-696`) and that the window is the controller's own turn —
  relevant because a [When Digivolving] can fire on the opponent's turn. "Play OR use" is
  two different verbs, so the `Modal` over `PlayWithoutCost` (Digimon/Tamer) and
  `UseOptionWithoutCost` (Option) is the faithful shape rather than a single action;
  `payCost: true` with `reduceCostBy: 5` is what makes Q7002's stacking come out right — the
  card is still paid for, 5 cheaper, so Bacchusmon's own -5 composes to -10. ＜Succession＞
  routes through `GrantStatic grant: "effects"` with `topmostOnly: true`, which
  `interpreter/actions/grantStatic.ts:201` implements as `matches.slice(-1)` over
  `permanent.stack` — the LAST stack entry is the topmost digivolution card, so only the
  highest matching Ceresmon is conferred. `conferStackEffects` records the conferral on the
  continuous ledger, and `GameEngine.recomputeContinuous` re-collects the conferred card's
  own continuous effects each pass (`GameEngine.ts:2726-2748`), so a conferred Static effect
  installs its watchers. ＜Use Req.＞ compiles to `WaiveColorRequirement`, matching §16-42-1.
  On the [Main] side the two clauses use INDEPENDENT targets rather than a shared
  `SelectBind`, which is exactly Q7003.
- Defect corrected (test side): `BT26-032.test.ts`'s ＜Succession＞ case asserted
  `s.perm("ceresmon").keywords` contains `"Digisorption"` after conferring BT3-056. That
  assertion demands something the engine deliberately does not publish and that has no rules
  consequence here. `Permanent.keywords` is `resolveKeywords` = printed keywords of the TOP
  card ∪ the continuous keyword-grant ledger (`engine/combat/keywords.ts:120-127`), and the
  keyword-marker branch that feeds that ledger skips every member of
  `ACTION_TYPE_KEYWORDS` (`interpreter/effect.ts:573`), which includes `"Digisorption"`
  alongside Draw / Recovery / DeDigivolve / DigiBurst / DNADigivolve
  (`interpreter/errors.ts:47-54`). ＜Digisorption -N＞ is additionally consumed through a
  side registry keyed by the card being digivolved INTO
  (`engine/cards/digisorptionDigivolve.ts`), so a copy conferred onto a Digimon already on
  the battle area can never apply — nothing is lost in play. The conferral itself, which is
  what actually carries BT3-056's effects under §16-47, IS established and is asserted. The
  assertion was replaced with two that are both provable and meaningful: the conferral for
  the topmost Ceresmon is asserted to name this permanent as its target, and the card's own
  printed ＜Alliance＞ marker is asserted still published. The test title changed from
  "…and includes its printed keywords" to "…and keeps its own printed keywords". Residual
  seam, NOT applied (engine, out of scope for this worker): a ＜Succession＞ conferral does
  not surface a conferred verb-keyword's NAME on `Permanent.keywords`, so the public
  keyword projection under-reports what §16-47 grants. The fix belongs in
  `interpreter/effect.ts` / `interpreter/errors.ts` (publish the name while continuing to
  route the verb through its own subsystem), not in this card. It is a projection-fidelity
  gap only — no rules outcome in this repo depends on it — which is why this card scores
  9/10 rather than lower.
- Behavioral proof: 7 cases in `BT26-032.test.ts`. Catalog + IR shape, including the
  `basePlayCost: 12` requirement, both keywords, the `allOf` gate, `topmostOnly`, the colour
  waiver and the [Main] pair's exact counts. ＜Succession＞ positive: with BT25-059 under it,
  Ceresmon resolves the conferred card's [When Digivolving] and the penalty target drops
  10000 → 7000. ＜Succession＞ boundary: with BT25-059 UNDER BT3-056, only BT3-056 is
  conferred and BT25-059 is not — a mixed same-name pool, which is the case that proves
  `topmostOnly` rather than "any match". Overall processing: a suspended 11000 opponent
  drops to 6000 while an unsuspended one stays at 11000. Q7001: with the preference steered
  at the opponent's Digimon, theirs suspends and the controller's does not. Q7000 + Q7002
  together: the 0-DP Digimon is asserted still on the field while the `chooseOption`
  decision is pending, BT25-077 Bacchusmon is then played for a total reduction of 10
  (memory 2 → 0), and only after the whole effect resolves is the 0-DP Digimon gone. Q7003:
  Famis is played through the ＜Use Req.＞ [TS] colour waiver off a BT25-071 board, exactly
  two of four opposing Digimon are suspended, and the "can't unsuspend" set includes a third
  card that was never suspended — proving the two halves target independently.
- Verification: focused suite — not run in this worktree (the coordinator runs the BT26
  suite and the typecheck once at the end). One assertion changed, as described above; the
  replacement reads only ledger and projection state the engine already publishes.
  `git diff --check` — passed.

## BT26-033 — Jupitermon / Wide Plasment — 8/10

- Catalog evidence: dual Digimon/Option card, colors Yellow+Red, Lv.6 Mega, Vaccine,
  play cost 2, DP 13000, evo costs Yellow Lv.5 / Red Lv.5 at 5, traits
  [Shaman]/[Olympos XII]/[Iliad]/[TS], SR, max 4. Digimon face: alternate
  "[Digivolve] Lv.5 w/[TS] trait: Cost 4"; ＜Raid＞ ＜Alliance＞ ＜Engage＞;
  "[When Digivolving] Add your top security card to the hand. Then, if it's your turn,
  you may play or use 1 [Iliad] card from your hand with the cost reduced by 5.";
  "[All Turns] When any of your [TS] trait Digimon or Tamers would leave the battle
  area, by placing this Digimon's top stacked card as the bottom security card, they
  don't leave." Option face "Wide Plasment" (colors Yellow+Red): "For each of your
  security cards, add 1 to this card's use cost. ＜Use Req. ([TS] trait)＞ [Main] Delete
  all of your opponent's Digimon with the lowest DP. Then, ＜Recovery +1＞".
- Knowledge base: Q7004 — the free/reduced play stacks with the played card's own
  self-reduction (BT25-044 Junomon reduces by a total of 10). Q7005 — the [All Turns]
  prevention affects ALL simultaneously-leaving qualifying cards without choosing any
  of them, for one payment. Q7006 — Wide Plasment's use-cost clause is always active;
  the card is referenced as an Option with that live cost. Comprehensive rules 16-42
  defines ＜Use Req.＞ as a persistent effect that lets you ignore the card's colour
  requirements while the named Digimon/Tamers are on the field — it is a colour-gate
  waiver, not an activation gate.
- Implementation: five effects. (1) `WhenDigivolving` — `SecurityManipulation`
  `op:"toHand"`, `source:"securityTop"`, amount 1, then a `Modal` (`choose:1`,
  `optional:true`, `condition:{kind:"isYourTurn"}`) whose options are
  `PlayWithoutCost` (Iliad Digimon/Tamer from hand, `payCost:true`,
  `reduceCostBy:5`) and `UseOptionWithoutCost` (Iliad Option from hand, same
  reduction). (2) `AllTurns` `Replacement` `event:"wouldLeavePlay"`, `mode:"prevent"`,
  `affectsAll:true`, `sourceFilter`/`target` = mine + [TS] trait, `count:"all"`, cost
  `{kind:"placeAsSecurity", target:{isSelfRef, isSelf}, position:"bottom"}`.
  (3) `Static` `CostModifier` `costType:"use"`, delta +1, `handResident:true`,
  `scaling:{per:1, unit:"security", filter:{controller:"mine"}}`. (4) `Static`
  `WaiveColorRequirement` gated on `youHave` a [TS] card. (5) `Main` — `Delete`
  `superlative:"lowestDP"` `count:"all"` on the opponent, then `Recover` 1.
  Registration is exclusively `registerIrCard("BT26-033", compiled)` with
  `coverage:"full"` and `residual:[]`; `digivolutionRequirement` carries the Lv.5 [TS]
  cost-4 alternate.
- Primitive trace: `WaiveColorRequirement` (interpreter/actions/statics.ts) waives the
  played card's printed colour requirement — exactly CR 16-42's ＜Use Req.＞. The
  `CostModifier` with `handResident:true` is read at the play/use site, so the cost is
  recomputed live (Q7006). `runModal` (interpreter/actions/modal.ts) prunes options via
  `canAttemptModalAction` and auto-selects when only one is executable, so the
  play/use split never adds a decision the printed text does not have. `runReplacement`
  with `affectsAll:true` protects the whole simultaneous set for a single cost payment
  (Q7005). "Top stacked card" is the card on top of the stack — i.e. the Digimon's own
  card — confirmed by the identical wording family: BT26-058 compiles it to
  `placeOwnTopAtStackBottom`, which moves `permanent.topCard` to the stack bottom and
  promotes the card beneath (primitives.ts), and BT20-055 ("place the top card of this
  Digimon") uses `detachPermanentTop`. So the cost's `isSelfRef` target and
  `topInstanceIds` resolution pick the correct card.
- Known gap (engine seam, not applied): `Cost` has no `detachPermanentTop`, and
  `costs.ts` case `"placeAsSecurity"` calls
  `ctx.fx.addSecurity(seat, instanceIds, { toTop, faceUp })` without it. `addSecurity`
  therefore runs `collectForReturn`, which takes the WHOLE permanent: Jupitermon lands
  in security and its digivolution cards are trashed, instead of Jupitermon detaching
  to the bottom of security while the card beneath is promoted and the permanent stays
  in play. The primitive already supports the correct behaviour
  (`addSecurity(..., { detachPermanentTop: true })`, exercised by BT20-055 / BT20-052 /
  BT16-056). Required change: add `detachPermanentTop?: boolean` to `Cost`
  (`packages/shared/src/effects/ir/predicates/costs.ts`) and thread it through
  `apps/api/src/engine/effects/interpreter/costs.ts` case `"placeAsSecurity"`; then set
  `detachPermanentTop: true` on this card's replacement cost. Not applied — this
  worker is barred from engine/shared edits.
- Behavioral proof: 4 cases in the colocated test. IR-shape case pins keywords, the
  security-to-hand + modal pair, the `affectsAll` prevention with its
  `placeAsSecurity` bottom cost, the hand-resident use-cost delta, the colour waiver,
  and the Main delete/recover body. Q7004 case proves the top security card reaches the
  hand and Junomon is played for a total reduction of 10 (memory 2 → 0). Q7005 case
  proves one payment saves both simultaneously-deleted [TS] Digimon and that
  Jupitermon lands at the bottom of security. Q7006 case plays the Option face with 3
  security (use cost 2 + 3 = 5, memory 5 → 0), deletes both 3000-DP Digimon while the
  12000 survives, and recovers 1 (security 3 → 4). Missing coverage, recorded rather
  than written unverified: no assertion that the Jupitermon permanent survives with its
  Lv.5 source promoted after paying the prevention cost — that assertion fails until
  the seam above lands.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was made for this card.

## BT26-034 — Palmon — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Data, play cost 3, DP 1000, evo cost
  Green Lv.2 for 0, traits [Vegetation]/[Iliad]/[TS], C, max 4. Main text: alternate
  "[Digivolve] Lv.2 w/[TS] trait: Cost 0" plus "[Start of Your Main Phase] If you have
  4 or less memory, this Digimon may digivolve into a Digimon card with the
  [Vegetation] or [TS] trait in the hand without paying the cost." Inherited:
  "[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon."
  No Security text.
- Knowledge base: Q7007 — "if you have 4 or less memory" means the gauge sitting at 4
  or to the right of it on your side, i.e. your memory ≤ 4 (5 or more does not
  qualify).
- Implementation: two effects. (1) `StartOfYourMainPhase` with a single `Digivolve`:
  `target:{count:1, filter:{isSelfRef:true}, isSelf:true}` ("this Digimon"),
  `from:["hand"]`, `into:{kind:["Digimon"], nameOrTrait:[[Vegetation] trait,
  [TS] trait]}`, `payCost:false`, `optional:true`, and
  `condition:{kind:"memoryAtMost", value:4, controller:"mine"}`. (2) inherited
  `WhenAttacking`, `frequency:"OncePerTurn"`, one `Suspend` on
  `{controller:"opponent", kind:["Digimon"]}`, count 1. Registration is exclusively
  `registerIrCard("BT26-034", compiled)`, `coverage:"full"`, `residual:[]`,
  `digivolutionRequirement:[{level:2, traits:["TS"], cost:0, isAlternate:true}]`.
- Primitive trace: `memoryAtMost` with `controller:"mine"` (interpreter/conditions.ts)
  normalizes the shared gauge to the source seat's own side
  (`seat === turnSeat ? memory : -memory`) before comparing `<= 4`, which is exactly
  Q7007's "4 and to the right of it on your side". `payCost:false` waives the cost but
  keeps the ordinary digivolution-requirement check, so the printed "may digivolve
  into" still needs a legal level/colour match — the effect is a cost waiver, not a
  requirement waiver. The inherited effect's `frequency:"OncePerTurn"` is keyed on the
  granting source card, so two attacks by the same host share one budget.
- Behavioral proof: 4 cases. IR shape pins the alternate evolution entry and the
  `payCost:false` / `optional:true` / `memoryAtMost 4` triple. Positive path: at memory
  exactly 4 the host free-digivolves into a [Vegetation] card from hand (top card
  becomes BT26-039). Boundary/negative (Q7007): at memory 5 nothing is offered, the
  hand card stays put and memory is unchanged. Inherited path: a host carrying this
  card as a source suspends one opponent Digimon on its first attack and does not
  suspend a second one on its next attack in the same turn, proving the once-per-turn
  identity.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-035 — Morphomon — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Vaccine, play cost 3, DP 1000, evo cost
  Green Lv.2 for 0, traits [Insectoid]/[NSp], C, max 4. Main text: alternate
  "[Digivolve] Lv.2 w/[NSp] trait: Cost 0" plus "[When Moving] [On Play] You may
  suspend 1 Digimon." Inherited: "[Your Turn] [Once Per Turn] When this Digimon wins a
  battle, 1 of your [Insectoid] or [NSp] trait Digimon may digivolve into an
  [Insectoid] or [NSp] trait Digimon card in the hand with the cost reduced by 1."
  No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-035` returns no entries. The
  "when this Digimon wins a battle" family is covered by the Q&A on BT26-038 (Q7019 —
  it triggers after the losing Digimon is deleted; Q7020 — it also triggers on a won
  battle against a Security Digimon), which applies verbatim to this identical clause.
  No unresolved ambiguity.
- Implementation: three effects sharing two hoisted constants. `OnPlay` and
  `WhenMoving` each run the same `Suspend` action —
  `target:{filter:{controller:"any", kind:["Digimon"]}, count:1}`, `optional:true`
  (the printed "1 Digimon" is deliberately unscoped, so either player's Digimon is a
  legal choice). The inherited effect is `trigger:"YourTurn"`, `isInherited:true`,
  `frequency:"OncePerTurn"`, wrapping a `SubTrigger` on `whenBattleWon` with
  `sourceFilter:{isSelfRef:true}` and one `Digivolve`:
  `target` = mine, Digimon, [Insectoid] or [NSp]; `into` = same trait pair, `kind`
  Digimon, `zone:"hand"`; `from:["hand"]`, `payCost:true`, `costDelta:-1`,
  `optional:true`. Registration is exclusively `registerIrCard("BT26-035", compiled)`,
  `coverage:"full"`, `residual:[]`,
  `digivolutionRequirement:[{level:2, traits:["NSp"], cost:0, isAlternate:true}]`.
- Primitive trace: `sourceFilter:{isSelfRef:true}` on the `whenBattleWon` SubTrigger
  binds the watcher to the host permanent carrying this card as a digivolution source,
  so an ally's battle win never fires it. `payCost:true` with `costDelta:-1` charges
  the printed evolution cost minus 1 rather than waiving it, matching "with the cost
  reduced by 1". `trigger:"YourTurn"` restricts the window to the controller's turn and
  `frequency:"OncePerTurn"` keys the budget on the granting source card. The suspend's
  `controller:"any"` matches the unqualified printed "1 Digimon" — the same shape
  BT26-038 uses, which Q7018 confirms for that card.
- Cross-card and stack verification: exercised as a digivolution source under a host
  (`under:[{card:"BT26-035"}]`) alongside a non-carrying ally, proving the inherited
  watcher discriminates by host. The alternate evolution is proven both ways: a legal
  Lv.2 [NSp] egg (EX8-004) accepts the cost-0 alternate, and a plain Lv.2 egg
  (BT26-001, no [NSp]) is rejected.
- Behavioral proof: 5 cases. IR shape pins both suspend windows and the inherited
  SubTrigger. Positive On Play suspends the chosen opponent Digimon. [When Moving]
  through the public `moveFromBreeding` intent suspends an opponent Digimon, proving
  the second window and the "any Digimon" scope. Inherited case proves the negative
  path first (an ally's win leaves the hand card untouched) and then the positive path
  (the host's own win digivolves into the hand card at memory 0, i.e. the reduced
  cost). Evolution-requirement case proves the exact [NSp] boundary.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-036 — Lalamon — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Data, play cost 3, DP 1000, evo cost
  Green Lv.2 for 0, traits [Vegetation]/[DATA SQUAD], C, max 4. Main text: alternate
  "[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0" plus "[When Moving] [On Play] Reveal
  the top 3 cards of your deck. Add 1 card with the [Vegetation], [Fairy] or
  [DATA SQUAD] trait or 1 green Tamer card among them to the hand. Return the rest to
  the bottom of the deck." Inherited: "[When Attacking] [Once Per Turn] You may suspend
  1 of your opponent's Digimon." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-036` returns no entries. The
  printed clauses are unambiguous reveal/add/bottom text with no errata or ruling in
  `data/kb`. No unresolved ambiguity.
- Implementation: three effects. `OnPlay` and `WhenMoving` share one hoisted
  `RevealAdd`: `revealCount:3`, one `add` entry with `count:1`, `to:"hand"` and a
  filter combining `nameOrTrait` = [Vegetation]/[Fairy]/[DATA SQUAD] traits with
  `orFilters:[{kind:["Tamer"], colors:["Green"]}]`, and `rest:"deckBottom"`. The third
  effect is inherited `WhenAttacking`, `frequency:"OncePerTurn"`, one `Suspend` on
  `{controller:"opponent", kind:["Digimon"]}` count 1. Registration is exclusively
  `registerIrCard("BT26-036", compiled)`, `coverage:"full"`, `residual:[]`,
  `digivolutionRequirement:[{level:2, traits:["DATA SQUAD"], cost:0,
  isAlternate:true}]`.
- Primitive trace: `runRevealAdd` (interpreter/actions/reveal.ts) reveals exactly
  `revealCount` cards from the controller's deck, resolves each `add` entry against the
  revealed pool, and routes the remainder per `rest` — `"deckBottom"` is the printed
  "return the rest to the bottom of the deck", not a shuffle. The union of the trait
  filter and `orFilters` is evaluated per revealed card, so a green Tamer with none of
  the three traits still qualifies while a non-green Tamer does not; the trait branch
  is deliberately kind-unrestricted because the printed text says "1 card with the …
  trait", not "1 Digimon card". The inherited `frequency:"OncePerTurn"` is keyed on the
  granting source card, so one host shares one budget across attacks.
- Cross-card and stack verification: the [When Moving] case uses a mixed three-card
  pool — a green Tamer (BT26-091, exact match on the `orFilters` branch), a red Tamer
  (BT1-085, near match: right kind, wrong colour) and a plain non-matching Digimon
  (BT1-009) — and asserts the hand contains only the green Tamer while both others land
  in the deck. The inherited case runs the card as a digivolution source under a
  BT26-039 host. The alternate evolution is proven both ways: a Lv.2 [DATA SQUAD] egg
  (BT25-002) accepts cost 0, a plain Lv.2 egg (BT26-001) is rejected.
- Behavioral proof: 4 cases. IR shape pins the alternate evolution and the trigger
  list. Positive path plays the card through the public `playCard` intent, adds the
  trait match to hand and leaves the remainder in the deck. Mixed-pool case proves the
  green-Tamer alternative and the exact non-match boundary. Inherited case proves the
  once-per-turn suspend (second attack suspends nobody).
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-037 — Weatherdramon — 10/10

- Catalog evidence: Green Lv.4 "Sup."/Appmon Digimon, Navi, play cost 5, DP 5000, evo
  cost Green Lv.3 for 2, traits [Weather (App Name)]/[Seven Code], U, max 4. Main text:
  "[App Fusion] [Weathermon] & [Rocketmon] & [Newsmon]: Cost 0"; "[Assembly -2] Lv.3
  [Navi]/[System]/[Seven Code] trait Digimon card"; ＜Blocker＞; ＜Detach ([Seven Code]
  trait)＞; "[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the
  [Navi], [System] or [Seven Code] trait from this Digimon's digivolution cards to this
  Digimon without paying the cost." Link requirement "[Link] [Appmon] trait: Cost 3";
  link effect "[When Linking] This Digimon may battle 1 of your opponent's Digimon."
  No Security text, no link DP.
- Knowledge base: Q7014 — a "you may link" effect cannot link a card that has no
  ＜Link＞ of its own. Q7015 — "may battle" immediately starts a battle resolved by the
  standard rules. Q7016 — a Digimon with an "effects don't affect" protection can still
  be chosen and battled, because a battle is a DP comparison rule and not an effect; it
  is deleted normally if it loses. Q7017 — App Fusion accepts any ordered pair of two
  DIFFERENT names among Weathermon/Rocketmon/Newsmon (top card + link card), six
  combinations in total.
- Implementation: four effects. (1) `Static` carrying the ＜Blocker＞ and ＜Detach＞
  keywords. (2) `OnPlay` and (3) `WhenDigivolving` share one hoisted `Link`:
  `target` = zone `digivolutionCards`, `hostFilter:{isSelfRef:true}`,
  `kind:["Digimon"]`, `levels:[3]`, `hasLinkRequirement:true`, `nameOrTrait` =
  [Navi]/[System]/[Seven Code]; `recipient` = self; `from:["digivolutionCards"]`;
  `payCost:false`; `optional:true`. (4) `Static` with `isLinked:true` carrying a
  `SubTrigger` on `whenLinked` (`sourceFilter:{isSelfRef:true}`) whose body is a
  `Battle` with `attacker` = self and `defender` = 1 opponent Digimon, `optional:true`.
  `appFusionRequirement` and `assemblyRequirement` carry the two printed requirement
  lines. Registration is exclusively `registerIrCard("BT26-037", compiled)`,
  `coverage:"full"`, `residual:[]`.
- Defect corrected: the link source filter had no host gate, so
  `candidateLooseInstances` over the `digivolutionCards` zone admitted every qualifying
  level-3 link-capable card under ANY of the controller's Digimon, not just this
  Digimon's own stack — the printed text is "from THIS Digimon's digivolution cards".
  Added `hostFilter: { isSelfRef: true }` to the source filter, the seam
  `targeting/loose.ts` documents for exactly this wording (the BT9-111 shape): for the
  `digivolutionCards`/`linked` zones it requires `cand.hostPermanentId` to equal
  `ctx.source.permanent()!.permanentId`. Minimal one-key IR edit; no engine change.
- Primitive trace: `runLink` / `canAttemptLink` (interpreter/actions/link.ts) resolve
  the material through `candidateLooseInstances(ctx, action.target, action.from)` and
  then re-check ＜Link＞ eligibility server-side, so `hasLinkRequirement:true` plus that
  gate implements Q7014 without trusting a client intent. `payCost:false` waives the
  printed "[Link] [Appmon] trait: Cost 3". The linked-face battle rides the
  `whenLinked` SubTrigger and runs the ordinary battle verb, which compares DP rather
  than applying an effect to the defender — Q7015/Q7016. `appFusionCostFor` enforces
  the distinct-name pairing of Q7017.
- Cross-card and stack verification: the card is exercised as a real link card attached
  to a BT26-084 recipient as well as a battle-area Digimon with a BT26-084 digivolution
  source, and the negative link case uses a level-3 source with no ＜Link＞ (BT1-009)
  that stays in the stack. The Q7017 case sweeps all nine ordered name pairs and
  asserts the three duplicate pairs are rejected.
- Behavioral proof: 4 cases. IR shape pins App Fusion, Assembly, both link windows, the
  keywords and the linked battle. Q7017 case proves the exact App Fusion boundary.
  Positive case links a legal source out of the Digimon's own stack and then resolves
  the linked-face battle from the recipient, deleting the defender. Q7014 case proves
  the negative path. Q7015/Q7016 case links through the public `linkCard` intent
  against a defender protected by a `beAffected` restriction and still deletes it.
  Missing coverage, recorded rather than written unverified: no case yet proves the new
  `hostFilter` gate by placing a qualifying level-3 ＜Link＞ card under a DIFFERENT
  friendly Digimon and asserting it is not offered.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Source changed: `BT26-037.ts` (added `hostFilter`). No
  test change; the existing cases all source from this Digimon's own stack and remain
  valid.

## BT26-038 — Kuwagamon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Virus, play cost 5, DP 5000, evo cost
  Green Lv.3 for 2, traits [Insectoid]/[Titan]/[TS], C, max 4. Main text: alternate
  "[Digivolve] Lv.3 w/[TS] trait: Cost 2" plus "[When Moving] [On Play] [When
  Digivolving] You may suspend 1 Digimon. Then, 1 of your Digimon with the [Insectoid]
  or [Titan] trait gets +3000 DP until your opponent's turn ends." Inherited:
  "[Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your [Insectoid]
  or [Titan] trait Digimon may digivolve into an [Insectoid] or [Titan] trait Digimon
  card in the hand with the cost reduced by 1." No Security text.
- Knowledge base: Q7018 — the suspend may target either player's Digimon. Q7019 — "when
  this Digimon wins a battle" triggers after the losing Digimon is deleted. Q7020 — it
  also triggers on a won battle against a Security Digimon. Q7021 — it is simultaneous
  with the losing Digimon's deletion triggers, turn player first. Q7022 — the loser's
  "would be deleted"/"would leave" effects resolve first. Q7023 — it still triggers
  when an effect prevents the loser's deletion.
- Implementation: four effects. `OnPlay`, `WhenDigivolving` and `WhenMoving` share one
  hoisted two-action clause: `Suspend` on `{controller:"any", kind:["Digimon"]}` count
  1, `optional:true`; then `ModifyDP` +3000, `duration:"untilOpponentTurnEnd"`, target
  `{controller:"mine", kind:["Digimon"], nameOrTrait:[[Insectoid],[Titan]]}` count 1,
  not optional. The fourth effect is inherited `YourTurn`, `frequency:"OncePerTurn"`,
  wrapping a `whenBattleWon` SubTrigger with `sourceFilter:{isSelfRef:true}` and one
  `Digivolve` (`target` = mine [Insectoid]/[Titan] Digimon, `into` = same trait pair
  from `zone:"hand"`, `from:["hand"]`, `payCost:true`, `costDelta:-1`,
  `optional:true`). Registration is exclusively `registerIrCard("BT26-038", compiled)`,
  `coverage:"full"`, `residual:[]`,
  `digivolutionRequirement:[{level:3, traits:["TS"], cost:2, isAlternate:true}]`.
- Primitive trace: `controller:"any"` on the suspend is the exact shape Q7018
  describes — the unqualified printed "1 Digimon" admits both sides. The "Then," clause
  is a plain sequencing conjunction, not a cost or a conditional: the +3000 resolves
  even when the optional suspend is declined or has no legal target, which is why
  `ModifyDP` carries no `condition`/`ifThisEffectActed` gate. `untilOpponentTurnEnd`
  resolves through `toDuration` to the end of the controller's opponent's turn.
  `sourceFilter:{isSelfRef:true}` binds the `whenBattleWon` watcher to the host
  permanent carrying this card as a source, and the engine fires that event after the
  loser's deletion pass (Q7019/Q7022). `payCost:true` with `costDelta:-1` charges the
  printed cost minus 1 instead of waiving it.
- Cross-card and stack verification: the inherited effect is exercised from a real
  stack (`BT26-008` host with BT26-038 underneath) against both a battle-area defender
  and a Security Digimon, with a same-controller ally attack as the negative control.
  Kuwagamon itself carries [Insectoid], so the On Play case proves the DP clause can
  legally select the source Digimon.
- Behavioral proof: 5 cases. IR shape pins the three windows, the optional suspend, the
  +3000/`untilOpponentTurnEnd` pair and the inherited SubTrigger. On Play case answers
  a real `chooseTargets` decision, suspends the opponent Digimon and asserts
  `currentDP === baseDP + 3000`. Inherited positive path digivolves the winner's ally
  into the hand card at the reduced cost (memory 1 → 0). Negative path proves an ally's
  win does not fire the watcher (hand untouched, memory unchanged). Q7020 case proves
  the trigger fires after a won battle against a Security Digimon.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-039 — Sunflowmon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Data, play cost 5, DP 6000, evo cost
  Green Lv.3 for 2, traits [Vegetation]/[DATA SQUAD], U, max 4. Main text: alternate
  "[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2" plus "[On Play] [When Digivolving] If
  you have 1 or fewer Tamers, you may play 1 [Yoshino Fujieda] from your hand without
  paying the cost." Inherited: "[When Attacking] [Once Per Turn] 1 of your opponent's
  Digimon can't unsuspend until their turn ends." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-039` returns no entries. Both
  clauses use standard vocabulary — a board count of Tamers, a named free play, and an
  unsuspend lock with an opponent-turn duration — with no errata or ruling in
  `data/kb`. No unresolved ambiguity.
- Implementation: three effects. `OnPlay` and `WhenDigivolving` share one hoisted
  `PlayWithoutCost`: target `{controllerDefault:"mine", nameOrTrait:[{tokens:
  ["Yoshino Fujieda"], match:"name"}]}` count 1, `from:["hand"]`, `payCost:false`,
  `optional:true`, and `condition:{kind:"permanentCount", seat:"mine",
  filter:{kind:["Tamer"]}, op:"lte", value:1}`. The third effect is inherited
  `WhenAttacking`, `frequency:"OncePerTurn"`, one `Restrict` with
  `restriction:"unsuspend"`, `duration:"untilOpponentTurnEnd"`, target
  `{controller:"opponent", kind:["Digimon"]}` count 1, not optional. Registration is
  exclusively `registerIrCard("BT26-039", compiled)`, `coverage:"full"`,
  `residual:[]`, `digivolutionRequirement:[{level:3, traits:["DATA SQUAD"], cost:2,
  isAlternate:true}]`.
- Primitive trace: `permanentCount` (interpreter/conditions.ts) counts the seat's
  battle-area permanents matching the filter and forces `controller:"mine"` onto it, so
  `op:"lte"`, `value:1` is exactly "1 or fewer Tamers" on your own board. The gate sits
  on the action, so it is checked before the optional prompt is published — with two
  Tamers no decision is opened at all. `match:"name"` resolves through
  `matchNameOrTrait` against the printed English name, so every Yoshino Fujieda
  printing qualifies and only one may be chosen (`count: 1`). `payCost:false` waives
  the play cost. The inherited lock is mandatory (no `optional`), matching the printed
  text, and `untilOpponentTurnEnd` resolves to the end of the controller's opponent's
  turn — the printed "their turn ends" seen from the attacking player.
- Cross-card and stack verification: the free play is exercised against a mixed hand
  holding two different Yoshino Fujieda printings (BT4-095 and BT13-100), proving
  exactly one is taken and the other stays; and against a hand with no Yoshino at all.
  The Tamer gate is exercised at both boundaries (one existing Tamer passes, two
  Tamers refuse). The inherited effect runs from a real stack (BT1-082 host with this
  card as a source) with an ally attack as the negative control.
- Behavioral proof: 7 cases. Two evolution cases pin the printed Lv.3 [DATA SQUAD]
  cost-2 alternate and reject a wrong-trait Lv.3 base. Positive path plays Yoshino for
  free with exactly one existing Tamer. Multi-printing case proves the count boundary.
  Negative case proves two Tamers open no decision at all (`decisions` contains no
  `optional`/`selectCards` request) and that a Yoshino-less hand is untouched.
  Inherited cases prove the lock applies to an already-suspended opponent Digimon,
  that one budget is shared across two attacks in a turn, and that an ally's attack
  does not fire it.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-040 — Drimogemon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Data, play cost 5, DP 5000, evo cost
  Green Lv.3 for 2, traits [Beast]/[DM]/[Ver.3], C, max 4. Main text: alternate
  "[Digivolve] Lv.3 w/[DM] trait: Cost 2"; ＜Training＞; ＜Piercing＞; "[When Moving]
  [On Play] Suspend 1 of your opponent's Digimon. Then, by placing 1 card in your hand
  face down as this Digimon's bottom digivolution card, this Digimon gets +1000 DP
  until your opponent's turn ends for each of its face-down digivolution cards."
  Inherited: ＜Piercing＞. No Security text. Note there is no [When Digivolving] window.
- Knowledge base: `node tools/kb/query.mjs card BT26-040` returns no entries.
  Comprehensive rules 16-41-3 fixes the grammar this card uses: "by <doing X>" is an
  optional processing condition, and the clause it gates is mandatory once the
  condition is performed. The printed material is "1 card in your hand" — no kind,
  colour or trait qualifier. No unresolved ambiguity.
- Implementation: four effects. (1) `Static` carrying ＜Training＞ and ＜Piercing＞.
  (2) `WhenMoving` and (3) `OnPlay` share one hoisted three-action clause:
  `Suspend` on `{controller:"opponent", kind:["Digimon"]}` count 1 (mandatory);
  `PlaceUnder` with `target:{filter:{controller:"mine"}, from:["hand"], count:1,
  upTo:true}`, `position:"bottom"`, `faceDown:true`; `ModifyDP` on self, `amount:1000`,
  `duration:"untilOpponentTurnEnd"`, `scaling:{per:1, unit:"digivolutionCards",
  filter:{isSelfRef:true, faceDown:true}}`, `condition:{kind:"ifThisEffectActed"}`.
  (4) `Static` `isInherited:true` carrying ＜Piercing＞. Registration is exclusively
  `registerIrCard("BT26-040", compiled)`, `coverage:"full"`, `residual:[]`,
  `digivolutionRequirement:[{level:3, traits:["DM"], cost:2, isAlternate:true}]`.
- Defect corrected: the placement filter was `{controller:"mine", kind:["Digimon"]}`,
  which restricted the payable material to Digimon cards in hand. The printed cost is
  "1 card in your hand" — any kind. Removed the `kind` key so `candidateLooseInstances`
  over the `hand` zone offers every card the controller holds. Minimal one-key IR edit;
  no engine change. (The colocated test happened to use a Digimon, AD1-001, so the
  restriction was invisible to it.)
- Primitive trace: `runPlaceUnder` (interpreter/actions/placeUnder.ts) takes the source
  zones from `target.from`, resolves candidates through `candidateLooseInstances`, and
  with `upTo:true` calls `pickLoose` with `min: 0` — which is precisely CR 16-41-3's
  optional processing condition: the controller may decline to pay and the clause it
  gates then does not happen. It places with `belowTop: position !== "bottom"` and
  `faceUp: faceDown !== true`, so the card lands face down at the true bottom of the
  stack, and it sets `ctx.lastEffectActed = chosen.length > 0`.
  `ifThisEffectActed` (interpreter/conditions.ts) reads that flag, so the DP gain is
  suppressed when nothing was placed. `scaleFactor`'s `digivolutionCards` unit
  (interpreter/scaling.ts) counts the SOURCE permanent's own stack and honours
  `filter.faceDown`, counting only `!card.faceUp` entries — including the card just
  placed, which is the printed "for each of its face-down digivolution cards".
- Cross-card and stack verification: exercised as a digivolution source under a
  BT26-043 host to prove ＜Piercing＞ is conferred through the inherited static while
  the standalone copy keeps both ＜Training＞ and ＜Piercing＞ on its own keyword set.
  The alternate evolution is proven against an off-colour Lv.3 [DM] base (EX9-014,
  blue) for cost 2, confirming the requirement is trait-and-level, not colour.
- Behavioral proof: 5 cases. Evolution cases pin the printed requirement and the
  off-colour alternate. On Play case proves the suspend hits only the opponent Digimon
  and not their Tamer, that the paid card is `stack[0]` with `faceUp: false`, and that
  DP is 5000 + 1000 × 1 = 6000. [When Moving] case proves the second window through the
  public `moveFromBreeding` intent with no rejected actions. Negative case proves an
  empty hand leaves the stack empty and DP at the printed 5000, i.e. the unpaid
  condition suppresses the gain. Missing coverage, recorded rather than written
  unverified: no case yet places a non-Digimon hand card (the clause the fix restores),
  and none asserts the per-card scaling with two face-down sources.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Source changed: `BT26-040.ts` (dropped the `kind` key from
  the placement filter). No test change; every existing case pays with a Digimon, which
  the widened filter still accepts.

## BT26-041 — Hudiemon — 10/10

- Catalog evidence: Green/Yellow Digimon, Lv.4 Champion, play cost 4, DP 5000,
  evo costs Green Lv.3 / Yellow Lv.3 at 3 memory each, attribute Free, traits
  [Insectoid]/[NSp], rarity U, max 4. Main text: alternate "[Digivolve] Lv.3
  w/[Larva]/[Insectoid]/[NSp] trait: Cost 2" plus "[On Play] [When Digivolving]
  Add your top security card to the hand and ＜Recovery +1＞ Then, you may suspend
  1 Digimon." Inherited: "[Your Turn] [Once Per Turn] When this Digimon wins a
  battle, gain 1 memory." No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-041` returns no entries —
  no errata and no rulings. The printed text is the whole contract. ＜Recovery +1＞
  is the glossary keyword "place the top card of your deck as your top security
  card"; "1 Digimon" is unqualified, so either player's Digimon is a legal choice.
- Implementation: one shared action list bound to both `trigger: "OnPlay"` and
  `trigger: "WhenDigivolving"` —
  `SecurityManipulation { op: "toHand", controller: "mine", amount: 1 }`,
  `SecurityManipulation { op: "addTop", controller: "mine", source: "deck", amount: 1 }`,
  `Suspend { target: { count: 1, filter: { controller: "any", kind: ["Digimon"] } }, optional: true }`.
  The inherited clause is `trigger: "YourTurn"`, `isInherited: true`,
  `frequency: "OncePerTurn"`, wrapping `SubTrigger { event: "whenBattleWon",
  sourceFilter: { isSelfRef: true } }` → `GainMemory { amount: 1 }`.
  `digivolutionRequirement: [{ level: 3, traits: ["Larva", "Insectoid", "NSp"],
  cost: 2, isAlternate: true }]`. Registration is exclusively
  `registerIrCard("BT26-041", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `runSecurityAdd` (interpreter/actions/security.ts) routes
  `op: "addTop"` with `source: "deck"` into `ctx.fx.recoverToSecurity(seat, count)` —
  the canonical ＜Recovery＞ path, deck top onto the security top, not a loose
  prompt. Ordering matters and is correct: `toHand` removes the current top before
  `addTop` replaces it, so the recovered card ends up as the new top security card.
  `Suspend` with `controller: "any"` builds its candidate pool across both seats
  via `candidatePermanents`, matching the unqualified "1 Digimon"; `optional: true`
  routes through the decline path so declining leaves the board untouched, and
  nothing follows it in the sequence, so no `abortOnDecline` is needed. The
  inherited effect resolves `isSelfRef` against the host permanent that carries
  BT26-041 in its digivolution stack, so only the stack owner's battle wins count.
- Behavioral proof: `BT26-041.test.ts` — five cases. The alternate requirement is
  asserted through the public `digivolutionRequirementsFor` seam. The IR-shape case
  pins the ordered trio and that both play windows share identical actions. The
  public case plays the card with a real security stack and deck, then asserts the
  old top security card reached the hand, the deck card became `security[0]`, and
  the opponent's Digimon suspended — all three clauses in one resolution. The
  inherited positive case builds a real stack (`BT26-044` over `BT26-041`), attacks
  a suspended weaker Digimon, and asserts memory 0 → 1. The negative case keeps the
  same stack but attacks with an unrelated ally and asserts memory stays 0, proving
  the `isSelfRef` source gate.
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-042 — Okuwamon — 10/10

- Catalog evidence: Green Digimon, Lv.5 Ultimate, play cost 7, DP 7000, evo cost
  Green Lv.4 at 3 memory, attribute Virus, traits [Insectoid]/[Titan]/[TS], rarity
  U, max 4. Main text: alternate "[Digivolve] Lv.4 w/[TS] trait: Cost 3"; "[On Play]
  [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of
  their Digimon or Tamers can't unsuspend until their turn ends."; "[On Play] [When
  Attacking] [Once Per Turn] Until your opponent's turn ends, 1 of your [Insectoid]
  or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP." Inherited: "[All Turns]
  [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, trash
  their top security card." No Security text.
- Knowledge base: Q7031 — the "can't unsuspend" clause may be given to a card the
  effect did not suspend, so the two clauses are independent selections rather than
  one bound target. Q7032 — the inherited effect cannot activate when the opponent's
  Digimon and the host are deleted in the same battle; the host must survive.
  Q7033 — the two effects that trigger on play are simultaneous, so the controller
  chooses the activation order.
- Implementation: `suspendAndLock` = `Suspend { target: opponent Digimon/Tamer, count 1 }`
  then `Restrict { target: opponent Digimon/Tamer, count 1, restriction: "unsuspend",
  duration: "untilOpponentTurnEnd" }`, bound to `OnPlay` and `WhenDigivolving` as two
  separate effects. `piercingAndDp` = `GainKeyword { keyword: "Piercing" }` on a
  mine/[Insectoid]-or-[Titan] Digimon, then `ModifyDP { amount: 3000 }` on the SAME
  selection, bound to `OnPlay` and `WhenAttacking` with
  `frequency: "OncePerTurn"` and `sharedUseKey: "bt26-042-piercing-dp"`. The inherited
  clause is `AllTurns` / `isInherited` / `OncePerTurn` wrapping
  `SubTrigger { event: "whenDeletesInBattle", sourceFilter: { isSelfRef: true } }` →
  `SecurityManipulation { op: "trashTop", controller: "opponent", amount: 1 }`.
  Registration is exclusively `registerIrCard("BT26-042", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: the ＜Piercing＞ grant and the +3000 DP each carried their own copy
  of the trait target, so `resolvePermanentTargets` prompted twice and the controller
  could split the two halves of one printed clause across two different Digimon. The
  text reads "1 of your [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and
  +3000 DP" — one Digimon. `ModifyDP` now takes `{ ...traitTarget, sameTarget: true }`
  so it reuses the keyword grant's chosen permanent.
- Primitive trace: `resolvePermanentTargets` (interpreter/targeting/permanents.ts:372)
  short-circuits `target.sameTarget` to `ctx.lastResolvedPermanentIds`, which every
  non-`sameTarget` resolution writes; `runAction` runs `GainKeyword` before `ModifyDP`
  in list order, so the reused ids are the ones just granted ＜Piercing＞. This is the
  same seam EX12-015 and BT19-089 use. The two `Restrict`/`Suspend` targets are
  deliberately NOT linked — that independence is exactly Q7031. `Restrict` with
  `duration: "untilOpponentTurnEnd"` maps to `EffectDuration.UntilOpponentTurnEnd`
  (interpreter/duration.ts), i.e. "until their turn ends" from the controller's seat.
  `sharedUseKey` puts both play windows and the attack window on one once-per-turn
  ledger entry while keeping separate permanents' keys distinct. `whenDeletesInBattle`
  fires only for a surviving deleter, satisfying Q7032.
- Behavioral proof: `BT26-042.test.ts` — eight cases. The alternate requirement is
  proven positively (a [TS] Lv.4 base digivolves for 3) and negatively (a non-[TS]
  Lv.4 base is rejected). One case plays the card and asserts the opponent Tamer
  suspended, the unsuspend restriction applied, the Insectoid at 5000 DP and carrying
  ＜Piercing＞, all in one resolution. Q7033 is proven by asserting two distinct
  trigger keys in an `orderTriggers` decision. Q7031 is proven by responding to the
  two `chooseTargets` decisions with different permanents and asserting the locked
  one never suspended. The once-per-turn case fires On Play then the attack window on
  the same copy (DP stays 5000) and then a second copy (DP 8000), proving the shared
  key is per-permanent. Q7032 gets both a positive case (surviving host trashes the
  top security card) and a negative case (host deleted in the same battle, security
  untouched), plus a third negative where an unrelated ally wins the battle.
- Verification: focused suite not run in this worker (per the audit brief the
  coordinator runs the BT26 suite and the typecheck once at the end). The `sameTarget`
  edit removes one `chooseTargets` prompt; every existing assertion in the file either
  uses a single-candidate pool or a `preferInstanceIds` entry that already selected the
  same permanent for both actions, so no assertion changes. `git diff --check` — passed.

## BT26-043 — Piximon — 9/10

- Catalog evidence: Green Digimon, Lv.5 Ultimate, play cost 6, DP 6000, evo cost
  Green Lv.4 at 3 memory, attribute Data, traits [Fairy]/[DM]/[Ver.4], rarity C,
  max 4. Main text: alternate "[Digivolve] Lv.4 w/[DM] trait: Cost 3"; ＜Blocker＞;
  "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers.
  Then, by placing your deck's top card face down as this Digimon's bottom
  digivolution card, for each of this Digimon's face-down digivolution cards, 1 of
  your opponent's Digimon or Tamers can't unsuspend until their turn ends."
  Inherited: "[All Turns] [Once Per Turn] When any of your Digimon are played, you
  may suspend 1 of your opponent's Digimon." No Security text.
- Knowledge base: Q7034 — the "can't unsuspend" clause may be given to a card the
  effect did not suspend. The suspend target and the lock targets are therefore
  independent selections, and the lock count scales with the face-down digivolution
  cards counted AFTER the placement (the placement is part of the same clause and
  precedes the "for each").
- Implementation: `setup` = `Suspend { target: opponent Digimon/Tamer, count 1 }`;
  `PlaceUnder { fromDeckTop: true, target: { filter: {}, count: 1 },
  underFilter: { isSelfRef: true }, position: "bottom", faceDown: true }`;
  `Restrict { target: opponent Digimon/Tamer, count 1, restriction: "unsuspend",
  duration: "untilOpponentTurnEnd", scaling: { unit: "selfFaceDownDigivolutionCards",
  per: 1 } }`, bound to `OnPlay` and `WhenDigivolving`. `keywords: [{ keyword:
  "Blocker" }]`. The inherited clause is `AllTurns` / `isInherited` / `OncePerTurn`
  wrapping `SubTrigger { event: "whenPlayed", sourceFilter: { controller: "mine",
  kind: ["Digimon"] } }` → optional `Suspend` on one opponent Digimon. Registration
  is exclusively `registerIrCard("BT26-043", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: the placement was encoded as a loose target
  (`target: { filter: { zone: "deck", controller: "mine" } }, from: ["deck"]`).
  `candidateLooseInstances` (interpreter/targeting/loose.ts:200) enumerates EVERY
  card in the named zone, so `pickLoose` offered the entire deck for selection
  instead of taking `deck[0]` — the printed text is "your deck's top card", and the
  deck is hidden information. It now uses `fromDeckTop: true`, documented in
  `PlaceUnderAction` as "Place `player.deck[0]` with no prompt" and used by every
  peer that prints "the top card of your deck" (ST23-13, ST24-09, BT25-088,
  BT26-089, BT26-093, and the synthesized ＜Training＞ effect). The switch also drops
  the loose path's unconditional `conferStackEffects` call, which was wrongly
  activating the inherited effects of a card that is placed FACE DOWN.
- Primitive trace: the `fromDeckTop` branch (interpreter/actions/placeUnder.ts:255)
  reads `ctx.game.player(ctx.source.ownerSeat).deck[0]`, resolves the host through
  `underFilter` (`isSelfRef` → Piximon itself) and places the card with
  `faceUp: false` hard-coded, which is what `faceDown: true` documents. `scaleFactor`
  for `selfFaceDownDigivolutionCards` (interpreter/scaling.ts:273) counts
  `self.stack.filter((c) => c.faceUp !== true).length` on the SOURCE permanent, and
  runs when `Restrict` resolves — after the placement — so the newly placed card is
  included, matching "for each of this Digimon's face-down digivolution cards".
  `effectiveTargetCount` multiplies the `count: 1` target by that factor, producing
  N independent lock targets. Because the deck can be empty, `fromDeckTop` returns
  early and the lock then scales only on the pre-existing face-down cards — the
  printed clause is cost-gated on the placement, and this is the closest the seam
  allows.
- Behavioral proof: `BT26-043.test.ts` — four cases. The IR-shape case pins the
  alternate requirement, ＜Blocker＞, the ordered trio, the `fromDeckTop`/`faceDown`/
  `position` placement, the scaling unit, and that the placement is not optional.
  The public case plays the card from hand with a one-card deck and asserts the
  opponent permanent suspended and restricted. The Q7034 case is the strongest: two
  pre-existing face-down digivolution cards plus the placed one make three, and the
  test answers the two `chooseTargets` decisions with a suspend-only target and three
  DIFFERENT lock targets, then asserts three face-down stack cards, the suspended
  card NOT restricted, and all three lock targets restricted. The inherited case
  plays an unrelated Digimon under a real stack and asserts the opponent suspends.
- Remaining gap (the missing point): the `fromDeckTop` branch places with
  `belowTop: action.position !== "top"` (placeUnder.ts:273), which is inverted
  relative to the primitive's contract — `ctx.fx.placeUnder` treats `belowTop: false`
  as the true bottom (`unshift`, `stack[0]`) and `belowTop: true` as directly beneath
  the top card (`push`). Every other `PlaceUnder` branch spells it
  `belowTop: action.position !== "bottom"` (placeUnder.ts:187/235/377). So with the
  honest `position: "bottom"` the card currently lands at the TOP of the digivolution
  stack rather than the printed bottom. This is invisible to this card's own "for
  each face-down digivolution card" count, but it is visible to any "bottom face-down
  digivolution card" reader (BT25-088, BT26-048). Fixing it means an engine edit,
  which this worker is not permitted to make — see the report to the coordinator.
- Verification: focused suite not run in this worker (per the audit brief the
  coordinator runs the BT26 suite and the typecheck once at the end). `BT26-043.test.ts`
  was edited: the IR-shape assertion `{ kind: "PlaceUnder", from: ["deck"], ... }`
  became `{ kind: "PlaceUnder", fromDeckTop: true, ... }`, because the old assertion
  pinned the wrong card source. No behavioral assertion changed — both public cases
  use a single-card deck, so `deck[0]` is what they already exercised.
  `git diff --check` — passed.

## BT26-044 — Lilamon — 10/10

- Catalog evidence: Green Digimon, Lv.5 Ultimate, play cost 6, DP 7000, evo cost
  Green Lv.4 at 3 memory, attribute Data, traits [Fairy]/[DATA SQUAD], rarity U,
  max 4. Main text: alternate "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3";
  "[On Play] [When Digivolving] You may suspend 1 of your opponent's Digimon or
  Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn
  ends."; "[Your Turn] [Once Per Turn] When any of your opponent's Digimon or
  Tamers suspend, or effects trash cards from under your Tamers, this Digimon may
  digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in the
  hand with the cost reduced by 1." Inherited: "[All Turns] [Once Per Turn] When
  this Digimon with [Rosemon] in its name or the [DATA SQUAD] trait would leave the
  battle area, by trashing the bottom face-down card from under any of your Tamers,
  it doesn't leave." No Security text.
- Knowledge base: Q7035 — the "can't unsuspend" clause may be given to a card the
  effect did not suspend, so the two clauses select independently. Nothing in the
  KB resolves whether declining the "may suspend" also suppresses the "Then" clause
  (see the ambiguity note below).
- Implementation: `OnPlay` and `WhenDigivolving` each run
  `Suspend { target: opponent Digimon/Tamer, count 1, optional: true }` then
  `Restrict { target: opponent Digimon/Tamer, count 1, restriction: "unsuspend",
  duration: "untilOpponentTurnEnd" }`. `trigger: "YourTurn"`,
  `frequency: "OncePerTurn"` holds two `SubTrigger` watchers sharing one
  once-per-turn ledger entry: `whenSuspended` with `sourceFilter { controller:
  "opponent", kind: ["Digimon", "Tamer"] }`, and `whenDigivolutionTrashed` with
  `sourceFilter { controller: "mine", kind: ["Tamer"], byEffect: true }`; both run
  the same `Digivolve { from: ["hand"], payCost: true, costDelta: -1,
  useAlternateCost: true, optional: true, abortOnDecline: true, target: isSelfRef,
  into: { kind: ["Digimon"], nameOrTrait: [[Vegetation] trait, [Fairy] trait,
  [DATA SQUAD] trait] } }`. The inherited clause is `AllTurns` / `isInherited` /
  `OncePerTurn` wrapping `Replacement { event: "wouldLeavePlay", mode: "prevent",
  optional: true, sourceFilter: { isSelfRef: true, nameOrTrait: [[Rosemon] name,
  [DATA SQUAD] trait] }, cost: { kind: "trashBottomFaceDownUnderTamer",
  controller: "mine", count: 1 } }`. Registration is exclusively
  `registerIrCard("BT26-044", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: the two opponent targets are separate `Target` records with no
  `sameTarget`, so `resolvePermanentTargets` prompts twice — exactly Q7035. The
  once-per-turn frequency sits on the effect, not on each `SubTrigger`, so a
  suspension and a Tamer trash in the same turn share one activation, which is what
  a single printed [Once Per Turn] on a two-condition clause means.
  `useAlternateCost: true` is forwarded to `digivolveFromInstance`, where
  `useAlternate = opts.useAlternateCost === true && alternate !== undefined`
  (effects/primitives.ts:1082) — so a destination card with no alternate requirement
  falls back to `printed ?? alternate?.cost ?? baseGranted?.cost` rather than
  failing; the flag only prefers a printed alternate route when one exists, which is
  the cheaper legal route and matches the peer spelling in BT26-066/BT26-069.
  `costDelta: -1` is applied once inside the verb and floored at 0, so "with the cost
  reduced by 1" cannot go negative. `trashBottomFaceDownUnderTamer` reads
  `host.stack[0]` and requires `faceUp === false` (interpreter/costs.ts), which is the
  printed "bottom face-down card"; `mode: "prevent"` keeps the permanent in play
  rather than re-playing it.
- Behavioral proof: `BT26-044.test.ts` — six cases. The alternate requirement is
  asserted through `digivolutionRequirementsFor`. The IR-shape case pins the optional
  suspend, the independent lock, the two watchers under one once-per-turn effect, and
  the leave replacement. The public case plays the card and asserts the opponent Tamer
  suspended and restricted. Q7035 is proven by answering the two `chooseTargets`
  decisions with different permanents and asserting the locked one never suspended.
  The suspension watcher is proven end-to-end: a real opponent suspension drives the
  reduced-cost digivolution into BT26-049 and memory lands at 1 (cost 3 − 1 = 2 from 3).
  The Tamer-trash watcher is proven separately with a real face-down card under a Tamer,
  asserting the card reached the trash, Lilamon's top card became the hand card, and the
  same memory arithmetic. The inherited replacement is proven with a real stack
  (BT26-039 over BT26-044): `deletePermanent` returns 0 deletions, the host is still in
  the battle area, and the Tamer's bottom face-down card is in the trash.
- Ambiguity recorded: the printed "You may suspend ... Then, 1 of their Digimon or
  Tamers can't unsuspend" leaves the decline case open. Q7035 establishes the two
  clauses target independently, and the KB carries no ruling that a declined "may"
  suppresses a following "Then" clause, so the implementation resolves the lock
  unconditionally. If a later ruling ties them, the fix is a single `abortOnDecline:
  true` on the `Suspend` action; no engine change is needed either way.
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-045 — GranKuwagamon — 10/10

- Catalog evidence: Green Digimon, Lv.6 Mega, play cost 11, DP 11000, evo cost
  Green Lv.5 at 3 memory, attribute Free, traits [Insectoid]/[Titan]/[TS], rarity
  U, max 4. Main text: alternate "[Digivolve] Lv.5 w/[Insectoid]/[TS] trait:
  Cost 3"; "When this card would be played, if your hand has fewer cards than your
  opponent's, reduce the cost by 4."; "[On Play] [When Digivolving] [When Attacking]
  [Once Per Turn] You may play 1 level 4 or lower [Insectoid] or [Titan] trait
  Digimon card from your hand without paying the cost."; "[Your Turn] All of your
  [Insectoid] or [Titan] trait Digimon gain ＜Alliance＞ , ＜Piercing＞ and ＜Vortex＞".
  No inherited text and no Security text.
- Knowledge base: Q7036 — with equal hands, playing this card FROM HAND does not
  enable the reduction, because the card is still in the hand when the play is
  announced. Q7037 — playing it from anywhere else with equal hands also does not
  enable it. Q7038 — a Digimon played by the free-play effect during this card's own
  attack can then be suspended for ＜Alliance＞ on that same attack. Q7077 — the
  reduction stacks with BT26-046's own reduction for a combined 11.
- Implementation: `trigger: "Static"` holding
  `Replacement { event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine",
  isSelfRef: true }, mode: "reduceCost", amount: 4, condition: { kind: "handCompare",
  op: "lt" } }`. Three separate effects — `OnPlay`, `WhenDigivolving`,
  `WhenAttacking` — each `frequency: "OncePerTurn"` with
  `sharedUseKey: "bt26-045-free-play"`, each running
  `PlayWithoutCost { target: { filter: { controller: "mine", zone: "hand",
  kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait:
  [[Insectoid] trait, [Titan] trait] }, count: 1 }, from: ["hand"], payCost: false,
  optional: true }`. `trigger: "YourTurn"` grants ＜Alliance＞, ＜Piercing＞ and ＜Vortex＞
  to `count: "all"` mine [Insectoid]-or-[Titan] Digimon for `untilEachTurnEnd`.
  Registration is exclusively `registerIrCard("BT26-045", compiled)` with
  `coverage: "full"`, `residual: []`.
- Primitive trace: `handCompare` (interpreter/conditions.ts:315) compares
  `ctx.game.player(mine).hand.length` against the opponent's at the moment the
  `wouldBePlayed` replacement is evaluated — before the card leaves the hand, which
  is precisely Q7036/Q7037. `op: "lt"` is strict, so equal hands do not qualify.
  Because the reducer is registered per card rather than folded into a single
  play-cost pass, an independently reduced second card (BT26-046) still applies its
  own reduction, satisfying Q7077. `sharedUseKey` puts all three printed windows on
  one once-per-turn ledger entry keyed per permanent, so two copies each keep their
  own activation. `PlayWithoutCost` with `payCost: false` bypasses the memory cost
  entirely rather than overriding it to 0, and `optional: true` honours "you may".
  The `YourTurn` grant is re-applied as a turn-scoped continuous effect over the
  live `count: "all"` pool, so a Digimon that enters play mid-turn is covered — which
  is what Q7038 needs for the ＜Alliance＞ chain.
- Behavioral proof: `BT26-045.test.ts` — four cases. The IR-shape case pins the
  alternate requirement, the reducer's registration through the public
  `wouldBePlayedSelfReducersFor` seam, the three shared-key windows, and the three
  keyword grants. The keyword case asserts all three keywords on a real permanent
  through `observe`. The cost case is the exact numeric boundary and proves both
  Q7036 and Q7037: hand 1 vs 2 pays 7 (memory 7 → 0), hand 1 vs 1 pays the full 11
  (memory 7 → −4). The Q7038 case attacks, watches the free-play fire during the
  attack, asserts the newly played Digimon carries ＜Alliance＞ and appears in the
  `alliancePrompt` eligible list, suspends it as the ally, and then fires On Play
  again to prove the shared once-per-turn key blocked the second activation (the
  second hand card is still in hand).
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-046 — Gryphonmon — 10/10

- Catalog evidence: Green/Blue Digimon, Lv.6 Mega, play cost 11, DP 11000, evo
  costs Green Lv.5 and Blue Lv.5 at 3 memory each, attribute Data, traits
  [Mythical Beast]/[Iliad]/[TS], rarity C, max 4. Main text: alternate
  "[Digivolve] Lv.5 w/[TS] trait: Cost 3"; "When this card would be played, if
  there are 2 or more suspended Digimon, reduce the cost by 4."; ＜Piercing＞;
  ＜Vortex＞; "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or
  Tamers. 1 of their Digimon or Tamers can't unsuspend until their turn ends. Then,
  1 of your Digimon can't be deleted in battle until their turn ends."; "[Rule]
  Trait: Has [Avian] Type." No inherited text and no Security text.
- Knowledge base: Q7039 — the "can't unsuspend" clause may be given to a card the
  effect did not suspend, so the suspend target and the lock target are independent
  selections.
- Implementation: a `Static` effect carrying the printed ＜Piercing＞/＜Vortex＞ keyword
  records plus `GrantStatic { target: self, grant: "trait", tokens: ["Avian"],
  duration: "permanent" }`. A second `Static` effect holds
  `Replacement { event: "wouldBePlayed", sourceFilter: { controllerDefault: "any",
  isSelfRef: true }, mode: "reduceCost", amount: 4, condition: { kind:
  "totalDigimonGte", filter: { kind: ["Digimon"], suspended: true }, value: 2 } }`.
  `OnPlay` and `WhenDigivolving` each run `Suspend { opponent Digimon/Tamer, count 1 }`,
  `Restrict { opponent Digimon/Tamer, count 1, restriction: "unsuspend",
  duration: "untilOpponentTurnEnd" }`, `Restrict { mine Digimon, count 1,
  restriction: "beDeletedInBattle", duration: "untilOpponentTurnEnd" }`. Registration
  is exclusively `registerIrCard("BT26-046", compiled)` with `coverage: "full"`,
  `residual: []`.
- Primitive trace: `totalDigimonGte` (interpreter/conditions.ts:326) sums BOTH seats'
  battle areas, counts only permanents whose top card is a Digimon (Tamers and Options
  excluded), and applies the supplied filter — so `suspended: true` with `value: 2`
  is exactly "there are 2 or more suspended Digimon", both players included, which the
  unqualified printed wording requires. The three body actions carry three independent
  `Target` records with no `sameTarget`, so the suspend, the unsuspend lock and the
  battle-deletion protection each prompt separately; the independence of the first two
  is Q7039, and the third is scoped `controller: "mine"` per "1 of your Digimon".
  The [Rule] trait is belt-and-braces: `staticTraitsOf` (engine/cards/cardData.ts:293)
  already parses `[Rule] Trait: Has [X]` straight out of the printed `effectText`, so
  [Avian] applies in every zone — hand, deck, trash and battle area — independently of
  the IR; the `GrantStatic` record only mirrors it on the battle-area permanent. The
  peer spelling (EX12-026, ST18-12) uses `trigger: "Rule"` rather than `"Static"` for
  that mirror; `isStaticTrigger` in interpreter/effect.ts treats the two identically
  and the trait-name reader is text-driven, so the difference is cosmetic and carries
  no behavioral consequence.
- Behavioral proof: `BT26-046.test.ts` — four cases. The IR-shape case pins the
  alternate requirement, the printed keywords, the cost reducer, the three-action body
  and the [Avian] grant. The public case answers the two `chooseTargets` decisions with
  different opponent permanents, asserts the locked one never suspended, asserts both
  restrictions through the continuous ledger, then hands the turn over and has the
  15000 DP attacker battle Gryphonmon — which survives, proving `beDeletedInBattle`
  actually holds in a real battle rather than only in the ledger. The cost reduction
  gets its exact boundary from both sides: two suspended Digimon (one per seat, so the
  cross-seat sum is exercised) pays 7 (memory 7 → 0); one suspended Digimon pays the
  full 11 (memory 7 → −4).
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-047 — TyrantKabuterimon — 10/10

- Catalog evidence: Green Digimon, Lv.6 Mega, play cost 13, DP 13000, evo cost
  Green Lv.5 at 4 memory, attribute Virus, traits [Insectoid]/[Titan]/[TS], rarity
  R, max 4. Main text: alternate "[Digivolve] Lv.5 w/[Insectoid]/[TS] trait:
  Cost 3"; "[Assembly -6] 4 [Larva]/[Insectoid]/[Titan] trait Digimon cards w/
  different levels"; "[On Play] [When Digivolving] This Digimon may battle 1 of
  your opponent's Digimon."; "[Start of Your Main Phase] [On Play] [When
  Digivolving] By suspending 1 Digimon, until your opponent's turn ends, none of
  your suspended [Insectoid] or [Titan] trait Digimon are affected by your
  opponent's Option effects, and they get +3000 DP." No inherited text and no
  Security text.
- Knowledge base: Q7040 — "may battle" immediately starts a battle resolved by the
  standard rules. Q7041 — a Digimon with "isn't affected by effects" can still be
  chosen and can still lose that battle, because a battle is a DP comparison rule,
  not an effect. Q7042 — the suspend cost may take either player's Digimon.
  Q7043 — the two effects that trigger on play are simultaneous, so the controller
  chooses the order. Q7044–Q7049 define "isn't affected by effects": choosable but
  unaffected (Q7044/Q7045); an effect may still be GIVEN to it but does not apply,
  and a granted keyword is not considered present (Q7046); immunity gained later
  immediately stops an active effect (Q7047); losing immunity re-applies a retained
  grant (Q7048); a granted trigger does not fire while immune at the trigger timing
  (Q7049).
- Implementation: `battle` = `Battle { attacker: self, defender: { controller:
  "opponent", kind: ["Digimon"], count: 1 }, optional: true }`, bound to `OnPlay` and
  `WhenDigivolving` as their own effects. `suspendBuff` =
  `CostGatedBlock { cost: { kind: "suspend", target: { controller: "any",
  kind: ["Digimon"], count: 1 } }, optional: true, abortOnDecline: true }` wrapping
  `Restrict { target: mine suspended [Insectoid]/[Titan] Digimon, count: "all",
  restriction: "beAffected", duration: "untilOpponentTurnEnd", fromSourceKind:
  ["Option"], byOpponentEffectsOnly: true }` and `ModifyDP { same target, amount:
  3000, duration: "untilOpponentTurnEnd" }`, bound to `OnPlay`, `WhenDigivolving`
  and `StartOfYourMainPhase`. `assemblyRequirement: [{ reduceCost: 6, materials:
  [{ traits: ["Larva", "Insectoid", "Titan"], count: 4, differentLevels: true }] }]`.
  Registration is exclusively `registerIrCard("BT26-047", compiled)` with
  `coverage: "full"`, `residual: []`.
- Primitive trace: the `Battle` action drives the real battle verb rather than an
  attack, so no security is checked and the standard DP comparison decides — Q7040,
  and Q7041 falls out because the defender pool is built by `candidatePermanents`
  with `includeUnaffectable: true` and the battle itself never consults the
  affectability filter. The suspend cost's target is `controller: "any"`, which is
  Q7042; `canPay` for `kind: "suspend"` filters out already-suspended candidates, so
  a fully suspended board makes the block un-payable rather than silently no-op.
  Both inner actions use `count: "all"` over the same filter, so no selection is
  shared or split — the printed clause names a set, not a chosen target. The set is
  snapshotted at resolution, which matches the printed "none of your suspended ...
  Digimon" (the qualifying set is fixed when the effect resolves). `Restrict` with
  `restriction: "beAffected"`, `fromSourceKind: ["Option"]` and
  `byOpponentEffectsOnly: true` narrows immunity to the opponent's Option effects
  only, exactly as printed — the continuous ledger stores the source-kind qualifier
  and `hasRestriction(id, "beAffected", "Option")` reads it back.
- Behavioral proof: `BT26-047.test.ts` — seven cases. The IR-shape case pins the
  alternate requirement, the assembly requirement through the public
  `assemblyRequirementFor` seam, and that BOTH play windows carry BOTH effects plus
  the main-phase window. The public buff case asserts a suspended [Insectoid] peer at
  14000 DP and the Option-scoped restriction in the continuous ledger. Q7043 is proven
  by asserting two trigger keys in an `orderTriggers` decision. Q7040/Q7041 are proven
  by giving the defender a real `beAffected` restriction and then asserting the battle
  still deleted it. Q7042/Q7044/Q7045 are proven together: an opponent Digimon is
  chosen as the suspend cost, the buff lands at 16000, and the opponent's Option then
  still OFFERS the immune targets in its `chooseTargets` candidates while the DP is
  unchanged. Q7047 is proven by applying an opposing Option grant first
  (＜Security A. −3＞) and asserting it drops to 0 the moment immunity is gained.
  Q7046/Q7048/Q7049 are proven in one case: the grant is retained but inert, the
  granted `endOfOpponentTurn` trigger is subscribed yet does not fire while immune,
  and after sweeping only the immunity window the grant reads −3 again and the trigger
  then deletes the Digimon.
- Convention recorded: "By suspending 1 Digimon, ..." is mandatory processing under
  comprehensive rules §15-9-1, so strictly the cost must be paid whenever it can be.
  The repository models every `CostGatedBlock` as `optional: true, abortOnDecline: true`
  (BT26-030, BT26-087, BT26-093 all print mandatory "By ~ing" text with the same
  spelling), so this card follows the house convention rather than diverging from its
  peers. Changing it is a repo-wide decision, not a card-level defect, and it is not
  applied here.
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-048 — BloomLordmon — 10/10

- Catalog evidence: Green/Yellow Digimon, Lv.6 Mega, play cost 12, DP 12000, evo
  costs Green Lv.5 and Yellow Lv.5 at 4 memory each, attribute Vaccine, traits
  [Fairy]/[DM]/[Ver.4], rarity U, max 4. Main text: alternate "[Digivolve] Lv.5
  w/[DM] trait: Cost 3"; ＜Alliance＞; ＜Vortex＞; "[When Digivolving] [When Attacking]
  By trashing any of your Digimon's bottom face-down digivolution card, you may play
  1 6000 DP or lower [Ver.4] trait Digimon card from your hand without paying the
  cost."; "[All Turns] When effects trash face-down digivolution cards from your
  Digimon, 1 of your opponent's Digimon gets −6000 DP for the turn." No inherited
  text and no Security text.
- Knowledge base: Q7050 — when multiple qualifying cards are trashed simultaneously,
  the [All Turns] effect activates ONCE, not once per card. Q7051 — a Digimon played
  by the [When Attacking] effect can be suspended for ＜Alliance＞ on that same attack.
- Implementation: a `Static` effect carrying the printed ＜Alliance＞/＜Vortex＞ keyword
  records. `trashAndPlay` = `CostGatedBlock { cost: { kind:
  "trashBottomFaceDownUnderDigimon", controller: "mine" }, optional: true,
  abortOnDecline: true }` wrapping `PlayWithoutCost { target: { filter: { controller:
  "mine", zone: "hand", kind: ["Digimon"], dp: { op: "lte", value: 6000 },
  nameOrTrait: [[Ver.4] trait] }, count: 1 }, from: ["hand"], payCost: false,
  optional: true }`, bound to `WhenDigivolving` and `WhenAttacking`. `trigger:
  "AllTurns"` wraps `SubTrigger { event: "onDigivolutionCardsDiscardedBatch",
  sourceFilter: { controller: "mine", kind: ["Digimon"] },
  requireFaceDownDigivolutionCardTrashed: true }` → `ModifyDP { target: 1 opponent
  Digimon, amount: -6000, duration: "untilEachTurnEnd" }`. Registration is
  exclusively `registerIrCard("BT26-048", compiled)` with `coverage: "full"`,
  `residual: []`.
- Primitive trace: the cost `trashBottomFaceDownUnderDigimon` (interpreter/costs.ts:110
  and :488) enumerates the controller's battle-area permanents whose top card is a
  Digimon AND whose `stack[0].faceUp === false` — `stack[0]` is the true bottom of the
  digivolution stack, so a face-up bottom card disqualifies a host even when a higher
  card is face down. That is the printed "bottom face-down digivolution card", and
  "any of your Digimon's" is the `controller: "mine"` scope over every eligible host.
  The reaction is bound to `onDigivolutionCardsDiscardedBatch` rather than a per-card
  event, so one simultaneous trash of N cards fires once — exactly Q7050 — and
  `requireFaceDownDigivolutionCardTrashed: true` gates on at least one FACE-DOWN card
  in the batch. `duration: "untilEachTurnEnd"` falls through `toDuration`'s default to
  `EffectDuration.UntilEachTurnEnd`, the same value `"forTheTurn"` maps to, so
  "−6000 DP for the turn" expires at the end of the current turn. The card's own cost
  payment is an effect trashing a face-down digivolution card from the controller's
  Digimon, so it legitimately triggers its own [All Turns] clause.
- Behavioral proof: `BT26-048.test.ts` — five cases. The IR-shape case pins the
  alternate requirement, both printed keywords, the cost/play block in BOTH printed
  windows including the full DP and trait filter, and the batch reaction. The public
  case trashes a real bottom face-down card, asserts the [Ver.4] Digimon entered the
  battle area, the paid card left the host's stack, and the opponent dropped 10000 →
  4000 — cost, play and the derived debuff in one resolution. The negative cost case
  is the exact boundary: a face-UP bottom card with a face-down card above it cannot
  pay, so the hand card stays in hand and the stack is untouched. Q7050 is proven by
  trashing two face-down cards in one batch and asserting a single −6000 (BT26-045 at
  11000 → 5000, not −12000). A second negative case proves both source gates: a
  face-up card from the controller's own Digimon, and a face-down card from an
  OPPONENT's Digimon, neither moves the DP. Q7051 is proven end-to-end — attack,
  free-play during the attack, the newly played Digimon appears in the
  `alliancePrompt` eligible list, is suspended as the ally, and the security check
  resolves.
- Verification: no defect found; the module is unchanged. Focused suite not run in
  this worker (per the audit brief the coordinator runs the BT26 suite and the
  typecheck once at the end). `git diff --check` — passed.

## BT26-049 — Rosemon — 10/10

- Catalog evidence: Green Digimon, Lv.6 Mega, Data, [Fairy]/[DATA SQUAD], play cost
  12, DP 12000, evo cost Green Lv.5 for 4, R, max 4. Printed clauses:
  `[Digivolve] [Lilamon]/Lv.5 w/[DATA SQUAD] trait: Cost 3`;
  `[When Digivolving] [When Attacking] [Once Per Turn] Suspend 2 of your opponent's
  Digimon or Tamers.`; `[All Turns] [Once Per Turn] When any of your opponent's
  Digimon or Tamers suspend, or effects trash cards from under your Tamers, you may
  play or use 1 play cost or use cost 3 or lower [DATA SQUAD] trait card from your
  hand without paying the cost. For each suspended Digimon or Tamer, add 1 to the
  cost maximum.` No inherited text, no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-049` — no entries. No errata,
  no rulings, no restrictions. The printed text is the only contract; the
  "for each suspended Digimon or Tamer" scaler prints no controller, so it counts
  both seats.
- Implementation: `digivolutionRequirement` encodes both alternates
  (`names: ["Lilamon"], cost 3` and `level 5, traits ["DATA SQUAD"], cost 3`). Two
  effects — `WhenDigivolving` and `WhenAttacking` — carry
  `frequency: "OncePerTurn"` plus `sharedUseKey: "bt26-049-suspend"`, so the two
  timings compete for one budget, and each runs a mandatory
  `Suspend` on `{controller: "opponent", kind: ["Digimon","Tamer"]}, count: 2`
  (no `upTo`, so target resolution requires `min(2, candidates)`). The third effect
  is a single `AllTurns` / `OncePerTurn` block holding both reaction routes, so the
  two printed triggers share one use: `SubTrigger whenSuspended` with
  `sourceFilter {controller: "opponent", kind: ["Digimon","Tamer"]}` and
  `SubTrigger whenDigivolutionTrashed` with
  `sourceFilter {controller: "mine", kind: ["Tamer"], byEffect: true}`. Both are
  `optional: true` and both run the same `Modal choose: 1` — branch 0
  `PlayWithoutCost` on a hand [DATA SQUAD] Digimon/Tamer, branch 1
  `UseOptionWithoutCost` on a hand [DATA SQUAD] Option. Both branches carry
  `playCostCeiling {base: 3, raise: 1, per: 1, unit: "cards", filter: {controller:
  "any", kind: ["Digimon","Tamer"], suspended: true}}`. Registration is exclusively
  `registerIrCard("BT26-049", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: the `UseOptionWithoutCost` branch lacked `allowMultiColor: true`.
  `borrowed.ts:385` drops every candidate whose `colors.length !== 1` unless the
  action opts in, and the printed clause carries no single-color restriction. Three
  [DATA SQUAD] Options are dual-colored — BT25-104 ShineGreymon: Burst Mode
  (Red/Yellow, cost 6), ST24-07 ShineGreymon (Yellow/Red, cost 5) and BT26-050
  Rosemon: Burst Mode (Green/Red, cost 6) — all of them reachable once the ceiling
  climbs past 3, so the omission silently deleted the top of the legal pool. Added
  `allowMultiColor: true`, matching the BT25-085 / BT26-012 / BT26-104 idiom.
- Primitive trace: `applyPlayCostCeiling` (`actions/play.ts:21`) resolves the ceiling
  as `base + floor(total/per) * raise`; for `unit: "cards"` it delegates to
  `scaleFactor` → `countMatching`, whose `seatsForController`
  (`matching/permanent.ts:114`) maps `controller: "any"` to both seats — so the
  ceiling really counts both players' suspended Digimon and Tamers, not just mine.
  (The local `seats` array in `applyPlayCostCeiling` would mis-map `"any"` to
  `[mine]`, but that array is only read on the `digivolutionCards` and
  `zone: "trash"` paths, neither of which this card takes.)
  `UseOptionWithoutCost` recomputes the same ceiling independently in
  `borrowed.ts:361-370` and still enforces `optionColorRequirementMet`, so the free
  use does not bypass the Option's own color requirement.
  `sharedUseKey` is what makes "[When Digivolving] [When Attacking] [Once Per Turn]"
  one budget rather than two, and the single `AllTurns` effect wrapping both
  `SubTrigger`s is what makes the two printed reaction sources share one use.
  The `AllTurns` block routes through `staticModifier`'s on-field base guard, so the
  reaction is inert unless Rosemon is in the battle area — correct for a resident
  `[All Turns]` clause.
- Behavioral proof: `BT26-049.test.ts` — six cases. Structural: shared budget key on
  both timings, absence of `upTo` on the mandatory suspend, and absence of a static
  `playCostLte` on the play branch (the ceiling is dynamic). Positive: one own plus
  one opposing suspension lifts the ceiling to 5 and a cost-5 Option is used.
  Numeric boundary: with a single suspended card the ceiling is 4 and the cost-5
  Option stays in hand. Optional refusal: declining the "you may" does not burn the
  once-per-turn use, and the next suspension this turn still fires. Shared budget:
  the suspend route plays a cost-5 [DATA SQUAD] card, after which the
  Tamer-trash route no longer fires. Mandatory clause: `WhenDigivolving` suspends
  exactly 2 of 3 opposing cards and the subsequent attack suspends none.
  Gap recorded, not closed: no case covers a dual-colored [DATA SQUAD] Option
  through the raised ceiling, which is the fix above; adding it needs a run to
  confirm the harness's option-branch selection, so it is left for a follow-up.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. Change is a one-key IR addition on an existing action; all
  colocated assertions use `toMatchObject`, so none of them constrain the new key.

## BT26-050 — Rosemon: Burst Mode / Aguichant Lèvres — 10/10

- Catalog evidence: dual card (`isDualCard: true`), kinds Digimon + Option, colors
  Green/Red, Lv.7 Mega, Data, [Fairy]/[DATA SQUAD], play cost 6, DP 15000, evo cost
  Green Lv.6 for 5, UR, max 4. Digimon face:
  `[Digivolve] Lv.6 w/[DATA SQUAD] trait: Cost 5`,
  `[Burst Digivolve] [Rosemon]: Cost 0 by returning 1 [Yoshino Fujieda] to the
  hand.`; `[When Digivolving] You may suspend 2 Digimon or Tamers. Then, 2 of your
  opponent's Digimon or Tamers can't unsuspend until their turn ends.`;
  `[When Digivolving] [When Attacking] By returning 1 other suspended Digimon to the
  bottom of the deck, trash your opponent's top security card.` Option face
  (`optionColorRequirements: ["Green"]`): `＜Use Req. ([DATA SQUAD] trait)＞`,
  `[Main] Suspend 2 of your opponent's Digimon or Tamers. Then, until their turn
  ends, none of their suspended Digimon or Tamers can digivolve or unsuspend.`
- Knowledge base: four Q&A, all 2026-08-18, all load-bearing.
  Q7052 — the `[When Digivolving]` suspension may hit either player's Digimon or
  Tamers, so the target controller is "any", not "opponent".
  Q7053 — the "can't unsuspend" half may name cards this effect did not suspend, so
  the lock targets are chosen independently of the suspend targets, and carry no
  `suspended` precondition.
  Q7054 — a burst digivolve printed without the reminder note still trashes the top
  card of the stack at the end of the turn it digivolved; the standard burst rules
  apply.
  Q7055 — the two `[When Digivolving]` effects trigger simultaneously and the
  controller chooses the activation order, so they must be two separate effect
  records that reach the order-triggers decision, not one concatenated action list.
- Implementation: five effects. (1) `WhenDigivolving` — `Suspend` on
  `{controller: "any", kind: ["Digimon","Tamer"]}, count: 2, optional: true`, then
  `Restrict` `unsuspend` on `{controller: "opponent", kind: ["Digimon","Tamer"]},
  count: 2` for `untilOpponentTurnEnd`; the lock filter carries no `suspended` key,
  which is exactly Q7053. (2) and (3) — `WhenDigivolving` and `WhenAttacking` each
  run `Return` to `deckBottom` on
  `{controller: "any", kind: ["Digimon"], suspended: true, excludeSelf: true}`
  (`excludeSelf` is the printed "other"; `controller: "any"` because the text does
  not say whose), `optional: true`, followed by `SecurityManipulation trashTop`
  against the opponent gated on `condition: {kind: "ifThisEffectActed"}` — the
  return is a printed cost ("By returning …"), so an unpaid cost must not trash
  security. (4) `Static` `WaiveColorRequirement` gated on
  `youHave {nameOrTrait: [{tokens: ["DATA SQUAD"], match: "trait"}]}` — the
  ＜Use Req.＞ encoding. (5) `Main` — the Option face: `Suspend` 2 opposing
  Digimon/Tamers, then two `Restrict`s (`digivolve`, `unsuspend`) over
  `{controller: "opponent", ..., suspended: true}, count: "all"` for
  `untilOpponentTurnEnd`, so the lock covers cards already suspended before the
  effect as well as the two it just suspended. `digivolutionRequirement` carries the
  Lv.6 [DATA SQUAD] cost-5 alternate and the burst alternate
  `{cost: 0, names: ["Rosemon"], burstDigivolve: {returnTamerNamesExact: ["Yoshino
  Fujieda"]}}`. Registration is exclusively `registerIrCard`, `coverage: "full"`,
  `residual: []`.
- Defect corrected: the `[When Digivolving]` suspend target carried `upTo: true`.
  Printed text is "You may suspend 2", not "up to 2": the optionality is the whole
  clause, and a controller who accepts must suspend 2. In
  `targeting/permanents.ts:460` `upTo` sets the selection minimum to 0, so the
  accepted activation could still suspend one card or none — a strictly weaker
  effect than printed, and inconsistent with BT26-049 whose colocated test asserts
  `.not.toHaveProperty("upTo")` for the same "suspend 2" shape. Removed `upTo`;
  the minimum becomes `min(2, candidates)`, which is the printed "do as much as
  possible" behavior and still degrades correctly when fewer than 2 cards exist.
- Primitive trace: `Suspend` (`actions/board.ts:50`) resolves targets, then hands
  legality to `ctx.fx.suspend`, which owns "already suspended" and restriction
  checks and returns a receipt — so an already-suspended card selected as a target
  is a no-op rather than an error. `Restrict … untilOpponentTurnEnd` is the correct
  reading of "until their turn ends" for an effect whose source is mine.
  `ifThisEffectActed` reads `ctx.lastEffectActed`, which `Return` sets from its own
  receipt, so declining the return leaves the security stack untouched.
  `WaiveColorRequirement` routes through `colorWaiverStatic`
  (`builders.ts:433`), which deliberately carries no on-field base guard — the
  waiver has to be live while the card is still in hand, which is the only moment
  `playCard.ts` consults it. `youHave` evaluates as
  `countMatching(ctx, {controller: "mine", ...filter}) >= 1`
  (`conditions.ts:176`). The Option face is reached through `useAs: "option"` and
  its `optionColorRequirements: ["Green"]`, which the waiver bypasses. Burst
  digivolve and the end-of-turn stack trash (Q7054) are engine-owned:
  `burstDigivolvePendingTrash` is set at digivolve time and consumed at
  `OnEndTurn`.
- Behavioral proof: `BT26-050.test.ts` — six cases. Structural: both digivolution
  alternates including the burst shape, the ordered action lists of all three
  Digimon-face effects, and the presence of the `WaiveColorRequirement` static and
  the `Main` Option effect. Positive path: the return-to-deck-bottom cost is paid
  from a suspended own Digimon and the opponent's top security is trashed.
  Q7052/Q7053: two of the controller's own Digimon are suspended while two
  independently chosen opposing cards — neither of them suspended by this effect —
  are locked, proven through `observe(...).isRestricted(..., "unsuspend")`.
  Q7055: the order-triggers decision offers exactly two distinct trigger keys.
  Option face: played as an Option off a [DATA SQUAD] board, it suspends both
  unsuspended opposing Digimon and locks all three — including the one already
  suspended — against both `digivolve` and `unsuspend`. Q7054: the burst route
  returns Yoshino Fujieda to hand, sets `burstDigivolvePendingTrash`, and the former
  top card lands in the trash at `OnEndTurn`.
  The `upTo` removal changes no existing assertion: every case that reaches the
  suspend either supplies at least two candidates and preferred ids, or has a single
  legal candidate, where `min(2, candidates)` and `upTo` agree.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end.

## BT26-051 — Gomimon — 10/10

- Catalog evidence: Black Digimon, Lv.3, forms Stnd./Appmon, Tool attribute, types
  [Trashbin (App Name)]/[Seven Code], play cost 4, DP 4000, evo cost Black Lv.2 for
  0, C, max 4. Printed: `[Digivolve] Lv.2 w/[Appmon] trait: Cost 0`;
  `＜Detach ([Seven Code] trait)＞`; `[Your Turn] [Once Per Turn] When this Digimon
  gets linked, 1 of your Digimon with the [Social], [Tool], [Open] or [Seven Code]
  trait gains ＜Collision＞ and +3000 DP for the turn.` Link side:
  `linkRequirement: "[Link] [Appmon] trait: Cost 3"`,
  `linkEffect: "[When Linking] ＜De-Digivolve 2＞ 1 of your opponent's Digimon."`,
  `linkDp: null`. No inherited text, no Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-051` — no entries. No errata,
  no rulings. Reading is unambiguous: the grant is mandatory (no "may"), it names
  one recipient for both halves ("gains ＜Collision＞ and +3000 DP"), and the
  four-trait list is an OR.
- Implementation: three effects. (1) `Static` carrying only
  `keywords: [{keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞"}]` with an
  empty action list. (2) `YourTurn` / `OncePerTurn` holding a
  `SubTrigger whenLinked` with `sourceFilter: {isSelfRef: true}`; its body is
  `SelectBind` on
  `{controller: "mine", kind: ["Digimon"], nameOrTrait: [Social|Tool|Open|Seven
  Code, all match: "trait"]}, count: 1, bindAs: "grantTarget"`, then `GainKeyword
  Collision` and `ModifyDP +3000`, both aimed at `{boundRef: "grantTarget"}` for
  `forTheTurn`. (3) `Static` with `isLinked: true` holding a
  `SubTrigger whenLinked` / `sourceFilter {isSelfRef: true}` running
  `DeDigivolve amount: 2` on `{controller: "opponent", kind: ["Digimon"]}, count: 1`
  — the link-face effect, which only exists while this card is the link card.
  `digivolutionRequirement: [{level: 2, traits: ["Appmon"], cost: 0}]`,
  `linkRequirement: [{traits: ["Appmon"], cost: 3}]`. Registration is exclusively
  `registerIrCard`, `coverage: "full"`, `residual: []`.
- Defect corrected: none. The IR matches every printed clause.
- Primitive trace: the `SelectBind` → `boundRef` pattern is what forbids splitting
  the two halves of the grant across two Digimon. `SelectBind`
  (`actions/combat.ts:100`) resolves the target once, stores the chosen permanent
  under `ctx.selections`/`ctx.boundPlayed`, and both consumers read that single
  handle — without it, `GainKeyword` and `ModifyDP` would each open their own
  selection and the printed "1 of your Digimon … gains X and +3000" would become two
  independent choices. `nameOrTrait` entries OR together, so the four traits form
  one pool rather than a conjunction. `frequency: "OncePerTurn"` on the enclosing
  effect (not on the `SubTrigger`) is what caps the grant at one per turn across
  repeated links. The `isLinked: true` marker on effect (3) is the BT26 house idiom
  for a link-face clause — the same shape as BT26-019 and BT26-037 — and confines
  the ＜De-Digivolve 2＞ to the turns where this card sits as a link card. Effect (1)
  reaches `GainKeyword` through the keyword-only branch of the effect runner
  (`interpreter/effect.ts:542`), which grants `permanent` duration for a `Static`
  trigger.
- Behavioral proof: `BT26-051.test.ts` — five cases. Structural: link requirement,
  Detach keyword, the `YourTurn`/`OncePerTurn` shape with `SelectBind` before both
  grants, the explicit absence of `isLinked` on effect (2), and its presence on
  effect (3). Runtime keyword: `Detach` observable on the permanent. Positive path:
  linking BT26-019 onto Gomimon lifts it from 4000 to 7000 DP and grants
  ＜Collision＞. Single-recipient boundary: with two eligible Digimon on board,
  exactly one gains ＜Collision＞ and that same one — not the other — gains the
  +3000. Link face: Gomimon linked onto an Appmon host applies ＜De-Digivolve 2＞,
  peeling the opposing stack down to its bottom card and trashing both removed
  cards. Once-per-turn: two links in one turn produce one grant (DP stays 7000).
  Gaps recorded, not closed: no case proves the `[Your Turn]` gate by linking on the
  opponent's turn, and no case builds a mixed trait pool that includes a
  near-matching non-eligible Digimon alongside the four eligible traits. Both need a
  test run to land safely, so they are recorded here rather than written blind.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. No file changed for this card.

## BT26-052 — Pristimon — 10/10

- Catalog evidence: Black Digimon, Lv.3 Rookie, Vaccine, types
  [Puppet]/[Glowing Dawn]/[BEATBREAK], play cost 3, DP 2000, evo cost Black Lv.2 for
  0, C, max 4. Printed: `[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0`;
  `[On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Glowing Dawn]
  trait and 1 black card with the [BEATBREAK] trait among them to the hand. Return
  the rest to the bottom of the deck.`; `inheritedEffectText: "＜Reboot＞"`. No
  Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-052` — no entries. No errata,
  no rulings. Two points need care from the printed text alone: the two add slots
  are independent filters (the second adds the color condition on top of the trait),
  and a single revealed card can only fill one slot, since "1 card … and 1 black
  card" names two cards.
- Implementation: two effects. (1) `OnPlay` running one `RevealAdd` with
  `revealCount: 3`, `rest: "deckBottom"`, and an `add` array of two independent
  slots: `{filter: {nameOrTrait: [{tokens: ["Glowing Dawn"], match: "trait"}]},
  count: 1, to: "hand"}` and `{filter: {colors: ["Black"], nameOrTrait: [{tokens:
  ["BEATBREAK"], match: "trait"}]}, count: 1, to: "hand"}`. The add is mandatory —
  no `optional` — matching the printed text, which has no "may". (2) `Static` with
  `isInherited: true`, an empty action list and
  `keywords: [{keyword: "Reboot", raw: "＜Reboot＞"}]`.
  `digivolutionRequirement: [{level: 2, traits: ["Glowing Dawn"], cost: 0,
  isAlternate: true}]` — note the alternate carries no color, which is what makes
  the cost-0 route legal off a differently colored Lv.2 [Glowing Dawn] card.
  Registration is exclusively `registerIrCard("BT26-052", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none. Every printed clause maps to IR with no approximation.
- Primitive trace: `RevealAdd`'s two-entry `add` array is the shape that keeps the
  slots independent; a single filter with `count: 2` would have required both cards
  to satisfy the same predicate and would have mis-read the printed text. The second
  slot's `colors: ["Black"]` is a conjunct with the trait, not an alternative, which
  is the correct reading of "1 black card with the [BEATBREAK] trait". `rest:
  "deckBottom"` covers "Return the rest to the bottom of the deck" and, because the
  slots are mandatory-but-satisfiable-by-none, a reveal with no match simply bottoms
  all three. The inherited ＜Reboot＞ resolves through the keyword-only branch of the
  effect runner (`interpreter/effect.ts:542`), plus the explicit `isRebootMarker`
  path immediately below it that grants `Reboot` at `EffectDuration.Permanent` to
  the host permanent — so a stack carrying this card unsuspends in the unsuspend
  phase of both turns.
- Behavioral proof: `BT26-052.test.ts` — five cases. Structural: the digivolution
  alternate, `coverage`/`residual`, the `RevealAdd` shape with two `count: 1` slots
  and `rest: "deckBottom"`, and the inherited Reboot record. Positive path with a
  mixed pool: deck top three are BT25-035 ([Glowing Dawn]), BT26-093 (black
  [BEATBREAK]) and BT1-009 (neither) — the first two land in hand, the third is the
  only card left in the deck. Double-count boundary: revealing a copy of BT26-052
  itself, which carries both [Glowing Dawn] and black [BEATBREAK] and therefore
  qualifies for both slots, adds that one card exactly once and bottoms the other
  two. Digivolution requirement: the cost-0 alternate fires off BT25-003, a Lv.2
  [Glowing Dawn] card of a different color, and memory does not move. Inherited
  effect: BT26-052 under a BT26-055 host publishes ＜Reboot＞ on the host.
  Gap recorded, not closed: no case proves that a *non-black* [BEATBREAK] card is
  rejected by the second slot while still being eligible for nothing else. The
  positive case covers the conjunct only indirectly.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. No file changed for this card.

## BT26-053 — Wolvermon — 10/10

- Catalog evidence: Black Digimon, Lv.4 Champion, Vaccine, types
  [Cyborg]/[Glowing Dawn]/[BEATBREAK], play cost 5, DP 5000, evo cost Black Lv.3 for
  2, U, max 4. Printed: `[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2`;
  `＜Blocker＞`; `[All Turns] [Once Per Turn] When attack targets change, by trashing
  the bottom face-down card from under any of your Tamers, you may use 1 Option card
  with the [Glowing Dawn] trait and a use cost of 4 or less from your hand without
  paying the cost.`; `inheritedEffectText: "＜Blocker＞"`. No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-053` — no entries. No errata,
  no rulings. The clause structure matters and is unambiguous on the printed text:
  "by trashing …" is an activation cost, so an unpayable or refused cost means no
  Option is used and — because the use never happened — the once-per-turn budget
  must survive.
- Implementation: three effects. (1) `Static` carrying
  `keywords: [{keyword: "Blocker"}]` with an empty action list. (2) `AllTurns` /
  `frequency: "OncePerTurn"` holding a `SubTrigger whenAttackTargetSwitched` whose
  body is a single `CostGatedBlock` with
  `cost: {kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1}`,
  `optional: true`, `abortOnDecline: true`, wrapping one `UseOptionWithoutCost` on
  `{controller: "mine", zone: "hand", kind: ["Option"], playCostLte: 4,
  nameOrTrait: [{tokens: ["Glowing Dawn"], match: "trait"}]}` with `from: ["hand"]`,
  `payCost: false`, `selectionRequired: true`. (3) `Static` with `isInherited: true`,
  empty actions, `keywords: [{keyword: "Blocker"}]`.
  `digivolutionRequirement: [{level: 3, traits: ["Glowing Dawn"], cost: 2}]`.
  Registration is exclusively `registerIrCard`, `coverage: "full"`, `residual: []`.
- Defect corrected: the `UseOptionWithoutCost` lacked `allowMultiColor: true`.
  `borrowed.ts:385` rejects every Option whose `colors.length !== 1` unless the
  action opts in, and the printed clause imposes no single-color restriction — the
  only restrictions are the [Glowing Dawn] trait and use cost 4 or less. Four
  printed cards fall exactly inside that window and are dual-colored, all of them
  Digimon/Option dual cards used off their Option face: BT25-057 Monarchlizamon
  (Green/Black, cost 4), BT26-031 Murasamemon (Yellow/Blue, cost 4), BT26-057
  Bearcatmon (Black/Red, cost 4) and BT26-075 ScourgeChiropmon (Purple/Yellow,
  cost 4). Without the flag every one of them was silently dropped from the pool,
  leaving only the mono-colored P-236 and ST23-15 reachable. Added
  `allowMultiColor: true`, matching the BT25-085 / BT26-012 / BT26-104 idiom. The
  chosen Option's own color requirement is still enforced separately by
  `optionColorRequirementMet` in the same function, so this does not turn the effect
  into a color bypass.
- Primitive trace: `CostGatedBlock` is what encodes "by …, you may …" as one atomic
  activation — `abortOnDecline: true` makes a refusal or an unpayable cost stop the
  block instead of falling through to a free Option use.
  `runAction.ts:206-213` preflights the nested `UseOptionWithoutCost`: when
  `selectionRequired` is set and `canAttemptUseOptionWithoutCost` finds no legal
  Option, the block aborts *before* the optional prompt and before `payCost`, so the
  face-down Tamer card is never spent on an effect that could not do anything.
  `trashBottomFaceDownUnderTamer` matches the printed cost exactly: bottom card,
  face-down only, from under a Tamer the controller owns — a face-up bottom card is
  not a legal payment. `frequency: "OncePerTurn"` sits on the enclosing `AllTurns`
  effect, so the budget is consumed by the activation, not by the trigger firing;
  because the aborts above happen before activation, a failed attempt leaves the use
  intact. The main-face ＜Blocker＞ and the inherited ＜Blocker＞ are two separate
  records — the inherited one carries `isInherited: true` and so publishes on the
  host of a stack containing this card, not on Wolvermon.
- Behavioral proof: `BT26-053.test.ts` — five cases. Structural: the digivolution
  alternate, the main-face Blocker keyword, the full `AllTurns`/`OncePerTurn` →
  `whenAttackTargetSwitched` → `CostGatedBlock` shape including the exact cost
  record, and the inherited Blocker record. Positive path: the target-switch trigger
  pays with a face-down card from under a Tamer and the P-236 [Glowing Dawn] Option
  leaves the hand. Cost boundary: with the bottom card under the Tamer face *up*,
  nothing is paid and the Option stays in hand — the "face-down" half of the cost is
  proven, not assumed. Preflight negative: with a payable cost but no legal Option
  in hand, `s.decisions` is empty and the face-down card is still under the Tamer —
  proving the abort happens before both the prompt and the payment. Once-per-turn:
  two target switches in one turn consume one face-down card and one P-236.
  Inherited: Blocker observable on both Wolvermon and on a BT26-055 host carrying
  BT26-053 in its stack.
  Gap recorded, not closed: no case uses a dual-colored [Glowing Dawn] Option, which
  is the fix above; adding one needs a run to confirm harness selection behavior
  across the two-color option face.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. The change adds one key to an existing action; the colocated
  structural assertion uses `toMatchObject`, so it does not constrain the new key.

## BT26-054 — Andromon — 10/10

- Catalog evidence: Black/Yellow Digimon, Lv.5 Ultimate, Vaccine, types
  [Cyborg]/[CS], play cost 7, DP 7000, evo costs Black Lv.4 for 4 and Yellow Lv.4
  for 4, U, max 4. Printed: `[Digivolve] Lv.4 w/[CS] trait: Cost 3`;
  `[On Play] [When Digivolving] You may play 1 [CS] trait Tamer card from your hand
  without paying the cost. This effect can't play cards with the same name as any of
  your Tamers.`; `[All Turns] [Once Per Turn] When effects place [CS] trait Digimon
  cards in this Digimon's digivolution cards, this Digimon may digivolve into a [CS]
  trait Digimon card in the hand without paying the cost.`;
  `inheritedEffectText: "[Opponent's Turn] [Once Per Turn] When one of your
  opponent's Digimon attacks, you may change the attack target to this Digimon."`
  No Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-054` — no entries. No errata,
  no rulings. Three points are settled by the printed text: the exclusion is scoped
  to *Tamers* you control (not to your board generally); the second effect fires
  only on placement *by effects* and only into *this* Digimon's own stack; and the
  redirect is inherited, so "this Digimon" means the host of the stack.
- Implementation: four effects. (1) `OnPlay` and (2) `WhenDigivolving`, each running
  one `PlayWithoutCost` on the shared `csTamer` target
  (`{controller: "mine", zone: "hand", kind: ["Tamer"], nameOrTrait: [{tokens:
  ["CS"], match: "trait"}], excludeSameNameAsOwnTamers: true}, count: 1`) with
  `from: ["hand"]`, `payCost: false`, `optional: true`. Two records rather than one
  is correct: the clause is not once-per-turn, and a given instance can legitimately
  reach only one of the two timings. (3) `AllTurns` / `frequency: "OncePerTurn"`
  holding a `SubTrigger onAddDigivolutionCards` with `sourceFilter {isSelfRef: true}`,
  `requireByEffect: true`, and
  `addedDigivolutionCardFilter: {kind: ["Digimon"], nameOrTrait: [{tokens: ["CS"],
  match: "trait"}]}`, whose body is a `Digivolve` of self
  (`target {isSelfRef: true}, isSelf: true`) `into` a hand [CS] Digimon with
  `from: ["hand"]`, `payCost: false`, `optional: true`. (4) `OpponentsTurn` with
  `isInherited: true` and `frequency: "OncePerTurn"`, holding a
  `SubTrigger whenOpponentAttacks` running `RedirectAttack` at
  `{isSelfRef: true}, isSelf: true`, `optional: true`.
  `digivolutionRequirement: [{level: 4, traits: ["CS"], cost: 3}]`. Registration is
  exclusively `registerIrCard`, `coverage: "full"`, `residual: []`.
- Defect corrected: the two `PlayWithoutCost` actions encoded "the same name as any
  of your Tamers" as `notSameNameAs: ["battleArea"]`. That primitive
  (`actions/play.ts:375-395`) collects the `nameEn` of **every** top card in the
  controller's battle area, Digimon included, and drops any candidate matching one
  of them — a strictly broader exclusion than printed. The precise primitive already
  exists: the filter key `excludeSameNameAsOwnTamers`
  (`cardPredicates.ts:140`, consumed at `actions/play.ts:334`), documented as
  "candidate's effective name must differ from every Tamer the controller has in
  play". It is also more faithful in a second way: it compares through
  `effectiveStaticNames`, so a card whose name is granted or extended by a `[Rule]`
  line is compared on its effective names rather than its printed `nameEn`, which is
  what "any of your Tamers" means at the rules level. Replaced `notSameNameAs` with
  `excludeSameNameAsOwnTamers: true` on the shared `csTamer` filter.
  Scope note: no card in `cards.json` is printed as both a Digimon and a Tamer under
  the same name (checked across the whole corpus — zero overlaps), so the previous
  encoding was not *observably* wrong with today's card pool. It was wrong in kind,
  and it would become wrong in fact the moment such a card is printed. The fix is
  the smaller and more exact IR, so it stands regardless.
- Primitive trace: `excludeSameNameAsOwnTamers` is applied after
  `candidateLooseInstances` in `runPlayAction`, so it narrows the candidate pool
  before the selection prompt rather than failing at resolution; `definitionMatches`
  does not read the key at all, which is correct — it is a board-state predicate and
  is inert in the pure definition matcher. On effect (3), `requireByEffect: true`
  is what implements the printed "When **effects** place …": a placement performed
  outside an effect resolution does not fire the trigger, and
  `addedDigivolutionCardFilter` restricts the reaction to [CS] *Digimon* cards, so a
  [CS] Tamer or Option placed under this Digimon is not a trigger.
  `sourceFilter {isSelfRef: true}` pins the watcher to this Digimon's own stack, not
  to any stack. `frequency: "OncePerTurn"` sits on the enclosing effect so repeated
  placements in one turn yield one free digivolution. On effect (4), `isInherited`
  routes the record through the inherited-effect path, where `isSelfRef` resolves to
  the *host* permanent carrying the card in its stack — which is what makes "change
  the attack target to this Digimon" mean the host. `RedirectAttack` with
  `optional: true` preflights candidates before prompting
  (`runAction.ts:192-197`), so the redirect is not offered when the host cannot
  legally receive the attack.
- Behavioral proof: `BT26-054.test.ts` — five cases. Structural: the digivolution
  alternate, the `OnPlay`/`WhenDigivolving` pair, and the exact `SubTrigger` shape of
  effects (3) and (4) including `requireByEffect` and the added-card filter.
  Positive path: `OnPlay` plays BT22-083 Yuuko Kamishiro, a [CS] Tamer, from hand.
  Name-exclusion boundary with a mixed pool: with a Yuuko already in the battle area
  and both a second Yuuko and BT22-084 Nokia Shiramine in hand, the duplicate stays
  in hand and Nokia is the card played — this is the assertion that pins the
  corrected filter, and it passes identically under
  `excludeSameNameAsOwnTamers` because the excluded card is a Tamer.
  Effect-attribution positive: a [CS] Digimon placed under Andromon inside an effect
  resolution triggers a free digivolution into BT26-058 with memory unchanged.
  Effect-attribution negative: firing `onAddDigivolutionCards` without effect
  attribution does nothing and the hand card stays put.
  Inherited redirect in a real stack: BT26-054 under a BT26-055 host redirects an
  opposing attack away from the player, leaving security untouched and the host
  alive.
  Gap recorded, not closed: no case proves the once-per-turn cap on either effect
  (3) or the inherited redirect, and none proves that a *Digimon* sharing a name
  with a hand candidate does not block it — the case that would have distinguished
  the two encodings. It is unconstructible with the current card pool.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. The change swaps one filter key for another on the shared target
  object; the colocated structural assertion uses `toMatchObject` over
  `{kind, payCost, optional}` and does not reference either key.

## BT26-055 — Giromon — 10/10

- Catalog evidence: Black Digimon, Lv.5 Ultimate, Vaccine, types
  [Mine]/[DM]/[Ver.3], play cost 7, DP 7000, evo cost Black Lv.4 for 3, U, max 4.
  Printed: `[Digivolve] Lv.4 w/[DM] trait: Cost 3`; `＜Fragment (2)＞`;
  `[On Play] [When Digivolving] [Counter] [Once Per Turn] You may place 1 card in
  your hand face down as this Digimon's bottom digivolution card. Then, you may
  delete 1 of your Digimon with the [Ver.3] trait and all of your opponent's Digimon
  with the lowest play cost.`;
  `inheritedEffectText: "[All Turns] [Once Per Turn] When this Digimon would leave
  the battle area, trash your opponent's top security card."` No Security text.
  Note that Giromon itself carries [Ver.3], so it is a legal self-sacrifice for its
  own deletion clause.
- Knowledge base: one Q&A. Q7058 (2026-08-18) — a [Counter] effect cannot be
  followed by another [Counter] effect; only one [Counter] may be activated during
  one attack. This is a general counter-timing constraint (comprehensive §11-3-2),
  owned by the engine's counter window rather than by this card's IR, so the card's
  obligation is only to register as an eligible counter and to respect the window's
  single-activation rule.
- Implementation: five effects. (1) `Static` carrying
  `keywords: [{keyword: "Fragment", amount: 2}]` with an empty action list.
  (2) `OnPlay`, (3) `WhenDigivolving` and (4) `Counter` — all three carry
  `frequency: "OncePerTurn"` and the same
  `sharedUseKey: "bt26-055-place-delete"`, and all three run the identical `body`:
  `PlaceUnder` of one hand card (`target {controller: "mine", zone: "hand"},
  count: 1`) with `underFilter {isSelfRef: true}`, `position: "bottom"`,
  `faceDown: true`, `optional: true`; then `SelectBind` on
  `{controller: "mine", kind: ["Digimon"], nameOrTrait: [{tokens: ["Ver.3"],
  match: "trait"}]}, count: 1, bindAs: "ownVer3ToDelete"` with `optional: true`,
  `abortOnDecline: true`; then `Delete {boundRef: "ownVer3ToDelete"}, count: 1`;
  then `Delete {controller: "opponent", kind: ["Digimon"], superlative:
  "lowestPlayCost"}, count: "all"`. (5) `AllTurns` with `isInherited: true` and
  `frequency: "OncePerTurn"`, holding a `SubTrigger whenLeavesPlay` with
  `sourceFilter {isSelfRef: true}` running `SecurityManipulation trashTop` against
  the opponent for 1. `digivolutionRequirement: [{level: 4, traits: ["DM"],
  cost: 3}]`. Registration is exclusively `registerIrCard`, `coverage: "full"`,
  `residual: []`.
- Defect corrected: none. The IR matches the printed text and Q7058.
- Primitive trace: `sharedUseKey` across the three timing records is what makes
  "[On Play] [When Digivolving] [Counter] [Once Per Turn]" a single budget rather
  than three; without it a card played and then digivolved in one turn would fire
  twice. The second "you may" governs *both* deletions jointly ("delete 1 of your
  … **and** all of your opponent's …"), which is why the `SelectBind` — not either
  `Delete` — carries `optional: true, abortOnDecline: true`: declining stops the
  whole pair, while accepting runs both. `SelectBind` (`actions/combat.ts:100`)
  never aborts on its own; when it resolves to nothing it simply leaves the handle
  unset, so the dependent `Delete {boundRef: …}` deletes nothing and the opposing
  deletion still runs — which is the correct "do as much as possible" reading when
  the controller has no [Ver.3] Digimon. Splitting the choice from the deletions
  also prevents the two `Delete`s opening two independent prompts.
  `superlative: "lowestPlayCost"` with `count: "all"` deletes every tied opponent
  Digimon, not one of them. On effect (5), `isInherited` makes `isSelfRef` resolve
  to the host permanent carrying this card in its stack, so "this Digimon would
  leave the battle area" is the host's departure, and `whenLeavesPlay` fires on the
  would-leave edge rather than after the card is gone. ＜Fragment (2)＞ is
  engine-owned: the counter window offers the trash-2-digivolution-cards survival
  payment.
- Ambiguity recorded: the printed "Then," between the placement and the deletion is
  not gated in the IR — declining the placement still offers the deletion. The KB
  offers no rule text for "Then" as a gate, and the one adjacent data point cuts the
  other way: Q7059 on BT26-056 confirms that "Trash 1 card in your hand. Then,
  ＜De-Digivolve 3＞ …" still performs the post-"Then" half when the first half does
  nothing. With the second clause carrying its own independent "you may", treating
  "Then" as sequencing rather than as a condition is the reading the colocated test
  encodes deliberately. Recorded rather than changed.
- Behavioral proof: `BT26-055.test.ts` — seven cases. Structural: the digivolution
  alternate, the three-way `sharedUseKey`, the ＜Fragment (2)＞ keyword with its
  amount, the `SelectBind`/`Delete`/`Delete` ordering with `abortOnDecline`, and the
  inherited `whenLeavesPlay` record. Inherited positive: BT26-055 under a BT1-009
  host, host deleted by effect, opponent's only security card trashed.
  Positive path with a tied pool: two opposing BT1-009 (low cost) and one BT1-082
  (higher) — both low-cost copies are deleted, the higher one survives, and Giromon
  deletes itself as its own [Ver.3] sacrifice. Meaningful negative: declining the
  combined deletion leaves both boards intact. Joint-optionality boundary: declining
  the placement, then accepting the deletion, keeps the hand card and still deletes
  both the chosen own [Ver.3] Digimon and the opposing Digimon — the case that pins
  the "Then" reading above. Shared budget: `OnPlay` then `WhenDigivolving` in one
  turn leaves the higher-cost opposing Digimon alive, proving the second activation
  never happened. ＜Fragment (2)＞: attacked at a DP deficit, Giromon trashes exactly
  its two digivolution cards, both land in trash, and it survives combat.
  Q7058: it appears in `counterWindowOpened.eligibleCounters`, its first
  `respondCounter` is accepted, and a second `respondCounter` on the same attack is
  rejected.
  Gap recorded, not closed: no case runs the body with **zero** [Ver.3] Digimon on
  the controller's board to prove the opposing deletion still resolves. The trace
  above shows `SelectBind` cannot abort on an empty resolution, but the assertion is
  missing and would need a run to add safely.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. No file changed for this card.

## BT26-056 — Cerberusmon: Werewolf Mode / Inferno Divide — 10/10

- Catalog evidence: dual card (`isDualCard: true`), kinds Digimon + Option, colors
  Black/Purple, Lv.5 Ultimate, Vaccine, types [Wizard]/[Titan]/[TS], play cost 3,
  DP 8000, evo costs Black Lv.4 for 4 and Purple Lv.4 for 4, R, max 4. Digimon face:
  `[Digivolve] [Cerberusmon]: Cost 1`; `[Digivolve] Lv.4 w/[TS] trait: Cost 3`;
  `＜Jamming＞`; `＜Reboot＞`; `＜Blocker＞`; `[On Deletion] You may play 1 level 4 or
  lower Digimon card with the [Titan] trait from your trash without paying the
  cost.`; `[Rule] Trait: Has [Dark Animal] Type.` Option face
  (`optionColorRequirements: ["Black"]`): `＜Use Req. ([TS] trait)＞`,
  `[Main] Trash 1 card in your hand. Then, ＜De-Digivolve 3＞ 1 of your opponent's
  Digimon.` No inherited text, no Security text. Note the card is itself Lv.5 with
  the [Titan] trait, so it must not be eligible for its own [On Deletion] replay.
- Knowledge base: one Q&A. Q7059 (2026-08-18) — with no cards in hand you may still
  use Inferno Divide's `[Main]` effect and ＜De-Digivolve 3＞ an opposing Digimon
  without trashing a card. So the hand trash is an effect step, not an activation
  cost, and the post-"Then" half runs even when the first half does nothing.
- Implementation: four effects. (1) `Static` carrying
  `keywords: [Jamming, Reboot, Blocker]` together with a `GrantStatic` of
  `grant: "trait", tokens: ["Dark Animal"], duration: "permanent"` on
  `{isSelfRef: true}, isSelf: true`. (2) `OnDeletion` running one `PlayWithoutCost`
  on `{controller: "mine", zone: "trash", kind: ["Digimon"], levelComparison:
  {op: "lte", value: 4}, nameOrTrait: [{tokens: ["Titan"], match: "trait"}]},
  count: 1` with `from: ["trash"]`, `payCost: false`, `optional: true`.
  (3) `Static` `WaiveColorRequirement` gated on
  `youHave {controller: "mine", nameOrTrait: [{tokens: ["TS"], match: "trait"}]}`
  — the ＜Use Req.＞ encoding. (4) `Main` — the Option face:
  `Trash {controller: "mine", zone: "hand"}, count: 1` then
  `DeDigivolve amount: 3` on `{controller: "opponent", kind: ["Digimon"]}, count: 1`.
  Neither action carries `abortOnDecline`, which is precisely Q7059.
  `digivolutionRequirement` holds both alternates,
  `{names: ["Cerberusmon"], cost: 1}` and `{level: 4, traits: ["TS"], cost: 3}`.
  Registration is exclusively `registerIrCard`, `coverage: "full"`, `residual: []`.
- Defect corrected: none. The IR matches the printed text and Q7059.
- Primitive trace: the `[Rule] Trait` line is honored in **every zone** without the
  card's IR doing anything — `staticTraitsOf` (`cards/cardData.ts:293-300`) parses
  `/\[Rule\]\s*Trait:\s*Has(?:\s+the)?\s*\[([^\]]+)\]/` straight out of `effectText`
  and appends the result to forms ∪ attributes ∪ types, so a search or filter that
  reads this card in hand, deck or trash already sees [Dark Animal]. The
  `GrantStatic` in effect (1) is the battle-area runtime mirror of the same fact,
  matching the BT26-029 idiom (`trigger: "Static"` + `duration: "permanent"`); the
  older BT19-018 idiom uses `trigger: "Rule"`, which `interpreter/effect.ts` treats
  identically to `Static` at every branch (lines 224, 248, 278, 542, 563), so the
  two encodings are equivalent. `WaiveColorRequirement` is routed through
  `colorWaiverStatic` (`builders.ts:433`), which deliberately drops the on-field base
  guard so the waiver is live while the card is still in hand — the only moment
  `playCard.ts` reads it; `statics.ts:167-186` accepts a target-less action as
  self-targeted, and with no `color` key it is the blanket "ignore this card's color
  requirements" form rather than the "also counts as colour X" form. `youHave`
  resolves as `countMatching(ctx, {controller: "mine", ...filter}) >= 1`
  (`conditions.ts:176`). On effect (2), `levelComparison {op: "lte", value: 4}`
  is what excludes the card's own Lv.5 copy from the trash pool. On effect (4),
  `Trash` with `count: 1` and no `upTo` resolves to `min(1, candidates)` — 0 with an
  empty hand — and returns without aborting, so `DeDigivolve` still runs: Q7059
  falls out of the primitive rather than needing a special case.
- Behavioral proof: `BT26-056.test.ts` — seven cases. Structural: both digivolution
  alternates, the three keywords, the `OnDeletion` play-from-trash shape, the
  `WaiveColorRequirement` static, and the `Main` `Trash` → `DeDigivolve 3` order.
  Positive path: deleted by effect, it plays BT26-021 — a Lv.4-or-lower [Titan]
  card — from trash. Level boundary and self-exclusion: with an empty trash it does
  not replay its own Lv.5 [Titan] card, and the source instance ends in the trash.
  Runtime statics: Jamming, Reboot and Blocker are all observable on the permanent,
  and `hasEffectiveTrait(..., "Dark Animal")` confirms the rule trait.
  Both digivolution routes: the `[Cerberusmon]` name route off BT1-039 for 1 memory
  and the Lv.4 [TS] trait route off BT26-021 for 3, each asserted through the
  memory delta. Option face positive: played off a [TS] board with a hand card
  available, BT1-001 lands in the trash and a three-deep opposing stack is stripped
  to nothing. Q7059: the same play with an empty hand still strips the stack, and
  the hand is empty afterwards — proving the trash is not a gate.
  Gap recorded, not closed: no case proves the ＜Use Req.＞ *negative* — that with no
  [TS] card in play, Inferno Divide's printed Black requirement is enforced against
  an off-color seat. The generic version of that assertion already exists in
  `ch16c-deletion-and-advanced-keywords.test.ts` against BT25-093.
- Verification: not run — the coordinator runs the BT26 suite and `pnpm typecheck`
  once at the end. No file changed for this card.

## BT26-057 — Bearcatmon / Penetrate Blow — 10/10

- Catalog evidence: Black/Red DUAL card (`kinds: ["Digimon","Option"]`, `isDualCard: true`,
  `dualEffect: "Penetrate Blow"`), Lv.5 Ultimate, Vaccine, play cost 4, DP 8000, SR, max 4.
  Traits `[Beastkin]`, `[Glowing Dawn]`, `[BEATBREAK]`. Printed evo costs Black Lv.4 / Red Lv.4
  for 4; alternate `[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3`. Digimon side:
  `[When Digivolving]` trash the bottom face-down card from under any of your Tamers →
  until your opponent's turn ends their Digimon effects don't affect this Digimon and it
  gets +3000 DP; `[All Turns] [Once Per Turn]` when attack targets change **or** effects
  trash cards from under your Tamers, this Digimon may unsuspend. Option side
  (`optionColorRequirements: ["Black"]`): `＜Use Req. ([Glowing Dawn] trait)＞`, `[Main]`
  `＜De-Digivolve 1＞` 1 opposing Digimon, then give 1 opposing Digimon
  "[Start of Your Main Phase] This Digimon attacks." until their turn ends.
- Knowledge base: seven Q&A (Q7060–Q7066), all on "effects don't affect". Q7062 — an immune
  card can still be *chosen*. Q7063 — it can still be *given* an effect, it just isn't
  affected by it. Q7060/Q7066 — a granted trigger on an immune Digimon does **not** fire while
  the immunity is live; Q7065 — it fires again once the immunity lapses. Comprehensive §16-42
  fixes `＜Use Req.＞` as "ignore the color requirements while you have the specified cards"
  (a persistent effect, §15-8-2). No errata.
- Implementation: `apps/api/src/cards/BT26/BT26-057.ts`. Four effect blocks, registered only
  via `registerIrCard("BT26-057", compiled)` with `coverage: "full"`, `residual: []`.
  (1) `WhenDigivolving` → `CostGatedBlock` with `cost.kind: "trashBottomFaceDownUnderTamer"`
  (`controller: "mine"`, count 1), `optional: true`, `abortOnDecline: true`, body =
  `Restrict beAffected` (`fromSourceKind: ["Digimon"]`, `byOpponentEffectsOnly: true`,
  `untilOpponentTurnEnd`) + `ModifyDP +3000 untilOpponentTurnEnd`. Both halves share one
  cost gate, so a failed/declined payment grants neither.
  (2) `AllTurns` `frequency: "OncePerTurn"` holding **two** `SubTrigger` watchers —
  `whenAttackTargetSwitched` (unscoped: all turns, either player's attack) and
  `whenDigivolutionTrashed` with `sourceFilter { controller: "mine", kind: ["Tamer"],
  byEffect: true }` — each running `Unsuspend` on self with `optional: true` ("may").
  (3) `Static` carrying only `WaiveColorRequirement` gated on
  `youHave { controller: "mine", nameOrTrait: [{tokens:["Glowing Dawn"], match:"trait"}] }`.
  (4) `Main` (Option side) → `DeDigivolve amount 1` on 1 opposing Digimon, then
  `GainTriggeredEffect` on 1 opposing Digimon with `gainedTrigger: "StartOfYourMainPhase"`,
  `gainedActions: [{ kind: "Attack", target: self }]`, `duration: "untilOpponentTurnEnd"`.
  `digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }]`.
- Primitive trace: `trashBottomFaceDownUnderTamer` is a first-class cost kind
  (`interpreter/costs.ts:102` availability probe, `:450` payment; also allowlisted in
  `registration/reducers.ts:53`) — it requires a Tamer with a face-down bottom card, so the
  block is not even offered otherwise. `withSubTriggerFrequency`
  (`interpreter/effect.ts:391`) copies the effect-level `OncePerTurn` onto **every**
  `SubTrigger`/`Replacement` in that block as one shared `oncePerTurnKey`, which is exactly
  what "[All Turns] [Once Per Turn] when A or B" needs — the two watchers spend one budget.
  `whenAttackTargetSwitched` is fired by `combat/controller.ts:640` (blocker) and `:1041`
  (target switch); its self-scoping gate (`actions/subTrigger.ts:400+`) applies only when the
  IR marks a self-referencing `sourceFilter`, so leaving it off is correct for a clause that
  watches *any* attack-target change. `WaiveColorRequirement` with no `target` defaults to the
  source card (`actions/statics.ts:167-188`), and a `Static` block containing only that action
  routes through `builders.ts colorWaiverStatic`, whose base guard is `() => true` so the
  waiver is live while the card is still in hand — the only moment `playCard.ts`'s color gate
  reads it. `youHave` force-applies `controller: "mine"` (`conditions.ts:176`).
- Behavioral proof: `BT26-057.test.ts`, 6 cases. IR shape; positive path (11000 DP, the
  face-down under-card gone from the Tamer, `isRestrictedByEffect(..., "beAffected",
  "Digimon")`); negative path (the only under-card is **face up** → no DP, no immunity —
  proves the "bottom **face-down**" boundary); source-kind boundary (an opposing *Digimon*
  effect's −3000 DP is ignored while an opposing *Option* effect's −1000 lands, so the
  immunity is kind-scoped, not blanket); shared once-per-turn (unsuspends on
  `whenDigivolutionTrashed`, then a `whenAttackTargetSwitched` in the same turn leaves it
  suspended); and a Q7060/Q7062–Q7066 stack case — the Option side is *used* (paying through
  the `＜Use Req.＞` waiver) on an opponent Digimon that is immune to Option effects: the
  De-Digivolve is refused (stack unchanged, Q7062/Q7063 — it is still chosen and still gains
  the subscription), the granted `[Start of Your Main Phase]` attack does **not** fire while
  the immunity is live (Q7066), and it *does* fire after the immunity is swept (Q7065).
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-058 — HiAndromon — 10/10

- Catalog evidence: Black/Yellow Lv.6 Mega, Vaccine, play cost 12, DP 12000, R, max 4.
  Traits `[Cyborg]`, `[CS]`. Printed evo costs Black Lv.5 / Yellow Lv.5 for 4; alternate
  `[Digivolve] Lv.5 w/[CS] trait: Cost 3`. `＜Reboot＞`, `＜Blocker＞`.
  `[When Digivolving] [When Attacking] [Once Per Turn]` your opponent's Digimon effects don't
  affect 1 of your `[CS]` trait Digimon until their turn ends.
  `[All Turns]` when any of your `[CS]` trait Digimon would leave the battle area, by placing
  this Digimon's top stacked card as its bottom digivolution card, they don't leave.
- Knowledge base: `node tools/kb/query.mjs card BT26-058` — no entries; no errata, no
  restriction. The two load-bearing vocabulary items are resolved from siblings instead:
  "effects don't affect" by BT26-057's Q7060–Q7066 (choosable, grantable, but unaffected),
  and "top stacked card" by BT26-060's Q7081, which establishes that the *whole pile* counts
  as stacked cards and that a lone remaining card is not one — so "top stacked card" is the
  top card of the pile, not the topmost digivolution card. No unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT26/BT26-058.ts`. Four blocks, registered only via
  `registerIrCard("BT26-058", compiled)`, `coverage: "full"`, `residual: []`.
  A descriptive `Static` block carries the `Reboot`/`Blocker` markers.
  `WhenDigivolving` and `WhenAttacking` each carry `frequency: "OncePerTurn"` **and the same**
  `sharedUseKey: "bt26-058-protect-cs"`, each running one `Restrict beAffected` on
  `{ controller: "mine", kind: ["Digimon"], nameOrTrait: [{tokens:["CS"], match:"trait"}] }`,
  count 1, with `fromSourceKind: ["Digimon"]`, `byOpponentEffectsOnly: true`,
  `duration: "untilOpponentTurnEnd"`.
  `AllTurns` holds a `Replacement` on `wouldLeavePlay` with the same `[CS]`-trait
  `sourceFilter`, body `Prevent` with `cost.kind: "placeOwnTopAtStackBottom"` targeting
  `{ isSelfRef: true }`, `optional: true`, `abortOnDecline: true`.
  `digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]`.
- Primitive trace: the keyword markers are descriptive only — `combat/keywords.ts`
  `printedKeywordsOf` parses `＜Reboot＞`/`＜Blocker＞` straight out of the catalog
  `effectText`, so the runtime keyword set does not depend on the IR metadata (the test still
  asserts both are live after digivolving). `placeOwnTopAtStackBottom` is an established cost
  kind (BT22-043/044): `interpreter/costs.ts:76` refuses the cost when no candidate has a
  non-empty stack, and `:1389` filters candidates the same way before paying, so the
  prevention is unavailable — not silently free — when HiAndromon has no digivolution card.
  `primitives.ts:1516` pops the topmost digivolution card to become the new top card,
  `unshift`s the old top card to the **bottom** of the stack, recomputes base DP from the
  promoted card, then recomputes continuous effects before firing
  `onAddDigivolutionCards` — matching the printed "top stacked card → bottom digivolution
  card" rotation exactly. `Restrict beAffected` with `providesEffectImmunity`
  (`interpreter/effect.ts:432`) is scheduled one continuous tier ahead of ordinary continuous
  effects, so the protection is visible before opposing continuous effects pick targets.
- Behavioral proof: `BT26-058.test.ts`, 8 cases. IR shape incl. both `sharedUseKey`s;
  self-protection positive path; a mixed `[CS]` pool (HiAndromon plus two BT26-054 Andromon)
  proving exactly the *chosen* one is protected and the other is not, plus the source-kind
  boundary (an opposing Digimon effect's −3000 DP is ignored, an opposing Option effect's
  −1000 lands); shared once-per-turn (a `WhenDigivolving` protection followed by a
  `WhenAttacking` one in the same turn leaves the second target unprotected); prevention of a
  *different* `[CS]` Digimon leaving, asserting HiAndromon's own stack rotated (top becomes
  BT26-054, BT26-058 sits at stack bottom); prevention of HiAndromon **itself** leaving via
  the same rotation; the unpayable negative path (no stacked card → deletion returns 1, the
  permanent is gone, and **no decision was opened**); and the Lv.5 `[CS]` alternate
  digivolution route paying exactly 3 memory with both keywords live afterwards.
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-059 — Plutomon — 10/10

- Catalog evidence: Black/Purple Lv.6 Mega, Virus, play cost 13, DP 13000, UR, max 4.
  Traits `[Shaman]`, `[Titan]`, `[TS]`. Printed evo costs Black Lv.5 / Purple Lv.5 for 5;
  alternate `[Digivolve] Lv.5 w/[TS] trait: Cost 4`. Three clauses: (a) when this card would
  be played, if your hand has fewer cards than your opponent's, reduce the cost by 6;
  (b) `[On Play] [When Digivolving] [When Attacking] [Once Per Turn]` by trashing 1 card in
  your hand, if it's your turn, you may play 1 `[Titan]` trait Digimon card from your trash
  with the cost reduced by 7 — this effect can't play `[Plutomon]`;
  (c) `[All Turns] [Once Per Turn]` when hands are trashed from, you may delete all of your
  opponent's lowest level Digimon.
- Knowledge base: Q7074/Q7075 — the hand comparison is made **at announcement**, while the
  card is still in hand, so equal hands never enable the reduction (and playing from any other
  zone with equal hands does not either). Q7076 — the effect may be activated on the
  opponent's turn and the hand-trash cost IS paid, but everything after "if it's your turn" is
  skipped. Q7077 — the −7 stacks with a played card's own reduction (BT26-045 GranKuwagamon:
  −11 total). Q7078 — "when hands are trashed from" fires for **either** player's hand.
  No errata, no restriction.
- Implementation: `apps/api/src/cards/BT26/BT26-059.ts`. Registered only via
  `registerIrCard("BT26-059", compiled)`, `coverage: "full"`, `residual: []`.
  (a) `Static` → `Replacement` `wouldBePlayed`, `mode: "reduceCost"`, `amount: 6`,
  `sourceFilter { controllerDefault: "mine", isSelfRef: true }`,
  `condition { kind: "handCompare", op: "lt" }`.
  (b) one shared body reused by three effect blocks (`OnPlay`, `WhenDigivolving`,
  `WhenAttacking`), each `frequency: "OncePerTurn"` with the same
  `sharedUseKey: "bt26-059-trash-play-titan"`. The body is a `CostGatedBlock` whose cost is
  `trash` 1 card from `{ controller: "mine", zone: "hand" }`, `optional: true`,
  `abortOnDecline: true`; its single inner action is `PlayWithoutCost` from `["trash"]` with
  `payCost: true`, `reduceCostBy: 7`, `optional: true`, and
  `condition { kind: "isYourTurn" }`, targeting
  `{ controller: "mine", zone: "trash", kind: ["Digimon"],
     nameOrTrait: [{tokens:["Titan"], match:"trait"}], excludeNames: ["Plutomon"] }`.
  (c) `AllTurns` `frequency: "OncePerTurn"` → `SubTrigger whenHandTrashed` with
  `fireCondition { kind: "triggerHandTrashedSeat", seat: "any" }`, body `Delete` on
  `{ controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }`, `count: "all"`,
  `optional: true`.
  `digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 4, isAlternate: true }]`.
- Primitive trace: pay-time self-reducers are allowlisted, not structurally detected —
  `registration/reducers.ts:63` `VERIFIED_SELF_REDUCER_CARDS` lists `BT26-059` explicitly, and
  `sourceFilterDiscriminates` (`:161`) treats a filter carrying only `controllerDefault`/
  `isSelfRef` as the self form, so the reducer is captured and keyed to the bearer's cardId.
  `handCompare` (`conditions.ts:315`) compares raw `player.hand.length` on both seats at
  evaluation time; the peer BT26-045 (same clause, Q7036/Q7037) proves in its own test that an
  equal 1-vs-1 hand yields **no** reduction, i.e. the card being announced is still counted in
  hand — Q7074/Q7075 satisfied without any card-specific special-casing.
  `runActionInner` (`actions/runAction.ts:66`) gates each action on its own `condition`, so the
  `isYourTurn` gate sits *inside* the already-paid `CostGatedBlock` — exactly Q7076's split
  between a payable cost and an unusable payload.
  `withSubTriggerFrequency` (`interpreter/effect.ts:391`) propagates the block-level
  `OncePerTurn` onto the `whenHandTrashed` watcher as its `oncePerTurnKey`.
  `handTrashedGate` (`actions/subTrigger.ts:384`) short-circuits to `true` whenever the IR
  supplies a `triggerHandTrashedSeat` fireCondition, and `conditions.ts:838` accepts any seat
  for `seat: "any"` — Q7078. `excludeNames` is honoured by `definitionMatches`
  (`matching/definition.ts:168`) as a name-substring exclusion.
- Behavioral proof: `BT26-059.test.ts`, 6 cases. IR shape incl. all three `sharedUseKey`s and
  the `excludeNames`/`isYourTurn` pair; full positive path (hand card trashed, BT26-021
  Gekomon `[Titan]` played out of trash, opponent's lowest-level Digimon deleted by the
  cascading hand-trash trigger); the Q7074/Q7075 numeric boundary (hand 1 vs 2 → memory
  7→0, i.e. 13−6=7 paid; hand 1 vs 1 → memory 7→−6, i.e. full 13 paid); the Q7076 opponent's
  turn case (cost trashed, deletion still triggers, **no** Titan reaches the battle area);
  Q7077 stacking (BT26-045, play cost 11, enters for a net 0 memory: −7 from Plutomon, −4
  from GranKuwagamon's own reducer); Q7078 (`verb.trash` of the **opponent's** hand card by
  seat 0 deletes both tied lowest-level Digimon and leaves the higher one — proving both
  `seat: "any"` and `count: "all"` on a tie); and the shared once-per-turn across `OnPlay`
  and `WhenAttacking` (only one Titan ever lands, only one hand card is spent).
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-060 — Chronomon: Destroy Mode — 9/10

- Catalog evidence: Black/Red Lv.7 Mega, Virus, play cost 16, DP 16000, UR, max 4.
  Traits `[Shaman]`, `[Iliad]`, `[TS]`. Printed evo costs Black Lv.6 / Red Lv.6 for 6;
  alternate `[Digivolve] Lv.6 w/[Chronomon] in text/[Giant Slayer]: Cost 5`.
  `＜Security A. +1＞`, `＜Reboot＞`, `＜Blocker＞`,
  `＜Succession (Lv.6 w/[Chronomon] in name)＞`.
  `[On Play] [When Digivolving]` return the top 5 stacked cards of 3 of your opponent's
  Digimon to the top of the deck. `[All Turns] [Once Per Turn]` when your effects add to
  decks, you may delete 1 of your opponent's Digimon.
- Knowledge base: Q7079 — choose exactly 3 opposing Digimon; each loses its top 5 pile cards
  to the top of the deck. Q7080 — the **activating** player orders the returned cards.
  Q7081 — with 5 or fewer cards, return until nothing is stacked on top; a lone remaining
  card is not a stacked card, so it stays. Q7082/Q7083 — a stack reduced to a no-DP card or
  an Option card is trashed at the following rule check, and that trashing is *not* trashing
  from the battle area. Q7084 — "when your effects add to decks" fires for a card placed into
  a deck from any zone other than the deck, top or bottom, but not for a reveal-and-return.
  Q7085 — a compound effect that removes from and then adds to a deck still fires it.
  Q7086 — it fires when one of your effects adds to the **opponent's** deck. Q7087 — "[X] in
  its text" spans name, traits, effects, inherited effects, `(Rule)`, and every requirement
  line. No errata, no restriction.
- Implementation: `apps/api/src/cards/BT26/BT26-060.ts`. Registered only via
  `registerIrCard("BT26-060", compiled)`, `coverage: "full"`, `residual: []`.
  Top-level `keywords` carry all four markers with `SecurityAttack` amount 1.
  `OnPlay` and `WhenDigivolving` each run `ReturnTopDigivolutionCards` on
  `{ controller: "opponent", kind: ["Digimon"] }` `count: 3`, `cardsPerTarget: 5`,
  `order: "any"`. A `Static` block implements `＜Succession＞` as `GrantStatic`
  `grant: "effects"` on self with `filter { controller: "mine", kind: ["Digimon"],
  levels: [6], nameOrTrait: [{tokens:["Chronomon"], match:"name"}] }`, `topmostOnly: true`,
  `duration: "permanent"`. `AllTurns` `frequency: "OncePerTurn"` →
  `SubTrigger whenEffectAddsToDeck` with an explicit
  `oncePerTurnKey: "BT26-060/delete-on-effect-adds-to-deck"`, body `Delete` 1 opposing
  Digimon, `optional: true`.
  `digivolutionRequirement`: `{ level: 6, texts: ["Chronomon"], cost: 5, isAlternate: true }`
  and `{ namesExact: ["Giant Slayer"], cost: 5, isAlternate: true }`.
- Defects corrected (two, both in `BT26-060.ts`):
  1. **Dead `[Giant Slayer]` digivolution route.** The second alternate carried
     `level: 6` alongside `namesExact: ["Giant Slayer"]`. BT26-085 Giant Slayer is a
     level-less `[Assembly]` Digimon (`level: undefined` in the catalog), and
     `cards/cardData.ts:444` rejects a requirement whose `level` is set when
     `baseDef.level === undefined` — so the route could never be taken. That also stranded
     BT26-085's own `[All Turns]` "by digivolving it into [Chronomon: Destroy Mode] ...
     it doesn't leave" clause, which has no other path. Removed the level gate; the printed
     line reads as "Lv.6 w/[Chronomon] in text" **or** "[Giant Slayer]".
     `BT26-060.test.ts` asserted the old shape — the `digivolutionRequirement` expectation
     now reads `{ namesExact: ["Giant Slayer"], cost: 5, isAlternate: true }`. This is the
     only test assertion changed, and it was asserting the defect.
  2. **Inert `＜Succession＞` level gate.** The conferral filter used `level: 6`, which is
     not a recognized `Filter` predicate — `matching/definition.ts` supports only `levels`,
     `levelComparison`, and `hasLevel`, and the compiler alias for `level` is an object/string
     form, never a bare number. The key was silently dropped, so **any** Chronomon-named card
     in the stack would confer its effects, not only a Lv.6 one. Changed to `levels: [6]`.
     No test change needed — no test asserted the filter shape.
- Primitive trace: `ReturnTopDigivolutionCards`
  (`interpreter/actions/removal.ts:27`) resolves the 3 targets, then per target takes
  `[...stack, topCard].slice(-min(5, stack.length))` — the pile top-down, capped so the
  bottom-most card always survives (Q7081), and with the *top card itself* included
  (Q7079/Q7081). `order: "any"` routes the pooled cards through `ask.orderCards` before
  `fx.returnStackTopsToDeck`, and the prompt goes to `ctx.source.ownerSeat` (Q7080).
  `whenEffectAddsToDeck`'s gate (`actions/subTrigger.ts:538`) scopes on the seat that
  *controlled the effect*, not the deck's owner — Q7086 — and the two fire sites in
  `primitives.ts:3688/3789` are effect-attributed deck adds, so a plain reveal-and-return does
  not fire (Q7084). `GrantStatic grant: "effects"` with a structured `filter`
  (`actions/grantStatic.ts:194-207`) matches the host's **stack** cards via
  `definitionMatches`, keeps only the last match under `topmostOnly`, and registers a
  `conferStackEffects` entry; `actions/borrowed.ts:177` then replays those conferred effects
  under the host. `staticTraitsOf` (`cards/cardData.ts:293`) is not involved here — the match
  is a name substring, correct for "[Chronomon] in name".
- Behavioral proof: `BT26-060.test.ts`, 8 cases. Catalog + IR shape (both alternates, four
  keywords, the watcher's once-per-turn key); Q7079/Q7081 with a deliberately mixed board — a
  7-card pile (loses exactly 5, keeps 2), a 3-card pile (loses 2, keeps 1), a 2-card pile
  (loses 1, keeps 1) and an untouched 4th Digimon proving `count: 3` is exact, plus the
  opponent's deck ending at exactly 8 cards; Q7080 (the order prompt is offered to seat 0 with
  all 3 candidates and the chosen reversal is what lands on the deck); Q7083 (a pile whose
  survivor is an Option card is trashed at the rule check); Q7082 (a pile whose survivor is a
  Tamer is trashed, while an *ordinary* Tamer permanent on the same board is untouched — the
  near-miss case); Q7084–Q7086 (the card's own deck-add fires the watcher and deletes 1, then
  a second effect-driven `returnToDeck` in the same turn deletes nothing — the shared turn
  budget); a controller's-own-deck variant of the same; and a `＜Succession＞` stack case with
  two BT26-016 Chronomon: Holy Mode cards under it, asserting only the topmost one's effects
  are conferred (exactly one deletion, not two) and its `Piercing`/`Engage` are live alongside
  the printed `Reboot`/`Blocker`.
- Engine seam needed, NOT applied (this is the missing point):
  `apps/api/src/engine/effects/interpreter/actions/removal.ts:31-34`. When a chosen target has
  **no** digivolution cards, `Math.min(action.cardsPerTarget, permanent.stack.length)` is `0`
  and `slice(-0)` is `slice(0)` — the whole array — so the Digimon's only card is returned to
  the deck and the permanent disappears. Q7081 requires the opposite: a lone card is not a
  stacked card and nothing is returned. Reachable in normal play (any Digimon played straight
  from hand is a legal target for `count: 3`). Minimal fix:
  ```ts
  const take = Math.min(action.cardsPerTarget, permanent.stack.length);
  if (take === 0) return [];
  return [...Array.from(permanent.stack), permanent.topCard].slice(-take);
  ```
  BT26-060 is the only consumer of `ReturnTopDigivolutionCards` in the card corpus, so the
  blast radius is this card alone. Once applied, a stackless-target case should be added to
  `BT26-060.test.ts` and the score goes to 10/10.
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed. Files changed:
  `apps/api/src/cards/BT26/BT26-060.ts`, `apps/api/src/cards/BT26/BT26-060.test.ts`.

## BT26-061 — Chiropmon — 10/10

- Catalog evidence: mono-Purple Lv.3 Rookie, Virus, play cost 3, DP 2000, C, max 4.
  Traits `[Mammal]`, `[Glowing Dawn]`, `[BEATBREAK]`. Printed evo cost Purple Lv.2 for 0;
  alternate `[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0` (colorless route).
  `[On Play]` reveal the top 3 cards of your deck; add 1 `[Glowing Dawn]` trait card **and**
  1 **purple** `[BEATBREAK]` trait card among them to the hand; return the rest to the bottom
  of the deck. Inherited: `[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in
  your hand.` No security effect.
- Knowledge base: `node tools/kb/query.mjs card BT26-061` — no entries; no errata, no
  restriction. Two clause readings are settled from the corpus rather than card-specific Q&A:
  "trait" is the union forms ∪ attributes ∪ types (`cards/cardData.ts:293` `staticTraitsOf`),
  and two independent "add 1 X and 1 Y" slots cannot both consume the same revealed card.
  No unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT26/BT26-061.ts`. Registered only via
  `registerIrCard("BT26-061", compiled)`, `coverage: "full"`, `residual: []`.
  `OnPlay` → a single `RevealAdd`, `revealCount: 3`, with **two** `add` slots —
  `{ nameOrTrait: [{tokens:["Glowing Dawn"], match:"trait"}] }` count 1 to hand, and
  `{ colors: ["Purple"], nameOrTrait: [{tokens:["BEATBREAK"], match:"trait"}] }` count 1 to
  hand — and `rest: "deckBottom"`. Both slots are mandatory ("Add", not "may").
  A second block `{ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" }`
  runs `Draw 1` for `controller: "mine"` then a non-optional `Trash` of 1 card from
  `{ controller: "mine", zone: "hand" }` — the printed order matters (draw first, then trash,
  so the drawn card is itself a legal discard).
  `digivolutionRequirement: [{ level: 2, traits: ["Glowing Dawn"], cost: 0, isAlternate: true }]`.
- Primitive trace: `matchNameOrTrait` (`matching/definition.ts:264-333`) resolves
  `match: "trait"` against `staticTraitsOf` = forms ∪ attributes ∪ types ∪ `[Rule]`-granted
  traits, with whitespace/hyphen normalization and **exact token equality** (not substring) —
  so `[BEATBREAK]` cannot be satisfied by a near-miss trait, and `[Glowing Dawn]` matches the
  two-word trait despite the space. `filter.colors` (`:106`) is a definition-level check
  against the printed colors, so the purple gate applies to the card's own print, not to the
  board. The `isInherited` block is level-scoped by the interpreter's inherited-effect path,
  and its `frequency: "OncePerTurn"` is per source instance, so two different stacks each get
  their own budget.
- Behavioral proof: `BT26-061.test.ts`, 6 cases. Catalog + IR shape (both slots, `deckBottom`,
  the inherited block's `isInherited`/`OncePerTurn`); the **double-qualification boundary** —
  a revealed BT26-061 carries both `[Glowing Dawn]` and purple `[BEATBREAK]`, and exactly one
  copy is added, not two; the **colour boundary** with a deliberately mixed three-card reveal
  (a `[Glowing Dawn]` card, an off-colour `[BEATBREAK]` card, and a purple `[BEATBREAK]` card):
  both correct cards land in hand, the off-colour one is **never offered** as a candidate for
  the second slot, and it is the only card left in the deck; the ordinary positive path
  (two adds, one card bottomed); the colorless Lv.2 `[Glowing Dawn]` digivolution route paying
  0 memory from a differently coloured base with BT25-003 ending as the digivolution card;
  and the inherited effect on a real BT26-064 host stack — draw-then-trash leaves the hand
  empty, and a second `OnUseAttack` in the same turn does nothing (the once-per-turn budget
  is spent, `secondDraw` still on top of the deck).
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-062 — Ghostmon — 10/10

- Catalog evidence: Purple/Red Lv.3 Rookie, Data, play cost 3, DP 1000, C, max 4.
  Traits `[Ghost]`, `[NSo]`. Printed evo costs Purple Lv.2 / Red Lv.2 for 1; alternate
  `[Digivolve] Lv.2 w/[NSo] trait: Cost 0` — strictly cheaper than the printed route, so it
  must be selectable independently. `[Start of Your Main Phase]` by trashing 1 card with the
  `[Ghost]` **or** `[NSo]` trait from your hand, `＜Draw 1＞` and gain 1 memory.
  Inherited: `[Your Turn] This Digimon gets +2000 DP.` No security effect, no once-per-turn.
- Knowledge base: `node tools/kb/query.mjs card BT26-062` — no entries; no errata, no
  restriction. The one rules point that matters is the "By [cost], [effect]" shape: the cost
  is optional, and declining it forfeits the *entire* payload — both the draw and the memory
  gain, since they follow a single "By ~" clause. No unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT26/BT26-062.ts`. Registered only via
  `registerIrCard("BT26-062", compiled)`, `coverage: "full"`, `residual: []`.
  `StartOfYourMainPhase` → `Draw` (`controller: "mine"`, `amount: 1`) carrying the structured
  cost `{ kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine",
  nameOrTrait: [{tokens:["Ghost"], match:"trait"}, {tokens:["NSo"], match:"trait"}] } } }`
  with `optional: true`, `abortOnDecline: true`, followed by a sibling `GainMemory amount: 1`.
  A second block `{ trigger: "YourTurn", isInherited: true }` runs `ModifyDP +2000` on self
  for the turn.
  `digivolutionRequirement: [{ level: 2, traits: ["NSo"], cost: 0, isAlternate: true }]`.
- Primitive trace: the two `nameOrTrait` entries are an OR within one filter —
  `matchNameOrTrait` (`matching/definition.ts:305`) accepts a card matching **any** listed
  token, and `match: "trait"` is exact token equality against `staticTraitsOf`
  (forms ∪ attributes ∪ types), so a near-miss trait cannot pay. The cost's *availability* is
  probed before any prompt opens (`interpreter/costs.ts` `costAvailable` for `kind: "trash"`
  counts eligible loose instances in hand), which is what makes the "no eligible card"
  path silent rather than a dead prompt. `abortOnDecline: true` makes `runActionInner` halt
  the whole effect on refusal (`actions/runAction.ts`), so `GainMemory` — a sibling action, not
  a nested one — is correctly skipped: this is the seam that binds the memory gain to the paid
  cost. `ModifyDP` on a `YourTurn` continuous block is re-derived every
  `recomputeContinuousEffects` pass and lapses off-turn via `turnOwnerGuard`
  (`interpreter/effect.ts:459+`), which is why `duration: "forTheTurn"` is not a leak here.
- Behavioral proof: `BT26-062.test.ts`, 8 cases. Catalog + IR shape (the exact cost filter
  incl. both trait tokens, `optional`/`abortOnDecline`, and the inherited block); a
  parameterized **trait-pool** case proving a `[Ghost]`-only card (BT20-063) and an
  `[NSo]`-only card (EX8-008) each pay independently — the OR is real, not a single-trait
  accident; the self-referential case (a second Ghostmon, which carries both traits, pays);
  the **optional-refusal** path under `autoDeclineOptional` — memory stays 0, the cost card
  stays in hand, and the deck top is untouched, proving the memory gain is gated on the
  payment; the **negative** path with only an ineligible hand card — no optional decision is
  opened at all, nothing is drawn, memory unchanged; the alternate `[NSo]` Lv.2 digivolution
  route paying 0 despite the printed purple cost of 1; and two inherited-DP cases on a real
  BT26-064 host stack — 4000 DP on the controller's turn and 2000 DP once `turnSeat` flips,
  proving the `[Your Turn]` scope.
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-063 — Tellermon — 10/10

- Catalog evidence: mono-Purple Lv.3, forms `[Stnd.]`/`[Appmon]`, attribute
  `[Entertainment]`, types `[Fortune Telling (App Name)]` and `[Seven Code]`, play cost 4,
  DP 4000, C, max 4. Printed evo cost Purple Lv.2 for 0; alternate
  `[Digivolve] Lv.2 w/[Appmon] trait: Cost 0` (colorless route).
  `＜Detach ([Seven Code] trait)＞`.
  `[Your Turn] [Once Per Turn]` when this Digimon gets linked, reveal the top 3 cards of your
  deck; add 1 card with the `[Entertainment]`, `[Open]` or `[Seven Code]` trait among them to
  the hand; return the rest to the **top or bottom** of the deck.
  Link side: `linkRequirement` `[Link] [Appmon] trait: Cost 3`, `linkEffect`
  `[When Linking] Delete 1 of your opponent's Digimon with the lowest level.`, `linkDp: null`.
- Knowledge base: `node tools/kb/query.mjs card BT26-063` — no entries; no errata, no
  restriction. The load-bearing point is settled from the engine's own trait model rather than
  Q&A: `[Entertainment]` is printed as an *attribute* and `[Open]` as a *form*, and the DCG
  trait set is forms ∪ attributes ∪ types (`cards/cardData.ts:293-305`), so all three tokens
  are legitimately reachable through a single `match: "trait"` filter. No unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT26/BT26-063.ts`. Registered only via
  `registerIrCard("BT26-063", compiled)`, `coverage: "full"`, `residual: []`.
  `keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }]`.
  Block 1 `{ trigger: "YourTurn", frequency: "OncePerTurn" }` → `SubTrigger whenLinked` with
  `sourceFilter: { isSelfRef: true }`, body `RevealAdd revealCount: 3` with one `add` slot
  `{ controllerDefault: "mine", nameOrTrait: [ Entertainment | Open | Seven Code, each
  match:"trait" ] }` count 1, and `rest: "deckTopOrBottom"`.
  Block 2 `{ trigger: "Static", isLinked: true }` → `SubTrigger whenLinked`,
  `sourceFilter: { isSelfRef: true }`, body `Delete` on
  `{ controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }` count 1,
  mandatory.
  `digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }]`,
  `linkRequirement: [{ traits: ["Appmon"], cost: 3 }]`.
- Primitive trace: the two-block split is the corpus idiom for a card with both a main-side
  and a link-side clause — the peer BT26-019 uses the identical
  `{ trigger: "Static", isLinked: true }` + `SubTrigger whenLinked` +
  `sourceFilter: { isSelfRef: true }` shape, so `isSelfRef` in the `isLinked` scope binds the
  card *as the link*, while in block 1 it binds the card *as the host permanent* — the two
  never cross-fire. `withSubTriggerTurnScope` (`interpreter/effect.ts:381`) stamps
  `turnScope: "yourTurn"` onto block 1's watcher, so the watcher installed by a continuous
  effect cannot fire on the opponent's turn; `withSubTriggerFrequency` (`:391`) supplies the
  shared `oncePerTurnKey`, and `actions/subTrigger.ts:956-961` scopes it to
  `ctx.source.instanceId`, which is exactly why two Tellermon copies get independent budgets.
  `matchNameOrTrait` (`matching/definition.ts:302`) builds its trait list from
  `staticTraitsOf` and compares with **normalized exact equality**, so `[Seven Code]` is not
  satisfied by a `[Seven Codes]` near-miss. `＜Detach＞` reaches combat through
  `combat/keywords.ts printedKeywordsOf`, which parses the catalog `effectText` directly — the
  IR `keywords` entry is descriptive metadata only.
- Behavioral proof: `BT26-063.test.ts`, 11 cases, mixing public-intent integration with a
  direct watcher-seam drive. Catalog + Detach marker; the digivolve and link requirements;
  the IR shape of both blocks; the colorless Lv.2 `[Appmon]` route for 0 memory from BT25-004;
  the full public path — `linkCard` P-190 onto Tellermon, memory paid, the link recorded in
  `perm.linked`, and the matching revealed card leaving the deck for the hand; the **link-side**
  path — Tellermon itself linked onto another Appmon host deletes the opposing lowest-level
  Digimon and leaves the higher one; a `＜Detach＞` combat case (attacking into a bigger
  defender trashes the linked `[Seven Code]` card, Tellermon survives, the defender survives);
  the **negative** path — linking onto a *different* Appmon on the same board reveals nothing
  and leaves the matching card in the deck (this is the assertion that proves
  `sourceFilter: { isSelfRef: true }` is load-bearing); per-copy once-per-turn budgets (two
  Tellermon, two reveals); one-copy once-per-turn (two links to the same Tellermon, one
  reveal, 5 of 6 deck cards untouched); the `[Your Turn]` gate (watcher does not arm on the
  opponent's turn — deck and hand both untouched); a parameterized **top-or-bottom** case
  driving the installed watcher directly and asserting `returnToDeck` is called with the
  unchosen cards in **reversed order for `toTop: true`** and printed order for `toTop: false`
  — plus the candidate set, which offers exactly the `[Entertainment]`-attribute and
  `[Open]`-form cards while a `[Seven Codes]` near-miss is visible but not selectable; and a
  no-match case where `selectCards` is never called and all three revealed cards go back.
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-064 — DemiDevimon — 10/10

- Catalog evidence: mono-Purple Lv.3 Rookie, Virus, play cost 3, DP 2000, U, max 4.
  Traits `[Evil]`, `[Iliad]`, `[ADAMAS]`, `[TS]`. Printed evo cost Purple Lv.2 for 0;
  alternate `[Digivolve] Lv.2 w/[TS] trait: Cost 0` (colorless route).
  `[On Play]` reveal the top 3 cards of your deck; add 1 card with the `[Fallen Angel]`,
  `[Undead]`, `[Wizard]` **or** `[Demon Lord]` trait **and** 1 card with the `[TS]` trait
  among them to the hand; return the rest to the bottom of the deck.
  Inherited: `[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand.`
  No security effect. `[ADAMAS]` is carried for other cards' filters; it drives nothing here.
- Knowledge base: `node tools/kb/query.mjs card BT26-064` — no entries; no errata, no
  restriction. Same two settled readings as its sibling BT26-061: "trait" spans
  forms ∪ attributes ∪ types, and the two `add` slots are independent — one revealed card
  cannot fill both. No unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT26/BT26-064.ts`. Registered only via
  `registerIrCard("BT26-064", compiled)`, `coverage: "full"`, `residual: []`.
  `OnPlay` → one `RevealAdd`, `revealCount: 3`, two `add` slots:
  `{ nameOrTrait: [{ tokens: ["Fallen Angel","Undead","Wizard","Demon Lord"],
  match: "trait" }] }` count 1 to hand (a single four-token OR entry), and
  `{ nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }` count 1 to hand;
  `rest: "deckBottom"`. Both slots mandatory ("Add", not "may").
  Second block `{ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn" }` →
  `Draw 1` for `controller: "mine"` then a non-optional `Trash` of 1 card from
  `{ controller: "mine", zone: "hand" }`, in that order so the freshly drawn card is itself a
  legal discard.
  `digivolutionRequirement: [{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }]`.
- Primitive trace: `matchNameOrTrait` (`matching/definition.ts:305`) evaluates
  `(ref.tokens ?? []).some(...)` — so a single entry with four tokens is exactly the printed
  four-way OR, semantically identical to BT26-063's four separate entries; the comparison is
  normalized **exact** trait equality against `staticTraitsOf`
  (`cards/cardData.ts:293`, forms ∪ attributes ∪ types ∪ `[Rule]` traits), so no near-miss
  trait qualifies. `RevealAdd`'s per-slot selection consumes a revealed card once, so a card
  carrying both an evil trait and `[TS]` cannot satisfy both slots. The inherited block's
  once-per-turn budget is keyed on the source instance, so different stacks do not share it.
- Behavioral proof: `BT26-064.test.ts`, 6 cases. Catalog + IR shape (both slots with the
  exact token lists, `deckBottom`, and the inherited block's `isInherited`/`OncePerTurn`);
  the **double-qualification boundary** — BT25-083 satisfies both slots and is added exactly
  once, with the two non-matching cards left in the deck; the colorless Lv.2 `[TS]`
  digivolution route paying 0 memory from a differently coloured base (BT24-002) and ending
  as the digivolution card; the ordinary positive path with a genuinely mixed reveal (an evil
  card BT15-036, a `[TS]` card BT26-066, and one non-matcher) — both correct cards land in
  hand and only BT1-009 is bottomed; and the inherited effect on a real BT26-066 host stack —
  draw-then-trash empties the hand, and a second `OnUseAttack` in the same turn does nothing
  (`secondDraw` still on the deck), proving the once-per-turn budget.
- Verification: focused suite — deferred to the coordinator's single BT26 run (this worker is
  barred from running tests). `git diff --check` — passed; no file changed for this card.

## BT26-065 — Falcomon — 10/10

- Catalog evidence: Purple Lv.3 Rookie Digimon, Vaccine, `[Avian]`/`[DATA SQUAD]`,
  play cost 3, DP 1000, one printed evo cost (Purple Lv.2, memory 0), rarity C,
  max 4. Printed alternate `[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0`. Main
  text: `[On Play]` reveal top 3, add 1 `[Keenan Crier]` **or** `[DATA SQUAD]`
  trait card and 1 purple card with `[Ravemon]` in name or `[Avian]`/`[Bird]` in
  any trait, return the rest to the bottom of the deck. Inherited:
  `[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1 card in your hand`.
- Knowledge base: `node tools/kb/query.mjs card BT26-065` returns Q7088 — "XX card
  with AA or BB" binds XX to *both* alternatives. Applied to the second add slot,
  "purple" therefore qualifies the Ravemon-name branch **and** both trait
  branches, not just the first. No errata, no restrictions.
- Implementation: one `RevealAdd` (`revealCount: 3`, `rest: "deckBottom"`) with two
  `add` specs. Slot 1 filter carries only `nameOrTrait`
  (`[Keenan Crier]` as `match: "name"`, `DATA SQUAD` as `match: "trait"`); slot 2
  carries `colors: ["Purple"]` **alongside** the three-token `nameOrTrait` union,
  which is exactly the Q7088 binding. Inherited effect is `WhenAttacking`,
  `isInherited: true`, `frequency: "OncePerTurn"`, `Draw 1` then a non-optional
  `Trash` of 1 own hand card, in that printed order. `digivolutionRequirement`
  matches the printed alternate. Registration is `registerIrCard` only,
  `coverage: "full"`, `residual: []`.
- Primitive trace: `runRevealAdd` (`interpreter/actions/reveal.ts`) reveals from
  the deck top, then walks `action.add` in order against a shared `taken` set, so
  a single revealed card that satisfies both slots can be added only once —
  the printed "add 1 X and 1 Y" reading. `definitionMatches` ANDs the filter
  fields, so `colors` on slot 2 gates every `nameOrTrait` alternative.
  `matchNameOrTrait` (`interpreter/matching/definition.ts`) treats `match: "name"`
  as normalized substring (so `Yoshino Fujieda & Keenan Crier` qualifies) and
  `match: "trait"` as exact normalized trait equality, so `DATA SQUAD` does not
  leak into near-miss traits. `rest: "deckBottom"` returns the unpicked reveal to
  the bottom in the controller's chosen order.
- Behavioral proof: `BT26-065.test.ts` proves the positive path (Keenan + purple
  Ravemon added, the third card bottomed), the Q7088 boundary with a mixed pool
  (purple Avian is a candidate, red Avian `BT1-013` is not and is bottomed), the
  dual-qualifier de-duplication case (one Falcomon reveals but is added once,
  two cards return to the deck), the cost-0 `[DATA SQUAD]` alternate evolution
  from an off-color Lv.2 (`BT25-002`, blue), and the inherited draw-then-trash in
  a real stack under `BT26-072` firing exactly once across two attack windows.
- Verification: focused suite — not run in this worktree (the coordinator runs the
  BT26 suite and typecheck once at the end); no source change was needed for this
  card. `git diff --check` — passed.

## BT26-066 — Salamon — 10/10

- Catalog evidence: Purple Lv.3 Rookie Digimon, Vaccine, `[Mammal]`/`[Titan]`/`[TS]`,
  play cost 3, DP 2000, printed evo cost Purple Lv.2 memory 0, rarity C, max 4.
  Alternate `[Digivolve] Lv.2 w/[TS] trait: Cost 0`. Main:
  `[Start of Your Main Phase]` if your hand has 5 or fewer cards, 1 of your
  `[Titan]` Digimon may digivolve into a `[Titan]` Digimon card in the trash with
  the cost reduced by 2. Inherited: `[Your Turn] [Once Per Turn]` when your hand
  is trashed from, this `[Titan]` Digimon may digivolve into `[Titamon]` or a
  `[Titan]` Digimon card in the trash with the cost reduced by 1.
- Knowledge base: Q7089 — after digivolving into P-209 Titamon through this
  inherited effect during an attack, `＜Alliance＞` cannot then be activated,
  because it triggers on attack declaration and the Digimon did not have it then.
  This constrains the *engine's* attack pipeline rather than the card IR; the
  colocated test pins it. No errata, no restrictions.
- Implementation: `StartOfYourMainPhase` (maps to `EffectTiming.OnStartMainPhase`
  with a turn-owner guard) holding one optional `Digivolve` — target `mine`
  Digimon with the `Titan` trait, `into` a `mine`/`trash` Digimon with the `Titan`
  trait, `from: ["trash"]`, `payCost: true`, `costDelta: -2`, and
  `condition: { zoneCount, seat: "mine", zone: "hand", op: "lte", value: 5 }`.
  Inherited clause is `YourTurn` + `isInherited` + `frequency: "OncePerTurn"`
  wrapping a `SubTrigger` on `whenHandTrashed` with `sourceFilter.isSelfRef`, whose
  body is an optional self-targeted `Digivolve` (`isSelf: true`, host gated on the
  `Titan` trait) into `[Titamon]`-named **or** `Titan`-trait trash Digimon with
  `costDelta: -1`. Registration is `registerIrCard` only, `coverage: "full"`,
  `residual: []`.
- Primitive trace: `builderForTrigger` routes `StartOfYourMainPhase` to
  `turnTiming`, so the window is the controller's own main-phase start.
  `runDigivolve` (`interpreter/actions/digivolve.ts`) resolves `into` through
  `digivolveIntoTarget` (bare filter and `{filter,count}` both accepted), filters
  each base's legal destinations, then calls `fx.digivolveFromInstance`.
  `useAlternateCost: true` reaches `primitives.ts` where
  `useAlternate = opts.useAlternateCost === true && alternate !== undefined`, so it
  *prefers* a printed alternate requirement and silently falls back to the printed
  evo cost when none matches — never a hard gate. Across the whole `[Titan]` pool
  the alternate is always cheaper than or equal to the printed cost
  (BT26-074 3 vs 4, BT26-059 4 vs 5, BT26-079 1 vs 4, P-209 3 vs 3), so preferring
  it is the faithful reading of an unqualified "digivolve ... with the cost
  reduced by N". `withSubTriggerFrequency` + `runSubTrigger` key the inherited
  `[Once Per Turn]` as `<sourceInstanceId>/printed/<effectKey>`, so two hosts keep
  separate budgets and one host cannot fire twice a turn.
- Behavioral proof: `BT26-066.test.ts` proves the start-of-main positive path
  (green `[Titan]` BT26-042 digivolves into BT26-059 for the alternate cost 4−2,
  memory 5→3), the exact five/six card hand boundary (nothing offered at six,
  memory untouched), the `[Titan]`-host gate on the inherited clause (BT26-074
  host evolves, non-`[Titan]` BT26-031 host does not and opens no prompt), the
  opponent-effect hand-trash direction, the shared once-per-turn budget across two
  `whenHandTrashed` events (memory 4→2 once, proving the alternate-cost route as
  well), and Q7089 — after the mid-attack evolution into P-209 the Alliance
  partner is never suspended.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end); no source change was needed for this card.
  `git diff --check` — passed.

## BT26-067 — Wizardmon — 10/10

- Catalog evidence: Purple/Red Lv.4 Champion Digimon, Data,
  `[Wizard]`/`[Witchelny]`/`[Iliad]`/`[TS]`, play cost 4, DP 4000, printed evo
  costs Purple Lv.3 and Red Lv.3 (memory 3 each), rarity U, max 4. Alternate
  `[Digivolve] Lv.3 w/[TS] trait: Cost 2`. Main:
  `[On Play] [When Digivolving] ＜Draw 1＞ and trash 1 card in your hand`; and
  `[End of Your Turn]` if you have a blue or yellow Digimon, by returning this
  Digimon to the bottom of the deck, you may play 1 red or blue `[Iliad]` Digimon
  card from your trash with the cost reduced by 4. Inherited: `＜Retaliation＞`.
- Knowledge base: `node tools/kb/query.mjs card BT26-067` returns no entries — no
  errata, rulings, or restrictions. No ambiguity remains: every clause reads
  literally and the shared "by <cost>, you may <effect>" shape is already settled
  by the corpus convention (optional, abort when the cost is unpayable).
- Implementation: two separate effects for `OnPlay` and `WhenDigivolving`, each
  `Draw 1` (controller `mine`) followed by a mandatory `Trash` of 1 own hand card —
  printed order preserved, so the drawn card is a legal discard.
  `EndOfYourTurn` holds one optional `PlayWithoutCost` targeting a `mine`/`trash`
  Digimon with `colors: ["Red","Blue"]` **and** the `Iliad` trait,
  `from: ["trash"]`, `payCost: true`, `reduceCostBy: 4`, gated by
  `condition: { kind: "youHave", filter: mine Digimon colors [Blue, Yellow] }`, and
  paying `cost: { kind: "return", target: isSelfRef, to: "deckBottom" }`. The
  inherited keyword is a `Static` + `isInherited` entry carrying
  `keywords: [Retaliation]` and no actions. Registration is `registerIrCard` only,
  `coverage: "full"`, `residual: []`.
- Primitive trace: the `youHave` condition is evaluated before the cost is offered,
  so declining is impossible when no blue/yellow Digimon exists — and Wizardmon
  itself (Purple/Red) never satisfies its own condition. `PlayWithoutCost` with
  `payCost: true` + `reduceCostBy` resolves to a real memory payment of
  `playCost − 4`; the structured `return` cost runs first and is atomic, so an
  unaffordable or target-less play leaves Wizardmon on the field. Colors on the
  target filter are an OR set intersected with the `Iliad` trait clause, matching
  "red or blue `[Iliad]` trait Digimon card". The inherited `Retaliation` grant
  flows through the continuous keyword tier (`staticModifier` marks
  `grantKeyword` as `continuous: true`), so it lives exactly as long as the card
  sits in a host's digivolution stack.
- Behavioral proof: `BT26-067.test.ts` proves the draw-then-trash positive path,
  the end-of-turn positive path (yellow BT26-054 present, BT26-060 played from
  trash for 16−4=12, memory 20→8, Wizardmon's instance found in the deck), three
  distinct negative paths that must all leave Wizardmon in play and open no
  prompt — no legal `[Iliad]` target, unaffordable reduced cost, and no
  blue/yellow Digimon — the cost-2 `[TS]` alternate evolution from a red Lv.3
  (`BT25-008`), and executable inherited `＜Retaliation＞` deleting the defender
  after Wizardmon's host loses the battle.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end); no source change was needed for this card.
  `git diff --check` — passed.

## BT26-068 — Devimon — 10/10

- Catalog evidence: Purple Lv.4 Champion Digimon, Virus,
  `[Fallen Angel]`/`[Iliad]`/`[TS]`, play cost 6, DP 6000, printed evo cost Purple
  Lv.3 memory 2, rarity C, max 4. Alternate `[Digivolve] Lv.3 w/[TS] trait:
  Cost 2` (the catalog's `Cost 02` is a scan artefact of the printed `2`). Main:
  `[On Play] [When Digivolving]` if your hand has 5 or fewer cards, both players
  `＜Draw 2＞`; and `[All Turns] [Once Per Turn]` when effects add to your
  opponent's hand, by trashing 1 card in your hand, your opponent trashes 1 card in
  their hand. Inherited: `[When Attacking] [Once Per Turn] ＜Draw 1＞ and trash 1
  card in your hand`.
- Knowledge base: `node tools/kb/query.mjs card BT26-068` returns no entries — no
  errata, rulings, or restrictions.
- Implementation: `OnPlay` and `WhenDigivolving` each hold one `ConditionalBranch`
  on `{ zoneCount, seat: "mine", zone: "hand", op: "lte", value: 5 }` whose
  `ifTrue` draws 2 for `mine` then 2 for `opponent` — the effect itself is
  mandatory, only the payload is conditional, which matches "if ..., both players
  draw". `AllTurns` + `frequency: "OncePerTurn"` installs a `SubTrigger` on
  `whenEffectAddsToOpponentHand` with `cost: { kind: "trash", own hand, count 1 }`
  and a body that trashes 1 card from the opponent's hand with
  `chooser: "opponent"`. Inherited `WhenAttacking` + `OncePerTurn` draws 1 then
  trashes 1 own hand card. Registration is `registerIrCard` only,
  `coverage: "full"`, `residual: []`.
- Defect corrected: none in the card IR. One stale **test** assertion was fixed —
  see "Behavioral proof" below.
- Primitive trace: `whenEffectAddsToOpponentHand` is fired from the two
  effect-driven hand-add seams in `primitives.ts` (never from the normal draw-phase
  draw), and `runSubTrigger` adds a gate requiring
  `trigger.effectAddedToHandSeat !== source.ownerSeat`, so the watcher reacts only
  to *the opponent's* hand growing. `withSubTriggerFrequency` stamps the effect key
  onto the install and `runSubTrigger` scopes it to
  `${source.instanceId}/${conferralGranterInstanceId ?? "printed"}/${effectKey}`,
  which is what keeps two Devimons on separate budgets. `SubTriggerHub.fireSnapshot`
  marks the key *before* the body runs and calls `turnLedger.unmarkFired` when the
  body sets `ctx.oncePerTurnActivationDeclined`, so a declined or unpayable cost
  releases the reservation for the same turn.
- Behavioral proof: `BT26-068.test.ts` proves the exact five/six-card draw boundary
  in both directions, the alternate `[TS]` evolution from a red Lv.3 base
  (`BT26-008`) and its rejection from a same-level non-`[TS]` near-match
  (`BT1-009`), two independent copies each paying and firing the `[All Turns]`
  watcher once per turn and not again on a second event, the natural chain where
  Devimon's own On Play draw for the opponent arms its own watcher, the
  declined-cost and failed-cost release of the once-per-turn reservation, and the
  inherited draw-then-trash firing once from a real `BT26-074` stack.
  **Test assertion changed:** in "releases the once-per-turn reservation when the
  cost is declined or fails to move", the key assertion was
  `expect(subscription!.oncePerTurnKey).toContain(`${instanceId}/${CARD_ID}`)`.
  Commit `fd894f933` inserted the conferral-origin segment into the runtime key, so
  the live value is `devimon-card/printed/BT26-068/ir-<timing>-<index>` and the
  literal substring no longer appears. The engine is the correct side — the
  conferral segment is what lets a conferred copy of the same clause carry its own
  budget, and the instance scope the comment demands is still present. The
  assertion now reads
  `toMatch(new RegExp(`^${instanceId}/printed/${CARD_ID}/`))`, which pins the
  instance scope, the printed origin, and the card identity without hard-coding the
  generated effect index.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end). `git diff --check` — passed.

## BT26-069 — Dobermon — 10/10

- Catalog evidence: Purple Lv.4 Champion Digimon, Vaccine,
  `[Dark Animal]`/`[Titan]`/`[TS]`, play cost 5, DP 6000, printed evo cost Purple
  Lv.3 memory 2, rarity U, max 4. Alternate `[Digivolve] Lv.3 w/[TS] trait:
  Cost 2`. Main: when this card is trashed from the hand, if your hand has 5 or
  fewer cards, `＜Draw 1＞`; and `[On Play] [When Digivolving]` by trashing 1 card
  in your hand, delete 1 level 4 or lower Digimon (either player's — the text does
  not say "your opponent's"). Inherited: `[Your Turn] [Once Per Turn]` when your
  hand is trashed from, this `[Titan]` Digimon may digivolve into `[Titamon]` or a
  `[Titan]` Digimon card in the trash with the cost reduced by 1.
- Knowledge base: Q7090 mirrors BT26-066's Q7089 — evolving into P-209 mid-attack
  does not retroactively enable `＜Alliance＞`. Q7091 — trashing two copies at once
  does not let the second draw: the "5 or fewer" test is made at each copy's
  *actual activation timing*, so the first copy's draw (hand → 6) turns off the
  second. No errata, no restrictions.
- Implementation: a `Static` effect installing a `SubTrigger` on
  `whenTrashedFromHand` with `sourceFilter.isSelfRef`, whose body is a `Draw 1`
  carrying its own `condition: { zoneCount, seat: "mine", zone: "hand", op: "lte",
  value: 5 }`. `OnPlay` and `WhenDigivolving` share one `Delete` action targeting
  `controller: "any"` Digimon with `levelComparison: { op: "lte", value: 4 }`,
  `cost: { kind: "trash", own hand, count 1 }`, `optional: true`,
  `abortOnDecline: true`. The inherited clause is `YourTurn` + `isInherited` +
  `frequency: "OncePerTurn"` wrapping a `whenHandTrashed` `SubTrigger` whose body
  self-digivolves the `[Titan]` host into a `[Titamon]`-named or `Titan`-trait
  trash Digimon, `payCost: true`, `costDelta: -1`, `optional: true`. Registration
  is `registerIrCard` only, `coverage: "full"`, `residual: []`.
- Defect corrected: the inherited `Digivolve` omitted `useAlternateCost: true`
  while BT26-066's byte-identical printed inherited clause sets it, so two copies
  of the same printed text resolved to different memory costs whenever a `[Titan]`
  destination's alternate requirement is cheaper than its printed evo cost (for
  example BT26-074, alternate 3 vs printed 4). Added `useAlternateCost: true` to
  BT26-069's inherited `Digivolve` so both encode one behavior. This is
  cost-neutral for the scenario the existing test exercises (BT26-074 host into
  P-209 costs 3 on either route), so the pinned memory 2→0 assertion is unaffected.
- Primitive trace: `isHandTrashWatcherHost` routes the `Static` +
  `whenTrashedFromHand` shape to the `onAddHand` builder rather than
  `staticModifier`, so the watcher installs while the card is resident in *hand* —
  without it the on-field base guard would reject the effect before `resolve` ever
  ran. `HAND_TRASH_ANCHOR_LESS_EVENTS` deliberately excludes `whenHandTrashed`, the
  distinct in-play event the inherited clause watches, so the two watchers do not
  collide. The `Draw` action's `condition` is evaluated at resolution, which is the
  precise semantics Q7091 demands. `useAlternateCost` reaches `primitives.ts` as a
  *preference* (`useAlternateCost === true && alternate !== undefined`), falling
  back to the printed evo cost when no alternate matches — it can never make an
  otherwise legal digivolution fail.
- Behavioral proof: `BT26-069.test.ts` proves the cost-2 `[TS]` evolution from a
  red Lv.3, the hand-trash-then-delete positive path, the free choice of an *own*
  Lv.4 Digimon as the delete target while the opponent's Lv.5 survives (proving
  `controller: "any"` and the level boundary), the optional refusal leaving both
  the hand card and the target untouched, the exact five/six-card boundary on the
  trashed-from-hand draw, the inherited evolution firing on an *opponent-driven*
  hand trash, and the negative direction where the opponent's hand being trashed
  opens no prompt at all.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end). `git diff --check` — passed.

## BT26-070 — NightChiropmon — 10/10

- Catalog evidence: Purple Lv.4 Champion Digimon, Virus,
  `[Beastkin]`/`[Glowing Dawn]`/`[BEATBREAK]`, play cost 5, DP 5000, printed evo
  cost Purple Lv.3 memory 2, rarity C, max 4. Alternate `[Digivolve] Lv.3
  w/[Glowing Dawn] trait: Cost 2`. Main: `[On Play] [When Digivolving] ＜Draw 1＞
  and trash 1 card in your hand`; and `[Main] [Once Per Turn]` by trashing 2 bottom
  face-down cards from under any of your Tamers, you may use 1 Option card with the
  `[Glowing Dawn]` trait from your trash with the cost reduced by 2. Inherited:
  `＜Retaliation＞`.
- Knowledge base: Q7092 — the "by" condition is all-or-nothing; trashing only 1 of
  the 2 required cards does not pay it. Q7093 — two copies on the board cannot
  stack their reductions on one Option, because two effects cannot simultaneously
  use the same card. No errata, no restrictions.
- Implementation: `OnPlay` and `WhenDigivolving` each run `Draw 1` then a mandatory
  `Trash` of 1 own hand card. `Main` + `frequency: "OncePerTurn"` holds one
  optional `UseOptionWithoutCost` targeting a `mine`/`trash` `Option` with the
  `Glowing Dawn` trait, `from: ["trash"]`, `payCost: true`, `reduceCostBy: 2`, and
  `cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 2 }`.
  Inherited `＜Retaliation＞` is a `Static` + `isInherited` keyword-only effect.
  Registration is `registerIrCard` only, `coverage: "full"`, `residual: []`.
- Primitive trace: `trashBottomFaceDownUnderTamer` (`interpreter/costs.ts`, gated
  through `reducers.ts` and `borrowed.ts`) enumerates only the **bottom-most**
  face-down card under each of the controller's Tamers, then calls
  `fx.trashDigivolutionCards` per host; `runAction`'s structured-cost path aborts
  the payload when fewer than `count` cards actually move, which is exactly Q7092.
  `UseOptionWithoutCost` with `payCost: true` + `reduceCostBy: 2` resolves to a
  real memory payment of `playCost − 2` via `useOptionFromHand(..., costDelta: 2,
  paymentHandled: true)`. Q7093 needs no card-side encoding: each copy's `[Once Per
  Turn]` is its own budget and the Option leaves the trash when the first copy uses
  it, so the second finds no legal target. The filter's `playCostLte: 99` is inert
  boilerplate (no Option in the catalog approaches it) and is pinned by the test.
- Behavioral proof: `BT26-070.test.ts` proves the alternate cost-2
  `[Glowing Dawn]` evolution from a non-purple Lv.3, that `＜Retaliation＞` is
  granted only while the card is an inherited source (host yes, a loose copy on the
  field no) and that it executes after losing a battle, that the draw precedes a
  mandatory single hand discard at both printed timings (the drawn card is a legal
  discard, `min: 1, max: 1`), that only the bottom-most face-down card of each
  Tamer is offered (`[["one-bottom"], ["two-bottom"]]`), Q7092 — one of two cards
  moving means `useOptionFromHand` is never called, the edge case where an Option
  entering the trash *as part of paying the cost* is then legally usable, and
  Q7093 — the second copy changes neither memory nor trash.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end); no source change was needed for this card.
  `git diff --check` — passed.

## BT26-071 — Flarerizamon — 10/10

- Catalog evidence: Purple/Red Lv.4 Champion Digimon, Data, `[Fire Dragon]`/`[NSo]`,
  play cost 4, DP 5000, printed evo costs Purple Lv.3 and Red Lv.3 (memory 3 each),
  rarity C, max 4. Alternate `[Digivolve] Lv.3 w/[NSo] trait: Cost 2`. Main:
  `[On Play] [When Digivolving]` by deleting 1 of your Digimon, delete 1 of your
  opponent's level 4 or lower Digimon. Inherited: `＜Raid＞`.
- Knowledge base: `node tools/kb/query.mjs card BT26-071` returns no entries — no
  errata, rulings, or restrictions. The one reading worth stating: "1 of your
  Digimon" is unrestricted, so Flarerizamon itself is a legal cost when it is the
  only Digimon you control; the IR filter deliberately adds no self-exclusion.
- Implementation: `Static` + `isInherited` carrying `keywords: [Raid]` and no
  actions; `OnPlay` and `WhenDigivolving` share one `Delete` targeting
  `controller: "opponent"` Digimon with `levelComparison: { op: "lte", value: 4 }`,
  `cost: { kind: "deleteOwn", target: controller "mine" Digimon, count 1 }`,
  `optional: true`, `abortOnDecline: true`. Note the asymmetry against BT26-069:
  the cost is `mine` and the payload is `opponent`, matching the printed wording
  exactly ("1 of your Digimon" / "1 of your opponent's level 4 or lower Digimon").
  Registration is `registerIrCard` only, `coverage: "full"`, `residual: []`.
- Primitive trace: the structured `deleteOwn` cost is evaluated for payability
  *before* the optional prompt, so with no legal opponent target the effect never
  asks and never eats one of your Digimon — `abortOnDecline: true` covers the
  declined branch, and the pre-check covers the target-less branch. The level
  filter is `levelComparison` rather than a raw `level`, so it reads the live
  level after any De-Digivolve or level-changing modifier. `＜Raid＞` is granted
  through the continuous keyword tier so it survives recomputes for as long as the
  card sits in a host's digivolution stack.
- Behavioral proof: `BT26-071.test.ts` proves the alternate cost-2 `[NSo]`
  evolution from a yellow Lv.3 (`EX8-030`), the positive path driven by a real
  `playCard` intent (own BT26-012 deleted as the cost, opponent's Lv.4 BT26-020
  deleted, the Lv.5 BT26-054 untouched — proving both the level boundary and the
  opponent-only payload), the optional refusal leaving both boards intact, the
  target-less negative path where no `optional` decision is even opened and no own
  Digimon is paid, that inherited `＜Raid＞` is observable on the host, and that it
  executes — switching a player attack onto the suspended Digimon so security is
  never checked.
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end); no source change was needed for this card.
  `git diff --check` — passed.

## BT26-072 — Peckmon — 10/10

- Catalog evidence: Purple Lv.4 Champion Digimon, Vaccine, `[Avian]`/`[DATA SQUAD]`,
  play cost 4, DP 5000, printed evo cost Purple Lv.3 memory 2, rarity C, max 4.
  Alternate `[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2`. Main: `＜Blocker＞`;
  and `[On Play] [When Digivolving]` by trashing 1 card in your hand **or** placing
  it face down under any of your `[Keenan Crier]`s, delete 1 of your opponent's
  level 4 or lower Digimon. Inherited: `[On Deletion]` your opponent trashes 1 card
  in their hand.
- Knowledge base: Q7094 — the placed card goes to the **bottom** of the cards under
  the Tamer. Q7095 — the stacking order of face-down cards under a Tamer cannot be
  changed. Q7096 — only their owner may look at them. Q7097 — a face-down card
  under a Tamer is placed **face up** in the trash when trashed. No errata, no
  restrictions.
- Implementation: a `Static` keyword effect carrying `＜Blocker＞` (not inherited —
  Blocker is printed on the main text side). `OnPlay` and `WhenDigivolving` share
  one `Modal` (`choose: 1`, `optional: true`, `abortOnDecline: true`) whose two
  options are the same `Delete` (target `controllerDefault: "opponent"` Digimon,
  `levelComparison: { op: "lte", value: 4 }`, count 1) under two different costs:
  `{ kind: "trash", own hand, count 1 }` and `{ kind: "place", own hand, count 1,
  underFilter: mine Tamer named "Keenan Crier", host: "target", position:
  "bottom", faceDown: true }`. `position: "bottom"` is the Q7094 encoding and
  `faceDown: true` the Q7096 one. The inherited effect is `OnDeletion` +
  `isInherited` trashing 1 card from the opponent's hand with
  `chooser: "opponent"`. Registration is `registerIrCard` only,
  `coverage: "full"`, `residual: []`.
- Primitive trace: modelling the two costs as a `Modal` over the *same* payload is
  what makes each branch independently payability-checked — an option whose cost
  cannot be paid (no `[Keenan Crier]` on the field, or an empty hand) drops out of
  the offered set rather than aborting the whole effect. `matchNameOrTrait` uses
  normalized substring matching for `match: "name"`, so `ST24-14 Yoshino Fujieda &
  Keenan Crier` also qualifies as a host, which is the correct reading of "any of
  your `[Keenan Crier]`s". Q7097 needs no card-side encoding: the shared
  `trashDigivolutionCards` verb flips cards face up on the way to the trash.
  `chooser: "opponent"` routes the inherited discard to the opponent's own
  `selectCards` decision, so the controller never picks.
- Behavioral proof: `BT26-072.test.ts` proves the cost-2 `[DATA SQUAD]` alternate
  evolution from a green Lv.3, the hand-trash branch deleting an opposing Lv.4, the
  `[Keenan Crier]` branch — the paid card lands at index 0 of an already-populated
  stack ahead of both existing face-down cards (Q7094/Q7095) and face down
  (Q7096), and trashing it later puts it face up in the trash (Q7097) — executable
  `＜Blocker＞` intercepting a player attack so security is never checked, and the
  inherited `[On Deletion]` discard being chosen by the opponent (exactly one
  opponent-seat `selectCards` decision; the card the opponent preferred is trashed
  and the other is kept).
- Verification: focused suite — not run in this worktree (coordinator runs the BT26
  suite and typecheck once at the end); no source change was needed for this card.
  `git diff --check` — passed.

## BT26-073 — Aegiochusmon: Dark — 10/10

- Catalog evidence: Purple/Red Digimon, Lv.5 Ultimate, play cost 8, DP 8000, Vaccine,
  traits Shaman / Iliad / TS, R, max 4. Evo costs Purple Lv.4 = 4 and Red Lv.4 = 4.
  Printed clauses: `[Digivolve] [Aegiomon]: Cost 3`; `[Assembly -2] Lv.4 or lower Digimon
  card w/[Chronomon] in text or w/[TS] trait`; `[On Play] [When Digivolving] By deleting
  this Digimon or returning 1 [Shaman] or [TS] trait card from your trash to the bottom of
  the deck, delete 1 of your opponent's level 5 or lower Digimon`; `[On Deletion] You may
  play 1 [TS] trait card with a play cost of 5 or less from your hand or trash without
  paying the cost`; `[Rule] Trait: Has [Wizard] Type`. Inherited: `＜Security A. +1＞`.
- Knowledge base: Q7098 — "XX card with AA or BB" distributes the XX qualifier over both
  branches, so the Assembly union keeps the Lv.4 ceiling on the `[TS]` branch as well as
  the `[Chronomon]` branch. Q7099 — "[X] in its text" spans name, traits, effects,
  inherited effects, `[Rule]`, and every requirement header. Comprehensive §15-7 makes a
  "By …" clause an *optional processing condition*, so declining the cost is legal and
  aborts the rest. §2-3-2-3 makes "[Shaman] or [TS] trait" an exact trait identity.
- Implementation: two `Modal` effects (`OnPlay`, `WhenDigivolving`, `choose: 1`,
  `optional`, `abortOnDecline`) whose branches are the same `Delete` of an opponent
  `levelComparison lte 5` Digimon under two different costs — `deleteOwn` on `isSelfRef`,
  and `return … to: "deckBottom"` over a `zone: "trash"`, `controllerDefault: "mine"`
  filter with the exact-trait union `Shaman | TS`. `OnDeletion` runs a `PlayWithoutCost`
  from `["hand", "trash"]` with `payCost: false`, `optional: true`, kinds
  `Digimon | Tamer` and `playCostLte: 5` under an exact `TS` trait ref — Option cards are
  *used*, never *played*, so excluding the Option kind is correct. Inherited
  `＜Security A. +1＞` is a `Static` `isInherited` keyword effect. Registration is
  `registerIrCard("BT26-073", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `Modal` → `runControlFlowAction`; the branch costs go through
  `payCost` (`deleteOwn`, `return`). `Delete` targets resolve via
  `permanentMatchesFilter`, where `controllerDefault` is honored
  (`filter.controller ?? filter.controllerDefault`) and `levelComparison` is applied in
  `definitionMatches`. `nameOrTrait` refs run through `matchNameOrTrait`: `match: "trait"`
  is exact trait equality after whitespace/hyphen normalization, `match: "text"` is the
  full name ∪ trait ∪ printed-text union — matching Q7098/Q7099. The `[Rule]` Wizard trait
  is already parsed out of `effectText` by `staticTraitsOf`, so it holds in every zone;
  the module's `GrantStatic grant: "trait"` additionally publishes it on the live
  permanent (`effectiveTraits`), which is what the test observes. `assemblyRequirement`
  reaches the play-legality seam through `assemblyRequirementFor`, and
  `materialMatchesAssemblySlot` enforces the `nameOrTrait` union plus `levelMax`.
- Behavioral proof: the colocated suite covers the named `[Aegiomon]` cost-3 path from an
  off-color base (BT25-033), the Assembly reduction with a legal Lv.4 TS material
  (BT26-069), the Q7098 negative (a Lv.6 TS material is rejected), both cost branches of
  the modal (self-delete and trash-return, with the returned card asserted at the bottom
  of the deck), the full refusal path (nothing paid, nothing deleted), the On Deletion
  free play of both a TS Digimon and a TS Tamer, the parent deletion completing after the
  self-cost branch chains into On Deletion, and the inherited `＜Security A. +1＞` both as
  a published keyword amount and as two real security checks in an evolution stack.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-074 — Cerberusmon — 10/10

- Catalog evidence: Purple/Black Digimon, Lv.5 Ultimate, play cost 7, DP 7000, Vaccine,
  traits Dark Animal / Titan / TS, U, max 4. Evo costs Purple Lv.4 = 4, Black Lv.4 = 4.
  Printed clauses: `[Digivolve] Lv.4 w/[TS] trait: Cost 3`; `[On Play] [When Digivolving]
  [When Attacking] [Once Per Turn] If it's your turn, by trashing 1 card in your hand, you
  may use 1 Option card with the [Titan] trait from your trash with the cost reduced by 2`.
  Inherited: `[On Deletion] Delete 1 of your opponent's Digimon with the lowest level`.
- Knowledge base: `node tools/kb/query.mjs card BT26-074` returns no entries — no errata,
  no Q&A, no banlist. Governing general rules: §15-7 (a "by …" clause is an optional
  processing condition), the Official Rule Manual's `[X Per Turn]` note ("once the player
  chooses to perform the 'by' condition, it counts toward 1 use"), §2-3-2-3 (exact trait
  identity for "with the [Titan] trait"), and §2-7 (an Option's *use cost*, which this
  clause reduces rather than waives).
- Implementation: one `UseOptionWithoutCost` action shared by three effects
  (`OnPlay`, `WhenDigivolving`, `WhenAttacking`), each `frequency: "OncePerTurn"` with the
  same `sharedUseKey: "trash-hand-use-titan-option-from-trash"`. The action carries
  `from: ["trash"]`, `payCost: true`, `reduceCostBy: 2`, `optional: true`,
  `condition: { kind: "isYourTurn" }`, and `cost: { kind: "trash", target: <1 own hand
  card> }`. Its target filter is `zone: "trash"`, `kind: ["Option"]`, exact `Titan` trait,
  with no play-cost ceiling — matching the printed text. The inherited clause is an
  `OnDeletion` `isInherited` `Delete` over `controllerDefault: "opponent"`,
  `kind: ["Digimon"]`, `superlative: "lowestLevel"`, count 1, non-optional. Registration
  is `registerIrCard("BT26-074", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `registration/module.ts` derives `effectKey` as
  `${cardId}/${sharedUseKey}` when a `sharedUseKey` is present, and `maxPerTurn` as
  `frequency === "OncePerTurn" ? 1 : -1` — so all three timings collapse onto ONE
  UseTracker entry keyed by `(instanceId, effectKey)`, which is exactly the printed shared
  `[Once Per Turn]`. `UseOptionWithoutCost` routes through `runMetaAction`; the cost is
  paid first and, when the trash primitive returns nothing (a prevented trash), no memory
  is charged and the Option is not used. `superlative: "lowestLevel"` is narrowed in
  `targeting/permanents.ts` — level-less permanents and Tamers are excluded before the
  minimum is taken, so only the tied minimum-level opposing Digimon are offered.
- Behavioral proof: the suite asserts one shared `effectKey` and `maxPerTurn === 1` across
  `OnPlay` / `WhenDigivolving` / `OnUseAttack`; that `canActivate` is false on the
  opponent's turn; a mixed trash pool (exact `[Titan]` Option, a `[Titan]` *Digimon*, a
  near-match `Titanomachy` Option, and a plain Option) where only the exact Titan Option is
  offered; the paid hand card, the `-3` memory charge for a cost-5 Option, and the
  `costDelta: 2, paymentHandled: true` hand-off to `useOptionFromHand`; a prevented
  hand-trash charging no memory and using no Option; an unaffordable reduced cost leaving
  hand and trash untouched with no optional prompt raised; one use shared across On Play
  and When Attacking on the same physical copy (UseTracker count asserted at 1); and the
  inherited deletion both as a target-offer boundary (only the two tied Lv.3 Digimon are
  candidates — the Lv.6, the level-less permanent, and the Tamer are not) and end-to-end
  from a real deleted stack.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-075 — ScourgeChiropmon / Despair Blast — 10/10

- Catalog evidence: DUAL card (`kinds: ["Digimon", "Option"]`, `isDualCard: true`,
  `dualEffect: "Despair Blast"`), Purple/Yellow, Lv.5 Ultimate, play cost 4, DP 8000,
  Virus, traits Machine / Glowing Dawn / BEATBREAK, SR, max 4. Digimon side:
  `[Digivolve] Lv.4 w/[Glowing Dawn] trait: Cost 3`; `＜Execute＞`; `＜Ascension＞`;
  `[Security] [On Deletion] By trashing the bottom face-down card from under any of your
  Tamers, you may play 1 [Glowing Dawn] trait card with a play cost of 5 or less from your
  trash without paying the cost`. Option side: `＜Use Req. ([Glowing Dawn] trait)＞`,
  `[Main] Delete 1 of your opponent's Digimon with the lowest level`,
  `optionColorRequirements: ["Purple"]`.
- Knowledge base: Q7100 — the `[On Deletion]` clause and `＜Ascension＞` trigger
  simultaneously and the controller orders them; if `＜Ascension＞` resolves first and
  removes this card from the trash, the still-pending effects can no longer activate.
  Q7101 — a `[Security]` check resolves the effect and the card still battles the attacker.
  Q7102 — a DUAL card's Digimon-side effect is a *Digimon* effect. Q7103 — "Option cards
  don't activate [Security] effects" DOES suppress this card, because a checked DUAL card
  counts as both kinds. Comprehensive §16-42: `＜Use Req.＞` lets you ignore the Option's
  color requirements while you control the specified cards. §15-7 makes "By trashing …" an
  optional processing condition.
- Implementation: `PlayWithoutCost` (from `["trash"]`, `payCost: false`, `optional: true`,
  filter `zone: "trash"`, `kind: ["Digimon", "Tamer"]`, `playCostLte: 5`, exact
  `Glowing Dawn` trait) with `cost: { kind: "trashBottomFaceDownUnderTamer", controller:
  "mine", count: 1 }`, mounted on BOTH a `Security`/`isSecurity` effect and an
  `OnDeletion` effect. `＜Execute＞` and `＜Ascension＞` are granted as permanent
  `GainKeyword` actions on a `Static` effect rather than through the top-level `keywords`
  array; both are proven to execute, so the shape is a stylistic difference from
  BT26-077/079/080, not a fidelity gap. `＜Use Req.＞` compiles to a `Static`
  `WaiveColorRequirement` gated on `youHave` a friendly `Glowing Dawn`-trait card (no kind
  restriction, so a Digimon or a Tamer satisfies it — §4-21-2). The Option side is a
  `Main` effect deleting one `superlative: "lowestLevel"` opposing Digimon. Registration is
  `registerIrCard("BT26-075", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `WaiveColorRequirement` has real consumers at both the play seam
  (`actions/playCard.ts`, the `color-requirement-unmet` gate) and the digivolve seam
  (`actions/digivolve.ts`); the conformance suite forbids treating a
  `WaiveColorRequirement`-only Static as an inert keyword. `trashBottomFaceDownUnderTamer`
  is a first-class cost kind resolved in `costs.ts`; when no face-down bottom card exists
  under a Tamer the cost cannot be paid and the optional play never runs. The play target
  resolves through `candidateLooseInstances` → `definitionMatches`, where
  `match: "trait"` is exact trait equality. Simultaneous-trigger ordering runs through the
  engine's `orderTriggers` decision, which is what makes Q7100 observable.
- Behavioral proof: the suite covers the cost-3 alternate digivolution from an off-color
  Lv.4 Glowing Dawn base; the Despair Blast Option face deleting the lowest-level Digimon
  and going to trash; the encoded `trashBottomFaceDownUnderTamer` cost and the printed
  waiver; Q7100 in both orderings (On Deletion first — Tamer card trashed and the Glowing
  Dawn card played; Ascension first — the card goes to security and the pending On Deletion
  is dropped, with the Tamer's face-down card still under it); Q7101 (Security effect
  resolves, then the card battles and lands in trash); Q7103 (an Option-scoped security
  lock suppresses the effect but not the battle); and an end-of-turn `＜Execute＞` attack
  that self-deletes into `＜Ascension＞`.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-076 — Crowmon — 10/10

- Catalog evidence: Purple Digimon, Lv.5 Ultimate, play cost 7, DP 7000, Vaccine, traits
  Mysterious Bird / DATA SQUAD, R, max 4. Evo cost Purple Lv.4 = 3. Printed clauses:
  `[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3`; `[When Digivolving] Delete 1 of your
  opponent's level 4 or lower Digimon. Then, by trashing the bottom face-down card from
  under any of your Tamers, they trash 1 card in their hand`; `[Your Turn] [Once Per Turn]
  When your opponent's hand is trashed from or effects trash cards from under your Tamers,
  this Digimon may digivolve into [Ravemon] or a [DATA SQUAD] trait Digimon card in the
  trash with the cost reduced by 1`. Inherited: `[On Deletion] You may play 1 play cost 5
  or lower card with [Avian] or [Bird] in any of its traits or the [DATA SQUAD] trait from
  your trash without paying the cost`.
- Knowledge base: Q7104 — "XX card with AA or BB" distributes the XX qualifier over both
  branches, so the play-cost-5 ceiling and the "card" kind hold on EVERY branch of the
  inherited union. Comprehensive §2-3-2-3 vs §2-3-2-4 is the load-bearing distinction here:
  "with the [XX] trait" is an exact trait identity, while "with [XX] in any of its traits"
  matches any trait that *contains* the token. §2-3-1-2 makes a bracket-only card reference
  (`[Ravemon]`) an exact-name reference. §15-7 makes "by trashing …" an optional processing
  condition.
- Implementation: `WhenDigivolving` runs a mandatory `Delete` (opponent, `kind:
  ["Digimon"]`, `levelComparison lte 4`, count 1), then a `CostGatedBlock` with
  `cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 }`,
  `optional: true`, `abortOnDecline: true`, whose body is a `Trash` of 1 opponent hand
  card with `chooser: "opponent"`. The reaction is a `YourTurn`
  `frequency: "OncePerTurn"` effect installing two `SubTrigger` watchers —
  `whenHandTrashed` gated on `triggerHandTrashedSeat: "opponent"`, and
  `whenDigivolutionTrashed` with `sourceFilter { controller: "mine", kind: ["Tamer"],
  byEffect: true }` — both running the same `Digivolve` of `isSelfRef` into a
  `zone: "trash"`, `kind: ["Digimon"]` candidate with `payCost: true`, `costDelta: -1`,
  `optional: true`. Registration is `registerIrCard("BT26-076", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: two trait/name-matching errors in the filters.
  1. The inherited On Deletion union spelled `[Avian]` and `[Bird]` as `match: "trait"`
     (exact). `matchNameOrTrait` implements `"trait"` as strict equality, so the printed
     "in any of its traits" wording was being applied as an exact-token gate — Crowmon's
     own `Mysterious Bird`, and every `Giant Bird` / `Holy Bird` / `Ancient Bird` /
     `Birdkin` / `Bird Dragon` / `Ancient Birdkin` / `Mini Bird` card in the catalog, was
     silently excluded. Changed both refs to `match: "traitContains"` (§2-3-2-4). The
     third ref, `the [DATA SQUAD] trait`, correctly stays `match: "trait"` (§2-3-2-3).
  2. The reactive digivolution spelled `[Ravemon]` as `match: "name"`, which
     `matchNameOrTrait` implements as a substring match — that admitted
     `Ravemon: Burst Mode` (BT13-092, a Lv.7 with no `DATA SQUAD` trait), which the
     bracket-only reference does not name. Changed to `match: "nameExact"` (§2-3-1-2).
     The three printed `Ravemon` cards (BT13-089, BT26-082, EX4-058) still qualify.
- Primitive trace: the `Digivolve` action's `into` filter is resolved by
  `candidateLooseInstances` → `definitionMatches` → `matchNameOrTrait`, where
  `"nameExact"` compares normalized effective names for equality and `"traitContains"`
  substring-matches normalized traits — both fixes therefore land at the real candidate
  seam, not only in the IR shape. `legalIntoCandidates` still enforces the target card's
  own digivolution requirement, so the reduced cost cannot bypass legality.
  `permanentMatchesFilter` honors `controllerDefault` for the deletion target.
  `SubTrigger` watchers installed from a `frequency: "OncePerTurn"` effect get an
  auto-injected `oncePerTurnKey` (`builders.ts`), so the two watchers share ONE budget.
  `chooser: "opponent"` routes the hand-trash selection to the opponent's decision seat.
- Behavioral proof: the suite covers the cost-3 alternate digivolution from an off-color
  Lv.4 DATA SQUAD base; the When Digivolving deletion plus the Tamer-card cost and the
  opponent's hand discard; the reaction to an opponent hand-trash paying the reduced
  digivolve cost (memory 5 → 3); the same reaction firing naturally off this card's own
  Tamer-card trash; the `[Your Turn]` negative (no reaction during the opponent's turn);
  and Q7104's play-cost ceiling holding on the inherited trait branches (a cost-4 DATA
  SQUAD Tamer is played, a cost-6 `Avian` Digimon is not).
  A new IR-shape case, "distinguishes the exact-name, exact-trait, and substring-trait
  references it prints", pins all three match modes so a regression to the old spelling
  fails loudly.
  Coverage gap recorded rather than written blind: there is still no *runtime* case that
  proves the `traitContains` branch positively (a cost-5-or-lower `Mysterious Bird` /
  `Giant Bird` card recurred by the inherited effect) or the `nameExact` branch negatively
  (`Ravemon: Burst Mode` refused as a reactive digivolution target). Both need a run to
  pick safe fixtures, which this worker is not permitted to do.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end). The two edits are filter-match changes inside
  `apps/api/src/cards/BT26/BT26-076.ts` only; no existing assertion in
  `BT26-076.test.ts` depends on the old semantics (EX4-058 and BT26-082 are exact-name
  `Ravemon`; ST18-09 stays excluded by its play cost of 6 under either trait rule).

## BT26-077 — Reapermon — 10/10

- Catalog evidence: Purple/Black Digimon, Lv.6 Mega, play cost 12, DP 12000, Virus, traits
  Cyborg / DM / Ver.3, U, max 4. Evo costs Purple Lv.5 = 4, Black Lv.5 = 4. Printed
  clauses: `[Digivolve] Lv.5 w/[DM] trait: Cost 3`; `＜Security A. +1＞`; `＜Execute＞`;
  `＜Fragment (2)＞`; `[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You
  may play 1 play cost of 6 or lower [Ver.3] trait Digimon card from your trash without
  paying the cost. For each of this Digimon's face-down digivolution cards, add 1 to the
  play cost maximum`; `[On Deletion] Delete 1 of your opponent's Digimon or Tamers with the
  highest play cost`. No inherited or Security text.
- Knowledge base: `node tools/kb/query.mjs card BT26-077` returns no entries. Governing
  general rules: §16-38 `＜Execute＞` (at the end of your turn this Digimon may attack,
  may target an unsuspended Digimon, and is deleted at the end of that attack); §16-37
  `＜Fragment＞` (optionally trash the stated number of digivolution cards instead of being
  deleted); §2-3-2-3 (exact `[Ver.3]` trait identity); §2-6 (play cost, the quantity the
  ceiling scales).
- Implementation: one `PlayWithoutCost` shared by three effects (`OnPlay`,
  `WhenDigivolving`, `WhenAttacking`) with `frequency: "OncePerTurn"` and the same
  `sharedUseKey: "bt26-077-play-ver3"`. Target filter is `zone: "trash"`,
  `kind: ["Digimon"]`, `playCostLte: 6`, exact `Ver.3` trait; `from: ["trash"]`,
  `payCost: false`, `optional: true`. The scaling clause is
  `playCostCeiling: { base: 6, raise: 1, per: 1, filter: {}, unit:
  "selfFaceDownDigivolutionCards" }`. `OnDeletion` deletes 1 opposing permanent with
  `kind: ["Digimon", "Tamer"]` and `superlative: "highestPlayCost"`. The three keywords sit
  in the top-level `keywords` array. Registration is `registerIrCard("BT26-077", compiled)`
  with `coverage: "full"`, `residual: []`.
- Primitive trace: `applyPlayCostCeiling` (`actions/play.ts`) computes
  `base + floor(total / per) * raise` and OVERRIDES `target.filter.playCostLte` before
  candidates resolve; for `unit: "selfFaceDownDigivolutionCards"` the count comes from
  `scaling.ts`, which reads `ctx.source.permanent().stack.filter(c => c.faceUp !== true)`
  — this card's own stack only, and face-DOWN cards only, exactly as printed. `base: 6`
  agrees with the filter's printed `playCostLte: 6`, so the zero-face-down case is
  unchanged. `superlative: "highestPlayCost"` is narrowed in `targeting/permanents.ts`,
  which keeps only the maxima and therefore offers every tied permanent. The shared
  `[Once Per Turn]` works through `registration/module.ts`'s
  `effectKey = ${cardId}/${sharedUseKey}` plus `maxPerTurn = 1`, collapsing the three
  timings onto one UseTracker entry.
- Behavioral proof: the suite covers the cost-3 alternate digivolution from an off-color
  Lv.5 DM base; the encoded keyword triple; a plain On Play free play of a Ver.3 Digimon
  from trash; the ceiling raising by exactly this stack's face-down count (a cost-7 Ver.3
  becomes legal with one own face-down card, while a cost-8 Ver.3 stays in trash, and a
  face-up own card and another permanent's face-down card do not count); one use shared
  across all three timings (only one of two identical Ver.3 copies is played);
  `＜Execute＞` attacking an unsuspended Digimon at end of turn with `＜Fragment (2)＞`
  trashing both digivolution cards instead of deleting this Digimon; two security checks
  from `＜Security A. +1＞`; and the On Deletion deleting exactly one of the tied
  highest-play-cost permanents across a Digimon/Tamer mix, leaving the lower one alone.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-078 — Cherubimon — 10/10

- Catalog evidence: Purple/Green Digimon, Lv.6 Mega, play cost 13, DP 13000, Vaccine,
  traits Cherub / Titan / TS, R, max 4. Evo costs Purple Lv.5 = 5, Green Lv.5 = 5. Printed
  clauses: `[Digivolve] Lv.5 w/[TS] trait: Cost 5`; `[Trash] [Your Turn] When any of your
  [Chronomon] text or [Titan] trait Digimon are played, if your opponent has 5 or more
  memory, by returning this card to the bottom of the deck, 1 of them gains ＜Rush＞ and
  ＜Execute＞ for the turn`; `[On Play] [When Digivolving] By deleting this Digimon, you
  may play 1 play cost 12 or lower [Chronomon] text or [Titan] trait card from your trash
  without paying the cost`. No inherited or Security text.
- Knowledge base: Q7105 — "[X] in its text" spans name, traits, effects, inherited
  effects, `[Rule]`, and every requirement header. Q7106 — a `[Trash]` effect can only be
  triggered while its card is in the trash, never from another zone. Q7107 — "if your
  opponent has 5 or more memory" means position 5 and to the right on the OPPONENT's side.
  Q7108 — "XX card with AA or BB" distributes XX over both branches, so the "card" kind and
  the play-cost-12 ceiling hold on the `[Chronomon]` text branch as well as the `[Titan]`
  trait branch. §15-7 makes both "by …" clauses optional processing conditions.
- Implementation: `OnPlay` and `WhenDigivolving` each run a `PlayWithoutCost` from
  `["trash"]` (`payCost: false`, `optional: true`) with
  `cost: { kind: "deleteOwn", target: <self> }` and a target filter of `zone: "trash"`,
  `kind: ["Digimon", "Tamer"]`, `playCostLte: 12`, `nameOrTrait: [{ Chronomon, "text" },
  { Titan, "trait" }]`. The watcher is a `Trash`/`isFromTrash` effect installing a
  `whenPlayed` `SubTrigger` whose `sourceFilter` is `controller: "mine"`,
  `kind: ["Digimon"]` plus the same text/trait union, and whose `fireCondition` is
  `allOf [ isYourTurn, memoryAtLeast 5 controller: "opponent" ]`. Its body returns this
  card to `deckBottom` (`optional: true`, `abortOnDecline: true`) and then grants the
  played Digimon `＜Rush＞` and `＜Execute＞`. Registration is
  `registerIrCard("BT26-078", compiled)` with `coverage: "full"`, `residual: []`.
- Primitive trace: `match: "text"` runs `matchNameOrTrait`'s full union — names ∪ traits ∪
  every printed text field (`effectText`, `inheritedEffectText`, `securityEffectText`,
  `linkEffect`, `linkRequirement`, `dualEffect`, `optionEffect`) — which is exactly Q7105;
  `match: "trait"` stays exact (§2-3-2-3). `isFromTrash` is enforced in
  `effects/builders.ts`, which documents `[Trash]` as REQUIRING trash residency and
  excludes trash-resident cards from every ordinary `[Main]` — that is Q7106. The
  `＜Execute＞` grant is deliberately doubled: `GainKeyword { keyword: "Execute" }` makes
  the keyword observable to combat, while
  `GrantStatic { grant: "effects", tokens: ["Execute"] }` installs the granted-token effect
  that `grantedTokenEffectsForTiming` fires at end of turn — the test asserts both, so
  neither is redundant boilerplate. `duration: "untilEachTurnEnd"` is not a member of the
  `EffectDurationRef` union, but `toDuration`'s default arm maps it to
  `EffectDuration.UntilEachTurnEnd`, identical to the canonical `"forTheTurn"`; this
  spelling is the established convention across the corpus (BT25-101, BT26-021, BT26-030,
  BT26-045, …), so it is left alone rather than churned card-by-card.
- Behavioral proof: the suite covers the cost-5 alternate digivolution from an off-color
  Lv.5 TS base; the self-delete cost paying for a free Titan play from trash; a DUAL
  Digimon/Option card admitted through its Digimon face while a PURE Option is refused;
  Q7105 (a Tamer whose effect text merely mentions Chronomon qualifies); Q7108 (a pure
  Titan Option and a cost-13 Titan Digimon are both refused, so kind and cost hold on
  every branch); Q7106/Q7107 together (the card returns itself from trash to the bottom of
  the deck at opponent memory 5, grants Rush and both halves of Execute, and the granted
  Execute really attacks and self-deletes at end of turn); the granted Rush enabling an
  immediate attack; both negatives (the same card on the battle area does not watch, and
  opponent memory 4 does not fire); and Q7108's Digimon-only requirement on the watcher
  (a matching Tamer being played does not arm it).
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-079 — ZombiePlutomon — 9/10

- Catalog evidence: Purple Digimon, Lv.6 Mega, play cost 12, DP 12000, Virus, traits
  Undead / Titan / TS, SR, max 4. Evo cost Purple Lv.5 = 4. Printed clauses:
  `[Digivolve] [Plutomon]: Cost 1`; `[Digivolve] Lv.5 w/[TS] trait: Cost 3`;
  `[Assembly -2] [Plutomon]`; `[Trash] [Main] If your hand has 5 or fewer cards, play this
  card with the cost reduced by 4`; `＜Security A. +1＞`; `＜Decode ([Plutomon])＞`;
  `＜Retaliation＞`; `[On Play] [When Digivolving] [When Attacking] By trashing 1 card in
  your hand, delete 1 of your opponent's level 6 or lower Digimon`; `[All Turns]
  [Once Per Turn] When any of your opponent's Digimon are played or digivolve, both players
  trash cards in their hand so that they have 4 left`. No inherited or Security text.
- Knowledge base: Q7109 — a `[Trash]` effect triggers only while its card is in the trash.
  Q7110 — you may activate the `[Trash] [Main]` effect AND then declare an Assembly for the
  same play, stacking both reductions. Q7111 — for the `[All Turns]` trim, each player
  chooses the cards to trash from their own hand. Comprehensive §2-3-1-2 — a bracket-only
  card reference (`[Plutomon]`) names ONLY the card with that exact name. §15-7 — "By
  trashing …" is an optional processing condition. Official Rule Manual — once a player
  chooses to perform a "by" condition it counts as one use of an `[X Per Turn]` icon; the
  corollary is that a clause with NO such icon is not capped at all.
- Implementation: keywords `SecurityAttack +1`, `Retaliation`, `Decode` sit in the
  top-level `keywords` array; `＜Decode＞` is additionally realized as a `Static`
  `Replacement { event: "wouldLeavePlay", mode: "instead", leaveCause: "otherThanBattle",
  sourceFilter: isSelfRef }` playing the named card from this Digimon's own stack
  (`fromOwnDigivolutionStack: true`, `payCost: false`, `playedByDecode: true`,
  `optional: true`). The `[Trash] [Main]` effect is a `Main`/`isFromTrash`
  `PlayWithoutCost` of self from `["trash"]` with `payCost: true`, `reduceCostBy: 4`,
  `condition: { kind: "handAtMost", value: 5 }`, and an inline `assembly` block worth a
  further `reduceCostBy: 2` — the Q7110 stacking. The delete clause is a `CostGatedBlock`
  (cost: trash 1 own hand card; `optional`, `abortOnDecline`) deleting one opposing
  `levelComparison lte 6` Digimon, shared by `OnPlay` / `WhenDigivolving` /
  `WhenAttacking`. The trim is an `AllTurns` `frequency: "OncePerTurn"` effect with
  `sharedUseKey: "bt26-079-hand-trim"`, installing `whenPlayed` and `whenAnyDigivolves`
  watchers over `controller: "opponent"`, `kind: ["Digimon"]`, whose body trashes down to
  `untilHandSize: 4` for the controller and then for the opponent with
  `chooser: "opponent"` (Q7111). Registration is `registerIrCard("BT26-079", compiled)`
  with `coverage: "full"`, `residual: []`.
- Defect corrected: two divergences from the printed text.
  1. The `[On Play] [When Digivolving] [When Attacking]` delete clause carried
     `frequency: "OncePerTurn"`. The printed clause has NO `[Once Per Turn]` icon — this
     card prints that icon only on its `[All Turns]` trim, and the sibling BT26-077 prints
     it explicitly on its own three-timing clause, so the catalog does capture the icon
     when it is there. `registration/module.ts` maps
     `frequency === "OncePerTurn" ? 1 : -1` onto `maxPerTurn`, so the card was capped at
     one deletion per turn across all three timings, wrongly losing a second deletion on a
     second attack after an unsuspend. Removed the `frequency` field; the
     `sharedUseKey` is retained so the three timings still resolve to one ledger identity,
     which with `maxPerTurn === -1` imposes no cap.
  2. `＜Decode ([Plutomon])＞` spelled its named card as `match: "name"`, which
     `matchNameOrTrait` implements as a SUBSTRING match. This card's own name,
     ZombiePlutomon, contains "Plutomon", so a ZombiePlutomon sitting in this Digimon's
     digivolution stack satisfied a bracket-only `[Plutomon]` reference. Changed to
     `match: "nameExact"` (§2-3-1-2); the only catalog names containing "Plutomon" are
     `Plutomon` and `ZombiePlutomon`, so this is the exact boundary the fix restores.
- Primitive trace: `Replacement { event: "wouldLeavePlay" }` is installed through the
  leave-prevention seam (`leavePrevention.ts`), and `leaveCause: "otherThanBattle"` is what
  keeps a battle deletion out of Decode's reach. The Decode candidate resolves through
  `candidateLooseInstances` → `definitionMatches` → `matchNameOrTrait`, so the
  `nameExact` change lands at the real candidate seam. `isFromTrash` on the `[Main]`
  effect is enforced by `effects/builders.ts`, which documents `[Trash][Main]` as
  REQUIRING trash residency (Q7109). `frequency` + `sharedUseKey` on the `[All Turns]`
  effect also auto-injects an `oncePerTurnKey` into both `subscribeSubTrigger` installs
  (documented in `builders.ts`, which names BT26-079 as one of the three modules that hit
  the pre-fix unbudgeted-watcher shape), so the two watchers genuinely share one budget.
- Behavioral proof: the suite covers both alternate digivolutions (from Plutomon for 1,
  from an off-color Lv.5 TS base for 3); Q7110 (the `[Trash] [Main]` play declaring an
  Assembly, stacking the material and paying 6); Q7109 negatives (unavailable from the
  battle area, and unavailable at 6 cards in hand); the paid hand-trash deletion; the
  refusal path (nothing trashed, nothing deleted); Q7111 (both hands trimmed to 4, each
  player's own chosen cards in their own trash); the trim's genuine `[Once Per Turn]`
  across an opponent play and a later opponent digivolution; Decode playing Plutomon from
  the stack on an effect deletion; Decode correctly NOT firing on a battle deletion while
  `＜Retaliation＞` kills the attacker; and two security checks from `＜Security A. +1＞`.
  Test files edited: `apps/api/src/cards/BT26/BT26-079.test.ts`. Two assertions changed to
  match the corrected once-per-turn semantics — the IR-shape case now asserts
  `frequency` is `undefined` on the three delete timings (it previously asserted
  `frequency: "OncePerTurn"`), and the behavioral case, renamed "repeats the hand-trash
  deletion at every printed timing (no [Once Per Turn])", now asserts the deletion fires on
  On Play AND again on When Digivolving (hand 2 → 1 → 0, opponent board 2 → 1 → 0) instead
  of asserting a single firing.
- Remaining gap (why 9/10, not 10/10): the `[Digivolve] [Plutomon]: Cost 1` and
  `[Assembly -2] [Plutomon]` gates are NOT governed by this module at run time.
  `digivolutionRequirementsFor` reads
  `packages/shared/src/effects/generated-digivolve-overrides.json`, which holds
  `{"names":["Plutomon"],"cost":1,"isAlternate":true}` for BT26-079, and
  `assemblyRequirementFor` reads `ASSEMBLY_REQUIREMENT_OVERRIDES` in
  `packages/shared/src/effects/data.ts`, which holds
  `{ reduceCost: 2, materials: [{ names: ["Plutomon"], count: 1 }] }`. Both use the
  SUBSTRING `names` gate (`cardData.ts`: "base name must contain at least one token"),
  so a ZombiePlutomon on the field satisfies `[Digivolve] [Plutomon]: Cost 1` and a
  ZombiePlutomon in trash satisfies `[Assembly -2] [Plutomon]` — the same §2-3-1-2
  violation corrected inside the module for Decode, but on a seam this worker is forbidden
  to edit. Required change, for the coordinator:
  - `packages/shared/src/effects/generated-digivolve-overrides.json`, `"BT26-079"` entry
    0 — replace `"names": ["Plutomon"]` with `"namesExact": ["Plutomon"]`
    (`cardData.ts` already implements `namesExact` as an exact effective-name gate, and
    this is the established spelling for bracket-only requirements — see `"BT26-082"`,
    `"BT11-022"`, `"BT11-031"` in `ALTERNATE_DIGIVOLUTION_OVERRIDES`).
  - `packages/shared/src/effects/data.ts`, `ASSEMBLY_REQUIREMENT_OVERRIDES["BT26-079"]` —
    replace `materials: [{ names: ["Plutomon"], count: 1 }]` with
    `materials: [{ nameOrTrait: [{ tokens: ["Plutomon"], match: "nameExact" }], count: 1 }]`
    (`materialMatchesAssemblySlot` accepts `nameOrTrait` and routes it through
    `matchNameOrTrait`; `AssemblyMaterial` has no `namesExact` field, so `nameOrTrait` is
    the available exact spelling — compare `ASSEMBLY_REQUIREMENT_OVERRIDES["EX12-031"]`).
  The module's own `digivolutionRequirement` / `assemblyRequirement` fields were left
  matching the shared data, with an inline comment recording that they are documentation
  only, so the module does not falsely advertise a fix that the runtime does not honor.
  The same latent substring spelling exists for BT26-073 (`names: ["Aegiomon"]`) and
  BT26-080 (`names: ["Bacchusmon"]`), but no catalog name currently contains either token
  as a proper substring, so neither is observable today.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end). Source changes are confined to
  `apps/api/src/cards/BT26/BT26-079.ts` and its colocated test.

## BT26-080 — Bacchusmon / Reversal of the Dead — 10/10

- Catalog evidence: DUAL card (`kinds: ["Digimon", "Option"]`, `isDualCard: true`,
  `dualEffect: "Reversal of the Dead"`), Purple/Green, Lv.6 Mega, play cost 5, DP 13000,
  Virus, traits Shaman / Olympos XII / Iliad / TS, SR, max 4. Evo costs Purple/Green/Black
  Lv.5 = 5. Digimon side: `[Digivolve] Play cost 12 [Bacchusmon]: Cost 2`;
  `＜Security A. +1＞`; `＜Succession ([Bacchusmon])＞`; `[When Digivolving] By suspending
  1 Digimon, this Digimon may attack without suspending`; `[When Attacking]
  [Once Per Turn] Delete 1 of your opponent's Digimon with the same orientation as this
  Digimon`. Option side: `＜Use Req. ([TS] trait)＞`, `[Main] You may unsuspend 1 Digimon.
  Then, delete all of your opponent's unsuspended Digimon with the lowest DP`,
  `optionColorRequirements: ["Purple"]`.
- Knowledge base: Q7112 — "orientation" means the suspended/unsuspended state of a card.
  Q7113 — the `[When Digivolving]` cost may suspend EITHER player's Digimon. Q7114 — the
  `[Main]` effect may unsuspend EITHER player's Digimon. Comprehensive §16-42 —
  `＜Use Req.＞` lets you ignore the Option's color requirements while you control the
  specified cards. §15-7 — "By suspending …" is an optional processing condition.
- Implementation: `WhenDigivolving` runs an `Attack` action on self with
  `withoutSuspending: true`, `optional: true`, and
  `cost: { kind: "suspend", target: { filter: { kind: ["Digimon"] }, count: 1 } }` — the
  cost filter is deliberately controller-free, which is Q7113. `WhenAttacking` carries the
  printed `frequency: "OncePerTurn"` and deletes 1 opposing Digimon with
  `sameOrientationAsSource: true` (Q7112). `＜Succession ([Bacchusmon])＞` is a `Static`
  `GrantStatic { grant: "effects", topmostOnly: true, duration: "permanent" }` over a
  `[Bacchusmon]`-named Digimon filter — the same shape the peer BT26-060 uses for its own
  `＜Succession＞`. `＜Use Req. ([TS] trait)＞` is a `Static` `WaiveColorRequirement` gated
  on `youHave` a friendly `TS`-trait card (no kind restriction, so a Digimon or a Tamer
  satisfies §4-21-2). The Option side is a `Main` effect: an `optional` `Unsuspend` of 1
  controller-free Digimon (Q7114), then a `Delete` with `count: "all"` over
  `controller: "opponent"`, `kind: ["Digimon"]`, `suspended: false`,
  `superlative: "lowestDP"`. Registration is `registerIrCard("BT26-080", compiled)` with
  `coverage: "full"`, `residual: []`.
- Primitive trace: `sameOrientationAsSource` is resolved in
  `matching/permanent.ts` against `ctx.trigger.attackerPermanentId ??
  ctx.trigger.subjectPermanentId` first, falling back to `source.permanent()` — so in an
  attack window the LIVE attacker is the orientation reference, not a stale CardSource,
  which is what makes Q7112 correct after the attacker suspends or is kept unsuspended.
  `superlative: "lowestDP"` narrows to the tied minima in `targeting/permanents.ts`, and
  `count: "all"` then deletes every tied member — matching "delete ALL … with the lowest
  DP". Ordering matters and is honored: the `Unsuspend` runs first, so a Digimon
  unsuspended by this effect is inside the `suspended: false` pool the `Delete` then
  measures. `WaiveColorRequirement` has real consumers at `actions/playCard.ts`'s
  `color-requirement-unmet` gate. The digivolution requirement's `basePlayCost: 12`
  distinguishes the printed play-cost-12 [Bacchusmon] (BT25-077) from this cost-5 DUAL
  reprint — `cardData.ts` compares `baseDef.playCost !== req.basePlayCost` exactly.
- Behavioral proof: the suite covers the cost-2 digivolution from the play-cost-12
  Bacchusmon; the encoded keyword pair; `＜Succession＞` really borrowing the topmost
  stacked Bacchusmon's On Play effect; the orientation filter both as encoded IR and
  end-to-end (a suspended source deletes the suspended opponent and leaves the unsuspended
  one); the printed `[Once Per Turn]` on the attack deletion (two attack windows, one
  deletion); Q7113 in both directions (suspending the opponent's Digimon, and suspending
  your own, with the source proven still unsuspended and its attack landing on security);
  Q7114 through the DUAL Option face with the `[TS]` use requirement satisfied (the
  opponent's suspended low-DP Digimon survives the unsuspended-only filter while the
  lowest-DP unsuspended ones die); the all-of-the-tied-minimum deletion after unsuspending
  your own Digimon; and two security checks from `＜Security A. +1＞`.
- Verification: focused suite — not run by this worker (the coordinator runs the BT26
  suite and typecheck once at the end); no source change was made to this card.

## BT26-081 — Mervamon — 10/10

- Catalog evidence: Purple/Yellow/Black Lv.6 Mega Digimon, Virus, play cost 13, DP 13000,
  traits Shaman / Olympos XII / Iliad / TS, SR, max 4. Three printed evo costs (Purple,
  Yellow, Black Lv.5 for 5). Alternate requirements `[Digivolve] [Minervamon]: Cost 2` and
  `[Digivolve] Lv.5 w/[TS] trait: Cost 4`, plus `[Assembly -5] [Minervamon]`. Main text has
  the `[On Play] [When Digivolving]` play-budget clause and the `[All Turns]` Iliad aura. No
  inherited or Security text.
- Knowledge base: Q7115 — the DP reduction still resolves when the play half played nothing,
  so the "Then, …" clause must not be gated on the play acting. Q7116 — a card played at or
  below the current DP debuff is not deleted mid-resolution; all deletions happen at the rule
  check after the whole effect resolves. Both are engine-level guarantees (no per-action
  gating on `ifThisEffectActed`, deletions deferred to the rule sweep), and the IR adds no
  gate that would break either.
- Implementation: `PlayMultiple` from `["hand","trash"]` with `payCost:false`,
  `totalCost:8`, `optional:true`, filtered to controller `mine`, kinds Digimon/Tamer with the
  `Iliad` trait; then `ModifyDP` of `-4000` on one opponent Digimon for
  `untilOpponentTurnEnd`, scaled `{ per: 1, unit: "cards", filter: iliadOrTs }`. The `[All
  Turns]` block grants Alliance, Reboot and Blocker plus `+2000` DP to `count:"all"` of the
  controller's battle-area Iliad Digimon. Digivolution requirements and the Assembly record
  match the printed headers.
- Primitive trace: `runPlayAction`'s `PlayMultiple` branch resolves loose candidates from the
  named zones, asks with `min: 0` for the optional pick, then enforces the cost budget
  server-side (a selection whose running total exceeds 8 is dropped, never played), and
  finally calls `fx.playInstances(chosen, { payCost: false })` so each played card opens its
  own `[On Play]` window. `scaleFactor`'s `"cards"` unit routes through `countMatching`, which
  with no `zone` counts battle-area plus breeding permanents for the seats selected by
  `controller: "mine"` — the correct reading of "your … Digimon or Tamers", and it includes
  Mervamon itself. `nameOrTrait` arrays are a union (`definitionMatches`), so `["Iliad","TS"]`
  is the printed "or"; traits resolve through `staticTraitsOf` (forms ∪ attributes ∪ types ∪
  `[Rule]` traits). The keyword grants land in the continuous ledger with permanent duration
  and are re-derived each recompute.
- Behavioral proof: the colocated suite proves both alternate evolutions and their exact
  memory costs, the Assembly declaration, the cost-8 budget across hand and trash, the scaled
  DP reduction, Q7115's no-play path, and that the aura reaches only Iliad Digimon (a
  non-Iliad neighbour is asserted unchanged).
- Verification: not run — the coordinator runs the BT26 suite once at the end. No engine seam
  changed; no source edit was required for this card.

## BT26-082 — Ravemon — 10/10

- Catalog evidence: mono-Purple Lv.6 Mega Digimon, Vaccine, play cost 12, DP 12000, traits
  Cyborg / DATA SQUAD, SR, max 4. Printed evo cost Purple Lv.5 for 4; alternate
  `[Digivolve] [Crowmon]/Lv.5 w/[DATA SQUAD] trait: Cost 3`. The record has **no**
  `securityEffectText` — every clause, including the `[Security]` one, lives in `effectText`.
  Clauses: `{Security} [End of Opponent's Turn]` self-play, `[When Digivolving] [End of
  Attack]` by-cost deletion, `[On Deletion]` hand trash plus face-up bottom-security
  placement, and `[Rule] Trait: Has [Birdkin] Type`.
- Knowledge base: Q7117 defines the new `{Security}` effect — "can be triggered/activated
  while its card is face up in the security stack. It can't be triggered or activated in areas
  other than the face-up security cards." Q7122 names this card's clause explicitly as its
  "{Security} [End of Opponent's Turn] effect". Q7120 is a separate, generic question about
  the classic bracketed `[Security]` check tag on a face-up card ("Yes, it triggers") — it is
  not about this card, which carries no such tag. Q7118/Q7119 keep every other face-up
  security rule identical to a standard security card, so a check on this card trashes it.
  Q7121 turns face-up cards face down before a shuffle. Q7123 makes the "by" cost
  all-or-nothing: trashing only 1 of the 2 required cards cannot pay it.
- Implementation: `EndOfOpponentsTurn` + `isSecurity` runs `PlayWithoutCost` on self from
  `["security"]`. `WhenDigivolving` and `EndOfAttack` share a `Modal` (`choose:1`,
  `optional:true`, `abortOnDecline:true`) whose two branches delete one
  `superlative:"highestDP"` opponent Digimon paying either `deleteOwn` (self) or
  `trashBottomFaceDownUnderTamer` with `count:2`. `OnDeletion` trashes 1 card from the
  opponent's hand with `chooser:"opponent"`, then optionally places this card from the trash
  as the bottom security card face up, gated on `handAtMost` 7. A `Static` `GrantStatic`
  mirrors the `[Rule]` Birdkin trait (also derived by `staticTraitsOf`, so the two agree).
- Defect corrected: the module also filed the same self-play under `trigger: "Security"`,
  which `timingFor` maps to `EffectTiming.SecuritySkill` — the security **check** window. That
  made Ravemon play itself for free whenever it was checked, a behaviour the printed timing
  and Q7117/Q7122 do not grant, and which the absent `securityEffectText` rules out. The
  duplicate effect was removed; the `[End of Opponent's Turn]` entry alone carries the clause
  and already proves it does not fire face down or from the trash.
- Primitive trace: `timingFor` routes `isSecurity && trigger === "Security"` to
  `SecuritySkill` and leaves the timed security effect on its own timing, so the removal
  changes only the check behaviour. The `Modal` cost path goes through `payCost`, whose
  `trashBottomFaceDownUnderTamer` case requires the full count before it returns true —
  Q7123's indivisible cost. `Delete` with `superlative:"highestDP"` narrows to the tied
  maximum and asks for the pick. `SecurityManipulation`/`placeAsSecurity` with `toTop:false`
  and `faceUp:true` produces the face-up bottom security card the KB describes.
- Behavioral proof: the colocated suite proves both alternate evolutions and costs, each cost
  branch of the modal (including Q7123's failed single-card payment and the declined branch),
  the end-of-opponent-turn self-play from face-up security, Q7117's negative paths (face down
  and in the trash), Q7121's shuffle, Q7122's loss, both sides of the 7-card hand boundary on
  deletion, and the Birdkin trait. The check-window case was rewritten to assert the standard
  Q7119 outcome: the face-up card is checked, trashed, and does not reach the battle area.
- Verification: not run — the coordinator runs the BT26 suite once at the end. Files changed:
  `apps/api/src/cards/BT26/BT26-082.ts`, `apps/api/src/cards/BT26/BT26-082.test.ts`. No engine
  seam changed.

## BT26-083 — Junomon: Hysteric Mode — 10/10

- Catalog evidence: Purple/Yellow Lv.7 Mega Digimon, Virus, play cost 14, DP 14000, traits
  Shaman / Olympos XII / Iliad / TS, SR, max 4. Printed evo costs Purple and Yellow Lv.6 for
  4; alternate `[Digivolve] Lv.6 w/[TS] trait: Cost 4` and `[Assembly -4] [Junomon]`. Printed
  keywords Rush, Piercing, Execute and `＜Decode ([Junomon]/Lv.5 or lower w/[Iliad] trait)＞`.
  `[On Play] [When Digivolving]` trashes all own security, deletes one opposing Digimon per
  trashed card, then `＜Recovery +3＞`. `[On Deletion]` gives every opposing Digimon
  `＜Security A. -1＞` until their turn ends.
- Knowledge base: Q7124 — with 0 security the effect still activates and still performs
  `＜Recovery +3＞`, so neither the trash step nor the per-card deletion may abort the rest.
  Comprehensive Rules §16-36 defines `＜Decode＞`: when the Digimon would leave the battle area
  other than by a battle, you may play 1 specified card from its digivolution cards without
  paying the cost; §16-36-3 makes it optional, and it does **not** stop the Digimon leaving.
- Implementation: `SecurityManipulation` `trashTop` with `leaveCount: 0` and
  `trackCount:"trashedSecurity"`, then `RepeatPerCount` over that counter deleting 1 opponent
  Digimon per iteration, then `placeFromDeck` of 3 for the Recovery. `OnDeletion` grants
  `SecurityAttack: -1` to `count:"all"` opposing Digimon for `untilOpponentTurnEnd`. Decode is
  a `Static` `Replacement` on `wouldLeavePlay` with `leaveCause:"otherThanBattle"`,
  `mode:"instead"`, whose single action plays one card from this Digimon's own digivolution
  cards (`fromOwnDigivolutionStack`, `payCost:false`, `playedByDecode`, `optional`), matching
  either `[Junomon]` in name **or** Lv.5-or-lower with the Iliad trait via `orFilters`.
- Primitive trace: `consultLeavePrevention` treats `mode:"instead"` as a side-effect-only
  reaction — it runs `apply` and only counts as a save when the permanent actually relocated,
  which a Decode play never does. That is exactly §16-36: the card is played and the Digimon
  still leaves. `causeAllows` for `otherThanBattle` returns `cause !== "byBattle"`, matching
  the printed exclusion. The name/level split is an `orFilters` union, so a Lv.6 Junomon
  qualifies through the name branch while a Lv.6 non-Junomon Iliad Digimon does not — the
  printed parenthetical read literally. `RepeatPerCount` re-resolves its target each iteration,
  so each deletion picks a live Digimon, and the Recovery runs unconditionally afterwards
  (Q7124).
- Behavioral proof: the colocated suite proves both evolution routes, Assembly with a Junomon
  material, the Q7124 zero-security path, the full wipe/delete-per-card/recover chain, Rush
  and Piercing in a real attack, Execute, Decode into a level-5 Iliad Digimon on a
  self-deletion, the Decode name-versus-level boundary in both directions, and the
  `＜Security A. -1＞` debuff on deletion.
- Verification: not run — the coordinator runs the BT26 suite once at the end. No defect
  found; no file changed.

## BT26-084 — Copipemon — 9/10

- Catalog evidence: White Lv.3 Digimon, forms Stnd. / Appmon, attribute System, play cost 4,
  DP 4000, traits `Copy & Paste (App Name)` / `Seven Code`, C, max 4. Printed evo cost Purple
  Lv.2 for 0 and alternate `[Digivolve] Lv.2 w/[Appmon] trait: Cost 0`. Keyword
  `＜Detach ([Seven Code] trait)＞`. `[Your Turn] [Once Per Turn]` linked reveal of 3 with a
  cost-3 discount. Link header `[Link] [Appmon] trait: Cost 3`; link effect `[When Linking]`
  links one non-white Lv.4-or-lower `[System]`/`[Seven Code]` card from the trash.
- Knowledge base: Q7125 — a card without `＜Link＞` cannot be linked by a "you may link"
  effect. Q7126 — the remainder returns to the deck only after the played card is in play (or
  after the used Option's `[Main]` effect resolved and the Option was trashed). Q7127 — a
  `BT26-102 Seven Code PAD` used from the reveal resolves its placement and Dantemon
  digivolution, then draws the digivolution bonus **from the unrevealed deck**, then trashes
  the PAD and returns the remainder. Q7128 — once the PAD moves the just-linked card under
  another Digimon, that card's pending `[When Linking]` effect no longer activates.
- Implementation: `WhenLinking` + `isLinked` runs a free `Link` from the trash into the host
  (`recipient: self`, which resolves to the permanent the link face is attached to) filtered by
  `excludeColors: ["White"]`, `levelComparison lte 4`, `hasLinkRequirement: true` and the
  System-or-Seven-Code trait union. `YourTurn` + `frequency:"OncePerTurn"` wraps a `SubTrigger`
  on `whenLinked` scoped to self, running `RevealAdd` with `revealCount: 3`, one `add` slot
  (`to:"play"`, `costDelta: 3`, `optional`) whose `orDispositions` route an Option to
  `useOption`, and `rest: "deckTopOrBottom"`.
- Primitive trace: `runRevealAdd` filters the disposition choices by kind, so an Option can
  only take the `useOption` branch and a Digimon only the `play` branch — the printed "play or
  use 1 … card". A reduced play goes through `fx.playInstances(ids, { payCost: true, costDelta })`,
  so the discount is a reduction and not a free play. The `useOption` branch wraps
  `fx.digivolveFromInstance` so its bonus draw excludes the still-revealed remainder
  (`excludeInstanceIds`), then returns the remainder after the Option finishes — the engine's
  encoding of Q7127/Q7126. `hasLinkRequirement` mirrors `linkEligible` (a present, non-`'-'`
  `linkRequirement`), which is Q7125. `linkMax` is base 1 plus the summed `＜Link +N＞` grants.
- Behavioral proof: the colocated suite proves the Appmon-level-2 evolution for 0, the cost-3
  link, the Q7125 eligible/ineligible trash pool, the single-selection boundary when both a
  Seven Code Digimon and Option are revealed, the Option-use branch and its cost, the reduced
  Digimon play, a reveal driven by a real link intent, the once-per-turn limit and the
  your-turn-only guard, Detach in a real battle, and the Q7127/Q7128 integration paths.
- Open defect (blocks 10/10): the coordinator's baseline run reports
  `Q7127 resolves Seven Code PAD and draws the digivolution bonus from the unrevealed deck`
  failing. Static tracing did not reproduce a divergence: the card's IR matches the printed
  text and the KB, and each seam the case depends on is present and correct on reading —
  `RevealAdd`'s `useOption` disposition, the `digivolveFromInstance` override that carries
  `draw:false` plus a `beforeWhenDigivolving` draw with `excludeInstanceIds`,
  `useOptionFromHand` spreading the caller's `fx` into its own `optionCtx`, and
  `digivolveFromInstance` invoking `beforeWhenDigivolving` unconditionally. The case is a deep
  multi-card integration (BT26-084 → BT26-102 → BT26-086 → attack → security), and this
  worker is not permitted to run the suite, so the failing assertion could not be isolated to
  a specific step. Recommendation for the coordinator: capture the failure output for this
  single case, which will name the step (Dantemon not reached, the draw taking a revealed
  card, or the trailing security assertion), and hand it back with that evidence.
- Verification: not run — the coordinator runs the BT26 suite once at the end. No file changed
  for this card.

## BT26-085 — Giant Slayer — 10/10

- Catalog evidence: White Digimon with no level and attribute `NO DATA`, play cost 12, DP
  14000, trait TS, R, max 4, no evo costs. `[Assembly -5] 5 different-level cards
  w/[Chronomon] in text or w/[Shaman] trait`. Printed keywords Collision, Reboot, Blocker.
  `[On Play]` blocks the opponent's effects from reducing its DP or trashing its stacked
  cards until the opponent's turn ends. `[All Turns]` replaces leaving the battle area with a
  free digivolution into `[Chronomon: Destroy Mode]` from the hand or trash.
- Knowledge base: no entries for this card. No errata. The leave clause is the only card in
  the whole catalog whose text pairs "by digivolving" with "it doesn't leave", so there is no
  peer ruling to lean on; the printed "by …" wording is the standard indivisible-cost form,
  which the game treats as unpayable when the action cannot be performed.
- Implementation: `OnPlay` installs `Restrict` `dpImmune` with `byOpponentEffectsOnly: true`
  and a `StackTrashLock`, both for `untilOpponentTurnEnd`. `AllTurns` installs a `Replacement`
  on `wouldLeavePlay` in `mode:"prevent"` with no `leaveCause` (so any cause, battle
  included), whose actions are the free `Digivolve` of self into the exact name
  `Chronomon: Destroy Mode` from `["hand","trash"]` followed by the prevention marker. The
  Assembly record carries `differentLevels: true` and the `[Chronomon]`-in-text or
  `[Shaman]`-trait union.
- Defect corrected: the prevention had no gate on the digivolution succeeding.
  `replacement.ts`'s `preventCheck` runs the inner actions and then returns `true` regardless
  of what they did, so with the prompt accepted and no `Chronomon: Destroy Mode` anywhere the
  Digimon was saved without paying anything — an unkillable permanent. A nested
  `{ kind: "Prevent", condition: { kind: "ifThisEffectDigivolved" } }` was added: the
  `Prevent` sibling is skipped as an action and its condition is evaluated after the inner
  actions, so the leave is now prevented only when `lastDigivolveResult` is true. `mode`
  stays the explicit `"prevent"`, and the existing decline path is unaffected.
- Primitive trace: `consultLeavePrevention` runs `protects` (self, via `isSelfRef`) and then
  `preventCheck`, which prompts because `action.optional !== false`, runs the inner actions,
  and now honours the nested condition. `runDigivolve` calls
  `fx.digivolveFromInstance(pid, chosen, { payCost: false })` and sets `lastDigivolveResult`
  only when the primitive returned a permanent; `evaluateCondition`'s
  `ifThisEffectDigivolved` reads exactly that flag. `Restrict` with `byOpponentEffectsOnly`
  and `StackTrashLock` are seat-scoped, which is why the controller's own DP reduction and
  stack trash still land. `nameExact` matching rejects the near-miss `Chronomon: Holy Mode`.
- Behavioral proof: the colocated suite proves the five-different-level Assembly and its
  negative (same-level materials rejected), the DP/stack lock against the opponent while
  allowing the controller's own effects, Collision forcing a block, Blocker, Reboot through a
  real opponent turn, and the replacement from hand and from trash plus the declined branch. A
  new case proves the corrected boundary: with only `Chronomon: Holy Mode` in hand the
  deletion goes through, the card reaches the trash, and the near-name card stays in hand.
- Verification: not run — the coordinator runs the BT26 suite once at the end. Files changed:
  `apps/api/src/cards/BT26/BT26-085.ts`, `apps/api/src/cards/BT26/BT26-085.test.ts`. No engine
  seam changed.

## BT26-086 — Dantemon — 9/10

- Catalog evidence: White Lv.7 Digimon, forms Unknown / Appmon, attribute Unknown, play cost
  14, DP 14000, trait `Open (App Name)`, SR, max 4, no evo costs. `[Assembly -7] 7 [Seven
  Code] trait Digimon cards w/different names`. Printed keywords Rush, Reboot, Blocker and
  `＜Link +6＞`. `[On Play] [When Digivolving]` links up to 7 differently named `[Appmon]`
  cards out of this Digimon's own digivolution cards for free, then it may attack without
  suspending. `[All Turns] [Once Per Turn]` on getting linked, may delete 1 opposing Digimon,
  and at 7 link cards returns the opponent's top security card to the bottom of the deck.
- Knowledge base: no entries for this card. The linked-card eligibility rule that governs the
  free link is Q4881/Q7125 (a card can only be linked if it carries `＜Link＞`), and the
  excess-link rule check is §17-1-3-2-5 with Q6370's "the player chooses which".
- Implementation: a `Static` effect with empty `actions` carries all four printed keywords.
  `OnPlay` and `WhenDigivolving` share `Link` (`count: 7`, `upTo: true`,
  `differentNames: true`, `from: ["digivolutionCards"]`, `payCost: false`, `optional: true`)
  whose filter is `zone:"digivolutionCards"` with `hostFilter: { isSelfRef: true }`,
  `hasLinkRequirement: true` and the Appmon trait, then `Attack` on self with
  `withoutSuspending: true, optional: true`. `AllTurns` + `OncePerTurn` wraps a `whenLinked`
  `SubTrigger` with an optional `Delete` and a `SecurityManipulation` `moveTopToBottom` on the
  opponent gated by `selfLinkCountAtLeast: 7`.
- Primitive trace: a keyword-only effect resolves through `effect.ts`'s empty-actions branch,
  which turns each entry into a self-targeted `GainKeyword` at permanent duration — the same
  shape `registration/module.ts` synthesises for a top-level `compiled.keywords`, so it is the
  established encoding (EX11-073 uses it for `＜Link +2＞`). `GainKeyword`'s `Link`/`LinkMax`
  case routes to `fx.grantLinkMax`, and `linkMax` is `BASE_LINK_MAX (1) + linkMaxDelta`, so
  `＜Link +6＞` is what makes 7 link cards legal under `trashExcessLinkCards`. `hostFilter`
  keeps the free link to this Digimon's own stack; `hasLinkRequirement` mirrors `linkEligible`.
  `continuous.hasKeyword` also reads printed keywords, so Rush/Reboot/Blocker are live from
  the card text as well as the ledger.
- Behavioral proof: the colocated suite proves the seven-different-name Assembly and two
  negatives (an Option material and a duplicate name), that the free link takes only this
  Digimon's own Appmon sources and leaves a neighbour's stack alone, Blocker in a real block,
  the delete-plus-security-return at exactly 7 links, the once-per-turn limit, and the
  below-seven boundary where the deletion happens but the security card does not move.
- Open defect (blocks 10/10): the coordinator's baseline run reports
  `publishes Rush, Reboot, Blocker, and enough Link capacity for seven cards` failing.
  Reading narrows it to the `linkMaxDelta === 6` / `linked.toHaveLength(7)` pair rather than
  the keyword or Reboot assertions: Rush/Reboot/Blocker resolve from printed text through
  `continuous.hasKeyword`, and BT26-085's own suite already proves Reboot unsuspending through
  a real `runTurn(1)` with the same fixture shape. Every seam on the `＜Link +6＞` path reads
  correctly in isolation — the empty-actions keyword branch, the `Link`/`LinkMax` case in
  `GainKeyword`, `grantLinkMax`'s continuous tagging, and `clearContinuous`'s re-derivation —
  so the divergence could not be isolated without running the case, which this worker is not
  permitted to do. Recommendation for the coordinator: run this single case and report which
  of the four assertions fails plus the observed `linkMaxDelta`; a value of 0 points at the
  continuous pass never resolving the keyword-only Static effect, and a multiple of 6 points
  at grant accumulation across recomputes.
- Verification: not run — the coordinator runs the BT26 suite once at the end. No file changed
  for this card.

## BT26-087 — Toya Kuga — 10/10

- Catalog evidence: Red Tamer, play cost 3, trait TS, U, max 4. Main text:
  `[Start of Your Main Phase] By returning 1 [TS] trait Digimon card from your trash to the
  bottom of the deck, gain 1 memory. After, you may return 1 [Giant Slayer] from your trash to
  the hand.` and `[On Play] By trashing 1 [TS] card from your hand, ＜Draw 2＞`. Separate
  `securityEffectText`: `[Security] Play this card without paying the cost.`
- Knowledge base: no entries for this card and no errata. The two "by …" clauses are the
  standard indivisible-cost form: no cost, no effect (the same rule Q7123 states for
  BT26-082).
- Implementation: `StartOfYourMainPhase` is a `CostGatedBlock` whose cost is a `return` of one
  trash card filtered to `kind:["Digimon"]` with the TS trait, `to:"deckBottom"`, marked
  `optional` and `abortOnDecline`; the block gains 1 memory and then optionally returns one
  `nameExact` `Giant Slayer` from the trash to the hand. `OnPlay` is a second `CostGatedBlock`
  whose cost trashes one TS card from hand — deliberately with no `kind` restriction, because
  the printed text says "[TS] card", not "[TS] Digimon card" — around `Draw` 2. `Security` +
  `isSecurity` plays this card from security without paying, matching the separate
  `securityEffectText`.
- Primitive trace: `CostGatedBlock` pays through `payCost` before running its body, so a
  declined or unpayable cost yields no memory, no draw and no card movement — the "by" rule.
  The `return` cost's `to: "deckBottom"` is the printed destination, and the Digimon-only
  filter is what makes a TS **Tamer** in the trash an illegal payment. The follow-up `Return`
  is separately `optional`, so declining it keeps the memory already gained. `nameExact`
  keeps the recovery to `Giant Slayer` (BT26-085) and rejects near names.
- Behavioral proof: the colocated suite proves the compiled shape, the paid start-of-main
  return plus memory and the optional Giant Slayer recovery, the on-play trash-for-two-draws,
  the negative where no payable TS Digimon exists (no memory, no recovery), the boundary where
  only a TS **Tamer** sits in the trash (cost unpayable), the declined branches of both
  clauses, and the free Security play.
- Verification: not run — the coordinator runs the BT26 suite once at the end. No defect
  found; no file changed. Note for the ledger: this module ends with `registerIrCard` and no
  `export default compiled;`, matching BT26-088 and unlike BT26-081..086 — cosmetic only, the
  named `compiled` export the test imports is present.

## BT26-088 — Hiroko Sagisaka — 10/10

- Catalog evidence: Red Tamer, play cost 4, trait TS, R, max 4. Main text:
  `[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.` and
  `[Your Turn] When any [Boss] or [TS] trait Digimon cards would be played, by suspending this
  Tamer, reduce the costs by 1. If you have no Digimon, instead reduce the costs by 2.`
  Separate `securityEffectText`: `[Security] Play this card without paying the cost.`
- Knowledge base: no entries for this card and no errata. The reduction is a "by suspending"
  cost, so an already-suspended Tamer cannot pay it and the reduction does not apply.
- Implementation: `StartOfYourMainPhase` gains 1 memory under `condition: { kind:
  "opponentHas", filter: { kind: ["Digimon"] } }`. `YourTurn` installs a `Replacement` on
  `wouldBePlayed` in `mode:"reduceCost"` whose `sourceFilter` is `controllerDefault:"mine"`,
  `kind:["Digimon"]`, trait union `["Boss","TS"]`, with `amountChoices` ordered so the
  `youHaveNone` branch (2) is evaluated before the `youHave` branch (1), and
  `cost: { kind:"suspend", target: self }`. `Security` + `isSecurity` plays this card from
  security without paying.
- Primitive trace: the `wouldBePlayed` reducer is picked up at `EffectTiming.BeforePayCost`
  (`timingFor` routes a `YourTurn` effect carrying a `wouldBePlayed` `Replacement` there), so
  it participates in the real pay-time window rather than the continuous pass. The interactive
  branch of `replacement.ts` checks `canPayCost` first, rejects a self-suspend when
  `fx.canPayActivationCost(self, "suspend")` is false — the already-suspended negative — then
  prompts, then pays. `amountChoices` resolve top-down through `evaluateCondition`, so the "if
  you have no Digimon, instead" clause wins whenever it holds. `nameOrTrait` unions make
  `[Boss]` **or** `[TS]` a single alternative rather than a conjunction, and
  `controllerDefault: "mine"` keeps the reduction on the controller's own plays.
- Behavioral proof: the colocated suite proves the compiled shape, the conditional memory gain
  in both directions, the suspend-for-1 reduction on a TS Digimon, the "no Digimon" 2-cost
  branch (including a non-TS `[Boss]` Digimon, which proves the trait union), the exact
  boundary where an existing Digimon drops the reduction back to 1, the declined branch paying
  the full cost, the already-suspended negative, and the free Security play.
- Verification: not run — the coordinator runs the BT26 suite once at the end. No defect
  found; no file changed. Note for the ledger: like BT26-087, this module ends with
  `registerIrCard` and no `export default compiled;` — cosmetic only.

## BT26-089 — Kyo Sawashiro — 9/10

- Catalog evidence: Yellow Tamer, play cost 3, DP 0, no evo costs, traits
  [Glowing Dawn]/[BEATBREAK], rarity R, max 4. Main text: "[Start of Your Main Phase]
  By placing 1 [BEATBREAK] trait card from your hand face down under this Tamer,
  ＜Draw 1＞ and gain 1 memory." plus "[All Turns] When your security stack is removed
  from, by suspending this Tamer, place the top card of your deck face down under this
  Tamer. After, if removed from by effects, give 1 of your opponent's Digimon
  ＜Security A. -1＞ until their turn ends." Security: "[Security] Play this card
  without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-089` returns Q7137-Q7142.
  Q7137: a card placed under a Tamer that already has cards under it goes to the
  BOTTOM of those cards. Q7138: the controller may not reorder face-down cards under
  a Tamer. Q7139: only the controller may look at them. Q7140: a face-down card
  trashed from under a Tamer goes to the trash FACE UP. Q7141: the "After" clause is
  unreachable unless the "by suspending this Tamer" condition is actually paid.
  Q7142: on a security check, the [Security] effect resolves first, then the other
  triggered effects in turn-player order.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "place", target: hand + [BEATBREAK] trait, host: "self",
  destination: "digivolutionStack", position: "bottom", faceDown: true }`, gating
  `Draw 1` + `GainMemory 1`, `optional: true` with `abortOnDecline: true`. `AllTurns`
  carries two `SubTrigger` watchers that partition the single printed trigger:
  `whenSecurityRemoved` fires only on non-effect removal
  (`allOf[triggerRemovedSecuritySeat mine, not triggerSecurityRemovedByEffect]`) and
  runs the suspend-gated deck-top placement alone;
  `whenEffectRemovesFromSecurity` fires on `triggerRemovedSecuritySeat mine` and runs
  the same suspend-gated placement plus `GainKeyword SecurityAttack -1` on 1 opposing
  Digimon for `untilOpponentTurnEnd`. `Security` is the standard
  `PlayWithoutCost { isSelf, payCost: false }`. Registration is exclusively
  `registerIrCard("BT26-089", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: the `[All Turns]` deck-top placement had no `position`, so
  `runPlaceUnder`'s `fromDeckTop` branch computed `belowTop: action.position !== "top"`
  = `true` and pushed the card to the TOP of the cards under the Tamer, contradicting
  Q7137. Added `position: "top"`, the encoding this branch (and the audited peers
  BT25-087/088/090) uses for the true bottom.
- Primitive trace: `placeUnder` in `primitives.ts` treats `stack[0]` as the bottom of
  the digivolution cards (`unshift`) and the last element as the card directly under
  the top (`push`, the destination of `digivolve`'s prior top). The place COST path in
  `costs.ts` reads `belowTop: cost.position !== "bottom"`, so the start-main cost's
  `position: "bottom"` correctly unshifts; the `fromDeckTop` ACTION path reads
  `belowTop: action.position !== "top"` — an inverted seam, hence the fix above.
  `faceUp: cost.faceDown !== true` gives the face-down placement Q7139/Q7140 depend
  on, and `trashDigivolutionCards` flips the instance face up on the way to the trash.
  `CostGatedBlock` with `abortOnDecline: true` is what makes Q7141 hold: no
  suspension, no placement and no debuff. The `SecurityAttack` grant takes the
  ordinary continuous-ledger path (not the `count: "all"` player-scoped branch), and
  `toDuration("untilOpponentTurnEnd")` maps to `EffectDuration.UntilOpponentTurnEnd`.
- Behavioral proof: 8 cases. Q7137 placement into a stack that already holds a card
  (asserts the new card at index 0, both face down, plus draw and +1 memory);
  declined start-main cost (no placement, no draw, no memory); normal security check
  (suspends, places the deck top, debuff NOT applied); effect-driven security removal
  (suspends, places exactly one card, `SecurityAttack` reads -1 on the opposing
  Digimon) which also proves the two watchers do not double-fire; already-suspended
  Tamer (Q7141: no placement, no debuff); opponent's security removed (no reaction);
  Q7142 ordering against BT26-087 in security; and the [Security] self-play.
- Gap recorded: no case places the deck top under a Tamer that ALREADY has cards
  under it, so the corrected `position` is proven by the primitive trace and the
  BT25-088 peer test rather than by a colocated assertion. Adding that assertion needs
  a test run, which this audit pass may not perform.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Changed file: `apps/api/src/cards/BT26/BT26-089.ts`.

## BT26-090 — Kanan Yuki — 10/10

- Catalog evidence: Green Tamer, play cost 3, DP 0, no evo costs, traits
  [ADAMAS]/[TS], rarity R, max 4. Main text: "[Start of Your Main Phase] If you have 4
  or less memory, gain 1 memory." plus "[End of Your Turn] By suspending this Tamer,
  you may use 1 Option card with the [TS] trait from your hand. For each point of
  memory your opponent has, reduce this effect's paid cost by 1." Security: "[Security]
  Play this card without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-090` returns Q7143 only — "4 or
  less memory" means the gauge positions at 4 and to the right of it, i.e. the check
  passes at 4, 3, 2, 1 and while the gauge sits on the opponent's side. No errata or
  restriction applies.
- Implementation: three effects. `StartOfYourMainPhase` runs a single
  `GainMemory { amount: 1 }` gated by
  `{ kind: "memoryAtMost", controller: "mine", value: 4 }`. `EndOfYourTurn` runs
  `UseOptionWithoutCost` with `target` = 1 card matching
  `{ controller: "mine", zone: "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }`,
  `from: ["hand"]`, `payCost: true`, `reduceCostByOpponentMemory: true`,
  `optional: true`, and `cost: { kind: "suspend", target: { isSelfRef, isSelf } }`.
  `Security` is the standard `PlayWithoutCost { isSelf, payCost: false }`.
  Registration is exclusively `registerIrCard("BT26-090", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: `reduceCostByOpponentMemory` is a real IR field
  (`ir/actions/meta.ts`) that `borrowed.ts` reads twice — once in the affordability
  preflight and once at payment — as
  `Math.max(0, new MemoryGauge(state).memoryFor(opponentOf(sourceSeat)))`, folded into
  the same signed `costDelta` as `reduceCostBy`. The `Math.max(0, …)` floor is what
  stops a large opponent memory from turning the reduction into a memory GAIN, and
  routing both the reduction and the payment through the shared use verb keeps
  play-cost restrictions and the insufficient-memory check running exactly once. The
  `cost` on the action, not around it, means a declined or unpayable use never
  suspends the Tamer. `memoryAtMost` with `controller: "mine"` compares this
  controller's own side of the gauge, which is why a gauge on the opponent's side
  reads as 0 and satisfies "4 or less" per Q7143. Note the printed timing is
  self-consistent: at [End of Your Turn] the gauge has already passed to the opponent,
  so the reduction is normally non-zero.
- Behavioral proof: 8 cases. Two structural cases pin the catalog, the memory-gate
  shape, the exact TS-Option target filter, the suspend cost, and the
  `reduceCostByOpponentMemory` flag with its printed `raw`. A threshold case proves
  memory 4 -> 5, memory 5 unchanged, and memory -3 -> -2 (Q7143's opponent-side
  reading). The positive case suspends the Tamer and uses BT25-093 with the paid cost
  reduced by the opponent's 3 memory. A floor case at -6 proves the reduction stops at
  the Option's cost instead of gaining memory. A refusal case leaves the Tamer
  unsuspended and the Option in hand. A negative case proves a non-[TS] Option
  (BT1-108) is not a legal choice, and an already-suspended case proves the cost is
  unpayable. The [Security] case plays the Tamer from security for free.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-091 — Yoshino Fujieda — 9/10

- Catalog evidence: Green Tamer, play cost 4, DP 0, no evo costs, trait [DATA SQUAD],
  rarity "-", max 4. Main text: "[Start of Your Main Phase] By placing 1 [DATA SQUAD]
  trait card from your hand face down under this Tamer, ＜Draw 1＞ and gain 1 memory."
  plus "[Your Turn] When any of your opponent's Digimon or Tamers suspend, or effects
  trash cards from under this Tamer, by suspending this Tamer, 1 of your Digimon may
  digivolve into a [Vegetation], [Fairy] or [DATA SQUAD] trait Digimon card in the
  hand with the cost reduced by 1." Security: "[Security] Play this card without
  paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-091` returns Q7144-Q7148.
  Q7144: the placed card goes to the BOTTOM of the cards already under the Tamer.
  Q7145: no reordering. Q7146: only the controller may look at them. Q7147: a
  face-down card trashed from under the Tamer is placed FACE UP in the trash.
  Q7148 (related BT5-021 Syakomon): under a "players can't reduce play costs" effect
  the digivolution still happens, but WITHOUT the -1 reduction.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "place", target: hand + [DATA SQUAD] trait, host: "self",
  destination: "digivolutionStack", position: "bottom", faceDown: true }` gating
  `Draw 1` + `GainMemory 1`, `optional`/`abortOnDecline`. `YourTurn` carries two
  `SubTrigger` watchers over one shared `Digivolve` body: `whenSuspended` with
  `sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }`, and
  `whenDigivolutionTrashed` with
  `sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }` and
  `hostFilter: { isSelfRef: true }`. The shared body is
  `Digivolve { target: 1 of my Digimon, into: 1 hand Digimon card with the
  [Vegetation]/[Fairy]/[DATA SQUAD] trait, from: ["hand"], payCost: true,
  costDelta: -1, optional: true, cost: suspend self }`. `Security` is the standard
  `PlayWithoutCost { isSelf, payCost: false }`. Registration is exclusively
  `registerIrCard("BT26-091", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: the destination filter was encoded as
  `{ kind: ["Digimon"], orFilters: [Vegetation, Fairy, DATA SQUAD] }`.
  `candidateLooseInstances` builds `allFilters = [target.filter, ...target.orFilters,
  ...target.filter.orFilters]` — the PRIMARY filter is itself one alternative of the
  union. Because the primary carried no trait predicate, every Digimon card in hand
  qualified and the printed trait restriction was vacuous. Replaced with a single
  restrictive filter, `nameOrTrait: [{ tokens: ["Vegetation", "Fairy", "DATA SQUAD"],
  match: "trait" }]`; `matchNameOrTrait` ORs the tokens inside one ref, so the printed
  three-way choice is preserved without the union escape hatch.
- Primitive trace: `digivolveIntoTarget` normalizes `into` to a `Target` and
  `runDigivolve` resolves it through `candidateLooseInstances` over the `from` zones,
  which is exactly the union path the defect exploited. `costDelta: -1` is applied by
  the shared digivolution-cost seam that BT5-021's `RestrictCostReduction` clamps, so
  Q7148 falls out of the engine rather than the card. The `cost: { kind: "suspend" }`
  sits on the action, so a declined or illegal digivolution never suspends the Tamer.
  `whenDigivolutionTrashed`'s `byEffect: true` keeps battle- and cost-driven stack
  trashing out of the trigger, and `hostFilter: { isSelfRef: true }` restricts it to
  cards under THIS Tamer. `placeUnder` writes `stack[0]` as the bottom of the
  digivolution cards, satisfying Q7144, and `trashDigivolutionCards` flips the
  instance face up for Q7147.
- Behavioral proof: 9 cases. A structural case pins the catalog, the placement cost,
  both watchers, and the shared reduced digivolution body. Q7144 asserts the placed
  card lands at index 0 above a pre-existing under-card with draw and +1 memory; a
  refusal case proves the declined cost places, draws and gains nothing. Opponent
  Digimon suspension and opponent Tamer suspension both drive Sunflowmon -> Lilamon
  (BT26-039 -> BT26-044, [Vegetation]/[DATA SQUAD] into [Fairy]/[DATA SQUAD]) for 2
  memory instead of 3. Q7147 drives the same digivolution from a real
  `trashDigivolutionCards(…, { byEffectSeat: 0 })` and asserts the trashed card is
  face up. A negative case proves the controller's OWN suspension does not trigger it,
  a refusal case proves no suspension and no memory spend, and Q7148 proves the
  digivolution still resolves at full cost under Syakomon. The [Security] case plays
  the Tamer from security for free.
- Gap recorded: no case puts a non-[Vegetation]/[Fairy]/[DATA SQUAD] Digimon card in
  hand alongside a matching one to prove the corrected filter rejects it. That
  assertion needs a test run, which this audit pass may not perform; the correction is
  proven by the `allFilters` union trace instead.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Changed files:
  `apps/api/src/cards/BT26/BT26-091.ts` and `apps/api/src/cards/BT26/BT26-091.test.ts`
  (the structural assertion asserted the vacuous `into.filter.orFilters` union; it now
  asserts the single trait-restricted hand filter).

## BT26-092 — Shota Kuroi — 10/10

- Catalog evidence: Black Tamer, play cost 3, DP 0, no evo costs, trait [TS], rarity U,
  max 4. Main text: "[Start of Your Main Phase] By trashing 1 [TS] trait card from your
  hand, ＜Draw 1＞ and gain 1 memory." plus "[Opponent's Turn] When one of your
  opponent's Digimon attacks, by returning 1 of your [TS] trait Tamers to the bottom of
  the deck, you may change the attack target to 1 of your Digimon with the [TS] trait."
  Security: "[Security] Play this card without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-092` returns no entries. No
  errata, ruling, or restriction applies; the printed text governs.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "trash", target: 1 card in my hand with the [TS] trait }`, gating
  `Draw 1` + `GainMemory 1`, `optional: true` with `abortOnDecline: true`.
  `OpponentsTurn` carries a `SubTrigger` on `whenOpponentAttacks` running
  `RedirectAttack { target: 1 of my [TS] Digimon, cost: { kind: "return", target: 1 of
  my [TS] Tamers in the battle area, to: "deckBottom" }, optional: true }`.
  `Security` is the standard `PlayWithoutCost { isSelf, payCost: false }`.
  Registration is exclusively `registerIrCard("BT26-092", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: the cost is a hand trash, NOT the face-down placement its BT26
  Tamer neighbours use — the printed text says "trashing", and the IR matches. The
  trigger sits under `OpponentsTurn`, so the turn-owner guard keeps the redirect from
  installing on its controller's own turn; that is a real distinction because the
  subtrigger event itself carries no seat gate. The return cost's filter is
  `{ zone: "battleArea", controller: "mine", kind: ["Tamer"], nameOrTrait: [TS] }`,
  which legitimately includes THIS Tamer — Shota carries [TS] — so the card can eat
  itself to redirect, and the return goes to `deckBottom` rather than the hand. The
  cost hangs off the `RedirectAttack` action, so an attack with no legal [TS] Digimon
  to receive it never pays: `resolvePermanentTargets` finds no candidate and the whole
  action is skipped before the return executes.
- Behavioral proof: 8 cases. Two structural cases pin the catalog, the [TS] hand-trash
  cost with its exact filter, and the redirect's target and return cost with both [TS]
  filters and `to: "deckBottom"`. The positive start-main case trashes BT26-008,
  draws, and gains 1 memory; a refusal case leaves hand, deck, trash, and memory
  untouched. The redirect positive case sends a real `attack` intent at the player,
  returns Shota to the deck bottom, and asserts security survives at 1 while the
  attacker leaves the board. A negative case with only a non-[TS] Digimon (BT1-009)
  proves the Tamer is NOT returned and the security check happens. A refusal case
  proves the declined redirect costs nothing. A turn-ownership case proves the
  redirect does not install during its controller's turn. The [Security] case plays
  the Tamer from security for free.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-093 — Reina Sakuya — 9/10

- Catalog evidence: Black Tamer, play cost 3, DP 0, no evo costs, traits
  [Glowing Dawn]/[BEATBREAK], rarity R, max 4. Main text: "[Start of Your Main Phase]
  By placing 1 [BEATBREAK] trait card from your hand face down under this Tamer,
  ＜Draw 1＞ and gain 1 memory." plus "[All Turns] When a Digimon attacks, by
  suspending this Tamer, place the top card of your deck face down under this Tamer.
  After, 1 of your [BEATBREAK] trait Digimon gains ＜Collision＞ and ＜Blocker＞ for the
  turn." Security: "[Security] Play this card without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-093` returns Q7151-Q7155.
  Q7151: a placed card goes to the BOTTOM of the cards already under the Tamer.
  Q7152: no reordering. Q7153: only the controller may look at them. Q7154: a
  face-down card trashed from under the Tamer goes to the trash FACE UP. Q7155: the
  "After" clause cannot be processed unless the "by suspending this Tamer" condition
  is actually met.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "place", target: hand + [BEATBREAK] trait, host: "self",
  destination: "digivolutionStack", position: "bottom", faceDown: true }` gating
  `Draw 1` + `GainMemory 1`, `optional`/`abortOnDecline`. `AllTurns` carries one
  `SubTrigger` on `whenAttacking` with NO `sourceFilter` — the printed trigger is "a
  Digimon", either player's — running a `CostGatedBlock` with `cost: suspend self`,
  `optional`/`abortOnDecline`, whose body places the deck top face down and grants the
  two keywords. `Security` is the standard `PlayWithoutCost { isSelf, payCost: false }`.
  Registration is exclusively `registerIrCard("BT26-093", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defects corrected: two.
  1. The deck-top placement had no `position`, so `runPlaceUnder`'s `fromDeckTop`
     branch computed `belowTop: action.position !== "top"` = `true` and pushed the card
     to the TOP of the cards under the Tamer, contradicting Q7151. Added
     `position: "top"`, the encoding this branch (and the audited peers
     BT25-087/088/090) uses for the true bottom.
  2. ＜Collision＞ and ＜Blocker＞ were two separate `GainKeyword` actions, each with
     its own `count: 1` target. With two [BEATBREAK] Digimon on board that opens TWO
     independent target choices and can split the keywords across different Digimon,
     while the printed text grants both to ONE Digimon. Merged into a single
     `GainKeyword { keyword: { keyword: "Collision" }, keywords: [{ keyword: "Blocker" }] }`.
- Primitive trace: `runBoardAction`'s `GainKeyword` case resolves its targets once and
  then applies `action.keywords` extras to the SAME resolved ids
  (`for (const extra of action.keywords ?? []) for (const id of ids) …`), which is what
  binds both keywords to one Digimon. Neither Collision nor Blocker is in
  `ACTION_TYPE_KEYWORDS`, so both take the continuous-ledger path with the same
  duration; `toDuration("untilEachTurnEnd")` maps to `EffectDuration.UntilEachTurnEnd`,
  the engine's "for the turn". The `count: "all"` player-scoped SecurityAttack branch
  is not reached (this target is `count: 1`). `placeUnder` treats `stack[0]` as the
  bottom of the digivolution cards, satisfying Q7151, and `trashDigivolutionCards`
  flips the instance face up for Q7154. `CostGatedBlock` with `abortOnDecline: true`
  is what makes Q7155 hold. The `fromDeckTop` primitive no-ops on an empty deck, so
  the keyword grants still resolve.
- Behavioral proof: 9 cases. A structural case pins the catalog, the placement cost,
  the global `whenAttacking` watcher and the suspend-gated body. Q7151 asserts the
  placed card at index 0 above a pre-existing under-card with draw and +1 memory; a
  refusal case proves the declined cost does nothing. A positive case fires
  `whenAttacking` for the controller's own BT26-052 and asserts suspension, the placed
  deck top, and both keywords. A live case has the OPPONENT attack, proves Blocker
  arrives before the block window, blocks with the [BEATBREAK] Digimon through a real
  `declareBlock` intent, and asserts security survives. An empty-deck case proves both
  keywords still land. Q7155 (already suspended) proves neither placement nor grant
  happens, and a refusal case proves the same for a declined cost. Q7154 asserts a
  face-down under-card is trashed face up. The [Security] case plays the Tamer from
  security for free.
- Gaps recorded: no case puts TWO [BEATBREAK] Digimon on board to prove the merged
  grant lands both keywords on the same one, and no case places the deck top under a
  Tamer that already has cards under it. Both need a test run, which this audit pass
  may not perform; the corrections are proven by the primitive trace.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Changed files:
  `apps/api/src/cards/BT26/BT26-093.ts` and `apps/api/src/cards/BT26/BT26-093.test.ts`
  (the structural assertion listed three body actions with the split keyword grants; it
  now asserts two, the positioned placement and the single combined grant).

## BT26-094 — Keenan Crier — 10/10

- Catalog evidence: Purple Tamer, play cost 3, DP 0, no evo costs, trait [DATA SQUAD],
  rarity R, max 4. Main text: "[Start of Your Main Phase] By placing 1 [DATA SQUAD]
  card from your hand face down under this Tamer, ＜Draw 1＞ and gain 1 memory." plus
  "[Your Turn] When your opponent's hand is trashed from or effects trash cards from
  under this Tamer, by suspending this Tamer, 1 of your [DATA SQUAD] trait Digimon
  gains ＜Execute＞ for the turn." Security: "[Security] Play this card without paying
  the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-094` returns Q7156-Q7159.
  Q7156: the placed card goes to the BOTTOM of the cards already under the Tamer.
  Q7157: no reordering. Q7158: only the controller may look at them. Q7159: a
  face-down card trashed from under the Tamer is placed FACE UP in the trash. No
  ruling qualifies the [Your Turn] reaction beyond the printed text.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "place", target: hand + [DATA SQUAD] trait, host: "self",
  destination: "digivolutionStack", position: "bottom", faceDown: true }` gating
  `Draw 1` + `GainMemory 1`, `optional`/`abortOnDecline`. `YourTurn` carries two
  `SubTrigger` watchers over one shared body: `whenHandTrashed` gated by
  `{ kind: "triggerHandTrashedSeat", seat: "opponent" }`, and
  `whenDigivolutionTrashed` with
  `sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }` and
  `hostFilter: { isSelfRef: true }`. The shared body is a `CostGatedBlock`
  (`cost: suspend self`, `optional`, `abortOnDecline`) granting
  `GainKeyword Execute / untilEachTurnEnd` to 1 of the controller's [DATA SQUAD]
  Digimon. `Security` is the standard `PlayWithoutCost { isSelf, payCost: false }`.
  Registration is exclusively `registerIrCard("BT26-094", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: the two watchers are genuinely different events, so a single
  suspension is charged per event rather than per trigger source — `triggerHandTrashedSeat`
  reads the trashed-hand seat off the trigger payload (the controller's own hand
  trashing does not fire it), and `whenDigivolutionTrashed`'s `byEffect: true` keeps
  cost- and battle-driven stack trashing out while `hostFilter: { isSelfRef: true }`
  restricts it to cards under THIS Tamer. `[Your Turn]` supplies the turn-owner guard
  the events themselves do not carry. ＜Execute＞ is behavioral, not a label: the
  `GainKeyword` case in `runBoardAction` detects `kw === "Execute"` and additionally
  installs the two timing effects on the recipient's top instance via
  `grantCustomEffect(top.instanceId, top.ownerSeat, "Execute", duration)` — so a
  granted Execute behaves like a printed one. `toDuration("untilEachTurnEnd")` maps to
  `EffectDuration.UntilEachTurnEnd`, the engine's "for the turn".
  `placeUnder` writes `stack[0]` as the bottom of the digivolution cards, satisfying
  Q7156, and `trashDigivolutionCards` flips the instance face up for Q7159.
- Behavioral proof: 8 cases. A structural case pins the catalog, the placement cost,
  both watchers with their exact gates, and the identical suspend-gated Execute body on
  each. Q7156 asserts the placed card at index 0 above a pre-existing under-card with
  draw and +1 memory; a refusal case proves the declined cost does nothing. Two
  positive cases drive the reaction from a real
  `primitives.trash([...], { byEffectSeat: 0 })` against the OPPONENT's hand and from a
  real `trashDigivolutionCards` under this Tamer, asserting suspension, the face-up
  trashed card, and Execute on BT26-039. A negative case proves the CONTROLLER's own
  hand being trashed does not fire it, and a turn-ownership case proves it does not
  fire on the opponent's turn. A combined case proves neither an already-suspended
  Tamer nor a declined cost grants Execute. The [Security] case plays the Tamer from
  security for free.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-095 — Makoto Kuonji — 9/10

- Catalog evidence: Purple Tamer, play cost 3, DP 0, no evo costs, traits
  [Glowing Dawn]/[BEATBREAK], rarity R, max 4. Main text: "[Start of Your Main Phase]
  By placing 1 [BEATBREAK] trait card from your hand face down under this Tamer,
  ＜Draw 1＞ and gain 1 memory." plus "[All Turns] When any Digimon are deleted, by
  suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. After, place 1
  [BEATBREAK] trait non-Digi-Egg card from your trash face down under this Tamer."
  Security: "[Security] Play this card without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-095` returns Q7160-Q7164.
  Q7160: a placed card goes to the BOTTOM of the cards already under the Tamer.
  Q7161: no reordering. Q7162: only the controller may look at them. Q7163: a
  face-down card trashed from under the Tamer goes to the trash FACE UP. Q7164: the
  "After" clause cannot be processed unless the "by suspending this Tamer" condition
  is actually met.
- Implementation: three effects. `StartOfYourMainPhase` is a `CostGatedBlock` whose
  cost is `{ kind: "place", target: hand + [BEATBREAK] trait, host: "self",
  destination: "digivolutionStack", position: "bottom", faceDown: true }` gating
  `Draw 1` + `GainMemory 1`, `optional`/`abortOnDecline`. `AllTurns` carries one
  `SubTrigger` on `onDeletionOf` with `sourceFilter: { kind: ["Digimon"] }` — no
  controller predicate, matching the printed "any Digimon" — running a
  `CostGatedBlock` (`cost: suspend self`, `optional`, `abortOnDecline`) whose body is
  `Draw 1`, `Trash` 1 card from my hand, then `PlaceUnder` 1 card from my trash
  matching `kind: ["Digimon", "Tamer", "Option"]` + [BEATBREAK] trait, under this
  Tamer, face down. `Security` is the standard
  `PlayWithoutCost { isSelf, payCost: false }`. Registration is exclusively
  `registerIrCard("BT26-095", compiled)` with `coverage: "full"`, `residual: []`.
- Defects corrected: two.
  1. The trash-to-stack `PlaceUnder` had no `position`, so the loose-card branch of
     `runPlaceUnder` computed `belowTop: action.position !== "bottom"` = `true` and
     pushed the card directly beneath the Tamer instead of the bottom of the cards
     under it, contradicting Q7160. Added `position: "bottom"`.
  2. Removed the dead `isDigiEgg: false` predicate. `isDigiEgg` is a compiler alias
     that no engine filter reads (`reencoded-ir.test.ts` asserts the key is REMOVED
     once re-encoded); its meaning is already carried by the explicit
     `kind: ["Digimon", "Tamer", "Option"]`, which excludes Digi-Eggs.
- Primitive trace: the loose `PlaceUnder` branch and the `fromDeckTop` branch of
  `runPlaceUnder` disagree on the sense of `position` — the loose branch reads
  `position !== "bottom"`, so `"bottom"` correctly `unshift`s to `stack[0]`, the bottom
  of the digivolution cards (`placeOwnTopAtStackBottom` and `digivolve` fix that
  convention: `stack[0]` is the bottom, the last element sits directly under the top
  card). `faceUp: action.faceDown !== true` gives the face-down placement Q7162/Q7163
  depend on, and `trashDigivolutionCards` flips the instance face up on the way out.
  `CostGatedBlock` with `abortOnDecline: true` is what makes Q7164 hold: no
  suspension, no draw, no discard, no placement. Draw and Trash are separately
  optional-free steps inside a paid body, so an empty deck or empty hand no-ops
  without stopping the trailing placement, and an empty qualifying trash no-ops the
  placement without undoing the draw or discard.
- Behavioral proof: 9 cases. A structural case pins the catalog, the placement cost,
  the `onDeletionOf` watcher with its Digimon-only source filter and the three-step
  suspend-gated body in printed order. Q7160 asserts the placed card at index 0 above
  a pre-existing under-card with draw and +1 memory; a refusal case proves the declined
  cost does nothing. Deleting the OPPONENT's Digimon and deleting the CONTROLLER's own
  Digimon both drive the reaction ("any Digimon"), the first placing the freshly drawn
  [BEATBREAK] card and the second placing one already in the trash. An empty
  deck-and-hand case proves the trailing placement still happens. Q7164
  (already suspended) proves no draw, no discard, no placement. A refusal case proves
  the same for a declined cost, with the trash card untouched. Q7163 asserts a
  face-down under-card is trashed face up. The [Security] case plays the Tamer from
  security for free.
- Gap recorded: no case places from trash under a Tamer that already has cards under
  it, so the corrected `position` is proven by the primitive trace rather than by a
  colocated assertion. That assertion needs a test run, which this audit pass may not
  perform.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. Changed file: `apps/api/src/cards/BT26/BT26-095.ts`.

## BT26-096 — Kosuke Misono — 10/10

- Catalog evidence: Purple Tamer, play cost 3, DP 0, no evo costs, trait [TS], rarity U,
  max 4. Main text: "[Start of Your Turn] If you have 2 or less memory, set it to 3."
  plus "[Main] By returning this Tamer to the bottom of the deck, you may play 1
  Digimon card with [Chronomon] in its text or 1 Tamer card with the [TS] trait from
  your hand or trash with the cost reduced by 2." Security: "[Security] Play this card
  without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-096` returns no entries. The
  [Start of Your Turn] clause is the long-established BT1-086 shape, whose KB Q948
  confirms the set-to-3 semantics; no errata or restriction applies to this card.
- Implementation: three effects. `StartOfYourTurn` runs
  `SetMemory { value: 3, condition: { kind: "memoryAtMost", value: 2 } }` — byte-identical
  to BT1-086 and BT25-088. `Main` runs `PlayWithoutCost` with
  `target: { filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }] },
  orFilters: [{ controllerDefault: "mine", kind: ["Tamer"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] }], count: 1 }`,
  `from: ["hand", "trash"]`, `payCost: true`, `reduceCostBy: 2`, `optional: true`, and
  `cost: { kind: "return", target: { isSelfRef }, to: "deckBottom" }`. `Security` is
  the standard `PlayWithoutCost { isSelf, payCost: false }`. Registration is
  exclusively `registerIrCard("BT26-096", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: none.
- Primitive trace: `PlayWithoutCost` with `payCost: true` is the paid-play form; the
  `from` zones supply the hand/trash union while `runPlayAction` builds its candidate
  set as `[target.filter, ...target.orFilters, ...target.filter.orFilters]`. That union
  includes the PRIMARY filter as one alternative, which is safe here because BOTH
  branches are restrictive (a Digimon with "Chronomon" in its text, or a [TS] Tamer) —
  unlike an unrestricted primary, which would make the branches vacuous. `match: "text"`
  is documented as the full union of name, trait, and printed text, so a Digimon
  literally NAMED Chronomon qualifies alongside one that only mentions it. `reduceCostBy: 2`
  folds into the same signed cost delta the affordability preflight uses, so an
  unaffordable play is rejected BEFORE the return cost is paid — the Tamer is not
  spent for nothing. The return cost targets `isSelfRef` and lands on `deckBottom`,
  making the [Main] effect self-limiting without needing a once-per-turn key.
  `memoryAtMost` without a `controller` keeps the legacy turn-relative comparison used
  by every peer with this clause, and `SetMemory` writes the absolute value 3.
- Behavioral proof: 8 cases. A structural case pins the catalog, the memory setter, the
  paid-play union with both branch filters, `from: ["hand", "trash"]`, `reduceCostBy: 2`,
  and the self-return cost. A memory case proves 2 -> 3, -4 -> 3 (opponent-side gauge)
  and 3 unchanged. Two positive cases cover both union branches: a Chronomon-text
  Digimon (BT26-009) played from HAND and a [TS] Tamer (BT26-087) played from TRASH,
  each asserting the reduced memory spend and Kosuke at the deck bottom. A negative
  case with an unrelated hand card (BT1-009) proves the Tamer is not returned. An
  affordability case proves an eligible but unaffordable play (BT26-078 at 0 memory)
  leaves the Tamer on the board and memory untouched. A refusal case proves the same
  for a declined play. The [Security] case plays the Tamer from security for free.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and
  typecheck once at the end. No source or test change was required for this card.

## BT26-097 — The Thunder Emperor Awakens — 10/10

- Catalog evidence: Yellow Option, play cost 2, DP 0, no evo costs, trait [TS],
  rarity R, max 4. Main text: "Add 1 to this card's use cost for each of your security
  cards." plus "[Main] By placing 1 of your Tamers with [Dan Yuki] or [Kanan Yuki] in
  their names as any of your [Aegiomon]'s bottom digivolution card, it may digivolve
  into [Jupitermon] in the hand or trash, ignoring digivolution requirements and
  without paying the cost. After, you may place 1 card with [Aegiochusmon] in its name
  in your trash as any of your [Jupitermon]'s top digivolution card." Security: "You
  may play 1 play cost 5 or lower [TS] trait card from your hand without paying the
  cost. Then, add this card to the hand."
- Knowledge base: `node tools/kb/query.mjs card BT26-097` returns no entries. The
  nearest applicable ruling is Q7182 on the sister card BT26-101, which states that
  the clause after "then" is processed even when the preceding conditional part could
  not apply — the same sequencing principle the printed "After," carries here.
- Implementation: four effects. `Static` is a self `CostModifier`
  (`costType: "use"`, `mode: "delta"`, `amount: 1`, `handResident: true`,
  `duration: "permanent"`, `scaling: { per: 1, unit: "security", filter: mine }`).
  `Main` is a `CostGatedBlock` whose cost is
  `{ kind: "place", targetIsPermanent: true, target: Dan Yuki Tamer (orFilters: Kanan
  Yuki), destination: "digivolutionStack", host: mine [Aegiomon] Digimon,
  bindHostAs: "aegiomonHost", position: "bottom" }`, `optional`/`abortOnDecline`. The
  gated body is `Digivolve` (`target.fromSelectionRef: "aegiomonHost"`, `into` mine
  [Jupitermon] Digimon in hand or trash, `from: ["hand","trash"]`, `payCost: false`,
  `ignoreRequirements: true`, `optional: true`) followed by `PlaceUnder`
  ([Aegiochusmon] card in the controller's trash, `underFilter` mine [Jupitermon]
  Digimon, `position: "top"`, `optional: true`). `Security` is `PlayWithoutCost`
  (hand only, kinds Digimon/Tamer, `playCostLte: 5`, [TS] trait, optional) followed by
  `AddToHandSelf`. Registration is exclusively `registerIrCard("BT26-097", compiled)`
  with `coverage: "full"`, `residual: []`.
- Defect corrected: the trailing `PlaceUnder` carried
  `condition: { kind: "ifThisEffectDigivolved" }`, which made the "After," clause a
  consequence of the optional evolution. The printed clause is sequencing, not a
  consequence, and it reads "any of your [Jupitermon]" rather than "that Digimon", so
  a controller who declines the evolution (or who already has another Jupitermon in
  play) may still bury an Aegiochusmon. The condition was removed. The removal changes
  no existing assertion: `canAttemptPlaceUnder` (runAction's optional-action preflight)
  already refuses to prompt when `underFilter` matches no permanent, so the
  decline-path fixture — which has no Jupitermon at all — still opens exactly two
  decisions and still leaves the Aegiochusmon in the trash.
- Primitive trace: the `Static` block is all-`CostModifier` + `handResident`, so
  `builderForTrigger` routes it through `digivolveCostStatic` (base guard `() => true`),
  which is what lets a hand card's own cost modifier install at all; `runResourceAction`
  then multiplies `amount` by `scaleFactor(unit: "security")` and records it through
  `changePlayCost` with `continuous: true`, so the surcharge tracks the live security
  count rather than a snapshot. The place cost's `targetIsPermanent` routes the Tamer
  through `relocateByEffect`, which moves the whole permanent (top card plus its own
  stack) under the host, and `position: "bottom"` maps to `belowTop: false`, i.e.
  `stack.unshift`. `bindHostAs`/`fromSelectionRef` pin the evolution to the SAME
  Aegiomon that received the Tamer instead of re-choosing. `ignoreRequirements: true`
  waives the printed requirement gate in `legalIntoCandidates`, while `payCost: false`
  waives only the memory cost — the two are separate flags in `runDigivolve`.
- Behavioral proof: 7 cases. A structural case pins the catalog, the security-scaled
  surcharge, the place cost with its bound host, and the gated evolution plus tail.
  A cost case with 3 security cards proves 2 + 3 = 5 memory. Two Security cases prove
  a play cost 3 [TS] Digimon is played from hand and the card returns to hand, and that
  the card still returns to hand when the only [TS] card in hand is an Option (kinds
  are restricted to Digimon/Tamer, matching "play"). A stack case places
  BT24-085 (Dan Yuki & Kanan Yuki) under BT24-034 Aegiomon, evolves into BT24-101
  Jupitermon and asserts BT26-029 Aegiochusmon: Holy on TOP of the stack; a second
  case proves the Kanan Yuki alternative (BT26-090) and a trash-sourced Jupitermon.
  A manual-decision case pays the placement cost and declines the evolution, proving
  the Tamer stays buried and left the battle area. A negative case proves that without
  an eligible Tamer nothing is placed and no evolution happens.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. Changed files: `apps/api/src/cards/BT26/BT26-097.ts`
  (condition removed) and `apps/api/src/cards/BT26/BT26-097.test.ts` (the structural
  assertion no longer expects that condition).

## BT26-098 — Queen of Thorns — 10/10

- Catalog evidence: Green Option, play cost 5, DP 0, no evo costs, trait
  [DATA SQUAD], rarity U, max 4. Main text: "When this card would be used, by trashing
  the bottom face-down card from under any of your Tamers, reduce the cost by 2." plus
  "[Main] By placing 1 [Sunflowmon] and 1 [Lilamon] from your trash as 1 of your
  [Lalamon]'s bottom digivolution cards, that Digimon may digivolve into [Rosemon] in
  the hand, ignoring digivolution requirements and without paying the cost." Security:
  "You may play 1 [Lalamon] or [Yoshino Fujieda] from your hand or trash without paying
  the cost. Then, add this card to the hand."
- Knowledge base: `node tools/kb/query.mjs card BT26-098` returns Q7173 — a "by"
  condition cannot be met by performing only part of it, so placing just one of the two
  named materials is not allowed and the [Main] effect does nothing.
- Implementation: three effects. `BeforePayCost` now carries a `CostGatedBlock`
  (`cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 }`,
  `optional`, `abortOnDecline`) whose single gated action is the self `CostModifier`
  (`costType: "use"`, `mode: "reduce"`, `amount: 2`, `handResident: true`).
  `Main` is a `CostGatedBlock` with a `compound` cost of two `place` costs — Sunflowmon
  from trash under a chosen [Lalamon] (`bindHostAs: "lalamonHost"`, `position:
  "bottom"`) and Lilamon from trash under `{ boundRef: "lalamonHost" }` — gating a
  `Digivolve` into [Rosemon] in hand (`fromSelectionRef: "lalamonHost"`,
  `payCost: false`, `ignoreRequirements: true`, `optional: true`). `Security` is
  `PlayWithoutCost` over hand and trash with `orFilters` for the [Lalamon] and
  [Yoshino Fujieda] names, followed by `AddToHandSelf`. Registration is exclusively
  `registerIrCard("BT26-098", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: the reduction never reached the pay-time window. The
  `CostModifier` carried its own `cost`, and `runAction` treats a cost-carrying
  `CostModifier` as PAID-COUNT SCALED: it sets `costModifierPaidCount` from the
  payment's `out.paidCount`, and `payCost`'s `trashBottomFaceDownUnderTamer` branch
  never writes `out.paidCount`. The count therefore stayed 0, `paidCountScale` became
  0, and the generic "scale 0 means the action does nothing" guard returned before the
  `BeforePayCost` branch in `runResourceAction` could add the delta. The observable
  result was that the Tamer's bottom card was trashed, the cost stayed 5, and
  `applyPlayCard`'s post-finalization affordability re-check rejected the play whenever
  the controller had exactly the reduced cost in memory. The fix moves the payment onto
  a `CostGatedBlock` wrapper — the same primitive the [Main] clause already uses — so
  the `CostModifier` runs with no cost of its own, no paid-count scale, and reaches
  `ctx.playCostDelta`. Cost, optionality and abort semantics are unchanged: the wrapper
  asks the "you may" question, pays once, and aborts the effect when declined.
- Primitive trace: `validatePlayCard` lets a card with any `BeforePayCost` effect past
  the synchronous affordability gate (`hasBeforePayCost`), then `applyPlayCard` calls
  `finalizePlayCost` → `GameEngine.fireBeforePayCost`, which seeds `selections` so
  `runEffect` resolves on the SAME context and the delta written to
  `ctx.playCostDelta` survives. `runResourceAction`'s `BeforePayCost` branch requires
  `activeTiming === "BeforePayCost"`, `handResident`, a self target, `mode: "reduce"`
  and `costType` play/use — all satisfied — and the final cost is
  `max(0, base - delta)`. The cost primitive itself is exact: it collects only
  `permanent.stack[0]` of Tamer permanents whose bottom card is face down, so a
  face-up bottom card and every higher card are ineligible, and
  `primitives.trashDigivolutionCards` flips the moved instance face up in the trash
  (the same normalization Q7159 requires for BT26-094). The [Main] compound cost is
  transactional — `payCost`'s compound branch returns false as soon as one nested cost
  cannot be paid, which is Q7173.
- Behavioral proof: 7 cases. A structural case pins the catalog, the wrapped pay-time
  reduction, the two-place compound cost with its bound host, and the Security clause.
  A payment case with two face-down cards under a Tamer proves only the bottom one is
  trashed, that it is public in the trash, and that 3 memory covers the reduced cost of
  3; a refusal case proves the full cost of 5 is paid and the Tamer keeps its card.
  Two Security cases play a Lalamon from hand and Yoshino Fujieda from trash and prove
  the card returns to hand; a third proves the card still returns to hand when no
  eligible card exists. A [Main] case places BT26-039 and BT26-044 under BT26-036 and
  evolves into BT26-049 Rosemon for free, and the Q7173 case proves that with only one
  named material in the trash nothing moves and no evolution happens.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. Changed files: `apps/api/src/cards/BT26/BT26-098.ts` (the
  pay-time restructure) and `apps/api/src/cards/BT26/BT26-098.test.ts` (the structural
  assertion mirrors the new `CostGatedBlock` shape; no behavioral assertion changed).
- Engine seam not applied: `payCost`'s `trashBottomFaceDownUnderTamer` (and
  `trashBottomFaceDownUnderDigimon`) branch in
  `apps/api/src/engine/effects/interpreter/costs.ts` never reports `out.paidCount`,
  while `runAction` derives a scale factor from it for any `CostModifier` that carries
  a cost. Either the cost branch should report what it moved, or the paid-count scale
  should be taken only when the action actually asks for it
  (`action.scaling?.usePaidCount === true`). Any other card that pairs a fixed-count
  cost with a `CostModifier` hits the same silent zero.

## BT26-099 — Training Manual — 9/10

- Catalog evidence: Green Option, play cost 3, DP 0, no evo costs, trait [DM],
  rarity U, max 4. Main text: "＜Use Req. ([DM] trait)＞" plus "[Main] Reveal the top 3
  cards of your deck. Add 1 [DM] card among them to the hand. Return the rest to the
  bottom of the deck. Then, place this card in the battle area." and "[All Turns] When
  face-down cards are placed in any of your Digimon's digivolution cards, ＜Delay＞ ・Any
  of those Digimon may digivolve into a level 6 or lower [DM] trait Digimon card in the
  hand without paying the cost." Security: "Activate this card's [Main] effects."
- Knowledge base: `node tools/kb/query.mjs card BT26-099` returns no entries.
  Comprehensive rules 16-42-1/16-42-3 define ＜Use Req.＞ as a persistent effect that
  lets the controller ignore the card's COLOR requirements while holding the specified
  cards on the field — not a play prohibition. 16-17-1 makes trashing the source card
  the activation cost of ＜Delay＞, and 16-17-3 bars activation on the turn the card
  enters play. 15-7-5 lets a player pay an optional processing condition even when the
  processing after it cannot be executed.
- Implementation: four effects. `Static` is a self `WaiveColorRequirement` gated by
  `{ kind: "youHave", filter: [DM] trait, controller mine }` — the corpus encoding of
  ＜Use Req.＞. `Main` is `RevealAdd` (`revealCount: 3`, `add: [{ filter: [DM],
  count: 1, to: "hand" }]`, `rest: "deckBottom"`) followed by `PlaceInBattleAreaSelf`.
  `AllTurns` carries the ＜Delay＞ keyword and a `SubTrigger` on
  `onAddDigivolutionCards` with `sourceFilter: { controller: "mine", kind:
  ["Digimon"] }` and `addedDigivolutionCardFilter: { faceDown: true }`, whose body is a
  `Digivolve` (`target.sourceRef: "triggerSubject"`, `into` mine [DM] Digimon with
  `levelComparison: { op: "lte", value: 6 }`, `from: ["hand"]`, `payCost: false`,
  `optional: true`). `Security` is `ActivateMain`. Registration is exclusively
  `registerIrCard("BT26-099", compiled)` with `coverage: "full"`, `residual: []`.
- Defect corrected: none in the card. The IR matches the printed text clause for
  clause, including the mandatory add (no `optional` on the add entry) and the
  requirement that the digivolution is NOT requirement-waived — only the cost is.
- Primitive trace: the all-`WaiveColorRequirement` `Static` routes through
  `colorWaiverStatic` (no on-field base guard), which is what lets a hand card publish
  `continuous.hasColorWaiver` for `playCard.ts`'s `colorRequirementMet` gate. The
  ＜Delay＞ keyword on a continuous trigger makes `withIntrinsicDelayGate` mark the
  `SubTrigger` as `delayArmedIntrinsic`, so `runSubTrigger` charges the trash of the
  source permanent as the activation cost and refuses activation on the turn the option
  entered play (16-17-3). `sourceRef: "triggerSubject"` narrows the evolving permanent
  to the Digimon that received the face-down cards rather than any board Digimon.
  `levelComparison` is honored by `definitionMatches`, and `legalIntoCandidates`
  additionally enforces the printed digivolution requirement because the action sets
  neither `ignoreRequirements` nor `ignoreLevelRequirement`.
- Behavioral proof: 8 cases. A structural case pins the catalog, the waiver, the reveal
  shape, the Delay watcher and the Security body, and asserts the add is not optional.
  A use-requirement case proves the play is rejected with `color-requirement-unmet`
  with no [DM] card in play and succeeds for 3 memory with one. A reveal case with
  `autoDeclineOptional` proves the [DM] card is added anyway and the other two go to
  the bottom of the deck. A Security case activates the [Main] body from a face-up
  security card and places the option in the battle area. A Delay case on a later turn
  drives `onAddDigivolutionCards` with a face-down card and proves the option is
  trashed and the host evolves into BT26-077 Reapermon for free; a negative case proves
  a FACE-UP added card does not arm the watcher; a boundary case proves a level 7 [DM]
  card (EX9-021) is not a legal destination.
- Gap (why 9/10, engine seam not applied): the level-7 boundary case previously also
  asserted that the ＜Delay＞ cost is paid — the option trashed — while nothing evolves.
  Commit 92b6cceda ("fix(cards): complete EX10-069 audit") added a payload preflight to
  the shared intrinsic-Delay gate in
  `apps/api/src/engine/effects/interpreter/actions/subTrigger.ts` (the
  `delayArmedIntrinsic` branch): when no declared `Digivolve` passes
  `canAttemptDigivolve`, the gate returns before offering the activation, so the Option
  is never trashed. Comprehensive rules 15-7-5 says the opposite — a player may pay an
  optional processing condition even when the processing after it cannot be executed —
  so the preflight is over-strict, and the KB item its comment cites (Q5183) is about
  conjunctive trait filters, not about consuming ＜Delay＞. The required change is to
  drop that payload preflight (or gate it behind an explicit per-card opt-in) and let
  EX10-069 assert the filter conjunction directly. It was not applied here: this audit
  may not edit `apps/api/src/engine/**`, and the change would flip an assertion in
  `apps/api/src/cards/EX10/EX10-069.test.ts`. The card test now asserts only the
  rules-stable half of the boundary — the host does not evolve and the level 7 card
  stays in hand — with a comment recording the divergence, so it does not lock in
  either reading.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. Changed file:
  `apps/api/src/cards/BT26/BT26-099.test.ts` — the level-7 case dropped
  `expect(trash).toContain("BT26-099")` and was renamed from "cannot evolve into a
  level 7 DM card after activating Delay" to "cannot evolve into a level 7 DM card
  through Delay". No card source change.

## BT26-100 — Dark Field — 10/10

- Catalog evidence: Purple/Black Option, play cost 3, DP 0, no evo costs, traits
  [Titan] and [TS], rarity R, max 4. Main text: "While you have no face-up security
  cards, you can ignore this card's color requirements." plus "[Security] [All Turns]
  All of your [Titan] trait Digimon gain ＜Blocker＞ While you have a Digimon with
  [Plutomon] or [Titamon] in its name, they also get +3000 DP." and "[Main] Add your
  bottom security card to the hand and place this card face up as the bottom security
  card. Then, you may play 1 level 4 or lower [Titan] trait card from your hand or
  trash without paying the cost." Security: "You may play 1 level 4 or lower [Titan]
  trait Digimon card from your hand or trash without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-100` returns Q7174-Q7181. Q7174:
  an empty security stack satisfies "no face-up security cards". Q7175: the [Main]
  effect is usable with 0 security cards — nothing is added to hand, the card is still
  placed. Q7176-Q7178: a face-up security card behaves like a normal security card
  except that it stays revealed, and its [Security] effect still triggers on a check.
  Q7179: shuffling a stack turns every face-up card face down. Q7180: a {Security}
  effect can only be triggered while its card is face up in the security stack.
  Q7181: a [Plutomon]/[Titamon] card WITHOUT the [Titan] trait enables the +3000 DP
  but does not receive it or ＜Blocker＞.
- Implementation: four effects. `Static` is a self `WaiveColorRequirement` gated by
  `{ kind: "faceUpSecurityAtMost", controller: "mine", value: 0 }`. `AllTurns` with
  `isSecurity: true` grants ＜Blocker＞ to `count: "all"` of the controller's [Titan]
  trait Digimon (`duration: "permanent"`) and `ModifyDP +3000` to the same set, gated
  by `{ kind: "youHave", filter: mine Digimon named Plutomon or Titamon }`. `Main` is
  `SecurityManipulation { op: "toHand", toTop: false }`,
  `SecurityManipulation { op: "placeAsSecurity", toTop: false, faceUp: true }`, then an
  optional `PlayWithoutCost` over hand and trash for a [Titan] card of level ≤ 4.
  `Security` is the same optional `PlayWithoutCost` narrowed to Digimon. Registration
  is exclusively `registerIrCard("BT26-100", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: none.
- Primitive trace: the all-`WaiveColorRequirement` `Static` routes through
  `colorWaiverStatic`, which carries no on-field base guard — the waiver has to be
  readable while the card is still in hand, which is exactly when
  `playCard.ts`'s `colorRequirementMet` consults `continuous.hasColorWaiver`.
  `isSecurity: true` on the continuous `AllTurns` block routes it through
  `securityStatic`, whose base guard is `inFaceUpSecurity` and whose `modifyDP` is
  forced `continuous: true`, so the grant tracks the live board (it disappears with the
  enabler and with the card leaving the face-up security position) instead of being
  applied once. Both grant targets carry the [Titan] TRAIT filter while the enabling
  condition matches by NAME only, which is the split Q7181 asks for. The level filter
  uses `levelComparison`, and `definitionMatches` rejects a card with no level, so
  admitting Tamer as a kind in the [Main] target cannot smuggle a level-less Tamer past
  "level 4 or lower". `SecurityManipulation op: "toHand"` is preflighted for an empty
  stack in the optional path and no-ops otherwise, which is Q7175.
- Behavioral proof: 9 cases. A structural case pins the catalog, the waiver condition,
  the two-grant security block, and both free-play modes. Three continuous cases prove
  ＜Blocker＞ plus 7000 → 10000 DP with an enabler, ＜Blocker＞ with 7000 DP without one,
  and the bonus disappearing when the enabler is deleted and the board is recomputed.
  The Q7181 case proves a non-[Titan] Plutomon enables the bonus while receiving
  neither the bonus nor ＜Blocker＞. A [Main] case with one security card proves the
  bottom card reaches the hand, the option itself becomes the sole face-up security
  card, and a level 4 [Titan] is played for free; the Q7174/Q7175 case repeats it with
  an empty stack. A negative case proves the play is rejected with
  `color-requirement-unmet` while any security card is face up. The Q7177/Q7178 case
  runs a real attack into the face-up copy and proves the check activates its
  [Security] free play.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No source or test change was required for this card.

## BT26-101 — Cross Arts — 10/10

- Catalog evidence: White Option, play cost 4, DP 0, no evo costs, traits [ADAMAS] and
  [TS], rarity R, max 4. Main text: "＜Use Req. ([TS] trait)＞" plus "[Main] If you have
  a Tamer with [Dan Yuki] or [Kanan Yuki] in its name, all of your [TS] trait Digimon
  gain ＜Blocker＞ and +3000 DP until your opponent's turn ends. Then, activate 1 of the
  effects below: ・Delete 1 of your opponent's Digimon with as much DP as 1 of your [TS]
  trait Digimon or less. ・1 of your [TS] trait Digimon unsuspends." Security: "You may
  play 1 play cost 4 or lower [TS] card from your hand or trash without paying the
  cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-101` returns Q7182 — the part of
  the [Main] effect after "then" is processed even without a [Dan Yuki]/[Kanan Yuki]
  Tamer. The named-Tamer condition therefore gates only the buff, never the modal.
  Comprehensive rules 16-42 covers the ＜Use Req.＞ colour waiver.
- Implementation: three effects. `Static` is a self `WaiveColorRequirement` gated by
  `{ kind: "youHave", filter: [TS] trait }`. `Main` runs `GainKeyword Blocker` and
  `ModifyDP +3000` over `count: "all"` of the controller's [TS] Digimon, both with
  `duration: "untilOpponentTurnEnd"` and both carrying
  `condition: { kind: "youHave", filter: mine Tamer named Dan Yuki or Kanan Yuki }`,
  followed by an UNCONDITIONAL `Modal` with `choose: 1`: option A is
  `SelectBind` (bind one [TS] Digimon as `tsDpReference`) then `Delete` an opponent
  Digimon with `dp: { op: "lte", valueFrom: "tsDpReference", valueField: "dp" }`;
  option B is `Unsuspend` one [TS] Digimon. `Security` is an optional
  `PlayWithoutCost` over hand and trash for a [TS] Digimon/Tamer of play cost ≤ 4.
  Registration is exclusively `registerIrCard("BT26-101", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: the per-action `condition` is evaluated in `runAction`'s prologue
  gate, which returns without aborting the remaining actions, so a missing named Tamer
  skips the two buffs and still reaches the `Modal` — Q7182 encoded structurally rather
  than by a special case. The waiver condition's filter carries `controllerDefault:
  "mine"`, and `evaluateCondition`'s `youHave` branch prepends `controller: "mine"`
  before counting, so the waiver cannot be enabled by an opponent's [TS] card.
  `duration: "untilOpponentTurnEnd"` is the engine's "until your opponent's turn ends"
  and outlives the end of the controller's own turn. The delete boundary reads the
  BOUND Digimon's CURRENT DP through `valueFrom`/`valueField`, so the +3000 buff
  applied earlier in the same resolution raises the ceiling — the printed order
  ("Then") makes that the correct reading, and the test pins it.
- Behavioral proof: 7 cases. A structural case pins the catalog, the waiver, the
  conditional buffs and the two-option modal, and the Security target. A
  use-requirement case proves the play is rejected with `color-requirement-unmet` with
  no [TS] card in play and costs 4 memory with one. Two Security cases play a [TS]
  Digimon from hand and a [TS] Tamer from trash. A combined case proves ＜Blocker＞ plus
  2000 → 5000 DP with BT25-086 Dan Yuki in play AND that a 5000 DP opponent Digimon is
  deleted at the exact boundary. Two Q7182 cases prove the modal still resolves without
  the named Tamer — one taking the unsuspend branch (`preferOptionIndex: 1`) and one
  taking the delete branch against a 2000 DP target — each asserting no ＜Blocker＞ and
  an unmodified 2000 DP.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No source or test change was required for this card.

## BT26-102 — Seven Code PAD — 10/10

- Catalog evidence: White Option, play cost 7, DP 0, no evo costs, traits [Appmon] and
  [Seven Code], rarity C, max 4. Main text: "＜Use Req. ([Seven Code] trait)＞" plus
  "[Main] By placing 6 [Seven Code] trait Digimon cards from your battle area, link
  cards or trash as 1 of your [Seven Code] trait Digimon's bottom digivolution cards,
  that Digimon may digivolve into [Dantemon] in the hand, ignoring digivolution
  requirements and without paying the cost." Security: "You may play 1 play cost 5 or
  lower [Appmon] trait card from your hand or trash without paying the cost. Then, add
  this card to the hand."
- Knowledge base: `node tools/kb/query.mjs card BT26-102` returns Q7127, Q7128 and
  Q7183-Q7186. Q7183: the 6 cards may come from any mix of battle area, link cards and
  trash. Q7184: placing only 5 does not satisfy the "by" condition. Q7185: the
  controller chooses the order in which they are placed. Q7186: the digivolution
  afterwards may be declined. Q7127/Q7128 concern a different card using this one from
  the deck and the ordering of a simultaneous [When Linking] trigger.
- Implementation: three effects. `Static` is a self `WaiveColorRequirement` gated by
  `{ kind: "youHave", filter: [Seven Code] trait, controller mine }`. `Main` is a
  `PlaceUnder` with `target` = 6 of the controller's [Seven Code] Digimon,
  `destination` = 1 of the controller's [Seven Code] Digimon,
  `bindHostAs: "sevenCodeHost"`, `mixedSources: { battleAreaPermanents: true,
  linkedCards: true, trash: true }`, `position: "bottom"`, `order: "any"`,
  `trackCount: "sevenCodeMaterials"`, `optional`/`abortOnDecline`; then a `Digivolve`
  on `{ boundRef: "sevenCodeHost" }` into [Dantemon] in hand (`payCost: false`,
  `ignoreRequirements: true`, `optional: true`) gated by
  `{ kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 }`.
  `Security` is an optional `PlayWithoutCost` over hand and trash for an [Appmon]
  Digimon/Tamer of play cost ≤ 5 followed by `AddToHandSelf`. Registration is
  exclusively `registerIrCard("BT26-102", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: the [Main] `PlaceUnder` did not state the printed destination
  position. `position: "bottom"` was added. This is an annotation rather than a
  behavior change: the `mixedSources` branch of `runPlaceUnder` places loose cards
  through `ctx.fx.placeUnder(...)` with no options, and the primitive's default is
  `stack.unshift` (the bottom), while a relocated battle-area permanent goes through
  `relocatePermanentByEffect` with `belowTop: false`, which is the same bottom
  placement. The IR now says what the engine already does.
- Primitive trace: the `mixedSources` branch resolves the destination FIRST, binds it
  under `bindHostAs`, and then builds the candidate pool from the controller's own
  battle-area top cards (excluding the chosen host itself), every permanent's link
  cards (including the HOST's own link cards — Q7183), and the trash. It requires
  `candidates.length >= count` before selecting, so a 5-card pool selects nothing and
  moves nothing, which is Q7184 — the "by" condition is atomic rather than partially
  paid. `ctx.ask.orderCards` with `destination: "stackBottom"` implements Q7185, and
  the loop places in reverse so the chosen order survives the unshift. `trackCount`
  writes the real number moved into `ctx.namedCounts`, and the follow-up `Digivolve`
  refuses to run unless that count is 6, so a partially satisfied cost can never reach
  the evolution. `optional: true` on the `Digivolve` is Q7186.
- Behavioral proof: 6 cases. A structural case pins the catalog, the waiver, the mixed
  placement seam with its tracked count, the count-gated evolution and the Security
  clause. A use-requirement case proves the play is rejected with
  `color-requirement-unmet` with no [Seven Code] card in play and costs 7 memory with
  one. A Security case plays an [Appmon] from hand and returns the card to hand. The
  Q7183-Q7186 case assembles the 6 materials from all three source kinds at once (2
  link cards, 1 battle-area permanent, 3 trash cards), evolves into BT26-086 Dantemon
  and proves the battle-area material left the board. A Q7186 case pays the full cost
  through explicit decisions and then declines the evolution, proving 6 cards under an
  unchanged host and Dantemon still in hand. The Q7184 case proves that with only 5
  materials nothing moves and nothing evolves.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. Changed file: `apps/api/src/cards/BT26/BT26-102.ts`
  (`position: "bottom"` added). No test change was required — the structural assertion
  uses `toMatchObject` and does not enumerate absent fields.

## BT26-103 — Jupitermon: Wrath Mode — 10/10

- Catalog evidence: Yellow/Red/Black Digimon, level 7, Mega, Vaccine, play cost 16,
  DP 16000, evo costs Yellow/Red/Black level 6 for 6, traits [Shaman], [Olympos XII],
  [Iliad], [TS], rarity SEC, max 4. Main text: "[Digivolve] Lv.6 w/[Olympos XII]
  trait: Cost 5", ＜Piercing＞, ＜Reboot＞, ＜Blocker＞, ＜Succession ([Jupitermon])＞,
  "[When Digivolving] [Counter] [Once Per Turn] Trash your top security card, and
  ＜Recovery +2＞" and "[All Turns] [Once Per Turn] When security stacks are removed
  from, 1 of your opponent's Digimon gets -15000 DP until their turn ends."
- Knowledge base: `node tools/kb/query.mjs card BT26-103` returns Q7187-Q7189. Q7187:
  only 1 [Counter] effect may be activated during one attack. Q7188: the effect may be
  activated with 0 security cards and ＜Recovery +2＞ still happens — the trash is not a
  cost. Q7189: on a security check, a [Security] effect resolves first, then the other
  triggered effects in turn order, so this card's security-removal watcher is not
  reordered ahead of one.
- Implementation: four effects plus keywords and an alternate requirement. The shared
  recovery body (`SecurityManipulation op: "trashTop", amount: 1` then
  `op: "placeFromDeck", source: "deck", amount: 2`) is registered twice — once under
  `trigger: "WhenDigivolving"` and once under `trigger: "Counter"` — with
  `frequency: "OncePerTurn"` and the same
  `sharedUseKey: "BT26-103/trash-recover"`. `Static` is a self `GrantStatic`
  (`grant: "effects"`, `filter` = mine [Jupitermon]-named Digimon, `topmostOnly: true`,
  `duration: "permanent"`) for ＜Succession＞. `AllTurns` with
  `frequency: "OncePerTurn"` carries two `SubTrigger` watchers, `whenSecurityRemoved`
  and `whenEffectRemovesFromSecurity`, sharing
  `oncePerTurnKey: "BT26-103/security-removed-dp"`, each applying `ModifyDP -15000`
  with `duration: "untilOpponentTurnEnd"` to 1 opponent Digimon. `keywords` carries
  Piercing, Reboot, Blocker and Succession; `digivolutionRequirement` carries
  `{ level: 6, traits: ["Olympos XII"], cost: 5, isAlternate: true }`. Registration is
  exclusively `registerIrCard("BT26-103", compiled)` with `coverage: "full"`,
  `residual: []`.
- Defect corrected: none.
- Primitive trace: `sharedUseKey` makes `irCardModule` build both timings' effects with
  the same `effectKey`, and the `UseTracker` keys on (instanceId, effectKey), so the
  [When Digivolving] and [Counter] routes collapse into ONE [Once Per Turn] budget —
  the printed clause is a single effect with two activation windows, not two effects.
  Neither `SecurityManipulation` is modelled as a cost, so an empty security stack
  trashes nothing and `placeFromDeck` still runs, which is Q7188. Q7187's
  one-Counter-per-attack limit is enforced by the engine's counter window, not by this
  card. `GrantStatic` with `topmostOnly` reads only the highest matching card in the
  digivolution stack, so a lower Jupitermon's effects stay inert. The two security
  watchers cover both routes cards can leave a stack by (a check-driven removal and an
  effect-driven one) while the shared `oncePerTurnKey` keeps the -15000 DP to a single
  application per turn across both.
- Behavioral proof: 7 cases. A structural case pins the catalog, the four keywords,
  both halves of the shared recovery budget, the Succession grant and the two watcher
  routes. A [When Digivolving] case proves 1 security card trashed and 2 placed from
  the deck; the Q7188 case proves the recovery with an empty stack and an empty trash.
  A counter case runs a real attack, finds this card in `counterWindowOpened`'s
  eligible counters, activates it, and then proves a following [When Digivolving] fire
  does nothing — the shared once-per-turn budget is spent. A Succession case proves the
  buried BT24-101 Jupitermon's own effect resolves off this card, and its negative twin
  proves a DIFFERENT topmost Jupitermon (BT26-033) suppresses the lower one. A last
  case trashes from security twice and proves the -15000 DP lands on exactly one
  Digimon per turn across both event routes.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. No source or test change was required for this card.

## BT26-104 — Kunlun — 10/10

- Catalog evidence: White Tamer, play cost 5, DP 0, no evo costs, traits [Shambala],
  [SW], [TB], [TS], rarity SEC, max 4. Main text: "[Start of Your Main Phase] Gain 1
  memory.", "[On Play] By trashing 1 [Shambala] trait card from your hand, ＜Draw 2＞"
  and "[End of Your Turn] If you have a Digimon with the [Tentei Hachibushu] trait, by
  suspending this Tamer, you may use 1 Option card with the [Shambala] trait from your
  hand without paying the cost." Security: "Play this card without paying the cost."
- Knowledge base: `node tools/kb/query.mjs card BT26-104` returns Q7190 — with
  EX12-074's {Security} [Your Turn] effect and ＜Execute＞ triggering simultaneously,
  this card's [End of Your Turn] effect is still activatable after the derived
  digivolution finishes resolving and before the counter timing. The ruling confirms
  the effect is an ordinary end-of-turn trigger with an optional processing condition,
  not a replacement, and adds no constraint the printed text does not carry.
- Implementation: four effects. `StartOfYourMainPhase` is `GainMemory 1`. `OnPlay` is
  `Draw 2` carrying `cost: { kind: "trash", target: 1 [Shambala] card in the
  controller's hand }` with `optional`/`abortOnDecline`. `EndOfYourTurn` carries
  `condition: { kind: "youHave", filter: mine Digimon with the [Tentei Hachibushu]
  trait }` and a single `UseOptionWithoutCost` (`filter` = [Shambala] Option in the
  controller's hand, `from: ["hand"]`, `payCost: false`, `optional: true`,
  `allowMultiColor: true`, `cost: { kind: "suspend", target: self }`). `Security` is
  `PlayWithoutCost` on itself with `payCost: false` and no `optional`, i.e. mandatory.
  Registration is exclusively `registerIrCard("BT26-104", compiled)` with
  `coverage: "full"`, `residual: []`.
- Defect corrected: none.
- Primitive trace: the effect-level `condition` is evaluated at the top of `runEffect`,
  so a board without a [Tentei Hachibushu] Digimon never reaches the suspend cost — the
  Tamer is not spent on a check that fails. `runAction`'s prologue preflights
  `UseOptionWithoutCost` whenever it carries a cost
  (`canAttemptUseOptionWithoutCost`), so the suspension is likewise not paid when no
  [Shambala] Option can actually be used; the test pins both halves of that ordering.
  `allowMultiColor: true` lifts `borrowed.ts`'s single-colour guard
  (`def.colors.length !== 1`), which is required here because the printed clause puts
  no colour restriction on the Option and the [Shambala] pool includes tri-colour cards
  such as EX12-070. The [On Play] trash is a genuine cost on the `Draw`, so declining
  it or having no [Shambala] card in hand draws nothing.
- Behavioral proof: 7 cases. A structural case pins the catalog, the memory gain, the
  trash-gated draw and the condition plus suspend cost on the end-of-turn clause. A
  memory case proves +1 at the start of the controller's main phase. A positive [On
  Play] case trashes BT26-013 and draws 2; its negative twin proves an unrelated hand
  card pays nothing and draws nothing. An end-of-turn case with EX12-036 Ryugumon in
  play suspends the Tamer and uses EX12-070 Sanmyojin Arrival for free, with memory
  unchanged. A negative case with a [Tentei Hachibushu] Digimon but no eligible Option
  proves the Tamer is NOT suspended. A second negative case (added by this audit)
  keeps an eligible [Shambala] Option in hand and replaces the enabler with a plain
  BT1-009 Monodramon, proving the trait condition alone blocks the clause — the
  fixture is the existing negative case with one card swapped, so it exercises no new
  decision path. The [Security] case plays the Tamer from a face-up security card for
  free.
- Verification: not run in this worktree — the coordinator runs the BT26 suite and the
  typecheck once at the end. Changed file:
  `apps/api/src/cards/BT26/BT26-104.test.ts` — one added negative case, "does not offer
  the free Option use without a Tentei Hachibushu Digimon". No card source change and
  no existing assertion changed.

## Collection closeout

### Verification

- Collection suite (`vitest run src/cards/BT26 --maxWorkers=1 --fileParallelism=false`):
  104 files, 839 tests — 100 files / 834 tests passed, 4 files / 5 tests failed.
  The pre-audit baseline on the same command was 9 files / 11 tests failed.
- `pnpm typecheck` — passed (shared, api, web).
- `oxlint apps/api/src/cards/BT26` — exit 0 (pre-existing warnings only).
- `oxfmt --check apps/api/src/cards/BT26` — passed.
- `git diff --check` — passed.

Every BT26 card module carries `@ts-nocheck`, so the passing typecheck does not
cover the card bodies themselves. Removing it across the collection is out of
this audit's scope and is recorded here as a standing gap.

### Scores

90 cards at 10/10. 14 below, in two groups.

Blocked on an engine or shared-data seam (no card-side fix exists):

| Card | Score | Seam |
| --- | --- | --- |
| BT26-019 Mailmon | 8/10 | `restrictions.ts` rewrites `suspend` to `beSuspended` |
| BT26-031 Murasamemon | 8/10 | same |
| BT26-033 Jupitermon / Wide Plasment | 8/10 | `Cost` has no `detachPermanentTop` |
| BT26-032 Ceresmon / Famis | 9/10 | Succession keyword projection (cosmetic) |
| BT26-043 Piximon | 9/10 | `placeUnder.ts` `fromDeckTop` inverts `belowTop` |
| BT26-060 Chronomon: Destroy Mode | 9/10 | `ReturnTopDigivolutionCards` `slice(-0)` |
| BT26-079 ZombiePlutomon | 9/10 | shared digivolve/assembly overrides use substring names |
| BT26-099 Training Manual | 9/10 | `<Delay>` payload preflight contradicts CR 15-7-5 |

Proof gap only, implementation believed faithful:

| Card | Score | Gap |
| --- | --- | --- |
| BT26-084 Copipemon | 9/10 | 4-card integration failure not root-caused |
| BT26-086 Dantemon | 9/10 | `runTurn` fixture never reaches seat 1's Main phase |
| BT26-089 Kyo Sawashiro | 9/10 | no non-empty-stack ordering case |
| BT26-091 Yoshino Fujieda | 9/10 | no negative-pool case |
| BT26-093 Reina Sakuya | 9/10 | no two-Digimon or non-empty-stack case |
| BT26-095 Makoto Kuonji | 9/10 | no non-empty-stack ordering case |

### Engine and shared seams found, not applied

These are outside the card layer and were deliberately left for a separate
change. Two are cross-collection regressions introduced by recent single-card
audits.

1. **`interpreter/actions/restrictions.ts`** — rewrites IR `restriction: "suspend"`
   into the ledger kind `"beSuspended"`. "Can't suspend" is a prohibition read by
   `canAttackerDeclare`; "can't be suspended" is a protection that exempts the
   combat self-suspend. 80 card modules author the token, and suites outside BT26
   assert the `"suspend"` kind. Origin: `0f9ca174d`. Fix: record both kinds, the
   way `attackOrBlock` already does.
2. **`interpreter/actions/subTrigger.ts`** — the `<Delay>` payload preflight added
   by `92b6cceda` refuses to offer the keyword when no declared `Digivolve` is
   currently legal. CR 15-7-5 allows paying an optional processing condition even
   when nothing after it can execute.
3. **`interpreter/actions/placeUnder.ts`** — the `fromDeckTop` branch computes
   `belowTop: action.position !== "top"`, inverted against the other four
   placement paths. Cards must write `position: "top"` to reach the bottom;
   `<Training>` places at the top against CR 16-41. Fixing it must move the
   call sites in the same commit.
4. **`interpreter/costs.ts`** — `trashBottomFaceDownUnderTamer` and
   `trashBottomFaceDownUnderDigimon` never report `out.paidCount`, so any
   cost-carrying `CostModifier` paired with them scales to zero silently.
5. **`interpreter/actions/removal.ts`** — `ReturnTopDigivolutionCards` computes
   `slice(-0)`, which returns the whole array, so a target with no digivolution
   cards loses its only card and the permanent vanishes. Q7081 requires the
   opposite.
6. **`interpreter/actions/replacement.ts`** — `preventCheck` ignores whether its
   inner actions succeeded, so a leave-prevention resolves even when its cost
   could not be paid. Worked around card-side on BT26-085.
7. **`interpreter/actions/borrowed.ts`** — `UseOptionWithoutCost` defaults
   `costCap` to 5 when the IR names no ceiling, silently dropping costlier
   Options for cards that print no restriction. Latent today.
8. **`packages/shared` digivolve and assembly overrides** — `names` is substring
   matching where the printed bracket reference is exact, so BT26-079 satisfies
   its own `[Plutomon]` requirement. Same latent spelling on BT26-073 and
   BT26-080.
