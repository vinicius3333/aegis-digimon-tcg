# BT1 Card Implementation Audit

Status: in progress

Catalog snapshot: `ef2e5b367c616299806c87d6b078ce6fc2822b78`

Authoritative scope: 115 cards, `BT1-001` through `BT1-115`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger is assembled strictly in ascending card-ID order under the repository's `verify-card-implementation` protocol. File presence, full IR coverage, and an existing test file are inventory facts only. A card receives 10/10 only after every printed clause and applicable ruling is traced to executable compiled IR, meaningful behavioral and peer/stack proof exists, and the recorded validation commands have actually passed.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional until those commands are run. No collection-complete claim is valid during this pass.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT1-001–010 | Luna dispatched | `internal-docs/audits/BT1/BT1-001-010.md` | No |
| BT1-011–020 | Luna dispatched | `internal-docs/audits/BT1/BT1-011-020.md` | No |
| BT1-021–030 | Luna dispatched | `internal-docs/audits/BT1/BT1-021-030.md` | No |
| BT1-031–115 | Queued | Not assigned | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** complete identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

A provisional static audit can earn at most 8/10 because component 5 requires executed evidence. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

Card rows are added after the coordinator reviews and integrates each Luna range report. Each row will include the card ID and name, all five component scores, final status, direct evidence paths, exact deferred commands, and unresolved limitations.

## Aggregate

- Catalog cards: 115
- Assigned: 30
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 85

BT1 remains open.
