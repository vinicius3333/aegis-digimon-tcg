# BT10 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT10-001` through `BT10-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing
`BT10-AUDIT.md` is retained intact as historical verification evidence; this
pass independently revalidates the current direct implementations. Detailed
clause traces are written in English under `internal-docs/audits/BT10/` and
integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT10-001–010 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-001-010.md` | Yes |
| BT10-011–020 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-011-020.md` | Yes |
| BT10-021–030 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-021-030.md` | Yes |
| BT10-031–040 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-031-040.md` | Yes |
| BT10-041–050 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-041-050.md` | Yes |
| BT10-051–060 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-051-060.md` | Yes |
| BT10-061–070 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-061-070.md` | Yes |
| BT10-071–080 | Luna in progress | `internal-docs/audits/BT10/BT10-071-080.md` | No |
| BT10-081–090 | Coordinator reviewed | `internal-docs/audits/BT10/BT10-081-090.md` | Yes |
| BT10-091–100 | Luna in progress | `internal-docs/audits/BT10/BT10-091-100.md` | No |
| BT10-101–110 | Luna in progress | `internal-docs/audits/BT10/BT10-101-110.md` | No |
| BT10-111–112 | Queued | `internal-docs/audits/BT10/BT10-111-112.md` | No |

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
| BT10-001 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-002 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-003 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-004 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-005 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-006 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-001-010.md` |
| BT10-007 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-008 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-001-010.md` |
| BT10-009 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-001-010.md` |
| BT10-010 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-001-010.md` |
| BT10-011 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-012 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-013 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-014 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-015 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-016 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-011-020.md` |
| BT10-017 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-018 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-019 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-011-020.md` |
| BT10-020 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-011-020.md` |
| BT10-021 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-021-030.md` |
| BT10-022 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-021-030.md` |
| BT10-023 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-024 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-025 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-026 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-027 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-021-030.md` |
| BT10-028 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-029 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-021-030.md` |
| BT10-030 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-021-030.md` |
| BT10-031 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-032 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-033 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-034 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-035 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-036 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-037 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-038 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-039 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-040 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-031-040.md` |
| BT10-041 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-042 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-043 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-041-050.md` |
| BT10-044 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-045 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-046 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-047 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-041-050.md` |
| BT10-048 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-049 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-050 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-041-050.md` |
| BT10-051 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-052 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-053 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-054 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-055 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-056 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-057 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-058 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-051-060.md` |
| BT10-059 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-051-060.md` |
| BT10-060 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-051-060.md` |
| BT10-061 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-062 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-061-070.md` |
| BT10-063 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-064 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-061-070.md` |
| BT10-065 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT10-061-070.md` |
| BT10-066 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-067 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-068 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-069 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-070 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-061-070.md` |
| BT10-081 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-081-090.md` |
| BT10-082 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-081-090.md` |
| BT10-083 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-081-090.md` |
| BT10-084 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-081-090.md` |
| BT10-085 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; KB ambiguity | `BT10-081-090.md` |
| BT10-086 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot and KB ambiguities | `BT10-081-090.md` |
| BT10-087 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-081-090.md` |
| BT10-088 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT10-081-090.md` |
| BT10-089 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-081-090.md` |
| BT10-090 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; snapshot ambiguity | `BT10-081-090.md` |

## Aggregate

- Catalog cards: 112
- Assigned: 110
- Integrated card audits: 80
- Corrected: 15
- Provisional: 80
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 9
- Remaining unassigned: 2

BT10 static re-audit remains open.
