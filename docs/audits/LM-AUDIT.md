# LM Audit Ledger

This ledger records source and focused-proof evidence for the LM collection. A card
is not 10/10 until its focused test has been run in the authorized serial test slot,
its applicable mechanism coverage is green, and collection evidence is refreshed.

## Collection invariant — focused execution incomplete

- All 62 catalog LM modules currently have one direct `registerIrCard("LM-…")` registration,
  no module-level legacy `registerCard`, and a colocated focused test file.
- Every entry remains below 10/10 until its focused proof, relevant mechanisms, and later
  collection gate run in the authorized serial slot.

### Deferred validation checklist

- Do not start any validation while either external PGID `82901` or `97051` exists. Once both are
  absent, start the next single focused file.
- Run only one explicit card file per process, using
  `pnpm --filter @aegis/api exec vitest run src/cards/LM/LM-###.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --no-file-parallelism`; record the exact card, command, and
  result in this ledger before advancing to the next card.
- Run the applicable mechanism tests only after its focused proof is green. Run the collection
  test after all focused and applicable mechanism tests pass.
- Re-run `git diff --check`, commit any audit changes atomically, and push normally before any
  collection-complete notification. LM-029's former KB association conflict was resolved by the
  category-aware Q&A parser; it remains below 10/10 only pending the same complete validation
  evidence required of every card.

## Generated IR provenance reconciliation

- `packages/shared/src/effects/effects.json` is a historical generated aggregate; direct LM
  modules are the executable authority because each imports and registers its own compiled IR via
  `registerIrCard`. During source reconciliation, nine aggregate records were found with stale
  `RawUnparsed` actions and `coverage: "partial"` even though their direct modules register
  `coverage: "full"` with no residual: LM-009, LM-017, LM-019, LM-020, LM-026, LM-048, LM-049,
  LM-050, and LM-062.
- The stale entries correspond to clauses now covered by direct IR (respectively: Rush on
  suspension; effect-added-source reaction; leave-play replacement; Quantumon security/category
  flow; numeric deletion ceiling; alternate color requirements; and Breathing Training's Delay
  cost reduction). They are provenance discrepancies, not an authorization to preserve a second
  card registration or to treat generated metadata as executable behavior.
- This reconciliation is source-only evidence. It does not upgrade any card to 10/10; focused,
  mechanism, and collection tests remain required.

## LM-001 — Siriusmon — focused proof green; pending mechanism and collection gates

- Direct IR covers Blast Digivolve, On Play/When Digivolving stack placement, cost modification,
  DP-based deletion, and the shared once-per-turn all-turns memory watcher. Its eight focused
  cases passed 8/8 on 2026-08-26 using the authorized serialized command
  `vitest run src/cards/LM/LM-001.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --no-file-parallelism`; placement ownership, dynamic color ceiling, optionality, and deletion
  identity are proven. LM-001 remains below 10/10 pending relevant mechanism and collection gates.

## LM-002 — Jellymon — focused proof green; pending mechanism and collection gates

- Q3989/Q3990 require live hand-count re-evaluation across simultaneous copies; direct Main and
  inherited attack Draw actions each gate on hand at seven-or-fewer. Focused cases include the
  two-copy threshold and inherited-host timing. The audit independently ran the serialized
  focused command on 2026-08-26; `LM-002.test.ts` passed 1/1 file and 7/7 tests in 3.14s. LM-002
  remains below 10/10 pending relevant mechanism and collection gates.

## LM-003 — TeslaJellymon — focused proof green; pending mechanism and collection gates

- Q3991-Q3993 map to attack-time battle-deletion protection plus live ≤7 hand draw; Retaliation
  remains effect deletion rather than protected battle deletion. Focused cases cover declined and
  invalid blue costs plus Security and inherited boundaries. The authorized serialized run on
  2026-08-26 reported 7/8 passing: its Retaliation case incorrectly expected the temporary
  `beDeletedInBattle` grant to remain observable after effect deletion removed the permanent.
  The direct IR already matches Q3992 and combat resolution, so only that fixture expectation
  was corrected. Its authorized serialized re-run then passed 1/1 file and 8/8 tests in 3.23s;
  mechanism and collection gates remain pending, keeping LM-003 below 10/10.

## LM-004 — Thetismon — pending focused execution

- Direct On Play/When Digivolving unsuspend, Tamer gate, Blocker grant, and all-turns once-per-turn
  watcher map through IR; the hand-trash gate is owner-scoped by the interpreter event payload.
  Focused cases are unrun, so below 10/10.

## LM-005 — Amphimon — pending focused execution

- Q3994 supports distributed multi-target stack trash after blue hand costs; Q3995 permits stacked
  Security Attack gains across distinct attacks. Direct IR uses actual paid-count scaling and the
  no-stack return boundary; seven focused cases are unrun, so LM-005 remains below 10/10.

## LM-006 — Cthyllamon — pending focused execution

- Q3996 requires the no-source attack restriction to lapse as soon as a source is gained; direct
  IR uses a live target filter after stack trash, while the trash Main reducer records returned
  Tamer cost before payment. Existing focused cases are unrun, so below 10/10.

## LM-007 — Publimon — pending focused execution

- Q3997 requires mandatory End of Attack security movement; direct Security play and end-attack
  action map to the self-bound security primitive. Focused proof includes the mandatory boundary
  but is unrun, so LM-007 remains below 10/10.

## LM-008 — Angoramon — pending focused execution

- Direct start-main Tamer memory gate and Your Turn text-sensitive DP aura map to interpreter
  conditions; the aura evaluates the inherited host's live top-card text and owner turn. Seven
  focused cases are present but unrun, so below 10/10.

## LM-009 — Airdramon — pending focused execution

- Q3998/Q3999 require both source and destination Angoramon-text matching for suspend/cost
  replacement, and prevent post-evolution Rush from this source. Direct replacement/watcher IR
  is pay-time and self-suspension-bound. The authorized single serialized run passed 1/1 file and
  7/7 tests in 12.97s on 2026-08-26 using
  `vitest run src/cards/LM/LM-009.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-009 remains below 10/10 pending mechanism and collection gates.

## LM-010 — Chamblemon — pending focused execution

- Direct IR maps Tamer suspension/restriction and the Tamer-count-dependent all-turn DP modifier.
  The restriction is a live opponent-seat filter and the DP count includes both owners' suspended
  Tamers. LM-010 has no local KB entries; source, direct IR, and focused fixtures currently show
  no new causal implementation gap. Existing six focused cases are unrun, so LM-010 remains below
  10/10.

## LM-011 — SymbareAngoramon — pending focused execution

- Q4000 confirms the no-opponent branch grants Blocker despite no suspension target; direct IR
  keeps the clauses independent and targets any one owned Digimon; the inherited aura stays bound
  to the host. The authorized single serialized run passed 1/1 file and 6/6 tests in 3.12s on
  2026-08-26 using
  `vitest run src/cards/LM/LM-011.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-011 remains below 10/10 pending mechanism and collection gates.

## LM-012 — Lamortmon — pending focused execution

- Direct IR maps opponent suspension, no-unsuspended-opponent restriction, and once-per-turn
  security manipulation watcher. The watcher requires the host attacker to delete in battle and
  retains host/controller identity. LM-012 has no local KB entries; catalog text, direct IR, and
  focused fixtures show no new causal implementation gap. The authorized single serialized run
  passed 1/1 file and 5/5 tests in 3.38s on 2026-08-26 using
  `vitest run src/cards/LM/LM-012.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-012 remains below 10/10 pending mechanism and collection gates.

## LM-013 — Diarbbitmon — pending focused execution

- Q4001 maps to delayed end-of-opponent-turn return-top/trash-under behavior after free play of an
  Angoramon-text Digimon. Direct delayed IR binds the played permanent rather than its source;
  catalog, KB, direct IR, and focused fixtures show no new causal implementation gap. The
  authorized single serialized run passed 1/1 file and 6/6 tests in 4.40s on 2026-08-26 using
  `vitest run src/cards/LM/LM-013.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-013 remains below 10/10 pending mechanism and collection gates.

## LM-014 — Espimon — pending focused execution

- The catalog omits the icon in the On Play search clause and the historical aggregate consequently
  lacks the `<Blocker>` filter. The direct `registerIrCard` module resolves the printed card as
  `<Blocker> or Tamer`, and its focused fixtures distinguish Blocker from the inherited Draw
  keyword; this provenance discrepancy is recorded rather than repaired in generated metadata.
  The authorized single serialized run passed 1/1 file and 6/6 tests in 2.85s on 2026-08-26 using
  `vitest run src/cards/LM/LM-014.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-014 remains below 10/10 pending mechanism and collection gates.

- Direct On Play reveal/add and opponent-turn once-per-turn draw watcher map to the interpreter.
  Its six focused tests previously passed 6/6, but collection proof remains incomplete, so below 10/10.

## LM-015 — Ryudamon — pending attack/evolution proof

- The direct IR requires a controller Tamer, optionally digivolves the attacking self into a hand
  Ginryumon without cost, and gates the inherited +1000 DP on the live X Antibody trait during the
  controller's turn. The catalog has no local KB entry; multiple Ginryumon printings share the
  name and the direct name filter correctly admits them, while the historical aggregate retains a
  weaker raw inherited condition. Static catalog/direct-IR review found no new causal gap. The
  authorized single serialized run passed 1/1 file and 7/7 tests in 3.32s on 2026-08-26 using
  `vitest run src/cards/LM/LM-015.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-015 remains below 10/10 pending mechanism and collection gates.

## LM-016 — Gammamon — pending focused execution

- Direct all-turns once-per-turn reactive evolution is restricted to effect-caused deletion of
  another friendly Digimon, and inherited On Deletion free-play targets any named Hiro Amanokawa
  Tamer from hand. The catalog has no local KB entry; direct IR and focused fixtures cover effect
  versus battle deletion, self-deletion, inherited play/refusal, and metadata, with no new causal
  gap found. The authorized single serialized run passed 1/1 file and 6/6 tests in 3.34s on
  2026-08-26 using
  `vitest run src/cards/LM/LM-016.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-016 remains below 10/10 pending mechanism and collection gates.

## LM-017 — Regulusmon — pending focused execution

- Direct IR maps Blast Digivolve, shared entrance trash/under placement, and once-per-turn reactive
  free-play/deletion branch. The reaction now requires effect provenance on the add-digivolution
  event, so ordinary digivolution cannot arm it. The catalog has no local KB entry; static review
  found no new causal gap across the level boundary, bottom placement, deletion cost, or
  once-per-turn gate. The previously published focused evidence is green at 7/7; no rerun is
  authorized or needed here. LM-017 remains below 10/10 pending mechanism and collection gates.

## LM-018 — Gyuukimon — pending focused execution

- Direct On Play deletion then conditional token play uses the preceding-action receipt correctly.
  Static review found a real shared-token fidelity gap: the catalog requires the Gyuukimon Token to
  be Lv.5, 3000 DP, play cost 7, Ultimate/Virus/Dark Animal, while the token registry had Lv.4,
  4000 DP, play cost 4, and no form/attribute/type. The registry and token proof now encode the
  catalog identity. The first authorized post-fix focus ran once and reported 5/6 tests passing;
  the metadata assertion observed the stale Lv.4/4000 DP/cost 4 token because `@aegis/shared`
  resolved the ignored, pre-build `dist` artifact. Normal shared build was blocked by missing local
  dependencies, while `tsc --noCheck` refreshed the local ignored artifact afterward. A fresh
  authorized focus was then run once and again reported 5/6 for the same reason: this worktree's
  `node_modules` symlinks still resolved `@aegis/shared` to the main checkout. Offline frozen
  installation has now relinked that dependency to this worktree. The next authorized focus passed
  1/1 file and 6/6 tests in 3.01s on 2026-08-26 using
  `vitest run src/cards/LM/LM-018.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-018 remains below 10/10 pending mechanism and collection gates.

## LM-019 — Bokomon — focused proof green; pending mechanism and collection gates

- Q4002 supports the simultaneous-leaving self-deletion replacement; direct IR uses a replacement
  rather than post-leave trigger. Static review found no new causal gap across the Bokomon exclusion,
  Gammamon-text filter, own-effect leave boundary, or self-deletion cost. The authorized serialized
  focused command passed 1/1 file and 6/6 tests in 3.11s on 2026-08-26:
  `vitest run src/cards/LM/LM-019.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-019 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-020 — Quantumon — focused proof green; published correction; pending mechanism and collection gates

- Q4003-Q4011 map to declared-category immunity and security manipulation, including token/Mother
  D-Reaper special movement semantics. The published correction `b6226b239` adds `allowTokens: true`
  to the Digimon placement filter and asserts that eligibility in the focused proof; this state was
  compared directly and was not duplicated here. Orchestration reports the corrected branch clean
  with the authorized focused proof green at 9/9 on 2026-08-26. LM-020 remains below 10/10 pending
  relevant mechanism and refreshed collection gates.

## LM-021 — Agumon - Bond of Bravery — focused proof green; pending mechanism and collection gates

- Q4012-Q4018 require live ≤2-security named evolution legality and selectable total-DP deletion
  bounded by source DP. The direct aggregate-DP resolver makes an eligible choice mandatory (`min: 1`),
  as Q4018 requires, and reads the source's live DP.
- The authorized serialized focused command passed 1/1 file and 7/7 tests in 2.89s on 2026-08-26:
  `vitest run src/cards/LM/LM-021.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-021 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-022 — Gabumon - Bond of Friendship — focused proof green; pending mechanism and collection gates

- Q4019-Q4023 require live ≤2-security named evolution legality, including Blast/Delay timing.
  Direct IR compares each target's live digivolution-card count to the source stack, returns exactly
  two eligible targets to deck bottom when available, and gates its self-unsuspend on a Tamer.
- The authorized serialized focused command passed 1/1 file and 6/6 tests in 4.66s on 2026-08-26:
  `vitest run src/cards/LM/LM-022.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-022 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-023 — Sakuyamon: Maid Mode — focused proof green; pending mechanism and collection gates

- Catalog and Q4024/Q4025: yellow Tamer or single-color Option placement is optional,
  revealed, and placed on top of security.
- Q5516: the Option cap is now `effectiveUseCostLte: 5`; loose-card selection queries
  the active hand-use cost ledger, so BT2-099's printed cost 9 is eligible after four
  Yellow Tamer reductions make its use cost 5.
- Q5517/Q5518: the existing `whenOptionUsed` watcher uses the real post-Main use event,
  rather than Security or Delay activation.
- The Q5516 reduced-cost positive and 9-to-6 negative boundaries prove the card-local projection
  includes automatic self-reducers but does not speculate about paid/optional reducers.
- The authorized serialized focused command passed 1/1 file and 9/9 tests in 3.88s on 2026-08-26:
  `vitest run src/cards/LM/LM-023.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-023 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-024 — Shivamon — focused proof green; pending mechanism and collection gates

- Catalog and Q4026: the direct `registerIrCard` IR independently applies the
  three-or-more suspend/own +3000 DP branch and the three-or-fewer suspended-opponent
  return branch, so exactly three security executes both.
- Q4027/Q4028: the all-turns grant is live only while the source is suspended and is
  specifically limited to opponent Digimon effects; the shared grant interpreter records a
  Digimon-source-qualified `beAffected` restriction.
- Existing focused behavioral cases cover security counts two, exactly three, and four; an
  own-Digimon suspension choice; and the suspension-to-unsuspension immunity transition.
  The security-Digimon example in Q4027 is mechanism-traced rather than exercised as a
  card-level fixture.
- The authorized serialized focused command passed 1/1 file and 6/6 tests in 2.63s on 2026-08-26:
  `vitest run src/cards/LM/LM-024.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-024 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-025 — Cyberdramon — focused proof green; pending mechanism and collection gates

- Catalog contract maps to the direct `registerIrCard` module: optional free play of one
  revealed black cost-4-or-lower Tamer, ordered top-or-bottom return of the remainder, then
  an opponent De-Digivolve 1 only when a Tamer is present; inherited attack De-Digivolve 1 is
  once per turn.
- Existing focused behavioral fixtures cover successful Tamer play plus Then De-Digivolve,
  the no-revealed-Tamer negative, free play at zero memory, and inherited once-per-turn use.
- No local rulings add ambiguity. The authorized serialized focused command passed 1/1 file and
  5/5 tests in 2.90s on 2026-08-26: `vitest run src/cards/LM/LM-025.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --fileParallelism=false`. LM-025 remains below 10/10 pending
  relevant mechanism and refreshed collection gates.

## LM-026 — Megidramon — focused proof green; pending mechanism and collection gates

- Catalog and Q4029/Q4030 map to a self-bound optional leave replacement that plays a
  qualifying Guilmon from this stack or trash and relocates Megidramon beneath it; the
  existing interpreter path keeps the relocation out of Overflow's leaving-area handling.
- The rule-name alias is an executable name grant. The inherited `DeletionMaxDpModifier` raises
  only this host's numeric DP deletion ceiling, matching Q4031 and excluding nonnumeric
  DP-reference effects as Q4032 requires.
- Existing behavioral focused cases cover the 11000 threshold, both Guilmon source zones and
  final stack order, the ChaosGallantmon alias, and modifier positive/negative boundaries.
- The authorized serialized focused command passed 1/1 file and 7/7 tests in 3.65s on 2026-08-26:
  `vitest run src/cards/LM/LM-026.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-026 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-027 — Red Scramble — focused proof green; pending mechanism and collection gates

- Direct IR keeps ordinary red-Digimon evolution legality (`ignoreRequirements: false`), excludes
  burst/DNA forms by using the ordinary hand Digivolve action, and places the resolved Option in
  battle after the optional evolution attempt, matching Q4033-Q4035.
- The opponent-Digimon start-turn gate arms Delay; its nonoptional trash-to-deck-top return runs
  before the optional small red-trash play, matching Q4036/Q4037. Security independently performs
  optional small-red play then returns Red Scramble to hand.
- Existing behavioral cases cover cost reduction, Delay ordering, size cap, no-opponent gate,
  empty-trash Q4036 activation, and Security follow-up. The authorized serialized focused command
  passed 1/1 file and 8/8 tests in 2.58s on 2026-08-26: `vitest run src/cards/LM/LM-027.test.ts
  --pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false`. LM-027 remains below
  10/10 pending relevant mechanism and refreshed collection gates.

## LM-028 — Blue Scramble — focused proof green; pending mechanism and collection gates

- The direct IR is the blue-scoped analogue of the Scramble contract: ordinary legal blue
  hand evolution with cost reduced by three, battle-area placement, opponent-Digimon-gated
  Delay, mandatory blue-trash return before optional 2000-DP-or-lower revival, and Security
  play followed by self hand return. Q4038-Q4042 align with these paths.
- Existing behavioral tests cover cost reduction and post-use placement, Delay ordering and
  opponent absence, Security positive and above-2000 negative boundaries. The authorized
  serialized focused command passed 1/1 file and 6/6 tests in 3.27s on 2026-08-26:
  `vitest run src/cards/LM/LM-028.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-028 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-029 — Yellow Scramble — focused proof green; pending mechanism and collection gates

- Catalog, direct IR, and existing behavioral fixtures agree on the yellow Scramble contract:
  legal yellow evolution at minus three, placement, opponent-gated Delay with mandatory
  yellow-trash return before optional low-DP play, and Security play/hand return.
- KB Q4043-Q4047 match that contract. The official LM-029 result page also renders EX8-037 as a
  related-card category, whose Q4737/Q4738 describe that card's `[Your Turn]` Option-use/unsuspend
  clause; `parseQa` now retains only the requested category, so those rulings remain solely under
  EX8-037 and cannot be mistaken for unprinted LM-029 behavior.
- The former provenance issue is resolved. The authorized serialized focused command passed 1/1
  file and 6/6 tests in 4.23s on 2026-08-26: `vitest run src/cards/LM/LM-029.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --fileParallelism=false`. LM-029 remains below 10/10 pending
  relevant mechanism and refreshed collection gates.

## LM-030 — Green Scramble — focused proof green; pending mechanism and collection gates

- Catalog and Q4048-Q4052 align with the direct `registerIrCard` IR: ordinary legal green
  hand evolution at minus three and self placement, followed by opponent-Digimon-gated Delay
  whose mandatory green-trash-to-deck-top return precedes the optional small-green revival.
- Security independently offers the optional 2000-DP-or-lower green play, then returns Green
  Scramble to hand. Existing behavioral fixtures cover the legal cost reduction and placement,
  Delay order and no-opponent negative, Security positive and over-2000 negative boundaries.
- The authorized serialized focused command passed 1/1 file and 6/6 tests in 5.91s on 2026-08-26:
  `vitest run src/cards/LM/LM-030.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-030 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-031 — Black Scramble — focused proof green; pending mechanism and collection gates

- Catalog and Q4053-Q4057 align with direct compiled IR: black Digimon-only ordinary legal hand
  evolution at minus three, followed by self placement; this excludes altered evolution routes and
  Tamers because the executable target is a black Digimon and `Digivolve` retains requirements.
- The opponent-Digimon-gated Delay performs the mandatory black-trash deck-top return before its
  optional 2000-DP-or-lower play; Security is the independent optional play followed by self hand
  return. Existing behavioral fixtures prove those positive and no-opponent/over-2000 boundaries.
- The authorized serialized focused command passed 1/1 file and 6/6 tests in 12.59s on 2026-08-26:
  `vitest run src/cards/LM/LM-031.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-031 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-032 — Purple Scramble — focused proof green; pending mechanism and collection gates

- Catalog and Q4058-Q4062 align with the direct IR: purple Digimon-only ordinary legal hand
  evolution reduced by three and self placement, excluding altered routes and Tamers; the
  opponent-Digimon-gated Delay mandates a purple-trash return before optional small-purple play.
- Security's optional 2000-DP-or-lower purple revival and self hand return are separately
  compiled. Existing behavioral tests cover the positive paths plus no-opponent and over-2000
  negative boundaries.
- Static review found no new causal gap: the Main action uses ordinary Digivolve (so it neither
  ignores requirements nor permits Burst/DNA/Tamer routes), the Delay return is mandatory whenever
  possible before the optional revival, and the opponent-Digimon gate is independent of purple-trash
  availability. The authorized serialized focused command passed 1/1 file and 6/6 tests in 2.92s
  on 2026-08-26:
  `vitest run src/cards/LM/LM-032.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-032 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-033 — Garnet Memory Boost! — focused proof green; pending mechanism and collection gates

- Catalog and Q4063/Q4064 map to a self-bound Static `WaiveColorRequirement` with
  `alsoColor: black`, not a blanket waiver. The interpreter's option-legality path includes both
  battle and breeding area colour sources, and keeps a red-or-black source mandatory.
- Main correctly reveals three, adds one red-or-black Digimon, bottoms the rest, then places the
  Option; Delay separately gains two memory; Security places it. The focused module proves red,
  black battle, black breeding, and no-colour-source paths, and the shared Delay suite exercises
  cost/payment removal and the two-memory payload.
- Static review found no new causal gap: the self-bound `WaiveColorRequirement` preserves the
  printed red requirement while admitting black Digimon/Tamers in battle or breeding, and the
  Main, Delay, and Security effects remain independent. The authorized serialized focused command
  passed 1/1 file and 6/6 tests in 3.19s on 2026-08-26:
  `vitest run src/cards/LM/LM-033.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-033 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-034 — Wisteria Memory Boost! — static audit complete; pending focused authorization

- Catalog and Q4065/Q4066 map to the direct Static `WaiveColorRequirement` with
  `alsoColor: red`; interpreter legality treats a blue or red source in battle or breeding as
  satisfying the printed blue requirement, without converting the effect into a blanket waiver.
- Main reveals three, adds one blue-or-red Digimon, bottoms the rest, and places the Option;
  Delay separately gains two memory and Security places it. Focused fixtures cover blue, red
  battle, red breeding, no eligible source, reveal results, and Security, while the shared Delay
  suite covers activation/payment/result behavior. The stale Q&A reference in the test comment
  was corrected from Q4063/Q4064 to Q4065/Q4066.
- Static review found no new causal gap: the self-bound `WaiveColorRequirement` preserves the
  printed blue requirement while admitting red Digimon/Tamers in battle or breeding, and the
  Main, Delay, and Security effects remain independent. The authorized serialized focused command
  passed 1/1 file and 6/6 tests in 3.29s on 2026-08-26:
  `vitest run src/cards/LM/LM-034.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --fileParallelism=false`. LM-034 remains below 10/10 pending relevant mechanism and refreshed
  collection gates.

## LM-035 — Amber Memory Boost! — static audit complete; pending focused authorization

- Catalog and Q4067/Q4068 map to direct self-bound Static color alternative `purple`, which the
  executable legality path evaluates from either battle or breeding; it still rejects a player
  with neither yellow nor purple available. Main reveals three, adds one yellow-or-purple
  Digimon, bottoms the rest, and places the Option; Delay gains two memory and Security places it.
- Focused fixtures cover native yellow, alternate purple in battle and breeding, refusal, reveal
  result, and Security, while the shared Delay suite covers payment and payload. The stale Q&A
  references in both focused-test comments are corrected to their card-specific rulings.
- Static review found no new causal gap: the self-bound `WaiveColorRequirement` preserves the
  printed yellow requirement while admitting purple Digimon/Tamers in battle or breeding, and the
  Main, Delay, and Security effects remain independent. The focused suite remains unrun; LM-035
  stays below 10/10 pending explicit authorization and the relevant mechanism/collection gates.

## LM-036 — Jade Memory Boost! — static audit complete; pending focused authorization

- Catalog and Q4069/Q4070 map to a direct Static `alsoColor: blue` alternative. The shared
  executable option-legality path accepts green or blue sources from either battle or breeding,
  while preserving the requirement that one of those colours exists.
- Main reveals three, adds one green-or-blue Digimon, bottoms the rest, then places the Option;
  Delay gains two memory and Security places it. Focused fixtures cover native green, alternate
  blue in battle/breeding, refusal, reveal output, and Security; shared Delay proof covers the
  activation lifecycle. The focused comment's stale ruling reference was corrected to Q4069/Q4070.
- Static audit found no catalog, Q&A, direct-IR, registration, shared-primitive, or focused-fixture
  gap: the self-bound blue alternative preserves the printed Green requirement, the reveal filter
  is Green-or-Blue Digimon, and Main Delay/Security remain independent. Tests are deliberately
  unrun per instruction, so LM-036 remains below 10/10.

## LM-037 — Sepia Memory Boost! — static audit complete; pending focused authorization

- Catalog and Q4071/Q4072 map to a direct Static `alsoColor: yellow` alternative; option
  legality observes black or yellow sources in battle and breeding without making the printed
  black requirement unconditional. Main correctly reveals three, adds one black-or-yellow
  Digimon, bottoms the rest, and places the Option; Delay gains two memory; Security places it.
- Focused behavior covers native black, alternate yellow in battle and breeding, rejection with
  neither colour, search resolution, and Security. The shared Delay suite supplies lifecycle
  proof; the focused comment's stale ruling reference is corrected to Q4071/Q4072.
- Static audit found no catalog, Q&A, direct-IR, registration, shared-primitive, or focused-fixture
  gap: the self-bound yellow alternative preserves the printed Black requirement, the reveal
  filter is Black-or-Yellow Digimon, and Main Delay/Security remain independent. Tests are
  deliberately unrun per instruction, so LM-037 remains below 10/10.

## LM-038 — Grape Memory Boost! — static audit complete; pending focused authorization

- Catalog and Q4073/Q4074 map to direct Static `alsoColor: green`; interpreter option-legality
  accepts purple or green sources in battle/breeding while rejecting a player with neither.
  Main reveals three, adds one purple-or-green Digimon, bottoms the rest, then places the Option;
  Delay gains two memory and Security places it.
- Focused behavior covers the native/alternative colour-source paths, breeding ruling, rejection,
  search resolution, and Security. Shared Delay proof covers lifecycle behavior, and the stale
  card-comment citations are corrected to Q4073/Q4074.
- Static audit found no catalog, Q&A, direct-IR, registration, shared-primitive, or focused-fixture gap: the self-bound green alternative preserves the printed Purple requirement, the reveal filter is Purple-or-Green Digimon, and Main Delay/Security remain independent. Tests are deliberately unrun per instruction, so LM-038 remains below 10/10.

## LM-039 — Valkyrimon — static audit complete; pending focused authorization

- Catalog maps directly to `registerIrCard`: the named Silphymon alternate evolution cost,
  digivolution Blitz, and one shared once-per-turn budget across the digivolving/attacking
  windows. The return action uses opponent Digimon and an inclusive 8000-DP threshold, and the
  interpreter's `ifThisEffectDidNotAct` evaluates the preceding return's actual move result.
- The permanent Your Turn restriction is self-bound and read by combat legality for attack-target
  changes. Existing focused fixtures prove bottom-deck destination, empty and above-threshold
  Security Attack fallback, shared budget, named-source digivolution, and restriction activation.
- No local Q&A exists. The direct module's executable IR uses the supported `ifThisEffectDidNotAct`
  condition, but the committed `packages/shared/src/effects/effects.json` snapshot still encodes
  both fallback conditions as `kind: "raw"`; the direct `registerIrCard` path overwrites that
  snapshot when the card module is loaded, while an isolated shared-artifact consumer would not
  preserve the fallback semantics. This shared-artifact mismatch is a static audit gap; the
  focused fixture covers the direct module path, and tests remain deliberately unrun per
  instruction, so LM-039 remains below 10/10.

## LM-040 — Vikemon — static audit complete; pending focused authorization

- Catalog's named Shakkoumon/Zudomon alternate evolution, Ice Clad, and evolution trash are
  direct compiled IR. `TrashDigivolution` selects all qualifying opponent hosts and uses the
  distributed cross-Digimon primitive, so “any 4” is a pooled player choice rather than four from
  one host or top-only removal.
- The attack gate compares each opponent's stack depth to Vikemon's and unsuspends only when none
  is at least as deep. Q4843 requires the Then clause regardless of that gate; the direct
  `ModifySecurityDP` action writes the opponent security-Digimon ledger rather than attempting to
  target security loose cards as permanents. Existing behavior covers pooled trash, both stack
  comparison outcomes, mandatory Then, and once-per-turn.
- The direct module is behaviorally aligned with the catalog and Q4843, but the committed
  `packages/shared/src/effects/effects.json` snapshot remains stale: it encodes the evolution
  trash as `count: 1`/`amount: 4` without the direct module's pooled `acrossDigimon` selection,
  and encodes the mandatory Security-Digimon debuff as permanent `ModifyDP` rather than
  `ModifySecurityDP`. `registerIrCard` overwrites the snapshot when the direct module is loaded,
  so the focused fixture exercises the corrected direct path; an isolated shared-artifact consumer
  would not. This is a static shared-artifact gap. Tests remain deliberately unrun per instruction, so LM-040 remains below 10/10.

## LM-041 — Regalecusmon — pending focused execution

- Catalog maps to direct IR for the DS level-5 alternate evolution and the shared On Play/When
  Digivolving own-DS unsuspend. Its shared once-per-turn later effect keeps the two sequential
  conditions independent: at memory one both security-to-hand and the Then suspend lock apply;
  at zero only the lock applies; above one only security return applies.
- `SecurityManipulation` moves the opponent's top security to hand, and `Restrict` targets either
  opponent Digimon or Tamer with the duration through the opponent's turn end. The focused zero
  memory case was strengthened to assert the mandatory Then lock, not merely the absent return;
  existing cases cover memory-one dual execution, above-one boundary, and On Play DS targeting.
- No local ruling adds ambiguity. The focused test is deliberately unrun under PID 82901, so
  LM-041 remains below 10/10.

## LM-042 — Rasielmon — pending focused execution

- Catalog's Angel/Archangel alternate evolution, permanent Security Attack +1, shared On
  Play/When Digivolving suspension, and On Deletion self-to-bottom-security all map to direct
  `registerIrCard` IR. The deletion security action deliberately uses the resolving self rather
  than a battle-area target, so it remains executable after the permanent has left play.
- The Then lock is a fresh opponent Digimon-or-Tamer binding, not an accidental alias of the
  suspension target; both `cannotActivateWhenDigivolving` and `unsuspend` restrictions bind to
  that single fresh selection until the opponent turn ends. The trigger filter enforces the
  Q5746-Q5750 semantics in the shared interpreter, including no false once-per-turn consumption.
- A manual-decision focused case now chooses one opponent for suspension and a different opponent
  for the fresh Then lock, proving the two bindings are independent while both lock restrictions
  remain coupled to the second choice. PID 82901 still blocks its execution, so LM-042 remains
  below 10/10.

## LM-043 — Darkdramon — pending focused execution

- Catalog maps directly to the D-Brigade/ACCEL alternate evolution, hand Counter Blast
  Digivolve marker, Scapegoat, shared On Play/When Digivolving De-Digivolve 1 then delete-all
  lowest-play-cost clauses, and inherited Collision. The target narrowing is evaluated after
  De-Digivolve, so a reverted stack can become a delete target; tied lowest costs remain all
  eligible.
- Existing focused proof covers both sequencing paths and Collision. A minimal card-level
  Scapegoat battle proof was added: an opponent battle into suspended Darkdramon must sacrifice
  another own Digimon and retain Darkdramon, exercising the registered keyword through the combat
  deletion path rather than merely asserting its marker.
- No local Q&A exists. This new focused case is intentionally unrun under PID 82901, so LM-043
  remains below 10/10.

## LM-044 — Ghoulmon — pending focused execution

- Catalog maps directly to hand Counter Blast Digivolve, static Blocker/Retaliation, and the
  sequential On Deletion clauses. The first independently checks opponent hand at five-or-more
  before trashing one; the second observes the resulting hand size and deletes an opponent level
  six-or-lower Digimon only at four-or-fewer.
- Q4844 confirms the second condition is evaluated independently even when the discard condition
  was initially false. Existing behavioral tests prove initial five (discard then delete), four
  (no discard but delete), and six (discard leaves five, so no delete) boundaries, plus keyword
  registration. No source semantic gap was found.
- The focused suite remains unrun under PID 82901, so LM-044 remains below 10/10.

## LM-045 — Vermilion Memory Boost! — pending focused execution

- Catalog maps to direct Static `alsoColor: yellow` rather than a blanket color waiver. The
  executable option-legality path accepts the printed red or alternate yellow source in battle or
  breeding, and rejects a player with neither. Main reveals three, adds one red-or-yellow
  Digimon, bottoms the rest, then places the Option; Delay gains two memory and Security places it.
- Existing focused behavior covers native/alternate battle and breeding sources, refusal, reveal
  resolution, and Security; shared Delay tests cover its activation lifecycle. The LM-033-specific
  Q4063/Q4064 citations in this card's comments were removed because LM-045 has no local KB entry
  and the catalog is the only card-specific authority available.
- Tests remain deliberately unrun under PID 82901, so LM-045 remains below 10/10.

## LM-046 — Navy Memory Boost! — pending focused execution

- Catalog maps to direct Static `alsoColor: purple`, preserving blue-or-purple color legality in
  both battle and breeding rather than waiving requirements. Main reveal/add/bottom/place,
  separate two-memory Delay, and Security placement all compile directly and use the established
  executable paths.
- Existing focused cases cover native/alternate sources, breeding, rejection, reveal resolution,
  and Security; shared Delay behavior covers activation lifecycle. Removed LM-033-specific
  Q4063/Q4064 citations because LM-046 has no local KB ruling.
- Tests remain deliberately unrun under PID 82901, so LM-046 remains below 10/10.

## LM-047 — Chartreuse Memory Boost! — pending focused execution

- Catalog maps to direct Static `alsoColor: green`, retaining yellow-or-green color legality in
  battle and breeding. Main reveals three, adds one yellow-or-green Digimon, bottoms the rest,
  then places the Option; Delay gains two memory and Security places it.
- Existing focused behavior covers the native/alternate source paths, breeding, rejection, reveal
  resolution, and Security; shared Delay proof covers activation. Removed unrelated LM-033 Q&A
  citations because LM-047 has no card-specific KB entry.
- Tests remain deliberately unrun under PID 82901, so LM-047 remains below 10/10.

## LM-048 — Chrome Memory Boost! — pending focused execution

- Catalog maps to direct Static `alsoColor: black`, retaining green-or-black source legality
  across battle and breeding. Main reveal/add/bottom/place, Delay gain-two, and Security placement
  are direct IR and interpreter paths; existing focused cases cover all color-source and zone
  boundaries plus search and Security behavior.
- Removed unrelated LM-033 Q&A references: LM-048 has no local KB entry, and its card catalog is
  the card-specific authority. Its existing focused suite is behavioral but deliberately unrun.
- PID 82901 remains active, so LM-048 remains below 10/10.

## LM-049 — Midnight Memory Boost! — pending focused execution

- Catalog maps to direct Static `alsoColor: blue`, retaining black-or-blue color legality in
  battle and breeding. Main reveal/add/bottom/place, Delay gain-two, and Security placement are
  executable direct IR; focused fixtures cover native/alternate source, breeding, refusal, reveal
  result, and Security.
- Removed unrelated LM-033 Q&A citations because LM-049 has no local KB entry. Focused behavior
  remains unrun while PID 82901 occupies the serial test slot.
- LM-049 remains below 10/10 pending that execution.

## LM-050 — Magenta Memory Boost! — pending focused execution

- Catalog and direct IR agree on purple-or-red alternate color legality, reveal-three/add-one
  purple-or-red Digimon, bottoming, placement, Delay gain-two, and Security placement. Focused
  source tests cover native/alternate battle and breeding sources, rejection, reveal, and Security.
- LM-050 has no local KB entry; removed unrelated LM-033 Q&A citations. Tests are unrun under PID
  82901, so it remains below 10/10.
- Added shared card-level Delay integration proof for LM-050–053: on a later turn, activation must
  trash the exact placed Option and leave memory at exactly +2. This explicitly depends on EX6
  Delay-engine commit `d1082a712`; do not duplicate that generic engine repair in LM. Before any
  LM validation/PR, update this worktree from `origin/main` after the EX6 merge and re-check it.

## LM-051 — Alexandrite Memory Boost! — pending focused execution

- Catalog and direct IR agree on red-or-green alternate legality and the standard reveal-three,
  placement, Delay, and Security paths. Focused source tests cover native/alternate/breeding and
  negative legality plus observable Main/Security results; no local ruling exists.
- Stale generic breeding wording was made citation-free. Tests are unrun under PID 82901, so this
  card remains below 10/10.

## LM-052 — Malachite Memory Boost! — pending focused execution

- Catalog and direct IR agree on blue-or-yellow alternate legality and standard reveal-three,
  placement, Delay, and Security behavior. Existing focused tests cover every color-source and
  primary-zone boundary; no local ruling exists.
- Tests remain unrun under PID 82901, so LM-052 remains below 10/10.

## LM-053 — Obsidian Memory Boost! — pending focused execution

- Catalog and direct IR agree on black-or-purple alternate legality and standard reveal-three,
  placement, Delay, and Security behavior. Existing focused tests cover native/alternate/breeding
  legality, refusal, search result, and Security; no local ruling exists.
- Tests remain unrun under PID 82901, so LM-053 remains below 10/10.
- Its Delay case is included in `LM-050-053.delay.test.ts` and shares the explicit EX6
  `d1082a712` integration dependency/update-before-validation requirement recorded at LM-050.

## LM-054 — Treadmill Training — pending focused execution

- Catalog maps to a self-name-gated full color waiver only while no Treadmill Training is in the
  battle area, reveal-two/add yellow-or-black card/bottom/place, and optional paid ordinary
  yellow-or-black evolution at minus two via Delay. Security repeats reveal and placement.
- Existing focused source cases cover the waiver on/off boundary, legal reduced paid evolution,
  Main, and Security. No local ruling exists; unrun status under PID 82901 keeps it below 10/10.

## LM-055 — Sprint Dash Training — pending focused execution

- Direct IR is the green/red analogue of LM-054: self-name-gated waiver, reveal-two/add card,
  place, optional paid ordinary evolution at minus two, and Security reveal/place. Existing focused
  tests cover each path; no local ruling exists.
- Tests remain unrun under PID 82901, so LM-055 remains below 10/10.

## LM-056 — Image Training — pending focused execution

- Direct IR is the blue/purple analogue of the Training contract, including self-name waiver
  scoping, ordinary paid evolution reduced by two, and independent Security reveal/place. Existing
  focused tests cover the applicable positive and waiver-negative boundaries.
- No local ruling exists; tests are unrun under PID 82901 and LM-056 remains below 10/10.

## LM-057 — Wall Training — pending focused execution

- Direct IR matches catalog's red/blue self-name waiver, reveal-two/add card/bottom/place, Delay
  optional ordinary paid evolution reduced by two, and Security reveal/place. Focused tests cover
  waiver lifecycle, evolution cost, Main, and Security.
- No local ruling exists; unrun proof under PID 82901 keeps LM-057 below 10/10.

## LM-058 — Parkour Training — pending focused execution

- Direct IR matches catalog's blue/green Training contract and uses the same executable name-gated
  waiver, legal paid evolution, and Security paths. Existing focused tests cover each behavior.
- No local ruling exists; tests remain unrun under PID 82901, so LM-058 remains below 10/10.

## LM-059 — Heat Training — pending focused execution

- Direct IR matches catalog's yellow/red Training contract: self-name-gated waiver, reveal/add,
  placement, Delay paid evolution at minus two, and Security reveal/place. Existing focused tests
  cover all stated boundaries.
- No local ruling exists; tests remain unrun under PID 82901, so LM-059 remains below 10/10.

## LM-060 — Shadow Training — pending focused execution

- Direct IR matches catalog's green/purple Training contract through shared self-name waiver,
  normal paid evolution reduced by two, and Security reveal/place mechanisms. Existing focused
  tests cover the waiver boundary and every printed trigger path.
- No local ruling exists; tests remain unrun under PID 82901, so LM-060 remains below 10/10.

## LM-061 — Punching Training — pending focused execution

- Direct IR matches catalog's black/red Training contract, including the self-name waiver scope,
  ordinary paid evolution, reduction, and Security resolution. Existing focused tests cover all
  printed branches.
- No local ruling exists; tests remain unrun under PID 82901, so LM-061 remains below 10/10.

## LM-062 — Breathing Training — pending focused execution

- Direct IR matches the intended purple/yellow Training contract. The catalog's “yellowuce” is a
  source-text typo; the surrounding sentence and the five analogues establish the intended
  reduce-cost-by-two behavior, which the direct IR executes as paid ordinary evolution at minus two.
- Existing focused tests cover waiver lifecycle, reveal/placement, reduction, and Security. No
  local ruling exists; tests remain unrun under PID 82901, so LM-062 remains below 10/10.
- Static shared-artifact risk remains: `packages/shared/src/effects/effects.json` encodes the
  Delay digivolution as an unreduced `Digivolve` plus `RawUnparsed` “yellowuce the cost by 2”,
  while the direct IR executes `reduceCost: 2` and `payCost: true`. The same stale partial Delay
  shape is present for LM-054 through LM-061; this is an artifact mismatch, not a direct-module gap.
