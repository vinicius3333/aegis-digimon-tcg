# BT9 Card Implementation Audit

This ledger is built strictly in ascending card-ID order. A card receives 10/10 only after its complete catalog contract and local knowledge-base record are inspected, every clause is traced through its direct compiled-IR module and relevant shared primitives, observable focused tests cover the applicable positive and negative boundaries, and the recorded verification commands pass.

## BT9-001 — Koromon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-2 Digi-Egg, `In-Training` form, `Lesser` type, no evolution recipe, no main or Security text, and a four-copy limit were checked in `packages/shared/src/cards/data/cards.json`.
2. **Printed inherited timing (1/1):** `[Your Turn]` is encoded as an inherited `YourTurn` continuous effect, so the grant is absent during the opponent's turn.
3. **Agumon name branch (1/1):** `selfHasNameContaining` includes `Agumon`; a Koromon-under-Agumon X stack receives exactly +1000 DP.
4. **Greymon name branch (1/1):** The same OR condition includes `Greymon`; a Koromon-under-Greymon stack receives exactly +1000 DP.
5. **Negative name boundary (1/1):** A Koromon-under-Elecmon peer remains at printed DP, proving the aura is not an unconditional inherited modifier.
6. **Amount and recipient (1/1):** `Aura` targets `isSelfRef` and applies `modifyDP: 1000` only to the live carrier, with no other friendly permanent modified.
7. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-001` returns no rulings, errata, restrictions, or unresolved ambiguity.
8. **Direct IR and registration (1/1):** `apps/api/src/cards/BT9/BT9-001.ts` has `coverage: "full"`, an empty residual list, and exactly one executable registration: `registerIrCard("BT9-001", compiled)`; it contains no `registerCard` call.
9. **Primitive and stack trace (1/1):** `runStaticAction` re-evaluates the aura continuously; `selfHasNameContaining` checks the carrier's live top-card English name with case-insensitive OR semantics; a public legal breeding evolution and breeding-area move preserve Koromon beneath Agumon X, whose DP is then observed at 3000 on that same constructed stack.
10. **Reproducible verification (1/1):** Focused proof passed 4/4, the `LANE-F-14` shared name-condition regression passed 4/4, workspace typecheck passed, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-001
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-001.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-001.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts -t 'LANE-F-14' --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-001.

## BT9-002 — Puyoyomon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Blue level-2 Digi-Egg, `In-Training` form, `Lesser` type, no evolution recipe, no main or Security text, and the inherited text were checked directly in the committed catalog.
2. **Turn timing (1/1):** The inherited watcher is installed only by `YourTurn`; an effect-driven addition during the opponent's turn produces no DP change.
3. **Effect-add event (1/1):** `whenEffectAddsToHand` is the live event fired by both draw and return primitives, rather than the obsolete unfired event name.
4. **Q1794 return ruling (1/1):** Returning a controller-owned card from trash to hand by an effect triggers the inherited effect and leaves that card observably in hand.
5. **Q1795 draw ruling (1/1):** A public play intent for Gabumon's `[On Play] Draw 1` triggers the effect; a direct draw-plus-later-return scenario also proves the ruling's independence from later hand changes.
6. **Controller boundary (1/1):** The subtrigger gate compares `effectAddedToHandSeat` with the source owner; an opponent's effect-driven hand addition does not trigger Puyoyomon.
7. **Once-per-turn identity (1/1):** A draw followed by a separate return-to-hand event in the same turn still grants only +1000 DP, proving the inherited source's shared `OncePerTurn` key.
8. **Amount, target, and duration (1/1):** The nested action applies `ModifyDP` +1000 to `isSelfRef` for `forTheTurn`; the realistic buried Digi-Egg source modifies only its carrier.
9. **Direct IR and registration (1/1):** `BT9-002.ts` has full compiled coverage, no residual clauses, and exactly one `registerIrCard("BT9-002", compiled)` call with no legacy `registerCard` registration.
10. **Reproducible verification (1/1):** Focused proof passed 6/6; the card-specific and shared hand-addition seam regressions passed 6/6 with 18 unrelated cases skipped; workspace typecheck and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-002
rg -n 'Q1794|Q1795' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-002.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-002.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-002.subtrigger.test.ts src/engine/subTriggerSeams.test.ts -t 'whenEffectAddsToHand' --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-002.

## BT9-003 — Tokomon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Yellow level-2 Digi-Egg with `In-Training` form and the complete `Lesser`/`X Antibody` trait set; no evolution, main, or Security clauses are present.
2. **Turn timing (1/1):** The inherited `YourTurn` watcher is absent during the opponent's turn, directly covering the printed turn restriction.
3. **Security-add trigger (1/1):** `whenAddSecurity` is exercised through the real `addSecurity` primitive, not by manually firing the watcher event.
4. **Q1796 net-security ruling (1/1):** A direct net-neutral remove-and-recovery sequence proves the ruling boundary, while a public play intent for MagnaAngemon's `[On Play] Recovery +1` independently proves the live recovery trigger path.
5. **Controller boundary (1/1):** `triggerSecurityIsYours` accepts additions to the source controller's security and rejects an otherwise identical addition to the opponent's security.
6. **Target boundary (1/1):** With two opposing Digimon, exactly one preferred target receives the reduction and the unchosen peer remains at printed DP.
7. **Amount and duration (1/1):** The selected target changes from 3000 DP to 2000 DP through `ModifyDP: -1000` with `forTheTurn` duration.
8. **Once-per-turn identity (1/1):** Two separate security additions in the same turn produce only one -1000 DP grant from the buried Tokomon source.
9. **Direct IR and registration (1/1):** `BT9-003.ts` has full compiled coverage, no residual clauses, and exactly one `registerIrCard("BT9-003", compiled)` registration with no legacy `registerCard` call.
10. **Reproducible verification (1/1):** Focused proof passed 6/6; the shared `whenAddSecurity` mechanism suite passed 3/3; workspace typecheck and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-003
rg -n 'Q1796' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-003.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-003.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/whenAddSecurity.test.ts --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-003.

## BT9-004 — Motimon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Green level-2 Digi-Egg, `In-Training` form, `Lesser` type, no evolution recipe, no main or Security text, and the complete inherited text were checked in the catalog.
2. **Inherited placement (1/1):** A public legal green breeding evolution preserves Motimon beneath the Insectoid Tentomon at cost 0; after the public breeding-area move, that same constructed stack is observed at 3000 DP from the inherited +1000 aura.
3. **Turn timing (1/1):** `YourTurn` grants the modifier only while Motimon's controller owns the turn; the same stack remains at printed DP during the opponent's turn.
4. **Exact trait branch (1/1):** A carrier whose sole relevant type is `Insectoid` receives exactly +1000 DP.
5. **Complete trait-union branch (1/1):** A carrier with `Insectoid` plus `X Antibody` also matches, proving the condition checks the full trait union rather than a single fixed slot.
6. **Negative trait boundary (1/1):** An otherwise valid Digimon carrier without `Insectoid` remains at printed DP.
7. **Amount and recipient (1/1):** The continuous `Aura` applies `modifyDP: 1000` to `isSelfRef`, modifying only the Motimon carrier.
8. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-004` returns no rulings, errata, restrictions, or unresolved ambiguity.
9. **Direct IR and registration (1/1):** `BT9-004.ts` has full coverage, no residual clauses, and exactly one `registerIrCard("BT9-004", compiled)` registration with no legacy `registerCard` call.
10. **Reproducible verification (1/1):** Focused proof passed 4/4; the shared `condition.selfHasTrait` regression passed 3/3 with 287 unrelated cases skipped; a clean rerun of workspace typecheck and `git diff --check` passed (the preceding attempt was host-killed with exit 137 and emitted no diagnostic).

### Reproduce

```bash
node tools/kb/query.mjs card BT9-004
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-004.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-004.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/capabilities.test.ts -t 'condition.selfHasTrait' --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-004.

## BT9-005 — Tumblemon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Black level-2 Digi-Egg, `In-Training` form, `Rock` type, no evolution recipe, no main or Security text, and the complete inherited text were checked in the catalog.
2. **Inherited placement (1/1):** A public legal black breeding evolution preserves Tumblemon beneath the printed-Blocker Gotsumon at cost 0; after the public breeding-area move, that same constructed stack is observed at 4000 DP on the opponent's turn and 3000 on its controller's turn.
3. **Opponent-turn timing (1/1):** `OpponentsTurn` grants the modifier when the opposing seat owns the turn and rejects the same Blocker stack on Tumblemon's controller's turn.
4. **Blocker-positive boundary (1/1):** A Monochromon carrier exposes its printed Blocker keyword through the live keyword service and receives the bonus.
5. **Blocker-negative boundary (1/1):** An Elecmon carrier without Blocker remains at printed DP during the otherwise valid opponent-turn window.
6. **Amount (1/1):** The qualifying 6000-DP carrier becomes exactly 7000 DP, proving the printed +1000 value.
7. **Recipient isolation (1/1):** The `Aura` targets `isSelfRef`; the nearby non-Blocker carrier is unchanged.
8. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-005` returns no rulings, errata, restrictions, or unresolved ambiguity.
9. **Direct IR and registration (1/1):** `BT9-005.ts` has full coverage, no residual clauses, and exactly one `registerIrCard("BT9-005", compiled)` registration with no legacy `registerCard` call.
10. **Reproducible verification (1/1):** BT9-005 focused proof passed 4/4; the symmetric BT2-005 keyword-aura peer passed 3/3; workspace typecheck and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-005
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-005.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-005.test.ts src/cards/BT2/BT2-005.test.ts --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-005.

## BT9-006 — Pagumon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Purple level-2 Digi-Egg, `In-Training` form, `Lesser` type, no evolution recipe, no main or Security text, and the complete inherited text were checked in the catalog.
2. **Inherited attack timing (1/1):** The effect is `isInherited` and triggers through a real public attack intent from a Pagumon evolution stack.
3. **Optionality (1/1):** Refusal preserves the hand card and grants no DP, proving the “may” wrapper resolves before payment.
4. **Payability boundary (1/1):** An empty hand cannot pay the trash cost and receives no bonus while the attack itself proceeds normally.
5. **Any-card cost — Tamer (1/1):** A Tamer card is accepted as the one-card hand cost and moves observably to trash.
6. **Any-card cost — Option (1/1):** An Option card is also accepted, proving the filter is not silently restricted to Digimon.
7. **Amount and duration (1/1):** The qualifying carrier changes from 3000 to exactly 4000 DP via +1000 `forTheTurn`.
8. **Recipient isolation (1/1):** `isSelfRef` modifies only the attacking carrier; a nearby friendly Digimon remains at printed DP.
9. **Direct IR, registration, and KB (1/1):** The direct module has full coverage, no residual clauses, exactly one `registerIrCard("BT9-006", compiled)`, no legacy registration, and the KB query returns no rulings or ambiguity.
10. **Reproducible verification (1/1):** Focused public-intent proof passed 5/5; workspace typecheck and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-006
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-006.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-006.test.ts --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-006.

## BT9-007 — Minidekachimon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-3 Digimon, `Rookie` form, `Data` attribute, `Mini Dragon` type, 3000 DP, common rarity, image identity, and four-copy limit were checked directly.
2. **Effectless contract (1/1):** The catalog has no main, inherited, or Security text; the direct compiled module therefore contains exactly `effects: []` with full coverage and no residual clause.
3. **Play cost (1/1):** A public play intent spends exactly 2 memory and puts Minidekachimon in the battle area.
4. **No spurious behavior (1/1):** The completed play opens no decision or effect stack, proving the empty IR does not invent behavior.
5. **Evolution level (1/1):** A realistic level-2 Digi-Egg stack accepts the level-3 evolution.
6. **Evolution color (1/1):** A red Digi-Egg accepts the printed recipe while a same-level blue Digi-Egg is rejected without zone mutation.
7. **Evolution cost (1/1):** The accepted evolution spends exactly 0 memory and preserves Minidekachimon as the observable top card.
8. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-007` returns no rulings, errata, restrictions, or unresolved ambiguity.
9. **Direct IR and registration (1/1):** `BT9-007.ts` registers the complete empty IR exactly once through `registerIrCard`; the set index imports it and neither file introduces `registerCard`.
10. **Reproducible verification (1/1):** The independently focused suite passed 4/4; workspace typecheck, formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-007
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-007.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-007.test.ts --reporter=dot
pnpm typecheck
pnpm exec oxfmt --check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-007.ts apps/api/src/cards/BT9/BT9-007.test.ts apps/api/src/cards/BT9/effectlessAudit.testkit.ts apps/api/src/cards/BT9/index.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-007.

## BT9-008 — Agumon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-3, play cost 3, 2000 DP, `Rookie`/`Vaccine`, complete `Dinosaur`/`X Antibody` traits, standard red-level-2 evolution for 0, and all printed text were checked.
2. **On Play timing and payment (1/1):** A public play intent spends exactly 3 memory and resolves the reveal contract.
3. **When Digivolving timing (1/1):** A public evolution intent into Agumon X resolves the same reveal contract and preserves the source stack.
4. **Greymon and Omnimon name union (1/1):** Comparative single-bucket cases separately add Greymon and Omnimon while bottoming both misses.
5. **X Antibody bucket (1/1):** A comparative single-bucket case adds the exact `X Antibody`-named card and bottoms both misses.
6. **Q1797 partial availability (1/1):** Each of the three sole-available branches resolves independently instead of requiring both add buckets.
7. **Q1798 mandatory maximum (1/1):** When a Greymon and X Antibody are both revealed, both cards enter hand and only the nonmatch remains on deck bottom.
8. **Evolution recipes (1/1):** The alternate exact Agumon evolution, standard red Digi-Egg evolution, and wrong-color blue Digi-Egg rejection are all exercised at cost 0.
9. **Direct IR and registration (1/1):** Both timings carry identical capped `RevealAdd` buckets, full coverage, no residual clauses, and exactly one `registerIrCard("BT9-008", compiled)` registration with no legacy registration.
10. **Reproducible verification (1/1):** Focused proof passed 5/5 (including three Q1797 comparative subcases); workspace and API typechecks and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-008
rg -n 'Q1797|Q1798' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-008.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-008.test.ts --reporter=dot
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-008.

## BT9-009 — Guilmon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-3 Digimon, play cost 4, 3000 DP, `Rookie`/`Virus`, complete `Dark Dragon`/`X Antibody` traits, standard red-level-2 evolution for 0, and all printed text were checked directly.
2. **Printed deletion timing (1/1):** A public evolution intent fires the mandatory `[When Digivolving]` deletion and resolves the stack before assertions.
3. **Printed numeric boundary (1/1):** The effect deletes an opposing Digimon at exactly 3000 DP while an otherwise eligible 4000-DP peer remains in play.
4. **Standard evolution route (1/1):** A legal red Digi-Egg-to-Guilmon-X evolution spends the printed 0 memory and exposes the effect source on the resulting stack.
5. **Alternate evolution route (1/1):** A complete legal Digi-Egg-to-Guilmon-to-Guilmon-X chain exercises the exact-name alternate requirement through its public intent at cost 0.
6. **Inherited placement and timing (1/1):** A public breeding evolution, breeding-area move, and subsequent Champion evolution preserve Guilmon X as an inherited source on the live carrier during its controller's turn.
7. **Q1799 fixed-ceiling ruling (1/1):** On that same legally constructed stack, Growlmon's printed 3000-DP deletion deletes a 4000-DP target, proving the inherited +1000 applies to a numeric maximum.
8. **Q1800 relative-ceiling ruling (1/1):** On a legal Guilmon-X-to-Meramon stack, Meramon's source-relative 4000-DP deletion leaves a 5000-DP target in play, proving the modifier does not alter a nonnumeric threshold.
9. **Direct IR and registration (1/1):** `BT9-009.ts` has full coverage, no residual clauses, both printed effects and the alternate recipe, and exactly one `registerIrCard("BT9-009", compiled)` registration with no legacy registration; the set index imports it.
10. **Reproducible verification (1/1):** Focused proof passed 5/5; the shared deletion-DP mechanism suite, workspace typecheck, formatting check, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-009
rg -n 'Q1799|Q1800' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-009.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-009.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/cards/deletionDpCluster.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-009.ts apps/api/src/cards/BT9/BT9-009.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-009.

## BT9-010 — Atamadekachimon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-4 Digimon, play cost 5, 7000 DP, `Champion` form, `Data` attribute, `Dinosaur` type, common rarity, image identity, and four-copy limit were checked directly.
2. **Effectless contract (1/1):** The catalog contains no main, inherited, or Security text; the direct compiled module therefore contains exactly an empty effect list, full coverage, and no residual clause.
3. **Play cost (1/1):** A public play intent spends exactly 5 memory and moves Atamadekachimon from hand to the battle area.
4. **No spurious behavior (1/1):** The completed play leaves no pending decision or unresolved effect, proving the empty IR invents no behavior.
5. **Complete legal evolution stack (1/1):** Public intents build Koromon-to-Minidekachimon-to-Atamadekachimon in the breeding area rather than injecting a prebuilt level-3 source.
6. **Evolution level and color (1/1):** The complete chain proves the printed red level-3 requirement, while a same-level blue source is rejected as an invalid evolution.
7. **Evolution cost and stack preservation (1/1):** The final evolution spends exactly 2 memory and leaves Koromon and Minidekachimon in order beneath the Atamadekachimon top card.
8. **Knowledge base (1/1):** `node tools/kb/query.mjs card BT9-010` reports no rulings, errata, restrictions, or unresolved ambiguity.
9. **Direct IR and registration (1/1):** `BT9-010.ts` registers executable behavior exactly once through `registerIrCard`, contains no `registerCard`, and the BT9 set index imports the module.
10. **Reproducible verification (1/1):** The focused suite passed 4/4 and the shared helper regression passed 4/4; workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-010
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-010.ts
rg -n 'BT9-010' apps/api/src/cards/BT9/index.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-010.test.ts src/cards/BT9/BT9-007.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-010.ts apps/api/src/cards/BT9/BT9-010.test.ts apps/api/src/cards/BT9/effectlessAudit.testkit.ts apps/api/src/cards/BT9/index.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-010.

## BT9-011 — Growlmon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-4 Digimon, play cost 5, 6000 DP, `Champion`/`Virus`, complete `Dark Dragon`/`X Antibody` traits, standard red-level-3 evolution for 2, and all printed text were checked.
2. **Effect placement and timing (1/1):** The sole effect is inherited and active during its controller's turn; it is not encoded as an unconditional DP modifier or top-card effect.
3. **Alternate evolution route (1/1):** Public intents build a complete Koromon-to-Guilmon-X-to-Growlmon-to-Growlmon-X breeding stack and exercise the exact Growlmon alternate recipe for 0.
4. **Standard evolution route (1/1):** The catalog and public stack continuations prove the ordinary red level-3 recipe and its printed 2-memory cost.
5. **Stack preservation (1/1):** The alternate route asserts the ordered three-card source stack beneath Growlmon X after all evolution effects settle.
6. **Q1801 fixed-ceiling ruling (1/1):** On a legal stack carrying Growlmon X, WarGrowlmon's printed 4000-DP deletion removes a 5000-DP target, proving the inherited +1000 applies to numeric maxima.
7. **Q1802 relative-ceiling ruling (1/1):** The same legal chain continues to WarGreymon X; its public attack leaves a 13000-DP target outside its source-relative 12000-DP deletion, proving the modifier is not applied to nonnumeric thresholds.
8. **Knowledge base (1/1):** Both local rulings, their fixed-versus-relative distinction, and the absence of errata or restrictions were inspected with the card query.
9. **Direct IR and registration (1/1):** `BT9-011.ts` has full coverage, no residual clauses, the exact alternate requirement, and exactly one `registerIrCard("BT9-011", compiled)` call with no legacy registration; the set index imports it.
10. **Reproducible verification (1/1):** Focused proof passed 4/4; the shared deletion-DP mechanism suite, workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-011
rg -n 'Q1801|Q1802' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-011.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-011.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/cards/deletionDpCluster.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-011.ts apps/api/src/cards/BT9/BT9-011.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-011.
