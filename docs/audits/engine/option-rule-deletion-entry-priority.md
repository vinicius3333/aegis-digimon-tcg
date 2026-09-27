# Option rule-deletion and entry priority

Discord report `1553619008077430804` was matched against read-only Oracle application
logs for match `ac76720f-b004-416f-be95-3bbeac02d049`, room `_OCTzg-HN`, on
2026-09-27. The server file is
`/opt/aegis-rollout/logs/api-2026-09-27-a011d6d2-d535-43fc-9997-07fc7ab54a87.jsonl`.
Raw logs stay outside the repository.

At 04:05 UTC, event 391 activates BT8-109 Flame Hellscythe, event 393 plays
BT1-060 MagnaAngemon, event 402 activates the opponent's BT15-036 Wizardmon
On Deletion, and event 406 finally activates MagnaAngemon's On Play. These exact
card IDs establish that the report's “death scythe” means Flame Hellscythe.

Catalog contracts: BT8-109 first gives an opposing Digimon -6000 DP, then may
play a purple/yellow Digimon with at most 6000 DP from trash without paying.
BT1-060 recovers one card On Play. BT15-036 may pay a top/bottom security trash
cost On Deletion to give an opposing Digimon -6000 DP. Local KB BT8-109 errata
(2022-05-27) confirms revival is optional; BT1-060 Q919 concerns its inherited
DP effect and does not change entry timing. BT15-036 has no card-specific KB Q&A.

The controlling rule is CR §15-4-3-2/3: effects triggered during one resolving
effect and its rule check are simultaneous. Under §15-4-3-5-1/2 the turn player's
pending effects activate before the non-turn player's. §17-1-2-2 retains the
existing prohibition on a state-based sweep between clauses of one effect.
See `data/kb/rules/comprehensive.md` around lines 1983–2015 and 3423.

Root cause: the Option completion seam resolved rule deletions while
`optionResolutionDepth` was still positive. The pending-pool collector deliberately
hides printed On Play effects until the Option completes its post-use routing.
Consequently a complete opponent deletion window resolved before the existing
entry queue was made visible. The fix collects rule movements/reactions first,
then drains those reactions and the already pending entry effects in one resolver
window. It preserves rule movement timing, post-use routing, source residency,
optional revival and turn-player priority. No card module or registration changed.

`hellscythePriority.test.ts` first failed with observed order
`[BT2-070, BT1-060]` instead of `[BT1-060, BT2-070]`. Coverage includes both turn
seats, a neutral Tapirmon comparative case, declined revival (deletion still
resolves), the exact Wizardmon/MagnaAngemon arena, and Security activation where
the attacking turn player's deletion correctly precedes the defender's recovery.

The selectable arena scenario is
`/dev/arena?scenario=arena-hellscythe-onplay-priority`. Bilingual notes instruct
playing Hellscythe, reducing Wizardmon, and reviving MagnaAngemon. Its integration
test starts the actual turn loop and proves recovery, paid opposing security cost,
Wizardmon's final zone, and the two effects' activation order.

Focused verification: nine files / 80 tests passed, covering rule processing,
Option use, Arts Digivolve pending On Play, Chapter 15 timing, cross-card timing,
and all three involved cards. The full engine run passed 8,942 tests with three
pre-existing failures: BT14-083 top-source trash in `mechanic.test.ts`,
`state/syncedArrayMutators.guard.test.ts` (plain-array splice in state/access.ts),
and `state/mutationSeam.guard.test.ts` (the existing Kotone scenario's raw security
clear in devScenario.ts). This scenario uses the mutation seam. The final additional
Security regression passed in the focused run. This is bounded bug evidence, not
collection certification.

Workspace typecheck, scoped Oxlint/Oxfmt, and `git diff --check` passed. Coordinator
review found the production change appropriately scoped. The coordinator will
replace the older Kotone scenario's raw mutation during integration.

## Deeper priority investigation

The first fix was deliberately limited to an Option's final rule-check boundary.
A subsequent adversarial audit found five additional reproducible failures; the
existing green suites did not cover these combinations:

1. **Ordinary Digimon effects:** public evolution BT2-038 → BT9-041 plays
   BT17-087 Marcus and reduces an opposing BT2-070 Tapirmon to 0 DP. The old
   `resolutionDeps.ruleProcess` opened a complete deletion window before the
   parent resolver recollected Marcus's pending On Play. Observed order was
   Tapirmon → Marcus, rather than Marcus → Tapirmon.
2. **Explicit Delete followed by play:** public use of BT4-100 Trident Revolver
   deletes Tapirmon and plays Marcus. Explicit deletions use a different deferred
   queue; its flush ran while the Option still concealed its entry effects.
   The same incorrect Tapirmon → Marcus order survived the first fix.
3. **Multiple deletions within one effect:** an actual attack checks Hellscythe,
   which plays BT17-061 Goblimon on the defender's side. Goblimon deletes its own
   Tapirmon as a cost and the attacker's Tapirmon as its effect. FIFO flushing
   resolved the defender's physically earlier deletion first, contrary to the
   attacking turn player's priority within this simultaneous batch.
4. **An Option orders an attack:** EX5-068 Flashy Boss Punch reduces Tapirmon
   and orders BT1-035 Leomon to attack. The existing interruption paused effect
   depth but retained Option depth. The rule deletion and Tapirmon's draw happened
   after the security check. They now complete before Counter Timing/security.

5. **Security removal with entry effects:** EX6-030 Dominimon plays BT1-060
   MagnaAngemon from security while the opponent controls BT16-013 Valkyrimon.
   The old security-removal flush ran Valkyrimon separately, deleting MagnaAngemon
   before its On Play could recover. That snapshot now joins the same derived
   batch, so the turn player's recovery resolves before the opponent's deletion.
   Attack-cost security removal still joins the attack pool first, before the
   general deferred flush, preserving its existing chosen-order regression.

Rules examined: CR §15-4-3-2/3 and §15-4-3-5 govern simultaneous grouping and
ownership; §15-4-5-2/3 requires an entire newly derived batch to finish before
older pending effects, even when the new effects belong to the non-turn player;
§15-4-4-3/4 retires pending effects whose source leaves or loses that effect;
§11-1-4/5 prevents progressing to the next attack timing with unresolved effects.
§17-1-2-2 and EX8-062 Q3950/Q3951 retain the existing rule that DP deletion waits
until the whole effect body finishes. EX11-059 Q5913 explicitly confirms that
Reina's DNA movement invalidates a deleted card's still-pending effect. These are
local primary-source KB citations, not timing inferred from an older simulator.

The resolver already tracks derived activation tiers. The error was in its
engine adapters opening separate windows before supplying all sibling reactions.
The fix collects rule reactions and deferred ordinary deletion reactions into
that resolver's pending batch. The deferred deletion collector merges the batch,
retains Ascension, transient token sources, deletion watchers and battle-win
watchers, and keeps source-residency checks. A nested flush still isolates older
parent effects. Once-per-turn watcher identities are deduplicated across the
bus/pool representations; non-OPT occurrences remain distinct. Before an
Option-directed attack proceeds, the existing watcher tier drains first, then
Option suppression is paused and its rule reactions/printed effects drain.
Both depth counters are restored when the interrupted body resumes.

A focused compatibility probe caught a new integration hazard during development:
`securityCheck.ts` intentionally overrides the ordinary effect collector. Its
snapshot initially omitted the new local reaction pool. A public Tapirmon attack
against a defender carrying BT25-040's inherited security-removal DP reduction
proved the lost On Deletion reaction. The specialized collectors now explicitly
retain that pool, and the reaction is retired when it begins resolution.

Proof in `derivedTriggerPriority.test.ts` uses real registered cards and public
play/digivolve/attack intents. Beyond the five failures, a Cool Boy scenario proves
Marcus → opposing Tapirmon both finish before the older own Cool Boy watcher;
turn-player priority does not pull the older effect ahead of a new opposing one.
Four tests start the actual companion arena turn loops. All eight original
adversarial/scenario tests failed when only the six new production files were
restored to commit d54b04cd9, then passed after byte-for-byte restoration. The
ninth test protects the specialized security-check compatibility path.

Companion scenarios, each with bilingual instructions:

- `/dev/arena?scenario=arena-rizegreymon-derived-priority`
- `/dev/arena?scenario=arena-trident-derived-priority`
- `/dev/arena?scenario=arena-flashy-attack-priority`
- `/dev/arena?scenario=arena-dominimon-security-priority`

The Heat Viper regression now tests both legal orders: choosing Piedmon first
activates its watcher once; choosing Reina first DNA-evolves over Piedmon and
invalidates its pending field effect. The earlier assertion that Piedmon must
always activate was incompatible with source residency. Ascension tests retain
both behavioral outcomes and choose the offered semantic timing instead of
assuming the old ad hoc synthetic key prefix. Replacement decisions, deletion
movement and effect-cost payment remain in their existing seams; this change
reorders ordinary pending activation, not those interruptive decisions.

This is a bounded investigation of the reproduced paths and their direct queue
siblings. It does not certify every card or all possible timing combinations.
Security-removal watchers have their own adapter, and attack interruption remains
a sensitive boundary; the focused compatibility and existing ordering suites are
regressions for those boundaries, not evidence of universal correctness.

Independent read-only review by the Mirage lane found no remaining blocker in the
final reaction collectors, source revalidation, deduplication or depth restoration.
Its Dominimon counterexample was reproduced red and fixed before completion.

Final deeper verification: 8,993 tests passed across the full engine, audit-layout
and six affected card suites (435 files total); only the same three named baseline
failures remain. All eleven new adversarial/arena/compatibility tests passed.
Workspace typecheck, scoped formatting and diff checks passed. Scoped lint has no
errors; the existing conditional assertion in the earlier arena regression still
emits its pre-existing warning. No debug instrumentation remains.

### Integrated live-browser verification (2026-09-27)

The integration worktree ran the real API on port 2570 and Vite on port 5174.
Headless Chromium exercised the four companion arenas through normal UI decisions.
The local application event stream independently confirmed:

- Trident Revolver: match `98344e70-044c-445a-b091-956e705495d8`, Marcus
  On Play sequence 25, then Tapirmon On Deletion sequence 29.
- RizeGreymon X: match `73cbd87f-3e81-4ff5-b1aa-b0cf444c0f5a`, Rize 17,
  Marcus 26, Tapirmon 30, then the older Cool Boy trigger 35.
- Flashy Boss Punch: match `e17d0935-a9ab-4533-8af3-9a56e90f207c`, Tapirmon
  On Deletion 22 precedes securityChecked 29.
- Dominimon: match `111f5d70-755b-4dda-a0a9-4e73a41b3796`, MagnaAngemon
  On Play 24 precedes Valkyrimon 30. Declining Dominimon's protection completes
  the deletion after recovery; the player retains one security card.

All four flows returned to an enabled End phase control. Integrated engine,
BT16/EX3/EX7 collections, selected hidden-hand regressions and audit layout checks
reported 11,001 passing tests and four previously reproduced baseline failures:
BT14-083 top-source trashing, the synchronized-array guard on access.ts, and
persisted IR metadata for BT16-069/BT16-085. Workspace typecheck passed. The web
hidden-selection suite passed all three tests; the earlier full web run had 1,903
passing tests, one baseline targetDecision scenario failure, and two baseline
jsdom pointer-capture errors in NarrationStack. No claim of a fully green baseline
is made.

## Phase-boundary follow-up (2026-09-27)

`phaseBoundaryDerivedPriority.test.ts` extends the regression proof to actual
`runOneTurn()` boundaries with existing registered cards:

- At Start of Your Turn, BT11-012 deletes itself. Opposing EX10-058 reacts and
  plays BT4-079, whose On Play completes before the older BT11-094 start-turn
  memory effect resumes. New derived effects take precedence even when they
  belong to the non-turn player.
- At End of Opponent's Turn, BT16-010 deletes itself as cost and deletes BT2-070.
  The turn player's Tapirmon On Deletion resolves before the non-turn player's
  Helloogarmon On Deletion, although Helloogarmon was deleted first.

Both passed on integration `eef28b4ba`; no additional production defect was
reproduced in these phase-boundary paths. The focused security/check and Barrier
regressions were also exercised. The `resolvingBarrierSecurityCost` exception
remains a distinct coverage boundary: existing Barrier tests prove survival and
loss of the inherited Barrier source, but do not by themselves prove every
mixed-owner security-removal watcher ordering during the replacement cost.
That is a missing combinatorial test, not a confirmed priority defect.

## Pending third-party deletion watcher source residency

A further public-intent reproduction on integration `eef28b4ba` found that Heat Viper sacrificing the turn player's EX4-050 ShadowSeraphimon and deleting the opponent's BT2-070 Tapirmon queued BT19-075 MoonMillenniummon's field watcher. ShadowSeraphimon correctly resolved first, recovered from four to five security, and deleted Moon with -20000 DP. The frozen Moon watcher nevertheless activated from trash and reduced security to four. CR 15-4-4-3/4 requires its pending battlefield effect to disappear when its source leaves or loses that role.

`armedAsPendingCollected` now checks current source residency/role for third-party `onDeletionOf` watchers before activation, retaining the original event snapshot. A failed check stays failed for that collected entry. This is intentionally scoped: self/granted On Deletion (BT15-039), printed/inherited On Deletion, Ascension, whenLeavesPlay, and the exact discarded-inherited-source proof keep their existing transition contracts. An initial overly broad guard failed BT15-039's granted self-deletion control; the scoped implementation passes it.

`pendingWatcherSourceResidency.test.ts` proves both boundaries using actual cards and `playCard`: Moon dies and cannot trash security (five remain), or survives -12000 DP and still trashes security (two remain). Its integrated `arena-moon-pending-source-deleted` case also proves Tapirmon's legitimate On Deletion draws after its own source leaves.

Validation: the initial broad engine run passed 8958 tests with only the established BT14-083 source-order and plain-array `ordered.splice` baseline failures. The final scoped guard passes focused residency, BT15-039, EX3-013, BT26-055/AD1-025 whenLeavesPlay and Ascension controls (53 tests), plus Moon, derived-priority and watcher seam regressions. Full workspace typecheck passed. Scoped lint/format and whitespace checks pass apart from existing style warnings in the unchanged parts of subTriggers.ts. No live-server writes or deployment occurred.

### Follow-up: distinct deletion occurrences after declining an OPT (2026-09-27)

The bounded adversarial pass against integrated `eef28b4ba` reproduced another
public-intent defect. Heat Viper deletes the player's ShadowSeraphimon EX4-050 and
an opposing Tapirmon. Resolve Piedmon EX8-062 first and decline its optional play.
ShadowSeraphimon subsequently recovers security and reduces a surviving Titamon to
zero DP. That later rule deletion must trigger the still-unused Piedmon effect
again; the baseline offered it only once for the entire chain.

CR §15-5-1/-2 distinguishes a new trigger from multiple simultaneous subjects;
§15-4-5 treats the deletion caused by ShadowSeraphimon as a derived triggering;
§15-14-1-1/-2/-4 counts chosen activations, rather than declined optional uses,
against the turn budget. EX8-062 Q3950/Q3951 additionally establish the rule-deletion
checkpoint after the DP-reducing body. Heat Viper's own multiple deletions remain
one simultaneous batch, not extra opportunities to reconsider the same OPT.

The previous pending adapter deduplicated every OPT using only its source/effect
identity, including older entries retained by the parent resolver. The resolver's
resolved/declined identity also lacked an occurrence discriminator. Deletion and
leave watcher consumption now identifies the deleted permanent; captured deletion
watchers carry that stable occurrence into the resolver. This does not change the
per-turn use key. The deletion/rule collectors collapse simultaneous OPT subjects
before collecting the batch, preserving the single-offer boundary. IDs are captured
from the event, never regenerated on collection or continuous recomputation.

`declinedDeletionWatcher.test.ts` proves through actual cards and public intents:

- Decline Piedmon, then ShadowSeraphimon causes another deletion: two offers.
- Heat Viper deletes its own cost plus two opposing Digimon: one declined offer.
- Accept the first Piedmon offer: no second offer after the derived deletion.
- Selectable `arena-piedmon-declined-opt`: decline the first offer, accept the second,
  and successfully play the NSo card. Bilingual arena instructions specify the order.

`optionDnaAttackPriority.test.ts` closes the other focused hypothesis without a
production change: Beastly Storm Dance of Affection BT16-091 DNA digivolves into
Dinobeemon BT16-077, whose pending When Digivolving resolves before the defending
Analogman BT11-092 watcher. Its played Aquilamon cannot start a nested attack
(Q2664). The second `attackDeclared` event is Analogman's redirect publication of
the existing attack, not a second attack. The System-A/System-B comment describes
the combat fallback; the public engine's combined attack timing path is used here.

Validation: reverting only the seven production seams reproduced the missing
Piedmon offer; restoring them passed the focused controls. The whole engine plus
BT15-039, EX8-062 and BT19-075 suites reported 8,990 passing tests across 435 files,
with only the known BT14-083 mechanic and synchronized-array guard failures.
Workspace typecheck passed. Independent read-only review by the Vikemon lane found
no blocker and independently passed 63 tests covering the OPT controls, resolver,
BT19-075 and derived priority cases. This verifies the bounded occurrence fix; it
does not certify every event family, replacement combination or timing path.

### Combined follow-up verification

Both follow-up fixes were integrated with the turn-boundary probes and verified
through the real browser/API on ports 5174/2570. Moon arena match
`bd3e5f0e-22b6-45b4-9845-f8611764e79d` retained five security cards and returned
to Main after ShadowSeraphimon and Tapirmon resolved, without Moon's stale watcher.
Piedmon arena match `cf3d72fb-8ed5-450d-9ed6-5c591e0077ea` offered optional
requests `dec-4` and `dec-5`: explicitly declining the first, accepting the second,
then finishing Gazimon's entry-card ordering returned to an enabled End phase.

The combined engine, affected collections/cards and audit-layout suite passed
11,026 tests. Only the four previously confirmed baseline failures remained
(BT14-083 top-source trash, access.ts synchronized-array guard, BT16-069/085
persisted metadata). Workspace typecheck and diff check passed. The two new fixes
also received independent review. These results cover the named reproductions
and controls, not an exhaustive certification of all priority combinations.

### Browser follow-up: resolution-plan presets on collected watchers

Live browser verification of `arena-piedmon-declined-opt` found that selecting
Piedmon with the ordering control's **No** preset still opened its optional modal.
This was separate from the previously verified explicit **Ask / Don't use** path.
The public-intent regression in `declinedDeletionWatcher.test.ts` reproduced it:
Titamon remained alive because the extra first-occurrence modal paused resolution.

The stack correctly copied the resolution-plan preset into its effect context,
but `armedAsPendingCollected` discarded it when invoking the armed watcher's
separate context. Forwarding the preset alone exposed a second defect: the plan's
key identified only the printed effect, so the later deletion occurrence silently
inherited **No**, and no second optional prompt appeared. The same test was red
at both checkpoints, with distinct assertions for each failure.

The adapter now forwards the preset, including `false`. `triggerKeyOf` adds the
already-captured occurrence discriminator when available, and the ordering prompt
uses that same helper. Existing keys without occurrence data retain their exact
format. Announcements and per-turn usage identity are unchanged. The regression
submits a real ordering response with **No**, verifies that ShadowSeraphimon has
already killed Titamon, then accepts the one new Piedmon optional prompt and
successfully plays from trash. No preset from the previous occurrence leaks into
that decision.

The complete patch passed 111 tests in 10 focused suites: decisions, effect stack,
Piedmon occurrences, watcher residency and derived priorities. API typecheck and
scoped lint/format/diff checks passed. The existing Piedmon arena covers the same
flow; no additional production card or scenario was needed.
