# BT6 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 112 cards, `BT6-001` through `BT6-112`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT6/` and integrated here only
after coordinator review.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen tests, but
every result from this pass remains provisional and no collection-complete
claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT6-001–010 | Static audit delivered | `internal-docs/audits/BT6/BT6-001-010.md` | Yes |
| BT6-011–020 | Static audit delivered | `internal-docs/audits/BT6/BT6-011-020.md` | Yes |
| BT6-021–030 | Static audit delivered | `internal-docs/audits/BT6/BT6-021-030.md` | Yes |
| BT6-031–040 | Luna in progress | `internal-docs/audits/BT6/BT6-031-040.md` | No |
| BT6-041–050 | Luna in progress | `internal-docs/audits/BT6/BT6-041-050.md` | No |
| BT6-051–060 | Luna in progress | `internal-docs/audits/BT6/BT6-051-060.md` | No |
| BT6-061–070 | Queued | `internal-docs/audits/BT6/BT6-061-070.md` | No |
| BT6-071–080 | Queued | `internal-docs/audits/BT6/BT6-071-080.md` | No |
| BT6-081–090 | Queued | `internal-docs/audits/BT6/BT6-081-090.md` | No |
| BT6-091–100 | Queued | `internal-docs/audits/BT6/BT6-091-100.md` | No |
| BT6-101–110 | Queued | `internal-docs/audits/BT6/BT6-101-110.md` | No |
| BT6-111–112 | Queued | `internal-docs/audits/BT6/BT6-111-112.md` | No |

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
| BT6-001 DemiMeramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Player-target attack gate, Blocker-redirection ruling, legal inherited stack, and turn duration |
| BT6-002 Kyaromon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent source-trash watcher, ownership and once-per-turn gates, plus Q1399 bounce negative |
| BT6-003 Bibimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected exact-three security condition with two/four-security boundaries and legal stack |
| BT6-004 Pinamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Declared-opponent-Digimon attack gate with player-target and Blocker-redirection boundary |
| BT6-005 Pagumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected black-Digimon reveal filter with independent color and card-kind negatives |
| BT6-006 Tsunomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Effect-controller hand-trash watcher, owner-turn and once-per-turn gates, and legal stack |
| BT6-007 Agumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Tai-name play watcher and exact Bond-host inherited Security Attack aura |
| BT6-008 Shoutmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Live Blitz-keyword attack gate, ordinary-attack ruling, and corrected legal evolution stack |
| BT6-009 Huckmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional zero-to-two name-family reveal selection, duplicates, exclusions, and bottom ordering |
| BT6-010 Flamemon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Live Hybrid-or-Ten-Warriors trait aura, Piercing behavior, and legal inherited stack |
| BT6-011 BaoHuckmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Sistermon board gate, one-target 5000-DP deletion ceiling, and legal inherited stack |
| BT6-012 Deltamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration and ordinary red evolution evidence |
| BT6-013 Megadramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Battle-area-only black color grant and inherited self +2000 DP on a legal stack |
| BT6-014 Asuramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | When Digivolving Blitz with legal evolution and opponent-memory timing boundary |
| BT6-015 SaviorHuckmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Optional Sistermon free play and inherited self-unsuspend with once-per-turn proof |
| BT6-016 Jesmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected persistent self-only per-copy watcher for +3000 DP and Piercing |
| BT6-017 MagnaKidmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Security Attack +1 and optional cost-7 Option use versus 4000-DP delete fallback |
| BT6-018 Agumon - Bond of Bravery | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Tamer-gated 13000-DP deletion and once-per-turn opponent-security trash watcher |
| BT6-019 Gabumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Per-copy Matt watcher and exact Bond-host inherited unsuspend on a complete legal stack |
| BT6-020 Gizamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Source-less-opponent-board inherited DP aura with empty and sourced board boundaries |
| BT6-021 ModokiBetamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Opponent memory-gain restriction with Tamer exception, source-kind boundary, and seat scope |
| BT6-022 Strabimon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Live Hybrid-or-Ten-Warriors host gate with inherited once-per-turn attack timing |
| BT6-023 Octomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Vanilla full/no-residual registration and ordinary blue evolution evidence |
| BT6-024 Mojyamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Live source-less-board Jamming aura plus exact bottom-source inherited removal |
| BT6-025 Panjyamon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inherited once-per-turn attack memory gain anchored to a legal host stack |
| BT6-026 Dragomon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Inclusive level-four source-less opponent return with canonical stack teardown |
| BT6-027 Majiramon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Top-source removal and source-less-board inherited reattack with once-per-turn boundary |
| BT6-028 Pukumon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Digi-Burst 2 cost and all-own-Digimon cant-be-blocked restriction through combat legality |
| BT6-029 Azulongmon | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | All-opponent bottom-source trash with post-trash memory and live Security Attack scaling |
| BT6-030 Gabumon - Bond of Friendship | 2 | 2 | 2 | 2 | 0 | Provisional 8/10 | Corrected bound deck-bottom Return with Q1399 rules teardown and watcher negative |

## Aggregate

- Catalog cards: 112
- Assigned: 112
- Integrated card audits: 30
- Corrected: 4
- Provisional: 30
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT6 static re-audit remains open.
