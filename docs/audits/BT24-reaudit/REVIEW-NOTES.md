# BT24 coordinator review notes

## Resume contract

User requests full audit with Luna subagents. Three worker slots available. Card work stays isolated by card; engine work must be serialized. Coordinator owns ledger, shared data, integration gates and commits.

## Evidence reconciliation

All 102 reports exist but ledger is stale. Existing ledger script expects separate score columns, while this ledger stores a combined score expression; do not run it unchanged because it would corrupt evidence links. Reconcile the schema before automated updates.

Resolved: ledger now has separate rubric columns and retains all existing evidence links and provisional scores.

## Sonic Shot evidence gap

BT24-095 still proves Security and Q5701 with injected timing and its linked OPT with a direct private fireTiming call. The breeding color-waiver test ends with settle(predicate) without an explicit suspension assertion. Full 8/10 behavioral claim is not accepted until natural public origins, endpoint assertions, and next-turn OPT reset are demonstrated. Queue a card lane after the initial three return.

Resolved on 2026-09-08: root acceptance rerun passed 11 tests. New public Security/Q5701, Q5698 Digimon-effect provenance, Q5699 Option prohibition versus legal Link, same-source public OPT/reset, two natural opponent Active phases and exact +2000 Link DP prove the previously missing clauses. Legacy injected probe remains supplemental only. Provisional evidence is 8/10, delivery 0. Full-tree typecheck currently fails in sibling 003/006 test type narrowing, returned to that lane.

## Additional acceptance findings

- BT24-001 focused rerun passes 10 tests. Public legal breeding evolution now asserts both costs. Report overstates same-turn suppression in its public reset scenario (one attack per owner turn); require correction before full behavior acceptance.
- BT24-003 added seat-negative test also has no eligible Shaman, so it does not isolate seat gating. It injects timing and cannot earn behavioral credit. Public P-194 source stacks need a legal level-3 intermediary. Returned for correction.
- BT24-072 deletion case calls the direct delete primitive and ends at settle with no assertion. Queue public-origin and endpoint correction.
- BT24-081 alternate revival and BT24-084 Security tests also end at settle without explicit final assertions. Queue full public-origin review.
- BT24-018 report itself acknowledges unsuspend only through injected timing; required natural suspended-host evolution, public security-removal OPT/reset and leave-replacement proof remain to review.
- BT24-019 has public paid routes but only observes Jamming keyword; require actual security battle and exact evolved stacks/draws, plus illegal source.
- BT24-028 free evolution and inherited play are injected; free evolution ends at memory-only assertion after settle. Require natural Active-phase evolution, public attack source play/reset, placement entry/refusal/boundaries and actual battle protection/expiry.

## Rejected worker engine claims

021's new expected-failure report repeated the earlier frequency false alarm: the actual public fixture was 072→072, not the claimed 010→072→P-209 chain, and lacked an owner deck for the later turn. Correcting the fixture made suppression/reset green without engine edits. A subsequent bonus-draw assertion encountered P-209's real mandatory When Digivolving discard; that cost must be represented, not mistaken for a missing draw. Expected-failure tests require the first failing assertion and a legal first transition before engine escalation.

BT24-002 worker changed Q5575 to expected-failure with a final unsuspended assertion even though the trailing attack should suspend the host. Its reset fixture relied on pre-Active suspension and did not attack/pay on both turns. Both were returned as fixture corrections; neither currently establishes an engine defect. Never weaken a valid expected result or classify an incomplete fixture as an engine seam.

## Collection fixture sweep

Restart static sweep found illegal Digi-Egg deck/security placeholders in BT24-005, 008, 009, 060, 062, 065, 068, 074 and 080. BT24-014 still uses numeric security fixtures. These must be corrected in their individual card lanes and rerun before delivery; a green collection run does not certify fixture validity.

Priority queue after active cards: 001 acceptance correction, 003 acceptance correction, 005, 008, 009, 014, 060, 062, 065, 068, 074, 080, 072, 081, 084, 018, 019, 028, then all remaining card evidence reconciliation. Each dispatch owns only one card at a time.

## Accepted resumed evidence

001, 003, 006, 008 and 095 now carry provisional 8/10 after independent focused runs and review of corrected public assertions. Delivery remains zero. The two earlier 003/006 type-narrowing errors and duplicate001 import were corrected; a fresh API typecheck is running.

005: coordinator's proposed double-MindLink fixture was invalid because an existing Tamer prevents a second MindLink. This is not a production defect. Fresh Luna card lane is replacing it with public MindLink plus 055's separate printed hand-placement cost, and real turn-loop reset.

009: valid public discard can evolve013 into072, whose own evolution discard causes another009 evolution intoP209 before the first effect finishes. A fresh serialized Luna engine lane is reproducing and checking inherited OPT reentrancy. No production defect is considered closed without the corrected full public test and mechanism regression.

009 hypothesis rejected:013 itself supplies another inherited evolution-on-discard effect after evolving into072. Replacing the initial host with010 isolates009; 16 focused tests pass without an engine change. Remaining009 public refusal and paid evolution/draw proof are assigned to the same Luna lane. The previous reentrancy description was a hypothesis, not a confirmed defect.

Runtime counting scan: current `countMatching` defaults ordinary effects to battle area and includes breeding only explicitly. The older brief's warning that unspecified conditions always count breeding is stale for this HEAD; read runtime before proposing zone changes. No change is warranted solely by the absence of an explicit battleArea filter.

## Medusamon continuation

## Next focused corrections

Confirmed production issue054: ordinary Filter does not define `namesExact`; two malformed fields (Shuu trigger and Hisyaryumon target) were silently ignored under ts-nocheck. Luna is correcting054 to supported `nameOrTrait`/`nameExact`, with specific public negative/positive regressions. No engine widening is required. Static follow-up candidates with the same invalid ordinary-filter spelling:028,035,042,045,052,055. Requirement-level `namesExact` is valid and must not be mechanically replaced.055 is assigned next; remaining candidates must receive individual card regressions.

Resolved name-filter batch:61fb8d6ec corrects028/035/042/045/052/054/055 and their persisted records. Root focused acceptance (seven cards plus catalog sync) passed178 tests.75b0b5adf subsequently replaces028's wrong-level negative with catalog-verified ST2-11. ff99dde6a restores086's official rule identity; shared alias9tests and005/054/055/08642tests pass. No engine change belongs to these fixes.

## Remaining typed-IR census

Further exact-name review against catalog text: 009/013/021/026 specify exact `[Titamon]` OR Titan trait, 014 exact Aegiomon Decode, 016 exact Owen/Dimetromon/Elizamon, 025 exact Venusmon, and 023/027 exact reciprocal Decode. Their substring `match: "name"` fields need bounded lane corrections (021/023 underway). Do not mechanically change 065's departing-Diaboromon name substring, 074's Seadramon substring, or 084/101's Aegiochusmon substring: those are explicitly printed "in name". Current Titamon suffix cards also have Titan, so exact-name corrections may be forward-looking for the current catalog; do not fabricate a distinguishing existing card.

015/039 `withoutBattle` is absent from PlayWithoutCost typing, but securityCheck.ts resolves battle only while the exact checked card remains loose (`stillChecked`). Successful security play already removes it and skips battle. This is a typing/representation review candidate, not a demonstrated battle-resolution defect. Focused015/016/017 baseline: 3 files / 32 tests passed. Public frequency and complete paid-route assertions still pending.

Luna's read-only in-memory TypeScript census removed nocheck only in a custom compiler host for all102 modules and found31 diagnostics:015/039 `withoutBattle`;028 `additionalEffect`;030 `triggerCondition`;034 missing replacement `event`;037 `fromHost`;060 requirement `traitsMatchAny`;082 targets missing `filter`;089 missing `payCost`; and widened literal types in017/044/056/066/085/087/094/102. These are review candidates, not31 confirmed runtime bugs.028 additionalEffect is explicitly supported by board.ts but absent from schema: retain original nocheck until a proper schema/valid-IR solution, never hide whole actions with as-never.030 and037 are assigned for public negative proof.

## Diaboromon source-play seam

065 public hand replacement and refusal pass; public own-stack replacement remains a retained expected failure. Exact source card should enter battle but instead travels to trash with its departing host. A serialized Luna engine lane is tracing the actual candidate/play path. A speculative fallback playing ctx.source.instanceId after the host vanished was rejected and removed because it selected the wrong card and bypassed the target filter. No engine fix is accepted yet.

Hypothesis rejected after fixture inspection: the restored red used065 itself as the source, not exact Diaboromon. The printed effect cannot play Diaboromon (X Antibody). With legal BT17-059 beneath065, the exact source is played correctly. Root065+052 acceptance passed24 tests and all temporary engine patches/logging were removed. There is no confirmed engine defect from this scenario. Treat previous worker seam claims as superseded, not as a closed production fix.

Independent batch004/007/010/011/012/013 passed63 tests. Remaining concrete gaps prevent accepting historical8/10 claims:004 uses a blue Lv.3 over a green egg, injected trait boundaries, and a reset assertion that can observe the normal draw instead of inherited draw;002 still injects refusal and its egg evolution omits immediate cost/bonus draw;010 lacks actual Blocker interception/refusal and alternate-route exact stack/draw;011 likewise omits cost/draw in its inherited route and has a level-3 host over a level-4 source in the keyword fixture. Correct these in card lanes, not coordinator edits.

060 public MindLink attack failure was an unanswered explicit Alliance prompt from086, not a missing attack trigger. Luna added public response and public Q5782 simultaneous-departure cases; final independent review remains pending.

## Medusamon continuation status

Preserved local test/report changes pass the restart focused check. Full acceptance and collection gates still required.

## Qualified future-entrant DP projection gap (Q5629)

The public EX4-074 evolution followed by Minervamon play now reaches a fully
drained owner Main phase (memory 3, no pending decision). The existing Iliad
Digimon correctly reads 5000 DP; the newly played 5000-DP Iliad card reaches
trash after three De-Digivolve operations. Minervamon nevertheless retains
12000 currentDP instead of 7000. Root independently reproduced this exact
failure. New-permanent creation initializes currentDP from printed DP without
refreshing the existing player-wide modifier ledger; a serialized engine lane
corrected the entry projection and added regression proof. Root action,
primitive, modifier and card checks passed 221 tests; the full collection and
mechanism gate passed 3200 tests with a fresh shared/API/web typecheck. The
separate DNA constructor is explicitly outside this correction's proof.

Earlier results were not qualified: illegal Digi-Egg decks, incomplete turn
setup, early assertions, and Homeros's additional TS-wide +1000 DP each
confounded prior fixtures. Do not cite those as engine evidence. See
[mechanism record](PLAYER-WIDE-DP-MECHANISM.md) for the final disposition.

## SkullBaluchimon independent deletion branches

BT24-075's original IR attached the single hand-trash cost and
`abortOnDecline` to its level-3 Delete action, followed by an ungated
level-4 Delete. This accidentally made a level-3 target a prerequisite for
the entire printed clause. `effect.ts` leading-action availability and
`actions/runAction.ts` no-target cost preflight explain the observed
only-level-4 failure. Those generic guards also protect other cards and
must not be weakened for this representation error.

CR1-3-2 requires resolving the possible portions of an effect. The card
lane is using the existing typed `CostGatedBlock` to pay once and then run
the two deletions independently, for both entry triggers. Acceptance
requires an intended only-level-4 red against the original module and a
green against the new module, alongside both-target, only-level-3,
payable-refusal and no-hand controls. This finding is card-local; no shared
engine edit is authorized or required by the current evidence.

## Docmon Security timing correction

BT24-057's printed Security clause says to play it at the end of the battle.
The old direct `PlayWithoutCost` action moved the checked card into the battle
area before the security DP comparison. In securityCheck.ts, that makes
`stillChecked` false and skips the battle. The historical test used a2000-DP
attacker against4000-DP Docmon but asserted that the attacker remained a
restriction target, concealing the incorrect skipped battle.

The Luna lane reproduced the old IR against the new weak-attacker test:
`securityChecked.resolution` was `effect`, not `battle`. The corrected card
uses the existing036/ST17-13 `whenSecurityBattleEnded` subscription and plays
the exact checked instance from trash. No engine change is needed. This
matches CR13-1-8-3 and14-2-5. Root independently passed13 files /85 tests across
036,057,ST17-13,security and battle conformance; strong-attacker survival and
weak-attacker deletion now accompany Docmon's final placement. Full collection
gates and remaining public restriction expiry/route evidence are still open.
