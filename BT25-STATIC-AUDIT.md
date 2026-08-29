# BT25 Static Card Implementation Re-audit

Status: static card-by-card audit prepared in parallel; BT24 retains integration priority

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 104 cards, `BT25-001` through `BT25-104`, derived from
the immutable committed card-catalog blob and reconciled with the 104 direct
card modules in `apps/api/src/cards/BT25/`.

This ledger follows the repository's `verify-card-implementation` protocol.
Detailed English reports belong under `internal-docs/audits/BT25/`. BT25 work
may be prepared while the already assigned BT24 tail is audited, but no BT25
range will be integrated before BT24 static integration closes.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

All 104 direct BT25 modules currently contain `registerIrCard`; none contains
`registerCard`. Each audited module must retain exclusive executable
registration through `registerIrCard(cardId, compiled)`.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT25-001–010 | Luna assigned | `internal-docs/audits/BT25/BT25-001-010.md` | No |
| BT25-011–020 | Luna assigned | `internal-docs/audits/BT25/BT25-011-020.md` | No |
| BT25-021–030 | Luna assigned | `internal-docs/audits/BT25/BT25-021-030.md` | No |
| BT25-031–040 | Unassigned | `internal-docs/audits/BT25/BT25-031-040.md` | No |
| BT25-041–050 | Unassigned | `internal-docs/audits/BT25/BT25-041-050.md` | No |
| BT25-051–060 | Unassigned | `internal-docs/audits/BT25/BT25-051-060.md` | No |
| BT25-061–070 | Unassigned | `internal-docs/audits/BT25/BT25-061-070.md` | No |
| BT25-071–080 | Unassigned | `internal-docs/audits/BT25/BT25-071-080.md` | No |
| BT25-081–090 | Unassigned | `internal-docs/audits/BT25/BT25-081-090.md` | No |
| BT25-091–100 | Unassigned | `internal-docs/audits/BT25/BT25-091-100.md` | No |
| BT25-101–104 | Unassigned | `internal-docs/audits/BT25/BT25-101-104.md` | No |

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

- Catalog cards: 104
- Assigned: 30
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 74

BT25 preparation uses three Luna/xhigh lanes while BT24 retains strict
integration priority.
