# Option-use reductions

## Status and contract sources

Bounded correction of EX13-043's known Option-use numeric residual and its
unwritten single-color restriction. The full mechanism audit remains open.

Base commit: b56c196f7. Exact committed catalog and direct executable module
for EX13-043 were read, including Green level-five evolution, exact Leopard
Mode route, Assembly material levels/traits, independently optional suspend
and lowest-DP return, shared once-per-turn play/use, and the paid suspended
leave prevention. No inherited or Security effect is printed.

`node tools/kb/query.mjs card EX13-043` returns no card rulings (pre-release).
`data/kb/rules/comprehensive.md` SHA-256
`19106a66edc44722faa460baa6746f8dc06414bd0775fda980914000f86e1de6`:

- §1-3-9: a reduced cost cannot become negative.
- §§4-6-1/2/4/5/6: DUAL information and the declared Digimon/Option face;
  both information areas share the traits line.
- §9-1 in full: color eligibility, first Main resolution, temporary no-area
  state, pending trash unless placed, individually used cards, failed use
  without memory movement, and payment before first Main activation.
- §§15-1-2/4: ordered complete processing.
- §16-42: Use Req. is a conditional color-requirement waiver, rather than
  an extra mandatory requirement alongside ordinary color eligibility.

The printed granting clause selects a Mammal, Beast, Beastkin or Royal Knight
trait card, reduces cost by four, then one for each suspended Digimon.
It states no single-color restriction. Both boards count; suspended Tamers
and breeding exclusions remain separate consumer obligations.

## Implementation trace

`UseOptionWithoutCostAction.reduceCostByScaling` expresses the live additional
reduction using existing Scaling IR. Private `optionUseReduction` in
`apps/api/src/engine/effects/interpreter/actions/borrowed.ts` combines the
flat reduction, existing opponent-memory reduction and live scaleFactor.
Both `canAttemptUseOptionWithoutCost` and `runUseOptionWithoutCost` call it.
The use path recalculates at payment after selection, forwards the discount
to the existing production primitive once, and retains the original printed
use cost for cost-sensitive watchers. Existing generic affordability,
color checking, payment and lifecycle ownership are preserved.

EX13-043's Use branch carries the same perSuspendedDigimon Scaling as its
Play branch, and sets existing allowMultiColor=true. Existing Option color eligibility and conditional Use Req. waiver logic
remain unchanged. Frequency, shared use identity, target count,
trait gate, replacement and duration parameters remain unchanged.
Registration is exclusively registerIrCard. Coverage/full with no residual
records this repaired encoding; it does not award a whole-card ten.

## Obligation ledger

| Obligation                                                               | Source             | Observable proof                                            | Status           |
| ------------------------------------------------------------------------ | ------------------ | ----------------------------------------------------------- | ---------------- |
| Flat four plus live suspended Digimon count, including attacking host    | EX13-043           | public attack costs one/zero/zero                           | verified bounded |
| Count opponents and floor excess reduction to zero                       | EX13-043; §1-3-9   | one/two suspended opponent controls                         | verified bounded |
| Same discount in preflight and payment; retain printed use cost          | §9-1-8/9; EX13-043 | four adapter cases plus public payment                      | verified bounded |
| Optional refusal preserves memory, card and deck                         | EX13-043           | public decline attack                                       | verified bounded |
| No White requirements waiver for BT13-110                                | §9-1-1             | accepted-choice missing White control                       | verified bounded |
| Permit Beastkin DUAL Option face without color-count restriction         | §4-6; EX13-043     | registered BT26-031 Main, exact trash/cost                  | verified bounded |
| Exhaustive suspended pool exclusions and source/choice races             | full contract      | not established by these samples                            | queued           |
| Complete inherited/keyword/replacement/turn-reset/evolution interactions | full card contract | existing supplemental cases, not fresh complete certificate | queued           |

## Consumer and public action evidence

Inspected granting module: EX13-043, whose evolution/attack entries share
one use key and the same modal. Newly executed public timing: attack.
There is one newly authored scaled Use consumer; no exhaustive source or
consumer denominator is claimed for all Option-use reductions.

- Three public attacks with seeded printed 12000-DP Leopardmon and an
  unsuspended White EX2-052 Horn Striker use BT13-110 (printed six,
  Royal Knight). The attack suspends its host before the effect. Zero,
  one or two opposing suspended quiet 8000-DP BT10-064 Gogmamon give costs
  one, zero and zero. From ten memory, final values are nine, ten and ten.
  BT13-110 actually Draws the exact neutral Monodramon deck card and places
  itself as an Option permanent; it is not incorrectly asserted trashed.
  No breeding King Drasil exists, so its optional placement cannot alter
  hand/source identity or trigger its Delay. Exact own hand/field/trash and
  opposing checked-security trash are asserted. Horn Striker has no Mother
  D-Reaper, so its conditional Rush is inactive.
- Public refusal keeps the exact Option in hand, deck length and memory
  ten. Missing White does likewise with automatic acceptance biased toward
  any offered legal choice, so refusal cannot disguise bad eligibility.
- A public attack explicitly chooses the Use modal branch for BT26-031,
  Beastkin DUAL Murasamemon. Seeded BT26-025 Liollmon supplies ordinary Yellow eligibility and
  also satisfies the Glowing Dawn conditional waiver; its own entry effects are not fired and inherited text is
  inactive. The Option costs zero, registered Main reduces printed
  17000-DP BT12-112 Superior Mode by 8000 then 5000, paying the exact own
  security card. Target ends at 4000; the exact DUAL and security IDs end
  in own trash, no DUAL Digimon is placed, and enemy security is checked
  and trashed. The Option face's required Yellow, not both printed Digimon
  colors, is supplied. Both catalog and direct recipient module were read.

All six new public attacks await completed attack cleanup, no pending
decision, and no loud gap. Seeded prior entries do not certify their initial
play/evolution history. Existing injected attack-window cases remain
explicit supplemental seams.

## Red/green and review evidence

Corrected public baseline against b56c196f7: three red, twenty-five green,
one old expected failure (29 total). Memory stays eight instead of expected
nine/ten/ten. An initial illegal-target fixture used security rather than
protocol player; it was corrected before this numeric baseline and is not
counterfactual evidence.

After adding scaling, a zero-scaling helper mutation fails eight cases
(three public costs, the converted timing residual, four adapters), while
27 controls remain green (35 total). Original borrowed.ts is restored in
finally. The final DUAL proof was added afterwards and is not counted in
that mutation. Separate unwritten-color baseline fails one DUAL case
(target remains 17000 instead of 4000) with 31 other card cases green;
allowMultiColor restores the registered Option-face resolution.

Final focused card/adapter/layout command passes three files / 40 cases
(32 card, four adapter, four layout). Adapter preflight tests require full
discounts five and six, payment forwards six once with printed use cost
six, and existing opponent-memory three combines to discount nine.
These context doubles do not constitute public affordability-boundary or
watcher-production proof. Independent read-only review found no blocker
in the scoped scaling symmetry or DUAL/requirement/face proof. No temporary
mutation remains.

## Gates and open items

`pnpm effects:sync:set --set EX13 --base b56c196f7` and matching
`effects:check:set` pass: 60 records, one semantic change in EX13-043,
zero semantic or byte changes outside the collection. Persisted IR has
the scaled reduction and color-count permission on both shared timing
entries; no other card record changes.
`pnpm --filter @aegis/api exec vitest run src/engine/ src/cards/EX13/ src/cards/BT13/ src/cards/BT26/ --maxWorkers=1 --no-file-parallelism`
passes 557 files / 10290 tests, with one declared expected failure
(10291 total), in 43.56 seconds. `pnpm typecheck` passes shared, API and
web. Scoped Oxlint passes five changed TypeScript files; Oxfmt passes all
eight changed files, the 66-set status index is current and
`git diff --check` is clean. Final full API command
`pnpm --filter @aegis/api exec vitest run --maxWorkers=1 --no-file-parallelism`
passes 5109 files / 42306 tests and one declared expected failure
(42307 total), in 180.92 seconds. EX13-063 pooled Guard saving remains
open, along with the complete generic audit. Current card score
remains capped at eight. Complete initial legal stack, Assembly ordering,
full trait/near-match recipient pool, competing replacement lifecycle,
public turn resets, every DUAL shape and selection-time state changes
remain open. This correction does not certify all generic costs, keywords
or engine mechanisms.
