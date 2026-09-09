# Coordinator review queue

## Session 1 setup

- Historical 10/10 (docs/audits/BT19-AUDIT.md, 2026-09-02) is treated as
  unverified. Every row starts at 0 and earns credit from a session report only.
- Lane plan: four concurrent opus card lanes (16 GB machine, vitest serial);
  simple cards batched two or three per lane, complex cards one per lane.
  Engine lane serialized, dispatched only when card lanes retain reds naming a
  seam.
- Known fixture traps to sweep: Digi-Egg in security or deck (14 files),
  numeric `security: <n>` (091, 094, 101), injected timing used as the only
  proof of a clause (11 files).
- Range/audit files (`BT19-001-020.test.ts`, `BT19-021-040.audit.test.ts`,
  `BT19-041-102.audit.test.ts`, `BT19-092-102.test.ts`) are coordinator-owned;
  card lanes do not edit them.

## Cross-card follow-ups

- Q3099: BT19-048 ForgeBeemon security effect versus BT19-053 QueenBeemon;
  closed: `BT19-053.test.ts` asserts the exact security endpoint (lane 23).
- Q4727: BT19-014 versus BT19-102 End of Attack; routed to the 102 lane.
- Q3084: BT19-027 simultaneous On Play ordering with EX6-054; no BT19 lane.
- Out of set: EX8-052 pays "trash Option cards in the battle area" with
  `cost.kind: "trash"`, which never fires `WhenTrashedFromBattleArea`
  (`primitives.ts:3852-3858` fires it only from `deletePermanent` byEffect).
  Use `deleteOwn` as BT19-086 does. Flag for the EX8 audit (lane 36).

## Shared data overrides

- `DIGIXROS_REQUIREMENT_OVERRIDES` (`packages/shared/src/effects/data.ts:2053-2066`)
  shadows BT19-070's module `digiXrosRequirement`; equivalent today. Reconcile
  (drop the override) at closeout if the sync tool allows, else leave and note.

## Seam queue

- E1 (retained red, BT19-099): `interpreter/actions/play.ts:836-853`
  resolves `relativeToLeavingDigimon` through `permanentById` on the deletion
  bus after the permanent is removed, so the play is skipped. Fix: fall back
  to the removal snapshot (`deletedTopCardId` / `deletedPermanentSnapshots`),
  consistent with `subTrigger.ts:299-303`. Only user in the corpus is
  BT19-099. Mechanism doc: LEAVING-DIGIMON-PLAY-MECHANISM.md. CLOSED by E1.
- E2 (retained red, BT19-100): `interpreter/actions/runAction.ts:647-720`
  optional `PlayWithoutCost` preflight materializes `levelComparison.scaling`,
  the DP ceiling and `playCostCeiling` but not `playCostLteScaling`, so the
  clause is judged at `playCostLte: 0` and dropped before any decision. The
  resolver (`actions/play.ts:443-455`) applies the scaling correctly.
  Mechanism doc: PLAY-COST-SCALING-PREFLIGHT-MECHANISM.md.
- Observation (no red): `GameEngine.printedColorRequirementMet` accepts a
  Digi-Egg as an Option colour source only while in breeding; a hatched
  Digi-Egg in the battle area is a Digimon (Q2684). Lane 43; later engine work.
- Q4727 is mis-filed in qa.json under BT19-014; it concerns BT21-021. Not a
  BT19 gap.

- Testkit: seating a `breeding` permanent via the Board Spec makes
  `advance.waitForMainPhase` time out in the Breeding phase
  (`apps/api/src/engine/testkit/advance.ts:79`). Reported by lane 3 (007);
  worked around with an opponent-controlled peer. Not a production defect;
  fix in an engine/testkit lane if more lanes hit it.
- Engine: `interpreter/matching/permanent.ts:683-697` unions runtime-granted
  traits only for `match: "trait"`, not `traitContains`; a granted trait is
  invisible to substring trait gates. Reported by lane 12 (028); no BT19 card
  is bitten in current fixtures. Candidate for the engine lane if any lane
  retains a red on it.
- Engine: `GameEngine.projectLooseUseCost` reads `wouldBePlayedSelfReducers`
  but "when you would use this card, reduce its use cost" compiles onto the
  `BeforePayCost` payment path; Q5461 treats both as use-cost reductions, and
  external play-cost reducers fold into `playCostFor` contrary to Q5462.
  Reported by lane 13 (030); no implemented Option exposes it. Recorded, not
  fixed.
- Engine: an active `beAffected` immunity does not remove the permanent from
  the `chooseTargets` candidate pool (the choice lands and does nothing).
  Consistent with comprehensive 15-15-5-3 (may still be chosen), so not a
  defect for this audit; the comment at
  `conformance/ch15-03-targeting-and-selection.test.ts:296` disagrees and
  should be reconciled later (lane 27).
- Engine: `interpreter/actions/removal.ts:262` sets `ctx.lastEffectActed`
  from the raw `deletePermanent` count, while `lastDeletedByThisEffectIds`
  filters survivors; a prevented deletion (Scapegoat) may satisfy "if this
  effect deleted" wrongly (Q3169, BT19-094). Suspected, not reproduced; no
  retained red. Candidate for a later engine lane.

## Decisions

- BT19-081: the 2026-09-02 typed revalidation's `count: "all", upTo: true`
  under-Tamer PlaceUnder (player-chosen subset) is reversed. The printed
  clause widens DigiXros material source zones; the count comes from the
  played card's recipe. Now the BT19-079 shape (`wouldBePlayed` Replacement
  + `DigiXrosMaterialZoneExpansion`) plus a `DIGIXROS_ZONE_EXPANDERS` entry
  (lane 34; coordinator added the shared entry).
- EX4-062 (out of set): its `[All Turns]` is a bare AllTurns with an
  unconditional suspend cost, so it self-suspends and is then refused as an
  expander. Flag for whoever audits EX4.

- BT19-042: "by trashing the top card of your security stack, trash the top
  card of your opponent's security stack" is one own-side cost plus a
  payload; the 2026-09-02 atomic compound cost (both stacks) is reversed
  (lane 19). BT19-043 "both players' top security cards" stays atomic
  (Q3096).

- Suspend effects: "Suspend 1 of your opponent's Digimon" may choose an
  already-suspended Digimon (comprehensive 15-15-5-1 and 15-15-5-3 use this
  exact effect as the example of a choice that need not be affected). The
  2026-09-02 audit's `suspended: false` target filter on BT19-038 and
  BT19-044 is reversed (lane 17; lane 20 for 044).
- Open (no assertion written): when a "by X, Y" cost is followed by an
  action with no legal target, `runAction.ts:516` skips the whole action so
  the cost cannot be paid (BT19-039). No KB ruling found either way; left
  unasserted rather than blessed.

- Catalog `types` already bakes `[Rule] Trait` grants in (017, 018, 019,
  021, EX6-013), so `Rule`/`GrantStatic` nodes are redundant at runtime and
  cannot be isolated by test. Keep the nodes (faithful compilation); do not
  drop the type from the catalog.
- Dead `abortOnDecline` on sole/last actions (008 removed with a real fix;
  016 left in place): not a defect; candidate for a later IR-cleanup pass,
  not for this audit.

- BT19-001 catalog: `inheritedEffectText` read `trait rom your hand`; corrected
  to `trait from your hand` (official text). No IR impact.
- BT19-002 catalog: printed `[Aqua]/[Sea Animal]` versus catalog `types`
  `Aquatic`; module uses `traitContains`, which satisfies both. Left as is;
  recorded for SOURCE-RECONCILIATION.
- BT19-017 catalog: `effectText` omitted the printed `[Rule] Trait: Has the
  [Aquatic] type.` line (Q3073 refers to it; 018/019 carry it). Appended;
  module gains the same `Rule`/`GrantStatic` node as 019 (lane 8 follow-up).
- Lane 8 verified two brief traps do not apply in this engine: `youHave`
  without `zone` already excludes breeding (`interpreter/scaling.ts:95-106`),
  and `controllerDefault: "mine"` is forced by `conditions.ts:228`. Lane 3's
  007 IR changes on those fields are therefore harmless but not required;
  keep them, do not require them elsewhere.
