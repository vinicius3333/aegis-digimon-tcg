# BT24 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT24-001` through `BT24-102`, derived from
the immutable committed card-catalog blob and reconciled with the 102 direct
card modules in `apps/api/src/cards/BT24/`.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. Detailed English reports belong under
`internal-docs/audits/BT24/`. BT24 work may be prepared in parallel, while
accepted ranges are integrated in strict ascending order.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT24-001–010 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-001-010.md` | Yes |
| BT24-011–020 | Coordinator reviewed | `internal-docs/audits/BT24/BT24-011-020.md` | Yes |
| BT24-021–030 | Luna assigned | `internal-docs/audits/BT24/BT24-021-030.md` | No |
| BT24-031–040 | Luna assigned | `internal-docs/audits/BT24/BT24-031-040.md` | No |
| BT24-041–050 | Luna assigned | `internal-docs/audits/BT24/BT24-041-050.md` | No |
| BT24-051–060 | Luna assigned | `internal-docs/audits/BT24/BT24-051-060.md` | No |
| BT24-061–070 | Luna assigned | `internal-docs/audits/BT24/BT24-061-070.md` | No |
| BT24-071–080 | Unassigned | `internal-docs/audits/BT24/BT24-071-080.md` | No |
| BT24-081–090 | Unassigned | `internal-docs/audits/BT24/BT24-081-090.md` | No |
| BT24-091–100 | Unassigned | `internal-docs/audits/BT24/BT24-091-100.md` | No |
| BT24-101–102 | Unassigned | `internal-docs/audits/BT24/BT24-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT24-001 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Opponent-security gate, 3000/4000 DP boundary, decline, and once-per-turn behavior use a manually fired security event. |
| BT24-002 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self-bound blue/TS unsuspend, memory payment, decline, and once-per-turn behavior use direct end-turn timing. |
| BT24-003 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Own-security gate and reduced Shaman evolution are covered through a manually fired security-removal watcher. |
| BT24-004 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Own Iliad, trait/controller negatives, and once-per-turn draw are covered through manually supplied play events. |
| BT24-005 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Tamer-only stack addition and three-card top/bottom restack are traced through manual stack placement. |
| BT24-006 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Self-linked draw-then-trash, wrong-host rejection, and once-per-turn identity use direct link-event injection. |
| BT24-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Trigger-bound hand trash, level/trait boundary, and paid reduced play use the hand-trash primitive. |
| BT24-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional On Play trash/Draw 2 and opponent-security memory are covered through direct timing events. |
| BT24-009 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Optional On Play payment and inherited reduced Titan evolution use direct play and hand-trash origins. |
| BT24-010 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Blocker, one-target De-Digivolve, Raid, and alternate TS evolution are covered; deletion uses a primitive. |
| BT24-011 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural TS digivolution and Rush/Raid behavior are covered; representative mixed-stack/peer evidence remains partial. |
| BT24-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Blocker, simultaneous protection, cause rejection, and inherited security trigger use harness primitives. |
| BT24-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Hand-size draw, shared delete frequency, and inherited trash evolution rely partly on primitive event helpers. |
| BT24-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Both Decode actions now bind to the leaving Digimon's own stack; DP/delete and security boundaries remain harness-driven. |
| BT24-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Security play, Blocker, target-switch lowest-DP deletion, and inherited Blocker deletion use manual event origins. |
| BT24-016 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Owen/Elizamon stack construction, security ordering, and inherited hand play are covered through harness timing. |
| BT24-017 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | Token branch, exact two-card payment, DP scaling, and token deletion are direct; natural origins and peer proof remain partial. |
| BT24-018 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Keywords, security sequence, removal watcher, and simultaneous replacement are covered through manually fired timings. |
| BT24-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public digivolution intent proves the blue-TS reduction and breeding-area exclusion with legal host/stack peers. |
| BT24-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Independent reveal categories, bottom-deck remainder, and inherited unsuspend draw use direct On Play/unsuspend timing. |

## Aggregate

- Catalog cards: 102
- Assigned: 70
- Integrated card audits: 20
- Corrected: 1
- Provisional: 20
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 19
- Remaining unassigned: 32

BT24 static auditing is prepared across five parallel Luna/xhigh lanes.
Accepted ranges will be integrated in strict ascending BT24 order.
