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
| BT10-001–010 | Luna assigned | `internal-docs/audits/BT10/BT10-001-010.md` | No |
| BT10-011–020 | Luna assigned | `internal-docs/audits/BT10/BT10-011-020.md` | No |
| BT10-021–030 | Luna assigned | `internal-docs/audits/BT10/BT10-021-030.md` | No |
| BT10-031–040 | Queued | `internal-docs/audits/BT10/BT10-031-040.md` | No |
| BT10-041–050 | Queued | `internal-docs/audits/BT10/BT10-041-050.md` | No |
| BT10-051–060 | Queued | `internal-docs/audits/BT10/BT10-051-060.md` | No |
| BT10-061–070 | Queued | `internal-docs/audits/BT10/BT10-061-070.md` | No |
| BT10-071–080 | Queued | `internal-docs/audits/BT10/BT10-071-080.md` | No |
| BT10-081–090 | Queued | `internal-docs/audits/BT10/BT10-081-090.md` | No |
| BT10-091–100 | Queued | `internal-docs/audits/BT10/BT10-091-100.md` | No |
| BT10-101–110 | Queued | `internal-docs/audits/BT10/BT10-101-110.md` | No |
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

## Aggregate

- Catalog cards: 112
- Assigned: 30
- Integrated card audits: 0
- Corrected: 0
- Provisional: 0
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 82

BT10 static re-audit remains open.
