# Coordinator review queue

## Session 1 setup

- Historical 10/10 (docs/audits/BT17-AUDIT.md) is treated as unverified. Every
  row starts at 0 and earns credit from a session report only.
- Lane plan: nine concurrent opus card lanes; simple cards batched two or three
  per lane, complex cards one per lane. Engine lane serialized, dispatched only
  when card lanes retain reds naming a seam.
- Known fixture traps to sweep: Digi-Egg in security (034, 037, 056, 059),
  numeric `security: <n>` (17 fixtures), injected timing used as the only proof
  of a clause (37 files).

## Seam queue

(empty)

## Decisions

(none yet)

## Exact-name review (session 1)

Lane 3 found `match: "name"` (substring) used for printed exact `[Name]`
references in BT17-045, 046 and 052; BT17-046 observably played
"Terriermon (X Antibody)" and "Terriermon Assistant" for `[Terriermon]`.
Coordinator sweep of every remaining BT17 module for `match: "name"` is queued
(see RUN.md); every lane must check its own module for the same defect.
IR changed in 045/046/052: set sync required before the catalog-sync test is
green again.

## Engine question from BT17-102 (session 1)

`[All Turns]` granted names are not visible while the permanent sits in the
breeding area (`observe(...).effectiveNames`); the grant installs on the
battle-area recompute. Q2901's endpoint still holds after the move. Queued
as a continuous-scope question for the engine lane; no red retained.

## Mind Link seam (from lane 5, BT17-006)

`activateEffect` for BT14-087 `[Main]` Mind Link returns `illegal-target` with
eligible `[SoC]` (BT17-062) and `[Dark Animal]` (BT14-071) Digimon on board.
Seam: `engine/effects/mindLink.ts` `digimonEligibleForMindLink` /
`interpreter/actions/link.ts`. Q2704 and Q2703 covered via the production
placement verb for now. Queued for the engine lane (also blocks BT17-003).

## ACE overflow (from lane 7, BT17-018)

ACE cards carry `isAce` / `overflowMemory` in the catalog, not in effectText,
so no lane tests overflow. Coordinator will verify at set level that the
engine applies overflow for every BT17 ACE (grep `isAce` in cards.json) before
closeout; not a per-card rubric item.

## Decision: digivolution route names (session 1)

`engine/cards/cardData.ts` lines 482–488: `digivolutionRequirement.names` is a
substring match, `namesExact` an exact match. Printed `[Digivolve] Lv.N w/[X]
in name` is correctly `names`; printed `[Digivolve][X]: Cost N` names a card
exactly and must be `namesExact` (§2-3-1-2, same rule as effect filters).
Every lane from lane 22 on fixes its own module. Accepted cards whose module
carries a bare-name route still on `names` (at least BT17-007 `[Koromon]`,
BT17-025 `[Cerberusmon]`, BT17-030 `[Bibimon]`) go to one bounded sweep lane
after the last card lane, with a substring negative per route.

## Seam: suspend cost ignores `upTo` (from lane 12, BT17-041)

`engine/effects/interpreter/costs.ts` `canPayCost` suspend branch returns
`candidates.length >= required` and never reads `cost.target.upTo`. With one
yellow Tamer the "by suspending up to 2" cost is judged unpayable: no
decision, no suspension, Security Attack stays 0. Retained as `it.fails` in
BT17-041.test.ts. Priority 1 for the engine lane; hits every "suspending up
to N" cost.

## Seam: attack-target filter re-evaluated live (from lane 19, BT17-064)

`engine/effects/interpreter/conditions.ts:58` `attackTargetMatchesFilter`
re-evaluates the defender against live state when the sub-trigger fires; no
declaration-time snapshot exists in the payload. Q2816: an inherited
mid-attack trash of the defender's last source must not retroactively arm the
delete. Retained as `it.fails` in BT17-064.test.ts. Priority 3 for the engine
lane (after suspend upTo and Mind Link).

## Seam: paid cost then declined optional effect (from lane 21, BT17-080)

Q2853 lets the player place the three cards and still decline the digivolve.
`engine/effects/interpreter/actions/runAction.ts` `runActionInner` raises a
single optional prompt ahead of `payableActionCost` covering cost and effect,
so a decline skips both. `DigivolveViaPlacement` has no shape for "pay, then
may". Retained as `it.fails` in BT17-080.test.ts. Priority 4 for the engine
lane; a rules decision on whether this needs a new IR flag comes back to the
coordinator.

## Catalog note (lane 21)

BT17-079 keeps its `[Security]` clause inside `effectText` while BT17-080 uses
`securityEffectText`. Inconsistent field placement; behaviour is compiled and
tested in both. Recorded for SOURCE-RECONCILIATION, not edited.

## Seam: static name alias treated as full name (from lane 23, BT17-085)

`packages/shared/src/cards/effectiveNames.ts` `parsedStaticNameAliases` turns
"also treated as having [X] in its name" into a full-name alias, so
`nameExact` accepts EX4-030 Kuzuhamon as `[Sakuyamon]` (Q2868 says refuse).
Needs a substring-only alias channel in shared. Retained as `it.fails` in
BT17-085.test.ts. Shared-package seam: coordinator-owned or a dedicated
engine/shared lane after the card lanes finish.

## Catalog corrections queue (SOURCE-RECONCILIATION)

- BT17-088 `effectText`: "1 of your your Digimon" (doubled word).
- BT17-100 `effectText`: "1 of your[Diaboromon]" (missing space).
- BT17-079 `[Security]` inside `effectText` vs BT17-080 `securityEffectText`.

## Cross-lane defect (from lane 20)

BT17-044's "reduce the digivolution cost by 1 when digivolving into [Eosmon]"
does not apply: memory drops the full 2 in both BT17-074 play tests. BT17-044
is accepted at 8/10 with the reduction untested. Queue a bounded follow-up on
BT17-044 (add the cost-reduction proof; if the engine ignores the reduction,
retain red and name the seam).

## IR pattern notes (lane 24)

`youHave` counting ignores `filter.orFilters` (`countMatching` ->
`permanentMatchesFilter`); printed OR conditions must use the `anyOf`
condition combinator. "By suspending this Tamer" must compile as a
`CostGatedBlock` suspend cost, not an ordered `Suspend` action.

## Seam: place-as-cost with detachPermanentTop on a bare permanent (lane 27, BT17-098)

`engine/effects/interpreter/costs.ts` `payCost`, routed place-as-cost branch:
`resolvePermanentTargets(ctx, cost.target)` does not require
`permanent.stack.length > 0` when `detachPermanentTop` is true, so a bare
host's only card goes to security and the permanent leaves (Q2892 says the
cost is illegal). Retained as `it.fails` in BT17-098.test.ts. Priority 5 for
the engine lane; likely shared with BT16-056, BT20-052, BT20-055, BT9-044,
EX11-041.

## Correction: ST24-13 is a legitimate [Marcus Damon] (lane 27)

`STATIC_NAME_ALIASES_BY_CARD_ID["ST24-13"]` makes "Marcus Damon & Thomas H.
Norstein" an exact `[Marcus Damon]` and `[Thomas H. Norstein]`. Only AD1-021
is a substring collision. My earlier note listing ST24-13 as a collision was
wrong; BT17-037 uses AD1-021 for its negative (checked).

## Possible engine issue: option bounce does not return a permanent (lanes 25, 66, 24)

BT15-090 Fox Fire (and BT6-098) played as an Option leaves the hand, spends
memory, but never returns the target Digimon: no decision raised, card ends in
no zone. Seen by BT17-092 (Q2876 bounce), BT17-100 (Q2898), and flagged by
BT17-025. Not retained as a red on any card since it is not that card's claim.
Engine lane should investigate the play-Option-with-return path after the five
prioritised seams.

## Seam: Tamer-in-stack [Your Turn] +DP not conferred (lane 33, BT17-014)

`GameEngine.runContinuousPass` does not apply a Tamer digivolution card's
`[Your Turn]` inherited +DP to the host (Aldamon stays 8000, expected 10000).
BT7-014 confirms Digimon-source [Your Turn] +DP works in-harness, so the gap
is Tamer-in-stack conferral. Retained as it.fails in BT17-014.test.ts.
Priority 6 for the engine lane.

## Route-name namesExact needs a shared runtime override (lane 36, BT17-023)

Modules now declaring `namesExact` on digivolution routes (011, 012, 023, and
any later ones) may need an `ALTERNATE_DIGIVOLUTION_OVERRIDES` entry in
`packages/shared/src/effects/data.ts` for the runtime to honour it, like
BT18-101. Coordinator: verify at the effects:sync gate that the persisted
route matcher is exact, not just that the module compiles. If sync alone does
not carry it, this is a shared-package task for a dedicated lane.

## Peer under-authoring to reconcile (lane 37, BT17-026)

EX7-022 prints the same "can't suspend until the end of their turn" but is
authored without `blocksCombatSuspend` and only tests `beSuspended`. Out of BT17
scope; record for a cross-set follow-up. BT17-026 fixed in-lane.

## Seam: selfTopHasText reads only the top card (lane 42, BT17-036)

"If this Digimon has [Pulsemon] in its text" is whole-Digimon text (manual
§1/§4-22), but `interpreter/matching/permanent.ts` `selfTopMatchesText` reads
only the top card, so an inherited effect under a non-Pulsemon top card is
wrongly gated off. Same archetype as BT17-034. Retained as it.fails in
BT17-036.test.ts. Priority 7 for the engine lane.
- BT17-038 effectText: "[Plug-In] in its name in its name" (doubled phrase).

## Seam: your-hand add subtrigger never fires (lane 39, BT17-028)

`whenEffectAddsToHand` (your-hand bus) never fires while its opponent-hand
twin `whenEffectAddsToOpponentHand` does; both share one oncePerTurnKey.
BT17-028 is the only card wiring both directions. Seam:
`engine/effects/subtriggers.ts` subscribe/fire, fire site `primitives.ts:680`.
Retained as it.fails in BT17-028.test.ts. Priority 8 for the engine lane.

## Seam: DigiXros trash grant ledger unread by validateDigiXros (lane 48, BT17-057)

`actions/digiXros.ts` `validateDigiXros` trashMax gate reads only
`DIGIXROS_TRASH_NAME_ALLOWANCES` and `wouldBePlayedAllowDigiXrosMaterialsFromTrash`;
it never reads the per-seat `expandDigiXrosZones` ledger that BT17-057's Static
`digixrosFromTrash` grant sets (read only on the effect-driven play.ts:645
path). Q2811 material-from-trash refused. Retained as it.fails in
BT17-057.test.ts. Priority 9 for the engine lane.

## Seam: modal placement not gated as a cost (lane 46, BT17-050 Q2803)

`modal.ts canAttemptModalAction` + payMemory: with no Lv5+ host the modal
still activates and charges memory, placing nothing. Related to the runAction
"single optional prompt covers cost+effect" seam (Q2804, empty option index
filtered out). Retained as it.fails x2 in BT17-050.test.ts. Fold into the
runAction.ts pay-then-may engine work (priority 4).

## Minor consistency: BT17-059 [Doomsday Clock] cost still match:"name" (lane 49)

Bracketed `[Doomsday Clock]` (no "in its name") would be `nameExact` under the
set rule, but only BT17-100 bears the name so it is behaviour-neutral. Left as
substring by the lane. Fold into the namesExact consistency pass if one runs;
not worth reopening on its own.
- BT17-067 inheritedEffectText: "alevel" (missing space, should be "a level").

## Seam: no Digi-Egg deck concept (lane 57, BT17-077 Q2847)

The interpreter has no egg-deck concept, so `Return { to: "deckBottom" }`
routes a Digi-Egg to the main deck; Q2847 (egg to bottom of egg deck) is
untestable and fixture rules forbid a Digi-Egg in trash. Documented seam, no
red. Low priority for the engine lane (broad engine feature, not a BT17 bug).

## Shared-override defect: BT17-078 DNA recipe substring (lane 58)

`DNA_DIGIVOLUTION_REQUIREMENT_OVERRIDES["BT17-078"]` in
`packages/shared/src/effects/data.ts` stores `[WarGreymon]`/`[MetalGarurumon]`
as substring `names`, admitting BlackWarGreymon and X-Antibody variants at
cost 0. Fix = `namesExact` (BT13-059 precedent). Shared file (coordinator/shared
lane). Retained as it.fails in BT17-078.test.ts. Also flagged: the shared
override lets the Main-phase dnaDigivolve verb accept the pair outside the
printed [Hand][Counter] Blast window (possible timing over-admission; no ruling
forbids, left as a flag). Priority: shared-package lane after card lanes.

## Shared bug (lane 63): parsedStaticNameAliases emits spurious "Rule" alias

`effectiveNames.ts` `parsedStaticNameAliases` bracket-scans `[Rule] Name:` and
emits a spurious `"Rule"` alias. Harmless today but real. Fold into the shared
effectiveNames work (same file as the Q2868 static-alias seam).

## Resolved: BT17-044 [Eosmon] cost reduction is not a defect

The clause is `isSelfRef` — it reduces only when BT17-044 is the Digimon that
digivolves. A comparative test proves the [Eosmon] digivolve costs 2 from a
plain Morphomon control and 1 from BT17-044. Lane 20's full-cost observation
on BT17-074 was correct behaviour (BT17-044 not the active digivolver). No
BT17-074 change needed. BT17-044 stays 8/10, now 9 tests.

## Decision (session 3): pay-then-may is hand-authored per ruling

E1 could not close Q2853/Q2813/Q2804 from the engine alone. Decision: add an
explicit `payCostBeforeOptional` flag on the IR action base (shared), honoured by
`runActionInner`, and set it only on modules whose Q&A states the cost is paid
before the optional effect (BT17-059, BT17-080; BT17-050 moves its placement
into the modal `cost`). No generator-wide change: rulings differ per card and a
blanket rule would force payment on genuinely optional `upTo` costs (BT17-041).
Owner: engine lane E2 (granted `packages/shared/src/effects/ir/**` for the flag
and the three card modules). See PAY-THEN-MAY-MECHANISM.md.

## Production behaviour change (lane S, Q2868)

Exact-name gates now refuse substring-only alias cards (EX4-030, EX12-041,
P-141, EX5-030, BT14-052, EX5-046, BT22-014, BT9-068, BT11-054, BT14-097,
EX4-048, EX4-072). Exact aliases unchanged. Client twin in
`apps/web/src/game/boardModel.ts:644` must read the exact channel (web lane).

## Seam: intrinsicPossible does not preflight CostGatedBlock inner Digivolve (lane S, BT17-085)

`engine/effects/interpreter/effect.ts` `canActivateEffect` -> `intrinsicPossible`
lets Rika's [Main] activate with no legal [Sakuyamon], pays the place cost, then
fizzles. Same family as Q2803/Q2804. Forwarded to E2.

## Decision (session 3): BT17-032 [Rika Nonaka] nameExact stands

Bracketed name without "in its name" is exact under the set rule; behaviour-neutral today (no substring peer exists) but keeps the IR consistent with the exact-name convention.

## Note (session 3): unimported cross-set fixtures

Tests register modules only by explicit import; an unimported card keeps its catalog definition (name, traits, colour, level) but has no effects. Name/trait discrimination against such a peer is still valid; any test that relies on the peer EFFECT must import it (BT17-035 P-146 case). Not swept set-wide this session; flagged for a follow-up sweep.

## Seam: inherited Partition specifier read from top card only (P3, BT17-097 Q2889)

`engine/effects/primitives.ts` `partitionCandidates` (~3715): `hasKeyword` passes through the inherited grant but `partitionSpecOf(perm.topCard.cardId)` is undefined for a non-Partition top card, so the play-back is skipped. Forwarded to E2.

## Fixture fact: `state.memory` is turn-player-relative

Two "engine gap" claims (BT17-092 / BT15-090 bounce) were fixture bugs: the non-turn seat needs its affordable memory set from its own perspective. Added to the brief.

## Decision (session 3): BT17-036 whole-Digimon text test is an authoring error

comprehensive.md §4-23-2 uses this exact shape as its example: a Digimon does not gain a digivolution card's text, so "has [Pulsemon] in its text" reads the top card only. The engine is correct; the retained red is rewritten to assert the unsuspend does NOT happen with Pulsemon only underneath (see WHOLE-DIGIMON-TEXT-MECHANISM.md). BT17-034 comparative proof stands.
