# BT7 Card Implementation Audit

This ledger records static audits performed in newest-to-oldest order. Behavioral tests and broad gates are intentionally not claimed unless explicitly run.

## BT7-111 — Lucemon: Chaos Mode — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `packages/shared/src/cards/data/cards.json` identifies BT7-111 as a Purple level 5 Ultimate Digimon, play cost 14, 12000 DP, with Demon Lord/Seven Great Demon Lords traits and no printed standard evolution recipe.
2. **Alternate evolution (1/1):** The direct IR declares an alternate hand evolution from a named `Lucemon` at memory cost 7, marked `isAlternate: true` and `sourceZones: ["hand"]`, matching the printed “Your [Lucemon] can digivolve into this card in your hand for a memory cost of 7, ignoring this card's digivolution requirements.”
3. **Trash scaling (1/1):** The static `wouldBePlayed` replacement reduces hand play cost by 3 for every 10 cards in the owner's trash, with `zone: "trash"`, `controller: "mine"`, and `unit: "trash"`.
4. **On Play target branches (1/1):** The On Play delete uses separate opponent Tamer and opponent level-6-or-lower Digimon branches, avoiding the common flattened-filter bug that excludes Tamers due to their absent level.
5. **When Digivolving target branches (1/1):** The When Digivolving delete mirrors the same two correctly separated opponent target branches.
6. **Count and optionality (1/1):** Each delete action has `count: 1`; the printed effect does not say “up to” or “may,” so no optional flag is introduced.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-111` returns Q1678/Q1679 timing and alternate-evolution rulings plus Q4999/Q5002/Q5041 trash-evolution boundaries. No unresolved ambiguity was surfaced.
8. **Direct IR and registration (1/1):** `apps/api/src/cards/BT7/BT7-111.ts` declares `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-111", compiled)` registration; no legacy `registerCard` call is present.
9. **Shared primitive trace (1/1):** The replacement, split OR-target representation, alternate evolution requirement, and trigger declarations are supported by the compiled interpreter schema and align with the adjacent BT7 target-branch repair.
10. **Reproducible behavioral proof (0/1):** The colocated test only proves deleting an opponent Tamer on play. It does not yet prove the alternate Lucemon evolution path, level-6 boundary, trash-count cost reductions, When Digivolving path, or negative target boundaries. Per audit scope, no tests were run or added in this pass.

### Evidence

```text
node tools/kb/query.mjs card BT7-111
rg -n 'BT7-111' packages/shared/src/cards/data/cards.json
rg -n 'register(Card|IrCard)\\(' apps/api/src/cards/BT7/BT7-111.ts
```

Remaining work is behavioral proof for the clauses listed in item 10; this card is not formally complete at 10/10.

## BT7-110 — Evolution Ancient — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a White Option with play cost 0 and the printed Hybrid color-waiver, level-4-to-Ten-Warriors evolution, and Security add-to-owner-hand text.
2. **Hybrid color waiver (1/1):** The Static `WaiveColorRequirement` is conditioned on a controller-owned battle-area Digimon carrying the `Hybrid` trait, matching Q1677's battle-area ruling.
3. **Main source target (1/1):** The Main `Digivolve` action selects exactly one of the owner's level-4 Digimon.
4. **Evolution target and zone (1/1):** The destination is one Digimon in hand with the `Ten Warriors` trait; `from: ["hand"]` is explicit.
5. **Color and level boundaries (1/1):** `colorsMatchDigivolvingSource: true` enforces matching colors while `ignoreLevelRequirement: true` bypasses only the destination level requirement.
6. **Cost and Security (1/1):** `payCost: true` pays the destination's printed evolution cost, and Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-110` returns Q1677; no unresolved ambiguity is surfaced.
8. **Direct IR and registration (1/1):** The module is `coverage: "full"`, has no residual clauses, and has exactly one `registerIrCard("BT7-110", compiled)` registration.
9. **Static primitive trace (1/1):** The waiver condition, level-4 selector, trait selector, source zone, color match, level bypass, and paid evolution are all represented by explicit compiled fields.
10. **Reproducible behavioral proof (0/1):** A colocated suite exists for same-color evolution and off-color rejection, but it was not executed in this static-only pass; waiver behavior and Security recovery are not directly covered there.

Remaining work is execution of the focused suite plus Hybrid waiver and Security boundary proof; this card is not formally complete at 10/10.

## BT7-109 — Dead or Alive — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option, play cost 8, with the printed trash-play Main effect, 10-card alternative, and Security activation.
2. **Default play branch (1/1):** The first compiled action plays exactly one owner Purple level-5 Digimon from `trash` without paying its memory cost.
3. **Alternative filter (1/1):** The alternative selects exactly one owner Digimon with `Lucemon` in its name from `trash`, matching the printed name condition.
4. **Threshold (1/1):** The alternative is conditioned on the owner's trash count being greater than or equal to 10.
5. **Optionality and instead semantics (1/1):** The alternative is explicitly `optional: true` and `instead: true`, preserving the ruling that the normal level-5 branch remains available when the optional alternative is declined.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-109` returns Q1676, confirming the 10+ trash alternative does not remove the ability to choose the ordinary Purple level-5 play.
8. **Direct IR and registration (1/1):** The module has `coverage: "full"`, an empty residual list, and exactly one `registerIrCard("BT7-109", compiled)` registration.
9. **Static primitive trace (1/1):** Both actions use explicit `from: ["trash"]`, `payCost: false`, controller ownership, exact count, and the threshold/name/level/color filters required by the card text.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only the ordinary Purple level-5 play and was not executed in this static-only pass; the 10-card optional choice, decline fallback, and Security path remain unproven.

Remaining work is behavioral proof of the alternative and fallback branches plus Security activation; this card is not formally complete at 10/10.

## BT7-108 — Schwarz Lehrsatz — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies BT7-108 as a Purple Option costing 6 with the Hybrid/Tamer scaling deletion and Security Main activation.
2. **Main timing and recipient (1/1):** The compiled Main effect deletes opposing Digimon only.
3. **Level boundary (1/1):** The deletion target is explicitly an opponent Digimon with level `lte 5`.
4. **Scaling population (1/1):** Scaling counts owner battle-area cards from the union of Hybrid-trait Digimon and Tamers.
5. **Pairing ruling (1/1):** The single scaling population produces one deletion per qualifying card, not one per Hybrid/Tamer pair, matching Q1675.
6. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-108` returns Q1675, with no unresolved ambiguity.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, an empty residual list, and exactly one `registerIrCard("BT7-108", compiled)` registration.
9. **Static primitive trace (1/1):** The target controller/kind/level filter, battle-area scaling zone, Hybrid trait branch, Tamer branch, and unit `cards` are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only a basic deletion and was not executed in this static-only pass; multi-source scaling, exact level boundary, mixed trait population, and Security behavior remain unproven.

Remaining work is behavioral proof of Q1675 scaling and all applicable boundaries; this card is not formally complete at 10/10.

## BT7-107 — Calling From the Darkness — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Purple Option costing 1 with Main deletion/recovery text and Security add-to-owner-hand text.
2. **Deletion (1/1):** Main first deletes exactly one of the owner's Digimon, with no accidental color or level restriction.
3. **Recovery filter (1/1):** The second action returns up to two owner Purple Digimon cards from trash to hand.
4. **Ordering and self-return (1/1):** Delete precedes Return, allowing the deleted Purple Digimon to be selected from trash as confirmed by Q1673.
5. **Up-to and destination (1/1):** `count: 2`, `upTo: true`, and `to: "hand"` encode the printed upper bound and destination.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Rules evidence (1/1):** The KB returns Q1673/Q1674 and linked-card rulings Q5615/Q5643/Q5648, plus the restriction to one copy since 2022-11-11. The pending On Deletion behavior is delegated to shared zone/event handling; no card-local approximation is present.
8. **Direct IR and registration (1/1):** The module is full compiled IR with no residuals and exactly one `registerIrCard("BT7-107", compiled)` registration.
9. **Static primitive trace (1/1):** Controller, kind, Purple color, trash zone, count, ordering, and destination are explicit.
10. **Reproducible behavioral proof (0/1):** The colocated test covers only one ordinary delete-and-return case and was not executed in this static-only pass; up-to-zero, non-Purple exclusion, On Deletion pending behavior, and Security recovery remain unproven.

Remaining work is behavioral proof of the Q1673/Q1674 boundaries and the current restriction's deck-validation integration; this card is not formally complete at 10/10.

## BT7-106 — Brave Metal — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 5 with the ordinary play-cost deletion, conditional alternative, and Security Main activation.
2. **Ordinary target (1/1):** Modal option one deletes exactly one opponent Digimon with play cost 6 or less.
3. **Loaded condition (1/1):** The alternative requires an owner battle-area Digimon with at least five digivolution cards and the `X-Antibody` trait.
4. **Alternative target (1/1):** Option two deletes exactly one opponent Digimon whose `X-Antibody` trait is negated, with no play-cost ceiling, matching the printed “instead.”
5. **Optionality and replacement (1/1):** The alternative is represented as a modal choice with `choose: 1`, conditionally offered only when loaded, and the second branch replaces the ordinary branch.
6. **Security behavior (1/1):** Security reuses the same Main modal effect through `isSecurity: true` and does not duplicate divergent logic.
7. **Knowledge base (1/1):** The KB returns Q1671/Q1672, confirming the ordinary low-cost target remains legal regardless of loaded status and the alternative permits higher-cost non-X targets.
8. **Direct IR and registration (1/1):** The module has full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-106", compiled)` registration.
9. **Static primitive trace (1/1):** Digivolution-card count, trait condition, play-cost upper bound, negated trait filter, controller, count, modal choice, and replacement semantics are explicit.
10. **Reproducible behavioral proof (0/1):** Existing tests cover the ordinary and loaded alternative paths but were not executed in this static-only pass; exact boundaries, refusal, Security, and mixed X/non-X target pools remain unproven here.

Remaining work is behavioral proof of Q1671/Q1672 boundaries and modal/Security behavior; this card is not formally complete at 10/10.

## BT7-105 — Pride Memory Boost! — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 4 with reveal/play/trash, Delay, and Security placement text.
2. **Reveal and play (1/1):** Main reveals 3 cards and optionally plays one owner Black Digimon with play cost 4 or less without memory cost.
3. **Remaining cards (1/1):** `rest: "trash"` sends all unrecruited revealed cards to trash, including when no eligible card is played, matching Q1670.
4. **Placement (1/1):** Main places this card in its battle area after the reveal sequence; Security places it in its owner's battle area.
5. **Delay (1/1):** A separate Main effect with `Delay` gains 2 memory; the engine's Delay lifecycle supplies trash-as-cost and same-turn activation prevention as documented in the module.
6. **Knowledge base (1/1):** The KB returns Q1670, confirming placement is independent of whether an eligible revealed Digimon is played.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-105", compiled)` registration are present.
8. **Static primitive trace (1/1):** Reveal count, Black filter, play-cost ceiling, optional play, free cost, rest destination, self-placement, Delay keyword, and Security placement are explicit.
9. **Ordering and ownership (1/1):** The reveal action precedes self-placement, and all card movement uses owner/controller defaults consistent with the printed text.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; no proof is claimed for no-eligible/no-play trash handling, exact reveal boundaries, Delay timing, or Security placement.

Remaining work is behavioral proof of Q1670 and Delay/Security lifecycle boundaries; this card is not formally complete at 10/10.

## BT7-104 — Metal Cannon — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Black Option costing 2 with X-Antibody selection, draw scaling, and Security return-to-hand text.
2. **Selection (1/1):** Main selects exactly one owner Digimon carrying the `X-Antibody` trait and binds that choice.
3. **Scaling source (1/1):** Draw amount is one per digivolution card of the chosen Digimon, using the bound reference rather than a later or global source.
4. **Draw and Security (1/1):** The action draws from the owner's deck; Security uses `AddToHandSelf`.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-104` reports no rulings, errata, restrictions, or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-104", compiled)` registration are present.
7. **Static primitive trace (1/1):** Trait filter, owner controller, exact selection count, bind identity, per-card unit, and digivolution-card scaling are explicit.
8. **Reference fidelity (1/1):** `boundRef: "xAntibodyTarget"` ensures the draw count remains tied to the selected Digimon through effect resolution.
9. **Clause completeness (1/1):** All printed Main and Security clauses have direct IR representations; no optionality or duration clause is omitted.
10. **Reproducible behavioral proof (0/1):** A colocated test exists but was not executed in this static-only pass; zero-source, multi-source, non-X rejection, deck-boundary, and Security behavior remain unproven.

Remaining work is behavioral proof of selection and exact draw boundaries; this card is not formally complete at 10/10.

## BT7-103 — Mugen — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 4 with Main suspend/restriction and Security suspend text.
2. **Main suspend (1/1):** The Main effect suspends exactly one opponent Digimon.
3. **Restriction duration (1/1):** The restriction uses `unsuspend` through the opponent's next unsuspend phase (`untilOpponentTurnEnd`).
4. **Security behavior (1/1):** Security suspends exactly one opponent Digimon.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-103` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-103", compiled)` registration are present.
7. **Static primitive trace (1/1):** Controller, Digimon kind, exact count, restriction type, and duration are explicit.
8. **Target identity fidelity (0/1):** The printed text says “That Digimon,” but the Restrict action has an independent opponent-Digimon selector rather than a bound reference to the Digimon suspended by the preceding action. Unless the shared sequential target semantics implicitly preserve identity (not established statically), the restriction can select a different Digimon.
9. **Clause completeness (1/1):** Both Main and Security clauses are represented, subject to the identity concern above.
10. **Reproducible behavioral proof (0/1):** Existing tests were not executed in this static-only pass; same-target enforcement, duration, and Security boundaries remain unproven.

Remaining work is to bind the suspended target into the Restrict action (or establish an engine guarantee that sequential selectors preserve it), then add behavioral proof. This card is not formally complete at 10/10.

## BT7-102 — Dino Memory Boost! — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 3 with Main suspend→placement, Delay gain-2-memory, and Security placement.
2. **Main suspend and ordering (1/1):** Main suspends exactly one opponent Digimon, then places this card in its battle area.
3. **Delay lifecycle (1/1):** The Delay branch deletes this card from its battle area before gaining 2 memory and is marked with the Delay keyword.
4. **Security behavior (1/1):** Security places this card in its owner's battle area.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-102` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-102", compiled)` registration are present.
7. **Static primitive trace (1/1):** Opponent Digimon filter, exact count, self-placement, self-delete, gain amount, and Delay keyword are explicit.
8. **Clause completeness (1/1):** All printed Main, Delay, and Security clauses map to direct actions.
9. **Shared-use identity (1/1):** The Delay branch uses a stable `sharedUseKey`, preserving the once-per-card activation identity expected by the engine's Delay lifecycle.
10. **Reproducible behavioral proof (0/1):** No test was executed in this static-only pass; suspend ordering, placement, same-turn Delay lockout, memory gain, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the Main/Delay/Security lifecycle; this card is not formally complete at 10/10.

## BT7-091 — Koichi Kimura — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** Purple level-3 Tamer costing 3 with On Play draw-1 then trash-1, inherited On Deletion gain-1-memory, and Security self-play.
2. **On Play ordering (1/1):** IR draws one card, then trashes exactly one owner hand card.
3. **Inherited effect (1/1):** The On Deletion gain-1-memory trigger is marked `isInherited: true`.
4. **Security behavior (1/1):** Security plays this card without cost using a self-reference target.
5. **Rules evidence (1/1):** Q1665 confirms the inherited effect becomes usable when a Digimon legally digivolves onto this Tamer; the module marks it inherited rather than active as a standalone Tamer.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-091` returns Q1665 with no unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-091", compiled)` registration are present.
8. **Static primitive trace (1/1):** Draw amount, owner hand zone, trash count, gain amount, inherited timing, self-target, and free Security play are explicit.
9. **Clause completeness (1/1):** On Play, inherited, and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; hand-size edge cases, inherited stack activation, and Security play remain unproven.

Remaining work is behavioral proof of Q1665's evolution-stack boundary and On Play/Security ordering; this card is not formally complete at 10/10.

## BT7-101 — Thunder Laser — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Green Option costing 1 whose Main effect conditionally suspends one opposing Digimon and whose Security effect returns this card to its owner's hand.
2. **Condition (1/1):** Main suspension is gated by an owner battle-area Digimon carrying either `Hybrid` or `Ten Warriors`.
3. **Target (1/1):** The action selects exactly one opponent Digimon.
4. **No-target ruling (1/1):** The condition is on the action rather than card use, preserving Q1669's ruling that the Option can be used with no qualifying Digimon and simply has no effect.
5. **Security behavior (1/1):** Security uses `AddToHandSelf`.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-101` returns Q1669; no unresolved ambiguity is surfaced.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-101", compiled)` registration are present.
8. **Static primitive trace (1/1):** Battle-area zone, owner controller, OR trait tokens, opponent controller, Digimon kind, and exact target count are explicit.
9. **Clause completeness (1/1):** Main and Security text map directly to compiled effects without omitted duration or optionality clauses.
10. **Reproducible behavioral proof (0/1):** No test was executed in this static-only pass; qualifying/non-qualifying trait, no-target use, suspension, and Security return remain unproven.

Remaining work is focused proof of Q1669's no-target boundary and trait matching; this card is not formally complete at 10/10.

## BT7-100 — Qualialise Blast — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option with variable hand-use cost, -3000 DP Main effect, Rasenmon Security Attack +1 grant, and Security return-to-hand.
2. **Variable cost (0/1):** The IR models the hand cost from security count but includes `floor: 1`; Q1667 explicitly confirms an empty security stack makes the cost 0, so this floor is a likely fidelity bug.
3. **DP effect (1/1):** Main selects one opponent Digimon and applies -3000 DP for the turn.
4. **Rasenmon effect (1/1):** Main then selects one owner Digimon with `Rasenmon` in its name and grants Security Attack +1 for the turn.
5. **Timing/ruling boundary (1/1):** The grant targets a Rasenmon already in play; Q1668 confirms a Rasenmon played later cannot receive it.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** The KB returns Q1501, Q1667, and Q1668; no ambiguity is surfaced beyond the cost-floor discrepancy.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-100", compiled)` registration are present.
9. **Static primitive trace (1/1):** Security scaling, opponent target, Rasenmon name filter, amounts, and turn durations are explicit.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; empty-security cost, exact turn duration, target boundaries, and Q1668 timing remain unproven.

Required follow-up: remove or justify the `floor: 1` cost clamp so an empty security stack can produce cost 0, then add behavioral proof. This card is not formally complete at 10/10.

## BT7-099 — Electric Rush — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option costing 2 with Main +3000 DP and conditional unsuspend effects, plus Security return-to-hand.
2. **DP effect (1/1):** Main grants exactly one owner Digimon +3000 DP for the turn.
3. **Security-count condition (1/1):** The unsuspend branch requires exactly three cards in the owner's security stack.
4. **Unsuspend target (1/1):** The branch unsuspends exactly one owner Digimon.
5. **Ordering and duration (1/1):** The +3000 action precedes unsuspend, and the modifier uses `forTheTurn`.
6. **Security behavior (1/1):** Security uses `AddToHandSelf`.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-099` reports no rulings or unresolved ambiguity.
8. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-099", compiled)` registration are present.
9. **Static primitive trace (1/1):** Owner controller, Digimon kind, exact counts, security zone, exact equality, amount, and duration are explicit.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; exact three-security boundary, target selection, duration, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the conditional boundary and turn duration; this card is not formally complete at 10/10.

## BT7-098 — Ultra Turbulence — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** `cards.json` identifies a Yellow Option costing 2 whose Main effect gives one opposing Digimon and all opposing Security Digimon -3000 DP for the turn.
2. **Battle-area target (1/1):** The first Main action modifies exactly one opponent Digimon by -3000.
3. **Security Digimon population (1/1):** The second Main action uses `ModifySecurityDP` for all opponent Security Digimon, preserving the printed “all” scope.
4. **Duration and Security (1/1):** Both modifiers use `forTheTurn`; Security returns this card to its owner's hand.
5. **Q&A boundary (1/1):** Q1666 confirms reducing a Security Digimon to 0 DP does not delete it outside a battle; the module applies only a DP modifier and does not invent deletion.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-098` returns Q1666 with no unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-098", compiled)` registration are present.
8. **Static primitive trace (1/1):** Opponent controller, Digimon kind, exact single target, all-security population, amount, and duration are explicit.
9. **Clause completeness (1/1):** The hand-authored compiled override explicitly restores the Security Digimon clause that a prior declarative form omitted.
10. **Reproducible behavioral proof (0/1):** Existing tests cover only the ordinary battle-area modifier and were not executed in this static-only pass; Security Digimon scope, duration, and Q1666 battle boundary remain unproven.

Remaining work is behavioral proof of the all-Security-Digimon modifier and Q1666 interaction; this card is not formally complete at 10/10.

## BT7-097 — Tidal Wave — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** BT7-097 is an Option whose Main and Security text play up to two Digimon cards from one of the owner's Digimon's digivolution cards without paying memory costs.
2. **Source zone and free play (1/1):** IR explicitly uses `from: ["digivolutionCards"]`, `upTo: true`, `count: 2`, and `payCost: false`.
3. **Unsuspended result (1/1):** `suspended: false` matches the expected played state.
4. **Controller/kind (1/1):** Only owner Digimon cards on owner-controlled Digimon stacks are eligible.
5. **Security reuse (1/1):** Security activates the same play payload.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-097` reports no rulings or unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-097", compiled)` registration are present.
8. **Single-stack fidelity (0/1):** The target filter constrains each card with `hostFilter` but does not bind one selected host before selecting up to two cards. Statically, this does not prove that cards cannot be mixed across two evolution stacks, contrary to “from one of your Digimon's digivolution cards.”
9. **Clause completeness (1/1):** Main/Security timing, count, source, cost, and suspension clauses are represented, subject to the stack-origin concern.
10. **Reproducible behavioral proof (0/1):** Existing tests cover two cards from one stack and zero selection but were not executed; mixed-stack exclusion and Security behavior remain unproven.

Required follow-up: bind the chosen host stack (or establish an engine guarantee for `hostFilter`) before selecting cards, then add a mixed-stack behavioral proof. This card is not formally complete at 10/10.

## BT7-096 — Starlight Velocity — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** Blue Option costing 3; Main plays one Tamer or Hybrid Digimon from one owner's evolution stack, and Security optionally plays Koji Minamoto from hand/trash.
2. **Main source/filter (1/1):** IR selects one owner Hybrid Digimon/Tamer from `digivolutionCards`, plays without cost, and marks the Main choice optional.
3. **Security source/filter (1/1):** Security optionally plays one named Koji Minamoto from hand or trash without cost.
4. **Registration/coverage (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-096", compiled)` registration are present.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-096` reports no rulings or unresolved ambiguity.
6. **Static primitive trace (1/1):** Controller, source zones, Hybrid trait/name filters, optionality, count, and free-play cost are explicit.
7. **Transformation clause (1/1):** The target kind union represents the printed “as a Tamer or another Digimon” destination choice through the shared play primitive.
8. **Single-stack fidelity (0/1):** As with BT7-097, no bound host reference is visible before selecting from `digivolutionCards`; static IR does not prove the Main card cannot combine cards across multiple evolution stacks.
9. **Security completeness (1/1):** Security uses the exact hand/trash source pair and Koji name condition, with no unintended Main payload reuse.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; single-stack selection, destination transformation, optional decline, and Security boundaries remain unproven.

Required follow-up: bind one chosen host stack (or establish the engine guarantee), then add behavioral proof for both Main and Security branches. This card is not formally complete at 10/10.

## BT7-095 — Blue Hawaii Death — 8/10 (static audit; fidelity finding)

### Clause-by-clause score

1. **Catalog identity (1/1):** Blue Option costing 2; Main gives one owner Digimon +3000 DP and the ability to attack an opponent's unsuspended Digimon without digivolution cards for the turn; Security returns this card to hand.
2. **DP modifier (1/1):** Main applies +3000 for the turn to exactly one owner Digimon.
3. **Attack permission (1/1):** Main grants the unsuspended-opponent attack permission for the turn and sets `noDigivolutionCards: true`.
4. **Security behavior (1/1):** Security uses `AddToHandSelf`.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-095` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-095", compiled)` registration are present.
7. **Static primitive trace (1/1):** Owner Digimon filters, exact counts, amount, duration, and no-digivolution-card restriction are explicit.
8. **Same-target fidelity (0/1):** The printed text applies both effects to “1 of your Digimon,” but the two actions independently select one Digimon; no bound reference proves they must be the same permanent.
9. **Clause completeness (1/1):** Main and Security clauses are represented, subject to same-target identity.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; same-target enforcement, attack eligibility, duration, and Security behavior remain unproven.

Required follow-up: bind the first selected Digimon for the second modifier (or establish sequential same-target semantics), then add behavioral proof. This card is not formally complete at 10/10.

## BT7-094 — Giga Storm — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 7 with Main deletion of up to two opposing Digimon at 8000 DP or less and Security Main activation.
2. **Target controller/kind (1/1):** The target is restricted to opponent Digimon.
3. **DP boundary (1/1):** `dp: { op: "lte", value: 8000 }` matches the printed upper bound.
4. **Count/optionality (1/1):** `count: 2` with `upTo: true` permits zero, one, or two targets.
5. **Security behavior (1/1):** Security uses `ActivateMain` and is marked as a Security effect.
6. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-094` reports no rulings or unresolved ambiguity.
7. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-094", compiled)` registration are present.
8. **Static primitive trace (1/1):** Opponent controller, Digimon kind, DP comparison, exact maximum, and up-to semantics are explicit.
9. **Clause completeness (1/1):** All printed Main and Security clauses map directly to compiled effects.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; zero/one/two target choices, exact 8000 boundary, and Security activation remain unproven.

Remaining work is focused behavioral proof of the DP boundary and up-to count; this card is not formally complete at 10/10.

## BT7-093 — Firedrake Strike — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 4; Main chooses an owner Hybrid Digimon then deletes one opposing Digimon with DP no greater than the chosen Digimon's DP; Security optionally plays Takuya Kanbara from hand or trash for free.
2. **Source selection (1/1):** `SelectBind` chooses exactly one owner Digimon with the Hybrid trait.
3. **Relative DP target (1/1):** The deletion target is one opponent Digimon with `relativeTo` the bound selection's DP using `lte`.
4. **Security behavior (1/1):** Security optionally plays one named Takuya Kanbara from hand or trash without cost.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-093` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-093", compiled)` registration are present.
7. **Static primitive trace (1/1):** Hybrid filter, owner/opponent controllers, bound selection identity, DP comparison, source zones, optionality, and free play are explicit.
8. **Clause completeness (1/1):** Main and Security clauses are fully represented with correct sequencing and count.
9. **Reference fidelity (1/1):** `selectionRef: "selected"` ensures the deletion threshold is computed from the chosen Digimon rather than a global or reselected source.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; exact equal-DP boundary, smaller/larger targets, Hybrid exclusion, and Security optional play remain unproven.

Remaining work is focused behavioral proof of the relative DP boundary and Security branch; this card is not formally complete at 10/10.

## BT7-092 — Flame Memory Boost! — 9/10 (static audit)

### Clause-by-clause score

1. **Catalog identity (1/1):** Red Option costing 3 with Main Security Attack +1, battle-area placement, Delay gain of 2 memory, and Security placement.
2. **Main effect (1/1):** Exactly one owner Digimon gains Security Attack +1 for the turn, then this card is placed in its battle area.
3. **Delay lifecycle (1/1):** Delay trashes this card from its battle area, then gains 2 memory.
4. **Security behavior (1/1):** Security places this card in its owner's battle area.
5. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT7-092` reports no rulings or unresolved ambiguity.
6. **Direct IR and registration (1/1):** Full compiled coverage, empty residuals, and exactly one `registerIrCard("BT7-092", compiled)` registration are present.
7. **Static primitive trace (1/1):** Owner Digimon filter, exact count, keyword amount, turn duration, self-placement, self-trash, gain amount, and Delay keyword are explicit.
8. **Ordering (1/1):** The keyword grant precedes Main placement; Delay deletion precedes memory gain.
9. **Clause completeness (1/1):** Main, Delay, and Security clauses map directly to compiled effects without omitted text.
10. **Reproducible behavioral proof (0/1):** No tests were run in this static-only pass; target selection, placement, same-turn Delay lockout, memory gain, and Security behavior remain unproven.

Remaining work is focused behavioral proof of the Main/Delay/Security lifecycle; this card is not formally complete at 10/10.
