# BT4 Card Implementation Audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 115 cards, `BT4-001` through `BT4-115`, derived from `packages/shared/src/cards/data/cards.json`.

This ledger follows the repository's `verify-card-implementation` protocol and the chronological execution plan in `docs/plans/2026-08-27-bt-card-by-card-audit.md`. File presence, full IR metadata, generated snapshots, and existing tests are evidence inputs rather than proof of fidelity.

## Current execution state

The initial pass intentionally does not execute tests, typecheck, lint, formatting, browser/UI validation, or `git diff --check`, at the user's request. Workers may correct implementation gaps and strengthen tests, but every inspected card remains provisional and no collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT4-001–010 | Luna in progress | `internal-docs/audits/BT4/BT4-001-010.md` | No |
| BT4-011–020 | Luna in progress | `internal-docs/audits/BT4/BT4-011-020.md` | No |
| BT4-021–030 | Luna in progress | `internal-docs/audits/BT4/BT4-021-030.md` | No |
| BT4-031–040 | Unassigned | `internal-docs/audits/BT4/BT4-031-040.md` | No |
| BT4-041–050 | Unassigned | `internal-docs/audits/BT4/BT4-041-050.md` | No |
| BT4-051–060 | Unassigned | `internal-docs/audits/BT4/BT4-051-060.md` | No |
| BT4-061–070 | Unassigned | `internal-docs/audits/BT4/BT4-061-070.md` | No |
| BT4-071–080 | Unassigned | `internal-docs/audits/BT4/BT4-071-080.md` | No |
| BT4-081–090 | Unassigned | `internal-docs/audits/BT4/BT4-081-090.md` | No |
| BT4-091–100 | Unassigned | `internal-docs/audits/BT4/BT4-091-100.md` | No |
| BT4-101–110 | Unassigned | `internal-docs/audits/BT4/BT4-101-110.md` | No |
| BT4-111–115 | Unassigned | `internal-docs/audits/BT4/BT4-111-115.md` | No |

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

Detailed clause traces and deferred commands will be recorded in the integrated range reports under `internal-docs/audits/BT4/`.

## Aggregate

- Catalog cards: 115
- Assigned: 30
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 85

BT4 remains open.
