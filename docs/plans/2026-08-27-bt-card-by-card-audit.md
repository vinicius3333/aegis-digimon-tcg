# BT Card-by-Card Audit Execution Plan

Date: 2026-08-27

## Objective

Audit every main booster collection from BT1 through BT26 in release-number order. Audit one card contract at a time with the repository's `verify-card-implementation` protocol, correct implementation gaps through compiled IR, preserve an English versioned audit ledger for every collection, and use isolated Luna worktrees for the detailed inspection and correction work.

The committed catalog is authoritative for collection membership. At the start of this plan it contains 26 BT collections and 2,789 cards:

| Queue | Cards | Queue | Cards |
| --- | ---: | --- | ---: |
| BT1 | 115 | BT14 | 102 |
| BT2 | 112 | BT15 | 102 |
| BT3 | 112 | BT16 | 102 |
| BT4 | 115 | BT17 | 102 |
| BT5 | 112 | BT18 | 102 |
| BT6 | 112 | BT19 | 102 |
| BT7 | 112 | BT20 | 102 |
| BT8 | 112 | BT21 | 102 |
| BT9 | 112 | BT22 | 102 |
| BT10 | 112 | BT23 | 102 |
| BT11 | 112 | BT24 | 102 |
| BT12 | 112 | BT25 | 104 |
| BT13 | 112 | BT26 | 104 |

Existing ledgers are prior evidence, not permission to skip a collection. Each collection is revisited in queue order and its evidence is normalized or replaced when it cannot prove the current catalog and implementation.

## Execution model

The durable integration branch is `audit-bt-card-by-card`. Only one collection is active at a time. Its cards are divided into contiguous, non-overlapping ranges and assigned to three child worktrees running Codex Luna. A worker processes its assigned range in ascending card-ID order and makes one atomic commit per audited card whenever code or proof changes. Documentation-only findings may be grouped only when no card implementation or behavioral proof changes.

Workers own disjoint card modules, colocated tests, and range reports. Shared engine changes are isolated in their originating branch. Completed branches are integrated sequentially without rebasing or squashing, with shared-seam conflicts resolved and the collection ledger assembled in ascending card order. The next collection starts only after the active one reaches an honest terminal state.

The first BT1 wave is:

| Worker | Card range | Report |
| --- | --- | --- |
| Luna A | BT1-001 through BT1-010 | `internal-docs/audits/BT1/BT1-001-010.md` |
| Luna B | BT1-011 through BT1-020 | `internal-docs/audits/BT1/BT1-011-020.md` |
| Luna C | BT1-021 through BT1-030 | `internal-docs/audits/BT1/BT1-021-030.md` |

Later waves continue from BT1-031. When the current collection is fully assigned and the user requests additional parallelism, the next collection may begin static preparation in isolated worktrees; its integration still waits for the preceding collection's static ledger coverage. Range sizes may shrink when cards share a complex engine seam, but queue order and card ownership remain explicit.

## Per-card protocol

For each card, the worker must:

1. Read every matching catalog record in `packages/shared/src/cards/data/cards.json`, including alternate evolution requirements, all printed text, traits, colors, costs, limits, and variants.
2. Run `node tools/kb/query.mjs card <CARD-ID>` and inspect every linked local ruling, erratum, restriction, or comprehensive-rule section.
3. Trace every printed clause through the direct module, compiled IR, and the shared primitives it invokes. The executable module must register exactly once through `registerIrCard(cardId, compiled)` and must not retain or introduce a duplicate `registerCard` path.
4. Inspect the colocated behavioral test and relevant peer, trait, targeting, and evolution-stack tests. Strengthen or add proof when a printed boundary is not represented, even though this execution pass does not run the test command.
5. Correct the smallest reusable engine seam when the IR cannot express the printed contract. Record unresolved ambiguity instead of approximating behavior.
6. Record clause-level evidence, changed files, intended test commands, remaining limitations, and the resulting score in the assigned range report.

Presence of a module or test is inventory only. A card receives 10/10 only when each printed clause is mapped to concrete behavior and the relevant focused, mechanism, collection, typecheck, and diff-validation commands have actually passed.

## Audit artifacts

Each active collection gets one canonical ledger named `docs/audits/BT<N>-AUDIT.md`. The ledger contains:

- the authoritative ordered card count and catalog snapshot commit;
- one section or row per card, in ascending card-ID order;
- catalog/KB, IR trace, behavioral proof, peer/stack proof, and validation scores;
- direct module and test paths;
- exact commands required to reproduce the judgment;
- explicit ambiguities, unsupported engine behavior, and tests not run;
- aggregate totals for audited, corrected, provisional, blocked, and verified 10/10 cards.

Range reports under `internal-docs/audits/BT<N>/` preserve worker detail and make parallel work mergeable. Their evidence is consolidated into the canonical ledger; a range report never proves collection completion by itself.

## Validation policy for this pass

The user explicitly waived test execution for the initial audit work. Workers therefore must not run Vitest, typecheck, collection suites, or broad regression suites. They may inspect and edit tests, and they must list the exact commands that a later verification pass should run. `git diff --check` is also deferred so that every execution gate is reported consistently as not run.

Consequences:

- a structurally correct or apparently faithful card remains provisional rather than verified 10/10;
- no collection may be reported as `100% 10/10` or marked complete under the repository's audit-worktree completion rule;
- no `COLLECTION COMPLETE` Orca notification is sent until all deferred commands pass;
- workers still commit and push their scoped branches, then report the latest commit, push result, modified files, findings, and remaining range.

## Integration and completion gates

After a wave completes, every diff and range report is reviewed, non-conflicting branches are merged into `audit-bt-card-by-card`, shared engine changes are reconciled, and the canonical collection ledger is updated. A fresh Luna wave receives the next unassigned ranges. This repeats until the collection has a record for every catalog card.

When test execution is later authorized, the collection closeout requires focused tests for every card, every affected engine-mechanism suite, the collection audit suite, `pnpm typecheck`, formatting/lint required by the repository, and `git diff --check`. Only then may every supported card become 10/10, the branch be pushed, and the required Orca completion notification be sent. Any ambiguity or unsupported engine behavior keeps the affected card below 10/10 and the collection open.

The global objective is complete only when BT1 through BT26 each have a current canonical ledger, every catalog card has reproducible evidence, every required correction is delivered through compiled IR, all deferred validation gates have passed, and every collection has been closed in chronological order.
