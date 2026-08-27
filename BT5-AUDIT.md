# BT5 Card Implementation Audit

Status: static card-by-card pass queued; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT5-001` through `BT5-112`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, browser/UI validation, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT5-001–010 | Queued for Luna | `internal-docs/audits/BT5/BT5-001-010.md` | No |
| BT5-011–020 | Queued for Luna | `internal-docs/audits/BT5/BT5-011-020.md` | No |
| BT5-021–030 | Queued for Luna | `internal-docs/audits/BT5/BT5-021-030.md` | No |
| BT5-031–040 | Queued for Luna | `internal-docs/audits/BT5/BT5-031-040.md` | No |
| BT5-041–050 | Queued for Luna | `internal-docs/audits/BT5/BT5-041-050.md` | No |
| BT5-051–060 | Queued for Luna | `internal-docs/audits/BT5/BT5-051-060.md` | No |
| BT5-061–070 | Queued for Luna | `internal-docs/audits/BT5/BT5-061-070.md` | No |
| BT5-071–080 | Queued for Luna | `internal-docs/audits/BT5/BT5-071-080.md` | No |
| BT5-081–090 | Queued for Luna | `internal-docs/audits/BT5/BT5-081-090.md` | No |
| BT5-091–100 | Queued for Luna | `internal-docs/audits/BT5/BT5-091-100.md` | No |
| BT5-101–110 | Queued for Luna | `internal-docs/audits/BT5/BT5-101-110.md` | No |
| BT5-111–112 | Queued for Luna | `internal-docs/audits/BT5/BT5-111-112.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** complete identity, printed contract, local KB, rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality, cost, zones, duration, Security, and once-per-turn cases as applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests, typecheck, repository quality gate, and `git diff --check` have passed on the delivered commit.

A provisional static audit can earn at most 8/10 because component 5 requires executed evidence. Unsupported or ambiguous behavior may reduce any other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT5/`.

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT5 remains open.
