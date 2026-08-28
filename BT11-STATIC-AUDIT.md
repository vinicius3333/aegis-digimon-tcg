# BT11 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT11-001` through `BT11-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. The pre-existing
`BT11-AUDIT.md` is retained intact as historical verification evidence; this
pass independently revalidates the current direct implementations. Detailed
clause traces are written in English under `internal-docs/audits/BT11/` and
integrated here only after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT11-001–010 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-001-010.md` | Yes |
| BT11-011–020 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-011-020.md` | Yes |
| BT11-021–030 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-021-030.md` | Yes |
| BT11-031–040 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-031-040.md` | Yes |
| BT11-041–050 | Coordinator reviewed | `internal-docs/audits/BT11/BT11-041-050.md` | Yes |
| BT11-051–060 | Luna in progress | `internal-docs/audits/BT11/BT11-051-060.md` | No |
| BT11-061–070 | Luna in progress | `internal-docs/audits/BT11/BT11-061-070.md` | No |
| BT11-071–080 | Luna in progress | `internal-docs/audits/BT11/BT11-071-080.md` | No |
| BT11-081–090 | Queued | `internal-docs/audits/BT11/BT11-081-090.md` | No |
| BT11-091–100 | Queued | `internal-docs/audits/BT11/BT11-091-100.md` | No |
| BT11-101–110 | Queued | `internal-docs/audits/BT11/BT11-101-110.md` | No |
| BT11-111–112 | Queued | `internal-docs/audits/BT11/BT11-111-112.md` | No |

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
| BT11-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected effect-provenance gate |
| BT11-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal Rule aliases |
| BT11-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal Rule aliases |
| BT11-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected bottom source placement |
| BT11-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; generated snapshot drift documented |
| BT11-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Corrected universal aliases and bottom placement |
| BT11-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; non-material snapshot normalization drift |
| BT11-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no new correction |
| BT11-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed vanilla card |
| BT11-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |
| BT11-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reviewed; no correction |

## Aggregate

- Catalog cards: 112
- Assigned: 80
- Integrated card audits: 50
- Corrected: 5
- Provisional: 50
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 32

BT11 static re-audit remains open.
