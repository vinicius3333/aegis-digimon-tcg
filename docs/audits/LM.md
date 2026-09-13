---
set: LM
cards: 62
status: complete
verified_at: 2026-09-12
catalog_commit: 3657953ac
evidence_commit: 4a30a66db
---

# LM audit

## Status

Recalculated on 2026-09-12 in child worktree `audit-lm-20260912`, from base
`de4dda717d8c9e0c2420796cb387f68b1379b863`. All 62 cards have reproducible 10/10
clause evidence. All modules use exclusive `registerIrCard` registration, full compiled IR,
and empty residuals. No LM module or test contains `ts-nocheck`; the requested removal was
already present at the base, so this branch strengthens evidence and corrects fixtures.

Three Luna workers reviewed the collection, followed by independent cross-review. The
coordinator ran every test with a single worker and `TEST_HEAP_MB=2048`; workers ran no tests.
Public play, evolution, attacks, Counter, blocking, activation, and actual turn loops replace
older timing-only primary assertions. Existing sufficient proof was retained. Structural
supplements are explicitly not standalone behavioral evidence.

## Gates

Acceptance commands (2026-09-12):

```sh
pnpm install --frozen-lockfile --offline
pnpm typecheck
TEST_HEAP_MB=2048 pnpm --filter @aegis/api exec vitest run src/cards/LM src/cards/promo-lm-rb.catalog-parity.test.ts src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism
TEST_HEAP_MB=2048 pnpm --filter @aegis/web exec vitest run test/promoEvolution.scenario.test.tsx test/ex10EvolutionStack.scenario.test.tsx --maxWorkers=1 --no-file-parallelism
pnpm effects:sync:set -- --set LM --base de4dda717d8c9e0c2420796cb387f68b1379b863
pnpm effects:check:set -- --set LM --base de4dda717d8c9e0c2420796cb387f68b1379b863
pnpm exec oxlint apps/api/src/cards/LM
pnpm exec oxfmt --check apps/api/src/cards/LM docs/audits/LM.md docs/audits/README.md
git diff --check
```

- Collection, persisted catalog parity, and audit layout: 71 files, 901 tests.
- Full shared/API/web typecheck and both rendered evolution scenarios passed (2 files, 2 tests).
- Engine mechanisms passed in six serial batches of at most 25 files, with the same heap and
  worker flags: `src/engine/conformance`, `src/engine/combat`, `src/engine/effects`,
  `src/engine/cards`. Batch file/test counts: 25/366, 25/394, 25/423, 25/181, 25/600,
  13/110; total 138 files, 2,074 tests. The unsupported AD1 legacy-effect error is an expected
  assertion in batch 1; all six batches exited successfully.
- Effect synchronization and check: all 62 records already synchronized; zero semantic
  changes in LM and zero semantic or byte changes outside LM. No production card/engine
  changes were needed.
- Lint, format, and whitespace checks passed for the committed result.
- Failed intermediate fixtures are not acceptance evidence. They were corrected for legal
  cards/stacks, explicit costs, complete attack resolution, actual turn switches, sufficient
  decks/security, and source-category requirements, then rerun.

## Card ledger

Each score is recalculated against the committed catalog, local KB, compiled IR, public primary
flows, and source/destination assertions. Direct timing/subtrigger cases remain structural
supplements; shared keyword execution is tied to the passing mechanism suites below.

### LM-001 — Siriusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-001.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-001.test.ts). Test cases: “blast-digivolves from hand in the counter window without paying the cost”; “deletes an 8000 DP Digimon on play with no digivolution cards to scale with”; “raises the deletion maximum by 1000 for each color in its digivolution cards”; “leaves a Digimon above the raised maximum alone”; “places a Gammamon-in-text card from hand as its own bottom digivolution card”; “leaves the hand untouched when the optional placement is declined”; “gains one memory the first time another Digimon is deleted each turn”; “resets the deletion watcher on the controller's next turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-002 — Jellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3989, Q3990 · [module](../../apps/api/src/cards/LM/LM-002.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-002.test.ts). Test cases: “draws at the start of its owner's main phase with seven cards in hand”; “does not draw with eight cards in hand”; “stays silent on the opponent's main phase”; “draws only once from two copies at exactly seven cards, per Q3989”; “draws from the inherited clause when a Digimon carrying it attacks”; “draws only once from two inherited copies at exactly seven cards, per Q3990”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-003 — TeslaJellymon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3991, Q3992, Q3993 · [module](../../apps/api/src/cards/LM/LM-003.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-003.test.ts). Test cases: “trashes a blue card to survive a losing battle for the turn”; “is deleted when the optional trash cost is declined”; “cannot pay the cost with a non-blue hand card, so the battle deletes it”; “survives a losing Security Digimon battle too, per Q3991”; “loses battle immunity after its own turn ends”; “is still deleted by Retaliation, which is effect deletion rather than battle deletion, per Q3992”; “draws from the inherited effect at seven cards”; “draws only once from two inherited copies at seven cards, per Q3993”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-004 — Thetismon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-004.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-004.test.ts). Test cases: “trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro and gain Blocker”; “does the same on the When Digivolving timing”; “leaves the board untouched when the trash cost is declined”; “cannot resolve the entrance effect with fewer than two blue cards to trash”; “unsuspends the host once per turn when a Jellymon-text card is trashed from hand”; “suppresses a second real hand-trash trigger in the same turn”; “ignores a hand-trashed card with no Jellymon in its text”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-005 — Amphimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3994, Q3995 · [module](../../apps/api/src/cards/LM/LM-005.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-005.test.ts). Test cases: “blast-digivolves from hand in the counter window without paying the cost”; “trashes one card under each of two opposing permanents for two blue cards, per Q3994”; “returns an opposing permanent with no cards under it to the hand”; “leaves a stacked opposing permanent in play when nothing was trashed from under it”; “returns three Jellymon-text cards from trash for Security Attack +1”; “stacks a second Security Attack +1 when it attacks again in the same turn, per Q3995”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-006 — Cthyllamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3996 · [module](../../apps/api/src/cards/LM/LM-006.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-006.test.ts). Test cases: “plays itself from the trash for its cost minus the returned Tamer's play cost”; “trashes the bottom three digivolution cards of one opposing Digimon”; “stops every opposing Digimon with no digivolution cards from attacking”; “releases a Digimon that gains digivolution cards afterwards, per Q3996”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-007 — Publimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3997 · [module](../../apps/api/src/cards/LM/LM-007.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-007.test.ts). Test cases: “plays itself from security for free when it is checked, then returns on top of security”; “places itself on top of its owner's security stack at the end of an attack”; “is mandatory at the end of an attack even when every prompt is declined, per Q3997”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-008 — Angoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-008.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-008.test.ts). Test cases: “gains 1 memory at the start of its owner's main phase while a Tamer is in play”; “gains nothing without a Tamer”; “stays silent on the opponent's main phase”; “grants +2000 DP on your turn to a host whose text mentions Angoramon”; “grants nothing to a host with no Angoramon in its text”; “grants nothing on the opponent's turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-009 — Airdramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q3998, Q3999 · [module](../../apps/api/src/cards/LM/LM-009.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-009.test.ts). Test cases: “suspends itself to reduce an Angoramon-text card's play cost by 2”; “leaves a card with no Angoramon in its text at full price”; “reduces the digivolution cost only when the destination has Angoramon in its text”; “does not reduce a digivolution into a card with no Angoramon in its text, per Q3998”; “grants Rush to an Angoramon-text Digimon when it becomes suspended”; “cannot grant Rush from the suspension that paid for its own digivolution, per Q3999”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-010 — Chamblemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-010.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-010.test.ts). Test cases: “suspends a Tamer and locks every opposing Tamer from unsuspending”; “leaves the controller's own Tamers free to unsuspend”; “locks an opposing Tamer that arrives after the effect resolved”; “gets +1000 DP for each suspended Tamer on either side”; “keeps its printed DP with no suspended Tamer anywhere”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-011 — SymbareAngoramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4000 · [module](../../apps/api/src/cards/LM/LM-011.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-011.test.ts). Test cases: “suspends the opponent's only Digimon and hands out Blocker”; “withholds Blocker while the opponent still has an unsuspended Digimon”; “still grants Blocker when the opponent has no Digimon at all, per Q4000”; “can hand the Blocker grant to another of the controller's Digimon”; “grants its inherited +2000 DP on your turn to an Angoramon-text host”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-012 — Lamortmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-012.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-012.test.ts). Test cases: “suspends the last opposing Digimon and locks it down for the turn”; “skips the lock while the opponent keeps an unsuspended Digimon”; “trashes the opponent's top security card once per turn when an Angoramon-text host wins a battle”; “stays silent when the winning Digimon has no Angoramon in its text”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-013 — Diarbbitmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4001 · [module](../../apps/api/src/cards/LM/LM-013.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-013.test.ts). Test cases: “suspends the last opposing Digimon and gains 2 memory”; “gains nothing while an unsuspended opposing Digimon remains”; “blast-digivolves from hand in the counter window without paying the cost”; “plays an Angoramon-text Digimon from hand for free when attacking”; “leaves the optional Angoramon play in hand when declined”; “returns the played Digimon to hand at the next end of the opponent's turn, trashing its stack”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-014 — Espimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-014.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-014.test.ts). Test cases: “reveals three, adds a revealed Tamer and bottoms the rest”; “adds a revealed card with Blocker rather than treating Draw as the missing catalog icon”; “adds nothing when the three revealed cards are neither Tamers nor Blockers”; “draws once per opponent turn when the attack target is switched”; “draws from a real Blocker target switch and suppresses a second switch that turn”; “stays silent on its controller's own turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-015 — Ryudamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-015.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-015.test.ts). Test cases: “digivolves into Ginryumon from hand when attacking while its owner has a Tamer”; “does nothing without a Tamer”; “stays put when the optional digivolution is declined”; “grants its inherited +1000 DP on your turn to an X Antibody host”; “withholds the inherited bonus from a host with no X Antibody trait”; “withholds the inherited bonus on the opponent's turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-016 — Gammamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-016.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-016.test.ts). Test cases: “digivolves for free out of the trash when an effect deletes another of your Digimon”; “stays put when the deletion came from battle rather than an effect”; “does not react to its own deletion”; “plays Hiro Amanokawa from hand when the inherited Gammamon effect is deleted”; “leaves Hiro in hand when the inherited play is declined”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-017 — Regulusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-017.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-017.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “trashes a hand card and places a Gammamon-text trash card under itself, bottom-most”; “places the trash card beneath an existing digivolution stack”; “deletes a level 4 or lower Digimon to play one from trash after gaining a source”; “can delete an opposing level-4-or-lower Digimon to pay the source-add reaction”; “does not react when an ordinary digivolution-card addition has no effect provenance”; “spends the source-add reaction only once per turn”; “registers the Blast Digivolve keyword marker”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-018 — Gyuukimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-018.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-018.test.ts). Test cases: “deletes an opposing level-4 Digimon and plays its token when played”; “can take one of the controller's own level-4-or-lower Digimon”; “leaves a level-5 Digimon alone and plays no token”; “does not play the token when nothing was deleted”; “leaves the token unplayed when the optional play is declined”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-019 — Bokomon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4002 · [module](../../apps/api/src/cards/LM/LM-019.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-019.test.ts). Test cases: “reveals four cards and adds a Digimon with Gammamon in its text”; “adds nothing when none of the four has Gammamon in its text”; “deletes itself to prevent another Gammamon-text Digimon from leaving”; “does not protect Bokomon itself”; “declining the cost lets the Digimon leave”; “Q4002: can delete Bokomon to prevent its Gammamon-text ally from a simultaneous effect departure”; “does not protect the ally from the controller's own effect”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-020 — Quantumon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q2657, Q4003, Q4004, Q4005, Q4006, Q4007, Q4008, Q4009, Q4010, Q4011 · [module](../../apps/api/src/cards/LM/LM-020.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-020.test.ts). Test cases: “matches the committed Quantumon catalog contract”; “registers complete security-exchange and category-immunity IR”; “publicly digivolves Quantumon and places an owned Digimon into security”; “still places the chosen Digimon when the opponent has no security cards”; “places a chosen opposing Digimon into that opponent's own security stack”; “accepts a Digimon token as the security placement cost and removes it from play”; “accepts Mother D-Reaper as the placement cost and applies the opponent security exchange”; “is registered”; “StartOfOpponentsTurn clause produces at least one effect at OnStartTurn timing”; “WhenDigivolving timing has at least one effect (the digivolving clause)”; “declares Digimon, gains only Digimon-effect immunity, and returns the matching reveal to deck bottom”; “returns a matching category reveal to the top when that placement is chosen”.

### LM-021 — Agumon - Bond of Bravery

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4012, Q4013, Q4014, Q4015, Q4016, Q4017, Q4018 · [module](../../apps/api/src/cards/LM/LM-021.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-021.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “deletes opposing Digimon whose total DP fits inside its own DP, per Q4017”; “reads its LIVE DP for the budget, not the printed 14000”; “uses inherited DP on a legal stack for the aggregate budget”; “takes several Digimon whose DP adds up inside the budget”; “offers the Agumon cost-3 path only at two or fewer security cards, per Q4014”; “trashes the opponent's top security once per turn while you have a Tamer”; “trashes nothing without a Tamer”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-022 — Gabumon - Bond of Friendship

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4019, Q4020, Q4021, Q4022, Q4023 · [module](../../apps/api/src/cards/LM/LM-022.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-022.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “returns opposing Digimon with at most as many digivolution cards as itself”; “returns two once its own stack is deep enough”; “offers the Gabumon cost-3 path only at two or fewer security cards, per Q4021”; “unsuspends itself once per turn when attacking with a Tamer in play”; “stays suspended without a Tamer”; “refreshes its attack once-per-turn effect on the next own turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-023 — Sakuyamon: Maid Mode

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4024, Q4025, Q5516, Q5517, Q5518 · [module](../../apps/api/src/cards/LM/LM-023.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-023.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “places an eligible yellow Tamer from hand on top of security and reveals it, per Q4024/Q4025”; “places a single-color Option with a cost of 5 or less”; “places a printed-cost-9 Option whose hand use cost is reduced to 5, per Q5516”; “does not project an automatic self-reducer past the Q5516 cost boundary”; “does not place an ineligible multicolor Option from hand”; “does not place a single-color Option costing more than 5”; “shrinks an opposing Digimon by 6000 when a card is added to either security stack”; “shrinks an opposing Digimon by 6000 when an Option is used, once per turn”; “suppresses a second Option trigger this turn and refreshes it on the next turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-024 — Shivamon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4026, Q4027, Q4028 · [module](../../apps/api/src/cards/LM/LM-024.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-024.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “fires both halves at exactly three security cards, per Q4026”; “at two security returns an already-suspended opposing Digimon and does not buff”; “at four security only suspends and buffs”; “can suspend one of the controller's own Digimon”; “is immune to opposing Digimon effects only while suspended, per Q4027/Q4028”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-025 — Cyberdramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-025.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-025.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “reveals five, plays a qualifying black Tamer, and de-digivolves an opposing stack”; “does not de-digivolve when no qualifying Tamer is revealed”; “plays a revealed black Tamer costing 4 or less for free”; “de-digivolves once per turn from the inherited attacking clause”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-026 — Megidramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4029, Q4030, Q4031, Q4032 · [module](../../apps/api/src/cards/LM/LM-026.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-026.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “registers complete leave replacement, rule name, and inherited deletion ceiling IR”; “deletes only opposing Digimon at 11000 DP or less”; “replaces its own leave with a Guilmon host”; “can play the Guilmon from its own digivolution cards for the replacement”; “is also treated as ChaosGallantmon”; “allows the printed Growlmon alternate evolution for cost 3”; “raises a numeric deletion cap for a legal Gallantmon host”; “does not raise a deletion cap that uses the host's own DP”; “leaves the same 20000 DP target with no Megidramon modifier”; “raises its host's own numeric deletion ceiling by 5000, per Q4031”; “Q4032: does not raise a deletion limit relative to the host's own DP”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-027 — Red Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4033, Q4034, Q4035, Q4036, Q4037 · [module](../../apps/api/src/cards/LM/LM-027.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-027.test.ts). Test cases: “digivolves a red Digimon from hand and places Red Scramble in the battle area”; “Delay returns a red Digimon to deck before playing a small red Digimon when empty”; “Delay does not play a red Digimon above 2000 DP”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying red Digimon from trash and returns itself to hand”; “activates Delay with no red Digimon in the trash, per Q4036”; “reduces the digivolution cost by 3”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-028 — Blue Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4038, Q4039, Q4040, Q4041, Q4042 · [module](../../apps/api/src/cards/LM/LM-028.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-028.test.ts). Test cases: “digivolves a blue Digimon from hand at a cost reduced by 3, then enters the battle area”; “Delay returns a blue Digimon to the deck top and then revives a small one”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying blue Digimon from trash and returns itself to hand”; “Security leaves a blue Digimon above 2000 DP in the trash”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-029 — Yellow Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4043, Q4044, Q4045, Q4046, Q4047 · [module](../../apps/api/src/cards/LM/LM-029.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-029.test.ts). Test cases: “digivolves a yellow Digimon from hand at a cost reduced by 3, then enters the battle area”; “Delay returns a yellow Digimon to the deck top and then revives a small one”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying yellow Digimon from trash and returns itself to hand”; “Security leaves a yellow Digimon above 2000 DP in the trash”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-030 — Green Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4048, Q4049, Q4050, Q4051, Q4052 · [module](../../apps/api/src/cards/LM/LM-030.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-030.test.ts). Test cases: “digivolves a green Digimon from hand at a cost reduced by 3, then enters the battle area”; “Delay returns a green Digimon to the deck top and then revives a small one”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying green Digimon from trash and returns itself to hand”; “Security leaves a green Digimon above 2000 DP in the trash”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-031 — Black Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4053, Q4054, Q4055, Q4056, Q4057 · [module](../../apps/api/src/cards/LM/LM-031.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-031.test.ts). Test cases: “digivolves a black Digimon from hand at a cost reduced by 3, then enters the battle area”; “Delay returns a black Digimon to the deck top and then revives a small one”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying black Digimon from trash and returns itself to hand”; “Security leaves a black Digimon above 2000 DP in the trash”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-032 — Purple Scramble

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4058, Q4059, Q4060, Q4061, Q4062 · [module](../../apps/api/src/cards/LM/LM-032.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-032.test.ts). Test cases: “digivolves a purple Digimon from hand at a cost reduced by 3, then enters the battle area”; “Delay returns a purple Digimon to the deck top and then revives a small one”; “does not activate Delay when the opponent has no Digimon”; “Security plays a qualifying purple Digimon from trash and returns itself to hand”; “Security leaves a purple Digimon above 2000 DP in the trash”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-033 — Garnet Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4063, Q4064 · [module](../../apps/api/src/cards/LM/LM-033.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-033.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a red or black Digimon, bottoms the rest and places itself”; “can be used with only a black colour source in play”; “counts a black Digimon in the breeding area too, per Q4064”; “is refused with no red or black colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-034 — Wisteria Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4065, Q4066 · [module](../../apps/api/src/cards/LM/LM-034.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-034.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a blue or red Digimon, bottoms the rest and places itself”; “can be used with only a red colour source in play”; “counts a red Digimon in the breeding area too, per Q4066”; “is refused with no blue or red colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-035 — Amber Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4067, Q4068 · [module](../../apps/api/src/cards/LM/LM-035.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-035.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a yellow or purple Digimon, bottoms the rest and places itself”; “can be used with only a purple colour source in play”; “counts a purple Digimon in the breeding area too, per Q4068”; “is refused with no yellow or purple colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-036 — Jade Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4069, Q4070 · [module](../../apps/api/src/cards/LM/LM-036.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-036.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a green or blue Digimon, bottoms the rest and places itself”; “can be used with only a blue colour source in play”; “counts a blue Digimon in the breeding area too, per Q4070”; “is refused with no green or blue colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-037 — Sepia Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4071, Q4072 · [module](../../apps/api/src/cards/LM/LM-037.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-037.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a black or yellow Digimon, bottoms the rest and places itself”; “can be used with only a yellow colour source in play”; “counts a yellow Digimon in the breeding area too, per Q4072”; “is refused with no black or yellow colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-038 — Grape Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4073, Q4074 · [module](../../apps/api/src/cards/LM/LM-038.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-038.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a purple or green Digimon, bottoms the rest and places itself”; “can be used with only a green colour source in play”; “counts a green Digimon in the breeding area too, per Q4074”; “is refused with no purple or green colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-039 — Valkyrimon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-039.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-039.test.ts). Test cases: “returns an opposing Digimon at 8000 DP or less to the bottom of its deck”; “grants Security Attack +1 when the return clause has no valid target”; “leaves an opposing Digimon above 8000 DP alone and grants Security Attack +1 instead”; “shares one once-per-turn budget between the digivolving and attacking windows”; “stops its own attack target from being changed on its controller's turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-040 — Vikemon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4843 · [module](../../apps/api/src/cards/LM/LM-040.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-040.test.ts). Test cases: “trashes any four opposing digivolution cards across the opponent's Digimon”; “unsuspends itself when no opposing Digimon matches its stack depth”; “stays suspended while the opponent matches its stack depth”; “still applies -6000 to the opponent's Security Digimon when the unsuspend condition fails, per Q4843”; “spends the attacking clause once per turn and resets on the next own turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-041 — Regalecusmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-041.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-041.test.ts). Test cases: “unsuspends a DS Digimon, returns security, and restricts an opposing permanent at 1 memory”; “skips security return at zero memory but still applies the Then suspend lock”; “skips the suspend lock above one memory”; “unsuspends a DS Digimon when played”; “shares the Once Per Turn security clause and resets on the next own turn”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-042 — Rasielmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q5746, Q5747, Q5748, Q5749, Q5750 · [module](../../apps/api/src/cards/LM/LM-042.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-042.test.ts). Test cases: “suspends one opposing permanent and locks one from unsuspending or digivolving”; “puts both halves of the lock on the same chosen permanent”; “lets the Then lock choose a different opponent permanent than the suspension”; “places itself as the bottom security card when deleted”; “does not consume LM-039's shared budget when its When Digivolving timing is locked”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-043 — Darkdramon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-043.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-043.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “de-digivolves one opponent and deletes all of their lowest-play-cost Digimon”; “de-digivolves before choosing the lowest play cost, so the reduced Digimon can be the target”; “carries Blast Digivolve, Scapegoat and the inherited Collision”; “uses inherited Collision to force a public block from the opponent”; “uses Scapegoat to delete another own Digimon instead of itself against an opponent's battle”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-044 — Ghoulmon

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): Q4844 · [module](../../apps/api/src/cards/LM/LM-044.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-044.test.ts) · [public Counter matrix](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts). Test cases: “trashes one opposing hand card, then deletes a level 6 or lower Digimon”; “skips the discard but still deletes when the opponent already holds four cards”; “discards down to five and then deletes nothing”; “carries Blocker and Retaliation”; “blocks a public player attack and Retaliation trashes Ghoulmon's attacker”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-045 — Vermilion Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-045.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-045.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a red or yellow Digimon, bottoms the rest and places itself”; “can be used with only a yellow colour source in play”; “counts a yellow Digimon in the breeding area too”; “is refused with no red or yellow colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-046 — Navy Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-046.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-046.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a blue or purple Digimon, bottoms the rest and places itself”; “can be used with only a purple colour source in play”; “counts a purple Digimon in the breeding area too”; “is refused with no blue or purple colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-047 — Chartreuse Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-047.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-047.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a yellow or green Digimon, bottoms the rest and places itself”; “can be used with only a green colour source in play”; “counts a green Digimon in the breeding area too”; “is refused with no yellow or green colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-048 — Chrome Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-048.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-048.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a green or black Digimon, bottoms the rest and places itself”; “can be used with only a black colour source in play”; “counts a black Digimon in the breeding area too”; “is refused with no green or black colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-049 — Midnight Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-049.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-049.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a black or blue Digimon, bottoms the rest and places itself”; “can be used with only a blue colour source in play”; “counts a blue Digimon in the breeding area too”; “is refused with no black or blue colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-050 — Magenta Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-050.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-050.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a purple or red Digimon, bottoms the rest and places itself”; “can be used with only a red colour source in play”; “counts a red Digimon in the breeding area too”; “is refused with no purple or red colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-051 — Alexandrite Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-051.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-051.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a red or green Digimon, bottoms the rest and places itself”; “can be used with only a green colour source in play”; “counts a green Digimon in the breeding area too”; “is refused with no red or green colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-052 — Malachite Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-052.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-052.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a blue or yellow Digimon, bottoms the rest and places itself”; “can be used with only a yellow colour source in play”; “counts a yellow Digimon in the breeding area too”; “is refused with no blue or yellow colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-053 — Obsidian Memory Boost!

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-053.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-053.test.ts) · [public Delay matrix](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts). Test cases: “reveals three, adds a black or purple Digimon, bottoms the rest and places itself”; “can be used with only a purple colour source in play”; “counts a purple Digimon in the breeding area too”; “is refused with no black or purple colour source in play”; “places itself in the battle area from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-054 — Treadmill Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-054.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-054.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a yellow or black card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-055 — Sprint Dash Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-055.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-055.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a green or red card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-056 — Image Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-056.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-056.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a blue or purple card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-057 — Wall Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-057.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-057.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a red or blue card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-058 — Parkour Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-058.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-058.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a blue or green card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-059 — Heat Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-059.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-059.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a yellow or red card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-060 — Shadow Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-060.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-060.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a green or purple card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-061 — Punching Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-061.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-061.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a black or red card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

### LM-062 — Breathing Training

- Clause scores: catalog 2/2 · KB 2/2 · IR 2/2 · behavior 2/2 · stack 2/2
- Score: **10/10**
- Sources: [catalog](../../packages/shared/src/cards/data/cards.json) · [KB](../../data/kb/qa.json): no card-specific entries · [module](../../apps/api/src/cards/LM/LM-062.ts). Full compiled IR, empty residual; exclusive `registerIrCard`.
- Reproducible evidence: [test](../../apps/api/src/cards/LM/LM-062.test.ts) · [public Training evolution/stack matrix](../../apps/api/src/cards/LM/LM.training-delay.test.ts). Test cases: “reveals two, adds a purple or yellow card, bottoms the rest and places itself”; “ignores its colour requirements while no copy of itself is in the battle area”; “loses the waiver once a copy of itself is already in the battle area”; “digivolves for the printed cost reduced by 2 through its Delay clause”; “reveals two and places itself from security”; “matches committed metadata and publishes fully covered compiled IR”.

## Mechanisms

- [Collection registration](../../apps/api/src/cards/LM/LM.collection.test.ts): all 62 cards,
  exclusive compiled registration, metadata/coverage, and no residuals.
- [Public Blast Digivolve](../../apps/api/src/cards/LM/LM.blast-digivolve.test.ts): LM-017,
  LM-021–026, LM-043–044, actual Counter window, legal bases, free cost, exact source stack;
  LM-001/005/013 retain their existing public Counter tests.
- [Memory Boost Delay](../../apps/api/src/cards/LM/LM.memory-boost-delay.test.ts): all 15
  LM-033–038 and LM-045–053 variants, +2 memory, exact Option trash, reuse rejection, and
  placement-turn guard.
- [Training Delay](../../apps/api/src/cards/LM/LM.training-delay.test.ts): all nine LM-054–062
  variants, public activation/evolution, legal host, exact reduced cost/source identity and
  Option trash, plus wrong-color candidate refusal.
- [Battle/evolution keyword conformance](../../apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts)
  and [glossary](../../apps/api/src/engine/conformance/glossary.test.ts): shared executable
  Blitz, Iceclad, Security Attack, Blocker, Retaliation, Rush and Delay mechanisms. Printed
  keyword registration is asserted in each applicable LM module's metadata test; actual
  mechanism execution is included in the 138-file passing engine gate.
- LM-004/005/012/014/021/022/023/025/039/040/041 prove once-per-turn or effect-duration
  transitions with actual turn loops. LM-003 and LM-006 prove expiring/dynamic restrictions;
  LM-020 proves category-specific immunity and expiry; LM-042 proves lock expiry and the
  Q5747/Q5750 dual-timing shared-budget interaction through public evolution and attack.

## Knowledge base index

The local `data/kb/qa.json`, `errata.json`, and `banlist.json` were checked for every LM card;
per-card ruling IDs are recorded above. Reproduce individual entries with
`node tools/kb/query.mjs card LM-042`. No LM-specific errata/restriction entry is present.

Rulings reviewed: Q2657, Q3989, Q3990, Q3991, Q3992, Q3993, Q3994, Q3995, Q3996, Q3997, Q3998, Q3999, Q4000, Q4001, Q4002, Q4003, Q4004, Q4005, Q4006, Q4007, Q4008, Q4009, Q4010, Q4011, Q4012, Q4013, Q4014, Q4015, Q4016, Q4017, Q4018, Q4019, Q4020, Q4021, Q4022, Q4023, Q4024, Q4025, Q4026, Q4027, Q4028, Q4029, Q4030, Q4031, Q4032, Q4033, Q4034, Q4035, Q4036, Q4037, Q4038, Q4039, Q4040, Q4041, Q4042, Q4043, Q4044, Q4045, Q4046, Q4047, Q4048, Q4049, Q4050, Q4051, Q4052, Q4053, Q4054, Q4055, Q4056, Q4057, Q4058, Q4059, Q4060, Q4061, Q4062, Q4063, Q4064, Q4065, Q4066, Q4067, Q4068, Q4069, Q4070, Q4071, Q4072, Q4073, Q4074, Q4843, Q4844, Q5516, Q5517, Q5518, Q5746, Q5747, Q5748, Q5749, Q5750.

## Open items

No unresolved implementation limitation remains. LM-062 has the upstream catalog typo
“yellowuce”; its reduction of 2 is explicit in compiled IR, consistent with the Training
family, and verified by public evolution and exact memory/stack assertions.

This re-audit supersedes historical source claims and closes post-audit drift: the current
collection/parity/layout, engine mechanisms, rendered scenarios, typecheck, and style gates
were reproduced. Historical paths below are provenance only, not current evidence files.

## History

- `docs/audits/LM-AUDIT.md` — last in `a8136a499`, 2026-09-05. Recalculated 62-card scoring ledger;
  the winning source for the card ledger above.
- `docs/audits/PROMO-LM-RB-AUDIT-20260905.md` — last in `a8136a499`, 2026-09-05. Coordinator
  evidence for the shared P/LM/RB1 audit: corrections, artifact parity, verification and
  integration. Also recorded in `docs/audits/P.md` and `docs/audits/RB1.md`.
- `docs/audits/LM-RB1-20260905.md` — last in `6e582b119`, 2026-09-05. Shared LM and RB1 clause
  review supplying exact test titles and KB tracing. Also recorded in `docs/audits/RB1.md`.
- `docs/audits/LM-SERIAL-QUEUE.md` — last in `eb1a58b75`, 2026-09-05. Serial worker queue for the
  LM review; scheduling scratch, superseded by the completed ledger.
- `internal-docs/audits/LM-runtime-2026-08-26.md` — last in `eb1a58b75`, 2026-09-05. Earlier
  source-tracing ledger that withheld 10/10 pending reruns; superseded and removed so that
  `docs/audits/` is the only ledger.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for LM: PR #4593; commit `8758efcf2`.
