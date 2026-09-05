# BT9 Static Card Implementation Re-audit

Status: complete; 112/112 cards verified at 10/10

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT9-001` through `BT9-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing
`docs/audits/BT9-AUDIT.md` is retained intact as historical verification evidence; this
pass independently revalidates the current direct implementations. Detailed
clause traces are written in English under `internal-docs/audits/BT9/` and
integrated here only after review.

## Current execution state

The card-by-card review and bounded execution gates are complete. All 112
catalog cards have direct modules, exclusive `registerIrCard` registration,
full compiled coverage, empty residuals, catalog synchronization, and green
focused, mechanism, and collection tests. The generated `effects.json`
snapshot was synchronized from the executable modules and validated to have
zero semantic or byte changes outside BT9.

| Range       | Worker state         | Range report                              | Integrated |
| ----------- | -------------------- | ----------------------------------------- | ---------- |
| BT9-001–010 | Reviewed | `internal-docs/audits/BT9/BT9-001-010.md` | Yes        |
| BT9-011–020 | Reviewed | `internal-docs/audits/BT9/BT9-011-020.md` | Yes        |
| BT9-021–030 | Reviewed | `internal-docs/audits/BT9/BT9-021-030.md` | Yes        |
| BT9-031–040 | Reviewed | `internal-docs/audits/BT9/BT9-031-040.md` | Yes        |
| BT9-041–050 | Reviewed | `internal-docs/audits/BT9/BT9-041-050.md` | Yes        |
| BT9-051–060 | Reviewed | `internal-docs/audits/BT9/BT9-051-060.md` | Yes        |
| BT9-061–070 | Reviewed | `internal-docs/audits/BT9/BT9-061-070.md` | Yes        |
| BT9-071–080 | Reviewed | `internal-docs/audits/BT9/BT9-071-080.md` | Yes        |
| BT9-081–090 | Reviewed | `internal-docs/audits/BT9/BT9-081-090.md` | Yes        |
| BT9-091–100 | Reviewed | `internal-docs/audits/BT9/BT9-091-100.md` | Yes        |
| BT9-101–110 | Reviewed | `internal-docs/audits/BT9/BT9-101-110.md` | Yes        |
| BT9-111–112 | Reviewed | `internal-docs/audits/BT9/BT9-111-112.md` | Yes        |

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
   scoped type and style checks, generated-snapshot verification, and
   `git diff --check` have passed on the delivered branch. Any unrelated
   baseline failure must be reproduced against unchanged files and recorded.

Unsupported or ambiguous behavior reduces the applicable component and is
never rounded up.

## Card ledger

| Card    | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result           | Direct evidence  |
| ------- | ----------------: | -------: | ---------------: | -------------------: | -------------: | ---------------- | ---------------- |
| BT9-001 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-002 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-003 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-004 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-005 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-006 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-007 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-008 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-009 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-010 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-001-010.md` |
| BT9-011 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-012 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-011-020.md` |
| BT9-013 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-011-020.md` |
| BT9-014 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-015 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-016 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-017 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-018 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-019 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-020 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-011-020.md` |
| BT9-021 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-022 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-023 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-024 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-025 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-026 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-027 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-028 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-029 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-021-030.md` |
| BT9-030 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-021-030.md` |
| BT9-031 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-032 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-033 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-034 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-035 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-036 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-037 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-038 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-039 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-040 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-031-040.md` |
| BT9-041 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-041-050.md` |
| BT9-042 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-041-050.md` |
| BT9-043 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-044 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-045 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-046 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-041-050.md` |
| BT9-047 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-048 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-049 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-041-050.md` |
| BT9-050 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-041-050.md` |
| BT9-051 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-051-060.md` |
| BT9-052 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-053 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-054 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-051-060.md` |
| BT9-055 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-051-060.md` |
| BT9-056 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-057 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-058 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-059 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-060 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-051-060.md` |
| BT9-061 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-062 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-063 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-064 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-065 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-066 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-061-070.md` |
| BT9-067 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-061-070.md` |
| BT9-068 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-069 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-070 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-061-070.md` |
| BT9-071 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-072 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-071-080.md` |
| BT9-073 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-074 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-071-080.md` |
| BT9-075 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-076 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-077 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-078 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-079 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-080 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-071-080.md` |
| BT9-081 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-082 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-083 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-084 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-085 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-086 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-087 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-088 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-089 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-081-090.md` |
| BT9-090 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-081-090.md` |
| BT9-091 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-092 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-093 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-094 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-095 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-096 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-097 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-098 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-099 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-091-100.md` |
| BT9-100 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-091-100.md` |
| BT9-101 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-102 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-101-110.md` |
| BT9-103 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-104 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-105 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-106 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-107 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-108 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-101-110.md` |
| BT9-109 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-101-110.md` |
| BT9-110 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-101-110.md` |
| BT9-111 |                 2 |        2 |                2 |                    2 |              2 | 10/10; corrected | `BT9-111-112.md` |
| BT9-112 |                 2 |        2 |                2 |                    2 |              2 | 10/10            | `BT9-111-112.md` |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 112
- Corrected: 20
- Provisional: 0
- Verified 10/10 in this pass: 112
- Blocked or ambiguous: 0
- Remaining unassigned: 0

## Reproducible execution evidence

- Focused corrected-card batch: 14 files, 57 tests passed.
- Catalog/module synchronization: 1 file, 116 tests passed.
- Full BT9 collection: 132 files, 574 tests passed.
- Affected engine mechanisms: 7 files, 687 tests passed.
- Tooling tests: 15 tests passed, including the set-scoped snapshot generator.
- `effects.json`: 112 BT9 records synchronized; 81 semantic changes against
  `origin/main`; zero semantic or byte changes outside BT9.
- Shared package build: passed.
- API BT9 type surface: clean. The repository-wide API typecheck retains only
  pre-existing `ArraySchema` assignability errors in unchanged files
  `src/engine/state/digivolutionStackSync.test.ts` and
  `src/engine/state/syncedArrayInsert.test.ts`.
- Scoped Oxfmt/Oxlint and `git diff --check`: passed.

BT9 collection verification is complete with reproducible 10/10 evidence for
all 112 cards.
