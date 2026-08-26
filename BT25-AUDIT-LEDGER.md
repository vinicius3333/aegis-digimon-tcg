# BT25 Card Audit Ledger

This ledger records reproducible per-card evidence. A static diagnosis is not a passing
behavioral audit: cards remain below 10/10 until their causal gaps are corrected and their
focused observable tests pass. No collection result is inferred from this ledger.

## Static diagnosis: BT25-004 through BT25-006

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-004 Tapmon | Green level 2 DigiEgg; inherited `[Your Turn] [Once Per Turn]` optional reduction of 1 when a `[Social]`, `[Tool]`, or `[Game]` trait card would link to its host. Local card query has no entries. The module cites BT25-089 Q6422/Q6423, but those rulings govern BT25-089's own Link effect and do not redefine Tapmon's optional once-per-turn trigger. | **Causal IR gap.** `GrantLinkCostReduction` installs an always-on recipient grant from a continuous `YourTurn` effect. `recomputeContinuousEffects()` never prompts or consumes the effect use ledger, and `linkCostReduction()` returns the grant for every matching declaration. The player therefore cannot decline, and more than one matching link in the turn receives the reduction. | The custom test uses an interpreter/primitives fixture, puts inherited Tapmon as the battle-area top card, and exercises one synthetic Social link. It does not prove inherited placement, public `linkCard`, optional refusal, once-per-turn consumption, off-turn lapse, Tool/Game matches, or non-match rejection. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-005 Pagumon | Black level 2 DigiEgg; inherited `[Your Turn] [Once Per Turn]` trigger when a `[Three Musketeers]` trait card is placed in its host's digivolution cards; it may digivolve into a Digimon with `[Three Musketeers]` in its text or the `[TS]` trait, reducing cost by 2. Q6252 defines “X in its text” across name, traits, effects, inherited effects, Rule and evolution/fusion/Xros/Link/Assembly requirements. | **Causal IR gaps.** The add-to-this-host and added-card trait gates are represented correctly, and the current candidate corpus is visible to the shared name/trait/text matcher. The Digivolve action omits `payCost: true`, so `reduceCost: 2` produces a free evolution. It also omits `preserveOncePerTurnOnDecline`, so declining the optional evolution leaves the installed watcher marked used for the turn. | The colocated test only matches IR structure. It does not execute the placement event, legal evolution stack, reduced payment, Three Musketeers-text/TS union, near-match rejection, refusal, turn ownership, or once-per-turn behavior. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-006 Dorimon | Purple level 2 DigiEgg; inherited `[Opponent's Turn] [Once Per Turn]`; when an opponent's Digimon attacks, the controller may trash 1 hand card to unsuspend 1 of their `[Titan]` trait Digimon. Local card query has no entries. | **Causal IR gap.** The activation cost is correctly modeled as an optional SubTrigger cost, the Titan target is controller-scoped, and decline restores the once-per-turn budget. However, combat broadcasts `whenOpponentAttacks` for every attack. The watcher has no attacker filter, unlike peer modules that require `controller: "opponent", kind: ["Digimon"]`; it can therefore react to its controller's Digimon attacking during the opponent's turn. | The colocated test only matches IR structure. It does not prove payment or refusal, attacker ownership, Titan versus non-Titan targeting, observable unsuspension, turn scope, or once-per-turn behavior. **Static diagnosis only; implementation and behavioral proof required.** |

## Validation record

- Catalog records read from `packages/shared/src/cards/data/cards.json`.
- Local queries executed: `node tools/kb/query.mjs card BT25-004`, `BT25-005`, and `BT25-006`.
- Direct `registerIrCard` modules, colocated tests, relevant interpreter actions, continuous
  link-cost ledger, SubTrigger budget/cost handling, and combat attack broadcast were inspected.
- No tests or collection gate were run during this static-diagnosis pass.

## Focused implementation validation

- `BT25-004` focused run 1: **failed** (5 tests, 1 failed). The declaration-consumption case
  expected `optionalPrompts: 1` after accepting the first of two same-turn Link declarations,
  but received `optionalPrompts: 2`; memory payment (`1`) and linked count (`2`) were correct.
  Cause: generic `action.optional` prompted while the continuous grant was installed as well as
  when Link was declared. Minimal correction applied: the grant now carries
  `optionalAtDeclaration`, which is read only by the Link declaration seam. No focused rerun has
  been performed; rerun is pending fresh authorization.
- `BT25-005`: implementation and focused assertion updated; focused test not yet run.
- `BT25-006`: implementation and focused assertion updated; focused test not yet run.
- No broad or collection gate has been run.

## Static diagnosis: BT25-007 through BT25-009

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-007 Gatchmon | Red level 3 Digimon; alternate cost-0 evolution from a level 2 `[Appmon]`; `[On Play]` reveals 3, adds 1 `[Appmon]` card and a distinct `[Social]`/`[Tool]`/`[Reboot]`/`[Creation]` card, then bottoms the rest; `[Link] [Appmon]: Cost 1`, +2000 linked DP; linked `[When Linking]` deletes 1 opposing Digimon with 3000 DP or less. Local card query has no entries. | **Causal IR gap.** The alternate evolution and two-slot `RevealAdd` are represented, and the shared reveal action excludes a card taken by the first slot from the second slot. The catalog supplies Link eligibility/cost/DP, but the compiled module contains no `WhenLinking` effect with `isLinked: true` and no `Delete` action. Consequently linking BT25-007 never executes its printed 3000-DP deletion. The compiled IR also omits structured `linkRequirement` metadata, although live Link legality still reads the catalog definition. | The colocated test only matches the On Play `RevealAdd` structure. It does not cover distinct picks, deck-bottom order, alternate evolution, public `linkCard`, linked DP, or the missing linked deletion. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-008 Coronamon | Red level 3 Digimon; alternate cost-0 evolution from a level 2 `[TS]`; `[When Moving]`/`[On Play]` may trash 1 or 2 `[Iliad]`/`[TS]` hand cards and draws once per card actually trashed; inherited `[Your Turn]` +2000 DP. Local card query has no entries. | **No causal mismatch found statically.** Both trigger windows use the same filtered up-to-2 trash cost. The shared hand-cost path accepts one or two candidates and records the moved count; `usePaidCount` scales Draw from that count. Declining aborts the action, and the inherited continuous modifier is turn-scoped. The alternate TS evolution requirement is present. | The colocated test only matches IR structure. It does not execute moving versus playing, 1-card and 2-card payments, refusal, near-match rejection, hand/trash/deck totals, alternate evolution, or inherited DP turn lapse. **Static diagnosis only; behavioral proof required before 10/10.** |
| BT25-009 Bearmon | Red level 3 Digimon; alternate cost-0 evolution from a level 2 `[TS]`; at start of own main phase, at 4 or less memory, may digivolve without cost into a legal hand Digimon with `[Beast]`, `[Animal]`, or `[Sovereign]` other than `[Sea Animal]`, or with `[TS]`; inherited `[All Turns]` +1000 DP. Q6253 defines the memory boundary as 4 or farther right on the controller's side. | **No current causal mismatch proven statically.** `StartOfYourMainPhase` makes the unqualified `memoryAtMost: 4` read the turn player's gauge perspective, matching Q6253; the action is optional, hand-only, free, self-targeted, and still enforces ordinary/alternate evolution requirements. The inherited modifier is all-turn. `excludeNameOrTrait: Sea Animal` applies globally to the TS alternative as well as the Beast/Animal/Sovereign family. That may be broader than the English punctuation, but the only catalog card carrying both `[Sea Animal]` and `[TS]` is blue level-5 BT24-029, which is not a legal evolution from Bearmon, so no observable corpus mismatch is established. Record this as unresolved wording scope rather than inventing an exception. | The colocated test only matches IR structure. It does not prove Q6253 boundaries (4/5 and turn perspective), legal versus illegal evolution requirements, optional refusal, trait union/exclusion, free payment, alternate evolution into Bearmon, or inherited DP. **Static diagnosis only; behavioral proof and the recorded wording ambiguity remain.** |

### Static validation record for BT25-007 through BT25-009

- Catalog records read from `packages/shared/src/cards/data/cards.json`.
- Local queries executed: `node tools/kb/query.mjs card BT25-007`, `BT25-008`, and
  `BT25-009`; only BT25-009 returned a card ruling (Q6253).
- Direct `registerIrCard` modules and colocated tests were read one card at a time. Relevant
  shared paths inspected: `RevealAdd` distinct-slot handling, linked-effect timing/registration,
  up-to hand-trash payment and paid-count scaling, `memoryAtMost`, definition exclusions, and
  effect-driven digivolution requirement enforcement.
- No tests, typecheck, broad gate, or collection gate were run. All focused runs remain pending
  fresh authorization, including the unresolved BT25-004 rerun.

## Static diagnosis: BT25-010 through BT25-012

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-010 Hawkmon | Red/green level 3 Digimon; alternate cost-0 evolution from `[Poromon]` or a level 2 `[TS]`; during the controller's turn, its battle-area Digimon reduces by 1 the cost to evolve into an `[Avian]`, `[Bird]`, `[Beast]`, `[Animal]`, or `[Sovereign]` Digimon other than `[Sea Animal]`; inherited `[Your Turn]` +2000 DP. Q6254 confirms the cost reduction does not apply while Hawkmon is in the breeding area. | **No causal mismatch found statically.** The self-scoped `wouldDigivolve` replacement filters the destination trait family and exclusion, and the ordinary `staticModifier` builder requires the source to be in the battle area, satisfying Q6254. The turn window, amount, alternate requirements, and inherited DP modifier are represented. | The colocated test only matches broad IR structure. It does not execute battle-area versus breeding-area evolution, eligible and excluded traits, cost payment, alternate evolution, turn lapse, or inherited DP. **Static diagnosis only; behavioral proof required before 10/10.** |
| BT25-011 Aquilamon | Red/green level 4 Digimon; alternate cost-2 evolution from `[Hawkmon]` or a level 3 `[TS]`; `Raid`; on play and when digivolving, suspends 1 opposing Digimon, then during its controller's turn 2 of their Digimon may DNA digivolve into a `[Silphymon]` in hand; inherited `[Your Turn]` +2000 DP. Local card query has no entries. | **No card-specific causal mismatch found statically, with a shared selection caveat.** Both trigger windows suspend first and then offer the turn-gated optional DNA action. The DNA runner defaults the result zone to hand and delegates legality and cost to the selected Silphymon's DNA requirements. However, the single broad `materials` target lets the player select any 2 controlled Digimon before `canDnaDigivolve` validates the pair; an invalid pair can therefore fizzle even when another legal pair exists. This is a shared DNA-selection affordance gap rather than a mistranslation unique to BT25-011. Raid, alternate requirements, and inherited DP are present. | The colocated tests only match IR structure. They do not execute trigger ordering, target suspension, opponent-turn suppression, optional refusal, valid/invalid DNA material choice, result selection from hand, DNA cost, alternate evolution, Raid, or inherited DP. **Static diagnosis only; behavioral proof and the shared DNA selection caveat remain before 10/10.** |
| BT25-012 Grizzlymon | Red/green level 4 Digimon; alternate cost-2 evolution from a level 3 `[TS]`; on play and when digivolving, 1 controlled Digimon with `[Beast]`, `[Animal]`, or `[Sovereign]` other than `[Sea Animal]`, or with `[Shaman]`/`[TS]`, gains `Raid` and +3000 DP for the turn; inherited `[All Turns]` +1000 DP. Local card query has no entries. | **Causal IR gap.** Eligibility, exclusion, durations, both trigger windows, alternate evolution, and inherited DP are represented. But `GainKeyword` and `ModifyDP` each contain a fresh count-1 target with neither `sameTarget` nor a shared selection binding. `resolvePermanentTargets()` therefore makes independent selections, allowing Raid to be granted to one eligible Digimon and +3000 DP to another, contrary to the single printed recipient. | The colocated tests only match each action separately and cannot prove recipient identity. They do not execute either trigger, mixed eligible/near-match targets, the Sea Animal exclusion, shared recipient selection, duration expiry, alternate evolution, or inherited DP. **Static diagnosis only; implementation and behavioral proof required.** |

### Static validation record for BT25-010 through BT25-012

- Catalog records read from `packages/shared/src/cards/data/cards.json`.
- Local queries executed: `node tools/kb/query.mjs card BT25-010`, `BT25-011`, and
  `BT25-012`; only BT25-010 returned a card ruling (Q6254).
- Direct `registerIrCard` modules and colocated tests were read one card at a time. Relevant
  shared paths inspected: continuous-source battle-area gating, destination-filtered evolution
  reductions, DNA result-zone/default legality and material selection, and permanent target
  reuse via `sameTarget`/selection bindings.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun.

## Static diagnosis: BT25-013 through BT25-016

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-013 Firamon | Red level 4 Digimon; alternate level-3 `[TS]` evolution cost 2; on play/when digivolving, by trashing 1 hand card, may return 1 red or blue `[Iliad]` Digimon from trash; during your turn, when your Digimon is played or digivolves, if that Digimon is blue, may digivolve this into `[Flaremon]` from hand at -1; inherited your-turn +2000 DP. Q6255 explicitly permits paying the trash cost and then declining the return. Q6256 says non-blue plays/evolutions trigger but cannot activate; Q6257 evaluates the post-evolution Digimon. | **Causal IR gap.** The Return action combines the trash payment and optional return into one optional action with `abortOnDecline`; declining avoids the trash cost, so Q6255's pay-then-decline path is not representable. The two blue-gated subtriggers and post-event subject filter are otherwise represented. | Colocated test is structural only; it does not prove pay-then-decline, red/blue Iliad filtering, non-blue trigger suppression, post-evolution subject identity, free/discounted evolution, or inherited DP. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-014 Meramon | Red level 4 Digimon; alternate level-3 `[Flame]`/`[TS]` evolution cost 2; once-per-turn main effect trashes 1 Flame/TS hand card, deletes opposing Digimon at 4000 DP or less, and draws 2 if this effect did not delete; inherited when-attacking deletion. Q6258-Q6260 define activation with no target, mandatory selection when a target exists, and immune targets counting as no deletion. | **No new card-specific causal mismatch found statically.** The hand cost, mandatory target behavior, no-target activation, and structured `ifThisEffectDidNotDelete` condition are represented by the hand-fixed IR. Inherited timing/filter and alternate requirement are present. | Structural test only; no execution of Q6258-Q6260 boundaries, immune target, once-per-turn, inherited attack, or evolution proof. **Static diagnosis only; behavioral proof required.** |
| BT25-015 Garudamon | Red/green level 5 Digimon; alternate level-4 `[Giant Bird]`/`[TS]` evolution cost 3; Raid and Fortitude; on play/when digivolving delete opposing Digimon at 6000 DP or less; inherited all-turn once-per-turn effect when this Digimon deletes an opponent's Digimon in battle, trash their top security. Q6261 says the inherited effect cannot activate when both source and opponent Digimon are deleted at the same timing. | **Potential shared timing gap, not a proven card mistranslation.** The inherited watcher listens to `whenDeletesInBattle` with self as source and correctly limits frequency, but static inspection did not prove whether simultaneous source deletion is excluded by event ordering. This must remain an explicit unresolved engine-semantics caveat rather than inferred as correct. Main effects, keywords, requirement, and DP boundary are represented. | Structural test only; no battle-delete, simultaneous deletion, security trash, once-per-turn, Fortitude/Raid, or evolution-stack proof. **Static diagnosis only; timing caveat and behavioral proof remain.** |
| BT25-016 GrapLeomon | Red/green level 5 Digimon; alternate level-4 `[TS]` evolution cost 3; on play/when digivolving, 1 own Digimon gets +3000 DP for turn, then 1 own Digimon may attack; all turns, when a Digimon with 13000 DP or more attacks, may free-digivolve this into Marsmon or Callismon; inherited Security Attack +1. Q6262-Q6264 clarify trigger timing, DP threshold at attack time, and either player's attacker. | **No card-specific causal mismatch found statically.** Separate count-1 targets correctly model the two independent “1 of your Digimon” choices; the all-turn attacker watcher accepts either controller and requires 13000 DP at event matching, while the free hand evolution and inherited keyword are present. | Structural test only; no target-choice independence, attack suspension, threshold boundary, opponent attacker, post-modifier timing, free evolution, or inherited security proof. **Static diagnosis only; behavioral proof required.** |

### Static validation record for BT25-013 through BT25-016

- Catalog records and all local KB queries (`BT25-013` through `BT25-016`) were read.
- Direct IR modules and colocated tests were inspected one card at a time. Relevant shared paths included optional cost/return sequencing, event-subject color timing, deletion-result conditions, battle deletion event ordering, once-per-turn watchers, attack threshold matching, and effect-driven evolution.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun; all focused runs remain pending authorization.

## Static diagnosis: BT25-022 (Lunamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-022 Lunamon | Red level 3 Digimon; alternate level-2 `[TS]` evolution cost 0; `[On Play]` reveals the top 3 cards, adds 1 `[Iliad]` trait card and 1 `[TS]` trait card among them to hand, then returns the rest to the bottom of the deck; inherited `[Jamming]`. Local card query has no knowledge-base entries. | **No card-specific causal mismatch found statically.** The compiled IR has the exact two RevealAdd slots, each count 1 and controller-defaulted to the owner, with the required Iliad/TS trait filters and `deckBottom` remainder. `runRevealAdd` tracks taken instance IDs between slots, so a card selected for the Iliad slot cannot also satisfy the TS slot; remaining revealed cards are sent to the requested bottom destination. The alternate evolution requirement and inherited Jamming keyword are present. | The colocated test verifies only the IR shape and inherited keyword. It does not execute reveal ordering, distinct-slot selection, overlap handling, bottom-deck order, missing-slot behavior, alternate evolution, or Jamming in security. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-022

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-022` (no entries).
- Direct module, colocated structural test, and `runRevealAdd` were inspected. The shared
  implementation's `taken` instance set enforces distinct physical cards across add slots,
  while the `rest: "deckBottom"` path handles all unselected revealed cards.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.
