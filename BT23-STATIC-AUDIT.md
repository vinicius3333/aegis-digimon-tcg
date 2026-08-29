# BT23 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT22 integration remains ahead in chronological order; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT23-001` through `BT23-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT23/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT23/`. BT23 work may be prepared in parallel, but it
will not be integrated before the BT22 ledger is complete.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT23-001–010 | Luna assigned | `internal-docs/audits/BT23/BT23-001-010.md` | No |
| BT23-011–020 | Unassigned | `internal-docs/audits/BT23/BT23-011-020.md` | No |
| BT23-021–030 | Unassigned | `internal-docs/audits/BT23/BT23-021-030.md` | No |
| BT23-031–040 | Unassigned | `internal-docs/audits/BT23/BT23-031-040.md` | No |
| BT23-041–050 | Unassigned | `internal-docs/audits/BT23/BT23-041-050.md` | No |
| BT23-051–060 | Unassigned | `internal-docs/audits/BT23/BT23-051-060.md` | No |
| BT23-061–070 | Unassigned | `internal-docs/audits/BT23/BT23-061-070.md` | No |
| BT23-071–080 | Unassigned | `internal-docs/audits/BT23/BT23-071-080.md` | No |
| BT23-081–090 | Unassigned | `internal-docs/audits/BT23/BT23-081-090.md` | No |
| BT23-091–100 | Unassigned | `internal-docs/audits/BT23/BT23-091-100.md` | No |
| BT23-101–102 | Unassigned | `internal-docs/audits/BT23/BT23-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |

## Aggregate

- Catalog cards: 102
- Assigned: 10
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 92

BT23 static auditing is prepared in parallel. Accepted ranges will be
integrated only after BT22, then in strict ascending BT23 order.
