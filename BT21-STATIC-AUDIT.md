# BT21 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT20 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT21-001` through `BT21-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT20 static coverage is now recorded,
so accepted BT21 ranges may be integrated in strict ascending order while
Luna lanes continue preparing later ranges. Detailed English reports belong
under `internal-docs/audits/BT21/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT21-001–010 | Luna assigned | `internal-docs/audits/BT21/BT21-001-010.md` | No |
| BT21-011–020 | Luna assigned | `internal-docs/audits/BT21/BT21-011-020.md` | No |
| BT21-021–030 | Luna ready; pushed | `internal-docs/audits/BT21/BT21-021-030.md` | No |
| BT21-031–040 | Luna ready; pushed | `internal-docs/audits/BT21/BT21-031-040.md` | No |
| BT21-041–050 | Luna assigned | `internal-docs/audits/BT21/BT21-041-050.md` | No |
| BT21-051–060 | Luna assigned | `internal-docs/audits/BT21/BT21-051-060.md` | No |
| BT21-061–070 | Luna assigned | `internal-docs/audits/BT21/BT21-061-070.md` | No |
| BT21-071–080 | Unassigned | `internal-docs/audits/BT21/BT21-071-080.md` | No |
| BT21-081–090 | Unassigned | `internal-docs/audits/BT21/BT21-081-090.md` | No |
| BT21-091–100 | Unassigned | `internal-docs/audits/BT21/BT21-091-100.md` | No |
| BT21-101–102 | Unassigned | `internal-docs/audits/BT21/BT21-101-102.md` | No |

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
- Assigned: 70
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 32

BT21 static auditing is in progress; accepted ranges are eligible for strict
chronological integration.
