---
title: Detach lifecycle audit
updated: 2026-09-13
---

# Detach lifecycle audit

## Status

The wider engine keyword audit remains in progress. The opponent-effect departure
and link-trash subject-lifetime gaps are corrected. BT26's applicable printed
denominator is closed by the 2026-09-13 evidence and fresh gates in BT26.md;
this is not certification of additional granted/inherited keyword forms.
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

| Obligation                                                          | Public proof                                                                                         | Status                             |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Opponent effect deletion may be prevented                           | Gaia Force against every printed Detach holder                                                       | green                              |
| Hand departure may be prevented                                     | ST2-16 public Option play                                                                            | green                              |
| Deck departure may be prevented                                     | BT2-102 public Option play                                                                           | green                              |
| Security departure may be prevented                                 | BT10-101 at zero own security                                                                        | green                              |
| Owner's deletion cost is not prevented                              | ST6-15; sole eligible sacrifice, purple source in breeding                                           | green                              |
| Controller may refuse; opponent cannot answer                       | manual seat-addressed response; both target and link go to trash                                     | green                              |
| Ineligible linked trait cannot pay                                  | BT21-009 link under Mailmon; original deletion proceeds                                              | green                              |
| Battle tie saves only the paying holder and removes linked Piercing | existing Q6964 public attack test                                                                    | green                              |
| Both tied holders may pay separately                                | existing public attack with one eligible link each                                                   | green                              |
| Payment request identifies source, chooser and trait                | manual refusal request asserts seat, sourceCardId and options.effectText                             | green                              |
| Choice when no payment is possible                                  | accepted/refused no-link and wrong-trait cases; chooser, text and final trash verified               | green                              |
| Multiple eligible links and distinct traits                         | No eligible capacity grant; all seven holders have one legal Seven Code link                         | not applicable to BT26; wider open |
| Granted/inherited parameter fidelity and expiry                     | No printed/granted/inherited Detach source outside the seven BT26 holders                            | no BT26 form; wider open           |
| Competing replacements and reentry                                  | Retained public Guard/Detach order pair; Medicmon Barrier pair; shared mixed-mode/reentry controls   | green for BT26                     |
| DP rule deletion and security battles                               | Public BT1-106 zero-DP reprocessing; equal-DP security attack                                        | green                              |
| Nested link-trash reactions and overflow                            | EX10-062 live observer after host loss, EX10-070 Delay, P-234 timing pair; no eligible Overflow link | green for BT26                     |

## Consumers

All seven printed holders are executed against opponent Gaia Force: BT26-010,
BT26-019, BT26-028, BT26-037, BT26-051, BT26-063, and BT26-084. Each carries the
Seven Code trait restriction. The parameterized fixtures assert the same permanent
survives, its link disappears, and that exact link reaches its owner's trash.
Other departure shapes use Mailmon; this distinction matters when assessing coverage.
Existing BT26 collection tests provide comparative battle cases but do not prove
all open obligations above.

## BT26 restart denominator, 2026-09-13

The committed catalog's complete legal Seven Code Link inventory is BT26-010,
019, 028, 037, 051, 063 and 084. Each permits an Appmon recipient at Link cost 3. BT26-102 is a Seven Code Option with no Link requirement. None of the seven
eligible payment cards is ACE or carries Overflow; this inventory, rather than
base link capacity alone, excludes an Overflow payment case for these holders.
All seven printed holders specify the same Seven Code payment trait. Generic
TS-restricted Link capacity grants do not apply to these Appmon holders. No
printed or granted Detach source outside these seven was found in the committed
catalog, so distinct inherited/granted parameter shapes remain wider-engine
obligations rather than demonstrated BT26 consumers.

The real committed link-trash observers include EX10-001, EX10-030, EX10-043,
EX10-062, EX10-070, EX10-073 and P-234. Their applicability must be checked by
source placement, controller and timing; self-hosted observers cannot be counted
as generic third-party reactions. EX10-062 is an applicable All Turns Tamer,
EX10-070 supplies a Delay relink, and P-234 supplies a Your Turn relink. The latter
two Detach interactions are being proved in their existing peer suites. Existing
P-234 primitive-trash tests do not reproduce a public Detach producer.

BT26-086's root Link +6 is self-scoped to Dantemon; it is not a Link effect or
an external grant to these holders. BT25-075 is also self-scoped, and BT25-102's
external Link +1 grant requires a red/black TS recipient. Thus no catalog producer
makes multiple eligible payment links legal on the seven BT26 Detach holders.
Distinct parameter/multiple-link examples remain outside this printed denominator.

The retained `keyword-guard-lifecycle.test.ts` public Guard/Detach pair lets the
controller choose either replacement first, rejects the wrong chooser and checks
exact final target/guard/link identities. Medicmon's public Barrier pair covers
the separate battle-prevention window. The shared `leavePrevent.test.ts` mixed-mode
and reentry tests exercise the unchanged unified replacement consult. These
existing proofs are retained rather than duplicating ordering tests. Bagramon can
legally place Dragomon under a holder to supply an authored inherited replacement;
this restart relies on that existing unified seam proof and does not claim a fresh
public Dragomon/Bagramon combination test.

The restart adds public DP-zero and security-battle proof and a real Medicmon
Barrier acceptance/refusal comparison. A public zero-DP Detach payment exposed
loss of EX10-062's already-triggered event when its subject later left; the
correction in `46c0f3431` preserves the subject while rechecking the observer's
live source. `c33a4c702` uses the schema-aware deep clone. The discarded cached
full-context draft is not the delivered implementation. Focused post-repair
validation passes 5 files / 174 tests, and API semantic typecheck passes; fresh
collection gates pass 307 files / 3594 tests; BT26.md records the fresh 104/104
10/10 recalculation.

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

Resolve the remaining wider-engine parameter and granted/inherited rows with
source-backed public proof. The reviewed §16-46 import and fingerprints are
already pinned; do not silently retarget citations. The current BT26 printed
consumer denominator has no remaining applicable open row, and its fresh
recalculation is in BT26.md. This does not certify hypothetical additional
capacity, distinct trait parameters or grant encodings.
