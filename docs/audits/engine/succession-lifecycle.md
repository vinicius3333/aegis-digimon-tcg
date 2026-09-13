# Succession lifecycle audit

## Status

The focused source-priority proof in `engine/conformance/stack-visible-source-priority.test.ts` seeds a real BT26-080 Succession host with a lower face-down BT25-077 and a higher face-up BT25-077, then publicly plays BT25-078. The pending public optional decision exposes the Bacchusmon `[All Turns] [Once Per Turn]` watcher; the matching all-face-down control exposes no watcher. The test asserts the played instance leaves hand, enters the battle area, pays memory, and resolves with no pending decision. A second seeded case puts a visible BT26-080 below a visible BT25-077 and a hidden BT26-080 at the highest physical position; the BT25-077 watcher still appears, demonstrating that face-down sources are filtered before topmost selection. This remains a seeded public-callback seam, not a legal Giromon evolution-chain proof: the decision payload does not expose the selected source identity, so strict provider identity and the legal producer chain remain open. Copied On Play/When Digivolving timing, source departure, and the wider provider matrix remain open.

The next bounded face-down source correction at `3f014c5d7` is owned by [stack-card-information.md](stack-card-information.md). Public Giromon placement exposes the hidden copied Bacchusmon and inherited Meramon leaks; neither remaining source changes nor all hidden information are certified.

Latest bounded correction at baseline `810868b64`: a real Bagramon placement
buries BT26-080 under another BT26-080. The copied Succession ability previously
created another conferral and an extra When Attacking deletion: three neutral
opponents died instead of two. The IR now identifies the Succession effect and
excludes it from the copy, including its resident root marker. Other printed
keywords and effects remain available. BT25-077 is the non-nested public
control; all four consumer modules carry the reviewed exclusion. This closes
the demonstrated nested Bacchusmon shape, not the complete keyword audit.

Earlier bounded correction at baseline `edbf770b9`: native and copied
Digisorption granted a three-memory discount when source-free BT19-101 could
not be suspended. Both legal public cases fail on the baseline. Payment
candidates now exclude suspension restrictions; the actual primitive must
return the paid permanent before either discount or usage is committed. Usage
is committed before deferred suspension reactions run. Full certification
remains open, and BT3-056 joins the provisional below-ten caps.

Earlier bounded correction at baseline `ee85c20e7`: public BT3-056 → BT26-032
formation exposes a copied persistent Digisorption redirect. The old cost query
ignored it, charging five instead of two on the following evolution. The query
now reads active stack-effect conferrals and retains lender/granter-qualified
usage identity. Six additional public proofs cover acceptance, native/absent/
refused controls and a second same-turn payment. Full certification remains open.

Bounded correction at baseline `ba432186d`: the canonical keyword union omitted
Succession; BT26-080 and BT26-103 incorrectly exposed their Digimon-side marker
as UseReq. Both now expose Succession. BT26-032/060 no longer need a type cast.
This is not a complete keyword, card, collection or engine certificate.

## Contract and sources

The [official comprehensive manual](https://world.digimoncard.com/rule/pdf/general_rule.pdf)
is version 4.2, updated 2026-08-18. Full reviewed §16-47 defines persistent gain
of all effects except Succession from the topmost specified digivolution card.
Full §15-8-2 defines continuous activation and loss as live conditions change.

Conformance pins the existing loader's reviewed content fingerprints:

- `comprehensive-0324`, §16-47:
  `d09f994eb5ef5e46d70b28d7d019215d5dc5856d3ec1ffee10d6db6dfa3df717`.
- `comprehensive-0172`, §15-8-2:
  `d4b49613685801d2adcd744aeb58471c0a393a33f9f697539d305a9d21e896c6`.

Local full queries read BT26-032 Q7000–7003, BT26-060 Q7079–7087,
BT26-080 Q7112–7114 and BT26-103 Q7187–7189. BT24-102 Q6945 explicitly
allows Homeros to activate On Play/When Digivolving effects gained through
Succession; the existing colocated proof is included in regression. Those
rulings are not blanket proof of source changes or recursive exclusion.
The official BT26-080 card-page request failed; committed catalog fields and
local Q&A remain the inspected card sources, without claiming a fresh page read.

## Implementation trace

`packages/shared/src/effects/ir/keywords.ts` now includes Succession (46 canonical
names). The old Guard comment is aligned with its reviewed self-deletion contract.
Every consuming card still registers exclusively through registerIrCard.
All four use an authored Static GrantStatic grant:effects, topmostOnly:true,
duration:permanent, with a structured filter. Root keyword markers pass through
the existing registration module and continuous keyword reader.

`interpreter/actions/grantStatic.ts` filters the physical stack bottom-to-top and
uses matches.slice(-1). conferStackEffects records the actual matching instance
and granter. GameEngine rebuilds continuous conferrals; collectConferredEffects
handles triggered and static copies; the borrowed-effect reader also sees them.
The ee85c20e7 marker checkpoint changes no shared resolution semantics;
the copied-cost correction below changes discovery and payment usage accounting. No second
registration, keyword executor or runner is introduced.

At `810868b64`, the current authored actions and conferral model did not
identify Succession for exclusion. `CardEffect.keywordEffect` now identifies the
whole keyword clause; `GrantStatic.excludeKeywords` is carried through the
primitive, continuous ledger and event snapshots to `collectConferredEffects`.
Root keyword markers compile separately with their own keyword identity, so
excluding Succession preserves neighboring markers and numerical amounts.
The four authored Succession clauses are tagged and exclude Succession. Other
keyword action/synthesis encodings are not newly certified by this metadata.

## Obligation ledger

| Obligation                                                              | Source                       | Public action and result                                                                                                                      | Proof                                                                  | Consumers                                                      | Status                                               |
| ----------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- |
| Correctly identify the printed keyword                                  | §16-47-1; full catalog       | Legal alternate evolution publishes Succession, never the substituted UseReq                                                                  | Four public evolution cases                                            | All four declared consumers                                    | verified, bounded                                    |
| Preserve paid alternate cost and physical evolution sources             | Catalog routes               | Cost 2/2/5/5, original permanent/controller, exact old/new source identities and final zones                                                  | Same four cases                                                        | BT26-032/080/060/103                                           | verified, bounded                                    |
| Copy printed keyword and attack ability                                 | §16-47-1                     | Destroy Mode gains Holy Mode's Piercing/Engage; public attack optionally deletes a neutral target, wins battle and checks both security cards | Acceptance/refusal attack pair and evolution keyword assertion         | BT26-060; BT26-016 lender                                      | verified, bounded                                    |
| Resolve copied evolution and persistent security effects                | §16-47-1; Jupitermon catalog | Public Wrath evolution over BT24-101 finishes both recovery bodies and the security-removal response                                          | Wrath public evolution, exact final zone counts                        | BT26-103; BT24-101 lender                                      | verified, bounded                                    |
| Select only the highest matching source                                 | §16-47-1                     | Existing injected/conferral tests; no fresh public source-selection sequence here                                                             | Four colocated suites                                                  | Four distinct source filters                                   | queued for full public proof                         |
| Exclude copied Succession                                               | §16-47-1                     | Real Bagramon placement, then attack: exactly two deletions with nested BT26-080, one with BT25-077; copied Security Attack remains           | Public placement/attack pair; supplemental selective marker projection | BT26-080 nested lender; all four consumer exclusions inspected | verified for demonstrated shape; other shapes queued |
| Follow source departure, top changes, face state and re-entry           | §15-8-2                      | Initial source stack only                                                                                                                     | No live removal sequence here                                          | Printed, inherited and granted forms to reconcile              | queued                                               |
| Frequency, duplicate copies, timing prohibitions and borrowing identity | §15-8-2; Q6029/Q6945         | Existing Homeros adapter/injected proof is supplemental                                                                                       | Full equivalent-shape inventory pending                                | All eligible lenders/hosts                                     | queued                                               |

## Consumer coverage

Catalog text union: exactly BT26-032, BT26-060, BT26-080 and BT26-103. No
inherited or runtime-granted printed Succession icon was found in the committed
catalog. All consumers are in BT26; two consumer sets are unavailable in this
catalog. Lenders executed here include BT25-059/077, BT24-101 and BT26-016.

| Module inspected and executed | Specified source shape                | Fresh public path                                                                                           |
| ----------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| BT26-032                      | Exact Ceresmon name                   | Paid cost-2 evolution over play-cost-12 BT25-059; optional suspensions declined                             |
| BT26-080                      | Exact Bacchusmon name                 | Paid cost-2 evolution over BT25-077; real Bagramon placement of BT26-080/BT25-077 followed by public attack |
| BT26-060                      | Level 6 plus Chronomon name substring | Paid cost-5 evolution over BT26-016; seeded legal final stack public attack acceptance/refusal              |
| BT26-103                      | Exact Jupitermon name                 | Paid cost-5 evolution over BT24-101; complete mandatory security effects                                    |

The exact printed-name/level filters identify eight catalog lender candidates:
Ceresmon BT3-056, BT25-059, BT26-032; Bacchusmon BT25-077, BT26-080;
Jupitermon BT24-101, BT26-033; level-6 Chronomon BT26-016. Every candidate's
full committed text was inspected; only four lenders are executed freshly above.
Aliases granted during play and additional multilingual identities are not covered
by this printed-name inventory. BT26-032/080 are themselves potential named
lenders carrying Succession; recursive exclusion cannot be marked not-applicable.
BT3-056 supplies a distinct pay-time redirect consumer shape: its persistent
Your Turn ability permits opposing suspension for Digisorption, with Q4703
excluding the card still in hand. At `ee85c20e7`, the redirector query read only top-card registry identities.
The public reproduction and correction below supersede that queued obligation
only for this source/host and single-instance same-turn payment shape.

The public evolution cases start at an established legal base, not a reproduced
initial egg-to-mega line. The attack pair starts at the legal final evolution
stack and explicitly does not reproduce its formation or once-per-turn reset.
All decks/security contain ordinary printed Digimon, no eggs or synthetic DP.
The initial six-card Mono-only evolution deck exceeded the four-copy limit;
review required a quiet three-Monodramon/three-Elecmon mix, now corrected
with its original zone counts retained. These are partial staged game states,
not certificates of a fifty-card deck list.
The cases drain the full effect queue and use assertNoLoudGap; attacks additionally
await the actual end of attack. Neither inferred temporal behavior nor a GUI
certificate is awarded from these tests.

## Gates

### Marker checkpoint (ee85c20e7)

`keyword-succession-lifecycle.test.ts` contains six ordinary public cases.
The first valid four-case baseline fails only BT26-080/103's missing Succession
assertions; the two already correct markers pass. The initial repaired test
incorrectly expected opposing security to survive Wrath's copied BT24-101
response; that fixture assertion was corrected from the printed contract and
is not counted as an engine failure.

Restoring only the two wrong root markers fails **2 / 6**, with four controls
green. Disabling only the topmostOnly conferral path while preserving correct
markers fails **4 / 6**, with two controls green: copied keyword, copied security
processing, accepted attack deletion and refused attack security/Piercing zones.
All temporary source mutations are restored before synchronization/delivery.
The mutation does not prove highest-match selection because these sources are
single-member; that obligation remains queued.

Commands:

- `pnpm --filter @aegis/api exec vitest run src/engine/conformance/keyword-succession-lifecycle.test.ts src/cards/BT26/BT26-032.test.ts src/cards/BT26/BT26-060.test.ts src/cards/BT26/BT26-080.test.ts src/cards/BT26/BT26-103.test.ts`.
- `pnpm effects:sync:set -- --set BT26 --base ba432186d`.
- `pnpm effects:check:set -- --set BT26 --base ba432186d`.

Final full default API at the corrected mixed-deck state passes **5112 files /
42339 tests**, zero expected failures, in 55.58 seconds:
`pnpm --filter @aegis/api test`. Workspace shared/API/web typecheck passes:
`pnpm typecheck`. BT26 sync/check passes 104 records, exactly two semantic
changes (BT26-080/103), zero semantic or byte changes outside the collection.
The earlier broad conformance/combat/effects/cards/BT26/Homeros/layout run
passes 254 files / 3165 tests but overlaps synchronization and predates the
fixture correction; it is supplemental. The final full API gate covers the
complete synchronized and corrected source/test state. The first full API run
also passed, but its over-limit fixture is superseded by this corrected run.

Independent read-only review required the copy-count fix, then confirmed the
blocker resolved with no further concrete issue. Closing restored consumer/conformance/Homeros/layout command passes **7 files /
67 tests**, zero expected failures. Both counterfactuals were repeated against
the corrected deck and retain exactly 2 red / 4 green and 4 red / 2 green; all
mutations are byte-restored. Scoped Oxlint, changed-file Oxfmt (12 files),
the current 66-set index and git diff --check pass. Delivery uses the existing
audit/engine-mechanisms-20260912 branch; no collection completion is claimed.

## Copied Digisorption redirect correction

Full reviewed §16-10 is pinned as `comprehensive-0228` with fingerprint
`4222de312acf7f62161e0c6a2c2655f30fcef0259ca405ed88fb7e7e8ca10375`.
It requires actual optional suspension for the mandatory discount, permits
suspending the evolving base and allows multiple keyword instances to overlap.
The multiple-instance obligation is not proved by this single-amount path.
BT3-056's full catalog and Q4703 require the persistent redirect already on the
battle area; the card still in hand cannot supply its own redirect.

Public setup begins with an established suspended BT3-056 and a quiet suspended
Green level-5 Okuwamon (BT1-077), so no own Digimon can pay. Public alternate
evolution into BT26-032 costs two (memory 10→8), physically retains BT3-056 and
finishes its own optional effects with refusal. A subsequent public normal
BT3-056 evolution over Okuwamon must pay two by suspending the opposing quiet
Monodramon, ending at six memory. The original baseline instead ends at three:
**1 failed / 9 passed** across the then-ten-case suite. This is a direct paid
memory assertion, not a pending-decision timeout or synthetic timing.

`GameEngine.digisorptionRedirector` preserves the existing native registry path,
then checks active conferrals attached to a live battle-area Digimon. A copied
candidate must have a present, face-up physical stack lender registered as a
redirector; inherited-only and other trigger-limited copies cannot lend its
Your Turn ability. Native identity is unchanged. Copy usage is tracked by lender
instance and the grant source's suffix. `payDigisorption` rechecks the ability
before paying an opposing target and records that exact identity.

No card registration, authored IR or persisted effect record changes. Persisted
BT3-056 retains YourTurn/OncePerTurn GrantStatic digisorptionRedirect, and
BT26-032 retains its Static topmost Ceresmon effects grant, both inspected against
the direct modules. Existing GrantStatic actions and the side registry remain
the owning mechanisms; there
is no second behavior registration or keyword runner.

| Additional obligation                                    | Public observable proof                                                                                                                   | Consumers                    | Status            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ----------------- |
| Copied persistent redirect reaches real cost payment     | Two legal public evolutions: 10→8→6, opposing suspension, exact old/new stacks and settled zones                                          | BT26-032 with BT3-056 lender | verified, bounded |
| Native, absent and refused behavior stays distinct       | Native 10→8; absent 10→5; copied refusal 10→8→3, no opposing suspension for either negative                                               | BT3-056 and neutral host     | verified, bounded |
| Same-turn use is consumed for the copied occurrence      | Public formation, then two Argomon BT2-050 evolutions; copied 8−2−5=1, native 10−2−5=3; first opposing target suspended, second unchanged | BT26-032 / BT3-056 / BT2-050 | verified, bounded |
| Actual source/granter changes and real next-turn reset   | Initial/formed stack only                                                                                                                 | Full distinct copy shapes    | queued            |
| Multiple redirectors and prevention of actual suspension | No multi-source choice or prevented-cost producer here                                                                                    | Native and copied forms      | queued            |

The Argomon recipient is deliberately a non-redirector: a newly evolved Ceresmon
would supply an additional unused native ability and obscure the frequency test.
All pools respect individual four-copy limits; quiet decks and security contain
no eggs. Partial staged states and final source lines are not initial deck or
whole evolution-line certificates.

Disabling only copied discovery fails **2 / 12** with ten controls green. Skipping
only copied usage accounting fails **1 / 12**, eleven controls green, at the
second payment's final memory. Both exact source mutations are restored.
Restored focused conformance/native/host/layout command passes **4 files / 30
tests**. Independent read-only review found no blocker; it preserves multiple
redirectors, prevented suspension, reset and physical-identity changes as open.
Final full API after the assertion-style cleanup passes **5112 files / 42345
tests**, zero expected failures, in 60.46 seconds; workspace shared/API/web
typecheck passes. The earlier 60.25-second full run predates that cleanup and is
superseded. Final no-copy and no-copy-accounting reruns retain exactly 2 red /
10 green and 1 red / 11 green after the strengthened native/absent controls;
all mutations are byte-restored. Final focused conformance/native/host/layout
passes 4 files / 30 tests. Scoped Oxlint has no warnings, five-file Oxfmt,
66-set index, layout and diff checks pass before atomic branch delivery.

Exact closing commands: `pnpm --filter @aegis/api test`, `pnpm typecheck`,
`pnpm --filter @aegis/api exec vitest run src/engine/conformance/keyword-succession-lifecycle.test.ts src/cards/BT3/BT3-056.test.ts src/cards/BT26/BT26-032.test.ts src/cards/audit-docs.test.ts`,
`pnpm exec oxlint apps/api/src/engine/GameEngine.ts apps/api/src/engine/conformance/keyword-succession-lifecycle.test.ts`,
changed-file Oxfmt, `pnpm audit:index`, and `git diff --check`.
No optional Postgres or GUI certification is claimed.

## Actual suspension payment checkpoint

`keyword-succession-lifecycle.test.ts` now has 18 cases. Two new public cases
use source-free BT19-101's printed prohibition in native and formed-copy
contexts. Baseline: 2 red / 12 green; corrected payment charges five, leaves the
opposing target unsuspended and resolves without a loud gap. The printed
prohibition is implemented in its existing IR; no card module or persisted IR
was changed for this correction.

Two further public cases suspend an ordinary opposing Digimon, triggering
BT25-059 Ceresmon's All Turns reaction. With four suspended Digimon, the chosen
BT6-063 is reduced to zero DP and deleted. The payment target remains suspended,
the watcher remains unsuspended, and the evolution costs two. In the copied
case, the legal BT3-056 → BT26-032 formation first costs two. Exact surviving
field/trash identities and settled decisions distinguish successful payment
from a skipped reaction. An initial invalid harness preference assertion was
corrected to manually choose the payment and prefer only the reaction target;
that discarded fixture failure is not an engine defect.

Two **supplemental** cases use the named one-shot `advance.failNextSuspension`
affordance to return no paid IDs. This is fault injection, not a real in-game
replacement/prevention producer. The first evolution pays five and leaves the
target unsuspended; the second pays two and suspends it. Intermediate memory
assertions prevent the equal final total from hiding prematurely consumed
redirect usage. The primitive is restored in a finally block.

Focused conformance plus the testkit seam guard passes 2 files / 19 tests before
final formatting. The final formatted source passes the full API: 5112 files / 42351 tests,
zero expected failures, in 54.33 seconds. Workspace shared/API/web typecheck
passes. Removing only the successful-transition guard fails 2 / 18 with
16 controls green; removing only reaction dispatch also fails 2 / 18 with
16 controls green. Both exact mutations are byte-restored. Independent
read-only review found no blocker. The previous 42345-test gate belongs to
the earlier correction. Final scoped lint, format, layout, 66-set index and
diff checks are recorded at delivery.
Multiple-provider choice, real failed-transition replacement producers,
source-kind-qualified immunity, source/granter loss and next-turn reset remain
open. These six cases do not certify all Digisorption or Succession shapes.

## Copied Succession exclusion checkpoint

Source: the fresh official comprehensive PDF remains version 4.2, updated
2026-08-18; §16-47-1/2 were read in full and match the existing pinned chunk.
Full local Bagramon Q2113/2114/Q5207 and Bacchusmon Q7112/7113/7114 were read.
Q2113 confirms an opposing Digimon leaves the battle area when placed under
another. The placed source is deliberately unstacked: this does not certify
Bagramon's own-source shedding or complete implementation.

Two public cases start with established unstacked Digimon. Three neutral
BT6-063 attacks remove quiet security and leave those Digimon suspended. A
public cost-14 Bagramon play from ten memory puts BT26-080 or BT25-077 under the
other player's BT26-080 and ends the first turn at -4. The existing production
turn seam opens the next player's Main at four memory; its caller performs the
seat/memory handoff, without claiming room-loop certification. Bacchusmon's
public attack deletes two suspended targets with the nested BT26-080 source,
but only one with BT25-077. The attacker retains its physical lender, DP,
controller and suspension. Its own and copied Security Attack +1 check three
quiet cards in the nested case; the control checks two. Exact surviving field,
trash and security distinguish suppressed effects from correct exclusion.
All individual card pools respect four-copy limits and contain no eggs.

The original uncorrected reproduction fails 1 / 19 with eighteen controls
green because the third target is also deleted. Removing only collector
exclusion fails 3 / 34 with 31 controls green (one public nested case and two
supplemental projections). Removing only the BT26-080 Succession effect tag
fails 1 / 20 with nineteen controls green. Both exact mutations are byte-restored.
Three explicitly supplemental collector cases independently preserve sibling
root markers when excluding Succession or Security Attack; they use a synthetic
conferral and are not public grant-producer certificates.

Focused conformance/collector/registration/four-consumer regression passes
7 files / 80 tests after formatting. BT26 sync changes only BT26-032/060/080/103
semantically: one effect tag and one exclusion list per module, 104 records,
zero out-of-set semantic or byte changes. Final BT26 check confirms 104 records synchronized with the same four-record
semantic union and zero out-of-set changes. Final full API passes 5112 files /
42356 tests, zero expected failures, in 58.38 seconds; workspace shared/API/web
typecheck passes. The earlier 58.85-second run predates removal of two redundant
unsupported player-target seat fields from the fixture and is superseded.
The final typed fixture retains exactly 3 red / 31 green for collector removal
and 1 red / 19 green for the missing card tag; all mutations are byte-restored.
Independent read-only review found no blocker. Restored conformance, collector,
registration, four consumer suites and audit layout pass 8 files / 84 tests.
Scoped lint has no warnings; all 20 changed files pass formatting. The 66-set
index is current and diff checks pass before atomic delivery.
The earlier 42351-test result belongs to the previous repair.
Closing commands: `pnpm --filter @aegis/api exec vitest run`, `pnpm typecheck`,
`pnpm effects:sync:set -- --set BT26 --base 810868b64`,
`pnpm effects:check:set -- --set BT26 --base 810868b64`,
`pnpm --filter @aegis/api exec vitest run src/engine/conformance/keyword-succession-lifecycle.test.ts src/engine/effects/collect.test.ts src/engine/effects/interpreter/registration/module.test.ts src/cards/BT26/BT26-032.test.ts src/cards/BT26/BT26-060.test.ts src/cards/BT26/BT26-080.test.ts src/cards/BT26/BT26-103.test.ts src/cards/audit-docs.test.ts`,
changed-TypeScript `pnpm exec oxlint`, changed-file `pnpm exec oxfmt --check`,
`pnpm audit:index`, and `git diff --check`.

The conformance suite now has 20 cases: eighteen public and two supplemental
failed-transition injections. Full source departure, face boundaries (including
DUAL Option effects), other nested lender forms and grant/synthesis encodings
remain open. No card, collection or keyword receives fresh complete certification.

## Open items

Complete the normative and distinct source/consumer-shape denominator, especially
remaining nested-source shapes beyond the public Bacchusmon exclusion proof. Reproduce public highest-match and source
changes, granted/inherited forms where legal, copied Main and pay-time effects,
linked/security exclusions, duplicate copying and once-per-turn reset/borrowing
identity. Complete initial evolution stacks and broader keyword interactions.
The overall engine plan remains active across all phases.

## History

`ba432186d` is the inspected baseline. Historical BT26 whole-card credit is
superseded for these four consumers by the current below-ten cap in BT26.md.
A corrected icon and passing bounded path do not recalculate the whole card.
