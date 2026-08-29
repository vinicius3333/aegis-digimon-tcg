# BT26 Static Card Implementation Re-audit

Status: static integration complete through BT26-010; audit assigned through BT26-030

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
| BT26-001–010 | Coordinator reviewed | `internal-docs/audits/BT26/BT26-001-010.md` | Yes |
| BT26-011–020 | Luna assigned | `internal-docs/audits/BT26/BT26-011-020.md` | No |
| BT26-021–030 | Luna assigned | `internal-docs/audits/BT26/BT26-021-030.md` | No |
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
| BT26-001 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Deck-add evolution uses a primitive origin and the source fixture omits a legal level-3 intermediary. |
| BT26-002 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | The Tamer-under-card trash watcher is directly injected and the positive host stack is off-color/incomplete. |
| BT26-003 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | A public opponent attack proves redirect/payment boundaries, but the inherited source fixture uses an illegal direct stack. |
| BT26-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected the generic hand-card cost; a natural attack proves a Tamer card can be placed face down under a Glowing Dawn Tamer. |
| BT26-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Avian/DATA SQUAD and Q6958 boundaries use a realistic stack, but deletion originates through a direct primitive. |
| BT26-006 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Public attacks cover failure edges, while the main play/use positive is manually fired and uses an incomplete Bagra Army stack. |
| BT26-007 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Link source/host restrictions are traced, but the positive attack is manually fired over an off-color/incomplete stack. |
| BT26-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, breeding movement, alternate evolution, bound grants, expiry, and inherited-turn behavior are represented. |
| BT26-009 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Alternate evolution is natural, but phase/attack positives are manual and the inherited fixture omits a legal level-4 intermediary. |
| BT26-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Link/evolution and Detach combat are natural, while the principal attack Draw 2 positive remains manually fired. |

## Aggregate

- Catalog cards: 104
- Direct modules: 104
- Assigned: 30
- Integrated card audits: 10
- Corrected: 1
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 8
- Remaining unassigned: 74

The integrated provisional score subtotal is 67/100 through BT26-010.
BT26-011 through BT26-030 remain active across two Luna/xhigh lanes. No
collection-complete claim is made while the static audit and delivery gates
remain incomplete.
