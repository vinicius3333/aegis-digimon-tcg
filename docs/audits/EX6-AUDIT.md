# EX6 Card Implementation Audit

This ledger is the evidence record for the EX6-001 through EX6-074 audit. It is
maintained in card-ID order. A `10/10` assessment requires the exact catalog
contract, any local knowledge-base evidence, direct compiled IR, shared runtime
seams, and observable behavioral evidence; structural assertions alone do not
establish behavioral proof.

## Current closeout — 2026-09-04

- Focused inventory: all 74 colocated EX6 test files are green. The 361 source
  declarations expand to 365 runtime cases through parameterized tests. The
  final exact collection gate passed 74/74 files and 365/365 tests in serial
  mode with one fork.
- Every card below is assessed `runtime 10/10` from its focused public-runtime
  evidence, direct module, catalog, and KB review. Per-card declaration counts
  are listed in the compact inventory below.
- The final static recount found 74 unique catalog IDs (`EX6-001` through
  `EX6-074`), 74 direct modules, 74 colocated test files, 74 exact
  `registerIrCard` registrations, and zero legacy `registerCard` registrations.
- Optimized mechanism gates passed 8 files and 30 relevant tests. The final
  effects check found 74 fully covered, residual-free EX6 records already
  synchronized: 63 semantic changes against `origin/main`, with zero semantic
  or byte changes outside EX6.
- Full shared/web typechecking passed before the API-only findings were fixed;
  the corrected API typecheck then passed twice. Shared, API, and web production
  builds passed. Changed TypeScript scope is lint- and format-clean, the ledger
  is format-clean, and `git diff --check` is clean.
- Key late closeout commits include `44a73a004`, `7d9152951`, `f652b5864`,
  `39468e7a4`, and `ac27b48ef`. Both independent final rereviews report zero
  Critical, Important, or Minor findings and `Ready: yes`. Branch push remains
  pending; this ledger does not claim a pushed branch yet.

Focused declaration inventory (recounted from `^\s*(it|test)\(`):

```text
EX6-001=2  EX6-002=3  EX6-003=3  EX6-004=4  EX6-005=3  EX6-006=5
EX6-007=4  EX6-008=5  EX6-009=5  EX6-010=13 EX6-011=6 EX6-012=2
EX6-013=4  EX6-014=4  EX6-015=4  EX6-016=4  EX6-017=6 EX6-018=9
EX6-019=3  EX6-020=6  EX6-021=4  EX6-022=4  EX6-023=8 EX6-024=12
EX6-025=10 EX6-026=11 EX6-027=4 EX6-028=6 EX6-029=8 EX6-030=7
EX6-031=8  EX6-032=6  EX6-033=3  EX6-034=7 EX6-035=8 EX6-036=4
EX6-037=9  EX6-038=5  EX6-039=5  EX6-040=5 EX6-041=4 EX6-042=4
EX6-043=4  EX6-044=5 EX6-045=4 EX6-046=4 EX6-047=4 EX6-048=4
EX6-049=4  EX6-050=4 EX6-051=4 EX6-052=3 EX6-053=3 EX6-054=3
EX6-055=5  EX6-056=3 EX6-057=3 EX6-058=3 EX6-059=3 EX6-060=4
EX6-061=5  EX6-062=3 EX6-063=2 EX6-064=3 EX6-065=5 EX6-066=4
EX6-067=4  EX6-068=5 EX6-069=5 EX6-070=4 EX6-071=2 EX6-072=4
EX6-073=5  EX6-074=6
```

## EX6-001 — Sakuttomon — runtime verified

- Catalog evidence: Red level-2 Digi-Egg, form `In-Training`, attribute `Data`, traits `Weapon` and `Legend-Arms`. Its `[Your Turn] [Once Per Turn]` gains 1 memory when an effect places a `Legend-Arms` card beneath this Digimon.
- Knowledge base: no EX6-001-specific local ruling is recorded.
- Direct IR: [`EX6-001.ts`](apps/api/src/cards/EX6/EX6-001.ts) declares an inherited `YourTurn` once-per-turn `SubTrigger` for `onAddDigivolutionCards`, requires the event subject to be the exact host and the added card to have `Legend-Arms`, then resolves `GainMemory(1)`. Coverage is full, residual text is empty, and the module registers exclusively through `registerIrCard("EX6-001", compiled)`.
- Shared primitive trace: `placeUnder` emits the added-card event after stack placement; `subTrigger.ts` enforces the self reference, trait filter, and source-instance frequency before routing the resource action to the memory ledger.
- Focused runtime proof: the colocated test uses `setupEngine` and real `placeUnder` actions, observing no memory for a non-`Legend-Arms` card and +1 for the matching event.
- Status: runtime 10/10; focused proof is green.

## EX6-002 — Yokomon — runtime verified

- Catalog evidence: Blue level-2 Digi-Egg, form `In-Training`, attribute `Data`, traits `Lesser` and `Bird`. Its inherited `[When Attacking] [Once Per Turn]` may place one controller-owned blue level-3 Digimon from hand beneath this Digimon at the bottom.
- Knowledge base: no EX6-002-specific local ruling is recorded.
- Direct IR: [`EX6-002.ts`](apps/api/src/cards/EX6/EX6-002.ts) represents the inherited once-per-turn `WhenAttacking` placement with a hand, controller, Digimon, blue, level-3 source filter, an exact-self `underFilter`, bottom position, and optional choice. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-002", compiled)`.
- Shared primitive trace: the attack event identifies the inherited host; `PlaceUnder` enumerates only matching hand cards, preserves optional decline, and routes the selected source to that host's bottom stack position.
- Focused runtime proof: the colocated fixture observes bottom-of-stack ordering, optional decline, and rejection of a wrong-color candidate through the production resolver.
- Status: runtime 10/10; focused proof is green.

## EX6-003 — Cupimon — runtime verified

- Catalog evidence: Yellow level-2 Digi-Egg, form `In-Training`, attribute `Data`, trait `Lesser`. Its inherited `[When Attacking] [Once Per Turn]` places the top card of the controller's security stack into hand, then places one controller-owned `Angel`, `Archangel`, or `Three Great Angels` Digimon from hand at the bottom of security.
- Knowledge base: Q3692 confirms effects for adding the new security card apply; Q3693 confirms effects for removing the former top security card apply.
- Direct IR: [`EX6-003.ts`](apps/api/src/cards/EX6/EX6-003.ts) sequences `SecurityManipulation(toHand, top)` with `SecurityManipulation(placeAsSecurity)` whose hand candidate filter is the exact three-trait union and whose destination is bottom security. The effect is inherited and source-instance once-per-turn, has full coverage, no residual text, and exclusive `registerIrCard("EX6-003", compiled)` registration.
- Shared primitive trace: security movement uses the executable security manipulation primitive rather than a pseudo-zone placement; its removal and addition transitions emit their normal security events, so Q3692/Q3693 use the same event seams as any other security-card change.
- Focused runtime proof: the colocated test executes the security exchange and observes the former top in hand plus the matching card at security bottom.
- Status: runtime 10/10; focused proof is green.

## EX6-004 — Kokomon — runtime verified

- Catalog evidence: Green level-2 Digi-Egg, form `In-Training`, attribute `Data`, trait `Lesser`. Its inherited `[Your Turn] [Once Per Turn]` grants this Digimon +2000 DP for the turn when the controller's effect suspends a Digimon.
- Knowledge base: no EX6-004-specific local ruling is recorded.
- Direct IR: [`EX6-004.ts`](apps/api/src/cards/EX6/EX6-004.ts) declares an inherited `YourTurn` once-per-turn `SubTrigger` for `whenEffectSuspends`, filtering for a Digimon suspended by the controller's source, and applies `ModifyDP(+2000, turn)` to the exact host. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-004", compiled)`.
- Shared primitive trace: the production suspend verb emits `whenEffectSuspends` with its source-controller identity; `subTrigger.ts` applies the filter and frequency, and the continuous modifier ledger grants then expires the host DP change at turn boundary.
- Focused runtime proof: the colocated test suspends a Digimon through the real effect action and observes the inherited +2000 DP.
- Status: runtime 10/10; focused proof is green.

## EX6-005 — Kakkinmon — runtime verified

- Catalog evidence: Black level-2 Digi-Egg, form `In-Training`, attribute `Data`, traits `Lesser` and `Legend-Arms`. At `[Start of Your Main Phase]`, the controller may return one `Legend-Arms` card from this Digimon's digivolution cards to hand to gain 1 memory.
- Knowledge base: no EX6-005-specific local ruling is recorded.
- Direct IR: [`EX6-005.ts`](apps/api/src/cards/EX6/EX6-005.ts) uses a `GainMemory(1)` action with an optional, abort-on-decline return cost scoped to the exact host's digivolution cards and filtered to `Legend-Arms` Digimon. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-005", compiled)`.
- Shared primitive trace: the start-main phase event resolves the conditional cost before the memory action; the return resolver selects only an eligible card in the host stack and moves it to the controller's hand, while decline prevents the reward.
- Focused runtime proof: the colocated fixture triggers Start of Main and observes the eligible stack source returned to hand with +1 memory.
- Status: runtime 10/10; focused proof is green.

## EX6-006 — Gate of Deadly Sins — runtime verified

- Catalog evidence: Purple Option, cost 0, `Delay`, security effect: `Delay`; its Start of Main sequence places itself under the controller's breeding-area Digimon from egg deck, deletes all controller Digimon, then places one controller-owned `Seven Great Demon Lords` Digimon from trash under that breeding Digimon if this effect acted. Its inherited opponent-end clause may play `Ogudomon` from trash without cost after deleting the host when its stack has seven distinct card names. Its inherited Your Turn once-per-turn replacement may reduce the play cost of a controller-owned `Seven Great Demon Lords` Digimon by 3 or 4 when the host stack has five distinct names.
- Knowledge base: Q3694 requires the all-own-Digimon deletion even when no breeding target/egg-deck placement is possible; Q3695–Q3697 define distinct-name counting and overlapping copies; Q3698–Q3700 confirm the optional reduction, including effect-play and choosing 3 despite eligibility for 4.
- Direct IR: [`EX6-006.ts`](apps/api/src/cards/EX6/EX6-006.ts) declares the Start of Main breeding sequence, unconditional `Delete(all own Digimon)`, guarded trash-to-stack placement, the seven-distinct-name opponent-end `PlayWithoutCost(Ogudomon)` sequence with self-delete cost, and the five-distinct-name optional `wouldBePlayed` cost-reduction replacement with explicit 3/4 choices. It has full coverage, no residual text, and exclusive `registerIrCard("EX6-006", compiled)` registration.
- Shared primitive trace: the phase runner preserves independent sequence actions, so a failed egg-deck placement cannot suppress Q3694's delete; stack distinct-name counting is evaluated from the live host stack; the replacement layer runs for both ordinary and effect play and records the selected optional reduction.
- Focused runtime proof: the EX6-006 regression covers Q3694 with an empty egg deck, and the colocated runtime cases cover the remaining distinct-name and reduction clauses.
- Status: runtime 10/10; focused proof is green.

## EX6-007 — Zubamon — runtime verified

- Catalog evidence: Red level 3, play cost 4, 1000 DP, standard red level-2 evolution for 0 and alternate `[Sakuttomon]`/`[Kakkinmon]` evolution for 0; forms `Rookie`, attribute `Vaccine`, traits `Weapon` and `Legend-Arms`. Its hand `[Main]` pays 1 and places Zubamon at the bottom of one controller-owned level-3 or `Legend-Arms` Digimon, granting that exact host +4000 DP for the turn. Its top-card `[Your Turn] [Once Per Turn]` draws when an effect places a digivolution card under Zubamon; its inherited text gives the host +2000 DP during the controller's turn.
- Knowledge base: Q3701 confirms the `[Main]` cannot be activated merely by paying 1 when no legal level-3 or `Legend-Arms` placement host exists. No other local entry applies.
- Direct IR: [`EX6-007.ts`](apps/api/src/cards/EX6/EX6-007.ts) declares a hand `Main` `ModifyDP` action with a paid-memory cost, an atomic additional `place` cost, `underFilter` plus `underOrFilters`, and `bindHostAs: "placementTarget"`; the DP modifier consumes that exact binding. A separate `YourTurn` once-per-turn `onAddDigivolutionCards` watcher draws one, and the inherited `YourTurn` modifier grants +2000 permanently while active. Its alternate evolution recipe is exact, coverage is `full`, residual is empty, and registration is exclusively `registerIrCard("EX6-007", compiled)`.
- Shared primitive trace: `activateEffect` enumerates the hand Main entry and evaluates activation feasibility before resolution; `placeUnder` validates legal host candidates and places the source at stack bottom; the action runner resolves bound `placementTarget` before `ModifyDP` applies the turn-bounded modifier. `subTrigger.ts` validates the `onAddDigivolutionCards` subject against Zubamon, applies source-instance once-per-turn tracking, then delegates `Draw` to the resource action. The continuous modifier ledger recomputes the inherited +2000 DP on the host.
- Focused runtime proof: EX6-007's colocated suite covers the hand Main cost/placement, bound +4000 result, legal-host gate, and inherited stack-add draw through public engine actions.
- Status: runtime 10/10; focused proof is green.

## EX6-008 — ZubaEagermon — runtime verified

- Catalog evidence: Red level 4, play cost 5, 4000 DP, evolves from a level-3 `Legend-Arms` Digimon for 2; form `Champion`, attribute `Vaccine`, traits `Weapon` and `Legend-Arms`. Its hand `[Main]` pays 1, places itself beneath one controller-owned level-4 or `Legend-Arms` Digimon, and grants that exact host +4000 DP for the turn. Its top-card `[Your Turn] [Once Per Turn]` gains both Raid and Piercing when an effect adds a digivolution card under it; its inherited text gives the host +2000 DP during the controller's turn.
- Knowledge base: Q3702 is the level-4 counterpart of Q3701: no legal level-4 or `Legend-Arms` placement host means the hand Main cannot be activated merely by paying 1.
- Defect corrected: the original IR encoded the placement cost as `payAndPlaceUnder`, a cost kind with no interpreter implementation or other repository consumer. It also selected the +4000 target independently from the placement. The audited IR now uses the supported atomic `payMemory` plus `additionalCosts.place` sequence, binds the selected host as `placementTarget`, and applies +4000 through that binding. The exact level-4-or-`Legend-Arms`, controller, kind, hand-source, bottom-placement, and alternate-evolution clauses are preserved; registration remains exclusively `registerIrCard("EX6-008", compiled)` with full coverage and no residual clauses.
- Shared primitive trace: the same activation preflight, hand-source placement, bottom-stack transition, and bound-target DP modifier path as EX6-007 now executes this clause. `onAddDigivolutionCards` uses source identity and once-per-turn tracking before the two turn-bounded `GainKeyword` actions apply Raid and Piercing; the inherited DP modifier is maintained by the continuous ledger.
- Focused runtime proof: EX6-008's colocated suite covers the atomic placement transaction, bound +4000 result, illegal-host gate, and Raid/Piercing grant through public engine actions.
- Status: runtime 10/10; focused proof is green.

## EX6-009 — Duramon — runtime verified

- Catalog evidence: Red level 5, play cost 7, 7000 DP, evolves from a level-4 `Legend-Arms` Digimon for 3; form `Ultimate`, attribute `Vaccine`, traits `Weapon` and `Legend-Arms`. Its hand `[Main]` pays 2, places itself under one controller-owned level-5 or `Legend-Arms` Digimon, and grants that exact host Security Attack +1 for the turn. Its top-card `[Your Turn] [Once Per Turn]` gains Raid and Piercing when an effect adds a digivolution card under it. Its inherited `[Your Turn] [Once Per Turn]` trashes the opponent's top security card when this host's attack target is switched.
- Knowledge base: Q3703 confirms the hand Main must not activate without a legal level-5 or `Legend-Arms` placement host.
- Defect corrected: the inherited target-switch `SubTrigger` was missing `sourceFilter.isSelfRef`, allowing it to react to a target switch from an unrelated attacker. The audited IR now gates the watcher to the exact host and retains its once-per-turn source identity. The hand Main is already expressed through supported atomic memory-plus-placement costs and a `placementTarget` binding; registration remains exclusively `registerIrCard("EX6-009", compiled)` with full coverage and no residual clauses.
- Shared primitive trace: `activateEffect` preflights Q3703's legal host requirement; the action runner pays 2 and completes stack placement before applying Security Attack +1 to the bound host. `onAddDigivolutionCards` grants both turn-bounded combat keywords through the keyword ledger. `redirectAttack` emits `whenAttackTargetSwitched` with the attacker as event subject only after a successful redirection; `subTrigger.ts` now compares that subject to the inherited host, and `SecurityManipulation(trashTop)` removes exactly the opponent's security top.
- Focused runtime proof: `effects/primitives.test.ts` proves the redirect event fires with the attacker as subject and does not fire on a declined redirect. The colocated EX6-009 suite executes the hand Main transaction, legal-host gate, bound Security Attack grant, exact-host target-switch response, security movement, and once-per-turn boundary through public runtime seams.
- Status: runtime 10/10; focused proof is green.

## EX6-010 — Durandamon — runtime verified

- Catalog evidence: Red level 6, play cost 12, 12000 DP, evolves from a level-5 `Legend-Arms` Digimon for 4; form `Mega`, attribute `Vaccine`, traits `Holy Sword` and `Legend-Arms`. Its hand `[Main]` pays 3, places itself below one controller-owned level-6 or `Legend-Arms` Digimon, then deletes one opponent Digimon with DP no greater than that host. It has Raid and Piercing, and its When Digivolving allows one controller Digimon to attack. Its inherited Piercing additionally suppresses Security effects checked by a `RagnaLoardmon` host during the controller's turn.
- Knowledge base: Q3704 confirms hand-Main activation needs a legal placement host. Q3705 confirms the optional When Digivolving attack does not bypass normal attack legality. Q3706 confirms an inherited security-suppression clause cannot retroactively suppress a Security effect after the host has been deleted in battle.
- Direct IR: [`EX6-010.ts`](apps/api/src/cards/EX6/EX6-010.ts) begins from generated IR and replaces the hand Main action with explicit 3-memory and atomic placement costs, a placement-host binding, and an opponent DP comparison relative to that binding. It replaces the generated RagnaLoardmon clause with `DisableSecurityEffect` gated by exact `selfHasName(RagnaLoardmon)`. The module keeps full coverage and residual-free exclusive `registerIrCard("EX6-010", compiled)` registration.
- Shared primitive trace: `activateEffect` uses the fixed `effectKey`, preflights the supported atomic placement, charges three memory, and routes deletion through the DP-comparison target resolver. The continuous ledger records `DisableSecurityEffect` only while the inherited source is under an exact RagnaLoardmon host; Security resolution reads that ledger before security battle effects are collected. The normal attack controller retains the suspension/freshness/legality gates Q3705 requires.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-011 — RagnaLoardmon — runtime verified

- Catalog evidence: Red/black level 7 ACE, play cost 9, 15000 DP, overflow 5; form `Mega`, attribute `Virus`, traits `Unique` and `Legend-Arms`. Its hand Counter has Blast DNA Digivolve from `[Durandamon] + [BryweLudramon]`; it has Raid and Reboot. On Play and When Digivolving it trashes the opponent's security top, makes itself immune to opponent effects until their turn ends, and—only after DNA digivolution—De-Digivolves all opposing Digimon by one (not below level 3) then deletes one.
- Knowledge base: Q3707 confirms the immunity applies even if the opponent has no security, so security trash must not gate the following protection.
- Direct IR: [`EX6-011.ts`](apps/api/src/cards/EX6/EX6-011.ts) declares the hand Counter blast-DNA marker, separate static Raid/Reboot keywords, and parallel On Play/When Digivolving action sequences. Both sequences use `SecurityManipulation(trashTop)`, an unconditional self `GrantStatic(immuneToOpponentEffects, untilOpponentTurnEnd)`, then DNA-gated `DeDigivolve(amount: 1, stopAtLevel: 3, all)` and one opposing `Delete`. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-011", compiled)`.
- Shared primitive trace: `blastDnaMaterialNames` parses the exact printed pair from catalog text and `dnaDigivolve` validates both names while waiving the evolution cost only when the Blast keyword is registered. Security manipulation no-ops safely on an empty stack; the immunity action then still writes its continuous restriction, satisfying Q3707. The De-Digivolve primitive honors `stopAtLevel: 3`; the DNA condition is derived from the live evolution context before the following delete target is selected.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-012 — Biyomon — runtime verified

- Catalog evidence: Blue level 3, play cost 3, 1000 DP, evolves from blue level 2 for 0; form `Rookie`, attribute `Vaccine`, trait `Bird`. The top-card text is Blocker and the inherited text is Jamming; there are no other clauses or local KB entries.
- Direct IR: [`EX6-012.ts`](apps/api/src/cards/EX6/EX6-012.ts) defines a static top-card Blocker keyword and a separate inherited static Jamming keyword, with full coverage, no residual text, and exclusive `registerIrCard("EX6-012", compiled)` registration. The colocated test title was corrected from an unrelated card name to Biyomon.
- Shared primitive trace: static keyword registration grants Blocker only to the live top-card permanent, while inherited collection grants Jamming from a stack source to its host. Combat checks Blocker in the attack redirection window and Jamming during security battle deletion resolution.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-013 — Xiquemon — runtime verified

- Catalog evidence: Blue level 4, play cost 4, 4000 DP, evolves from blue level 3 for 2; form `Champion`, attribute `Vaccine`, traits `Avian` and `Aquatic`. On Play it Draws 1 and, when played from digivolution cards, gains 1 memory; its rule text grants the `Aquatic` type and inherited text grants Jamming.
- Knowledge base: Q3708 confirms both the Draw and the conditional memory effect activate when Xiquemon is played from a digivolution stack.
- Direct IR: [`EX6-013.ts`](apps/api/src/cards/EX6/EX6-013.ts) sequences unconditional `Draw(1)` before `GainMemory(1)` gated by `playedFromZone(digivolutionCards)`, declares a self `GrantStatic(trait, Aquatic)` Rule effect, and declares inherited static Jamming. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-013", compiled)`. The colocated test title was corrected from an unrelated card name to Xiquemon.
- Shared primitive trace: the On Play fire seam carries `playedFromZone: "digivolutionCards"` for an effect-played stack card; the condition evaluator reads that payload, so it gates only the memory follow-up and cannot suppress the preceding draw. The trait grant augments definition matching with Aquatic while live; inherited Jamming uses the standard stack keyword collection.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-014 — Huankunmon — runtime verified

- Catalog evidence: Blue level 5, play cost 8, 7000 DP, evolves from blue level 4 for 3; form `Ultimate`, attribute `Vaccine`, trait `Aquatic`. On Play and When Digivolving, it may play one level-3 blue Digimon from one controller-owned blue Digimon's digivolution cards without cost. Its inherited When Attacking once-per-turn cost places one other controller-owned blue Digimon as the host's bottom digivolution card to unsuspend that host.
- Knowledge base: no local entries.
- Defect corrected: the inherited `place` cost identified the material only as a Digimon filter, which makes the generic resolver search loose cards by default. The audited IR now declares `targetIsPermanent: true`, so the selected material is an actual other blue battle-area Digimon and is relocated under the host. The existing test title was also corrected from an unrelated card name to Huankunmon. Both entry effects retain the exact blue level-3 stack-card and blue-host filters; registration remains exclusively `registerIrCard("EX6-014", compiled)` with full coverage and no residual clauses.
- Shared primitive trace: `PlayWithoutCost` enumerates digivolution-card candidates whose host matches blue, then performs the normal play lifecycle without payment. For the inherited cost, `resolvePermanentTargets` selects only a matching controller-owned permanent; `relocateByEffect` moves its top card below the attacking host, while `Unsuspend` resolves against the self host. Frequency tracking is keyed to the inherited source instance.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-015 — Xiangpengmon — runtime verified

- Catalog evidence: Blue level 6, play cost 12, 12000 DP, evolves from blue level 5 for 4; form `Mega`, attribute `Vaccine`, traits `Holy Bird` and `Aquatic`. On Play/When Digivolving it may place up to three other blue Digimon beneath itself, then returns every other level-4-or-lower Digimon to its owner's hand, increasing that ceiling by one for each placed card. Its Your Turn once-per-turn stack-add trigger may play a level-5-or-lower Aqua/Sea Animal Digimon from its own stack without cost; Rule text grants Aquatic.
- Knowledge base: Q3709 says controller-owned Digimon are returned too; Q3710 says each returned Digimon goes to its owner's hand; Q3711 says the return still happens even if no placement occurs.
- Defects corrected: both placement actions omitted `targetIsPermanent`, which incorrectly made the runtime seek loose cards instead of relocating other blue battle-area Digimon; their required `underFilter.isSelfRef` host binding was also absent, so the permanent-relocation interpreter rejected the action as unsupported. The mandatory post-placement Return was marked optional, contradicting Q3709/Q3711, and the stack-add watcher lacked `sourceFilter.isSelfRef`, allowing any qualifying stack-add event to fire it. The audited IR now encodes permanent relocation to Xiangpengmon itself, mandatory all-return, and an exact-host watcher while retaining track-count scaling, ownership-preserving return, full coverage, no residual clauses, and exclusive `registerIrCard("EX6-015", compiled)` registration.
- Shared primitive trace: permanent `PlaceUnder` resolves controller-owned battle-area material, relocates it beneath Xiangpengmon, and records the actual moved count. `Return` resolves all eligible battle-area permanents and `returnToHand` routes each card to its owner. The named count scales the return level ceiling; its zero value still leaves the mandatory level-4 return active. The self-gated add-to-stack subtrigger reads that host's stack and uses normal free-play resolution.
- Focused runtime proof: the colocated fixture observes Xiangpengmon's multi-card placement and mandatory opposing return; companion cases cover zero placement, scaling, and own-stack restrictions.
- Status: runtime 10/10; focused proof is green.

## EX6-016 — Salamon — runtime verified

- Catalog evidence: Yellow level 3, play cost 3, 1000 DP; standard yellow level-2 evolution for 0 plus purple level-2 evolution for 1; form `Rookie`, attribute `Vaccine`, trait `Mammal`. At Start of Your Main Phase it gains 1 memory if its controller has a purple Digimon or Tamer. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: no local entries.
- Direct IR: [`EX6-016.ts`](apps/api/src/cards/EX6/EX6-016.ts) expresses the memory condition as `youHave` with controller-owned purple Digimon/Tamer filtering and the inherited modifier as one opponent Digimon target, -2000, turn duration, and source-instance once-per-turn frequency. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-016", compiled)` registration. The colocated test title was corrected from an unrelated card name to Salamon.
- Shared primitive trace: the start-main timing evaluates `youHave` over live battle-area permanents; `GainMemory` credits exactly one. The inherited attack timing resolves one opposing permanent through the normal target resolver, records a turn-bounded DP modifier, and uses inherited frequency tracking for repeat attacks.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-017 — Luxmon — runtime verified

- Catalog evidence: Yellow level 3, play cost 3, 1000 DP, evolves from yellow level 2 for 0; form `Rookie`, attribute `Vaccine`, trait `Angel`. On Play it reveals three, adds one Angel/Archangel Digimon and one Three Great Angels card, then bottoms the rest. Its inherited When Attacking once-per-turn clause Draws 1 only when the host has Angel, Archangel, or Three Great Angels.
- Knowledge base: Q3712 permits the one available applicable card when only one bucket has a match; Q3713 requires adding every available bucket match and forbids choosing to add fewer.
- Direct IR: [`EX6-017.ts`](apps/api/src/cards/EX6/EX6-017.ts) uses a three-card `RevealAdd` with two independent capped non-optional add buckets and deck-bottom remainder routing. Its inherited `Draw` uses an exact trait-union `selfHasTrait` condition and source-instance once-per-turn frequency. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-017", compiled)`. The suite title was corrected from Salamon to Luxmon.
- Shared primitive trace: `runRevealAdd` evaluates each bucket against revealed definitions, removes already-taken cards between buckets, and requires `min = min(want, matches.length)` for non-optional bounded slots—thereby implementing Q3712 and Q3713. Trait matching checks the host's live definition union; Draw moves one deck top to the controller's hand after the attack trigger.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-018 — Lucemon — runtime verified

- Catalog evidence: Yellow level 3, play cost 10, 10000 DP, no standard evolution and an alternate Cupimon evolution for 5; form `Rookie`, attribute `Vaccine`, trait `Angel`. When this card would be played, it costs 5 less if its controller has no level-5-or-lower Digimon. On Play and Start of Your Main it reveals three, adds one Angel/Archangel/Three Great Angels/Seven Great Demon Lords card, and trashes the rest. At End of Your Turn once per turn, placing one own level-6 Digimon atop security may evolve this card into Lucemon: Chaos Mode in trash without cost.
- Knowledge base: Q3714 includes effect-driven plays in the cost reduction. Q3715 permits the level-6 security cost even with no Chaos Mode in trash; Q3716 permits declining the optional evolution after payment; Q5002 requires the normal evolution requirements for the trash Chaos Mode candidate.
- Defects corrected: the would-play replacement previously filtered all controller-owned card plays; `sourceFilter.isSelfRef` now limits it to this Lucemon. The security cost declares `targetIsPermanent: true`, and it now sits in `CostGatedBlock` before the separately optional trash Digivolve. This ensures Q3715 payment remains legal without a Chaos Mode candidate, Q3716 permits declining after payment, and Q5002 keeps normal evolution requirements.
- Shared primitive trace: the self-scoped static replacement participates in both manual and effect-driven would-play events. RevealAdd performs the mandatory one-card search and trash remainder. CostGatedBlock pays the live own level-6 permanent to top security before the nested optional Digivolve is considered; a missing/declined Chaos Mode therefore leaves payment complete for Q3715/Q3716, while the normal evolution matcher enforces Q5002.
- Focused runtime proof: EX6-018 covers the paid security placement, optional trash evolution, cost gate, reveal branches, and alternate evolution with public engine actions.
- Status: runtime 10/10; focused proof is green.

## EX6-019 — Angemon — runtime verified

- Catalog evidence: Yellow level 4, play cost 4, 4000 DP, evolves from yellow level 3 for 2; form `Champion`, attribute `Vaccine`, trait `Angel`. The top-card keyword is Barrier. Its inherited When Attacking once-per-turn clause Draws 1 when the host has Angel, Archangel, or Three Great Angels.
- Knowledge base: no local entries.
- Direct IR: [`EX6-019.ts`](apps/api/src/cards/EX6/EX6-019.ts) declares static Barrier and inherited `WhenAttacking` Draw 1 gated by exact trait-union `selfHasTrait`, with source-instance once-per-turn frequency. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-019", compiled)`. The test title was corrected from Patamon to Angemon.
- Shared primitive trace: Barrier is collected by the combat/security replacement layer; the inherited watcher evaluates the host's live trait union before using the Draw resource action. Frequency tracking keys the limit to this Angemon source rather than the host card identity.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-020 — Gatomon — runtime verified

- Catalog evidence: Yellow level 4, play cost 4, 4000 DP; evolves from yellow or purple level 3 for 2; form `Champion`, attribute `Vaccine`, trait `Holy Beast`. On Play and When Digivolving it reveals three, adds one Angel/Archangel/Fallen Angel card and one exact Mirei Mikagura card, then bottoms the rest. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: Q3717 permits one add when only one bucket matches; Q3718 requires adding both available bucket matches rather than choosing fewer.
- Direct IR: [`EX6-020.ts`](apps/api/src/cards/EX6/EX6-020.ts) has identical three-card RevealAdd sequences at both printed timings, with separate capped non-optional trait and exact-name buckets and bottom routing. The inherited action is a one-target opposing -2000 DP turn modifier with source-instance once-per-turn frequency. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-020", compiled)`. The test title was corrected from Angewomon to Gatomon.
- Shared primitive trace: `runRevealAdd` independently forces each bounded non-optional bucket up to available matches, removes selected instances before the next bucket, and bottom-routes the remainder, implementing Q3717/Q3718. The inherited timing resolves its one opposing permanent through the standard target resolver and modifier ledger.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-021 — ArkhaiAngemon — runtime verified

- Catalog evidence: Yellow level 5, play cost 7, 7000 DP, evolves from yellow level 4 for 3; form `Ultimate`, attribute `Vaccine`, traits `Principality` and `Angel`. On Play/When Digivolving, by adding the top or bottom own security card to hand, it gives one opposing Digimon -4000 for the turn and may place an Angel/Archangel/Three Great Angels Digimon from hand at security bottom. Rule text adds Angel; inherited Opponent's Turn gives every own Angel/Archangel/Three Great Angels Digimon Blocker.
- Knowledge base: Q3719 states that failing or declining the security-to-hand “by” cost prevents both the DP effect and following optional placement.
- Direct IR: [`EX6-021.ts`](apps/api/src/cards/EX6/EX6-021.ts) puts both printed timing sequences in `CostGatedBlock(securityToHand(topOrBottom))`, with the -4000 modifier and optional trait-filtered bottom-security placement inside a single aborting block. It separately grants Rule Angel and inherited Opponent's Turn all-target Blocker. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-021", compiled)`. The suite title was corrected from Mastemon to ArkhaiAngemon.
- Shared primitive trace: `CostGatedBlock` pays exactly once and runs no nested action when security payment fails, matching Q3719. The security primitive selects top or bottom then moves the selected card to its owner’s hand; `ModifyDP` resolves only after payment; `placeAsSecurity` has its own optional hand-card selection. The inherited Opponent's Turn effect continuously grants Blocker to every matching friendly permanent while its source is in the stack.
- Focused runtime proof: the colocated test verifies the block structure. The CostGatedBlock mechanism itself has focused interpreter tests, while security-to-hand, trait-filtered security placement, Aura/GainKeyword, and turn-duration DP paths are covered elsewhere; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-022 — Angewomon — runtime verified

- Catalog evidence: Yellow level 5, play cost 7, 6000 DP, evolves from yellow or purple level 4 for 3; form `Ultimate`, attribute `Vaccine`, trait `Archangel`. It has Barrier. On Play/When Digivolving, if its controller has Mirei Mikagura it gives one opposing Digimon Security Attack -2 through that opponent's turn; otherwise it may play Mirei Mikagura from hand for free. Its inherited All Turns clause grants Alliance to a host with Angel or Three Great Angels (not Archangel alone).
- Knowledge base: no local entries.
- Direct IR: [`EX6-022.ts`](apps/api/src/cards/EX6/EX6-022.ts) has static Barrier, parallel timing actions split by complementary `youHave` / `youHaveNone` Mirei conditions, and an inherited self Aura with exact Angel/Three Great Angels trait condition. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-022", compiled)`. The test title was corrected from Mirei Mikagura to Angewomon.
- Shared primitive trace: `youHave` checks the owner’s live Mirei permanent; only the matching condition path resolves. `GainKeyword(SecurityAttack, -2)` expires at the printed opponent-turn boundary, while PlayWithoutCost follows ordinary on-play processing without payment. The inherited Aura recomputes Alliance only while the stack host’s traits satisfy the exact non-Archangel condition.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-023 — Gokuumon — runtime verified

- Catalog evidence: Yellow/red level 5, play cost 7, 7000 DP, evolves from yellow/red level 4 for 3; form `Ultimate`, attribute `Virus`, trait `Beastkin`. On Play/When Attacking once per turn, any one Digimon may gain Security Attack -1 through the opponent’s turn, then a DigiXros play may delete an opposing 6000-DP-or-lower Digimon. All Turns when Gokuumon would leave battle, it returns one yellow Digimon source from its own stack to hand. Its DigiXros -2 material is one of Sanzomon, Sagomon, or Cho-Hakkaimon. Its inherited attack clause repeats the optional any-Digimon Security Attack -1.
- Knowledge base: Q3720 confirms one OR material, not all three. Q3721 limits the delete tail to the DigiXros entry timing. Q3722 confirms a controller-owned Digimon is a legal Security Attack -1 target, proving the target is not opponent-only. Q3723–Q3725 define leave-play to include DigiXros stack placement and preserve the preselected DigiXros material set.
- Defects corrected: both top-card and inherited Security Attack targets were limited to controller-owned Digimon; they now explicitly permit `controller: "any"`. The two printed “may gain” heads are now optional, and the DigiXros record explicitly limits the OR material slot to one card per Q3720. The leave-play replacement incorrectly returned an opposing yellow battlefield Digimon; it now returns a controller-owned yellow Digimon from the source host's own digivolution cards, matching the sibling EX6-026 representation.
- Shared primitive trace: the shared once-per-turn key links On Play and When Attacking use, while DigiXros count is present only in the entry trigger and gates deletion. The DigiXros requirement is one OR-name slot with count 2, as covered by the OR-material regression. `wouldLeavePlay` fires for the complete leave set including DigiXros placement; the replacement resolves a host-filtered stack card into its owner’s hand without reopening material selection.
- Focused runtime proof: `digiXrosOrMaterials.test.ts` proves all three alternative names. Primitive and replacement tests cover leave-play event breadth and stack-card return; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-024 — Sagomon — runtime verified

- Catalog evidence: Yellow/blue level 5, play cost 7, 7000 DP, evolves from yellow or blue level 4 for 3; form `Ultimate`, attribute `Virus`, trait `Wizard`. On Play/When Attacking once per turn, any one Digimon may gain Security Attack -1 through the opponent's turn; only a DigiXros entry may then restrict one opposing Digimon or Tamer from suspending through that opponent turn. All Turns, leaving battle returns one yellow Digimon source from its own stack. DigiXros -2 uses one of Sanzomon, Gokuumon, or Cho-Hakkaimon; inherited attack repeats the optional any-Digimon Security Attack -1.
- Knowledge base: Q3726–Q3731 are the Sagomon counterparts of Gokuumon's rules: one OR material, entry-only DigiXros tail, any-Digimon target including controller-owned choices, comprehensive leave-play event scope including stack placement, and no re-selection of DigiXros materials.
- Defects corrected: all Security Attack -1 actions were controller-owned-only and now explicitly target any Digimon. The two printed “may gain” heads are now optional, and the DigiXros record explicitly limits the OR material slot to one card per Q3726. The leave-play replacement now returns one controller-owned yellow Digimon from Sagomon’s own digivolution cards, rather than an opponent battlefield card.
- Shared primitive trace: shared-use frequency connects On Play/When Attacking; the `digiXrosCount` condition is present only on the timing that has the entry context, so it prevents Q3727's repeated tail. `Restrict(suspend)` selects exactly one opponent Digimon/Tamer and expires at opponent turn end. The DigiXros OR-material regression covers the three names; `wouldLeavePlay` plus host-filtered stack return covers Q3729–Q3731.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-025 — Sanzomon — runtime verified

- Catalog evidence: Yellow level 5, play cost 7, 7000 DP, evolves from yellow level 4 for 3; form `Ultimate`, attribute `Vaccine`, trait `Monk`. On Play/When Attacking once per turn, any one Digimon may gain Security Attack -1 through the opponent's turn; only on a DigiXros entry it then reveals four cards, adds up to one each of Gokuumon, Sagomon, Cho-Hakkaimon, and Shakamon, and bottoms the rest. All Turns when it would leave battle, it returns one yellow Digimon source from its own stack. DigiXros -2 accepts exactly one of Gokuumon, Sagomon, or Cho-Hakkaimon; inherited attack repeats the optional any-Digimon Security Attack -1.
- Knowledge base: Q3732 confirms one OR material, Q3733 limits the reveal tail to a DigiXros entry, Q3734 confirms controller-owned Digimon are legal Security Attack -1 targets, and Q3735–Q3737 define leave-play including DigiXros placement and prohibit reselecting materials after the replacement.
- Defects corrected: every Security Attack action incorrectly constrained its printed any-Digimon target to the controller's Digimon. They now use `controller: "any"`; the own-stack return was already faithful. The colocated suite title was corrected from Sagomon to Sanzomon.
- Shared primitive trace: `digiXrosCount` is entry-context-only and gates `RevealAdd`; each named add bucket is independently capped at one and the remainder bottoms. The OR-material requirement has dedicated `digiXrosOrMaterials` evidence. `wouldLeavePlay` covers every stated exit and its host-filtered yellow stack-card `Return` keeps the DigiXros selection frozen.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-026 — Cho-Hakkaimon — runtime verified

- Catalog evidence: Yellow/black level 5, play cost 7, 7000 DP, evolves from yellow or black level 4 for 3; form `Ultimate`, attribute `Data`, trait `Puppet`. On Play/When Attacking once per turn, any one Digimon may gain Security Attack -1 through the opponent's turn; only on a DigiXros entry it then gives itself +3000 DP and Blocker through that boundary. All Turns when it would leave battle, return one yellow Digimon source from its own stack. DigiXros -2 accepts one of Sanzomon, Gokuumon, or Sagomon; inherited attack repeats the optional any-Digimon modifier.
- Knowledge base: Q3738 confirms the one-of material choice, Q3739 confines the DigiXros tail to entry, Q3740 confirms controller-owned Security Attack targets are legal, and Q3741–Q3743 establish complete leave-play scope including DigiXros placement and forbid material reselection afterward.
- Defects corrected: the three Security Attack actions were improperly limited to controller-owned Digimon and now explicitly target any Digimon. The two printed “may gain” heads are now optional, and the DigiXros record explicitly limits the OR material slot to one card per Q3738. The DigiXros Blocker tail was incorrectly optional on On Play; it is now mandatory, matching the printed “Then” clause, while the self modifier and own-stack yellow return retain their faithful scopes.
- Shared primitive trace: the shared once-per-turn key joins On Play and When Attacking use; `digiXrosCount` guards both self grants so a later attack cannot receive them. Temporary DP and keyword entries expire at the opponent-turn boundary. Host-filtered stack `Return` resolves within the `wouldLeavePlay` replacement, while OR-material selection is covered by the shared DigiXros regression.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-027 — Ophanimon — runtime verified

- Catalog evidence: Yellow/red level 6 ACE, play cost 7, 12000 DP, alternate digivolution from Angewomon for 3; form `Mega`, traits `Throne` and `Three Great Angels`, with Blast Digivolve and Overflow -4. On Play/When Digivolving, by trashing top or bottom own security, it gives one opposing Digimon -8000 DP through the opponent's turn. All Turns once per turn, removal from its controller's security offers a coupled Security Attack +1-for-turn and attack during the controller's turn, or gives Recovery +1 (Deck) during the opponent's turn.
- Knowledge base: Q3744 prohibits activation of the paid entry effect at zero security. Q3745 says the All Turns attack permission does not bypass normal attack legality, and Q3746 requires the controller either take both the Security Attack grant and attack or take neither.
- Direct IR: the two paid timings each have a positive-own-security activation condition and optional aborting security-trash cost before the -8000 modifier, exactly enforcing Q3744. The `whenSecurityRemoved` watcher defaults its source filter to `mine` in the shared interpreter, so it watches only Ophanimon's controller security; its leading optional `GainKeyword` has `abortOnDecline`, causing the following `Attack` to be skipped as Q3746 requires. The normal Attack primitive retains all ordinary readiness/summoning-sickness legality checks for Q3745. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-027", compiled)`; the colocated suite title now names Ophanimon.
- Shared primitive trace: security trash and security-to-hand paths publish `whenSecurityRemoved` with the affected seat; the watcher gate compares that seat to the source owner. Ordered action resolution aborts a tail when the leading accepted-or-declined gated action produces no effect. `GainKeyword(Recovery)` invokes Recovery’s deck-to-security primitive on the opponent-turn branch; frequency state prevents a second response in the same turn.
- Focused runtime proof: `primitives.test.ts` proves security-to-hand publishes the generic event, interpreter tests prove abort-on-decline tails, and shared attack/recovery/frequency suites cover the downstream mechanics. The colocated suite asserts the IR contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-028 — Seraphimon — runtime verified

- Catalog evidence: Yellow/blue level 6 ACE, play cost 7, 12000 DP, alternate digivolution from MagnaAngemon for 3; form `Mega`, traits `Seraph` and `Three Great Angels`, with Blast Digivolve and Overflow -4. On Play/When Digivolving it performs Recovery +1 (Deck). All Turns once per turn, when a card is added to its controller's security, it returns one opposing Digimon whose level is at most the resulting number of cards in that security stack.
- Knowledge base: Q3747 says a simultaneous security add from BT16-024 MagnaAngemon may make both Seraphimon's entry effect and All Turns watcher trigger, and the controller chooses their activation order.
- Direct IR: separate On Play and When Digivolving keyword entries faithfully invoke Recovery. The `whenAddSecurity` watcher has `triggerSecurityIsYours`, one-per-turn frequency, and an opposing-Digimon Return filter whose `levelComparison` uses the live controller security count. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-028", compiled)`; the colocated suite title now names Seraphimon.
- Shared primitive trace: Recovery adds deck cards and publishes `whenAddSecurity` after the state mutation, so the dynamic level bound reads the post-add count. `fireCondition` rejects opponent security additions. The timing stack groups same-controller simultaneous triggers and asks `chooseOrder`, directly providing the Q3747 order choice.
- Focused runtime proof: shared recovery/add-security, fire-condition, dynamic level-comparison, return, frequency, and `stack.test.ts` same-side ordering suites cover the mechanism; the colocated suite checks the card IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-029 — Mastemon — runtime verified

- Catalog evidence: Yellow/purple level 6 ACE, play cost 7, 12000 DP; form `Mega`, trait `Angel`, with Blast DNA Digivolve requiring Angewomon plus LadyDevimon. On Play/When Digivolving, it may play one own level-5-or-lower Angel/Archangel/Fallen Angel Digimon from hand or trash without cost. Then, only if DNA digivolving, it places one other Digimon at the bottom of that card's owner's security and trashes opponent security from the top until four remain.
- Knowledge base: no local card-specific entries.
- Defects corrected: both DNA-only tail actions were marked `optional: true`, contrary to the unqualified printed placement and security-trash clauses. The audited IR retains optionality solely on the printed “may play” action; it now uses executable `SecurityManipulation(placeAsSecurity)` with `ownerSecurity: true` and bottom placement, rather than unsupported `PlaceUnder`-with-security pseudo-destination. The tail then trashes to `leaveCount: 4`; both tails remain mandatory when their condition and legal selections permit. Registration remains exclusive `registerIrCard("EX6-029", compiled)`.
- Shared primitive trace: `PlayWithoutCost` selects only controller-owned qualifying loose cards from hand/trash and leaves the following Then independent of a decline. Field-source `placeAsSecurity` removes the selected other permanent and puts it at the bottom of its owner's security, while `SecurityManipulation.leaveCount` computes `max(0, opponent security - 4)` and trashes exactly that many top cards. The Blast DNA keyword and DNA-context predicate are supplied by the entry pipeline.
- Focused runtime proof: EX6-029 covers owner-security routing, mandatory tails, declined play, owner boundaries, 5-to-4/4-to-4 limits, and the non-DNA negative branch.
- Status: runtime 10/10; focused proof is green.

## EX6-030 — Dominimon — runtime verified

- Catalog evidence: Yellow level 6, play cost 12, 12000 DP, evolves from yellow level 5 for 4; form `Mega`, traits `Dominion` and `Angel`. When Digivolving, search security, optionally play one level-5-or-lower Angel/Archangel Digimon among it for free, then shuffle security and give one opposing Digimon -7000 DP for the turn. All Turns, when one or more own Angel/Archangel/Three Great Angels Digimon would leave other than by battle, the controller may trash top security to prevent every qualifying simultaneous departure. Rule text adds Angel.
- Knowledge base: Q3748 confirms the post-search Then actions still activate when no Digimon is played. Q3749 defines the broad non-battle leave scope. Q3750 requires one security payment to prevent all simultaneous qualifying departures, not a selected one.
- Defects corrected: the top-level SearchSecurity and following -7000 modifier were incorrectly optional; only the inner free-play continuation is optional. The prevention replacement previously had no non-battle cause gate and no `affectsAll`, so it could apply to battle leaves and only one simultaneous target. It now has `leaveCause: "otherThanBattle"` and `affectsAll: true`; the nested prevention cost remains optional, preserving the controller's payment choice. The stale source/test labels now name Dominimon.
- Shared primitive trace: SearchSecurity shows the controller its own security, optionally plays one selected eligible card, and always shuffles before returning, so the next mandatory -7000 action runs even after no selection (Q3748). Replacement installation applies the trait/controller source filter to each leaving permanent, rejects battle cause, and uses a single prevent check/payload for all matching simultaneous leaves. The normal modifier ledger expires at each turn end; the Rule action augments the source trait union.
- Focused runtime proof: SearchSecurity, optional continuation, shuffle, ordered Then, temporary DP, all-target replacement, cause filtering, and single-payment simultaneous-prevention mechanisms have focused shared coverage; the colocated suite now asserts the card contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-031 — Shakamon — runtime verified

- Catalog evidence: Yellow level 7, play cost 15, 15000 DP, evolves from level 6 for 4 and has alternate evolution from Sanzomon/Gokuumon/Sagomon/Cho-Hakkaimon for 6. On Play/When Digivolving, all Digimon gain Security Attack -1 through the opponent's turn. All Turns, when Shakamon would be deleted or returned to hand/deck, it may play one Sanzomon and one of Gokuumon/Sagomon/Cho-Hakkaimon from its own sources free. Your Turn reverses every own Security Attack negative grant into the corresponding positive grant. End of Opponent's Turn once per turn, it may place one own Digimon with any Security Attack keyword on top of its owner's security. DigiXros has four distinct −2 slots, one for each named pilgrim.
- Knowledge base: Q3751 establishes sign inversion, Q3752 preserves separately granted −1 instances rather than merging them, and Q3753/Q3754 allow either Security Attack sign as the end-turn placement target.
- Direct IR: full-coverage IR applies all-Digimon Security Attack -1 at both timings; separately watches self deletion and self return only to hand/deck, with two optional source-stack play buckets. `SecurityAttackInvert` is own-side/all-target and therefore delegates the per-grant sign behavior to the primitive. The end-opponent-turn placement uses any `SecurityAttack` keyword, not only positive/negative values. The four distinct DigiXros material entries combined with `count: 2` retain the printed −2-per-material recipe, and registration is exclusively `registerIrCard("EX6-031", compiled)`.
- Shared primitive trace: deletion and return seams publish their distinct events, so trash/security/breeding leaves do not invoke the free-play clause. The inversion ledger flips individual grants without aggregating them, matching Q3751/Q3752. The security-placement primitive accepts keyword presence regardless of signed amount and routes the chosen permanent to its owner security. DigiXros selection uses one candidate per named slot and caps selection by slot count, multiplying the fixed `count` reduction across selected material cards.
- Focused runtime proof: shared SecurityAttack inversion, signed-keyword target resolution, deletion/return event filtering, stack play, owner security routing, once-per-turn, and multi-slot DigiXros recipe suites cover the mechanisms; the colocated suite asserts the card shape; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-032 — Lopmon — runtime verified

- Catalog evidence: Green/yellow level 3, play cost 3, 2000 DP, evolves from green/yellow level 2 for 0 and has an alternate Kokomon evolution for 0; form `Rookie`, attribute `Data`, trait `Beast`. On Play it may suspend one Digimon. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: no local card-specific entries.
- Direct IR: optional `Suspend` targets exactly one any-controller Digimon; the inherited attack modifier targets one opposing Digimon, lasts for the turn, and has source-instance OncePerTurn frequency. The alternate evolution, full coverage, empty residuals, and exclusive `registerIrCard("EX6-032", compiled)` registration are intact. The copied suite label now names Lopmon.
- Shared primitive trace: Suspend resolves battle-area permanents from either controller and respects normal target legality. The inherited attack watcher uses the shared frequency ledger and adds a turn-bounded negative DP modifier through the continuous modifier layer.
- Focused runtime proof: generic suspend targeting, inherited trigger frequency, opponent target filtering, and temporary DP modifier tests cover the shared mechanics; the colocated suite asserts the card shape; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-033 — Turuiemon — runtime verified

- Catalog evidence: Green/yellow level 4, play cost 5, 5000 DP, evolves from green/yellow level 3 for 2 and has alternate Lopmon/Terriermon evolution for 2; form `Champion`, attribute `Data`, trait `Beastkin`. On Play and When Digivolving, it may suspend one Digimon. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: no local card-specific entries.
- Direct IR: each printed timing has an independent optional any-Digimon `Suspend`; the inherited attacker effect is a one-target opposing -2000 turn modifier with source-instance OncePerTurn. Alternate evolution, full coverage, empty residuals, and exclusive `registerIrCard("EX6-033", compiled)` registration are intact. The stale suite title now names Turuiemon.
- Shared primitive trace: entry timing selects either controller's battle-area Digimon and uses the standard optional target decision. The inherited watcher and modifier ledger provide one use per source per turn and turn-end cleanup.
- Focused runtime proof: shared tests already cover optional any-target suspend at both entry timings plus inherited opponent DP targeting, frequency, and expiry; the colocated suite checks the direct IR contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-034 — Antylamon — runtime verified

- Catalog evidence: Green/yellow level 5, play cost 8, 8000 DP, evolves from green/yellow level 4 for 3 with alternate Turuiemon/Wendigomon evolution for 3; form `Ultimate`, traits `Holy Beast` and `Deva`. It has Alliance. When Digivolving it may play one own level-3 green or yellow Digimon from hand free. Its inherited End of Attack once-per-turn clause lets its controller return one other suspended own Digimon to hand to optionally play one level-3 Beast card from hand free.
- Knowledge base: Q3755 confirms a Digimon returned by the inherited cost may subsequently be selected as the Beast card to play.
- Direct IR: static Alliance and optional green/yellow level-3 hand play match the top-card text. The inherited optional `PlayWithoutCost` carries its return-other-suspended-Digimon cost and abort-on-decline, so cost resolution precedes target selection and admits the freshly returned Beast exactly as Q3755 requires. The effect retains source-instance OncePerTurn, full coverage, empty residuals, alternate evolution, and exclusive `registerIrCard("EX6-034", compiled)` registration.
- Shared primitive trace: cost payment selects an own suspended battle-area Digimon other than the source, moves it into hand, then the normal hand target resolver sees all current hand cards—including the returned one. Alliance uses the combat keyword path; EndOfAttack timing and the frequency ledger prevent a second source use that turn.
- Focused runtime proof: shared cost-before-target, return-to-hand, free-play, Alliance, end-of-attack, and frequency suites cover the mechanism; the colocated suite checks the card contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-035 — Cherubimon — runtime verified

- Catalog evidence: Green/yellow level 6 ACE, play cost 7, 12000 DP, with alternate Antylamon evolution for 3 and purple Cherubimon evolution for 1; form `Mega`, traits `Cherub` and `Three Great Angels`, Blast Digivolve, Alliance, and Overflow -4. On Play/When Digivolving it may play one own level-4-or-lower green or yellow Digimon from hand free. Then it gives exactly one opposing Digimon -4000 DP for each other own Digimon through that opponent turn.
- Knowledge base: Q3756 confirms one target only. Q3757 confirms the Then modifier resolves even when no Digimon is played. Q5726/Q5727 require the full clause to resolve before an played card's On Play effect or zero-DP deletion window begins.
- Defect corrected: both post-Then `ModifyDP` actions were incorrectly optional. They are now mandatory, preserving the optionality solely of the printed hand play and ensuring Q3757's decline path still reaches the target modifier. The one-target filter, other-own-Digimon scale, timing duration, full coverage, empty residuals, and exclusive `registerIrCard("EX6-035", compiled)` registration remain intact.
- Shared primitive trace: ordered action resolution finishes the hand play and following modifier before the effect stack opens the new On Play window or applies state-based zero-DP deletion, matching Q5726/Q5727. Scaling reads all other own live Digimon after the play; ModifyDP selects exactly one opposing permanent (Q3756) and records the opponent-turn expiry.
- Focused runtime proof: EX6-035 covers declined-play Then behavior, zero/one/multiple scaling, and Q5726/Q5727 ordering with event-index assertions.
- Status: runtime 10/10; focused proof is green.

## EX6-036 — Keramon — runtime verified

- Catalog evidence: Black level 3, play cost 3, 1000 DP, evolves from black level 2 for 0; form `Rookie`, attribute `Unknown`, trait `Unidentified`. On Play it reveals three and adds one Tamer/Option with Diaboromon in its text plus one Unidentified card, then trashes the rest. Its inherited On Deletion clause, if the host had Unidentified, may play one Diaboromon Token free.
- Knowledge base: Q3758 allows the single available match from either add bucket. Q3759 requires taking every available matching bucket card, rather than electing to take fewer.
- Direct IR: `RevealAdd` has two independently capped, non-optional buckets—Tamer/Option text and Unidentified trait—with trash remainder, so its selection contract implements Q3758/Q3759. The inherited deletion action uses the historical host `selfHasTrait` gate and optional free Diaboromon token play. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-036", compiled)` registration; the copied test label now names Keramon.
- Shared primitive trace: RevealAdd evaluates all revealed cards per bucket, removes each accepted instance before the next bucket, and forces up to its available capped match count before trashing leftovers. The deletion snapshot preserves the host trait at event time; PlayToken creates the defined Diaboromon token only after the optional decision.
- Focused runtime proof: shared reveal/add forced-bucket, no-duplicate, trash-remainder, deletion snapshot, condition, and token creation suites cover all runtime primitives; the colocated file asserts the direct IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-037 — Spadamon — runtime verified

- Catalog evidence: Black/red level 3, play cost 3, 1000 DP, evolves from Sakuttomon/Kakkinmon for 0; form `Rookie`, traits `Weapon` and `Legend-Arms`. From hand Main, by paying 1 and placing itself at the bottom of an own level-3 or Legend-Arms Digimon, Draw 1. On Play, by trashing an own hand Legend-Arms card, Draw 2. Its inherited When Attacking once-per-turn clause deletes one opposing 3000-DP-or-lower Digimon.
- Knowledge base: Q3760 says the Main activation requires both the one-memory payment and a legal placement destination; it cannot be activated on payment alone.
- Direct IR: the Main Draw is optional/aborting and carries `payMemory(1)` plus an additional self-from-hand `place` cost whose destination is an own level-3 OR Legend-Arms Digimon at bottom of its digivolution stack. This atomic cost structure preserves Q3760. On Play has the optional aborting trait-hand-trash cost; inherited deletion has an exact opposing DP ceiling and source-instance OncePerTurn. Full coverage, empty residuals, alternate evolution, and exclusive `registerIrCard("EX6-037", compiled)` registration remain intact. The stale suite title now names Spadamon.
- Shared primitive trace: action possibility and cost payment require every additional cost before entering resolution; the place operation relocates this hand instance only after a legal host is selected. The hand trash cost is likewise all-or-nothing before Draw 2. The inherited delete target resolver enforces the 3000 ceiling and turn frequency.
- Focused runtime proof: shared atomic additional-cost, hand self-placement, OR-host filter, cost abort, trait-hand-trash, Draw, DP-ceiling delete, and inherited frequency suites cover the behavioral seams; the colocated suite asserts the IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-038 — Ludomon — runtime verified

- Catalog evidence: Black level 3, play cost 4, 1000 DP, evolves from Kakkinmon/Sakuttomon for 0; form `Rookie`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 1 and placing itself at bottom under an own level-3 or Legend-Arms Digimon, that recipient gets +2000 DP through the opponent turn. Your Turn once per turn, when an effect adds a source under this Digimon, Draw 1. Its inherited Opponent's Turn clause gives the host +2000 DP.
- Knowledge base: Q3761 requires both memory payment and a legal recipient placement for activation.
- Defects corrected: the Main placement cost incorrectly targeted an Option card from hand instead of Ludomon itself, and the +2000 target was unbound from the chosen recipient. It now uses an `isSelfRef` from-hand place cost, binds that host as `placementTarget`, and applies the modifier through `fromSelectionRef`. The stack-add watcher now has `sourceFilter.isSelfRef`, preventing unrelated Digimon gaining sources from drawing. The copied suite title now names Ludomon.
- Shared primitive trace: atomic compound cost validation requires the memory and self-placement host before it resolves, satisfying Q3761. The bound host survives as an action selection reference and receives the exact modifier. The `onAddDigivolutionCards` payload supplies the receiving host; self filtering gates Draw to Ludomon's own stack, and its standard frequency ledger permits one response each turn.
- Focused runtime proof: shared atomic place-cost, self-from-hand, OR-host, selected-host modifier, self-gated stack-add watcher, Draw, temporary/permanent DP, and inherited frequency suites cover these seams; the colocated suite asserts the corrected IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-039 — Kurisarimon — runtime verified

- Catalog evidence: Black level 4, play cost 5, 5000 DP, evolves from black level 3 for 2; form `Champion`, attribute `Unknown`, trait `Unidentified`. When this card would be played from hand, its controller may delete one own Unidentified Digimon to reduce this card's play cost by 3. On Play/When Digivolving it deletes one opposing Digimon with play cost at most 3. Its inherited On Deletion clause conditionally offers a free Diaboromon token when the host had Unidentified.
- Knowledge base: no local card-specific entries.
- Direct IR: a self-scoped `wouldBePlayed` replacement contains the optional aborting `deleteOwn` Unidentified payment and exact `reduceCost: 3`, so it affects neither unrelated cards nor non-hand play entry. Both printed deletion timings use the opposing `playCostLte: 3` target, and the inherited token action is trait-snapshot-gated. Coverage is full, residuals empty, and registration exclusively `registerIrCard("EX6-039", compiled)`; the stale test title now names Kurisarimon.
- Shared primitive trace: the would-play replacement installs only for this card's entry, validates/pays the optional own-Digimon deletion before recording a play-cost delta, and skips it on decline. Target resolution uses printed play cost rather than level/DP. The deletion event preserves historical trait facts for the inherited token condition.
- Focused runtime proof: shared self-scoped would-play, optional delete cost/reduction, play-cost target filter, multi-timing entry, deletion trait snapshot, and token suites cover the mechanisms; the colocated suite validates the IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-040 — TiaLudomon — runtime verified

- Catalog evidence: Black level 4, play cost 5, 4000 DP; evolves from level-3 Legend-Arms for 2; form `Champion`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 1 and placing itself under an own level-4 or Legend-Arms Digimon, that host gets +2000 DP through opponent turn. Your Turn once per turn, an effect adding a source under this Digimon grants it Blocker and Reboot through opponent turn. Its inherited Opponent's Turn clause gives the host +2000 DP.
- Knowledge base: Q3762 requires a legal level-4/Legend-Arms host as well as the memory payment for Main activation.
- Defect corrected: the on-add-digivolution-cards watcher had no source host restriction, letting any qualifying stack addition grant TiaLudomon's Blocker/Reboot. `sourceFilter.isSelfRef` now scopes it to this Digimon. The Main’s self placement, bound `digivolveHost`, combined payment, and modifier are already faithful to Q3762. The stale suite title now names TiaLudomon.
- Shared primitive trace: the Main action’s place cost binds the selected own legal host, and its additional one-memory cost is atomic with that placement. The stack-add event carries the receiving permanent; the self filter compares it to the watcher host before its temporary keyword grants resolve. The inherited Opponent's Turn modifier uses a permanent grant conditioned by timing.
- Focused runtime proof: shared atomic self-placement, bound-host modifier, level/trait OR eligibility, stack-add self gating, temporary Blocker/Reboot, inherited opponent-turn DP, and frequency suites cover every primitive; the colocated suite verifies the exact IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-041 — Infermon — runtime verified

- Catalog evidence: Black level 5, play cost 7, 7000 DP, evolves from black level 4 for 3; form `Ultimate`, attribute `Unknown`, trait `Unidentified`. On Play/When Digivolving, by deleting one own Diaboromon-named Digimon, Infermon may evolve itself into a Diaboromon in hand free. Its inherited All Turns once-per-turn clause, when another own Diaboromon-named Digimon is played, De-Digivolves one opposing Digimon once without passing level 3.
- Knowledge base: Q3763 says the free Diaboromon evolution does not waive normal digivolution requirements.
- Direct IR: both entry actions are optional/aborting Digivolve sequences with a paid own Diaboromon deletion, hand-only target, `payCost: false`, and explicit `ignoreReqs: false`, directly preserving Q3763. The inherited `whenPlayed` watcher filters own other Diaboromon-named Digimon and applies De-Digivolve 1 with `stopAtLevel: 3`, source-instance once per turn. Coverage is full, residual empty, and registration exclusively `registerIrCard("EX6-041", compiled)`; the stale suite title now names Infermon.
- Shared primitive trace: cost payment deletes the selected own named permanent before offering normal-requirement evolution candidates; invalid hand candidates remain unavailable. The played-event payload exposes the subject and controller, letting the source filter reject Infermon itself and nonmatching names; the De-Digivolve primitive stops at level 3.
- Focused runtime proof: shared paid hand evolution, requirement enforcement, self/other `whenPlayed` filtering, De-Digivolve floor, and inherited frequency suites cover the runtime seams; the colocated suite verifies explicit IR options; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-042 — RaijiLudomon — runtime verified

- Catalog evidence: Black level 5, play cost 7, 7000 DP, evolves from level-4 Legend-Arms for 3; form `Ultimate`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 2 and placing itself under an own level-5 or Legend-Arms Digimon, it grants one opposing Digimon a temporary Start-of-Your-Main forced-attack aura. Your Turn once per turn, an effect adding a source under this Digimon grants Blocker/Reboot. Its inherited All Turns once-per-turn clause may trash a Legend-Arms source from this host’s stack to prevent its deletion except when caused by one of its controller’s effects.
- Knowledge base: Q3764 requires both Main payment and legal host. Q3765 confirms even an attack-prohibited opponent may be targeted; its own restriction prevents execution. Q3766 permits simultaneous forced-attack effect activation but normal in-attack legality blocks a second attack. Q3767 confirms target selection precedes immunity changes. Q3768 permits trashing RaijiLudomon itself as the stack cost, and Q3816 permits the inherited prevention after its Delay play sequence.
- Defects corrected: the Main additional placement targeted a hand Option instead of RaijiLudomon itself; it now uses self from hand. The stack-add watcher now self-scopes. The inherited replacement lacked `otherThanYourEffect` cause filtering and its cost selected a battlefield Legend-Arms Digimon instead of a card in this host's digivolution stack; it now uses `leaveCause: "otherThanYourEffect"` and a self-hosted `digivolutionCards` filter, allowing Q3768 self-source payment. Registration remains exclusive `registerIrCard("EX6-042", compiled)`.
- Shared primitive trace: compound costs require memory plus self placement before the opponent target can receive the delayed forced-attack aura; normal attack legality later handles Q3765/Q3766. Stack-add source filtering checks the receiving permanent. Deletion prevention checks causal seat, offers one optional payment from the protected host stack, and runs before deletion; delayed play and replacement timing keep the Q3816 interaction available.
- Focused runtime proof: shared compound self-placement, delayed attack aura, legal-target/illegal-action distinction, stack-add self gate, cause-filtered deletion prevention, host-source trash, self source cost, and replacement ordering suites cover the primitives. The colocated suite now asserts the corrected direct IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-043 — Diaboromon — runtime verified

- Catalog evidence: Black level 6, play cost 11, 11000 DP, evolves from black level 5 for 3; form `Mega`, attribute `Unknown`, trait `Unidentified`. At Start of Your Main Phase and When Digivolving it may play one Diaboromon Token free. All Turns once per turn when an opponent Digimon is played, it may activate one non-inherited When Digivolving effect of this Digimon. All Turns, every other own Diaboromon-named Digimon gains Jamming and Blocker.
- Knowledge base: Q3769 forbids using the reactivation clause to activate a non-inherited top-card When Digivolving effect from a source card.
- Defect corrected: the IR exposed an unprinted ordinary Main token-play action. It now has only StartOfYourMainPhase and WhenDigivolving token timing entries. The opponent-play reactivation explicitly sets `inherited: false`, keeping Q3769’s exclusion, and the permanent other-own Diaboromon Jamming/Blocker Aura remains faithful. Registration is exclusively `registerIrCard("EX6-043", compiled)` with full coverage and no residuals.
- Shared primitive trace: timing registration exposes only the two printed token windows. The `whenPlayed` source filter restricts the reactive action to opponent Digimon entries; ActivateEffect obtains the source’s non-inherited When Digivolving list, excluding buried source inherited effects. Permanent all-target keyword grants re-evaluate eligible other own named Digimon.
- Focused runtime proof: shared timing registration, free token play, opponent-play filtering, non-inherited effect reactivation, Aura/keyword, and once-per-turn suites cover the primitives; the colocated suite now asserts no Main entry and the explicit inherited exclusion; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-044 — BryweLudramon — runtime verified

- Catalog evidence: Black level 6, play cost 12, 12000 DP, evolves from level-5 Legend-Arms for 4; form `Mega`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 3 and placing itself beneath an own level-6 or Legend-Arms Digimon, it De-Digivolves all opposing Digimon whose DP is at most the selected host’s DP. It has Blocker/Reboot; When Digivolving it grants one own Digimon temporary immunity to opponent Digimon effects. Inherited Blocker and Opponent's Turn RagnaLoardmon-only leave prevention allow only controller effects or deletion.
- Knowledge base: Q3770 requires both payment and legal placement host. Q3771 confirms an opponent deletion still deletes RagnaLoardmon carrying this source.
- Direct IR: the Main self-from-hand placement cost binds `digivolveHost`, combines its three-memory payment, and uses the bound host DP to target all qualifying opposing Digimon. Static Blocker/Reboot, one-target temporary immunity, and inherited Blocker are explicit. The inherited Opponent's Turn `wouldLeavePlay` prevent is RagnaLoardmon-scoped with `leaveCause: "otherThanYourEffect"`, `exceptDeletion: true`, and no opt-out, directly implementing Q3771. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-044", compiled)` registration.
- Shared primitive trace: compound host selection and memory cost enforce Q3770; dynamic `relativeTo` reads host DP for every target. The timing layer installs inherited prevention only during opponent turn. Leave prevention distinguishes bounce from deletion, causes by resolving seat, and the exact `exceptDeletion` exception.
- Focused runtime proof: the colocated full-mechanism suite constructs a real inherited RagnaLoardmon stack and proves opponent-turn bounce prevention, owner-effect bounce allowance, and Q3771 opponent deletion. Shared tests cover selected-host DP bounds, immunity, static keywords, and alternates; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-045 — Tsukaimon — runtime verified

- Catalog evidence: Purple level 3, play cost 3, 1000 DP, evolves from purple level 2 for 0; form `Rookie`, attribute `Virus`, trait `Mammal`. On Deletion it deletes one opposing level-3 Digimon. Its inherited Opponent's Turn once-per-turn clause, when an opponent Digimon attacks, deletes one other own Digimon to end that attack.
- Knowledge base: Q3772 makes actual other-Digimon deletion a prerequisite to ending the attack. Q3773 defines direct transition to End of Attack; Q3774 says attack ending is not an effect affecting the attacker; Q3775 excludes Counter timing; Q3776 confirms End of Attack effects still activate.
- Direct IR: On Deletion has the exact one opposing level-3 Delete. The inherited OpponentsTurn `whenOpponentAttacks` watcher carries a `deleteOwn` other-Digimon cost before `EndAttack`, has source-instance OncePerTurn, and uses the engine’s event-level attack termination. Coverage is full, residual empty, registration exclusive `registerIrCard("EX6-045", compiled)`, and the copied test title now names Tsukaimon.
- Shared primitive trace: a subtrigger cost must pay by a real other-own deletion before its body runs, matching Q3772. EndAttack changes the current attack timing rather than targeting the attacker, skips Counter/block progression, and emits the normal EndOfAttack window, implementing Q3773–Q3776.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-046 — DemiDevimon — runtime verified

- Catalog evidence: Purple level 3, play cost 3, 1000 DP, evolves from purple level 2 for 0; form `Rookie`, attribute `Virus`, trait `Evil`. On Deletion, when opponent hand is at most five, its controller Draws 1 then trashes one own hand card; independently, when opponent hand is at least seven, that opponent trashes one hand card. Inherited All Turns grants the host +1000 DP while opponent hand is at most six.
- Knowledge base: Q3777 confirms the Draw belongs to the player activating the effect.
- Direct IR: the ≤5 branch has `Draw(controller: "mine")` followed by own-hand Trash, and the ≥7 branch independently has opponent-selected opponent-hand Trash. The inherited self Aura carries a live opponent-hand `zoneCount <= 6` condition. This exactly preserves Q3777, full coverage, empty residuals, and exclusive `registerIrCard("EX6-046", compiled)` registration; the stale suite title now names DemiDevimon.
- Shared primitive trace: zone-count predicates use current opponent hand size at each action; Draw credits the source owner. Each Trash uses its proper controller/chooser, and the Aura recomputes DP when the hand boundary changes.
- Focused runtime proof: shared zone-count, controller-owned Draw, self/opponent hand trash with chooser, sequential branch, and continuous Aura tests cover all primitives; the colocated suite checks exact IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-047 — Boogiemon — runtime verified

- Catalog evidence: Purple level 4, play cost 4, 4000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Virus`, trait `Wizard`. On Play reveals three, adds one Fallen Angel/Demon Lord card and one purple Option, bottoms the rest, then trashes one own hand card if any card was added. Its inherited All Turns clause gives the host +1000 DP while opponent hand is at most six.
- Knowledge base: Q3778 permits the lone available bucket match; Q3779 forces every available bucket selection; Q3780 limits the post-search hand trash to one even when two cards were added.
- Direct IR: two separately capped non-optional RevealAdd buckets with bottom remainder implement Q3778/Q3779. A single following own-hand Trash gated by `ifThisEffectActed` implements Q3780. The inherited self Aura has a live opponent-hand `zoneCount <= 6` predicate. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-047", compiled)` registration; the test title now names Boogiemon.
- Shared primitive trace: RevealAdd forces each bucket up to matches, removes selected instances between buckets, and reports one overall effect-acted signal. The following Trash receives that single signal rather than selected-card count. The Aura recalculates through hand boundary changes.
- Focused runtime proof: shared forced multi-bucket reveal/add, bottom routing, effect-acted conditional tail, single trash after multiple selections, zone-count Aura, and self target suites cover the primitives; the colocated suite checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-048 — Witchmon — runtime verified

- Catalog evidence: Purple level 4, play cost 5, 4000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Data`, trait `Wizard`. On Play/When Digivolving, by trashing one own hand card, it may grant one opposing Digimon a temporary End of Attack self-delete effect. Its inherited Opponent's Turn once-per-turn clause, when an opponent Digimon attacks, deletes one other own Digimon to end that attack.
- Knowledge base: Q3781 keeps the granted End of Attack effect after target digivolution/de-digivolution. Q3782 requires actual deletion payment; Q3783–Q3786 define immediate end-attack timing, immunity independence, no Counter timing, and End of Attack trigger preservation.
- Direct IR: both entry timings have the optional aborting own-hand-trash `GrantAuraToOpponents` action with opponent-turn duration and the exact End of Attack delete text. The inherited `whenOpponentAttacks` watcher carries the other-own delete cost before EndAttack and source-instance OncePerTurn. Coverage is full, residual empty, exclusive registration is `registerIrCard("EX6-048", compiled)`, and the test title now names Witchmon.
- Shared primitive trace: a temporary aura attaches to the target permanent, surviving card-stack identity changes until its duration ends, as Q3781 requires. Paid subtrigger sequencing prevents end attack on a failed delete; EndAttack transitions directly to EndOfAttack without affecting the attacker or offering Counter timing.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-049 — Devimon — runtime verified

- Catalog evidence: Purple level 4, play cost 5, 5000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Virus`, trait `Fallen Angel`. On Play/When Digivolving, opponent hand at most five deletes one opposing level-3 Digimon; opponent hand at least seven makes that opponent trash one hand card. Its inherited All Turns clause gives the host +1000 DP while opponent hand is at most six.
- Knowledge base: no local card-specific entries.
- Direct IR: both printed timings duplicate the independent ≤5 opponent level-3 Delete and ≥7 opponent-chosen hand Trash, with exact `zoneCount` predicates. The inherited self Aura carries the live ≤6 opponent hand condition. It retains full coverage, no residuals, and exclusive `registerIrCard("EX6-049", compiled)` registration; the stale suite title now names Devimon.
- Shared primitive trace: hand-count conditions are evaluated against the opponent at each entry action; target resolution enforces level 3 and opponent ownership. The ≥7 trash gives the correct player selection control, while the inherited Aura updates continuously at the six-card boundary.
- Focused runtime proof: shared zone-count branch, opposing level target, opponent hand-trash chooser, multi-entry timing, and continuous Aura suites cover every primitive; the colocated test checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-050 — Feresmon — runtime verified

- Catalog evidence: Purple level 5, play cost 6, 6000 DP, evolves from purple level 4 for 3; form `Ultimate`, trait `Fallen Angel`, with Blocker. When Digivolving and On Deletion, opponent hand at most five gives the controller 1 memory; opponent hand at least seven makes that opponent trash one card. Inherited When Attacking once per turn lets opponent optionally trash one hand card; only if they do not, controller may free-play one own level-3 purple Digimon from trash.
- Knowledge base: no local card-specific entries.
- Direct IR: Static Blocker is explicit. Both printed timing branches have exact ≤5 GainMemory and ≥7 opponent-hand Trash conditions. The inherited leading optional opponent-controlled Trash feeds `ifThisEffectDidNotAct` into an optional purple level-3 own-trash `PlayWithoutCost`, so the fallback is offered only when the opponent does not trash. Coverage is full, residuals empty, registration exclusive `registerIrCard("EX6-050", compiled)`, and the stale title now names Feresmon.
- Shared primitive trace: zone-count conditions are live and owner-relative. The opponent-directed optional trash records whether it actually moved a card; this action result gate—not number of cards—permits the fallback free play. The play resolver restricts to own purple level-3 Digimon in trash, and source-instance frequency controls attacks.
- Focused runtime proof: shared hand-count branches, opponent-controlled optional discard, acted/not-acted conditional tails, free play from trash, color/level filtering, Blocker, and inherited frequency suites cover all primitives; the colocated suite checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: runtime 10/10; focused proof is green.

## EX6-051 — NeoDevimon — runtime verified

- Catalog evidence: Purple level-5 `Fallen Angel`, play cost 7 and 7000 DP. On Play and When Digivolving, it deletes one opposing level-4-or-lower Digimon when the opponent has five or fewer cards in hand and trashes one card in that opponent hand at seven or more; On Deletion, it may play a `DanDevimon` from the controller's trash without cost when the opponent has at least ten trash cards. Its inherited When Attacking once-per-turn lets the opponent trash one hand card, otherwise may play a purple level-3 Digimon from the controller's trash without cost.
- Knowledge base: no NeoDevimon-specific local ruling is recorded.
- Defect corrected: both seven-or-more timing branches now explicitly filter `controller: "opponent"`; the When Digivolving generated branch had still used `controllerDefault: "mine"` despite the printed "their hand" referring to the opponent. The stale module/test identity was also corrected from DanDevimon to NeoDevimon. The inherited opponent-choice branch is scoped to opponent hand and chooser.
- Direct IR and primitive trace: both printed timing entries use independent opponent-hand count gates, then `Delete(level <= 4)` and executable loose-hand `Trash`; the latter now resolves opponent candidates through `candidateLooseInstances` and moves the selected card through the standard trash action. On Deletion uses optional zero-cost trash play of the named DanDevimon, while the inherited acted/not-acted continuation uses the immediate prior-action receipt. Coverage remains full with no residual clauses and exclusive `registerIrCard("EX6-051", compiled)` registration.
- Focused runtime proof: EX6-051 covers opponent-hand targeting and the 5/6/7/10 threshold branches through its colocated public cases.
- Status: runtime 10/10; focused proof is green.

## EX6-052 — Bastemon — runtime verified

- Catalog evidence: Purple level-5 `Beastkin`, play cost 7 and 7000 DP. It has Scapegoat; When Digivolving it may play one purple level-3 Digimon from its controller's trash without cost. Its inherited Opponent's Turn once-per-turn trigger plays one purple level-4-or-lower Digimon from trash without cost when an opponent Digimon is deleted.
- Knowledge base: no Bastemon-specific local ruling is recorded.
- Direct IR: static Scapegoat is explicit; the digivolving branch uses optional `PlayWithoutCost` from controller trash with exact purple/level-3 filtering. The inherited `onDeletionOf` subscription filters the deleted subject to an opponent Digimon and resolves an optional purple level-4-or-lower trash play, gated to Opponent's Turn and once per turn. Coverage is full, residual text is empty, registration is exclusive `registerIrCard("EX6-052", compiled)`, and the stale test title now names Bastemon.
- Shared primitive trace: Scapegoat is installed as a replacement restriction around deletion; `onDeletionOf` carries the deleted permanent as its event subject, so the inherited source filter enforces controller and kind before `PlayWithoutCost` selects from trash. Standard play resolution retains any normal post-play effects while waiving only memory cost.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-053 — LadyDevimon — runtime verified

- Catalog evidence: Purple level-5 `Fallen Angel`, with the printed alternate yellow level-4 evolution, Retaliation, and On Play/When Digivolving branches: with a controller-owned `Mirei Mikagura`, delete one opposing level-4-or-lower Digimon; without Mirei, may play Mirei from trash without cost. Its inherited All Turns clause grants Scapegoat only while the host has `Angel` or `Seven Great Demon Lords`.
- Knowledge base: no EX6-053-specific local ruling is recorded.
- Direct IR and primitive trace: both timing entries independently evaluate `youHave`/`youHaveNone` against the controller's live named-card state, then route to either level-bounded opponent delete or optional named trash play. Retaliation is static; the inherited Aura grants Scapegoat through a live host-trait condition, so it appears and disappears as the host's effective traits change. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-053", compiled)`.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-054 — Lucemon: Chaos Mode — runtime verified

- Catalog evidence: Purple/yellow level-5 `Demon Lord`/`Seven Great Demon Lords`, with alternate `[Lucemon]` evolution for 6. On Play and When Digivolving, the opponent may delete one of their own Digimon or Tamers; if this effect did not delete, trash the opponent security top and gain Recovery +1 (Deck). Its All Turns leave-play replacement returns one controller-owned `[Lucemon]` from this stack or trash to deck bottom, then may play `Lucemon: Satan Mode` or a level-6 `Seven Great Demon Lords` Digimon from trash without cost.
- Knowledge base: Q3716 confirms the follow-up play is optional after satisfying the leave-play return cost; the card-specific simultaneous-trigger ruling records normal timing after this replacement plays an On Play card.
- Direct IR and primitive trace: both timing entries let the opponent control the optional own-permanent deletion, and use the actual-delete receipt for the security-trash/Recovery continuation, so an unavailable or declined delete reaches the fallback. The replacement scopes both its event and its digivolution-card cost to the exact host via the executable `source: "thisDigimon"` mixed-zone selector, while still permitting the controller trash alternative, then resolves optional filtered zero-cost trash play. `SecurityManipulation(trashTop)`, the recovery keyword ledger, replacement timing, and play queue provide the shared execution seams. Registration remains exclusive `registerIrCard("EX6-054", compiled)` with full coverage and no residual text.
- Focused runtime proof: EX6-054 covers host-only stack payment, optional revival, deletion fallback, security trash, Recovery, and replacement timing.
- Status: runtime 10/10; focused proof is green.

## EX6-055 — DanDevimon — runtime verified

- Catalog evidence: Purple level-6 `Fallen Angel`, play cost 11 and 11000 DP. On Play and When Digivolving, delete one opposing level-5-or-lower Digimon; if no deletion occurred, trash one opponent hand card. During the controller's turn, it has Rush and Security Attack +1 while the opponent has five or fewer hand cards.
- Knowledge base: no EX6-055-specific local ruling is recorded.
- Direct IR and primitive trace: each timing sequence evaluates the delete's actual-effect receipt before its opponent-hand `Trash` fallback, correctly retaining the fallback when no legal target exists or deletion is prevented. Two Your Turn Auras independently install Rush and Security Attack +1 on the exact host under the same live opponent-hand count. Delete resolution, `ifThisEffectDidNotAct`, loose-hand trash, and the keyword ledger are all shared executable primitives; coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-055", compiled)`.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: runtime 10/10; focused proof is green.

## EX6-056 — Beelzemon — runtime verified

- Catalog evidence: Purple/black level-6 `Demon Lord`/`Seven Great Demon Lords`, with Rush. On Play and When Digivolving trash the controller's top four deck cards, then, at ten or more trash cards, De-Digivolve one opposing Digimon by two without passing level 3. Its All Turns leave-play replacement (outside battle) places a `Seven Great Demon Lords` card from controller trash as the bottom digivolution card of a `Gate of Deadly Sins` in breeding.
- Knowledge base: Q3791 defines every non-battle leave category covered by the replacement; Q3792 confirms the departing Beelzemon is not itself selectable, because it is not yet in trash at the would-leave timing.
- Direct IR and primitive trace: both timing sequences retain explicit deck trash followed by live ten-card trash count and executable `DeDigivolve(amount: 2, stopAtLevel: 3)` with no unprinted target-level restriction. The exact-self `wouldLeavePlay` replacement has `leaveCause: otherThanBattle`, limits its source to existing trash, and targets only a breeding-area Gate, preserving Q3791/Q3792; `PlaceUnder` handles true bottom placement. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-056", compiled)`.
- Focused runtime proof: EX6-056 covers deck trash, De-Digivolve level floor, leave replacement, existing-trash selection, and breeding-stack placement.
- Status: runtime 10/10; focused proof is green.

## EX6-057 — Lilithmon — runtime verified

- Catalog evidence: Purple level-6 `Demon Lord`/`Seven Great Demon Lords`, play cost 11 and 11000 DP. On Play and When Digivolving, it gives one opposing Digimon an End of Your Turn self-delete until the end of the opponent's turn. Its All Turns once-per-turn non-battle leave replacement deletes one level-5-or-lower Digimon to prevent Lilithmon leaving; its Opponent's Turn once-per-turn trigger trashes the opponent's security top when another Digimon is deleted.
- Knowledge base: Q3793 establishes that the granted delayed self-delete can choose an otherwise-opponent-effect-immune target and takes effect when immunity later ends; Q3794 defines the non-battle leave scope; Q3795 confirms the prevention cost may delete an opponent's eligible Digimon.
- Defect corrected: the Opponent's Turn `onDeletionOf` watcher filtered only out Lilithmon itself, allowing allied Digimon deletions to trash opponent security. It now explicitly requires an opposing Digimon event subject, matching the printed controller boundary.
- Direct IR and primitive trace: `GainTriggeredEffect(endOfTurn)` is granted to an opposing Digimon with `untilOpponentTurnEnd` duration, so it fires at the opponent's end-turn timing. The exact-self `wouldLeavePlay` replacement preserves `otherThanBattle`, once-per-turn, and an `any` controller level-5-or-lower delete cost, matching Q3794/Q3795. The Opponent's Turn watcher uses executable opponent `SecurityManipulation(trashTop)` only after its opposing-subject gate. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-057", compiled)`.
- Focused runtime proof: EX6-057 covers granted-trigger duration, end-turn firing, opponent-owner targeting, prevention cost, leave filtering, and security trash.
- Status: runtime 10/10; focused proof is green.

## EX6-058 — Creepymon — runtime verified

- Catalog evidence: Purple/red level-6 `Demon Lord`/`Seven Great Demon Lords`, with Blocker. On Play and When Digivolving, delete one opposing lowest-DP Digimon, then trash the controller's deck top once for each level of the Digimon actually deleted. Its All Turns non-battle leave replacement puts a controller-owned `Seven Great Demon Lords` card from trash at the bottom of a breeding-area `Gate of Deadly Sins` stack.
- Knowledge base: Q3796 says a deleted level-less Digimon produces zero deck trash; Q3797 defines the non-battle leave scope; Q3798 excludes Creepymon itself from the trash candidate at the would-leave timing.
- Defect corrected: generated IR modeled the follow-up as a generic `Trash` scaled by the controller's current Digimon count, which was neither deck trash nor the deleted target's level. It now uses executable `TrashTopDeck(amount: 1, scaling: lastDeletedLevel)`; generic successful Delete captures the removed target's printed level, and no deletion/level-less target scales to zero. The replacement now explicitly retains non-battle leave cause, trash source, breeding destination, and bottom placement, satisfying Q3797/Q3798.
- Shared primitive trace: the action runner computes the `lastDeletedLevel` scale from the immediately preceding successful Delete and `TrashTopDeck` mills that many real deck cards. The replacement stack uses exact-self would-leave events and `PlaceUnder` zone validation; Blocker uses the standard keyword combat seam. Registration remains exclusive `registerIrCard("EX6-058", compiled)`, with full coverage and no residual clauses.
- Focused runtime proof: EX6-058 covers lowest-DP deletion, level-based deck trash, leave filtering, and bottom placement in the executable `breeding` zone.
- Status: runtime 10/10; focused proof is green.

## EX6-059 — Barbamon — runtime verified

- Catalog evidence: Purple level-6 `Demon Lord`/`Seven Great Demon Lords`, with Scapegoat. On Play and When Digivolving, it trashes one opponent hand card without looking. Its All Turns once-per-turn effect triggers when a card is trashed from opponent hand and may play one purple card with play cost 10 or less from controller trash without cost, reducing that ceiling by one for each opponent hand card.
- Knowledge base: Q3169 distinguishes an actual deletion from a prevented attempt for effect-result wording; Q3799 confirms a purple Tamer is a legal trash-play candidate; Q3800 gives the dynamic ceiling example (four opponent hand cards means cost six or less).
- Direct IR and primitive trace: the hand-trash watcher is scoped to `handTrashedController: opponent` and its optional `PlayWithoutCost` filters controller trash to purple Digimon or Tamers. `playCostLteScaling` begins at 10 and subtracts live opponent-hand count, producing Q3800's ceiling; target selection and zero-cost play are executed by shared play machinery. Generated static Scapegoat and timing text remain intact, full coverage is declared, residual text is empty, and registration is exclusively `registerIrCard("EX6-059", compiled)`.
- Focused runtime proof: EX6-059 uses real hand trash and proves the scaled cost-nine ceiling while rejecting the cost-ten card.
- Status: runtime 10/10; focused proof is green.

## EX6-060 — Belphemon: Rage Mode — runtime verified

- Catalog evidence: Purple/green level-6 `Demon Lord`/`Seven Great Demon Lords`, with alternate `Belphemon: Sleep Mode` evolution for 1. On Play and When Digivolving, it may trash up to three hand cards; for each, suspend one opposing level-5-or-lower Digimon, then delete all opposing suspended Digimon with the lowest play cost. Its non-battle leave replacement places a `Seven Great Demon Lords` card from controller trash at the bottom of a breeding-area `Gate of Deadly Sins` stack.
- Knowledge base: Q3801 defines the replacement's non-battle leave scope; Q3802 excludes the departing card from the trash placement candidate.
- Defect corrected: the When Digivolving repeat lacked the unsuspended candidate gate present in its On Play counterpart, allowing a repeat to consume a selection on an already-suspended Digimon rather than a legal suspend. Both timing branches now require an unsuspended opposing level-5-or-lower Digimon for every paid-hand-card iteration.
- Direct IR and primitive trace: optional hand trash records `trashedCards`; `RepeatPerCount` resolves one legal suspend per actual trash; the final all-target delete selects only suspended opponent Digimon tied for lowest play cost. The exact-self `otherThanBattle` replacement sources only existing trash and targets only an executable `breeding`-zone Gate at bottom, preserving Q3801/Q3802. Coverage is full, residual text is empty, and registration is exclusively `registerIrCard("EX6-060", compiled)`.
- Focused runtime proof: the colocated suite exercises up-to-three hand trash, one legal suspension per card, lowest-cost deletion, leave replacement, and trash-to-breeding placement, including repeat/no-double-suspend boundaries.
- Status: runtime 10/10; focused proof is green.

## EX6-061 — Leviamon — runtime verified

- Catalog/KB evidence: the All Turns once-per-turn watcher triggers on an opponent Digimon play **or** a controller `Seven Great Demon Lords` Digimon play, trashes one hand card to return bottom three sources of an opposing Digimon to deck bottom, then conditionally deletes a stackless opponent Digimon; Q3803 confirms self play can trigger it, while Q3804/Q3805 define its non-battle Gate replacement and exclude the departing card from trash selection.
- Defect corrected: generated IR encoded an AND-like opponent+trait watcher, a whole-permanent return, and a detached delete. Hand-fixed IR uses an executable OR source filter, a new bottom-stack mode on `ReturnTopDigivolutionCards`, nested mandatory Then delete with `boardCountCompare`, and trash-to-`breeding` Gate bottom placement; its primitive now inserts returned bottom-stack cards at deck bottom rather than ignoring the requested position. The bracket-only Gate reference is an exact-name filter, rejecting longer near-name variants.
- Focused runtime proof: the colocated suite exercises both play-watch sources, bottom-three stack return, board-count deletion, non-battle replacement, and breeding placement.
- Status: runtime 10/10; focused proof is green.

## EX6-062 — UltimateChaosmon — runtime verified

- Catalog/KB evidence: DNA evolution may optionally add up to two level-6 trash cards of any color as bottom sources, then returns one opposing Digimon to deck bottom for each level-6 source; Q3806/Q3807 constrain Partition color pairing and Q4736 requires the Then return even without DNA.
- Defect corrected: the pre-placement candidate filter incorrectly restricted level-6 cards to the Partition colors, and the mandatory Then return was optional. The direct IR now accepts any level-6 trash card and retains a non-optional scaled return.
- Focused runtime proof: the colocated suite exercises optional any-color level-6 DNA materials, scaled bottom-deck returns, the no-DNA Then path, and Partition boundaries.
- Status: runtime 10/10; focused proof is green.

## EX6-063 — T.K. Takaishi & Kari Kamiya — runtime verified

- Catalog/KB evidence: On Play/Start Main gives a yellow Digimon Barrier through opponent turn; Your Turn, when a controller Digimon is played or digivolves and has an Angel/Archangel/Three Great Angels trait, suspending this Tamer may gain one memory. Q3808 confirms the digivolved result is evaluated after evolution.
- Defect corrected: generated `raw` trait conditions could not execute. Hand-fixed IR uses `triggerSubjectMatchesFilter` for the exact trait union on both play and digivolve watchers, retaining optional self-suspend cost and Security free play.
- Focused runtime proof: the colocated suite exercises Barrier, Angel-family play/digivolve watchers, controller/non-self filtering, optional suspension, and memory gain.
- Status: runtime 10/10; focused proof is green.

## EX6-064 — Shu-Chong Wong — runtime verified

- Catalog/KB evidence: On Play reveals three and adds one Beast/Beastkin/Holy Beast/Cherub card, bottom-decking the rest. Its Your Turn watcher may suspend this Tamer when a Digimon is suspended by an effect to reduce by two the cost to digivolve one controller Digimon into a hand Beastkin/Holy Beast/Cherub; Security plays it without cost. Q3809 retains normal digivolution requirements; Q3810 permits a non-self controller Digimon base.
- Defect corrected: without an explicit event-subject filter, the shared `whenEffectSuspends` primitive defaults to the watcher host, implementing “this Tamer is suspended” rather than the printed “one of your Digimon.” The watcher now has `triggerFilter: { controller: "mine", kind: ["Digimon"] }`, which preserves Q3810's non-self base while excluding an opponent's suspension.
- Direct IR/primitive trace: `RevealAdd` holds the exact trait union and bottom-decks remainder; the effect-suspend watcher uses the interpreter's executable event-subject filter, while the optional Digivolve retains normal source/requirement validation and applies only `reduceCost: 2` after the self-suspend cost. Security uses standard zero-cost play. Exclusive `registerIrCard("EX6-064", compiled)` registration, full coverage, and no residual clauses are present.
- Focused runtime proof: the colocated suite exercises three-card reveal with bottom-deck remainder, controller/non-self suspension filtering, normal-requirement Beast-family digivolution, cost reduction, and Security play.
- Status: runtime 10/10; focused proof is green.

## EX6-065 — Mythical Arms of Salvation! — runtime verified

- Catalog/KB evidence: the optional trash placement is followed by mandatory battle-area placement; its non-self-effect leave condition arms Delay, whose play must use the triggering Digimon's stack. Q3815 defines leave scope and Q3816 confirms the resulting play timing can activate RaijiLudomon's inherited prevention.
- Direct IR/primitive trace: Main has optional `PlaceUnder` then mandatory `PlaceInBattleAreaSelf`; the intrinsic `whenDigimonWouldLeave` Delay trigger explicitly gates `otherThanYourEffect` using preserved removal cause/effect-owner provenance. Its nested zero-cost play sources only the triggering subject's digivolution cards, preserving that subject through Delay activation. Registration is exclusive `registerIrCard("EX6-065", compiled)`.
- Focused runtime proof: the colocated suite exercises Main placement, Security placement, Delay arming from a qualifying leave, zero-cost play from the triggering stack, and a neutral aggregate fixture that cannot activate unrelated leave prevention.
- Status: runtime 10/10; focused proof is green.

## EX6-066 — Sea of Destruction — runtime verified

- Catalog/KB evidence: Main places an Aqua/Sea Animal Digimon card from hand under a blue host, then returns all opponent Digimon at the placed card's level; Security returns all lowest-level opponent Digimon. Q3817 confirms the comparison is the placed card's level, not the blue host's.
- Direct IR/primitive trace: the atomic place cost restricts the hand source by Aqua/Sea Animal and host by blue, stores `placedCardLevel`, and the subsequent all-target return consumes that binding. Security uses lowest-level all-target return. Full coverage, no residuals, and exclusive `registerIrCard("EX6-066", compiled)` registration are present.
- Status: runtime 10/10; focused proof is green.

## EX6-067 — Final Excalibur — runtime verified

- Catalog evidence: Main unsuspends one controller Angel/Archangel/Three Great Angels Digimon, or all such Digimon instead while the controller has Dominimon. Security gains Recovery +1 (Deck), then adds this card to hand.
- Direct IR/primitive trace: mutually exclusive `youHaveNone`/`youHave` named-card gates select count one/all over the exact trait union; Security sequences the recovery keyword action before `AddToHandSelf`. Full coverage, no residual text, and exclusive `registerIrCard("EX6-067", compiled)` registration are present.
- Focused runtime proof: the colocated suite exercises the named Dominimon gate, one/all Angel-family unsuspends, Recovery +1, and Security-to-hand sequencing.
- Status: runtime 10/10; focused proof is green.

## EX6-068 — Descent of the Three Great Angels — runtime verified

- Catalog/KB evidence: Main may place an Angel/Archangel/Three Great Angels hand Digimon at bottom security, then places this Option in battle; its deletion watcher arms Delay to search security, optionally play a Three Great Angels Digimon found there without cost, then shuffle. Q3818 confirms Main may still place the Option when no qualifying hand card is placed.
- Direct IR/primitive trace: optional executable `SecurityManipulation(placeAsSecurity, toTop:false)` precedes mandatory `PlaceInBattleAreaSelf`; the deletion watcher is intrinsically Delay-armed and uses `SearchSecurity` with nested optional zero-cost play followed by explicit security shuffle. Security directly places the Option in battle. Full coverage, no residual text, exclusive `registerIrCard("EX6-068", compiled)`.
- Focused runtime proof: the colocated suite exercises optional bottom-security placement, mandatory Option placement, deletion-armed Delay, security search/play, and shuffle.
- Status: runtime 10/10; focused proof is green.

## EX6-069 — Rise of the Seven Great Demon Lords — runtime verified

- Catalog/KB evidence: Main optionally places a Seven Great Demon Lords card from hand/trash under a breeding Gate, then places itself in battle; deletion arms Delay to optionally play one such Digimon specifically from that Gate's digivolution cards. Q3819 permits the Main Option placement even without a source card.
- Defects corrected: the Delay play could enumerate unrelated own stacks, and the Main placement defaulted directly below the stack top rather than the printed bottom. Its `hostFilter` now explicitly restricts digivolution-card candidates to an exact-name controller-owned `Gate of Deadly Sins` in `breeding`; the Main placement uses the same exact-name Gate filter and explicitly sets `position: "bottom"`.
- Focused runtime proof: the five-case colocated suite executes Main placement, the optional breeding placement, Q3819's decline path, Security placement, and the public Delay activation that plays specifically from the breeding Gate's sources.
- Status: runtime 10/10; focused proof is green.

## EX6-070 — Phantom Pain — runtime verified

- Catalog/KB evidence: Main gives an opposing Digimon delayed end-turn self-deletion then places this Option in battle; at opponent end, a controller Lilithmon condition arms Delay to optionally delete an unsuspended opponent Digimon. Q3820/Q4255 cover target immunity expiry and breeding relocation timing.
- Defect corrected: automatic Delete with a self-delete cost did not model an executable Delay. End-of-opponent-turn now grants Delay under the Lilithmon condition, and a Delay-keyword Main entry carries optional armed-only unsuspended opponent deletion; its self-trash activation cost is paid once by the Delay wrapper, not again by the payload. The shared OnDeclaration wrapper now also stops that payload when source trash is prevented or fails, matching the other Delay wrappers.
- Focused runtime proof: the colocated suite exercises the positive end-of-opponent-turn arm and public Delay activation through the Option permanent, observing target deletion and source trash, plus the source-trash failure boundary that leaves an unsuspended opponent Digimon intact.
- Status: runtime 10/10; focused proof is green.

## EX6-071 — Pandemonium Lost — runtime verified

- Catalog/KB evidence: at five or more opponent hand cards, the opponent trashes one; Then delete one opposing Digimon with level at least their current hand count. Q3821 confirms the deletion remains processable below five cards.
- Defect corrected: the generated gate incorrectly skipped both clauses. IR now has a conditional opponent-chosen hand Trash followed by unconditional level-scaled Delete.
- Status: runtime 10/10; focused proof is green.

## EX6-072 — Mega Digimon Assembly! — runtime verified

- Catalog/KB evidence: color requirements waive against an opposing level-6-or-higher Digimon; Main optionally DNA digivolves one controller level-6 battle Digimon and one controller hand card into a level-7 hand Digimon, retaining required material legality (Q3822); Security returns one level-6-or-higher trash Digimon then adds this Option to hand.
- Direct IR/primitive trace: independent battle/hand material slots feed `DnaDigivolve`, with target level seven and normal requirements; Security sequences loose trash return then `AddToHandSelf`. The focused test now correctly identifies Mega Digimon Assembly!, with full coverage and exclusive registration.
- Focused runtime proof: the colocated suite exercises Main DNA legality and the public Security sequence, observing a level-6-or-higher Digimon returned from trash before this Option is added to hand.
- Status: runtime 10/10; focused proof is green.

## EX6-073 — Ogudomon — runtime verified

- Catalog/KB evidence: When Digivolving/Attacking it places up to seven distinct-named Seven Great Demon Lords cards from trash under itself; four or more placed in one activation enables deletion. Its attack cost returns seven qualifying cards from this Digimon's stack to deck bottom, then deletes up to seven opponent Digimon/Tamers and trashes opponent security for seven minus actual deletions. Q3823–Q3827 define name distinctions, per-activation Q3825, all-seven Q3826, and actual-delete scaling Q3827.
- Defects corrected: each placement target itself requires distinct names, then overwrites both placement tallies with zero before every activation (including declined/blocked zero placement), so the four-card gate cannot reuse a prior activation. The paid attack deletes only after returning exactly seven distinct-named qualifying cards from this source Digimon's own stack to deck bottom (`isSelfRef` plus defensive `sameHost`); the shared stack-return cost seam now honors `position: "bottom"` as a bottom-deck destination (while `pickLoose` enforces distinct names), and its target is no longer permissively `upTo`, so it must delete seven when seven targets are legal; the security amount reads the actual deletion receipt.
- Focused runtime proof: the colocated suite exercises exact security scaling, own-stack-only seven-card payment, distinct-name deduplication, zero/prevented-delete boundaries, and per-activation reset behavior.
- Status: runtime 10/10; focused proof is green.

## EX6-074 — Mirei Mikagura — runtime verified

- Catalog evidence: after a controller Holy Beast/Archangel/Fallen Angel Digimon is played, suspending this Tamer gains one memory, then one controller Digimon may digivolve into Angewomon/LadyDevimon from trash with cost reduced by one. End of turn once-per-turn offers normal-requirement DNA Digivolve; Security plays this Tamer.
- Defect corrected: the reduced Digivolve was detached as a top-level Your Turn action. It is now nested after the qualifying-play watcher’s optional, aborting self-suspend GainMemory head, preserving the printed Then sequence: a declined or unpayable Mirei cannot continue to the optional Digivolve, while the controller may decline activation. Its bracket-only Angewomon/LadyDevimon destinations use exact-name matching and reject longer variants.
- Focused runtime proof: the colocated suite exercises a qualifying play into suspend/memory/reduced trash digivolution for any controller Digimon, the declined/unpayable boundary, end-of-turn DNA once per turn, and public Security play.
- Status: runtime 10/10; focused proof is green.
