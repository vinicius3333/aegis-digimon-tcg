# BT25 Card Audit Ledger

This ledger records reproducible per-card evidence. A static diagnosis is not a passing
behavioral audit: cards remain below 10/10 until their causal gaps are corrected and their
focused observable tests pass. No collection result is inferred from this ledger.

## Static diagnosis: BT25-004 through BT25-006

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-004 Tapmon | Green level 2 DigiEgg; inherited `[Your Turn] [Once Per Turn]` optional reduction of 1 when a `[Social]`, `[Tool]`, or `[Game]` trait card would link to its host. Local card query has no entries. The module cites BT25-089 Q6422/Q6423, but those rulings govern BT25-089's own Link effect and do not redefine Tapmon's optional once-per-turn trigger. | **Causal IR gap.** `GrantLinkCostReduction` installs an always-on recipient grant from a continuous `YourTurn` effect. `recomputeContinuousEffects()` never prompts or consumes the effect use ledger, and `linkCostReduction()` returns the grant for every matching declaration. The player therefore cannot decline, and more than one matching link in the turn receives the reduction. | The custom test uses an interpreter/primitives fixture, puts inherited Tapmon as the battle-area top card, and exercises one synthetic Social link. It does not prove inherited placement, public `linkCard`, optional refusal, once-per-turn consumption, off-turn lapse, Tool/Game matches, or non-match rejection. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-005 Pagumon | Black level 2 DigiEgg; inherited `[Your Turn] [Once Per Turn]` trigger when a `[Three Musketeers]` trait card is placed in its host's digivolution cards; it may digivolve into a Digimon with `[Three Musketeers]` in its text or the `[TS]` trait, reducing cost by 2. Q6252 defines “X in its text” across name, traits, effects, inherited effects, Rule and evolution/fusion/Xros/Link/Assembly requirements. | **Previously identified IR gaps are corrected:** the Digivolve action now carries `payCost: true` with `reduceCost: 2`, and `preserveOncePerTurnOnDecline: true` preserves the watcher budget when the optional evolution is refused. No new card-specific static mismatch found. | The colocated test remains structural only. It does not execute the placement event, legal evolution stack, reduced payment, Three Musketeers-text/TS union, near-match rejection, refusal, turn ownership, or once-per-turn behavior. **Static correction recorded; behavioral proof required.** |
| BT25-006 Dorimon | Purple level 2 DigiEgg; inherited `[Opponent's Turn] [Once Per Turn]`; when an opponent's Digimon attacks, the controller may trash 1 hand card to unsuspend 1 of their `[Titan]` trait Digimon. Local card query has no entries. | **Previously identified attacker-scope gap is corrected:** the watcher now requires `sourceFilter: { controller: "opponent", kind: ["Digimon"] }`; the optional hand-trash cost, controller-scoped Titan target, and decline budget preservation remain represented. No new card-specific static mismatch found. | The colocated test remains structural only. It does not prove payment or refusal, attacker ownership, Titan versus non-Titan targeting, observable unsuspension, turn scope, or once-per-turn behavior. **Static correction recorded; behavioral proof required.** |

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

Re-verification: BT25-012's second effect action now carries `sameTarget: true`,
binding the +3000 DP recipient to the Digimon selected for Raid. Behavioral proof
remains outstanding.

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

Re-verification: BT25-013 remains unresolved. The IR action model combines the
hand-trash payment and optional return into one optional `Return` action, so it
cannot represent Q6255's pay-then-decline path without a reusable sequencing or
cost-only seam. No card-local approximation was introduced.

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

## Static diagnosis: BT25-039 (Sirenmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-039 Sirenmon | Yellow/green level 5 Digimon; Security end-of-your-turn may play Ceresmon from hand at -7, then may place this card under that played Digimon; all turns, when any other own Shaman/Iliad Digimon or Tamer would leave by a cause other than your effects, deleting this prevents all matching leaves; on deletion may place this face-up at bottom security; inherited opponent's turn once per turn, when an opponent's Digimon attacks, may redirect to one suspended own Digimon. Q6306-Q6308 define cost stacking, affects-all replacement and delayed On Deletion timing. | **Causal attacker-filter gap.** The inherited `whenOpponentAttacks` watcher has no `sourceFilter`, so the combat SubTrigger bus accepts any attacker subject. The printed watcher requires an opponent's Digimon; a forced own Digimon attack during the opponent's turn could incorrectly open the redirect. Security timing, Ceresmon reduced payment/placement, affects-all leave replacement, delayed deletion behavior, face-up bottom-security placement, and inherited once-per-turn scope are otherwise represented. | Structural proof only; no execution of opponent-vs-own attacker filtering, Security end-of-battle timing, replacement batches, cost stacking, or delayed On Deletion resolution. **Static diagnosis only; implementation correction and behavioral proof required.** |

### Static validation record for BT25-039

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-039` (Q6306-Q6308).
- Direct module and combat `whenOpponentAttacks` payload routing were inspected. The combat
  bus emits the attacker as subject and relies on watcher `sourceFilter` for ownership; this
  watcher omits that filter.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-038 (Shakkoumon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-038 Shakkoumon | Yellow/black level 5; on play/when digivolving may place an Angel/Archangel/Three Great Angels/Iliad Digimon from hand or a Digimon's digivolution cards as top/bottom security, then if DNA digivolving trash both players' top security cards; all turns once per turn when own security is added, De-Digivolve 1 opposing Digimon; inherited all turns once per turn when own security is removed, one opposing Digimon gets -4000 DP. Q6305 defines ordering with Security effects. | **No card-specific causal mismatch found statically.** The hand-fixed IR uses top/bottom placement, hand/digivolution source locations, a mandatory both-player top-security trash gated by DNA-digivolving, and separate `whenAddSecurity`/`whenSecurityRemoved` once-per-turn watchers with the correct own-stack direction. Main and inherited target scopes, duration, and amounts are represented. | Structural test only; no execution of DNA timing, source-zone selection, top/bottom choice, both-player trash ordering, security watcher budgets, or Q6305 ordering. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-038

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-038` (Q6305).
- Direct module and shared security placement, DNA condition, both-player top-security trash,
  and add/remove-security SubTrigger routing were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-037 (Pegasusmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-037 Pegasusmon | Yellow/blue level 4 Armor Form; alternate `[Patamon]` or level-3 `[TS]` evolution cost 2; Armor Purge; on play/when digivolving add top security to hand, then may place 1 Angel/Archangel/Three Great Angels/Iliad trait Digimon or 1 TS trait Tamer from hand as top or bottom security. Q6304 confirms activation at zero security and placement of the selected card. | **No card-specific causal mismatch found statically.** Both trigger windows perform security-to-hand first, then optionally choose one hand card from the printed Digimon-trait union or TS Tamer alternative and place it top/bottom security. The source filters enforce the kind split, and Armor Purge plus both alternate evolution paths are represented. | Structural test only; no execution of zero-security placement, top/bottom choice, union overlap, optional refusal, security ordering, Armor Purge, or alternate evolution. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-037

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-037` (Q6304).
- Direct module and shared security-to-hand plus add-top-or-bottom source union/kind filtering
  were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-036 (Craftmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-036 Craftmon | Yellow level 4 Appmon; App Fusion `[Kabemon] & [Gomimon] & [Ecomon] & [Puzzlemon]` cost 0; `[Security]` at the end of battle, play this card without paying; on play/when digivolving, add top security to hand, then Recovery +1; Link Appmon cost 2, +3000 linked DP, and when linking by trashing 1 Appmon from hand draw 2. Q6302 permits activation at zero security and performs Recovery only; Q6303 enumerates pairwise App Fusion combinations. | **Causal timing gap.** The Security effect directly executes `PlayWithoutCost` at the generic Security timing. The printed effect is explicitly “at the end of the battle”; it must arm a one-shot `whenSecurityBattleEnded` consequence and play then. As written, Craftmon is played during the security check, before battle resolution. The On Play/When Digivolving security-to-hand then Recovery sequence and App Fusion requirement are present in this module, while Link metadata/effect is supplied by catalog registration. | The direct module has no colocated test shown here for end-of-battle timing. Structural proof would not catch the premature Security play. **Static diagnosis only; implementation correction and behavioral proof required.** |

### Static validation record for BT25-036

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-036` (Q6302 and Q6303).
- Direct module and the shared Security timing seam were inspected. Peer BT6-111 shows the
  required pattern: a Security action installs a one-shot `whenSecurityBattleEnded` watcher;
  Craftmon currently lacks that wrapper and plays immediately.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-035 (Cougarmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-035 Cougarmon | Yellow level 4 Digimon; alternate level-3 `[Glowing Dawn]` evolution cost 2; on play/when digivolving, 1 opposing Digimon gets -3000 DP for the turn, then this Digimon may digivolve into a `[Glowing Dawn]` Digimon in hand for free by trashing 2 bottom face-down cards from under any own Tamers. Q6299-Q6301 cover zero-DP rule-check timing and require both cards, allowing them to be spread across Tamers. | **No card-specific causal mismatch found statically.** The two trigger windows sequence the -3000 modification before the optional free evolution. The evolution action uses a Glowing Dawn trait destination, `payCost: false`, and a count-2 bottom-face-down-under-Tamer cost that can aggregate across Tamers. Inherited Barrier and alternate evolution are represented. | Structural test only; no execution of mandatory two-card aggregation, one-card refusal, bottom-card order, zero-DP rule-check timing, free evolution legality, or Barrier. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-035

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-035` (Q6299-Q6301).
- Direct module/test and shared bottom-face-down Tamer cost, multi-Tamer aggregation,
  free digivolution, and post-effect zero-DP handling were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-034 (Angemon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-034 Angemon | Yellow level 4 Digimon; alternate level-3 `[TS]` evolution cost 2; when an effect trashes this card from the security stack, may play 1 level-4-or-lower `[Angel]` or `[Iliad]` trait card from hand without paying; Ascension; inherited Barrier. Q6298 limits activation to direct effect trash from security, not reveal/search. | **No card-specific causal mismatch found statically.** The `OnDiscardSecurity` timing is the dedicated effect-driven direct-trash seam, excluding reveal/search cases; the hand target correctly combines level <=4 with Angel/Iliad traits and pays no cost. Ascension, inherited Barrier, and alternate evolution are represented. | Structural test only; no execution of direct versus indirect security movement, optional refusal, level/trait filtering, Ascension, alternate evolution, or Barrier. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-034

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-034` (Q6298).
- Direct module and shared `OnDiscardSecurity`/`fireDiscardedFromSecurity` routing were
  inspected, including the distinction from generic security removal.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-033 (Aegiomon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-033 Aegiomon | Yellow level 4 Digimon; alternate level-3 `[TS]` evolution cost 2; Barrier; on play/when digivolving, by adding the top security card to hand, 1 opposing Digimon gets -5000 DP for the turn; inherited Barrier. Local card query has no entries. | **No card-specific causal mismatch found statically.** Both trigger windows use a mandatory security-to-hand cost before applying -5000 DP to one opposing Digimon for the turn. The target controller, kind, amount, duration, alternate evolution, and both Barrier keyword instances are represented. | Structural test only; no execution of mandatory cost failure with empty security, target selection, DP duration, alternate evolution, or Barrier prevention. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-033

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-033` (no entries).
- Direct module and shared security-to-hand cost plus ModifyDP resolution paths were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-032 (Liollmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-032 Liollmon | Yellow level 3 Digimon; alternate level-2 `[Glowing Dawn]` evolution cost 0; on play reveals top 3, adds 1 `[Glowing Dawn]` trait card and 1 yellow `[BEATBREAK]` trait card, then bottoms the rest; inherited Barrier. Local card query has no entries. | **No card-specific causal mismatch found statically.** The RevealAdd slots carry the required Glowing Dawn and yellow-plus-BEATBREAK intersections, while the shared taken-instance set prevents one physical card from being selected twice. The remainder goes to deck bottom; alternate evolution and Barrier are represented. | Structural test only; no execution of color/trait intersection, overlapping Glowing Dawn/BEATBREAK selection, missing-slot behavior, bottom-deck order, alternate evolution, or Barrier protection. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-032

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-032` (no entries).
- Direct module/test and shared `RevealAdd` intersection matching, taken-instance exclusion,
  and deck-bottom remainder handling were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-031 (Patamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-031 Patamon | Yellow level 3 Digimon; alternate level-2 `[TS]` evolution cost 0; on play reveals top 3, adds 1 `[Angel]`, `[Archangel]`, `[Three Great Angels]`, or `[Four Great Dragons]` trait card and 1 `[TS]` trait card, then bottoms the rest; inherited Barrier. Local card query has no entries. | **No card-specific causal mismatch found statically.** The first RevealAdd slot represents the four-way trait union, the second represents TS, and the shared `taken` instance set prevents one physical revealed card from filling both slots. Unselected cards use `deckBottom`; alternate evolution and inherited Barrier are present. | Structural test only; no execution of trait-union matching, overlapping Angel/TS selection, missing-slot behavior, bottom-deck order, alternate evolution, or Barrier protection. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-031

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-031` (no entries).
- Direct module/test and shared `RevealAdd` OR-trait matching, taken-instance exclusion,
  and deck-bottom remainder handling were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-030 (Elecmon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-030 Elecmon | Yellow level 3 Digimon; alternate level-2 `[TS]` evolution cost 0; start of your main phase, by adding your top security card to hand, gain 1 memory; inherited when attacking once per turn may add the top security card to hand, then if you have 0 security cards, Recovery +1. Q6297 confirms the inherited effect may activate at zero security and perform Recovery without adding a card to hand. | **No card-specific causal mismatch found statically.** The main effect requires the security-to-hand cost before gaining memory. The inherited sequence separately offers optional top-security movement, then conditionally grants Recovery +1 when the controller has exactly zero security; an empty security stack can therefore continue to the Recovery clause. Alternate evolution, once-per-turn frequency, and inherited scope are represented. | The colocated tests are structural only and do not execute payment/refusal, empty-security Recovery, security-removal triggers, deck exhaustion, or alternate evolution. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-030

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-030` (Q6297).
- Direct module/test and shared security-to-hand, conditional Recovery keyword, optional action,
  and once-per-turn handling were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-029 (MirageGaogamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-029 MirageGaogamon | Blue/black level 6 Digimon; alternate level-5 `[MachGaogamon]`-in-name or `[DATA SQUAD]` evolution cost 3; Reboot, Blocker, Evade; when digivolving/attacking once per turn, may return an opposing level-5-or-lower Digimon, then by trashing the bottom face-down card under any own Tamer return an opposing lowest-level Digimon; all turns once per turn, when effects add cards to opponent's hand or trash cards under own Tamers, may unsuspend; inherited same replacement. Q6296 confirms the shared once-per-turn budget is available again on attack if declined during digivolution. | **No card-specific causal mismatch found statically.** The digivolving and attacking effects share one once-per-turn key, preserve the optional first return followed by the paid lowest-level return, and use the correct level and bottom-face-down Tamer cost filters. The two All Turns event watchers are optional and share the parent once-per-turn scope; the Tamer source filter aligns with the engine's event payload for cards trashed under Tamers. Name/trait evolution alternatives and all three keywords are represented. | Structural test only; no execution of Q6296 budget reuse, return sequencing, lowest-level tie handling, cost refusal/payment, event watcher scope, once-per-turn interactions, or inherited replacement behavior. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-029

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-029` (Q6296).
- Direct module/test and shared once-per-turn keys, return superlative, bottom-face-down
  Tamer-cost primitive, and `whenDigivolutionTrashed` host-source payload were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-028 (Dianamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-028 Dianamon | Blue/purple level 6 Digimon; alternate level-5 `[TS]` evolution cost 3; play cost reduction 5 while opponent has a level-6-or-higher Digimon; on play/when digivolving, permanently restricts the snapshot of opposing Digimon with 1 or fewer digivolution cards from suspending through opponent's turn, then deletes 1 opposing unsuspended Digimon; all turns once per turn, when any Digimon is played or digivolves, may trash any 4 opposing digivolution cards, then 2 own Digimon may DNA digivolve into `[GraceNovamon]` in hand; inherited when attacking once per turn restricts 1 opposing Digimon or Tamer from suspending. Q6292-Q6295 define event scope and restriction snapshot/lapse; Q6489 covers counter timing after a newly played Digimon enables the watcher. | **Causal sequencing gap.** The `AllTurns` effect installs `whenPlayed`/`whenAnyDigivolves` watchers whose bodies only trash 4 cards. The `DnaDigivolve` action is outside both `SubTrigger` bodies, so it is resolved as part of the parent AllTurns effect rather than after a qualifying play/digivolution event. This can offer DNA digivolution at the wrong time and fails to sequence it after the event-driven trash. The cost reduction, main restriction/delete sequence, event scope, optional trash, inherited restriction, and alternate requirement are otherwise represented. | The colocated test only checks the presence of two watchers and a sibling DNA action, thereby encoding the faulty structure. It does not execute event timing, trash-then-DNA ordering, “any 4” selection across opposing stacks, once-per-turn consumption, snapshot semantics, or Q6489 counter timing. **Static diagnosis only; implementation correction and behavioral proof required.** |

### Static validation record for BT25-028

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-028` (Q6292-Q6295 and Q6489).
- Direct module/test and shared SubTrigger nesting, all-turn effect resolution, stack-trash
  scope, DNA action sequencing, and restriction snapshot mechanisms were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-027 (MachGaogamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-027 MachGaogamon | Blue/black level 5 Digimon; alternate level-4 `[DATA SQUAD]` evolution cost 3; when digivolving/attacking once per turn, may return 1 opposing level-4-or-lower Digimon to hand, then by trashing the bottom face-down card under any own Tamer unsuspend this Digimon; all turns once per turn, the card prevents its own leaving the battle area by the same cost; inherited version protects a Digimon with `[Gaogamon]` in its name or `[DATA SQUAD]` trait. | **No card-specific causal mismatch found statically.** The two trigger windows share one once-per-turn key and preserve the printed return-then-unsuspend sequence. Return targeting is opponent Digimon level 4 or lower; the unsuspend target is self and the shared cost correctly trashes a bottom face-down Tamer card. The self replacement and inherited Gaogamon/DATA SQUAD replacement carry the proper once-per-turn scope, controller, and cost. | Structural test only; no execution of shared once-per-turn consumption, optional return/refusal, cost payment, replacement prevention, inherited trait/name matching, or leaving-play edge cases. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-027

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-027` (no entries).
- Direct module/test and shared once-per-turn keys, face-down Tamer-cost primitive, return
  level filtering, and leave-play replacement paths were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-026 (Crescemon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-026 Crescemon | Blue level 5 Digimon; alternate level-4 `[TS]` evolution cost 3; on play/when digivolving trashes the bottom 3 digivolution cards of 1 opposing Digimon, then 1 opposing Digimon with no digivolution cards cannot suspend until their turn ends; during your turn, on own Digimon play/digivolution, if the post-event Digimon is red, may digivolve this into `[Dianamon]` from trash at -2; inherited your-turn attack target cannot change. Q6290 confirms non-red events trigger but cannot activate; Q6291 uses the post-digivolution subject. | **No card-specific causal mismatch found statically.** Both main windows use bottom-of-stack (`fromTop: false`) trashing followed by an independent opposing no-source target restriction, matching the printed “1 ... then 1 ...” wording. The two Your Turn watchers gate at fire time on the post-event subject's red color and owner turn, target Dianamon by name in trash, pay the reduced cost, and remain optional. The inherited attack-target restriction, alternate requirement, and duration are represented. | Structural and mechanism tests inspect the watcher gate, but do not prove full stack trashing, independent target choice, no-card boundary, reduced memory payment, turn expiry, or inherited attack-target immutability. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-026

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-026` (Q6290 and Q6291).
- Direct module/test and shared `TrashDigivolution` bottom-order, fire-time subject-color,
  and effect-driven digivolution payment paths were inspected.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-025 (Aegiochusmon: Blue)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-025 Aegiochusmon: Blue | Blue/black level 5 Digimon; alternate `[Aegiomon]` evolution cost 3; Blocker and Decode ([Aegiomon]); on play/when digivolving De-Digivolve 1 opposing Digimon, then if the controller has 3 or fewer security cards, unsuspend 1 own Digimon; inherited all-turn once-per-turn: when the controller's security stack is removed from, may unsuspend 1 own Shaman Digimon. Q6289 specifies security-effect and triggered-effect ordering. | **No card-specific causal mismatch found statically.** Both main trigger windows sequence De-Digivolve before the conditional own unsuspend, with the correct `<= 3` security boundary and controller scopes. The inherited watcher uses `whenSecurityRemoved`, `sourceFilter.controller: mine`, an optional Shaman target, and once-per-turn frequency. The shared security-removal gate maps `mine` to the watcher's owner seat, covering both checks and effect-driven removal. Blocker, Decode, alternate evolution, and exact target filters are present. | The colocated test is structural only; it does not execute De-Digivolve sequencing, the 3/4 security boundary, optional refusal, Shaman/non-Shaman selection, once-per-turn consumption, or Q6289 ordering. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-025

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-025` (Q6289).
- Direct module/test and shared `whenSecurityRemoved` routing were inspected. Security
  removal payloads identify `removedFromSecuritySeat`, and the dedicated gate correctly
  interprets `sourceFilter.controller: mine` relative to the watcher source owner.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-024 (Lekismon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-024 Lekismon | Blue level 4 Digimon; alternate level-3 `[TS]` evolution cost 2; on play/when digivolving draws 1; during your turn, when your Digimon is played or digivolves, if that Digimon is red, this Digimon may digivolve into `[Crescemon]` in hand with cost reduced by 1; inherited `[Jamming]`. Q6287 confirms non-red events still trigger the watcher but cannot activate it; Q6288 uses the post-digivolution Digimon. | **Causal IR gap.** The hand-authored watcher correctly listens to both events, applies the red post-event subject condition, targets Crescemon by name, and applies the reduction. However, both effect-driven `Digivolve` actions omit `payCost: true`. The interpreter treats omitted `payCost` as false, so the `reduceCost: 1` evolution is free rather than paid at the reduced cost. Draws, optionality, alternate requirement, and inherited Jamming are represented. | The colocated tests cover the watcher structure and live On Play draw, but do not assert memory payment or reduced-cost evolution. **Static diagnosis only; implementation correction and behavioral proof required.** |

### Static validation record for BT25-024

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-024` (Q6287 and Q6288).
- Direct module/test and shared `runDigivolve` semantics were inspected. Its `pays` flag is
  true only when `action.payCost === true` (or a numeric payCost is supplied), establishing
  that the missing property waives the reduced evolution payment.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-023 (Gaogamon)

| Card | Catalog and KB contract | Direct IR and mechanism diagnosis | Existing proof and status |
| --- | --- | --- | --- |
| BT25-023 Gaogamon | Blue level 4 Digimon; alternate level-3 `[DATA SQUAD]` evolution cost 2; on play and when digivolving, if the controller has 1 or fewer Tamers, they may play 1 `[Thomas H. Norstein]` from hand without paying its cost; inherited `[When Attacking] [Once Per Turn]` makes both players draw 1. Local card query has no entries. | **Causal filter mismatch.** The two play effects target a Tamer with `nameOrTrait: [{ tokens: ["Thomas H. Norstein"], match: "trait" }]`. In the committed catalog, the eligible BT25 Thomas H. Norstein cards have `nameEn: "Thomas H. Norstein"`; BT25-087's only type is `DATA SQUAD`, while BT4-093 and BT13-097 have no types. Therefore the trait-only filter cannot select the printed named card. The Tamer-count condition, optionality, free play, trigger windows, inherited draw actions, and alternate evolution requirement are otherwise represented. | The colocated test asserts the same incorrect trait matcher and inherited draw structure, so it cannot detect the named-card selection failure. **Static diagnosis only; implementation correction and behavioral proof required.** |

### Static validation record for BT25-023

- Catalog record read from `packages/shared/src/cards/data/cards.json`.
- Local query executed: `node tools/kb/query.mjs card BT25-023` (no entries).
- Direct module/test and shared `permanentCount` condition plus `nameOrTrait` matching were
  inspected. Catalog inspection confirmed the named Thomas cards do not expose
  `Thomas H. Norstein` as a trait, establishing the filter mismatch without running tests.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 was not rerun;
  all focused runs remain pending authorization.

## Static diagnosis: BT25-021 and BT25-023 through BT25-030

| Card | Contract and direct implementation diagnosis | Status |
| --- | --- | --- |
| BT25-021 Gaomon | On Play reveals 3, adds distinct Thomas H. Norstein/DATA SQUAD and Gaogamon-name cards, bottoms the rest; alternate Wanyamon or Lv.2 DATA SQUAD evolution; inherited once-per-turn attack draws for both players. IR matches filters, distinct RevealAdd slots, bottom remainder, requirements, and inherited trigger. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-023 Gaogamon | On Play/When Digivolving may play a Thomas H. Norstein trait Tamer from hand without cost if controller has at most 1 Tamer; inherited shared draw trigger. IR matches both windows, hand-only free play, condition, optionality, requirement, and inherited effect. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-024 Lekismon | On Play/When Digivolving draws; during own turn, red played/digivolved Digimon may free/discounted evolve this into Crescemon from hand; inherited Jamming. IR includes post-event red gate and both watcher windows. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-025 Aegiochusmon: Blue | Blocker/Decode; On Play/When Digivolving De-Digivolve 1 then, at 3 or fewer security, unsuspend own Digimon; inherited once-per-turn Shaman unsuspend when security removed. IR matches all clauses and Aegiomon alternate requirement. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-026 Crescemon | Trashes bottom 3 opponent evolution cards then restricts an opponent Digimon with none; red-event hand-to-trash Dianamon evolution; inherited your-turn attack-target lock. IR matches both windows, bottom ordering, no-source filter, post-event red gate, trash evolution, and inherited restriction. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-027 MachGaogamon | Once-per-turn shared When Digivolving/When Attacking may return opponent Lv.4 or lower, then trash Tamer source to unsuspend; self leave-play replacement and inherited Gaogamon/DATA SQUAD replacement. IR correctly shares activation key and replacement scopes. The unsuspend action is marked optional, although printed “Then, by trashing...” makes it a required follow-up after choosing the return (cost availability/fizzle semantics unresolved). | **Causal ambiguity/gap recorded; behavioral proof required.** |
| BT25-028 Dianamon | Play-cost reduction versus opponent Lv.6+; On Play/When Digivolving restricts opponent Digimon with at most 1 source then deletes unsuspended one; all-turn once-per-turn may trash any 4 opponent sources across Digimon and offer DNA evolution; inherited attack restriction. IR represents all clauses and scope. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-029 MirageGaogamon | Reboot/Blocker/Evade; shared once-per-turn return-and-paid lowest-level return; all-turn once-per-turn unsuspends after opponent hand-add or Tamer-source trash. IR matches keyword, filters, lowest-level selection, and shared trigger. As with BT25-027, the paid second return is marked optional despite printed “Then, by trashing...”, leaving follow-up payment semantics unresolved. | **Causal ambiguity/gap recorded; behavioral proof required.** |
| BT25-030 Elecmon | Start of own main phase may add top security for +1 memory; inherited once-per-turn attack may add top security, then Recovery +1 at zero security. IR matches costs, optionality, condition, requirement, and inherited trigger. | No card-specific causal mismatch found statically; structural proof only. |

### Static validation record for BT25-021 and BT25-023 through BT25-030

- Catalog records and local KB queries were inspected for every card in this range; no
  card-specific KB rulings were returned.
- Direct IR modules and relevant shared primitives were read. The only unresolved
  implementation concern is whether the post-return “Then, by trashing...” actions on
  BT25-027 and BT25-029 must be mandatory once the first optional return is accepted.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 rerun remains
  pending authorization.

## Static diagnosis: BT25-031 through BT25-033

Re-verification: BT25-033's mandatory security payment and DP reduction are now
represented without `optional`/`abortOnDecline`; behavioral proof remains
outstanding.

| Card | Contract and direct implementation diagnosis | Status |
| --- | --- | --- |
| BT25-033 Aegiomon | Yellow level 4 Digimon; alternate level-3 `[TS]` evolution cost 2; `Barrier`; on play/when digivolving, by adding your top security card to hand, an opponent's Digimon gets -5000 DP for the turn; inherited `Barrier`. | **Causal IR gap.** The cost, opponent-Digimon target, DP amount/duration, both trigger windows, alternate requirement, and both Barrier keywords are represented, but both actions are marked `optional: true` with `abortOnDecline: true`. The printed effect has no “may”; once the effect resolves and the player has security and an eligible target, adding the top security card and applying -5000 DP is mandatory. The current IR permits an unjustified refusal and does not model the mandatory cost/effect sequence. | Structural test only; no execution of mandatory payment, zero-security/targetless fizzle boundaries, DP change, trigger windows, Barrier, or evolution proof. **Static diagnosis only; implementation and behavioral proof required.** |
| BT25-032 Liollmon | Yellow level 3 Digimon; alternate level-2 `[Glowing Dawn]` evolution cost 0; on play reveals 3, adds 1 `[Glowing Dawn]` trait card and 1 yellow `[BEATBREAK]` trait card among them, then bottoms the rest; inherited `Barrier`. | **No card-specific causal mismatch found statically.** The two distinct RevealAdd slots, yellow color gate on BEATBREAK, Glowing Dawn filter, bottom-deck remainder, alternate requirement, and inherited Barrier are represented. The shared reveal implementation tracks taken card instances between slots. | Structural test only; no execution of distinct picks, overlap handling, bottom order, missing-slot behavior, alternate evolution, or inherited Barrier. **Static diagnosis only; behavioral proof required before 10/10.** |
| BT25-031 Patamon | Yellow level 3 Digimon; alternate level-2 `[TS]` evolution cost 0; on play reveals 3, adds 1 `[Angel]`, `[Archangel]`, `[Three Great Angels]`, or `[Four Great Dragons]` trait card and 1 `[TS]` trait card among them, then bottoms the rest; inherited `Barrier`. | **No card-specific causal mismatch found statically.** The two distinct RevealAdd slots, complete four-trait first filter, TS second filter, bottom-deck remainder, alternate requirement, and inherited Barrier are represented. The shared reveal implementation prevents the same physical revealed card from filling both slots. | Structural test only; no execution of trait-pool matching, distinct picks, overlap handling, bottom order, missing-slot behavior, alternate evolution, or inherited Barrier. **Static diagnosis only; behavioral proof required before 10/10.** |

### Static validation record for BT25-031 through BT25-033

- Catalog records and local KB queries were inspected for BT25-031, BT25-032, and BT25-033;
  no knowledge-base entries were returned.
- Direct `registerIrCard` modules and colocated structural tests were read one card at a time.
  Relevant shared paths inspected: RevealAdd distinct-slot tracking and bottom-deck remainder,
  security-to-hand cost handling, optional versus mandatory action semantics, target filtering,
  and effect-driven evolution requirements.
- No tests, typecheck, broad gate, or collection gate were run. BT25-004 rerun remains pending
  authorization.

## Static diagnosis: BT25-034 through BT25-049

| Card | Direct implementation diagnosis | Status |
| --- | --- | --- |
| BT25-034 | Ascension/Barrier, alternate TS evolution, and effect-trash-from-security optional hand play (level <=4 Angel/Iliad) are represented with the dedicated `OnDiscardSecurity` timing. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-035 | On Play/When Digivolving -3000 DP then optional free Glowing Dawn evolution, with the required cost of two bottom face-down cards under Tamers, and Barrier are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-036 | App Fusion names/cost, Security end-of-battle play, and On Play/When Digivolving security-to-hand followed by Recovery +1 are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-037 | Armor Purge, alternate Patamon/TS requirements, security-to-hand then optional top/bottom placement from the complete Angel-family/Iliad Digimon or TS Tamer pool are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-038 | Optional hand/security placement, DNA-only both-player security trash, and once-per-turn security-added De-Digivolve / security-removed -4000 DP effects are represented. Existing source comments document prior unconditional-trigger and stray-option fixes. | No new card-specific causal mismatch found statically; structural proof only. |
| BT25-039 | Security end-of-turn optional Ceresmon play with reduced cost and optional source placement, leave-play replacement, On Deletion security placement, opponent-turn attack redirection, and inherited Barrier are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-040 | Ascension, effect-trash security play, top/bottom security trash cost for -8000 DP, and all-turn once-per-turn security-removed -4000 DP are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-041 | Alliance, shared once-per-turn When Digivolving/When Attacking optional Glowing Dawn play/use with either security or Tamer-under-card cost, and End of Attack unsuspend cost are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-042 | On Play/When Digivolving/When Attacking once-per-turn effect grants protection from opponent effects until their turn ends after security cost; security-removal trigger plays Angel/Iliad and grants Reboot/Blocker to two Digimon. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-043 | Glowing Dawn color waiver, shared once-per-turn Recovery/most-security trash/unsuspend windows, leave-play replacement for Glowing Dawn, and dual Main -8000/-5000 DP effect are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-044 | Security-count play-cost reduction, On Play/When Digivolving placement of another Digimon then both-player security trash, and security-removal optional Angel/Iliad play are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-045 | Your-turn once-per-turn link-cost reduction for Social/Tool/Game and linked DP bonus are represented. | Potential shared optional-declaration/consumption caveat already documented for BT25-004; no new card-specific mismatch proven. Structural proof only. |
| BT25-046 | On Play distinct RevealAdd slots for Glowing Dawn and green BEATBREAK, bottom-deck remainder, and Piercing are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-047 | On Play distinct RevealAdd slots for Vegetation/Shaman and TS, bottom-deck remainder, and your-turn +1000 DP are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-048 | Your-turn TS evolution cost reduction, all-turn once-per-turn battle-win Draw 1, and alternate TS evolution are represented. | No card-specific causal mismatch found statically; structural proof only. |
| BT25-049 | On Play/When Digivolving optional opponent suspension, your-turn option-use reduction by bottom face-down Tamer card, and Piercing are represented. | No card-specific causal mismatch found statically; structural proof only. |

### Static validation record for BT25-034 through BT25-049

- Catalog records, direct `registerIrCard` modules, and colocated tests were inspected for each card in this range; local KB queries were consulted for applicable entries (including BT25-034/035 rulings).
- Relevant shared paths inspected included effect-only security discard timing, under-Tamer face-down costs, App Fusion, DNA security events, replacement effects, shared once-per-turn keys, RevealAdd distinct-slot handling, and link-cost reduction.
- No tests or collection gate were run per assignment. All cards remain structural/static evidence only and below 10/10 until focused behavioral proof is executed; BT25-004 rerun remains pending authorization.

## Static diagnosis: BT25-050 through BT25-103 (Luna queue)

| Cards | Direct implementation diagnosis | Status |
| --- | --- | --- |
| BT25-103 GraceNovamon; BT25-102 Factorial Area; BT25-101 Divine Arms Version Ω; BT25-100 Iron Slash | IR contains the printed keywords, security/main timing, TS filters, bottom-security replacement, return/deletion, and link/use costs. BT25-103's shared once-per-turn trash-sources/end-attack key and across-Digimon scope are explicitly represented. | No new card-specific mismatch found statically; structural proof only. |
| BT25-099 Gear Forest Village; BT25-098 Cyber Engage; BT25-097 Guardian Palace; BT25-096 Mirage Beast Knight; BT25-095 Paradise Colosseum; BT25-094 Cosmic Area; BT25-093 Ignition Flare | IR represents face-up-security color waivers, security grants, reveal/add/trash, delay, bottom-security replacement, reduced-cost plays, and optional linking. | No new card-specific mismatch found statically; structural proof only. |
| BT25-092 Asuna Shiroki; BT25-091 Monica Simmons; BT25-090 Tomoro Tenma; BT25-089 Kazuki & Itsuki; BT25-088 Kyo Sawashiro; BT25-087 Thomas H. Norstein; BT25-086 Dan Yuki | Tamer start/main/end-turn triggers, suspension costs, hand/evolution-card trash costs, face-down cards under Tamers, option-use/play/evolution reductions, app fusion, and attack restrictions are represented with the expected controller and once-per-turn scopes. | No new card-specific mismatch found statically; structural proof only. |
| BT25-085 BeelStarmon; BT25-084 Titamon; BT25-083 LadyDevimon; BT25-082 BlackGatomon; BT25-081 Fangmon; BT25-080 Witchmon; BT25-079 Hyemon; BT25-078 Gazimon | IR represents shared activation keys, option use/trash costs, highest/lowest DP filters, leave-play replacement, inherited effects, memory-gain restriction, and distinct reveal/add or bottom-evolution paths. | No new card-specific mismatch found statically; structural proof only. |
| BT25-077 Bacchusmon; BT25-076 Ghoulmon; BT25-075 Vulcanusmon; BT25-074 Tankdramon; BT25-073 Dragomon; BT25-072 Shutmon; BT25-071 Orochimon; BT25-070 Logamon | IR represents play-cost replacement/reduction, effect-play gates, link/de-digivolve, reveal/play and bottom-rest handling, App Fusion, and Digimon/Tamer restrictions. | No new card-specific mismatch found statically; structural proof only. |
| BT25-069 Raremon; BT25-068 Deltamon; BT25-067 Sealsdramon; BT25-066 Guardromon; BT25-065 Monodramon; BT25-064 ToyAgumon; BT25-063 Commandramon; BT25-062 Kokuwamon; BT25-061 Offmon; BT25-060 Rebootmon | IR represents TS/D-Brigade/ACCEL/Appmon requirements, link/deletion/de-digivolve/replacement effects, reveal filters, memory and draw effects, and inherited DP/keyword behavior. | No new card-specific mismatch found statically; structural proof only. |
| BT25-059 Ceresmon; BT25-058 Callismon; BT25-057 Monarchlizamon; BT25-056 Bootmon; BT25-055 Deramon; BT25-054 GreatGrizzlymon; BT25-053 Aegiochusmon: Green; BT25-052 Logimon; BT25-051 Grizzlymon; BT25-050 Kiwimon | IR represents suspended-Digimon cost reductions, protection/deletion scaling, battle and Fortitude/Vortex/Decode seams, App Fusion/linking, attack redirection, battle-win evolution, and TS/Shaman/Vegetation filters. | No new card-specific mismatch found statically; structural proof only. |

### Static validation record for BT25-050 through BT25-103

- Read the existing ledger first, then inspected catalog records, local KB queries, direct IR modules, and colocated tests newest-to-oldest. Local KB queries exposed no new card-specific ruling requiring a changed diagnosis in this range; BT25-103's existing ruling comments were reviewed.
- Relevant shared paths inspected included security replacement, reveal/add remainder handling, link and App Fusion, effect-driven evolution, once-per-turn shared keys, replacement effects, suspension/attack restrictions, and superlative DP/play-cost selection.
- No tests, typecheck, broad gate, or collection gate were run per assignment. All cards remain static/structural evidence only and below 10/10 pending focused behavioral proof. BT25-004 rerun remains pending authorization.

## Existing provenance: BT25-001 through BT25-003 and BT25-017 through BT25-020

| Card | Existing evidence and remaining status |
| --- | --- |
| BT25-001 | Commit `60c0b021e` added focused behavioral scenarios for the TS-host attack draw watcher, including once-per-turn repetition and a non-TS host rejection. The tests have not been run in this reconciliation; no passing result is inferred. **Evidence recorded; below 10/10 pending execution.** |
| BT25-002 | Commit `60c0b021e` added focused behavioral scenarios for the DATA SQUAD Tamer draw watcher, covering both-player once-per-turn behavior and opponent-Tamer gating. The tests have not been run in this reconciliation; no passing result is inferred. **Evidence recorded; below 10/10 pending execution.** |
| BT25-003 | Commit `60c0b021e` added focused behavioral scenarios for security trash plus reduced-cost Glowing Dawn evolution and optional decline, and corrected the reduced-cost payment path. The tests have not been run in this reconciliation; no passing result is inferred. **Evidence recorded; below 10/10 pending execution.** |
| BT25-017 | Commit `00402168f` added focused assertions for the self-attack/hand-trash deletion sequence, blue-event Apollomon gating, and inherited Security Attack +1. The colocated tests are evidence only; no passing result is available here. **Below 10/10 pending execution.** |
| BT25-018 | Commit `35cb04612` added focused assertions for conditional play-cost reduction, DP scaling/deletion, end-turn DNA/attack sequencing, and inherited deletion. The colocated tests are evidence only; no passing result is available here. **Below 10/10 pending execution.** |
| BT25-019 | Commit `fcf10b654` ported UltimateBrachiomon to `registerIrCard`-only behavior and added assertions for highest-DP deletion, memory-gated immunity, and opponent source/effect scope. The assertions are structural and have not been run here. **Below 10/10 pending execution.** |
| BT25-020 | Commits `0dee6f398`, `69394057d`, and `f30e6767e` preserve the compiled IR port, engine repair, and focused Marsmon watcher fixture. The colocated tests assert installation and `whenBattleWon` subscription but have not been run here. **Below 10/10 pending execution.** |

### Provenance reconciliation record

- Entries above were reconstructed from existing card tests and commit history only; no implementation, test, typecheck, or collection-gate changes were made.
- These entries do not promote any card to 10/10. Focused execution and reproducible green evidence remain required.
