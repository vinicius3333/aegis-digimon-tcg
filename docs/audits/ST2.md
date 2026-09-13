---
set: ST2
cards: 16
status: verified
verified_at: 2026-09-13
catalog_commit: f2a2ea89e498a48235cd9121ee8bdf4f59c43ea5
evidence_commit: 00c0d5be7a611a27507d47040a934fee9b2b356d
---

# ST2 audit

## Status

Complete sixteen-card contract/KB/IR/peer review on branch `audit-ST2-20260913`, an Orca worktree created from `origin/main` at `59825151d658436e70c3b9749612a3f491a089ad`. Three Luna lanes performed the card work and independent review. The 2026-09-13 evidence supersedes historical tens and the 2026-09-12 reopening. Tsunomon now has the missing public full-line proof. Cocytus Breath’s unprinted friendly-source discard and Kaiser Nail’s unprinted refusal/ineligible host choice are corrected with direct IR. All sixteen modules register exclusively through `registerIrCard`; none had or retains `@ts-nocheck`. All sixteen cards are recalculated at 10/10 with reproducible focused/collection/mechanism proof, green types and synchronized snapshots. Code is delivered in atomic commits; ledger/index delivery and the pending Orca status operation are recorded below.

## Gates

- Exact catalog and module inventory: sixteen matching IDs, zero legacy card registrations and zero `@ts-nocheck` across ST2.
- Every card was queried with `node tools/kb/query.mjs card <ID>` on 2026-09-13; identifiers are recorded below. “No entries” means no card-specific local Q&A, not no applicable comprehensive rules.
- `pnpm install --frozen-lockfile` passed. Heavy processes were serialized: tests used `TEST_HEAP_MB=2048 NODE_OPTIONS=--max-old-space-size=2048`, one fork and `--no-file-parallelism`. API emit needed 4096 MB after the isolated 2048-MB attempt hit its explicit heap ceiling; the retry passed. No agents ran simultaneous test suites.
- Focused Tsunomon: nine tests passed in 46.23 seconds. Focused Zudomon: three tests passed. Initial intermediate failures (draw-deck omissions, target unsuspension and signed Security memory) were corrected rather than accepted as card behavior.
- Cocytus counterfactual: `vitest run src/cards/ST2/ST2-16.test.ts -t 'returns an opposing' --maxWorkers=1`, with its old registered IR temporarily restored, failed the friendly-source preservation assertion (2.20 seconds). Corrected IR was restored after the reproduction.
- Kaiser counterfactual: `vitest run src/cards/ST2/ST2-15.test.ts -t 'chooses an identical host' --maxWorkers=1`, with its old registered IR temporarily restored, failed because an unprinted optional decision blocked the expected mandatory source selection (3.21 seconds). Corrected IR was restored afterward; the fixture also compares eligible hosts with a Tamer-only host.
- Final closing regression, after both Option corrections, passed 212 files / 2457 tests in 9.11 seconds: zero failed or skipped. This includes all sixteen focused card suites, the collection inventory/registration gate, the public deck gauntlet and shared mechanisms. The earlier 10.87-second run was superseded by this repeated acceptance after the Kaiser correction.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm -r --workspace-concurrency=1 typecheck` passed shared/API/web serially after the final Kaiser correction. All card/test edits were complete before this final typecheck.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm effects:sync:set -- --set ST2 --base 59825151d658436e70c3b9749612a3f491a089ad` passed: two semantic changes, sixteen synchronized records, zero semantic or byte changes outside ST2. Final `effects:check:set` with the same set/base and heap passed: sixteen records already synchronized; two semantic changes against baseline; zero out-of-set semantic or byte changes.
- Complete ST2 `oxlint`, `oxfmt --check` and `git diff --check` passed. Final document layout/index validation and delivery are recorded in the closeout below.

The closing behavioral command covers the exact ST2 directory (the trailing slash excludes ST20–ST23), all protocol mechanism directories and the immediate-return/replacement/continuous peer regressions:

```sh
TEST_HEAP_MB=2048 NODE_OPTIONS=--max-old-space-size=2048 pnpm --filter @aegis/api exec vitest run src/cards/ST2/ src/engine/conformance src/engine/combat src/engine/effects src/engine/cards src/engine/immediateReturnReaction.test.ts src/engine/replacementRecomputeBarrier.test.ts src/engine/continuousLifecycle.test.ts --maxWorkers=1 --no-file-parallelism
```

## Card ledger

Rubric: catalog/rules, IR trace, behavioral proof, peer/stack proof and delivery gates, each 0–2. Vanilla cards have no additional effect/trait-filter risks requiring duplicate tests; their printed identity/metadata and empty IR are checked against effect-bearing peers and the shared mechanism gates. The public ST2 source-strip gauntlet supplies cross-card inheritance/evolution proof. Final delivery credit is 2/2 for the green gates and pushed atomic delivery described below.

### ST2-01 — Tsunomon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-01` in `packages/shared/src/cards/data/cards.json`: DigiEgg; Blue; printed play/use cost -1; DP 0; level 2; traits Lesser. Evolution requirements: `[]`.
- Printed clauses: Inherited: [Your Turn] This Digimon gets +1000 DP when battling an opponent's Digimon that has no digivolution cards.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Inherited YourTurn + selfBattlesOpponentMatching → self-only ModifyDP +1000; live field-battle context opens/closes the bonus and excludes security. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-01.test.ts`. Nine focused tests cover public direct attack, Blocker redirection, opponent-turn exclusion, no-source versus one-source effect battles, exact source identity and lapse before Piercing security battle. The new public hatch → Gomamon → Garurumon → WereGarurumon → MetalGarurumon line pays 0/2/3/4 memory, retains the exact egg/source instances, and defeats printed 11000-DP Breakdramon at 12000 DP while an unrelated friendly peer remains intact.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-02 — Gomamon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-02` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 2; DP 3000; level 3; traits Sea Beast. Evolution requirements: `[{"color":"Blue","level":2,"memoryCost":0}]`.
- Printed clauses: vanilla; no main, inherited or Security effects.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Full, residual-free empty compiled effects; printed metadata is consumed by the shared play/evolution and DP mechanics. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-02.test.ts`. Existing vanilla test observes exact identity, printed level/color/trait/cost and base/current DP, with no printed or executable effect. Public egg-to-Gomamon evolution is also exercised in ST2-01.test.ts.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-03 — Gabumon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-03` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 3; DP 2000; level 3; traits Reptile. Evolution requirements: `[{"color":"Blue","level":2,"memoryCost":0}]`.
- Printed clauses: Inherited: [When Attacking] Trash the digivolution card at the bottom of 1 of your opponent's Digimon with a level of 5 or less.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Inherited WhenAttacking → TrashDigivolution amount 1/fromTop false, opponent Digimon level ≤5. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-03.test.ts`. Existing attacks remove exactly the bottom opposing source and exclude a level-6 opponent. The public MetalGarurumon gauntlet distinguishes this level-5 ceiling from Garurumon’s unrestricted source removal across real evolution and attacks.
- Peer/stack suite: `apps/api/src/cards/ST2/source-strip-metalgarurumon-deck.test.ts`; public evolution costs, inherited-source order and real attack/security outcomes.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-04 — Bearmon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-04` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 3; DP 4000; level 3; traits Beast. Evolution requirements: `[{"color":"Blue","level":2,"memoryCost":0}]`.
- Printed clauses: vanilla; no main, inherited or Security effects.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Full, residual-free empty compiled effects; printed metadata is consumed by the shared play/evolution and DP mechanics. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-04.test.ts`. Existing vanilla test observes catalog identity, level, color, Beast trait, printed cost and base/current DP; no main, inherited or Security clause is printed. Compared with Gomamon/Ikkakumon’s empty IR and Gabumon’s inherited IR; no trait-filter or inherited-stack behavior exists to duplicate.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-05 — Ikkakumon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-05` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 4; DP 5000; level 4; traits Sea Beast. Evolution requirements: `[{"color":"Blue","level":3,"memoryCost":2}]`.
- Printed clauses: vanilla; no main, inherited or Security effects.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Full, residual-free empty compiled effects; printed metadata is consumed by the shared play/evolution and DP mechanics. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-05.test.ts`. Existing vanilla test observes catalog identity, level, color, Sea Beast trait, printed cost and base/current DP, and residual-free empty IR. Compared with Gomamon’s same trait and neighboring Garurumon’s inherited implementation; this card has no trait filter or effect.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-06 — Garurumon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-06` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 5; DP 4000; level 4; traits Beast. Evolution requirements: `[{"color":"Blue","level":3,"memoryCost":2}]`.
- Printed clauses: Inherited: [When Attacking] Trash the digivolution card at the bottom of 1 of your opponent's Digimon.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Inherited WhenAttacking → TrashDigivolution amount 1/fromTop false, opponent Digimon without a level ceiling. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-06.test.ts`. Existing public attacks discard the exact bottom source from a multi-source opponent and safely handle a source-less opponent. The public gauntlet proves that Garurumon strips level 6 where Gabumon is excluded, then enables WereGarurumon during the same attack.
- Peer/stack suite: `apps/api/src/cards/ST2/source-strip-metalgarurumon-deck.test.ts`; public evolution costs, inherited-source order and real attack/security outcomes.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-07 — Grizzlymon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-07` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 5; DP 6000; level 4; traits Beast. Evolution requirements: `[{"color":"Blue","level":3,"memoryCost":2}]`.
- Printed clauses: Main: ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to force the opponent to attack it instead.)[When Attacking] Lose 2 memory.
- KB/rules: Q610; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Static Blocker keyword plus mandatory WhenAttacking → GainMemory -2. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-07.test.ts`. Public attack pays the mandatory two-memory loss across zero (1 → -1); public declareBlock redirects the attack and preserves security. Shared combat/attackIntegration.test.ts separately proves public declineBlock and security completion for the same registered Blocker keyword; no card-specific refusal body exists.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-08 — WereGarurumon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-08` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 7; DP 7000; level 5; traits Beastkin. Evolution requirements: `[{"color":"Blue","level":4,"memoryCost":3}]`.
- Printed clauses: Inherited: [Your Turn] While your opponent has a Digimon with no digivolution cards, this Digimon gains ＜Security Attack +1＞. (This Digimon checks 1 additional security card.)
- KB/rules: Q611–Q614; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Inherited YourTurn → self Aura(SecurityAttack +1), while an opposing battle-area Digimon has zero sources. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-08.test.ts`. Existing conditional aura tests distinguish source-less battle-area Digimon from sourced Digimon, breeding and an empty board. The public evolution/attack gauntlet strips the last source, enables Security Attack +1 during that attack, checks twice, then proves MetalGarurumon’s second-attack limit.
- Peer/stack suite: `apps/api/src/cards/ST2/source-strip-metalgarurumon-deck.test.ts`; public evolution costs, inherited-source order and real attack/security outcomes.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-09 — Zudomon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-09` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 6; DP 7000; level 5; traits Sea Beast. Evolution requirements: `[{"color":"Blue","level":4,"memoryCost":3}]`.
- Printed clauses: Main: [When Digivolving] Trash 2 digivolution cards at the bottom of 1 of your opponent's Digimon.
- KB/rules: Q615; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: WhenDigivolving → TrashDigivolution amount 2/fromTop false, one opposing Digimon. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-09.test.ts`. Both existing public digivolutions now prove memory 5 → 2, the exact Zudomon top, the exact former Garurumon source and the evolution draw. They discard exactly the two bottom opposing sources while preserving the remaining top source, or discard the only source when fewer than two exist.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-10 — Plesiomon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-10` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 10; DP 12000; level 6; traits Plesiosaur. Evolution requirements: `[{"color":"Blue","level":5,"memoryCost":2}]`.
- Printed clauses: vanilla; no main, inherited or Security effects.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Full, residual-free empty compiled effects; printed metadata is consumed by the shared play/evolution and DP mechanics. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-10.test.ts`. Existing vanilla test observes identity, level 6, Blue/Plesiosaur metadata, 12000 base/current DP, printed costs and empty full IR. Kaiser Nail additionally uses Plesiomon as a host and proves that source play retains the host identity and isolates host modifiers.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-11 — MetalGarurumon

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-11` in `packages/shared/src/cards/data/cards.json`: Digimon; Blue; printed play/use cost 12; DP 11000; level 6; traits Cyborg. Evolution requirements: `[{"color":"Blue","level":5,"memoryCost":4}]`.
- Printed clauses: Main: [When Attacking][Once Per Turn] Unsuspend this Digimon.
- KB/rules: Q616–Q618; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: WhenAttacking → Unsuspend self, frequency OncePerTurn. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-11.test.ts`. The existing public attack test now checks three legal security cards: first attack unsuspends, second attack stays suspended, and an opponent turn plus the controller’s next production turn restore the once-per-turn effect for a third attack. The production turn promise is ended and awaited. The shared gauntlet proves the same effect in an evolved inherited stack.
- Peer/stack suite: `apps/api/src/cards/ST2/source-strip-metalgarurumon-deck.test.ts`; public evolution costs, inherited-source order and real attack/security outcomes.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-12 — Matt Ishida

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-12` in `packages/shared/src/cards/data/cards.json`: Tamer; Blue; printed play/use cost 2; DP 0. Evolution requirements: `[]`.
- Printed clauses: Main: [Start of Your Turn] If your opponent has a Digimon with no digivolution cards, gain 1 memory. | Security: [Security] Play this card without paying its memory cost.
- KB/rules: Q619–Q622; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: StartOfYourTurn → gain 1 memory when opponent has a source-less battle-area Digimon; Security → free self play. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-12.test.ts`. Existing start-turn tests distinguish no-source, sourced, breeding-only and empty opposing boards, and observe one memory per copy across multiple Tamers. An actual opponent attack reveals and plays the exact Security Tamer for free.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-13 — Hammer Spark

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-13` in `packages/shared/src/cards/data/cards.json`: Option; Blue; printed play/use cost 0; DP 0. Evolution requirements: `[]`.
- Printed clauses: Main: [Main] Gain 1 memory. | Security: [Security] Gain 2 memory.
- KB/rules: Q623, Q881, Q1081, Q1088, Q1098, Q1416; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Main → GainMemory 1; Security → GainMemory 2. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-13.test.ts`. Existing Main intent gains one memory; the strengthened Security test uses an actual opponent attack, waits for security/attack completion and observes signed active-seat memory -2 for the owner’s gain of two.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-14 — Sorrow Blue

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-14` in `packages/shared/src/cards/data/cards.json`: Option; Blue; printed play/use cost 2; DP 0. Evolution requirements: `[]`.
- Printed clauses: Main: [Main] Choose 1 of your opponent's Digimon with no digivolution cards. That Digimon can't attack or block until the end of your opponent's next turn. | Security: [Security] Choose 1 of your opponent's Digimon with no digivolution cards. That Digimon can't attack or block until the end of your next turn.
- KB/rules: Q624–Q625; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Main/Security → Restrict attackOrBlock on one source-less opposing Digimon; untilOpponentTurnEnd / untilYourTurnEnd respectively. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-14.test.ts`. Existing Main proof restricts attack/block on a source-less opponent, retains the restriction after that target gains a source, and expires at the opponent turn boundary. Strengthened Security proof uses an actual attack and expires at the owner’s next turn end. All draw/security fixtures are legal non-Egg cards.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-15 — Kaiser Nail

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-15` in `packages/shared/src/cards/data/cards.json`: Option; Blue; printed play/use cost 4; DP 0. Evolution requirements: `[]`.
- Printed clauses: Main: [Main] Choose a Digimon digivolution card placed under 1 of your Digimon and play it as another Digimon without paying its memory cost. | Security: [Security] Activate this card's [Main] effect.
- KB/rules: Q626–Q629; comprehensive play/evolution/battle/target/zone rules apply. Mandatory processing and target count were also confirmed against the [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf), §15-9-1-2 and §15-10-2-1.
- IR trace: Direct SelectBind requires a friendly Digimon host with a Digimon source; mandatory PlayWithoutCost selects only a Digimon source under that exact bound host. Security → ActivateMain. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-15.test.ts`. Existing Main proof pays the Option’s four memory, plays the exact Digimon source free and unsuspended, excludes Egg/Tamer sources, preserves the host and isolates its temporary DP modifier, and rejects an attack on the played turn. Manual selection distinguishes identical hosts by permanent ID, excludes the Tamer-only host and proceeds directly to mandatory source selection. No valid-source case resolves without a new Digimon. Security now resolves through an actual opponent attack.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

### ST2-16 — Cocytus Breath

- Current score: 10/10 (2026-09-13). Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack proof 2/2; delivery 2/2.
- Catalog: `ST2-16` in `packages/shared/src/cards/data/cards.json`: Option; Blue; printed play/use cost 7; DP 0. Evolution requirements: `[]`.
- Printed clauses: Main: [Main] Return 1 of your opponent's Digimon to its owner's hand. (Trash all of the digivolution cards of that Digimon.) | Security: [Security] Activate this card's [Main] effect.
- KB/rules: no card-specific local entries; comprehensive play/evolution/battle/target/zone rules apply.
- IR trace: Direct Main → Return one opposing Digimon to hand; returnToHand already trashes that target’s sources. Security → ActivateMain. The unprinted friendly Trash action is removed. Exclusive `registerIrCard` registration is checked by `collection.audit.test.ts`.
- Reproducible proof: `apps/api/src/cards/ST2/ST2-16.test.ts`. Strengthened Main proof pays 10 → 3 memory, returns the exact opposing top to its owner’s hand, trashes exactly its source instances and leaves the friendly host/source unchanged, with only the Option in its owner’s trash. Actual Security attack proves exact target/source/Option destinations and preserves the other attacker.
- Remaining ambiguity: none identified. Evidence commit: `00c0d5be7a611a27507d47040a934fee9b2b356d` (including the preceding atomic card corrections).

## Mechanisms

### Continuous field-battle bonus

ST2-01 uses the already committed `selfBattlesOpponentMatching` condition and live battle context. Public direct/effect/Blocker battle and Piercing Security lapse evidence is retained in its focused tests; the public full evolution-line test closes the missing stack proof. No engine change was required in this worktree. The prior cross-set reasoning remains in [battle duration boundaries](engine/battle-duration-boundaries.md).

### Option source isolation and mandatory targeting

ST2-16’s corrected direct IR delegates return/source cleanup to `returnToHand` (`effects/primitives.ts:4455`) and removes the trailing friendly-field Trash (`interpreter/actions/removal.ts:611`). ST2-15 uses the existing `digivolutionStackKind` matcher (`interpreter/matching/permanent.ts:578`) to require a Digimon source and removes its unprinted optional play. Host binding, loose source selection and free-play entry continue through existing engine primitives. No shared engine code changed.

## Knowledge base index

Queries of all sixteen IDs were repeated on 2026-09-13. ST2-01–06, ST2-10 and ST2-16 have no card-specific entries. ST2-07: Q610; ST2-08: Q611–Q614; ST2-09: Q615; ST2-11: Q616–Q618; ST2-12: Q619–Q622; ST2-13: Q623/Q881/Q1081/Q1088/Q1098/Q1416; ST2-14: Q624–Q625; ST2-15: Q626–Q629.

## Open items

None in card fidelity, rules or behavioral proof. All sixteen cards are 10/10 and final focused/collection/mechanism, type and effect synchronization gates are green. Orca workspace completion remains pending because its desktop/runtime is unavailable; no completed workspace status is claimed. Historical claims of complete Tsunomon proof and correct Cocytus/Kaiser execution are superseded by the counterfactuals and corrections above; historical green gates alone did not establish those paths.

## Delivery closeout

Atomic implementation/proof commits:

- `fa28aa66c`: Cocytus Breath direct IR, synchronized snapshot and exact source-isolation regression.
- `7da060ea6`: Kaiser Nail mandatory eligible-source selection, synchronized snapshot and comparative/public Security proof.
- `00c0d5be7`: public full evolution-line, paid evolution/source/draw proof, turn reset and legal/public Security fixtures for the rest of ST2.

Final ledger/index/layout gate: `pnpm audit:index`, `pnpm audit:index --check`, scoped `oxlint`, `oxfmt --check` on ST2 plus both audit documents, and `git diff --check`. The audit-doc layout suite passes one file / four tests. The generated status index covers 66 sets and records ST2 as verified on 2026-09-13.

Branch `audit-ST2-20260913` is delivered through normal pushes to `origin`; [PR #4755](https://github.com/vinicius3333/aegis-digimon-tcg/pull/4755) holds the implementation and final ledger/index delivery. No merge is performed.

Pending external workspace operation: the Orca runtime returned `runtime_timeout`; `orca status --json` reports the app process running with runtime/graph `starting` and unreachable. The public recovery attempt `orca open --json` terminated with `runtime_open_timeout` (no desktop window). No other agent/session was stopped. Once the runtime is reachable, execute and verify:

```sh
orca worktree set --worktree active --workspace-status completed --comment "COLLECTION COMPLETE: ST2; 100% 10/10; branch pushed" --json
```

The technical collection certification is complete; the Orca child-worktree closeout and the overall task remain pending until that required operation succeeds.

## History

- Previous `docs/audits/ST2.md` at `538ef381f785d4e073ca37953a6625219d53a066` (2026-09-12) consolidated historical reports and reopened ST2-01 for missing public full-line proof; this complete 2026-09-13 recalculation supersedes its scores and open items.

- `docs/audits/ST2-AUDIT.md` — last commit `68b539ae2`, 2026-08-31. First per-card ledger for the set; merged into Gates and the Card ledger.
- `docs/audits/ST2-PROOF-AUDIT.md` — last commit `e4cae2ca2`, 2026-09-05. Coordinator proof review that superseded the first ledger; merged into Gates and the Card ledger.
- `docs/audits/ST1-8-LUNA-REAUDIT.md` — last commit `016c9b325`, 2026-09-05. Provisional ST1–ST8 Luna checkpoint covering 120 cards; its per-card rows for this set are merged into the Card ledger and its verification notes into Gates.
- The shared starter-deck files `docs/audits/ST-REAUDIT-PLAN.md`, `docs/audits/ST-REAUDIT-RESULTS.md` and `docs/audits/ST-REAUDIT-EVIDENCE.json` (2026-09-05) are the winning sources quoted above. They cover all 23 ST collections and are removed with the last ST set consolidated.
- Raw evidence for this set is not retained in the tree. It is reachable in git history at `eabe99351`, the HEAD before these files were removed.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for ST2: PR #4591; commit `9ddd1b002`.
