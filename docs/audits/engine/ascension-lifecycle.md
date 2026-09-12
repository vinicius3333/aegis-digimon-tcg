# Ascension lifecycle audit

## Status

Bounded engine audit at baseline `74c6ba7e4`. Public conformance now covers
native acceptance/refusal, a non-keyword negative control, exact instance and
source routing, explicit trigger ordering, and a temporary granted keyword.
This is not a complete Ascension certification: live source departure and
re-entry, all provider shapes, copied effects, and every printed consumer still
need collection-level proof. The isolated counterfactual that short-circuited
`ascendToSecurity` failed 4 of 6 public cases (the two refusal/negative-control
cases stayed green), confirming that the focused behavior depends on this seam.

## Contract and sources

The comprehensive rules text reviewed from `data/kb/rules/comprehensive.md`
is §16-43-1 through §16-43-3: when a card with Ascension is deleted, its
controller may place that card on top of their security stack; Ascension is a
trigger-type effect and its processing is optional. The reviewed source pin is
`comprehensive-0262`, §16-43, fingerprint
`76ebf45a33b0f32ac2d60968e7026e86ac27ce1ae59daa902cde5ad628c98dd4`.

Relevant local rulings are BT26-075 Q7100 and EX12-047 Q6815: simultaneous
deletion effects can be ordered by their controller, and pending effects on a
card cannot activate after Ascension moves that card out of trash. BT25-034
Q6298 and BT25-040 Q6309 restrict their separate security-trash effects to a
card directly trashed from security.

## Obligation ledger

| Obligation | Evidence | Status |
| --- | --- | --- |
| Identify Ascension as a trigger keyword | `keywords.ts`, keyword token, and all inspected compiled providers use `registerIrCard` | Verified, bounded |
| Trigger only when the Digimon is deleted | Real public battle deletion of BT25-034, BT25-040, and BT26-029; BT1-052 negative control trashes to trash | Verified for native path |
| Make processing optional | Public BT25-040 acceptance and explicit `respondDecision` refusal; refusal leaves the deleted card in trash and existing security unchanged | Verified for demonstrated native path |
| Place the exact deleted card face-down on top security | BT25-040/BT26-029 preserve holder instance IDs; evolution source goes to trash; security card is face-down | Verified for native path |
| Preserve source identity and destinations | BT25-040 and BT26-029 stacks assert holder/source/security instance IDs and final zones | Verified for demonstrated stacks |
| Resolve simultaneous deletion effects in controller-selected order | BT26-075 public `orderTriggers` response selects Ascension first; pending On Deletion play is dropped and the same card reaches security | Verified for one multi-trigger provider |
| Support granted Ascension | BT26-030 is played through the public `playCard` intent, publicly trashes the selected hand-cost instance, grants Ascension to an Iliad Digimon, then a real battle deletion moves that exact instance to security; BT26-030 provider tests cover declined cost and no-grant behavior; the expiry case observes the temporary keyword absent after the completed public turn boundary | Verified for demonstrated acceptance, refusal, and keyword expiry only |
| Support inherited Ascension | No fresh public conformance case yet; inherited keyword consumers and stack behavior remain to be exercised | Open |
| Support copied/runtime-conferral Ascension | No public copy case in this bounded file; conferral identity and duplicate-instance semantics remain open | Open |
| Handle source departure, top changes, face state, and re-entry | No live removal/re-entry sequence in this audit | Open |
| Prove post-expiry deletion behavior | The expiry case does not perform a later public deletion after the granted keyword disappears | Open |
| Enforce timing, duplicate copies, and once-per-turn behavior | Ascension itself has no printed once-per-turn clause; multiple provider/grant interactions remain unproved | Open |

## Provider inventory

The committed catalog and direct modules identify six materially distinct
provider shapes inspected for this audit:

| Provider | Shape | Direct implementation |
| --- | --- | --- |
| BT25-034 Angemon | Printed native keyword plus inherited Barrier | Compiled static keyword; `registerIrCard` |
| BT25-040 MagnaAngemon | Printed native keyword plus security and inherited effects | Compiled static keyword; `registerIrCard` |
| BT26-029 Aegiochusmon: Holy | Printed native keyword alongside Decode and inherited watchers | Compiled static keyword; `registerIrCard` |
| EX12-047 Amaterasumon | Printed native keyword alongside Piercing/Security Attack and On Deletion | Compiled static keyword; `registerIrCard` |
| BT26-030 Pumpkinmon | Temporary On Play/When Digivolving Ascension grant after hand-trash cost | Compiled `GainKeyword`; `registerIrCard` |
| BT26-075 ScourgeChiropmon | Printed Execute and permanent Ascension, plus competing On Deletion | Compiled static keyword; `registerIrCard` |

BT25-034 and BT25-040 also have separate security-trash effects. Their Q&A
does not expand the Ascension contract and is kept distinct from battle
deletion proof.

## Public proof

`apps/api/src/engine/conformance/keyword-ascension-lifecycle.test.ts` contains
eight cases. The native cases prove BT25-034/BT25-040/BT26-029 acceptance with exact
holder/source IDs, an explicit BT25-040 refusal, a BT1-052 non-keyword negative
control, and final battle/security/trash state. The added BT26-075 case answers a real public
`orderTriggers` decision and proves Ascension-first pending-effect loss. The
added BT26-030 case invokes the public `playCard` intent, observes the granted
keyword, asserts the exact hand-cost instance was trashed, and uses the grant in
a real battle deletion. Its provider suite separately proves declined or
unavailable hand costs leave the cost in hand and grant neither keyword. The
expiry case uses the same public turn loop, declines both generated Execute
prompts, and confirms only that the temporary Ascension is gone after
`runOneTurn()` completes. A later public deletion after expiry remains open.

Focused result: `pnpm --filter @aegis/api exec vitest run
src/engine/conformance/keyword-ascension-lifecycle.test.ts` — 1 file, 8 tests,
all passing. The six-provider regression command passed 7 files / 79 tests.
The short-circuit counterfactual was restored in `finally`; the pre/post SHA-256
for `apps/api/src/engine/effects/primitives.ts` was
`9ead31d84865fb2a411bf03eb5cbd4c75d5ea973597d2eb65f5eaa1ae2c64cc5`, with
`breeding.ts` and `placeUnder.ts` also unchanged across the counterfactual.
Full API passed 5,115 files / 42,398 tests, and workspace typecheck passed for
shared, web, and API. `git diff --check` is clean.

## Remaining work

The audit remains below full certification until public proof covers inherited
and copied providers, live persistent keyword loss/re-entry, multiple
simultaneous Ascension candidates, and the complete catalog consumer set.
Potential engine counterfactuals should be scheduled by the coordinator only
after focused lanes are paused; this audit found no failing public behavior
requiring a source patch.
