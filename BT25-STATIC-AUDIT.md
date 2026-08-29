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
| BT25-001–010 | Coordinator reviewed | `internal-docs/audits/BT25/BT25-001-010.md` | Yes |
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
| BT25-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove TS-host Draw 1, non-TS rejection, and the inherited once-per-turn limit. |
| BT25-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DATA SQUAD Tamer play proves both-player draw, controller/turn scope, and once-per-turn behavior. |
| BT25-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A public attack proves the top-security cost, reduced Glowing Dawn evolution, stack change, and decline path. |
| BT25-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A public Link declaration on a legal stack proves recipient scope, eligible trait, cost reduction, and placement. |
| BT25-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Watcher and destination behavior are covered, but the positive stack-placement origin uses a direct primitive. |
| BT25-006 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A public opponent attack proves the positive branch; no-target and frequency/decline paths use injected subtriggers. |
| BT25-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Link/evolution proves stack and deletion boundaries, while the central reveal timing is manually fired. |
| BT25-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public play and breeding movement prove paid-count scaling; decline and inherited-turn edges remain manually driven. |
| BT25-009 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Memory, trait/exclusion, evolution, and inherited DP boundaries are covered through manual Start of Main timing. |
| BT25-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural eligible digivolution proves the cost reduction; exclusion, breeding, and inherited-turn edges remain structural. |

## Aggregate

- Catalog cards: 104
- Assigned: 30
- Integrated card audits: 10
- Corrected: 0
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 6
- Remaining unassigned: 74

BT25 static integration is complete through BT25-010. BT25-011 through
BT25-030 remain active across two Luna/xhigh lanes.
