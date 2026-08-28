# BT18 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT17 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT18-001` through `BT18-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT18 workers may prepare static range
evidence in five parallel Luna lanes. BT17 static coverage is now recorded,
so accepted BT18 ranges may be integrated in strict ascending order. Detailed English reports belong under
`internal-docs/audits/BT18/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT18-001–010 | Coordinator reviewed | `internal-docs/audits/BT18/BT18-001-010.md` | Yes |
| BT18-011–020 | Luna assigned | `internal-docs/audits/BT18/BT18-011-020.md` | No |
| BT18-021–030 | Luna assigned | `internal-docs/audits/BT18/BT18-021-030.md` | No |
| BT18-031–040 | Luna assigned | `internal-docs/audits/BT18/BT18-031-040.md` | No |
| BT18-041–050 | Luna assigned | `internal-docs/audits/BT18/BT18-041-050.md` | No |
| BT18-051–060 | Luna assigned | `internal-docs/audits/BT18/BT18-051-060.md` | No |
| BT18-061–070 | Luna assigned | `internal-docs/audits/BT18/BT18-061-070.md` | No |
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
| BT18-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal red stack and two natural attacks prove the exact DP deletion, Tamer condition, and once-per-turn boundary (`2325e63ad`). |
| BT18-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal blue host observes the self-excluding other-blue-Digimon +1000 DP aura appear and disappear (`2b3dded8b`). |
| BT18-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal yellow stack and repeated natural attacks prove the Tamer-gated -2000 DP effect and once-per-turn boundary (`65e6ccd55`). |
| BT18-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turn flow proves accepted and declined start-main security exchange branches on a legal green host (`a0020656d`). |
| BT18-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added an exact self/field watcher filter; unrelated and repeated natural battle deletions prove source scope and once-per-turn draw (`df1547cfb`). |
| BT18-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural losing battle on a legal purple stack proves distinct opposing Digimon/Tamer color scaling and the no-source boundary (`ec9004503`). |
| BT18-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Pagumon alternate evolution, reveal-category boundary, and inherited Retaliation use legal red/purple fixtures (`2951918c7`). |
| BT18-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves the 2000-DP deletion ceiling, and legal red evolution preserves the source stack (`54d347540`). |
| BT18-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent Digimon deletion proves non-Tamer memory gain is blocked while shared capability paths preserve Tamer and dual-kind exceptions (`430e48ab0`). |
| BT18-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Digimon- and Tamer-to-Hybrid evolution plus a non-Hybrid negative prove the owned-source watcher and once-per-turn memory gain (`16d8f49e6`). |

## Aggregate

- Catalog cards: 102
- Assigned: 70
- Integrated card audits: 10
- Corrected: 1
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 32

BT18 static auditing is in progress; accepted ranges are eligible for strict chronological integration.
