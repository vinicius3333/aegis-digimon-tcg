---
title: Detach lifecycle audit
updated: 2026-09-12
---

# Detach lifecycle audit

## Status

In progress. The opponent-effect departure gap is reproduced and corrected.
This is not full keyword or BT26 collection certification.
Baseline: `50454b210` on `audit/engine-mechanisms-20260912`.

## Sources and contract

The [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf)
is version 4.2. Its header reports 2026-08-18; the version changelog reports
2026-08-07. Section 16-46 defines prevention of departures other than the owner's
effects by an optional payment from the specified linked cards. Q6964 establishes
the battle case and removal of linked Piercing before the opponent is deleted;
it does not limit Detach to battle. Section 15-7-4 remains relevant to impossible
payment choices. The baseline comprehensive KB was version 4.0 (2026-04-01) and
lacked section 16-46. The current scoped import contains reviewed version 4.2
section 16-46 as `comprehensive-0323`, pinned in every lifecycle fixture with
`58b545c8005fcef5c0c20be0fae48f94034c24c1d66eaa211b23f1791069ffff`.
Reviewed source-refresh regression and delivery gates are green; see
`kb-citation-integrity.md`.

## Implementation trace

`registerIrCard` publishes the printed keyword. Continuous keyword lookup feeds
`GameEngine.consultLeavePrevention`, which now contributes ephemeral live Detach
reactions through `LeavePreventionHost.keywordReplacements`. The shared consult
orders them with authored reactions and applies the same activation reentry guard.
`detachLeaveReplacements` asks the threatened source's controller for zero or one
eligible link, revalidates the selected link, then uses the existing trash primitive.
When no eligible link exists, the reaction still offers the optional processing
choice required by §15-7-4. Acceptance cannot pay the cost and does not prevent
departure; refusal also leaves the departure intact. No empty card selector is opened.
The paid link loses its effects before deletion and Piercing snapshots settle.
The separate combat-only window and hooks were removed, preventing duplicate
battle prompts. Card modules retain exclusive compiled IR registration.

Printed trait notes and active grant provenance are read when constructing the
payment pool. Provenance lookup is implemented, but granted/inherited parameter
cases are not yet behaviorally proved. Their coverage must not be inferred from
printed consumer tests.

## Obligation ledger

| Obligation                                                          | Public proof                                                                           | Status |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------ |
| Opponent effect deletion may be prevented                           | Gaia Force against every printed Detach holder                                         | green  |
| Hand departure may be prevented                                     | ST2-16 public Option play                                                              | green  |
| Deck departure may be prevented                                     | BT2-102 public Option play                                                             | green  |
| Security departure may be prevented                                 | BT10-101 at zero own security                                                          | green  |
| Owner's deletion cost is not prevented                              | ST6-15; sole eligible sacrifice, purple source in breeding                             | green  |
| Controller may refuse; opponent cannot answer                       | manual seat-addressed response; both target and link go to trash                       | green  |
| Ineligible linked trait cannot pay                                  | BT21-009 link under Mailmon; original deletion proceeds                                | green  |
| Battle tie saves only the paying holder and removes linked Piercing | existing Q6964 public attack test                                                      | green  |
| Both tied holders may pay separately                                | existing public attack with one eligible link each                                     | green  |
| Payment request identifies source, chooser and trait                | manual refusal request asserts seat, sourceCardId and options.effectText               | green  |
| Choice when no payment is possible                                  | accepted/refused no-link and wrong-trait cases; chooser, text and final trash verified | green  |
| Multiple eligible links and distinct traits                         | exact-selection and multi-parameter fixtures                                           | open   |
| Granted/inherited parameter fidelity and expiry                     | live provenance implemented; public comparative/stack proof missing                    | open   |
| Competing replacements and reentry                                  | shared seam used; Detach-specific ordering proof missing                               | open   |
| DP rule deletion and security battles                               | direct lifecycle proofs missing                                                        | open   |
| Nested link-trash reactions and overflow                            | primitive reused; Detach-specific receipts unproved                                    | open   |

## Consumers

All seven printed holders are executed against opponent Gaia Force: BT26-010,
BT26-019, BT26-028, BT26-037, BT26-051, BT26-063, and BT26-084. Each carries the
Seven Code trait restriction. The parameterized fixtures assert the same permanent
survives, its link disappears, and that exact link reaches its owner's trash.
Other departure shapes use Mailmon; this distinction matters when assessing coverage.
Existing BT26 collection tests provide comparative battle cases but do not prove
all open obligations above.

## Verification

- Original public reproduction: 1 failed / 0 passed; Gaia Force removed Mailmon
  despite an eligible Seven Code link.
- Initial correction: 2 files / 16 tests passed, including existing Q6964 battle tests.
- Expanded departure proof: 6 passed / 1 failed; the own-cost fixture selected a
  different eligible sacrifice. Moving its purple color source to breeding made
  Mailmon the sole eligible sacrifice. Corrected focused scope: 2 files / 22 passed.
- First broad run after adding grant provenance: 5 files failed / 241 passed,
  21 failed / 3028 passed, because a newly used catalog function lacked an import.
  The import was corrected; this was an implementation regression, not baseline.
- Corrected broad run: 246 files / 3049 tests passed across conformance, combat,
  effects, engine cards, BT26 and audit layout.
- Final provenance assertions first read the wrong request field; effectText is
  in options. Corrected focused lifecycle scope: 13/13 passed.
- Independent review found no blocker in demonstrated printed departures, while
  retaining the explicit parameter and timing obligations.
- Final API typecheck passed after correcting the provenance assertion field. Scoped Oxlint passed without warnings; Oxfmt checks, audit layout (4/4), generated index and diff checks passed.

### Impossible-payment follow-up

- Public red proof on the prior implementation: 2 failed / 13 passed; no processing
  choice was recorded for either an empty link pool or a wrong-trait link.
- The first affected BT26 regression stopped on the new acknowledgments in four
  battle fixtures: 4 failed / 958 passed. Those fixtures now decline only the
  newly available optional acknowledgments; payable card selection and manual
  refusal remain independently exercised.
- Corrected broad regression: 246 files / 3051 tests passed across conformance,
  combat, effects, engine cards, BT26 and audit layout. API typecheck passed.
- Strengthened accepted/refused cases assert defending seat, source, Detach trait
  text and both host/link final trash: 3 files / 43 tests passed, including both
  affected battle suites.
- Independent review found no blocker in retaining an unpayable reaction and
  returning false after its processing choice. Parameter and ordering rows remain open.

Commands use `--pool=forks --maxWorkers=1 --no-file-parallelism`.
No persisted card IR changed in this engine correction.

## Open items

Resolve every open row with source-backed public proof. Refresh the missing KB
source without silently updating reviewed fingerprints. Recalculate the affected
BT26 card evidence after complete mechanism proof and delivery gates. Historical
10/10 scores cannot certify the corrected departure contract on their own.
