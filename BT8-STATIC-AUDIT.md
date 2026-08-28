# BT8 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT8-001` through `BT8-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT8/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT8-001–010 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-001-010.md` | Yes |
| BT8-011–020 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-011-020.md` | Yes |
| BT8-021–030 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-021-030.md` | Yes |
| BT8-031–040 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-031-040.md` | Yes |
| BT8-041–050 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-041-050.md` | Yes |
| BT8-051–060 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-051-060.md` | Yes |
| BT8-061–070 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-061-070.md` | Yes |
| BT8-071–080 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-071-080.md` | Yes |
| BT8-081–090 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-081-090.md` | Yes |
| BT8-091–100 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-091-100.md` | Yes |
| BT8-101–110 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-101-110.md` | Yes |
| BT8-111–112 | Coordinator reviewed | `internal-docs/audits/BT8/BT8-111-112.md` | Yes |

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
| BT8-001 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-002 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-003 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-004 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-005 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-006 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-007 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-008 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-009 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-010 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-001-010.md` |
| BT8-011 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-012 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-013 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-014 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-015 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-016 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-017 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-018 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-019 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-011-020.md` |
| BT8-020 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-011-020.md` |
| BT8-021 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-021-030.md` |
| BT8-022 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-023 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-024 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-021-030.md` |
| BT8-025 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-026 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-027 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-028 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-029 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-021-030.md` |
| BT8-030 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-021-030.md` |
| BT8-031 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-032 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-033 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-034 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-035 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-036 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-037 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-038 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-039 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-040 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-031-040.md` |
| BT8-041 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-042 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-043 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-044 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-045 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-046 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-047 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-048 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-049 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-050 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-041-050.md` |
| BT8-051 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-051-060.md` |
| BT8-052 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-053 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-051-060.md` |
| BT8-054 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-055 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-056 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-057 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-058 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-059 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-060 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-051-060.md` |
| BT8-061 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-062 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-063 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-064 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-065 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-061-070.md` |
| BT8-066 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-061-070.md` |
| BT8-067 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-068 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-069 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-061-070.md` |
| BT8-070 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-061-070.md` |
| BT8-071 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-072 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-073 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-074 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-075 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-076 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-077 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-078 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-079 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-080 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-071-080.md` |
| BT8-081 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-081-090.md` |
| BT8-082 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-083 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-084 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-085 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-086 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-087 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-088 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-089 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-090 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-081-090.md` |
| BT8-091 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-092 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-093 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-094 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-095 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-096 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-097 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-098 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-099 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-100 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-091-100.md` |
| BT8-101 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-102 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-101-110.md` |
| BT8-103 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-104 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-105 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-101-110.md` |
| BT8-106 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-107 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-101-110.md` |
| BT8-108 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-109 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-110 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-101-110.md` |
| BT8-111 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional | `BT8-111-112.md` |
| BT8-112 | 2 | 2 | 2 | 2 | 0 | 8/10 provisional; corrected | `BT8-111-112.md` |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Corrected: 14
- Provisional: 112
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT8 static card-by-card coverage is complete, but the collection remains open
because every execution gate is deferred and no card is verified 10/10.
