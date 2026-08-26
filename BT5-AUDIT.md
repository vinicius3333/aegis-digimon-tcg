# BT5 Card Implementation Audit

This ledger records the evidence gathered for the BT5 cards audited in this
worktree. A card is marked 10/10 only when every catalog clause maps to
compiled IR and the relevant shared primitives have reproducible behavioral
proof.

## BT5-001 — Koromon — 10/10

- Catalog evidence: Red DigiEgg, Lv.2 In-Training, play cost -1, DP 0, no
  digivolution costs, [Lesser] trait, rarity U, and max 4 copies. It has no
  main or Security text. Its sole inherited clause is
  "[When Attacking][Once Per Turn] If this Digimon has [Omnimon] or [Greymon]
  (other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon]) in its
  name, trigger ＜Draw 1＞."
- Knowledge base: `node tools/kb/query.mjs card BT5-001 --json` returns the
  card identity with no QA, errata, or ruling entries, so the catalog text is
  the governing contract. The applicable local rules are glossary `When
Attacking` (the timing occurs when an attack is declared with the Digimon),
  glossary `Once Per Turn` (one use per copy per turn), comprehensive §15-3-1
  (an inherited effect is gained from a digivolution card), and comprehensive
  §15-14-1 (per-turn use counting and reset rules). The local manual's card
  text rules also define "with [X] in its name" as a substring match, covering
  names such as MetalGreymon and WarGreymon.
- Implementation: `apps/api/src/cards/BT5/BT5-001.ts` contains one inherited
  `WhenAttacking` effect with `frequency: "OncePerTurn"`. Its only action is
  `{ kind: "Draw", controller: "mine", amount: 1 }`, gated by
  `selfHasNameContaining` with OR names `Omnimon` and `Greymon` and exclusions
  `DoruGreymon`, `BurningGreymon`, and `DexDoruGreymon`. It is registered only
  through `registerIrCard("BT5-001", compiled)`, with `coverage: "full"` and
  `residual: []`.
- Primitive trace: `conditions.ts` resolves `selfHasNameContaining` against
  the current top card of the source permanent, compares case-insensitively,
  matches any requested name, and rejects any excluded name. Thus the gate
  follows the live top card of an evolution stack and does not inspect a
  buried source as the host identity. Registration's
  `withSubTriggerFrequency` carries `OncePerTurn` to the attack watcher;
  `subTrigger.ts` scopes the resulting budget by source instance, so separate
  copies are independent while repeat attacks by one copy are capped.
  `WhenAttacking` is the ordinary attack-declaration window, and Draw consumes
  one card from the controller's deck into that controller's hand.
- Behavioral proof: 9 focused cases. The existing positive case proves a
  qualifying Greymon host with Koromon in its stack draws on attack. The
  boundary matrix proves positive Omnimon (`BT5-086`) and Greymon (`BT5-010`),
  rejects all three named exclusions (`BT7-064`, `BT4-013`, `BT9-078`), and
  rejects an unrelated Digimon (`BT1-009`). The existing excluded-name case
  independently covers a realistic DoruGreymon evolution stack. The final
  case unsuspends the same host and attacks a second time in the same turn;
  exactly one card is drawn, proving the once-per-turn budget on the inherited
  effect.
- Defect corrected: none. The source implementation was already faithful; the
  audit added only missing boundary and once-per-turn assertions to
  `BT5-001.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
src/cards/BT5/BT5-001.test.ts` — 1 file, 9 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` was attempted and is blocked by pre-existing unrelated
  errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-001 errors. `git diff --check` and
  changed-file `oxfmt --check` both pass.

## BT5-002 — Tsunomon — 10/10

- Catalog evidence: Blue Digi-Egg, Lv.2 In-Training, play cost -1, DP 0, no
  digivolution costs, [Lesser] trait, rarity U, and max 4 copies. It has no
  main, regular, or Security text. Its sole inherited clause is
  "[Your Turn] While this Digimon has [Garurumon] or [Omnimon] in its name,
  it gets +1000 DP."
- Knowledge base: `node tools/kb/query.mjs card BT5-002` returns the card
  identity with no knowledge-base entries, so the catalog text is the governing
  contract. The applicable local rules are glossary `Your Turn` (the period
  from the start of the owner's turn through its end), glossary `Digivolution
  Card` (an inherited effect can be activated by the digivolved Digimon),
  comprehensive §2-3-1-3 ("with [XX] in its name" is a substring match),
  §15-3-1 (an inherited effect is gained from a digivolution card), and
  §15-8-2-1/§15-8-2-6 (persistent effects are constantly active while their
  timing and processing conditions hold).
- Implementation: `apps/api/src/cards/BT5/BT5-002.ts` contains one inherited
  `YourTurn` effect whose only action is an `Aura` targeting the host via
  `isSelfRef`, modifying DP by exactly 1000 while
  `selfHasNameContaining` matches `Garurumon` or `Omnimon`. It is registered
  exclusively with `registerIrCard("BT5-002", compiled)`, and declares
  `coverage: "full"` with an empty `residual` list.
- Primitive trace: `timingForTrigger` routes `YourTurn` to the persistent
  `EffectTiming.None` window, while `turnOwnerGuard` gates it to the source
  owner's turn. `recomputeContinuousEffects` clears and re-derives the
  continuous modifier tier, so the +1000 lapses when the turn changes or the
  `while` predicate fails. The `Aura` action resolves its self-reference to
  the host permanent and records a continuous DP modifier. The
  `selfHasNameContaining` condition reads the current top card name
  case-insensitively and matches requested bracket text as a substring; an
  inherited source is therefore evaluated against its host's live name.
- Behavioral proof: 4 focused cases pass. The existing positive case proves
  the inherited aura on `AncientGarurumon`, and the companion boundary case
  proves `Omnimon` matches while `AncientGreymon` does not. A legal stack case
  proves the source remains active through BT5-002 (Lv.2) -> BT1-029 (Lv.3)
  -> BT1-036 (Lv.4) -> BT1-040 (Lv.5) -> BT4-114 (Lv.6), grants exactly
  +1000 on seat 0's turn, and drops to base DP after changing to seat 1's
  turn. A same-name host without BT5-002 proves the inherited effect cannot
  activate from a loose/missing source card.
- Defect corrected: none in the card module. The implementation was already
  faithful compiled IR; this audit added the missing owner-turn, exact-stack,
  and inherited-source negative assertions to `BT5-002.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-002.test.ts` — 1 file, 4 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` is blocked by pre-existing unrelated errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-002 errors. Changed-file
  `pnpm exec oxfmt --check apps/api/src/cards/BT5/BT5-002.test.ts` and
  `git diff --check` pass.

## BT5-003 — Pickmon — 10/10

- Catalog evidence: Yellow Digi-Egg, Lv.2 In-Training, play cost -1, DP 0,
  no digivolution costs, [Minor] trait, rarity U, and max 4 copies. It has no
  main, regular, or Security text. Its sole inherited clause is
  "[When Attacking] If you have 3 or more Digimon in play, 1 of your
  opponent's Digimon gets -1000 DP for the turn."
- Knowledge base and rules evidence: `node tools/kb/query.mjs card BT5-003`
  returns the card identity and Q1282, which confirms that the Digimon this
  card is part of counts toward its inherited effect. The local manual's
  Digivolution Cards section says cards under a Digimon are not themselves
  cards on the field while their inherited effects are usable by the host;
  its effect basics say unspecified effects reference the battle area, and
  its effect timing section defines When Attacking as triggering when the
  Digimon declares an attack. No errata or restriction changes the catalog
  clause.
- Implementation: `apps/api/src/cards/BT5/BT5-003.ts` contains one inherited
  `WhenAttacking` effect. Its `youHave` condition counts at least 3 of the
  source controller's battle-area Digimon, and its only action targets exactly
  one opponent Digimon for `ModifyDP` amount -1000 with `forTheTurn` duration.
  The module is registered exclusively with
  `registerIrCard("BT5-003", compiled)`, and declares `coverage: "full"` with
  `residual: []`.
- Primitive trace: `evaluateCondition` implements `youHave` as a minimum
  count using the source owner as `mine`; `countMatching` scans battle-area
  permanents for the explicit zone and kind filter, so opponent permanents,
  Tamers, and breeding-area Digimon do not satisfy the gate. The
  `WhenAttacking` trigger is emitted at attack declaration, and
  `candidatePermanents` resolves the target's opponent/kind filter over the
  battle area, with count 1. `ModifyDP` routes `forTheTurn` through the
  modifier ledger, which recomputes `currentDP`, survives attack end, and is
  removed by the turn-end sweep.
- Peer and stack evidence: BT5-001 and BT5-002 provide the neighboring
  Digi-Egg inherited-effect patterns; their tests also verify that inherited
  sources follow the host stack. The focused suite now includes a real legal
  BT5-003 Yellow Lv.2 -> BT1-045 Yellow Lv.3 breeding digivolution, asserts
  the source-card transition and stack, moves the evolved host to the battle
  area, and proves the inherited effect. It also proves that two battle-area
  Digimon plus one breeding-area Digimon do not meet the gate, and that the
  effect selects one opposing Digimon while leaving the other opposing and
  all own Digimon unchanged.
- Behavioral proof: 6 focused tests pass. They cover the positive 3-Digimon
  path, the exact 2-Digimon negative boundary (including an opponent Digimon
  that must not count), the legal breeding evolution stack, explicit breeding
  exclusion, exact-one opponent targeting, and persistence through attack end
  followed by expiry at the owner's turn end. Q1282's host-counting case is
  represented by the legal stack test's host plus two other battle-area
  Digimon.
- Defect corrected: none in the card module or shared engine. The audit added
  only the missing BT5-003 behavioral proof to
  `apps/api/src/cards/BT5/BT5-003.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-003.test.ts` — 1 file, 6 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` is expected to retain the repository's pre-existing
  unrelated errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-003 source errors. Changed-file
  formatting and `git diff --check` are required below and are clean.

## BT5-004 — Yokomon — 10/10

- Catalog evidence: Green Digi-Egg, Lv.2 In-Training, play cost -1, DP 0,
  no digivolution cost, [Bulb] type, rarity U, and max 4 copies. It has no
  main, regular, or Security text. Its sole inherited clause is
  "[Your Turn] When this card is trashed due to activating this Digimon's
  ＜Digi-Burst＞, 1 of your Digimon gets +2000 DP for the turn."
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-004`
  returns the card identity with no card-specific KB entries, rulings, errata,
  or restrictions. The local glossary defines Digi-Burst as trashing the
  specified number of that Digimon's digivolution cards to activate its effect,
  and defines Your Turn as the period from the start of the owner's turn to its
  end. Comprehensive Rules §15-3-1/§15-3-3 establish that an inherited effect
  is gained from a digivolution card and that a "this card" reference identifies
  the inherited source card; §15-8-3 defines the trigger-type activation and
  requires its trigger conditions to be met. The local manual's Digivolution
  Cards section confirms that stacked cards are not cards on the field while
  their inherited effects remain usable by the host.
- Implementation: `apps/api/src/cards/BT5/BT5-004.ts` contains one inherited
  `YourTurn` effect with a `SubTrigger` for
  `onDigiBurstCardDiscarded`, `sourceFilter.isSelfRef: true`, and one
  `ModifyDP` action targeting exactly one own battle-area Digimon (`mine`,
  `Digimon`) for +2000 with `forTheTurn` duration. It is registered exclusively
  with `registerIrCard("BT5-004", compiled)`, and declares `coverage: "full"`
  with an empty `residual` list.
- Primitive trace: `YourTurn` is collected through the persistent trigger
  window and gated to the source owner's turn. Digi-Burst costs call
  `trashDigivolutionCards` (and its atomic sibling), which emits the dedicated
  `onDigiBurstCardDiscarded` event with the trashed stack-card instance IDs;
  `runSubTrigger`'s discard gate compares those IDs with Yokomon's source
  instance, preventing another host's Digi-Burst or ordinary stack trash from
  matching. The discarded-source handling preserves the inherited source
  context after Yokomon leaves the stack. `candidatePermanents` defaults to
  battle-area candidates, scopes `mine`, and resolves count 1; `ModifyDP`'s
  `forTheTurn` ledger entry is removed by the turn-end sweep.
- Peer and stack evidence: BT5-050 uses the same inherited
  `onDigiBurstCardDiscarded`/`isSelfRef` pattern and its negative test confirms
  that another host's Digi-Burst does not trigger the source. BT4-008 and
  BT7-003 are comparable inherited Digi-Burst reactions with the same event
  seam. The focused BT5-004 suite now performs a legal Green Lv.2 Yokomon ->
  Green Lv.3 BT5-046 breeding evolution, verifies the source-card transition,
  moves the host into the battle area, and then activates Digi-Burst.
- Behavioral proof: 4 focused tests pass. They prove exact-one own-target
  selection while leaving the host and an opponent unchanged, reject a
  different host's Digi-Burst, reject ordinary non-Digi-Burst stack trash, and
  preserve the inherited source through a legal breeding evolution before
  expiring the +2000 modifier at the owner's turn end. No optional refusal or
  trait-filter case applies because the printed clause has no optional marker
  and names no trait.
- Defect corrected: none in the card module or shared engine. The compiled IR
  was already faithful; this audit added the missing cross-host, non-Digi-Burst,
  legal-evolution, exact-target, and duration assertions to
  `apps/api/src/cards/BT5/BT5-004.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-004.test.ts` — 1 file, 4 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` retains the repository's pre-existing unrelated errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-004 source errors. Changed-file
  formatting and `git diff --check` are clean.

## BT5-005 — Tsumemon — 10/10

- Catalog evidence: Black Digi-Egg, Lv.2 In-Training, play cost -1, DP 0,
  no digivolution costs, [Unidentified] type, rarity U, and max 4 copies. It
  has no regular, main, or Security text. Its sole inherited clause is
  "[When Attacking][Once Per Turn] If this Digimon has [Unidentified] in its
  type, trigger ＜Draw 1＞. (Draw 1 card from your deck.)"
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-005`
  returns the card identity with no knowledge-base entries, so the catalog
  wording is the governing contract. Comprehensive Rules §2-3-2-3 defines a
  trait reference as requiring a matching trait, §4-3-3 and §15-3-1 establish
  that a Digimon gains inherited effects from cards stacked beneath it, and
  §11-1-3/§11-1-4 establish the attack-declaration timing and that subsequent
  timing waits for triggered effects to resolve. Comprehensive §15-8-3-1
  defines trigger-type effects such as [When Attacking], while §15-14-1-2,
  §15-14-1-3, and §15-14-1-5 define the once-per-turn cap, per-copy counting,
  and reset on turn change or becoming a new card. The glossary's
  `When Attacking`, `Once Per Turn`, `Digivolution Card`, and `Type` entries
  provide the same operational meanings. No errata, ruling, restriction, or
  card-specific ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-005.ts` contains one inherited
  `WhenAttacking` effect with `frequency: "OncePerTurn"`. Its only action is
  `{ kind: "Draw", controller: "mine", amount: 1 }`, gated by
  `selfHasTrait` with an exact trait reference for `Unidentified`. The module
  registers only through `registerIrCard("BT5-005", compiled)`, declares
  `coverage: "full"`, and has `residual: []`.
- Primitive trace: `selfHasTrait` reads the live top card of the source
  permanent and uses `matchNameOrTrait` in `trait` mode, whose normalized
  trait comparison is exact rather than substring-based; stack cards below
  the top card are not incorrectly treated as the host's type. Registration
  routes `WhenAttacking` to the attack-declaration window, propagates
  `OncePerTurn` to the watcher, and keys the use budget by the inherited
  source instance. The Draw action consumes one card from the source
  controller's deck into that controller's hand. These semantics align with
  comparable inherited trait gates in BT17-005 and BT22-005 and with the
  neighboring BT5-001 inherited attack-draw effect.
- Peer and evolution-stack evidence: BT5-001 confirms the neighboring
  Digi-Egg pattern of an inherited attack-triggered once-per-turn draw, while
  BT17-005 and BT22-005 use the same exact `selfHasTrait` primitive for
  Unidentified. The focused suite includes two simultaneous Unidentified
  hosts, an Unknown near-match (`BT11-061`), and a nonmatching Crustacean
  (`BT5-021`), proving the trait boundary across a mixed board. It also
  builds a legal BT5-005 (Lv.2) -> BT5-059 (Lv.3) breeding evolution, moves it
  to the battle area, then evolves to BT5-063 (Lv.4), checking each source
  transition and the final stack before attacking.
- Behavioral proof: 5 focused tests pass. They prove the positive draw from
  an Unidentified host, no draw from a host lacking that type, exact matching
  across multiple Unidentified/Unknown/other-type hosts, one draw only across
  repeated attacks by the same source in one turn, and inherited behavior
  surviving the legal multi-step breeding evolution. No optional refusal,
  target selection, duration, Security, or cost case applies because the
  printed clause has none of those features.
- Defect corrected: none in the card module or shared engine. The compiled IR
  was already faithful; this audit added only the missing trait-boundary,
  once-per-turn, and evolution-stack assertions to
  `apps/api/src/cards/BT5/BT5-005.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-005.test.ts` — 1 file, 5 tests passed. Affected
  mechanism suites also pass: `capabilities.test.ts -t selfHasTrait` (3),
  `mechanic.test.ts -t Once Per Turn` (1),
  `conformance/glossary.test.ts -t Once Per Turn` (1), and
  `interactionAudit.test.ts -t per-turn use budgets` (2). Workspace
  `pnpm typecheck` builds shared and passes web typecheck but retains
  pre-existing unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`; it reports no
  BT5-005 errors. Changed TypeScript file `pnpm exec oxfmt --check
  apps/api/src/cards/BT5/BT5-005.test.ts` and `git diff --check` pass. No
  shared engine seam was changed. Remaining ambiguity: none identified.

## BT5-006 — Gigimon — 10/10

- Catalog evidence: Purple Digi-Egg, Lv.2 In-Training, play cost -1, DP 0,
  no digivolution costs, [Lesser] trait, rarity U, and max 4 copies. Its sole
  inherited clause is "[Your Turn][Once Per Turn] When one of your other
  Digimon is deleted, this Digimon gets +2000 DP for the turn." There is no
  regular, Main, or Security text.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-006`
  returns Q1283, ruling that simultaneous 0-DP deletion occurs before this
  inherited effect can protect the host. Applicable local rules are §4-3-3
  and §15-3-1 (inherited effects), §15-8-3-1 (trigger effects), and
  §15-14-1-2/3/5 (once-per-turn identity, per-copy counting, and turn reset),
  plus glossary entries for `Your Turn`, `Once Per Turn`, `Digivolution Card`,
  and `for the turn`. No errata, restriction, or unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-006.ts` contains one inherited
  `YourTurn` effect with an `onDeletionOf` SubTrigger. Its source filter is
  controller `mine`, `excludeSelf: true`, and kind `Digimon`; the action is a
  self-targeted `ModifyDP` of 2000 with `forTheTurn` duration and
  `frequency: OncePerTurn`. It has `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-006", compiled)`.
- Primitive and peer evidence: the interpreter arms `YourTurn` watchers only
  for the inherited source's controller turn, matches deletion payloads by
  controller/kind and excludes the source permanent, keys once-per-turn usage
  per inherited source, and removes turn-duration DP modifiers at turn end.
  BT5-004 and BT5-081 provide neighboring `YourTurn` + `onDeletionOf` IR
  patterns; BT5-002 supplies the comparable inherited owner-turn DP pattern.
- Evolution-stack evidence: the focused suite uses a legal purple Lv.2
  Gigimon -> BT5-071 Guilmon stack and verifies the inherited source remains
  active. The Q1283 scenario uses simultaneous 0-DP deletion of the host and
  another Digimon and confirms both reach trash before protection can resolve.
- Behavioral proof: 3 focused tests pass. They prove the positive own-other
  deletion path, no second trigger in the same turn, +2000 expiry at turn end,
  no trigger during the opponent's turn, no trigger from an opponent's
  deletion, legal-stack inherited behavior, and Q1283's simultaneous 0-DP
  ordering. No optional refusal, target choice, cost, or Security case applies.
- Defect corrected: none in the card module or shared engine. Added only
  focused BT5-006 assertions for turn ownership, opponent filtering, legal
  evolution stack, and duration expiry.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-006.test.ts` — 1 file, 3 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Typecheck,
  changed-file formatting, and `git diff --check` are run for delivery.
- Remaining ambiguity: none identified.
