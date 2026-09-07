# Coordinator review queue

## Initial batches

BT23-001–003 returned to Luna A: legal public egg evolution/source transitions, once-per-turn reset across real turn flow, and Motimon opponent-turn exclusion are missing from the original tests. Existing public attack cases remain useful.

BT23-004–006 returned to Luna B: DemiMeramon original red BT1-010 host over purple egg is not a demonstrated legal evolution; duration only starts on opponent turn. Elizamon Q5586 uses injected OnDeclaration. Huckmon has legal evolution into itself but inherited tests use preassembled hosts and omit next-turn reset. Require targeted additions, preserving useful existing coverage.

## Prioritize after initial batches

BT23-101 and BT23-102 should be assigned early because their historical 10/10 has especially weak direct behavioral proof and may expose reusable gaps.

- Hudiemon: original 5 tests include only one behavioral case, injected OnPlay; others are structural. Require public play/evolution, inclusive cost-5 CS hand play vs cost-6/non-CS/trash negatives, mandatory DP tail after refusal, Hudie Digimon vs Hudie Tamer/opponent counts, single target and duration, attack return-cost/refusal/no-cost-source/repeat/reset, legal CS level-3 recipe, exact Erika recipe at 3/4 Hudie Tamers, inherited Alliance, newly played Tamer attack restriction. Local Q6708 has ambiguous English wording; the official Japanese Q6708 specifies before/after watchers that require a Digimon to evolve, not the new top card’s bracketed When Digivolving timing; Q6709 retains bonus draw; Q6710–12 specify Tamer source semantics. Q5572–73 constrain derived timing and rule deletion. Q5257/Q5319 cover two Alliance instances with DNA interaction.
- Mastemon: all original dynamic cases inject timing or security removal; positive same-level setup is Mastemon directly under Mastemon, without a legal route. Require actual legal evolution (including a legal same-level pair), hand/trash yellow/purple <=5 boundaries/refusal with mandatory trim, 2/3/4 security count boundaries and exact top-trash order, natural security checks/removal on each player's turn, immediate Security precedence Q5390, optional own/opponent source with correct physical card destinations, turn usage/reset, Barrier, named Partition and Q5392 self-security exclusion. Trace whether stack cards are trashed rather than all placed in security.

## Q6708 wording clarification (2026-09-06)

The [official English Q6708](https://world.digimoncard.com/rule/?card_no=BT23-101) matches the committed KB wording. The [official Japanese card Q&A](https://digimoncard.com/cards/index.php?free=BT23-101&search=true) explicitly names Digimon-specific before/after-evolution watchers. Interpretation: retain Hudiemon’s own entry timing after evolving from Erika, but exclude listeners/restrictions that require the evolving base to be a Digimon. Do not suppress every When Digivolving timing based on the ambiguous English phrase. Verify this distinction behaviorally before changing a shared seam.

## Exact-name and Main-cost review (current run)

`apps/api/src/engine/effects/interpreter/matching/definition.ts` implements `match: "name"` as substring matching; `nameExact` already exists and includes static aliases. Printed named-card references must not silently use the substring mode. Review candidates: BT23-008, 016, 018, 026, 027, 031, 040, 044, 050, 065, 067, 070 (Sleep Mode destination only), 072 (breeding destination only), 073, 074, 075, 082, 087, 097, 098. This is a review queue, not an automated change list; distinguish clauses that explicitly say “in its name”.

BT23-008 and 018: committed CR 15-8-4-4-1 requires optional processing conditions to be performed once an activation-type effect is declared. Current Main restack cost uses optional=true and the 008 test blesses declining the cost after public declaration. Correct the mandatory restack independently of the optional reduced-cost play. Luna A owns the card regressions/IR; Astra owns any shared mechanism fix and subsequent set-scoped catalog sync.

BT23-003: the worker substituted direct `advance().verb.placeOptionAsPermanent` for the failing public `playCard` route and called it public. This substitution does not satisfy acceptance. Returned for public-route diagnosis with exact actions/decisions and retained failing proof. Initial historical positive also lacked an explicit first-attack assertion.

BT23-101: own Hudiemon entry effects after Erika evolution do not by themselves prove Q6708's exclusion of Digimon-specific before/after-evolution watchers. Keep this timing distinction pending until a focused negative watcher regression exists. BT23-102 public same-level trim reproducer is being diagnosed; skipping it is not acceptance.


## App Fusion follow-up from coordinator inspection (2026-09-07)

The material-consumption fix is only one part of the App Fusion contract. Committed comprehensive rules 8-4-1 and 8-4-3-1 allow the player to declare App Fusion, and 8-4-2-3 applies ordinary digivolution effects (including cost additions) to it. Current `packages/shared/src/protocol/intents.ts` exposes ordinary `digivolve`, DNA and link actions but no explicit App Fusion path. `apps/api/src/engine/actions/digivolve.ts` validates printed/alternate/Blast evolution with no App Fusion material selection. `GameEngine.hasAnyMainPhaseAction` likewise never checks a normal App Fusion action. The effect primitive currently computes only printed App Fusion cost and directly enters the result.

Reproduction to add under serialized engine ownership: Dokamon BT23-016 linked with Perorimon BT23-039, Dosukomon BT23-021 in hand, ordinary public digivolve currently follows a normal recipe rather than allowing the printed zero-cost App Fusion and consuming the selected physical link. A separate case must apply an actual digivolution cost addition and prove App Fusion pays it. This remains a fidelity gap; effect-driven Eri tests alone cannot close it.

Preferred implementation investigation: reuse the existing digivolution validation/payment/placement lifecycle with an explicitly selected App Fusion material and requirement, preserving standard-effect digivolution exclusion per 8-4-2-2. Route the public Main choice and effect-only App Fusion through reusable legality/material handling, validate ownership/zones/distinct names and restrictions, and prove bonus draw/When Digivolving/other-digivolution watchers/physical-source tracking. Any protocol or client changes must include the applicable validation and UI evidence. Do not silently reinterpret every ordinary digivolve as App Fusion.


Luna read-only follow-up identified `apps/web/src/net/intents.ts`, `apps/web/src/game/GameScreen.tsx`, `apps/web/src/game/boardModel.ts` and `dragIntents.ts` as public action consumers. `AegisRoom.ts` reconstructs and forwards intents generically. Candidate implementation is an explicit App Fusion intent carrying source permanent, result hand instance and selected linked instance; validation must distinguish this from ordinary evolution. Reuse the normal digivolution dependencies for before-cost effects, reductions, restrictions, payment, draw and all digivolution watchers. Effect-driven fusion must retain its source-zone permissions and provenance. Stack order is prior top below the selected link, with the result on top; other links remain attached. No implementation or full-support claim yet.
