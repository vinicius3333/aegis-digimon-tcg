# Deletion-time security candidates

Status: validated mechanism checkpoint; BT13 whole-collection recalculation remains incomplete.

## Rule and defect

BT13-015 RizeGreymon's direct and inherited effects place one exact-name Marcus Damon from the owner's trash on top of security face down when an own red/yellow Tamer is deleted. [Official Q2274](https://world.digimoncard.com/rule/?card_no=BT13-015) explicitly permits choosing the Marcus being deleted.

The interpreter resolves deletion observers while the subject is still live. `SecurityManipulation/placeAsSecurity` previously admitted that subject's matching top card as a virtual trash candidate only when no ordinary eligible trash card existed. With an earlier Marcus already in trash, the currently deleting Marcus was omitted and the existing Marcus selected without a choice.

The correction merges the currently deleting matching top card into ordinary loose candidates whenever the source zones include trash, deduplicating by exact instance identity. Existing controller/kind/color/name/trait guards, `pickLoose` selection and exact-instance security relocation remain in place. No card module or second registration is added.

## Reproducible proof

`apps/api/src/cards/BT13/BT13-015.test.ts` retains two existing cases, direct and inherited. A legal red Lv6 Phoenixmon carries the Lv5 inherited source. Three registered Marcus Tamers become 3000-DP Digimon through their actual start-main producer; public attacks tie against printed 3000-DP security and delete them. First deletion places the exact chosen Marcus face down, second same-turn deletion is suppressed and leaves another Marcus in trash, and the third deletion after own/opponent/own boundaries permits selecting the newly deleting Marcus despite that earlier eligible trash card. The source identity stays unchanged.

Before this correction both exact-third-identity assertions failed: the earlier second Marcus was placed instead and no card-selection decision was offered. A focused direct-case diagnostic reproduced one failure/five skipped with the original engine at `b98f13214`; the diagnostic print was removed. The same retained assertions pass with the corrected candidate merge. The catalog authorizes any eligible Marcus from trash; the test explicitly prefers the newly deleting third instance rather than requiring it to be the only permitted choice.

## Gates, 2026-09-13

- Serialized focus: `TEST_HEAP_MB=1536 pnpm --filter @aegis/api exec vitest run src/cards/BT13/BT13-014.test.ts src/cards/BT13/BT13-015.test.ts src/cards/BT13/BT13-016.test.ts src/cards/BT13/BT13-020.test.ts src/cards/BT13/BT13-021.test.ts --maxWorkers=1 --no-file-parallelism`: 5 files/31 tests pass, 0.671 seconds.
- Affected manifest: the BT13 ledger's existing 39-file/1083-test manifest plus `src/engine/cards/irKindTier1Cluster.test.ts` and `src/engine/mechanic.test.ts`: 41 files/1216 tests pass, 5.53 seconds. It covers loose security placement, filters, selection, exact-instance relocation and the prior forced-attack/placement mechanisms. The AD1-002 unsupported-payload log belongs to an intentional passing negative case.
- Independent read-only review found no controller/color/zone leak or lost ordinary candidate. Current-zone-dependent filters retain their existing permanent matching behavior; this checkpoint does not claim additional semantics for such filters.
- Scoped TypeScript lint/format and `git diff --check` pass. Final current collection and strict API gates are recorded in the collection ledger when executed; no collection completion is inferred here.

- Final collection-plus-layout on `e0b56c8c3`: 114 files/744 tests pass, 2.29 seconds. Strict API at 4096 MB passes. The engine candidate implementation is unchanged from its 41-file/1216-test gate.
