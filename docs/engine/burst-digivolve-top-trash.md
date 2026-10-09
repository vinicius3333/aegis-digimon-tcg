# Burst Digivolve top-card pending processing

## Rule and defect

The [August 2026 comprehensive rules, §8-3-2-1](https://world.digimoncard.com/rule/pdf/general_rule.pdf) require Burst end-turn pending processing to trash the current top Digimon card when another card remains beneath it. The [Ravemon Q2335 ruling](https://world.digimoncard.com/rule/?card_no=BT13-089) distinguishes the earlier trigger window from subsequent pending cleanup: Burst Mode is still on top when ordinary end-turn effects trigger, then is trashed. Promoting Ravemon afterward does not trigger its ordinary end-turn effect again.

The former `GameEngine.processPendingBurstDigivolveTrash` selected the highest digivolution source and called `trashDigivolutionCards`. It left Burst Mode on top and discarded the former evolution material. Existing BT13 and chapter-eight assertions accepted this wrong result. Local comprehensive-0132 prose likewise treated the stacked top as a source; it must not override the official rule or the full Q2335 question and answer.

## Correction and proof

Pending processing now checks the current top definition and requires at least one source, clears the pending flag unconditionally, and uses the existing `trashStackTops` primitive to trash one current top and promote the highest source. A source-free permanent or non-Digimon top remains unchanged. The existing primitive preserves permanent identity, emits its dedicated top-trash subtrigger, and does not repeat ordinary end-turn trigger collection. No second registration or card-specific cleanup is introduced.

The revised existing BT13-092 case executes a public zero-cost Burst evolution followed by an actual own turn end. It fails the intended exact promoted-top assertion with the former engine (**six passed, one failed**) and passes all **seven** with the correction: the exact Burst identity is in trash, the original Ravemon identity is the unchanged permanent's top, and Ravemon is absent from trash. Existing 020, 033 and 060 cases prove the equivalent actual own-end behavior and payment for the other three BT13 Burst consumers. The existing 089 Q2335 case proves ordinary Ravemon deletion remains unarmed through actual own and opposing ends. Chapter-eight supplemental pending-window evidence also retains an additional exact source identity.

## Validation

Serialized command, `TEST_HEAP_MB=1536`, `--maxWorkers=1 --no-file-parallelism`: `pnpm --filter @aegis/api exec vitest run src/cards/BT13 src/engine/combat src/engine/decisions src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/capabilities.test.ts src/engine/effects/grantAuraOwnership.test.ts src/engine/effects/seamChainedTargetsAndCostCounts.test.ts src/engine/effects/interpreter/targetFate.test.ts src/engine/effects/interpreter/registration/module.test.ts src/engine/effects/ex12Gap10ForcedAttack.test.ts src/engine/conformance/ch11-attacking.test.ts src/engine/conformance/king-drasil-joint-placement.test.ts src/engine/conformance/king-drasil-batch-placement-events.test.ts src/engine/conformance/digivolution-card-placement.test.ts src/engine/cards/breedingCluster.test.ts src/engine/cards/irKindTier1Cluster.test.ts src/engine/mechanic.test.ts src/cards/BT18/BT18-069.test.ts src/cards/audit-docs.test.ts src/engine/conformance/ch08-digivolution.test.ts`: **155 files, 1973 tests passed**, 6.84 seconds. The AD1-002 unsupported-payload error is expected output from a passing negative case.

Strict API passes with `NODE_OPTIONS=--max-old-space-size=4096 pnpm --filter @aegis/api typecheck`. Scoped changed TypeScript lint/format and `git diff --check` pass. No card IR or generated effect record changes are required by this engine correction.

These are affected-scope results. Two independently reproduced BT14-090 baseline failures in broader activation-cost suites remain outside this passing manifest. Whole-set BT13 completion still requires fresh card-by-card scoring and final delivery evidence in [the collection ledger](../BT13.md).
