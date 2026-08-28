# BT16 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT16-001` through `BT16-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT16/` and integrated here only
after coordinator review. Every card must be reread independently against the
immutable catalog, current KB, direct module, compiled IR and shared runtime,
useful peers, and behavior-driving source proof.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT16-001–010 | Coordinator reviewed | `internal-docs/audits/BT16/BT16-001-010.md` | Yes |
| BT16-011–020 | Luna assigned | `internal-docs/audits/BT16/BT16-011-020.md` | No |
| BT16-021–030 | Luna assigned | `internal-docs/audits/BT16/BT16-021-030.md` | No |
| BT16-031–040 | Luna assigned | `internal-docs/audits/BT16/BT16-031-040.md` | No |
| BT16-041–050 | Luna assigned | `internal-docs/audits/BT16/BT16-041-050.md` | No |
| BT16-051–060 | Luna assigned | `internal-docs/audits/BT16/BT16-051-060.md` | No |
| BT16-061–070 | Unassigned | `internal-docs/audits/BT16/BT16-061-070.md` | No |
| BT16-071–080 | Unassigned | `internal-docs/audits/BT16/BT16-071-080.md` | No |
| BT16-081–090 | Unassigned | `internal-docs/audits/BT16/BT16-081-090.md` | No |
| BT16-091–100 | Unassigned | `internal-docs/audits/BT16/BT16-091-100.md` | No |
| BT16-101–102 | Unassigned | `internal-docs/audits/BT16/BT16-101-102.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn source cases as
   applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color
   cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests,
   typecheck, repository quality gate, and `git diff --check` have passed on
   the delivered commit.

This static pass can award at most provisional 8/10 because component 5 is
deliberately unexecuted. Unsupported or ambiguous behavior may reduce any
other component and is never rounded up. Structural-only assertions do not
receive full behavioral credit unless they drive the relevant production
behavior. Manual event-bus or timing injection does not substitute for a
feasible natural originating event.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT16-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Catalog/KB and inherited IR matched; natural multicolor attacks prove DP boundary and once-per-turn suppression (`be4922698`). |
| BT16-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live-color inherited aura traced; legal evolution from a multicolor host to a single-color top proves recomputation (`7185afbe1`). |
| BT16-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Conditional inherited Blocker traced through the keyword ledger and proved by a natural opponent attack/block battle (`012bdb92e`). |
| BT16-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletions prove the two-color gate and shared once-per-turn frequency without event injection (`1aa0a1e7a`, `0307ceae7`). |
| BT16-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2601–Q2603 and deletion snapshots matched; registered Blocker peers prove natural, repeated, and simultaneous-deletion boundaries (`7d1972035`). |
| BT16-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mandatory inherited hand-trash cost traced transactionally and proved through natural deletion with and without a payable card (`9b2a6cd9f`). |
| BT16-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2604, alternate Poromon evolution, post-event identity, cross-event frequency, and inherited attack suspension have natural public-intent proof (`c4579240c`). |
| BT16-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate Hawkmon evolution, exact deletion boundary, inherited suspension, and Jamming Security survival are naturally sourced (`2d6d16b2c`). |
| BT16-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate Gatomon evolution and DP duration matched; real battles prove Raid redirection and Armor Purge promotion (`2de96671d`). |
| BT16-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2605, SoC evolution, natural turn boundary, Retaliation, no-target cost, and optional trash-play refusal are covered (`40ebe7d16`). |

## Aggregate

- Catalog cards: 102
- Assigned: 60
- Integrated card audits: 10
- Corrected: 0
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 42

BT16 static re-audit is in progress.
