# BT9 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT9-001` through `BT9-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing
`BT9-AUDIT.md` is retained intact as historical verification evidence; this
pass independently revalidates the current direct implementations. Detailed
clause traces are written in English under `internal-docs/audits/BT9/` and
integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT9-001–010 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-001-010.md` | Yes |
| BT9-011–020 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-011-020.md` | Yes |
| BT9-021–030 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-021-030.md` | Yes |
| BT9-031–040 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-031-040.md` | Yes |
| BT9-041–050 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-041-050.md` | Yes |
| BT9-051–060 | Coordinator reviewed | `internal-docs/audits/BT9/BT9-051-060.md` | Yes |
| BT9-061–070 | Luna in progress | `internal-docs/audits/BT9/BT9-061-070.md` | No |
| BT9-071–080 | Luna in progress | `internal-docs/audits/BT9/BT9-071-080.md` | No |
| BT9-081–090 | Luna in progress | `internal-docs/audits/BT9/BT9-081-090.md` | No |
| BT9-091–100 | Queued | `internal-docs/audits/BT9/BT9-091-100.md` | No |
| BT9-101–110 | Queued | `internal-docs/audits/BT9/BT9-101-110.md` | No |
| BT9-111–112 | Queued | `internal-docs/audits/BT9/BT9-111-112.md` | No |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn cases as applicable.
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
| BT9-001 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-002 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-003 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-004 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-005 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-006 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-007 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-008 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-009 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-010 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-001-010.md` |
| BT9-011 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-012 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-011-020.md` |
| BT9-013 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-014 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-015 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-016 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-017 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-018 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-019 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-020 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-011-020.md` |
| BT9-021 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-022 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-023 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-024 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-025 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-026 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-027 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-028 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-029 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-021-030.md` |
| BT9-030 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-021-030.md` |
| BT9-031 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-032 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-033 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-034 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-035 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-036 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-037 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-038 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-039 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-040 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-031-040.md` |
| BT9-041 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-041-050.md` |
| BT9-042 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-041-050.md` |
| BT9-043 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-044 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-045 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-046 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-041-050.md` |
| BT9-047 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-048 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-049 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-041-050.md` |
| BT9-050 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-041-050.md` |
| BT9-051 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-051-060.md` |
| BT9-052 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-053 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-054 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-051-060.md` |
| BT9-055 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT9-051-060.md` |
| BT9-056 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-057 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-058 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-059 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |
| BT9-060 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT9-051-060.md` |

## Aggregate

- Catalog cards: 112
- Assigned: 90
- Integrated card audits: 60
- Corrected: 9
- Provisional: 60
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 22

BT9 static re-audit remains open.
