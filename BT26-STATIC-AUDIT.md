# BT26 Static Card Implementation Re-audit

Status: static card-by-card audit active; BT26-001 through BT26-020 assigned

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 104 cards, `BT26-001` through `BT26-104`, derived from
the immutable committed catalog at `packages/shared/src/cards/data/cards.json`
and reconciled with 104 direct modules in `apps/api/src/cards/BT26/`.

This ledger follows the repository's `verify-card-implementation` protocol.
Detailed English reports belong under `internal-docs/audits/BT26/`. Ranges are
reviewed and integrated in ascending card order by the coordinator.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, focused/mechanism/
collection gates, and `git diff --check` are prohibited for this static
campaign and remain unexecuted. Scores are provisional, use five fixed
two-point components, and are capped at 8/10 while Executed delivery gates is
0/2.

All 104 direct BT26 modules currently contain `registerIrCard`; none contains
`registerCard`. Each audited module must retain exclusive executable
registration through `registerIrCard(cardId, compiled)`.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT26-001–010 | Luna assigned | `internal-docs/audits/BT26/BT26-001-010.md` | No |
| BT26-011–020 | Luna assigned | `internal-docs/audits/BT26/BT26-011-020.md` | No |
| BT26-021–030 | Unassigned | `internal-docs/audits/BT26/BT26-021-030.md` | No |
| BT26-031–040 | Unassigned | `internal-docs/audits/BT26/BT26-031-040.md` | No |
| BT26-041–050 | Unassigned | `internal-docs/audits/BT26/BT26-041-050.md` | No |
| BT26-051–060 | Unassigned | `internal-docs/audits/BT26/BT26-051-060.md` | No |
| BT26-061–070 | Unassigned | `internal-docs/audits/BT26/BT26-061-070.md` | No |
| BT26-071–080 | Unassigned | `internal-docs/audits/BT26/BT26-071-080.md` | No |
| BT26-081–090 | Unassigned | `internal-docs/audits/BT26/BT26-081-090.md` | No |
| BT26-091–100 | Unassigned | `internal-docs/audits/BT26/BT26-091-100.md` | No |
| BT26-101–104 | Unassigned | `internal-docs/audits/BT26/BT26-101-104.md` | No |

## Score model

Each card is scored across Catalog/rules, IR trace, Behavioral proof, Peer and
stack proof, and Executed delivery gates. Unsupported, ambiguous,
structural-only, or manually injected evidence reduces the applicable
non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |

## Aggregate

- Catalog cards: 104
- Direct modules: 104
- Assigned: 20
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 84

BT26-001 through BT26-020 are active across two Luna/xhigh lanes. No
collection-complete claim is made while the static audit and delivery gates
remain incomplete.
