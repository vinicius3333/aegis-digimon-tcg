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
