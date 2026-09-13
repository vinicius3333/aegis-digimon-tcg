# Guard lifecycle

## Status and contract

EX12 consumer revalidation (2026-09-13) now proves public source loss/re-entry,
failed Evade-interrupted payment and simultaneous/refused-holder cases; see
the dated section below and `../EX12.md` for collection gates. Broader mechanism
certification remains open for additional producer/ordering combinations.
Historical reproduction base: 987110990; reproduction delivery: c80383292;
correction base: c80383292.

The exact EX13-063 catalog and direct module were read. PrinceMamemon grants
Blocker and Guard to all own Mamemon-named Digimon, including itself.
Its other printed reveal/free-play and separate highest-cost deletion clauses
must be allowed to resolve rather than silenced in a test fixture.
`node tools/kb/query.mjs card EX13-063` has no card-specific entries.

`data/kb/rules/comprehensive.md` SHA-256
`19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`,
§16-45 in full: Guard protects a controller's other Digimon from opposing
effects, pays by deleting the holder, is immediate-type, and is optional.
The clause's shorthand uses a singular pronoun. The official
[EX12-056 card page](https://world.digimoncard.com/cards/?card_no=EX12-056&search=true)
was opened and its effect/reminder read: it uses plural prevention for the
other Digimon. Historical authored replacements encoded simultaneous protection
with affectsAll; the canonical holder hook preserves that event-wide behavior. Preserve this distinction in the normative denominator;
complete simultaneous-trigger/payment and event grouping still need proof.

## Initial consumer inventory

Exact Guard icons in the committed catalog occur in six card definitions;
a raw Guard text search also returns P-222 because it names Wind Guardians,
which is not a Guard keyword. This is the printed-catalog inventory only,
not an exhaustive runtime-grant or inherited-shape certification.

| Consumer | Form                       | Current behavior / proof                                                                                                       |
| -------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| EX12-056 | printed holder             | Static Guard; public Gaia self-payment and exact surviving target                                                              |
| EX12-057 | Paishu producer            | unchanged token IR; public legal Cho-Hakkaimon → Takutoumon evolution creates real Paishu, which pays Guard to save its parent |
| EX12-072 | face-up-security ME grant  | security Aura; public Gaia with face-up/down controls and lone-holder exclusion                                                |
| EX13-052 | printed holder             | Static Guard; public deletion, hand/deck relocation, battle/rule/own-effect negatives, competing Detach                        |
| EX13-063 | resident Mamemon grant     | continuous Aura; public other-holder saves grantor and paid grantor protects two simultaneous targets                          |
| EX13-065 | printed holder with Decode | Static Guard; public Gaia and existing distinct Guard→Decode payment integration                                               |

A recursive persisted-IR keyword scan reconciles the same six card IDs with
all exact Guard icons across main/inherited/security/Option catalog fields.
There are zero printed inherited Guard icons at this base. Paishu's committed
token definition has Blocker and Guard; the producer is not itself a holder.
Runtime code sites are the six modules above and the canonical engine reader
(the Prince module uses a parameterized keyword factory). This closes the
initial committed consumer inventory, not every future/granted equivalence
class or inherited execution path.

## Implementation trace

`GameEngine.consultLeavePrevention` awaits continuous recomputation, then
passes Detach reactions plus reactions for every live battle-area Guard
holder to the existing consult. Enumerating the whole battle area matters:
the paying holder may be outside the endangered set. The Colyseus players
ArraySchema is copied to a normal array before flatMap.

`effects/guard.ts` captures physical top instance, permanent and controller.
It validates top identity, controller, zone and active keyword before and
after the optional prompt. Protection is restricted to the holder's OTHER
battle-area Digimon controlled by the same player, and the cause must be a
defined opposing effect. It pays only by deleting that holder. The nested
payment enters the holder's Digimon effect-resolution frame, so an opposing
Gaia or the granting security Option cannot own that self-deletion.
Zero actual deletions do not pay; ownership is restored in finally on error.

Guard generated IDs follow the original endangered-count offset and cannot
collide with Detach's negative IDs. Its physical-source activation identity
uses the existing ordering and immediate-effect reentry seam.
`leavePrevention.ts` remains unchanged. Its successful affectsAll branch
eagerly protects other matching simultaneous targets after payment; the
predicate deliberately does not require the paid holder/grantor to remain
on the field. Otherwise a deleted Prince's vanished aura would undo an
already paid protection.

Five authored Guard equivalents are removed. Printed holders retain Static
keyword records; Prince retains both auras; Metal Empire now grants Guard
through a security Aura with exact ME trait and Digimon/controller filters.
Use Req, all other printed actions, Decode, inherited non-Guard protection
and exclusive registerIrCard registration are retained. EX12-057's token
producer is unchanged. No second replacement path is left for these grants.

## Obligation ledger

| Obligation                                                        | Source / public action                             | Evidence                                                                                  | Status                |
| ----------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| Different granted holder may pay to save grantor                  | §16-45; Gaia ST1-16                                | Prince survives, exact BigMamemon pays, deck untouched                                    | verified bounded      |
| Lone holder cannot save itself                                    | §16-45; Gaia                                       | accepting lone Prince and lone security-granted ME both leave                             | verified bounded      |
| Refusal retains holder and original deletion resolves             | §16-45-3; Gaia                                     | exact payer survives; full Prince OnDeletion follows                                      | verified bounded      |
| Correct controller and physical payer                             | §16-45; public decision                            | decision names actual BigMamemon, wrong-seat answer rejected, right-seat refusal resolves | verified bounded      |
| Printed/resident/token/security forms                             | catalog; public Gaia                               | three printed holders, Mamemon aura, actual Paishu producer, face-up/down ME grant        | verified bounded      |
| Opponent-only effect cause                                        | §16-45; attack, Wyvern's Breath, Heat Viper        | no Guard offer for battle, rule DP-zero, or own payment; exact fields/trash               | verified bounded      |
| One payment protects simultaneous targets after source departure  | official plural reminder; Iron-Fisted Onslaught    | Prince pays, both printed cost-eleven SaberLeomon survive, full OnDeletion resolves       | verified bounded      |
| Competing keyword ordering                                        | §15-8-5; Gaia                                      | actual Guard or Detach chosen, distinct IDs, only selected payment reaches trash          | verified bounded      |
| Identity/zone/controller/grant revalidation during prompt         | source lifetime; adapter                           | five invalidation races cannot pay                                                        | verified adapter only |
| Prevented or rejected self-payment                                | cost semantics; adapter                            | count zero refuses prevention; rejection restores ownership and propagates error          | verified adapter only |
| Full public source-loss/re-entry and prevented-payment producers  | §15-8-5; sources to reconcile                      | actual competing costs, public races and fresh identities not yet proved                  | queued                |
| Full simultaneous grouping/trigger exceptions and repeated offers | §15-8-5-4; singular CR/plural reminder distinction | not certified from the simple two-target event                                            | queued                |

## Public baseline and fixture integrity

The colocated EX13-063 tests publicly use ST1-16 Gaia Force for eight memory
from ten on seat one's turn. Printed quiet Red Monodramon supplies its color.
The server chooses PrinceMamemon, biased by its exact instance ID. Gaia's
registered Main resolves, its exact physical card reaches owner's trash,
memory ends at two, no pending decision or loud gap remains.

In the acceptance case, printed quiet BT6-063 BigMamemon should sacrifice
itself and leave PrinceMamemon alone with the exact three-card deck untouched.
Actual execution leaves BigMamemon and deletes Prince. The grantor's real
OnDeletion reveal trashes three nonmatching Bird cards and its separate
highest-cost deletion removes the opposing Red source. These reactions are
not suppressed or replaced with fake card data.

The lone-holder control accepts optional processing, so illegal self-payment
cannot hide behind refusal. The two-holder refusal control declines and
keeps BigMamemon. Both allow the Prince's complete printed OnDeletion
follow-ups. Exact final field/trash identities are asserted.

The first attempted predicate looked up Gaia while the Option was in the
normal temporary no-area state (§9-1-4). Its ID is now captured before use;
that fixture failure is not Guard red evidence. Corrected genuine baseline:
one failure, twenty passes and one old expected failure (22 total).
At c80383292 the public defect was retained as a second expected failure.
Both that path and the older deletion-seam representation are ordinary tests
after this correction; neither relied on a fixture-helper failure as red proof.

## Correction proof and gates

`keyword-guard-lifecycle.test.ts` has sixteen cases: printed holders, hand/deck
relocation, security face-up/down, paid grantor/two targets, publicly produced
Paishu, battle/rule/own-effect exclusions, lone ME holder, controller decision,
and Guard/Detach ordering in both directions. Printed DP/cost are unchanged.
Quiet fixtures use neutral Monodramon/BigMamemon, color-source Armadillomon,
Goblimon, Tsukaimon, DemiDevimon, Hagurumon and MetalTyrannomon. Biyomon's
printed inherited text is inactive in the nonmatching loose reveal deck;
seeded SaberLeomon's WhenDigivolving does not fire during the deletion event.
All real Guard payment OnDeletion/Decode clauses are allowed to resolve.

The token case publicly evolves Cho-Hakkaimon into Takutoumon for its printed
alternate cost three, creates a real 6000-DP Paishu and retains the source
under its surviving parent. The actual turn machine supplies turn entry/end
(no begin-turn intent exists); runOneTurn's caller arranges the handoff seat
and reframes memory as the existing runTurn seam documents. This is not a
room-loop/handoff certificate. Token deletion removes it from the match,
not into trash. The parent never gains the token's Guard.

Genuine consumer baseline on c80383292: two failures/seven passes (nine total)
for missing security keyword visibility and absent token Guard behavior.
Earlier no-such-permanent, ordinary-cost-four, unavailable Main controller
and runOneTurn handoff assumptions were corrected fixture failures; none is
counted as Guard counterfactual evidence.

Disabling only the new Guard holder factory while leaving migrations in place:
**14 failures, 24 controls pass (38 total)** in conformance/card suites.
The helper is restored in finally before any validation. Supplemental controller
swap baseline exposed one failed race/six passing cases; adding live controller
revalidation makes all seven adapter cases pass. They are asynchronous adapter
proof, not certificates for a public control-change or payment-replacement producer.

Final focused card/consumer/adapter/layout: **nine files, 119 tests pass**.
Commands:
`pnpm --filter @aegis/api exec vitest run src/engine/effects/guard.test.ts src/engine/conformance/keyword-guard-lifecycle.test.ts src/cards/EX12/EX12-056.test.ts src/cards/EX12/EX12-072.test.ts src/cards/EX12/EX12-057.test.ts src/cards/EX13/EX13-052.test.ts src/cards/EX13/EX13-063.test.ts src/cards/EX13/EX13-065.test.ts src/cards/audit-docs.test.ts`.

EX12/EX13 sync succeeds (77/60 records). Exactly five semantic records change,
two EX12 and three EX13; out-of-union isolation is checked before delivery.
Initial scripted module-boundary syntax mistakes and an unsupported direct
ArraySchema flatMap were corrected; the failed attempts are not green gates.
Independent read-only review found no blocker in the implementation or the
controller follow-up and agrees that wider certification remains open.
Broad engine/EX12/EX13/layout command passes **422 files / 9513 tests**:
`pnpm --filter @aegis/api exec vitest run src/engine src/cards/EX12 src/cards/EX13 src/cards/audit-docs.test.ts --maxWorkers=1 --no-file-parallelism`.
The first full API run passed, but typecheck exposed an invalid attack target
discriminator and a nonexistent event name in the new test. Both were corrected:
public attacks now use permanent targets and all sixteen cases call the standard
assertNoLoudGap helper. Final focused validation passes 9 files / 119 tests;
the restored zero-Guard counterfactual fails 14 cases with 24 controls green.
Final full API validation passes **5111 files / 42333 tests**, zero expected
failures, in 62.09 seconds. Workspace shared/API/web typecheck passes.
The broad count above predates these test corrections; the final full gate
covers the complete corrected source/test state. Scoped style, the 66-set
index, layout and diff checks are required before delivery.

## EX12 consumer revalidation (2026-09-13)

Fresh collection review reconciles all 77 EX12 catalog contracts, direct compiled
modules, KB rulings, peer/stack tests and shared actions. The previously missing
reachable Guard payment/source/grouping proofs now have public-intent cases in
`keyword-guard-lifecycle.test.ts`:

- Two eligible printed holders: explicitly target the independent Digimon,
  choose a replacement, refuse the first holder, accept the second and assert
  exact physical payer/survivor identities.
- Both printed holders are original targets of one Iron-Fisted Onslaught:
  one pays exactly once and the other remains; the departed payer's original
  queued leave does not remove the survivor.
- Face-up EX12-072 is exchanged to hand by EX12-074; observe Guard before and
  after source loss, then use opposing Gaia through natural turn progression.
- The same physical EX12-072 returns from security to hand and is publicly
  used again; observe the grant disappear/reappear, then pay Guard against
  opposing Gaia. This uses a neutral ME host without a Start of Main cost.
- Real EX12-035 Evade interrupts its own Guard payment: accept the exact
  holder's Evade prompt, observe suspension and failed self-deletion, and
  confirm the original opposing deletion proceeds. CR §16-22 permits this
  own-effect interruption; the synthetic zero-return adapter proof is now
  paired with an actual EX12 producer.

The focused Guard suite passes 21/21 tests. Combined with both original-red
compound-cost conformance suites, 3 files / 41 tests pass with one worker and
`TEST_HEAP_MB=3072`. Final EX12/mechanism/affected-peer/layout regression passes
274 files / 3300 tests with the same worker/heap bounds; serialized typecheck
passes with 4096 MB. No Guard production change is needed. Collection delivery
gates and current scores are recorded exclusively in `../EX12.md`.

Fresh official EX12-056 reconciliation confirms plural protection, supporting
the existing event-wide `affectsAll` behavior. Adapter races still explicitly
test identity, zone, top-card, controller and keyword invalidation before
payment, plus effect-owner restoration after rejected payment. They do not
claim public concurrent mutations: ordinary play/evolution/effect intents are
rejected while a decision is pending, and resolver processing is serialized.
Future producers that change these properties during legal immediate-effect
ordering require their own public proof. These engine-wide provider obligations
are distinct from the current EX12 consumer certification.

## Open items

Additional cross-set producers of control/top changes during legal eligible
ordering, payment replacement beyond Evade and distinct grant-stack interactions
still need public evidence before a whole-keyword or whole-engine certificate.
The dated EX12 section supersedes the previous queued source-loss/re-entry,
security-removal, prevented-payment and observed simultaneous-holder obligations.
The official plural reminder supports the certified EX12 event-wide behavior;
unobserved ordering combinations must retain their own evidence denominator.
This engine document does not award collection scores; current EX12 scores and
delivery gates live in `../EX12.md`.
EX13-063 executable coverage/residual metadata now closes its declared
expressibility gap, but its historical score stays provisionally below ten.
The generic engine plan remains active across all phases.

## History

c80383292 delivered source inventory and a public repro with two expected
representations of the same gap: focused 24 ordinary + two expected (26),
collection/layout 61 files / 1037 ordinary + two expected (1039); shared/API/web
typecheck, three-file style, 66-set index, diff and independent review passed.
No executable behavior or metadata changed at that checkpoint. Full API at
987110990 predates the repro and is only historical validation of that base.
