# BT18 Static Card Implementation Re-audit

Status: static preparation overlap in progress; chronological integration waits for BT17; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT18-001` through `BT18-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT18 workers may prepare static range
evidence because every BT17 card is already assigned and the user requested
five parallel Luna lanes, but no BT18 range may be integrated before BT17
static coverage is recorded. Detailed English reports belong under
`internal-docs/audits/BT18/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT18-001–010 | Luna assigned | `internal-docs/audits/BT18/BT18-001-010.md` | No |
| BT18-011–020 | Luna assigned | `internal-docs/audits/BT18/BT18-011-020.md` | No |
| BT18-021–030 | Luna assigned | `internal-docs/audits/BT18/BT18-021-030.md` | No |
| BT18-031–040 | Luna assigned | `internal-docs/audits/BT18/BT18-031-040.md` | No |
| BT18-041–050 | Luna assigned | `internal-docs/audits/BT18/BT18-041-050.md` | No |
| BT18-051–060 | Unassigned | `internal-docs/audits/BT18/BT18-051-060.md` | No |
| BT18-061–070 | Unassigned | `internal-docs/audits/BT18/BT18-061-070.md` | No |
| BT18-071–080 | Unassigned | `internal-docs/audits/BT18/BT18-071-080.md` | No |
| BT18-081–090 | Unassigned | `internal-docs/audits/BT18/BT18-081-090.md` | No |
| BT18-091–100 | Unassigned | `internal-docs/audits/BT18/BT18-091-100.md` | No |
| BT18-101–102 | Unassigned | `internal-docs/audits/BT18/BT18-101-102.md` | No |

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

BT18 static preparation is in progress; chronological integration remains blocked on BT17 static coverage.
