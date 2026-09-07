# BT20 round5 integration plan

Accepted001–043 remains immutable and pushed at77d8d3e40 (43/102;430/1020). New work is provisional.

## Confirmed engine issue

BT20-058 public DigiXros -> opponent Gaia Force exposes a missing source selection. `PlayWithoutCost.fromOwnDigivolutionStack` used `matching.slice(0,cap)`, so a player never chose among multiple eligible sources. The lead now requests a bounded selection when candidates exceed the cap or the target is up-to. Named mandatory sets retain their existing behavior. The saved058-public-xros-results.json and052-076-round5-results.json show the wrong selected instance;058-source-choice-green-results.json passes with the fix. A dedicated public mechanism and read-only review are delegated. All shared changes and catalog synchronization remain lead-owned.

## Fixture corrections

052 and072/073 inherited hosts were same-level and are replaced with legal higher-level hosts.054 reversed sources are reordered.055 Q4388 now uses legal050 Lv4 -> BT24-062 Lv5 ->055 Lv6; after optional top placement the promoted MasterBlimpmon's End of Attack plays050, while refusal retains the full stack.058 has public named DigiXros sources, actual departure, Cyborg/Machine selection and refusal.071 now uses BT14-087 public Mind Link to trigger the exact6000/6001 boundary. New077–085 additions await lead execution.

BT20-051 is Lv4, not Lv5; earlier informal level labels were incorrect. Replacing051 with050 in some valid fixtures was not itself a card bug. Source-order and level checks must read the catalog rather than rely on those labels.058 can legally contain Lv6 sources via DigiXros; equal levels are a diagnostic requiring review, not automatic invalidity.

## Rejected alleged defect

BT20-069 official Bandai text agrees with catalog: Trash1, then keyword grants. It does not say By trashing. The proposed empty-hand no-grant negative was invalid and has been reverted without any production change. Official source: https://world.digimoncard.com/cards/?card_no=BT20-069&search=true .

## Next gates

Finish source-choice mechanism and regression, execute all new cards052–085, revalidate affected source-play mechanisms plus entire BT20, workspace typecheck, set-scoped check and changed-file style/diff. Renew meaningful runtime sensitivity and final clause acceptance for044 onward only after these gates, then atomic commits/push, acceptance recalculation and PR/Orca checkpoint.086–102 follow remaining public cost/timing/refusal plans; collection completion is still pending.

## Integration findings after round5 focused execution

- Confirmed BT20-083 IR activation gap: the inherited outer effect optional marker does not defer a choice into its installed SubTrigger. The nested PlayWithoutCost now owns optional activation before its suspension cost; printed mandatory play-one no longer uses upTo. Public acceptance/refusal, suspended-host inability, source-stack and battle-area exclusion are exercised.083-old-activation-results.json reproduces the old missing decision;083-activation-green-results.json passes the original fixed cases. Later complete-security assertions use securityChecked plus !isAttacking because combatResolved is emitted for Digimon battles, not all security attacks.
- Confirmed BT20-096 shared Option registration gap: a preceding isFromTrash Main clause was classified as the ordinary Option use body and lost OnDeclaration. isPlainMain now excludes isFromTrash. The direct IR additionally states from:[trash] on its self-return so the cost preflight resolves the printed loose zone. Public activation pays six from10→4 and5→−1, returns the physical Option to deck bottom, and deletes only an unsuspended opponent. Five-hand and wrong-zone/turn controls plus ordinary Main isolation are tested in optionTrashActivation.test.ts.096-public-activation-results.json passed the focused card/mechanism/101 run.
- Rejected a proposed96 negative claiming five memory cannot pay six: paying through zero is legal. No such expectation is retained.
- Replaced080 and101 artificial deletion/suspension lifecycle additions with actual public attacks/Options and real turn boundaries.080-luna-final-results.json passes8 cases;101 passes the latest focused run after resolving its actual Blocker window.
- Fixed worker fixture mistakes: omitted086Altea, invalidOptioncolors094/098, Gallantmon cost12 rather than7, Option alias lookup during transit095, and duplicate098battleArea.086 now tests both hand/trash payment, eligible refusal and no-eligible outcomes.094 imports actualBT17-077 and uses its printed reduced remaining cost.
- source-choice-old-engine-results.json proves the shared source-choice regression fails without the fix. It also reproduces the unrelated pre-existing BT22-007 standalone zero-DP OnPlay fixture failure; source-play affected checks will select relevant BT22 breeding cases and record that baseline limitation explicitly.

All001–043 remain untouched and accepted;044–102 remain provisional until final execution, sensitivity, report reconciliation, atomic push and hash-bound acceptance. Current whole-collection run is round5-collection-results.json; no completion claim is made.

## Final round5 gate

The final collection plus source-choice, trash-activation and overall-timing mechanisms pass968/968. The affected mechanism suite passes465/465;8 scoped BT22 source mechanisms pass. Full shared/API/web typecheck and the final API typecheck pass. Set-scoped sync/check reports102 synchronized records. Changed TypeScript files pass Oxfmt, Oxfmt --check and Oxlint; git diff --check is clean after removing catalog-origin trailing spaces from generated Markdown.

Final clause strengthening includes056 resident Barrier with public respondBarrier,077 actual Blast and mandatory free play plus Rush/Blocker,078 actual Training Option placements and later effect-evolution/OPT/reset plus Q4401 turn-player ordering,079 two security checks,085–090 Security and memory-start boundaries,089 public evolution-driven Mind Link/Alliance/Piercing/Barrier, and101 actual Blast/Blocker/Piercing/Vortex. Every044–102 card has meaningful restored runtime-disabled evidence. Canonical per-card reports now replace provisional worker claims and list exact current cases;095/098 authoritative errata remain explicit. Atomic delivery and final hash-bound acceptance are the remaining closeout steps.
