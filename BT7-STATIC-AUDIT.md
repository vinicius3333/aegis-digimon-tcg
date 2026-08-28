# BT7 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT7-001` through `BT7-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT7/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT7-001–010 | Luna in progress | `internal-docs/audits/BT7/BT7-001-010.md` | No |
| BT7-011–020 | Luna in progress | `internal-docs/audits/BT7/BT7-011-020.md` | No |
| BT7-021–030 | Static audit delivered | `internal-docs/audits/BT7/BT7-021-030.md` | Yes |
| BT7-031–040 | Queued | `internal-docs/audits/BT7/BT7-031-040.md` | No |
| BT7-041–050 | Queued | `internal-docs/audits/BT7/BT7-041-050.md` | No |
| BT7-051–060 | Queued | `internal-docs/audits/BT7/BT7-051-060.md` | No |
| BT7-061–070 | Queued | `internal-docs/audits/BT7/BT7-061-070.md` | No |
| BT7-071–080 | Queued | `internal-docs/audits/BT7/BT7-071-080.md` | No |
| BT7-081–090 | Queued | `internal-docs/audits/BT7/BT7-081-090.md` | No |
| BT7-091–100 | Queued | `internal-docs/audits/BT7/BT7-091-100.md` | No |
| BT7-101–110 | Queued | `internal-docs/audits/BT7/BT7-101-110.md` | No |
| BT7-111–112 | Queued | `internal-docs/audits/BT7/BT7-111-112.md` | No |

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
| BT7-021 Kumamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer alternate evolution, cost-two stack transition, and bottom-source trash boundary |
| BT7-022 KendoGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Blue-Tamer alternate evolution plus Hybrid-or-Koji stack-conditioned Jamming duration |
| BT7-023 Korikakumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected Tamer evolution metadata and one shared source-less target for attack-or-block restriction |
| BT7-024 DaiPenmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Source-less-opponent draw scaling and live Hybrid-stack level-three attack restriction |
| BT7-025 Beowolfmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected verified self-reducer registration plus Tamer-source cost reduction and bound Hybrid bounce |
| BT7-026 WereGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Exclusive Tamer/no-Tamer On Play branches and inherited main-phase once-per-turn unsuspend watcher |
| BT7-027 Whamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional level-three source-stack free play followed by gated blue-hand bottom placement |
| BT7-028 KingWhamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Level-three-or-Whamon source-stack free play and opponent level-four return/source teardown watcher |
| BT7-029 MagnaGarurumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected decline-aborts-dependent-bounce behavior with shared dual-trigger once-per-turn identity |
| BT7-030 AncientMegatheriummon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Per-Hybrid bottom-source trash scaling, post-action source-less draw, and bounded On Deletion free play |

## Aggregate

- Catalog cards: 112
- Assigned: 30
- Integrated card audits: 10
- Corrected: 3
- Provisional: 10
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 82

BT7 static re-audit remains open.
