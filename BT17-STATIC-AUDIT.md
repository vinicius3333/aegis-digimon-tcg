# BT17 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT17-001` through `BT17-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. BT16 has complete static
card-by-card coverage but remains open for its deferred execution gates and
recorded limitations; BT17 integration begins only after that static coverage
was recorded. Detailed clause traces are written in English under
`internal-docs/audits/BT17/` and integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT17-001–010 | Coordinator reviewed | `internal-docs/audits/BT17/BT17-001-010.md` | Yes |
| BT17-011–020 | Luna assigned | `internal-docs/audits/BT17/BT17-011-020.md` | No |
| BT17-021–030 | Luna assigned | `internal-docs/audits/BT17/BT17-021-030.md` | No |
| BT17-031–040 | Luna assigned | `internal-docs/audits/BT17/BT17-031-040.md` | No |
| BT17-041–050 | Luna assigned | `internal-docs/audits/BT17/BT17-041-050.md` | No |
| BT17-051–060 | Luna assigned | `internal-docs/audits/BT17/BT17-051-060.md` | No |
| BT17-061–070 | Unassigned | `internal-docs/audits/BT17/BT17-061-070.md` | No |
| BT17-071–080 | Unassigned | `internal-docs/audits/BT17/BT17-071-080.md` | No |
| BT17-081–090 | Unassigned | `internal-docs/audits/BT17/BT17-081-090.md` | No |
| BT17-091–100 | Unassigned | `internal-docs/audits/BT17/BT17-091-100.md` | No |
| BT17-101–102 | Unassigned | `internal-docs/audits/BT17/BT17-101-102.md` | No |

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
| BT17-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal Agumon stack naturally attacks, pays one memory, deletes the exact 3000-DP boundary, and preserves a higher-DP target/no-target payment negative (`04068ae99`). |
| BT17-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2702 simultaneous and separate stack plays prove source-zone/controller filters and once-per-turn draw frequency with normal/opponent-play negatives (`9af7d1343`). |
| BT17-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2703 Tamer placement, kind/host/turn negatives, and repeated-placement frequency trace through the inherited self-bound watcher (`4883e66d0`). |
| BT17-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal Argomon and non-Argomon green stacks prove the opponent-turn inherited Blocker name condition (`dd9b9c89d`). |
| BT17-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal black Unidentified and non-Unidentified stacks prove the deletion snapshot trait gate and inherited memory gain (`84d4b8f9e`). |
| BT17-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2704–Q2705, natural Tamer placement, legal SoC trash evolution, and wrong-kind/wrong-host negatives prove the inherited watcher and requirement enforcement (`a90918c50`). |
| BT17-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2706–Q2709, natural main-phase recovery, legal end-turn DNA, exact partner/result selectors, and non-DNA rejection are covered (`c528b2e29`). |
| BT17-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2710–Q2714, natural Calumon/Takato trigger, delete/no-delete branches, and inherited numeric DP-ceiling increase at nonpositive memory are covered (`f1093d57c`). |
| BT17-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2715–Q2717 exact dual reveal filters/remainder and a natural inherited battle-deletion Tamer play are proved with legal Hybrid fixtures (`615804154`). |
| BT17-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2718–Q2722, natural delete/fallback branches, legal evolution, and inherited numeric deletion-ceiling increase match the direct IR (`024ea314d`). |

## Aggregate

- Catalog cards: 102
- Assigned: 60
- Integrated card audits: 10
- Corrected: 0
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 42

BT17 static re-audit is in progress.
