# BT19 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT18 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT19-001` through `BT19-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT19 workers may prepare static range
evidence in five parallel Luna lanes. BT18 static coverage is now recorded,
so accepted BT19 ranges may be integrated in strict ascending order. Detailed English reports belong under
`internal-docs/audits/BT19/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT19-001–010 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-001-010.md` | Yes |
| BT19-011–020 | Luna prepared; coordinator review pending | `internal-docs/audits/BT19/BT19-011-020.md` | No |
| BT19-021–030 | Luna assigned | `internal-docs/audits/BT19/BT19-021-030.md` | No |
| BT19-031–040 | Luna assigned | `internal-docs/audits/BT19/BT19-031-040.md` | No |
| BT19-041–050 | Luna assigned | `internal-docs/audits/BT19/BT19-041-050.md` | No |
| BT19-051–060 | Luna assigned | `internal-docs/audits/BT19/BT19-051-060.md` | No |
| BT19-061–070 | Luna assigned | `internal-docs/audits/BT19/BT19-061-070.md` | No |
| BT19-071–080 | Luna assigned | `internal-docs/audits/BT19/BT19-071-080.md` | No |
| BT19-081–090 | Unassigned | `internal-docs/audits/BT19/BT19-081-090.md` | No |
| BT19-091–100 | Unassigned | `internal-docs/audits/BT19/BT19-091-100.md` | No |
| BT19-101–102 | Unassigned | `internal-docs/audits/BT19/BT19-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT19-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove matching hand placement, draw, optional decline, inherited-source binding, and once-per-turn (`b80127651`). |
| BT19-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent attacks prove the self-return cost, level snapshot, decline, and Q3058 Decode ordering on a legal blue stack (`85aaf971d`). |
| BT19-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A production turn proves Plug-In return naturally; the otherwise unoriginable repeat window is supplemental once-per-turn evidence only (`19cba4bc0`). |
| BT19-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live continuous state proves another-green-Digimon, self-exclusion, owner-turn duration, and aura removal (`ace820a84`). |
| BT19-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live continuous state proves opponent-Digimon presence, host-only Reboot, opponent-turn duration, and Tamer exclusion (`2302175c8`). |
| BT19-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production effect deletion and a natural battle prove the non-battle cause plus exact purple level-3 trash return filters (`844ef1801`). |
| BT19-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turns, legal evolution, and natural attacks prove named support, memory boundary, numeric DP-ceiling increase, and relative-ceiling exclusion (`0ddcbda2c`). |
| BT19-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play plus production deletion prove legal OmniShoutmon evolution, Q3062 rejection, reveal/Tamer/Save ordering, and inherited Rush (`4d11fd476`). |
| BT19-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolutions and attacks prove exact Takato play, Tamer-count boundary, numeric DP-ceiling increase, and relative-ceiling exclusion (`a0d1a705d`). |
| BT19-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public DigiXros and production deletion/return prove four exact materials, reduction, trait-filtered stack placement, decline, and Q3067 departure (`572ff93db`). |

## Aggregate

- Catalog cards: 102
- Assigned: 80
- Integrated card audits: 10
- Corrected: 0
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 22

BT19 static auditing is in progress; accepted ranges are eligible for strict chronological integration.
