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

## BT9-012 — Greymon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-4 Digimon, play cost 5, 6000 DP, `Champion`/`Vaccine`, complete `Dinosaur`/`X Antibody` traits, standard red-level-3 evolution for 2, and all printed text were checked.
2. **Inherited all-turn replacement (1/1):** The compiled inherited `AllTurns` watcher installs an optional `wouldLeavePlay` prevention rather than an immunity or post-removal recovery.
3. **Name boundary (1/1):** A Greymon-name carrier can prevent leaving, while an otherwise identical non-Greymon/non-Omnimon carrier is removed.
4. **Q1803 same-level cost (1/1):** Two level-4 sources pay the replacement cost; a level-4/level-3 pair cannot, proving the cards must share a level with each other rather than the carrier.
5. **Q1804 self-payment (1/1):** The legal-stack Gaia Force scenario observably trashes Greymon X itself together with the other level-4 Greymon while its MetalGreymon carrier remains.
6. **Covered destinations (1/1):** Effect-driven deletion, return to hand, and return to deck are each prevented after the same-level cost resolves.
7. **Q1805 cause boundary (1/1):** Rule deletion removes the full stack without offering prevention, while an otherwise identical effect deletion can be prevented.
8. **Optional refusal (1/1):** A public optional decision can be declined; the carrier then leaves and the two source cards remain unpaid until normal stack disposal.
9. **Legal evolution, direct IR, and registration (1/1):** Public intents build Koromon-to-Agumon-X-to-Greymon-to-Greymon-X-to-MetalGreymon, including the 0-cost exact-name alternate route; the full/no-residual module registers once with `registerIrCard` and is imported by the set index.
10. **Reproducible verification (1/1):** Focused proof passed 6/6; the shared leave-prevention suite, workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-012
rg -n 'Q1803|Q1804|Q1805' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-012.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-012.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/leavePrevent.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-012.ts apps/api/src/cards/BT9/BT9-012.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-012.

## BT9-013 — OmniShoutmon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-5 Digimon, play cost 8, 8000 DP, `Ultimate`/`Vaccine`, complete `Dragonkin`/`X Antibody` traits, standard red-level-4 evolution for 3, and all printed text were checked.
2. **Blitz timing (1/1):** A public standard evolution that passes 3 memory opens the real `activateBlitz` decision; accepting it authorizes and completes a public attack despite memory being on the opponent's side.
3. **Standard legal evolution (1/1):** Public intents build Koromon-to-Agumon-X-to-Greymon, move the stack from breeding, and evolve to OmniShoutmon X for exactly 3.
4. **Alternate legal evolution (1/1):** A complete red chain reaches OmniShoutmon and exercises the exact-name alternate route to OmniShoutmon X for 0.
5. **Unsuspended-target permission (1/1):** The legally alternate-evolved stack successfully declares an attack against an opposing unsuspended Digimon.
6. **Q1806 OmniShoutmon name branch (1/1):** The exact OmniShoutmon card name in the legal stack enables the permission.
7. **Q1806 X Antibody distinction (1/1):** A card named exactly `X Antibody` enables the permission, while Greymon X's `X Antibody` trait alone does not.
8. **Turn boundary (1/1):** The permission is absent during the opponent's turn even with an otherwise qualifying exact-name source.
9. **Direct IR and registration (1/1):** The incorrect unsupported nested filter was replaced by the executable `digivolutionStackNameOrTrait` exact-name predicate; the module has full coverage, no residual clauses, one `registerIrCard` registration, no legacy registration, and a set-index import.
10. **Reproducible verification (1/1):** Focused proof passed 5/5; the shared Blitz regression passed, workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-013
rg -n 'Q1806' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-013.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-013.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/cards/BT8/BT8-013.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-013.ts apps/api/src/cards/BT9/BT9-013.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-013.

## BT9-014 — WarGrowlmon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-5 Digimon, play cost 8, 8000 DP, `Ultimate`/`Virus`, complete `Cyborg`/`X Antibody` traits, standard red-level-4 evolution for 3, and all printed text were checked.
2. **Alternate legal evolution (1/1):** Public intents build a complete Guilmon-X/Growlmon/Growlmon-X/WarGrowlmon chain and exercise the exact WarGrowlmon alternate evolution for 0.
3. **Aura recipient count (1/1):** The shared action now resolves the printed target instead of ignoring it; deleting all three opposing candidates produces exactly two memory-loss triggers.
4. **Aura body and ownership (1/1):** Each selected opponent Digimon receives `[On Deletion] Lose 1 memory`; deletion changes memory in the correct seat-relative direction.
5. **Aura duration (1/1):** The installed watcher uses `untilOpponentTurnEnd`, matching the printed duration rather than a permanent grant.
6. **Optional aggregate deletion (1/1):** The second action is an optional `DeleteByDPBudget`, allowing any legal combination rather than forcing a single target.
7. **Exact budget and inherited modifiers (1/1):** Two 3000-DP targets fit the printed 6000 total; Guilmon X and Growlmon X inherited modifiers raise a legal combined selection to 8000.
8. **Q1807 name boundary (1/1):** A WarGrowlmon exact-name source enables deletion, while an `X Antibody` trait-only Greymon X source does not.
9. **Direct IR and registration (1/1):** The module has full coverage, no residual clauses, both ordered actions, exactly one `registerIrCard("BT9-014", compiled)` call, no legacy registration, and a set-index import.
10. **Reproducible verification (1/1):** Focused proof passed 6/6; the shared granted-effect regression passed 2/2; API/workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-014
rg -n 'Q1807' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-014.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-014.test.ts src/cards/BT15/BT15-068.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-014.ts apps/api/src/cards/BT9/BT9-014.test.ts apps/api/src/engine/effects/interpreter/actions/statics.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-014.

## BT9-015 — MetalGreymon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-5 Digimon, play cost 8, 8000 DP, `Ultimate`/`Vaccine`, complete `Cyborg`/`X Antibody` traits, standard red-level-4 evolution for 3, and all printed text were checked.
2. **Security Attack grant (1/1):** Every successful evolution grants exactly `Security Attack +1`, including an unrelated legal red level-4 source that fails the conditional DP branch.
3. **Conditional DP grant (1/1):** A qualifying source changes MetalGreymon X from 8000 to exactly 11000 DP; an unrelated source remains at 8000.
4. **Q1808 exact names (1/1):** Exact `MetalGreymon` and exact `X Antibody` card-name branches qualify; an X Antibody trait and the longer `MetalGreymon (X Antibody)` name do not.
5. **Q1809 activation-time snapshot (1/1):** A public `playCard` intent resolves BT9-109's `[Main]` placement after evolution; adding exact X Antibody at that point does not retroactively grant +3000 DP.
6. **Q1967 Venusmon ordering (1/1):** On a complete legal stack facing Venusmon, this evolution's actions finish and reach 11000 DP before Venusmon suppresses later `[When Digivolving]`/`[When Attacking]` activations.
7. **Distinct durations (1/1):** An opponent-turn activation driven inside `runOneTurn()` proves `Security Attack +1` expires through the real current close-turn sequence, while `+3000 DP` (encoded as `untilOpponentNextTurnEnd`) survives that close and the owner's following real turn before expiring at the next opponent close. The special marker is rejected by the generic duration mapper and accepted only by one-shot, exactly-one-target `ModifyDP`: runtime negatives reject player-wide, continuous, combined-keyword, budget-based, scaled-count, and multi-ID `sameTarget` routes before any grant lands.
8. **Legal alternate evolution (1/1):** Public intents build Koromon-to-Agumon-X-to-Greymon-to-MetalGreymon, move it from breeding, and use the exact MetalGreymon alternate route for 0.
9. **Direct IR, registration, and live keyword seam (1/1):** The full/no-residual module registers exactly once with `registerIrCard` and is indexed; live keyword filtering now respects an authoritative `false` instead of re-promoting conditional grant prose through raw text.
10. **Reproducible verification (1/1):** Focused card proof passed 9/9 and the interpreter suite passed 180/180, including exact 3-memory payment, public Q1809 placement, real opponent-turn boundaries, and load-bearing unsupported-shape negatives; the combined Venusmon/keyword/card/interpreter run passed 296/296, with typecheck, focused formatting, and `git diff --check` also clean.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-015
rg -n 'Q1808|Q1809|Q1967' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-015.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-015.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/cards/BT10/BT10-042.test.ts src/engine/combat/keywords.test.ts src/engine/effects/interpreter.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-015.ts apps/api/src/cards/BT9/BT9-015.test.ts apps/api/src/engine/effects/EffectContext.ts apps/api/src/engine/effects/interpreter/duration.ts apps/api/src/engine/effects/interpreter/actions/board.ts apps/api/src/engine/effects/modifiers.ts apps/api/src/engine/effects/primitives.ts packages/shared/src/effects/ir/durations.ts packages/shared/src/schema/enums.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-015.

## BT9-016 — WarGreymon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Vaccine`, complete `Dragonkin`/`X Antibody` traits, standard red-level-5 evolution for 4, and all printed text were checked.
2. **Alternate legal evolution (1/1):** Public intents build a complete red level-2-through-6 stack and exercise the exact WarGreymon alternate route for precisely 1 memory.
3. **All-turn security watcher (1/1):** Removing a card from the opponent's security gains exactly 1 memory on either turn; removing the controller's own security does not.
4. **Q1811 public security path (1/1):** A public player attack performs a real security check and the already-triggered watcher grants memory before the attack sequence finishes.
5. **End-of-attack timing (1/1):** Public attacks, rather than only direct timing injection, reach and resolve the deletion after each attack.
6. **Live-DP boundary (1/1):** A 12000-DP target is eligible while a 15000-DP peer remains, proving the relative-to-source threshold and exact boundary.
7. **Once-per-turn identity (1/1):** After a second public attack in the same turn, one otherwise eligible 12000-DP target remains.
8. **Q1810 exact names (1/1):** Exact `WarGreymon` and exact `X Antibody` card names qualify; the `X Antibody` trait on MetalGreymon X alone does not.
9. **Direct IR and registration (1/1):** The full/no-residual module contains both effects and the alternate recipe, registers exactly once with `registerIrCard`, contains no legacy registration, and is imported by the set index.
10. **Reproducible verification (1/1):** Focused proof passed 8/8; the shared security-removal and relative-DP mechanisms, workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-016
rg -n 'Q1810|Q1811' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-016.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-016.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/security/securityCheck.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-016.ts apps/api/src/cards/BT9/BT9-016.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-016.

## BT9-017 — Gallantmon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Virus`, complete `Holy Warrior`/`Royal Knight`/`X Antibody` traits, standard red-level-5 evolution for 4, and all printed text were checked.
2. **Alternate legal evolution (1/1):** Public intents build a complete red breeding chain through Gallantmon and exercise the exact-name alternate route for precisely 1 memory.
3. **Lowest-DP mandatory deletion (1/1):** With valid targets, exactly one lowest-DP opponent is deleted and the suspended source remains suspended, proving Q1813's mandatory branch.
4. **Q1812 no-deletion branch (1/1):** With no target, and separately with a chosen deletion-immune target, the failed deletion causes the source to unsuspend.
5. **Q1814 tied immune choice (1/1):** When an immune and deletable Digimon tie for lowest DP, the preferred immune candidate is a legal choice; both remain and the source unsuspends.
6. **Your-turn deletion watcher (1/1):** Deleting an opponent Digimon trashes exactly the top opposing security card.
7. **Once-per-turn identity (1/1):** Two separate qualifying deletions during the same turn trash only one security card.
8. **Q1815 exact-name boundary (1/1):** Exact Gallantmon and exact X Antibody card-name sources qualify; MetalGreymon X's trait alone does not.
9. **Q2146 cross-card legality and registration (1/1):** BT12-016's public no-deletion branch can effect-digivolve into BT9-017, while the full/no-residual direct module registers exactly once with `registerIrCard`, has no legacy registration, and is indexed.
10. **Reproducible verification (1/1):** Focused proof passed 9/9; affected deletion/immunity/effect-digivolution regressions, workspace typecheck, focused formatting, and `git diff --check` passed.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-017
rg -n 'Q1812|Q1813|Q1814|Q1815|Q2146' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-017.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-017.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/restrictionEnforcement.test.ts src/cards/BT12/BT12-016.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-017.ts apps/api/src/cards/BT9/BT9-017.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-017.

## BT9-018 — Dinorexmon — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Red/green level-6 Digimon, play cost 13, 13000 DP, `Mega`/`Data`, complete `Dinosaur`/`X Antibody` traits, both level-5 evolution routes for 5, and all printed text were checked.
2. **Legal evolution routes (1/1):** Public digivolve intents exercise both a legal red level-5 and a legal green level-5 source and pay exactly 5 memory on each route.
3. **Scaled suspension (1/1):** Two opposing Tamers cause two opposing Digimon to become suspended, correcting the prior one-target interpretation of “for each Tamer.”
4. **Q1816/Q1817 memory scaling (1/1):** Evolution gains exactly 1 memory per opposing Tamer, and still gains the full amount when fewer opposing Digimon are available to suspend.
5. **Q1818 optional budget (1/1):** A declined deletion leaves the first target in play and does not consume `[Once Per Turn]`; a later suspension in the same turn can be accepted and deleted.
6. **Q1819 Blocker timing (1/1):** A public attack and public block declaration suspend the 6000-DP Blocker; Dinorexmon deletes it before battle, so no battle resolves and security is untouched.
7. **Q1820 simultaneous subjects (1/1):** One effect-driven suspension batch containing two eligible Digimon opens one activation and deletes both trigger subjects together.
8. **Q4287 activation snapshot (1/1):** After the eligible 3000-DP Digimon suspends and the deletion activates, raising it to 7000 DP before accepting does not invalidate the pending deletion.
9. **Direct IR and registration (1/1):** The full/no-residual module contains both clauses, registers exactly once with `registerIrCard`, contains no legacy registration, and is imported by the BT9 index.
10. **Reproducible verification (1/1):** Focused proof passes 9/9, including both evolution colors and every Q1816–Q1820/Q4287 ruling; suspension/sub-trigger mechanisms, typecheck, formatting, and `git diff --check` pass.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-018
rg -n 'Q1816|Q1817|Q1818|Q1819|Q1820|Q4287' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-018.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-018.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch12-blocking.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-018.ts apps/api/src/cards/BT9/BT9-018.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-018.

## BT9-019 — Crabmon — 10/10

### Clause-by-clause score

1. **Catalog number/name (1/1):** `BT9-019` and English name `Crabmon` match the committed catalog.
2. **Card class/color (1/1):** Blue level-3 Digimon identity is asserted exactly.
3. **Costs/stats (1/1):** Play cost 2, 3000 DP, and blue level-2 evolution for 0 are asserted exactly.
4. **Form/attribute/trait (1/1):** `Rookie`, `Data`, and complete `Crustacean` type are asserted.
5. **Effectless contract (1/1):** Catalog and KB contain no effect or ruling; direct IR is exactly `effects: []`, `coverage: full`, `residual: []`.
6. **Legal breeding evolution (1/1):** A public digivolve intent evolves Crabmon from blue Upamon in the breeding area for exactly 0 memory; the shared proof no longer injects a Digi-Egg into the battle area.
7. **Wrong-color rejection (1/1):** The same public intent rejects evolution from yellow Kyaromon without moving the card or spending memory.
8. **Public play behavior (1/1):** A public `playCard` intent pays exactly 2, creates the battle-area permanent, and opens no effect decision.
9. **Direct registration/index (1/1):** The dedicated module registers exactly once with `registerIrCard`, has no legacy registration, and is explicitly imported by the BT9 index.
10. **Reproducible verification (1/1):** Crabmon proof passes 4/4; the strengthened level-3 and level-4 effectless regressions pass 8/8, with typecheck, formatting, and `git diff --check` clean.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-019
rg -n '"cardId": "BT9-019"' packages/shared/src/cards/data/cards.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-019.ts
rg -n 'BT9-019' apps/api/src/cards/BT9/index.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-019.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-007.test.ts src/cards/BT9/BT9-010.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-019.ts apps/api/src/cards/BT9/BT9-019.test.ts apps/api/src/cards/BT9/effectlessAudit.testkit.ts apps/api/src/cards/BT9/index.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-019.

## BT9-020 — Gabumon (X Antibody) — 10/10

### Clause-by-clause score

1. **Catalog identity (1/1):** Blue level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Data`, complete `Beast`/`X Antibody` traits, and blue level-2 evolution for 0 are asserted.
2. **Dual timing (1/1):** Identical reveal/search actions are present and behaviorally reached from public On Play and When Digivolving flows.
3. **Reveal/rest procedure (1/1):** Exactly the top 3 cards are revealed, selected cards move to hand, and every remainder returns to deck bottom.
4. **Garurumon/Omnimon name family (1/1):** The first slot uses in-name matching for either token and accepts `Garurumon (X Antibody)`.
5. **Exact X Antibody card (1/1):** The second slot uses exact-name matching; `X Antibody` qualifies while a longer Digimon name and an X Antibody trait alone do not.
6. **Q1821 partial availability (1/1):** Separate public-play cases prove the lone eligible Garurumon slot and lone eligible X Antibody slot are each added when the other category is absent.
7. **Q1822 mandatory maximum (1/1):** With both categories revealed, both are added; each selection advertises minimum 1 and rejects an empty response.
8. **Legal alternate evolution (1/1):** Public intents build Upamon → Gabumon in breeding, use the exact Gabumon alternate route for 0, preserve the legal stack, and resolve the search.
9. **Direct IR and registration (1/1):** The full/no-residual dedicated module contains both effects and the alternate recipe, registers exactly once with `registerIrCard`, has no legacy registration, and is indexed.
10. **Reproducible verification (1/1):** Focused proof passes 7/7; shared RevealAdd interpreter mechanisms, typecheck, formatting, and `git diff --check` pass.

### Reproduce

```bash
node tools/kb/query.mjs card BT9-020
rg -n 'Q1821|Q1822' data/kb/qa.json
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT9/BT9-020.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT9/BT9-020.test.ts --reporter=dot
pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts --reporter=dot
pnpm typecheck
pnpm format:files:check BT9-AUDIT.md apps/api/src/cards/BT9/BT9-020.ts apps/api/src/cards/BT9/BT9-020.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT9-020.

## BT9-021 — Jellymon — 10/10

1. **Catalog and evolution (1/1):** Blue level-3 `Mollusk` Digimon, costs/stats, and blue level-2 evolution for 0 are asserted from the committed catalog and exercised through a public breeding evolution.
2. **Main trigger (1/1):** `[Your Turn][Once Per Turn]` watches an own blue Tamer public play, draws exactly one, rejects the opponent's play, and cannot draw again that turn.
3. **Inherited trigger (1/1):** The buried inherited watcher uses live `whenEffectAddsToHand` dispatch, not a synthetic legacy event.
4. **Q1823 (1/1):** Returning the carrier through Aqua Viper adds it to hand and still bounces one opposing level-3 Digimon.
5. **Q1824 (1/1):** Labramon's public draw-then-trash flow still opens the bounce even though the drawn card later leaves hand.
6. **Target boundary (1/1):** The bounce selects only an opposing level-3 Digimon; an opponent hand addition is rejected by the controller gate.
7. **Inherited frequency (1/1):** Two public Gabumon draw effects in one turn produce only the first bounce.
8. **Turn scope (1/1):** Both watcher clauses are constrained by `YourTurn` via compiled IR trigger scope.
9. **Registration (1/1):** `BT9-021.ts` is full/no-residual compiled IR and has exactly one `registerIrCard` registration with no legacy registration.
10. **Reproducible verification (1/1):** `node tools/kb/query.mjs card BT9-021`, focused proof (8/8), and `git diff --check` pass.

No ambiguity or unsupported behavior remains for BT9-021.
