---
title: Effect duration and identity audit
updated: 2026-09-13
---

# Effect duration and identity audit

## Status

Bounded contract audit completed against `35db6e428`, with serialized existing-suite proof and independent read-only Luna review. No duration implementation defect was reproduced, so no engine change or new test is introduced. Complete producer/category certification remains open.

## Contract and implementation

`effects/interpreter/duration.ts` maps IR durations to `EffectDuration`; the
modifier, continuous, security-DP, and sub-trigger ledgers each own cleanup.
`GameEngine` sweeps turn-scoped entries at turn end and clears/rebuilds
continuous entries during recomputation. Source anchored effects are removed
through `dropPermanentSubscriptions`; battle and attack scopes are nested
through the combat duration ledger. Once-per-turn identities use stable keys,
not transient subscription ids, and are recorded in the shared turn tracker.

## Persisted duration inventory

The read-only scan of `packages/shared/src/effects/effects.json` found these
duration occurrences / distinct cards:

| Duration                          | Occurrences / cards |
| --------------------------------- | ------------------: |
| `untilOpponentTurnEnd`            |          1139 / 578 |
| `forTheTurn`                      |           923 / 638 |
| `permanent`                       |           625 / 522 |
| `untilYourTurnEnd`                |             37 / 20 |
| `untilOpponentNextUnsuspendPhase` |             18 / 12 |
| `untilEachTurnEnd`                |              10 / 4 |
| `endOfOpponentTurn`               |               6 / 2 |
| `untilEndOfBattle`                |               3 / 1 |
| `untilOpponentNextTurnEnd`        |               3 / 2 |
| `untilEndOfAttack`                |               2 / 2 |
| `forTheAttack`                    |               1 / 1 |
| `nextDigivolveThisTurn`           |               2 / 2 |

Counts are discovery evidence, not proof that every producer and consumer has
been behaviorally certified.

## Existing proof

The current reusable witnesses are `combat/attackDuration.test.ts` for nested
battle/attack boundaries, `effects/modifiers.test.ts` and
`effects/continuous.test.ts` for ledger cleanup and future entrants,
`conformance/keyword-delay-boundaries.test.ts`,
`keyword-training-boundaries.test.ts`, `keyword-ascension-lifecycle.test.ts`,
and `keyword-execute-consent.test.ts` for natural turn loops and expiry, plus
the public Rush/Blocker and BT24-036 owner cases documented in
`mechanism-inventory.md`. These prove finite producer shapes; they do not
certify the complete 638-card `forTheTurn` or 578-card
`untilOpponentTurnEnd` discovery sets.

## Obligation ledger

| Obligation                                                         | Evidence                                               | Status                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Correct owner/turn boundary for temporary grants                   | `duration.ts`, turn sweep, natural-loop owner suites   | Finite producer proof; full denominator open                           |
| Battle and attack cleanup are distinct and nested                  | `attackDuration.test.ts`                               | Finite EX13 public proof; complete nested/security classes remain open |
| Continuous grants survive recomputation without duplication        | `clearContinuous` plus modifier/continuous tests       | Mechanism witness; all structured grant shapes open                    |
| Source departure removes inherited/granted state                   | `dropPermanentSubscriptions`, source-continuity suites | Bounded source classes; mixed source/controller turnover open          |
| Once-per-turn identity survives recomputation and resets next turn | `SubTriggerRegistry` stable key and turn tracker       | Existing mechanism coverage; complete provider scan open               |
| Placement and source identity survive duration/zone transitions    | placement owner doc and stack/source tests             | Producer-specific only; downstream copied effects open                 |

## Runtime duration contract

| IR marker                                   | Runtime and expiry contract                                                             | Existing evidence                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `forTheTurn`, `untilEachTurnEnd`            | `UntilEachTurnEnd`; whichever current turn ends                                         | Modifier/continuous and natural-turn suites                  |
| `untilYourTurnEnd`                          | `UntilOwnerTurnEnd`, relative to granter; target-relative inversion preserved           | Permanent grant and ownership suites                         |
| `untilOpponentTurnEnd`, `endOfOpponentTurn` | `UntilOpponentTurnEnd`; granter's opponent turn ends                                    | Opponent immunity/ownership suites; alias producer mapping   |
| `untilOpponentNextTurnEnd`                  | Specialized DP path skips the current opponent turn end when installed during that turn | BT9-015, EX4-074 and interpreter controls                    |
| `untilOpponentNextUnsuspendPhase`           | `UntilNextUntap`; sweep after the matching active-phase unsuspend                       | BT14-047 existing restriction control and ledger sweeps      |
| `untilEndOfBattle`                          | `UntilEndBattle`; battle result/reactions precede expiry                                | Attack duration, EX13-076 and ST2-01 suites                  |
| `untilEndOfAttack`, `forTheAttack`          | `UntilEndAttack`; survives intermediate battles                                         | Attack duration public Alliance/Piercing and ledger controls |
| `permanent`                                 | Boundary sweeps retain one-shot entries; continuous tier is rebuilt                     | Permanent grant and continuous suites                        |
| `nextDigivolveThisTurn`                     | Specialized replacement, `consumeOnActivate`, owner-turn expiry                         | EX1-071 and EX5-029 public suites                            |

`untilOpponentNextTurnEnd` intentionally rejects general `toDuration` use;
the supported DP action routes carry the explicit skip-current-boundary
state. The persisted producers are BT9-015 and EX4-074 (two player-wide
actions); this is not an unrestricted marker for all action kinds.

An EX5-029 candidate was dismissed by tracing the exact fields: the card has
`action.cost.target`, not `action.target`. It enters the specialized next
digivolution replacement, pays its security cost upfront, and consumes the
replacement without charging security again. No redundant test was created.

## Reproducible gates

All commands use `TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072` and
`--maxWorkers=1 --no-file-parallelism`:

- Existing duration/ledger/natural-turn focus: **11 files, 106 tests passed**, covering `combat/attackDuration.test.ts`, `effects/modifiers.test.ts`, `effects/continuous.test.ts`, `effects/grantStaticDurationOwnership.test.ts`, `opponentTurnImmunityDuration.test.ts`, `permanentGrantDuration.test.ts`, and the delay/training/ascension/execute/decoy-source-continuity conformance suites.
- `src/engine/mechanic.test.ts -t 'Restrict unsuspend|until.*turn|end.*attack|end.*battle'`: **3 passed, 115 filtered**; this does not claim the full mechanic file passed.
- Existing special-marker/source-consumption focus: **5 files, 44 tests passed** across EX1-071, EX5-029, BT9-015, EX4-074 and `grantedTimedTrigger.test.ts`.
- Existing battle producer focus: **2 files, 26 tests passed** across EX13-076 and ST2-01.
- Shared/API/web typechecks and the full engine regression are reused from the preceding replacement checkpoint because this front changes documentation only. The regression had four explicitly documented pre-existing failures; it is not a green whole-engine gate.

The independent Luna reviews found no demonstrated duration mismatch. Local
source identity was re-read and SHA-256 verified for `comprehensive-0172`,
§15-8-2 Persistent Effects
(`d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6`), and
`comprehensive-0155`, §14 Battles
(`5b06ea97b99d6d698c6a1af32e9a3d725f850ddcf288c2f53f3bd003beaefa68`).
Printed card durations supply the endpoint contracts; these two pins do not
claim exhaustive normative coverage.

## Integrity ownership

Citation/exclusion reconciliation, legacy unpinned citations, persisted IR
parity and historical collection-score contradictions are owned by the KB and
ledger integrity front, whose bounded infrastructure checkpoint is now delivered. See [kb-citation-integrity.md](kb-citation-integrity.md)
and the replacement/placement owners for discovered residuals. This document
adds no duplicate collection ledger and awards no new collection 10/10 credit.
