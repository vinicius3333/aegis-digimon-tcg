# BT22 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT21 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT22-001` through `BT22-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT22/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT22/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT22-001–010 | Luna assigned | `internal-docs/audits/BT22/BT22-001-010.md` | No |
| BT22-011–020 | Luna assigned | `internal-docs/audits/BT22/BT22-011-020.md` | No |
| BT22-021–030 | Luna assigned | `internal-docs/audits/BT22/BT22-021-030.md` | No |
| BT22-031–040 | Luna assigned | `internal-docs/audits/BT22/BT22-031-040.md` | No |
| BT22-041–050 | Luna assigned | `internal-docs/audits/BT22/BT22-041-050.md` | No |
| BT22-051–060 | Unassigned | `internal-docs/audits/BT22/BT22-051-060.md` | No |
| BT22-061–070 | Unassigned | `internal-docs/audits/BT22/BT22-061-070.md` | No |
| BT22-071–080 | Unassigned | `internal-docs/audits/BT22/BT22-071-080.md` | No |
| BT22-081–090 | Unassigned | `internal-docs/audits/BT22/BT22-081-090.md` | No |
| BT22-091–100 | Unassigned | `internal-docs/audits/BT22/BT22-091-100.md` | No |
| BT22-101–102 | Unassigned | `internal-docs/audits/BT22/BT22-101-102.md` | No |

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
- Assigned: 50
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 52

BT22 static auditing is in progress. Accepted ranges will be integrated in
strict ascending order while later Luna lanes prepare in parallel.
