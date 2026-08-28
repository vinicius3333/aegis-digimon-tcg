# BT13 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT13-001` through `BT13-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT13/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT13-001–010 | Coordinator reviewed | `internal-docs/audits/BT13/BT13-001-010.md` | Yes |
| BT13-011–020 | Coordinator reviewed | `internal-docs/audits/BT13/BT13-011-020.md` | Yes |
| BT13-021–030 | Coordinator reviewed | `internal-docs/audits/BT13/BT13-021-030.md` | Yes |
| BT13-031–040 | Coordinator reviewed | `internal-docs/audits/BT13/BT13-031-040.md` | Yes |
| BT13-041–050 | Luna assigned | `internal-docs/audits/BT13/BT13-041-050.md` | No |
| BT13-051–060 | Luna assigned | `internal-docs/audits/BT13/BT13-051-060.md` | No |
| BT13-061–070 | Luna assigned | `internal-docs/audits/BT13/BT13-061-070.md` | No |
| BT13-071–080 | Unassigned | `internal-docs/audits/BT13/BT13-071-080.md` | No |
| BT13-081–090 | Unassigned | `internal-docs/audits/BT13/BT13-081-090.md` | No |
| BT13-091–100 | Unassigned | `internal-docs/audits/BT13/BT13-091-100.md` | No |
| BT13-101–110 | Unassigned | `internal-docs/audits/BT13/BT13-101-110.md` | No |
| BT13-111–112 | Unassigned | `internal-docs/audits/BT13/BT13-111-112.md` | No |

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
other component and is never rounded up.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT13-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; inherited deletion boundary source |
| BT13-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; battle-area and inherited aura source |
| BT13-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; owner-security trigger source |
| BT13-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area scope correction `b41af7a87` |
| BT13-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; stack-count boundary source |
| BT13-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2258 cost-without-target source |
| BT13-007 | 1/2 | 2/2 | 2/2 | 2/2 | 0/2 | 7/10 provisional | Three stale KB references remain catalog/KB drift |
| BT13-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus correction `62cd9d1e2` |
| BT13-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact BaoHuckmon correction `b257f200c` |
| BT13-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Garudamon/Kristy correction `078d484d4` |
| BT13-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; On Play/evolution/deletion boundaries |
| BT13-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2270–Q2271 security source |
| BT13-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2272–Q2273 trigger ordering |
| BT13-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Tamer cost and inherited deletion boundaries |
| BT13-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Exact-name correction; GeoGreymon route lacks runtime near-name proof |
| BT13-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Sistermon-triggered route and inherited source |
| BT13-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Battle-area scaling correction `d41228ab5` |
| BT13-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Marcus/same-target correction `86c9c3ad5` |
| BT13-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2277 breeding-stack source |
| BT13-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Structured Burst correction `895661cb9`; host boundary `e9f306259` |
| BT13-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Thomas correction `70cad3ec0` |
| BT13-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; direct IR and source proof |
| BT13-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Kiyoshiro and ordered-return correction `0587a6001` |
| BT13-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Manual hand-add event source; behavioral proof remains partial |
| BT13-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Q2281–Q2283 source trace |
| BT13-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Evade, Tamer return, and effect-hand-add source |
| BT13-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; own-stack play and Blocker source |
| BT13-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Burst host correction `90991c9dd`; payable-Thomas boundary `aa5a5f89c` |
| BT13-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; reveal groups and combined-security boundary |
| BT13-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon threshold and Reboot source |
| BT13-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; owner-security watcher and inherited boundary |
| BT13-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; top-security cost and combined-security source |
| BT13-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Security Attack modifier and combined-security source |
| BT13-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Range report; Chessmon-name route and inherited Reboot source |
| BT13-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact Veemon correction `684739265`; ExVeemon leave-play boundary `5f995a9cd` |

## Aggregate

- Catalog cards: 112
- Assigned: 70
- Integrated card audits: 40
- Corrected: 12
- Provisional: 40
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 1
- Remaining unassigned: 42

BT13 static re-audit is in progress.
