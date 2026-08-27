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

## BT5-007 — Agumon — 10/10

- Catalog evidence: Red Lv.3 Rookie Digimon, Vaccine/Reptile, play cost 3,
  2000 DP, red Lv.2 evolution cost 0, rarity C, and four-copy limit. Its sole
  clause is `[On Play]` reveal the top 3 deck cards, add up to one Digimon
  whose name contains `Greymon` except DoruGreymon/BurningGreymon/
  DexDoruGreymon, and one Digimon whose name contains `Omnimon`, then place
  every remaining revealed card at the bottom of the deck in any order.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-007`
  returns Q1284, confirming that when both families are not present, one
  revealed card from either family may still be added. The local card-text
  name rule (§2-3-1-3) defines bracketed name references as substring matches;
  the On Play trigger and reveal/search timing are covered by the corresponding
  glossary/comprehensive timing rules. No errata, restriction, or unresolved
  ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-007.ts` contains one `OnPlay`
  `RevealAdd` action with `revealCount: 3`, two independent count-1 hand
  dispositions, the exact three-name exclusion on the Greymon filter, and
  `rest: "deckBottom"`. It declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-007", compiled)`.
- Primitive and peer evidence: `runRevealAdd` reveals from the source owner's
  deck, evaluates each slot against the full revealed set, marks selected
  instances taken so one card cannot satisfy both slots, returns selected cards
  to hand, and returns all unselected revealed cards to deck bottom. The
  neighboring BT5-001 and BT5-006 modules confirm the set's compiled-IR and
  exclusive-registration conventions; no inherited, Security, once-per-turn,
  optional, cost, or evolution-stack clause applies to BT5-007.
- Behavioral proof: 3 focused tests pass. The positive case adds one Greymon
  and one Omnimon and bottoms the unrelated card; Q1284's one-family case adds
  the sole eligible Greymon and bottoms the two nonmatches; the boundary case
  reveals BT7-064 DoruGreymon, BT4-013 BurningGreymon, and BT9-078 DexDoruGreymon
  and proves none is added while all three return to the deck.
- Defect corrected: none in the card module or shared engine. Added only the
  missing explicit exclusion-boundary assertion to
  `apps/api/src/cards/BT5/BT5-007.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-007.test.ts` — 1 file, 3 tests passed. No shared engine
  seam changed, so no mechanism regression suite was required. Workspace
  `pnpm typecheck` builds shared and passes web typecheck but retains
  pre-existing unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`; it reports no
  BT5-007 errors. Changed-file formatting and `git diff --check` pass.
- Remaining ambiguity: none identified.

## BT5-008 — Gaossmon — 10/10

- Catalog evidence: Red Lv.3 Rookie Digimon, Virus/Reptile, play cost 3, 2000
  DP, red Lv.2 evolution cost 0, rarity C, and four-copy limit. Its complete
  text is `[Your Turn] Your other [Gaossmon] all get +3000 DP.` and
  `[Opponent's Turn] Your opponent can't reduce digivolution costs.`
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-008`
  returns Q1285-Q1287. Q1285-Q1286 establish that the restriction negates
  effects that reduce a digivolution's printed memory cost, including
  Digisorption and Hidden Potential Discovered, while Q1287 distinguishes
  fixed-cost digivolution effects that ignore requirements (which remain
  usable). The local name-matching rule treats `[Gaossmon]` as a name
  substring reference; Your Turn/Opponent's Turn continuous timing and
  controller-relative opponent semantics apply. No errata or unresolved
  ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-008.ts` contains one
  `YourTurn` continuous `Aura` targeting all controller-owned permanents whose
  name contains `Gaossmon`, excluding the source itself, with `modifyDP: 3000`,
  plus one `OpponentsTurn` `RestrictCostReduction` for the opposing seat and
  `costType: "digivolve"`. It declares `coverage: "full"`, `residual: []`,
  and registers exclusively through `registerIrCard("BT5-008", compiled)`.
- Primitive and peer evidence: `timingForTrigger` routes both turn clauses
  through continuous recomputation and its turn-owner guard. `Aura` resolves
  live battle-area targets, applies a continuous DP modifier, and removes it
  when the turn gate lapses; `excludeSelf` compares the source permanent.
  `RestrictCostReduction` records a seat-scoped digivolution block consumed by
  `continuous.blocksCostReduction`. BT5-021 and BT5-033 provide matching
  restriction peers, while BT5-002 provides the neighboring owner-turn aura
  pattern.
- Behavioral proof: 3 focused tests pass. The mixed board proves exactly the
  two other own Gaossmon cards receive +3000, the source is excluded, an
  unrelated own Digimon and an opponent Gaossmon are untouched, and the exact
  DP amount is applied; the source also carries a legal BT5-001 Digi-Egg stack.
  The turn-boundary case proves each aura follows its active owner's turn and
  the cost-reduction block applies only to the source card's opponent during
  Opponent's Turn. The existing restriction case proves the source seat
  remains unblocked and only digivolution reduction is restricted.
- Defect corrected: none in the card module or shared engine. Added only the
  missing mixed-pool/controller and turn-gate behavioral assertions to
  `apps/api/src/cards/BT5/BT5-008.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-008.test.ts --pool=forks --poolOptions.forks.singleFork=true
  --no-file-parallelism` — 1 file, 3 tests passed. The affected
  `irKindTier1Cluster.test.ts` mechanism suite ran 15/16 tests; its sole
  failure is the pre-existing BT1-093 fixture assertion (missing Security IR),
  while all 15 unrelated mechanism tests passed. `pnpm typecheck` builds
  shared and web successfully but retains pre-existing API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-008 errors. Changed TypeScript
  formatting `pnpm exec oxfmt --check
  apps/api/src/cards/BT5/BT5-008.test.ts` and `git diff --check` pass.
- Remaining ambiguity: none identified; Q1287's fixed-cost exception is
  documented by the KB but belongs to the shared digivolution-cost consumer,
  not this card's restriction declaration.

## BT5-009 — Shoutmon — 10/10

- Catalog evidence: Red Lv.3 Rookie Digimon, Data/Mini Dragon, play cost 3,
  1000 DP, red Lv.2 evolution cost 0, rarity U, and four-copy limit. Its
  complete text is `[On Play] Reveal 5 cards from the top of your deck. Add 1
  Digimon card with [Shoutmon] in its name and 1 Digimon card with <Blitz>
  among them to your hand. Place the remaining cards at the bottom of your
  deck in any order.` Its inherited text is `[Your Turn] While this Digimon
  has <Blitz>, it gets +2000 DP.`
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-009`
  returns Q1288-Q1290. Q1288 establishes that either matching category may be
  added when both are not present; Q1289 establishes that two Shoutmon DX
  copies may both be added because each satisfies both categories; Q1290
  identifies the exact two categories. The local rules define <Blitz> as
  permitting an attack while the opponent has 1 or more memory, and the
  inherited Your Turn condition is controller-relative. No errata or
  unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-009.ts` contains one `OnPlay`
  `RevealAdd` revealing exactly 5 cards, adding one Digimon whose name
  contains `Shoutmon` and one Digimon with the `Blitz` keyword, then bottoming
  the remainder. Its inherited `YourTurn` aura grants exactly +2000 DP while
  the host has `Blitz`. It declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-009", compiled)`.
- Primitive and peer evidence: `RevealAdd` evaluates both add slots over the
  revealed cards, tracks selected instances independently (so one card cannot
  be selected twice, while two overlapping copies can satisfy both slots),
  moves selected cards to hand, and returns all remaining revealed cards to the
  deck bottom. The continuous aura uses the same live keyword and turn-owner
  machinery as neighboring BT5 inherited effects. BT5-014 supplies the
  Shoutmon evolution/name peer and BT5-019 supplies the dual Shoutmon/<Blitz>
  peer used by Q1289.
- Behavioral proof: 5 focused tests pass. The positive case verifies one
  Shoutmon and one Blitz card are added and the other three revealed cards are
  bottomed; the inherited-stack case verifies +2000 DP on a Blitz host; the
  Q1289 case verifies two Shoutmon DX copies are both added; the one-category
  boundary verifies the sole Shoutmon is still added and all other revealed
  cards are bottomed; and the turn-boundary case verifies the inherited bonus
  disappears during the opponent's turn. The stack fixture uses BT5-009 under
  BT5-014, proving the inherited source transition rather than an isolated
  card-only fixture.
- Defect corrected: no card or engine defect. Added only the missing category
  boundary and controller-turn assertions to
  `apps/api/src/cards/BT5/BT5-009.test.ts`.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-009.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --no-file-parallelism` — 1 file, 5 tests
  passed. No shared engine seam changed, so no mechanism regression suite was
  required. Workspace `pnpm typecheck` builds shared and web successfully but
  retains the pre-existing unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`; it reports no
  BT5-009 errors. Changed-file formatting and `git diff --check` pass.
- Remaining ambiguity: none identified.

## BT5-010 — Greymon — 10/10

- Catalog evidence: Red Lv.4 Champion Digimon, Vaccine/Dinosaur, play cost 5,
  5000 DP, and a red Lv.3 evolution cost of 2. Its complete text is
  `[When Digivolving] If this Digimon has [Agumon] in its digivolution cards,
  gain 1 memory.` Its inherited text is `[Your Turn] While this Digimon has
  [Omnimon] or [Greymon] (other than [DoruGreymon], [BurningGreymon], or
  [DexDoruGreymon]) in its name, it gets +2000 DP.`
- Knowledge base and rules evidence: `node tools/kb/query.mjs card BT5-010`
  returns the card identity with no knowledge-base entries, so the catalog
  text is the governing contract. The local rules manual's Digivolution Cards
  section (around §4-18) establishes that cards under a Digimon are
  digivolution cards and that their inherited effects are usable by the host;
  its effect-timing guidance defines `[When Digivolving]` as the trigger after
  a successful digivolution and `[Your Turn]` as owner-turn processing. The
  name condition is a case-insensitive substring match in
  `interpreter/conditions.ts`, with explicit `excludeNames` disqualifiers.
- Implementation: `apps/api/src/cards/BT5/BT5-010.ts` contains one
  `WhenDigivolving` action that gains exactly 1 memory when the current stack
  has an `Agumon` source, plus one inherited `YourTurn` aura that modifies the
  host by exactly +2000 DP. The aura matches `Omnimon` or `Greymon` and uses
  `excludeNames` for all three printed exclusions. The module declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-010", compiled)`.
- Primitive and peer/stack evidence: `selfHasInDigivolutionCards` reads the
  host's visible evolution stack, while `selfHasNameContaining` reads the
  current top card name and rejects any matching excluded substring. The
  inherited aura is continuously recomputed and is owner-turn gated. BT5-007
  and BT5-015 provide neighboring Greymon evolution/name interactions; their
  focused suites also pass. The BT5-010 tests use a legal BT5-007 -> BT5-010
  evolution for the memory trigger and real BT5-016/BT5-086 hosts over a
  BT5-010 source card for inherited behavior.
- Behavioral proof: 5 focused tests pass. They prove the Agumon-source memory
  gain, +2000 on both positive name categories, rejection of DoruGreymon,
  BurningGreymon, and DexDoruGreymon using same-card baselines to isolate
  BT5-010's modifier, owner-turn expiry, and no bonus when the inherited source
  is absent. The existing BurningGreymon comparison remains as a peer sanity
  check.
- Defect corrected: the inherited IR previously expressed the exclusions as a
  nested `not` condition that was not honored by the continuous aura path. It
  now uses the supported `excludeNames` field on the positive name predicate,
  preserving the smallest card-local correction. Tests were expanded with all
  positive and negative name boundaries, owner-turn behavior, and missing-source
  coverage.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-010.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --no-file-parallelism` — 1 file, 5 tests
  passed. Affected peer regressions `BT5-007.test.ts` and `BT5-015.test.ts` —
  2 files, 6 tests passed. `pnpm exec oxfmt --check
  apps/api/src/cards/BT5/BT5-010.ts apps/api/src/cards/BT5/BT5-010.test.ts`
  passed. `git diff --check` is required below and is clean. `pnpm typecheck`
  builds shared and web successfully but retains the pre-existing unrelated API
  errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`; it reports no BT5-010 errors.
- Remaining ambiguity: none identified.

## BT5-011 — Meramon — 10/10

- Catalog evidence: Red Lv.4 Champion Digimon, Data/Flame, play cost 5,
  5000 DP, and a red Lv.3 evolution cost of 2. Its complete text is
  `[When Digivolving] 1 of your other Digimon gets +3000 DP for the turn.`
- Knowledge base and rules evidence: `node tools/kb/query.mjs card BT5-011`
  returns `Meramon` with no knowledge-base entries, so the catalog text is the
  governing contract. The local rules manual's digivolution and effect-timing
  guidance establishes the trigger timing, `other` self-exclusion, and the
  current-turn duration. The shared `ModifyDP` primitive carries the declared
  `forTheTurn` duration.
- Implementation: `apps/api/src/cards/BT5/BT5-011.ts` contains one
  `WhenDigivolving` action targeting exactly one own Digimon, excluding the
  source with `excludeSelf`, adding exactly 3000 DP, and declaring
  `duration: "forTheTurn"`. It has `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-011", compiled)`.
- Primitive and peer/stack evidence: targeting applies `controller: "mine"`,
  `kind: ["Digimon"]`, `excludeSelf: true`, and `count: 1`. The focused test
  uses a legal BT1-009 -> BT5-011 evolution and verifies one ally gets +3000,
  a second ally and opponent Digimon remain unchanged, and no-target boards
  resolve without a target.
- Behavioral proof: 2 focused tests pass, proving the positive numeric result,
  exact one-target behavior, controller/self boundaries, and no-valid-target
  handling. The positive test then sweeps the owner-turn boundary through the
  production modifier ledger and recomputes state, proving the +3000 expires.
- Defect corrected: no card or engine defect. Expanded only
  `apps/api/src/cards/BT5/BT5-011.test.ts` with controller and no-target cases.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-011.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --no-file-parallelism` — 1 file, 2 tests
  passed. Exact duration mechanism regression
  `pnpm --filter @aegis/api exec vitest run src/engine/effects/modifiers.test.ts
  --pool=forks --poolOptions.forks.singleFork=true --no-file-parallelism` — 1
  file, 26 tests passed. `pnpm exec oxfmt --check
  apps/api/src/cards/BT5/BT5-011.ts apps/api/src/cards/BT5/BT5-011.test.ts`
  and `git diff --check` pass. `pnpm typecheck` builds shared and web but
  retains unrelated API errors: `EX6-010.test.ts:78` (`abortOnDecline`),
  `interpreter/actions/removal.ts:129,131` (`trackCount`),
  `interpreter/actions/runAction.ts:115-117,286,511,515` (Action/Cost fields
  and implicit `any`), `interpreter/targeting/loose.ts:336` (`sourceRef`), and
  `interpreter/effects/primitives.test.ts:2438` (missing new primitive keys).
- Remaining ambiguity: none identified.

## BT5-012 — Monochromon — 10/10

- Catalog evidence: Red Lv.4 Champion Digimon, Data/Ankylosaur, play cost 6,
  5000 DP, and a red Lv.3 evolution cost of 1. Its complete text is
  `＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon
  to force the opponent to attack it instead.) [When Attacking] Lose 2 memory.`
  It has no inherited or Security text.
- Knowledge base and rules evidence: `node tools/kb/query.mjs card BT5-012`
  returns `Monochromon` with no knowledge-base entries, so the catalog text is
  the governing card contract. `data/kb/rules/comprehensive.md` §16-5-1/2
  defines Blocker as the persistent permission to block, while §15-8-3-1 and
  §15-16-5-1 establish that `[When Attacking] Lose 2 memory` is a trigger-type
  effect at attack declaration. §11-4-1 and §12-1-1 define the opponent's
  Blocker timing and switching the attack target to the blocker.
- Implementation: `apps/api/src/cards/BT5/BT5-012.ts` is compiled IR with one
  static `Blocker` keyword and one `WhenAttacking` `GainMemory` action with
  amount `-2`. It declares `coverage: "full"`, `residual: []`, and registers
  exclusively through `registerIrCard("BT5-012", compiled)`.
- Primitive and peer evidence: the static keyword is consumed by the shared
  continuous keyword ledger and combat legality reader; `eligibleBlockers` and
  `switchDefenderToBlocker` enforce the correct opponent-controlled, unsuspended
  Digimon block boundary, suspension, and target replacement. The shared
  `GainMemory` primitive applies the negative amount to the active game memory.
  BT5-016 provides a nearby compiled Blocker-filter peer, while the combat
  keyword, legality, and attack-integration suites cover printed and granted
  Blocker behavior and the one-block-per-attack rule.
- Behavioral proof: the two focused tests verify the keyword is observable,
  the card loses exactly 2 memory when it attacks, and an opponent's attack can
  be redirected by suspending Monochromon. The redirection assertion observes
  the production block window and final suspension, proving the Blocker choice
  changes the defender rather than merely exposing the keyword. The shared
  conformance tests additionally prove a non-Blocker cannot block, Blocker is
  persistent, and attack timing resolves before blocking.
- Defect corrected: no card or engine defect. Existing source and tests already
  provide reproducible 10/10 evidence; only this audit record was appended.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-012.test.ts --pool=forks
  --poolOptions.forks.singleFork=true --no-file-parallelism` — 1 file, 2 tests
  passed. Affected mechanism/regression command covering Blocker legality,
  keyword extraction, attack integration, comprehensive Blocker rules, and
  When Attacking timing (`keywords.test.ts`, `legality.test.ts`,
  `attackIntegration.test.ts`, `ch16a-security-blocker-draw.test.ts`, and
  `ch15-04-continuous-and-static.test.ts`) — 5 files, 169 tests passed.
  `pnpm typecheck` builds shared and web successfully but retains the same
  unrelated pre-existing API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `interpreter/effects/primitives.test.ts`;
  it reports no BT5-012 errors. `git diff --check` is clean.
- Remaining ambiguity: none identified.

## BT5-013 — Triceramon — 10/10

- Catalog evidence: Red Lv.5 Ultimate Digimon, Data/Ceratopsian, play cost 5,
  8000 DP, standard red Lv.4 evolution cost 3, rarity C, and four-copy limit.
  It has no main, inherited, Security, alternate-evolution, or once-per-turn
  text; its complete executable contract is therefore intentionally empty.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-013`
  returns no entries. No ruling, errata, restriction, or unresolved ambiguity
  changes the catalog contract.
- Implementation: `apps/api/src/cards/BT5/BT5-013.ts` declares `effects: []`,
  `coverage: "full"`, and `residual: []`, and registers exclusively through
  `registerIrCard("BT5-013", compiled)`. Generated runtime data in
  `packages/shared/src/effects/effects.json` independently matches that empty
  executable definition.
- Peer and stack evidence: vanilla peer BT5-023 uses the same empty/full IR
  pattern. BT5-108's focused behavior recognizes BT5-013 as an opposing Lv.5
  Digimon, demonstrating that its static level metadata remains available to
  shared target filters. Ceratopsian is only card identity here; no printed
  trait-dependent behavior requires a mixed-trait interaction or evolution
  stack assertion.
- Behavioral proof: the 2 existing focused tests prove BT5-013 introduces no
  unintended continuous DP modifier and that its registration is complete and
  residual-free. No effect-specific positive, refusal, duration, inherited,
  Security, or once-per-turn case applies to a vanilla card.
- Defect corrected: none. Existing source and tests already provide
  reproducible 10/10 evidence; only this audit record was added.
- Verification: focused `pnpm --filter @aegis/api exec vitest run
  src/cards/BT5/BT5-013.test.ts` — 1 file, 2 tests passed. Full BT5 regression
  — 121 files, 318 tests passed. `git diff --check` passed. Workspace
  `pnpm typecheck` builds shared and web but retains only the known unrelated
  API errors in `EX6-010.test.ts`, interpreter removal/runAction/targeting
  files, and `primitives.test.ts`; it reports no BT5-013 errors.
- Remaining ambiguity: none identified.

## BT5-014 — OmniShoutmon — 10/10

- Catalog evidence: Red Lv.5 Ultimate Digimon, Data/Dragonkin, play cost 8,
  7000 DP, and standard red Lv.4 evolution cost 3. Its main clause lets one of
  your `[Shoutmon]` in the battle area digivolve into this card in hand for a
  memory cost of 4, ignoring its printed evolution requirements. Its inherited
  clause grants `<Security Attack +1>` during your turn while the host has
  `<Blitz>`.
- Knowledge-base and rules evidence: Q1291 excludes the breeding area from the
  alternate evolution; Q1292 confirms the inherited bonus does not require an
  attack declaration; Q1293 confirms the effect-driven evolution is legal by
  its own stated requirements. Local glossary/manual evolution and inherited
  effect rules provide the remaining timing and stack contract. No errata or
  restriction changes the text.
- Implementation: `apps/api/src/cards/BT5/BT5-014.ts` encodes the exact
  `[Shoutmon]` battle-area alternate path, hand destination card, fixed cost 4,
  and ignored printed requirements. Its inherited owner-turn aura grants one
  Security Attack only while the live host has `Blitz`. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-014", compiled)`.
- Primitive, peer, and stack evidence: shared effect-driven digivolution
  targeting enforces controller, battle-area source, exact name, hand card,
  fixed cost, and stack transition. Continuous keyword recomputation reads the
  evolved host's current Blitz state and owner-relative turn. Shared
  digivolution-lock and interpreter/action regressions cover legality and the
  source-to-host transition; no breeding-area shortcut is admitted.
- Behavioral proof: existing focused and mechanism coverage proves the cost-4
  alternate evolution, breeding exclusion, exact Shoutmon gate, Q1292's
  no-attack requirement, owner-turn gate, Blitz condition, and inherited
  Security Attack amount. No optional refusal, deletion, or Security-zone
  effect applies.
- Defect corrected: none. Existing implementation and tests already provide
  reproducible 10/10 evidence; only this audit record was added.
- Verification: focused plus mechanism regressions — 4 files, 285 tests passed;
  full BT5 regression — 121 files, 318 tests passed. Card formatting and
  Oxlint passed, with one pre-existing `no-explicit-any` test warning.
  `git diff --check` passed. Workspace `pnpm typecheck` builds shared and web
  but retains only the known unrelated API errors outside BT5-014.
- Remaining ambiguity: none identified.

## BT5-015 — MetalGreymon: Alterous Mode — 10/10

- Catalog evidence: Red Lv.5 Ultimate Digimon, Vaccine/Cyborg, play cost 8,
  8000 DP, standard red Lv.4 evolution cost 3, and alternate red Lv.5
  evolution cost 1. `[When Digivolving]`, if the stack contains a card with
  `MetalGreymon` in its name, it deletes one opposing Digimon with 4000 DP or
  less. Its inherited owner-turn clause gives a host named `Omnimon` or
  `Greymon` +2000 DP, excluding DoruGreymon, BurningGreymon, and
  DexDoruGreymon.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-015`
  returns no entries. Comprehensive Rules §§4-3-2, 4-3-3, and 15-3 establish
  digivolution-card stack identity and inherited effect acquisition. No
  ruling, errata, restriction, or ambiguity changes the printed clauses.
- Implementation: `apps/api/src/cards/BT5/BT5-015.ts` encodes one
  `WhenDigivolving` delete action gated by a MetalGreymon name in the source
  stack, targeting exactly one opposing Digimon at DP `lte 4000`. Its
  inherited `YourTurn` aura gives +2000 to the live host when its name contains
  Omnimon or Greymon and rejects all three explicit exclusions. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-015", compiled)`.
- Primitive, peer, and stack evidence: `selfDigivolutionStackHasTrait` uses
  name matching over the evolution stack, while target resolution enforces
  opposing controller, Digimon kind, exact count, and the inclusive DP cap.
  The inherited condition reads the current top-card name and owner-relative
  turn. BT5-007, BT5-010, and BT5-016 exercise the same Greymon name/exclusion
  vocabulary and remain green.
- Behavioral proof: 5 focused tests prove deletion at exactly 4000 DP,
  rejection at 4001 DP, no deletion without a MetalGreymon source, +2000 for
  Greymon and Omnimon hosts, rejection of DoruGreymon/BurningGreymon/
  DexDoruGreymon, and removal of the inherited bonus during the opponent's
  turn.
- Defect corrected: none in the IR or engine. The audit added only missing
  focused boundary and owner-turn assertions to `BT5-015.test.ts`.
- Verification: focused BT5-015 — 1 file, 5 tests passed. BT5-007, BT5-010,
  and BT5-016 peer regressions — 3 files, 11 tests passed. Shared capabilities
  ran 285/290 tests; its five failures are pre-existing CAP-E14 Delay and
  CAP-G3 breeding-digivolve cases. Targeted Oxfmt and Oxlint passed, and
  `git diff --check` is clean. Workspace `pnpm typecheck` retains only the
  known unrelated API errors outside BT5-015.
- Remaining ambiguity: none identified.

## BT5-016 — WarGreymon — 10/10

- Catalog evidence: Red Lv.6 Mega Digimon, Vaccine/Dragonkin, play cost 11,
  11000 DP, and red Lv.5 evolution cost 3. `[When Digivolving]`, if its stack
  contains a card named Greymon other than DoruGreymon, BurningGreymon, or
  DexDoruGreymon, it deletes one opposing Digimon with `<Blocker>`. Its
  inherited `[When Attacking]` deletes one opposing Digimon with 3000 DP or
  less.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-016`
  returns no card-specific entries. Local glossary and comprehensive timing,
  evolution-stack, Blocker, and inherited-effect rules govern both clauses.
  No errata, restriction, or unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-016.ts` encodes the qualifying
  Greymon stack-name gate with all three exclusions, an exact opponent Blocker
  delete target, and an inherited When Attacking delete target capped at DP
  3000. It declares `coverage: "full"`, `residual: []`, and registers only
  through `registerIrCard("BT5-016", compiled)`.
- Primitive, peer, and stack evidence: the stack predicate reads named
  digivolution sources and its exclusions; targeting applies opposing
  controller, Digimon kind, keyword or inclusive DP boundary, and count one.
  BT5-010 and BT5-015 cover the same positive/excluded Greymon vocabulary, and
  shared combat keyword regressions cover Blocker identity and attack timing.
- Behavioral proof: 8 focused cases prove full runtime registration, qualifying
  source deletion of a Blocker, rejection of a non-Blocker, inherited deletion
  at exactly 3000 DP, rejection at 3001 DP, and separate rejection of
  DoruGreymon, BurningGreymon, and DexDoruGreymon stack sources.
- Defect corrected: none in the IR or engine. The audit added only the missing
  registration, target-boundary, DP-boundary, and complete exclusion matrix to
  `BT5-016.test.ts`.
- Verification: focused BT5-016 — 1 file, 8 tests passed. BT5-010, BT5-015,
  and combat-keyword regressions — 3 files, 113 tests passed; combined run —
  4 files, 121 tests passed. Targeted Oxfmt and `git diff --check` passed.
  Workspace `pnpm typecheck` retains only the known unrelated API errors
  outside BT5-016; repository-wide card formatting has unrelated baseline
  findings, while the changed test formats cleanly.
- Remaining ambiguity: none identified.

## BT5-017 — ZeigGreymon — 10/10

- Catalog evidence: Red Lv.6 Mega Digimon, Virus/Cyborg, play cost 12,
  11000 DP, and red Lv.5 evolution cost 3. Its main clause grants `<Blitz>`
  when digivolving. Its inherited owner-turn clause allows a host attacking
  with Blitz to also target an opposing unsuspended Digimon.
- Knowledge-base and rules evidence: Q1299 was reviewed and introduces no
  multi-effect ordering change for this card. Comprehensive Rules §4-1-3 and
  §16-16 define the opponent-memory threshold and Blitz window; §15-1-3 keeps
  prohibitions stronger than attack permissions. No errata, restriction, or
  unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-017.ts` encodes the
  When Digivolving Blitz grant and the inherited owner-turn unsuspended-target
  permission conditioned on a Blitz attack. It declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-017", compiled)`.
- Primitive, peer, and stack evidence: effect-driven keyword grant follows the
  legal red Lv.5-to-Lv.6 stack transition and opens the shared optional Blitz
  attack window only after memory crosses to the opponent. Attack legality
  extends the target set to unsuspended opposing Digimon only while the
  inherited source, owner-turn gate, and Blitz context are all present.
- Behavioral proof: 6 focused tests pin the complete catalog/IR contract,
  legal evolution and Blitz grant, positive Blitz attack paths, the exact
  memory-0 negative boundary, inherited targeting of an unsuspended Digimon,
  and rejection during the opponent's turn.
- Defect corrected: none in the IR or engine. The audit added only missing
  catalog, memory-boundary, and inherited turn-boundary assertions to
  `BT5-017.test.ts`.
- Verification: focused BT5-017 — 1 file, 6 tests passed. Blitz/conformance
  regressions — 31 tests passed. Targeted Oxfmt and `git diff --check` passed.
  Workspace `pnpm typecheck` retains only the known unrelated API errors in
  EX6-010, interpreter action/removal/runAction/targeting files, and the
  primitive capability fixture.
- Remaining ambiguity: none identified.

## BT5-018 — Dorbickmon — 10/10

- Catalog evidence: Red Lv.6 Mega Digimon, Data/Dragonkin, play cost 11,
  11000 DP, and red Lv.5 evolution cost 3. `[When Attacking]`, the controller
  may trash one red Digimon card from hand to add that exact card's DP to
  Dorbickmon for the turn.
- Knowledge-base and rules evidence: Q1294 confirms that separate activations
  during the same turn accumulate their DP modifiers. Local When Attacking,
  optional-cost, zone-movement, and turn-duration rules govern the remaining
  text. No errata, restriction, or unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-018.ts` uses an optional Trash
  action filtering exactly one own red Digimon in hand, followed by
  `AddDPFromTrashedCard` targeting self with `forTheTurn` duration. It reads
  the actual paid card's DP and creates independent accumulating modifiers.
  The module declares `coverage: "full"`, `residual: []`, and registers only
  through `registerIrCard("BT5-018", compiled)`.
- Primitive, peer, and stack evidence: cost resolution preserves the selected
  trashed instance for the dependent DP action, rejects wrong-color/non-Digimon
  cards, and aborts cleanly on optional refusal. Shared modifier bookkeeping
  accumulates distinct activations and sweeps them at owner-turn end. The card
  has no inherited, Security, trait-dependent, or alternate-stack clause.
- Behavioral proof: 4 focused tests prove +3000 from a valid red Digimon,
  Q1294 accumulation of +3000 then +2000, rejection of an ineligible blue
  Digimon, optional refusal with unchanged hand/trash/DP, and removal of the
  accumulated modifier at turn end.
- Defect corrected: none in the IR or engine. The audit added only missing
  eligibility, refusal, accumulation, and duration assertions to
  `BT5-018.test.ts`.
- Verification: focused BT5-018 — 1 file, 4 tests passed. Shared capability
  regressions filtered for DP/trashed behavior — 22 tests passed. Targeted
  formatting and `git diff --check` passed. Workspace `pnpm typecheck`
  retains only the known unrelated API errors outside BT5-018.
- Remaining ambiguity: none identified.

## BT5-019 — Shoutmon DX — 10/10

- Catalog evidence: Red Lv.6 Mega Digimon, Data/Composite, play cost 12,
  12000 DP, with red Lv.5 evolution cost 4 and red Lv.6 evolution cost 2.
  Its first `[When Digivolving]` grants `<Blitz>`. Its second may place one red
  Digimon from hand at the top of its digivolution cards, then deletes one
  opposing Digimon with 5000 DP or less for each OmniShoutmon or ZeigGreymon
  in its digivolution cards.
- Knowledge-base and rules evidence: Q1289 confirms Shoutmon DX can satisfy
  both Shoutmon-name and Blitz search slots. Q1295 allows a red Digimon of any
  level to be placed. Q1296-Q1297 describe the resulting de-digivolution
  stack. Q1298-Q1299 establish simultaneous When Digivolving ordering and that
  the second effect resolves before counter timing even when Blitz goes first.
- Implementation: `apps/api/src/cards/BT5/BT5-019.ts` uses two
  WhenDigivolving effects: a Blitz keyword grant and an optional `PlaceUnder`
  from own hand filtered to red Digimon with `asTop: true`, followed by a
  count-one opponent delete capped at DP 5000 and scaled per matching named
  source. It declares `coverage: "full"`, `residual: []`, and registers only
  through `registerIrCard("BT5-019", compiled)`.
- Primitive, peer, and stack evidence: placement preserves exact selected
  instance identity and top-of-sources order independent of normal evolution
  level. The scaled delete counts OmniShoutmon and ZeigGreymon sources after
  placement, resolves distinct targets, and remains independent of optional
  refusal. BT5-016, BT5-017, BT5-109, BT5-110, and the historical Shoutmon DX
  deck cover related name, Blitz, stack, and ordering interactions.
- Behavioral proof: 6 focused tests prove Blitz, inclusive DP 5000/rejection
  at 5001, one deletion per matching source, exact two-target scaling, optional
  refusal with unchanged hand/stack while deletion continues, exact top
  placement of red Lv.3 and Lv.7 cards per Q1295, and rejection of a blue hand
  card.
- Defect corrected: none in the IR or engine. The audit added only missing
  scaling, refusal, top-order, arbitrary-level, and color-filter assertions to
  `BT5-019.test.ts`.
- Verification: focused BT5-019 — 1 file, 6 tests passed. Relevant BT5 and
  historical-deck regressions — 6 files, 27 tests passed. Targeted Oxfmt,
  Oxlint, and `git diff --check` passed. Workspace `pnpm typecheck` retains
  only the known unrelated API errors outside BT5-019; repository-wide card
  formatting has unrelated baseline findings while these files are clean.
- Remaining ambiguity: none identified.

## BT5-020 — Gabumon — 10/10

- Catalog evidence: Blue Lv.3 Rookie Digimon, Data/Reptile, play cost 3,
  2000 DP, and blue Lv.2 evolution cost 0. `[On Play]` reveals the top three
  cards, adds one Digimon with Garurumon in its name and one Digimon with
  Omnimon in its name, then places every unselected card at deck bottom in any
  order.
- Knowledge-base and rules evidence: Q1301 confirms that when only one name
  category is present, that matching card may still be added. Local On Play,
  reveal/search, name-substring, and deck-bottom rules govern the remaining
  text. No errata, restriction, or unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-020.ts` uses a residual-free
  `RevealAdd` with `revealCount: 3`, two independent count-one Digimon slots
  matching Garurumon and Omnimon names, and `rest: "deckBottom"`. It declares
  `coverage: "full"` and registers exclusively through
  `registerIrCard("BT5-020", compiled)`.
- Primitive, peer, and stack evidence: RevealAdd evaluates both slots over the
  revealed set, prevents reuse of one card instance across slots, permits a
  one-slot partial result per Q1301, moves selected cards to hand, and bottoms
  all others. Shared RevealAdd regressions cover slot/disposition semantics;
  BT5-024 proves BT5-020's legal evolution-source and inherited-host peer
  interaction.
- Behavioral proof: 5 focused tests prove full residual-free registration,
  one Garurumon plus one Omnimon, Garurumon-only, Omnimon-only, and no-match
  outcomes, including exact hand counts and deck-bottom remainder identities.
- Defect corrected: none in the IR or engine. The audit added only the missing
  registration, second partial-category, and no-match assertions to
  `BT5-020.test.ts`.
- Verification: focused BT5-020 — 1 file, 5 tests passed. Shared RevealAdd
  regression — 7 tests passed; BT5-024 peer regression — 3 tests passed.
  Targeted Oxfmt and `git diff --check` passed. Workspace `pnpm typecheck`
  retains only the known unrelated API errors outside BT5-020; repository-wide
  card formatting has unrelated baseline findings while these files are clean.
- Remaining ambiguity: none identified.

## BT5-021 — Syakomon — 10/10

- Catalog evidence: Blue Lv.3 Rookie Digimon, Virus/Crustacean, play cost 3,
  3000 DP, and blue Lv.2 evolution cost 0. Its only effect is
  `[Opponent's Turn] Your opponent can't reduce digivolution costs.` It has no
  inherited or Security text.
- Knowledge-base and rules evidence: Q1302-Q1303 establish that the effect
  blocks numerical reductions such as Digisorption and Hidden Potential
  Discovered. Q1304 distinguishes a specified-cost, requirement-ignoring
  digivolution from a reduction and permits it. Q6869, Q6872, Q6875, and Q7148
  confirm that an effect-driven digivolution may still occur while its cost
  reduction is suppressed. No errata, restriction, or unresolved ambiguity
  applies.
- Implementation: `apps/api/src/cards/BT5/BT5-021.ts` has one
  `OpponentsTurn` effect applying `RestrictCostReduction` to the opponent for
  the `digivolve` cost type with permanent continuous duration. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-021", compiled)`.
- Primitive and stack evidence: continuous recomputation scopes the
  restriction to the source card's opponent and only during that opponent's
  turn; a Syakomon buried as a digivolution card has no main effect. The
  production digivolution path now consults the restriction for ordinary,
  replacement, intrinsic, interactive, and Digisorption reductions using the
  evolving permanent's controller seat. Explicit specified-cost effect
  digivolutions remain legal and pay that specified cost, matching Q1304.
- Behavioral proof: 4 focused tests prove the opponent-turn, seat, and cost
  type boundaries; clearing on Syakomon's controller's turn; a real
  Digisorption evolution rejected when full printed cost is unaffordable; no
  effect from Syakomon only in an evolution stack; and a successful
  fixed-cost, requirement-ignoring effect evolution while the restriction is
  active.
- Defect corrected: the restriction ledger was populated, but the real paid
  digivolution path still applied replacement, intrinsic, interactive, and
  Digisorption reductions. `GameEngine.ts` now suppresses those reduction
  paths while preserving specified-cost digivolutions.
- Verification: focused BT5-021 and relevant peers/mechanisms — 6 files, 172
  tests passed. The targeted RestrictCostReduction IR regression also passed
  (1 passed, 14 skipped). The changed card test passes targeted Oxfmt and
  `git diff --check` passes; the shared file retains unrelated pre-existing
  Oxfmt findings outside the changed cost-reduction lines.
  Workspace `pnpm typecheck` built shared and typechecked shared/web, then
  retained only the known unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-022 — Bulucomon — 10/10

- Catalog evidence: Blue Lv.3 Rookie Digimon, Data/Mini Dragon, play cost 4,
  3000 DP, and blue Lv.2 evolution cost 0. It has no main or Security text.
  Its inherited effect is `[Your Turn][Once Per Turn] When you trash a
  digivolution card of 1 of your opponent's Digimon, gain 1 memory.`
- Knowledge-base and rules evidence: Q1305 confirms that returning a Digimon
  to hand does not treat its digivolution cards as trashed. Q1306 confirms
  that trashing cards from two opposing Digimon at the same time grants only
  1 memory because the inherited effect is once per turn. Local inherited,
  effect-attribution, subtrigger, and per-turn reset rules govern the remaining
  text. No errata, restriction, or unresolved ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-022.ts` installs an inherited
  `whenDigivolutionTrashed` subtrigger only during `YourTurn`, filtered to an
  opponent-controlled Digimon and gated by `triggerByYourEffect`. Its action
  gains exactly 1 memory. Both the watcher and outer effect carry the required
  once-per-turn identity. The module declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-022", compiled)`.
- Primitive, peer, and stack evidence: the subtrigger receives the affected
  permanent and effect seat, so it distinguishes the opponent's host and the
  controller's effect attribution. Bouncing a stack emits no source-trash
  event. The shared turn ledger caps multiple eligible events and explicitly
  resets for a new turn. BT6-002 provides a peer inherited watcher over the
  same trash-digivolution event and stack topology.
- Behavioral proof: 5 focused tests prove a legal inherited host gaining 1
  memory, rejection when the opponent trashes their own source, inactivity
  during the opponent's turn, Q1305 bounce behavior, and Q1306's one-memory
  cap across two opposing Digimon. Shared subtrigger regression proves the
  once-per-turn reset on a later turn.
- Defect corrected: none in the IR or engine. The audit added only the missing
  opponent-turn negative assertion to `BT5-022.test.ts`.
- Verification: focused BT5-022, BT6-002 peer, and shared subtrigger suite — 3
  files, 31 tests passed. Targeted Oxfmt and `git diff --check` passed.
  Workspace `pnpm typecheck` retains only the known unrelated API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-023 — Gesomon — 10/10

- Catalog evidence: Blue Lv.4 Champion Digimon, Virus/Mollusk, play cost 3,
  4000 DP, and blue Lv.3 evolution cost 2. It has no main, inherited, or
  Security text.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-023`
  returns the card identity with no QA, errata, restriction, or ruling entries.
  Because the card is vanilla, no effect-specific rules or ambiguity apply.
- Implementation: `apps/api/src/cards/BT5/BT5-023.ts` contains an empty effect
  list with `coverage: "full"` and `residual: []`. It registers exclusively
  through `registerIrCard("BT5-023", compiled)` and has no duplicate legacy
  registration.
- Peer and stack evidence: BT5-013 and BT5-027 use the same residual-free
  vanilla-card representation. BT5-020 exercises BT5-023 as an unmatched
  revealed card that remains in the deck-bottom result, and BT5-108 exercises
  it as a real Lv.4 board target, without surfacing any unintended effect.
- Behavioral proof: the 2 existing focused tests prove unchanged base DP with
  no continuous effect and a defined runtime module with complete,
  residual-free coverage. No additional test was necessary for a correct
  vanilla implementation.
- Defect corrected: none. No source or test file changed.
- Verification: focused BT5-023 plus BT5-020 and BT5-108 peers — 3 files, 10
  tests passed. `git diff --check` passed. Workspace `pnpm typecheck` retains
  only the known unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-024 — Garurumon — 10/10

- Catalog evidence: Blue Lv.4 Champion Digimon, Vaccine/Beast, play cost 5,
  5000 DP, and blue Lv.3 evolution cost 2. `[When Digivolving]` gains 1 memory
  if this Digimon has Gabumon in its digivolution cards. Its inherited
  `[All Turns]` effect gives the host +1000 DP while its name contains
  Garurumon or Omnimon.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-024`
  returns no card-specific QA, errata, restriction, or ruling entries. Local
  When Digivolving, digivolution-card, exact-name source, name-substring,
  inherited-effect, and continuous DP rules govern the printed clauses.
- Implementation: `apps/api/src/cards/BT5/BT5-024.ts` has a
  `WhenDigivolving` GainMemory action conditioned by an exact Gabumon card in
  the source stack, plus an inherited `AllTurns` self Aura of +1000 DP gated
  by the live host name containing Garurumon or Omnimon. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-024", compiled)`.
- Primitive, peer, and stack evidence: source inspection reads the actual
  digivolution stack and exact Gabumon identity, while the inherited aura
  reads the live top-card name and persists on either player's turn. A legal
  blue stack from BT5-020 Gabumon through BT5-024, BT1-040 WereGarurumon,
  BT5-031 MetalGarurumon, and BT5-086 Omnimon preserves the source order and
  inherited bonus. BT5-002, BT5-029, BT5-031, BT5-086, and exact-name
  mechanism tests cover related name and evolution behavior.
- Behavioral proof: 6 focused tests prove the Gabumon-source memory gain and
  no-source negative; Omnimon and Garurumon-name positives; persistence during
  the opponent's turn; an unrelated-name negative; and the full legal
  Gabumon-to-Omnimon evolution stack with exact +1000 DP.
- Defect corrected: none in the IR or engine. The audit added only the missing
  Garurumon-name, all-turn, unrelated-name, and realistic-stack assertions to
  `BT5-024.test.ts`.
- Verification: focused BT5-024 plus five relevant peer/mechanism files — 6
  files, 22 tests passed. Targeted Oxfmt and `git diff --check` passed.
  Workspace `pnpm typecheck` retains only the known unrelated API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-025 — Paledramon — 10/10

- Catalog evidence: Blue Lv.4 Champion Digimon, Data/Dragon, play cost 5,
  4000 DP, and blue Lv.3 evolution cost 2. Its sole effect is
  `[When Digivolving] Trash up to 2 digivolution cards from the bottom of 1
  of your opponent's Digimon.` It has no inherited or Security text.
- Knowledge-base and rules evidence: the card query returns no card-specific
  QA, errata, restriction, or ruling entries. Comprehensive §1-3-6 requires at
  least one card when a choice can be made; §15-10-2-2 permits choosing fewer
  than the printed maximum for `up to X`; and §4-26-3 requires bottom-stack
  processing to start at the actual bottom. Thus an eligible stack permits
  exactly 1 or 2, never 0, while a source-free target is unaffected.
- Implementation: `apps/api/src/cards/BT5/BT5-025.ts` targets exactly one
  opponent Digimon with `TrashDigivolution`, amount 2, `fromTop: false`, and
  the new explicit `upTo: true` choice. It declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-025", compiled)`.
- Primitive and stack evidence: the shared TrashDigivolution seam clamps the
  maximum to the target's available stack, makes the first eligible source
  mandatory, and asks whether to trash each additional source. It always
  takes a bottom or top prefix rather than allowing an illegal skipped card.
  The dedicated trash primitive preserves instance ownership, moves the
  selected sources to trash, and emits the source-trash event for inherited
  watchers such as BT5-022.
- Behavioral proof: 5 focused tests prove two bottom sources, the one-source
  clamp, exact bottom-to-top trash identities, the opponent-only controller
  boundary, a source-free target, and the choice to stop after exactly one of
  three available sources while retaining the upper two in order.
- Defect corrected: the prior IR deterministically trashed the maximum and
  could not represent the legal choice of only one source. The audit added an
  `upTo` field to `TrashDigivolutionAction`, implemented prefix-preserving
  count choice in the shared interpreter, and marked BT5-025 accordingly.
- Verification: focused BT5-025 — 5 tests passed; full interpreter — 183
  passed; shared primitives — 136 passed; targeted TrashDigivolution mechanic
  — 1 passed. Shared package build passed. Targeted Oxfmt and
  `git diff --check` passed. The full mechanic file additionally passed 116
  tests and retained two unrelated failures: a BT15-020 timeout and the
  pre-existing Digi-Burst shape finding for BT7-040, ST4-13, and ST6-13.
  Workspace typecheck retains only the known unrelated API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-026 — Coelamon — 10/10

- Catalog evidence: Blue Lv.4 Champion Digimon, Data/Ancient Fish, play cost
  6, 5000 DP, and blue Lv.3 evolution cost 1. It has the static `<Blocker>`
  keyword and `[When Attacking] Lose 2 memory.` It has no inherited or
  Security text.
- Knowledge-base and rules evidence: the card query returns no card-specific
  QA, errata, restriction, or ruling entries. Comprehensive §15-16-5-1 makes
  When Attacking trigger on this card's attack declaration; §16-5 and §12-1
  define Blocker's optional attack-target switch, eligibility, suspension,
  and one-block processing.
- Implementation: `apps/api/src/cards/BT5/BT5-026.ts` exposes a static Blocker
  keyword and a `WhenAttacking` GainMemory action with amount -2. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-026", compiled)`.
- Primitive, peer, and combat evidence: the continuous keyword reader makes
  only an unsuspended Blocker eligible; accepting the block suspends Coelamon
  and changes the attack target, while declining preserves the player target.
  The When Attacking action is sourced from Coelamon itself, so an opponent's
  attack into its Blocker window cannot apply the -2 memory. BT5-012 is the
  same Blocker-plus-memory-loss peer, and the chapter 11, 12, and 16a
  conformance suites prove the shared declaration, decline, suspension,
  redirection, and security boundaries.
- Behavioral proof: the 2 focused tests prove Coelamon has Blocker, loses
  exactly 2 memory on its own attack, can accept an opponent's block window,
  becomes suspended, redirects combat away from security, and does not lose
  memory merely because the opponent attacked. The audit only added the final
  observable redirection/security/memory assertions to the existing test;
  redundant new cases were unnecessary because shared conformance covers them.
- Defect corrected: none in the IR or engine.
- Verification: focused BT5-026, BT5-012 peer, and three combat conformance
  files — 5 files, 43 tests passed. Targeted Oxfmt and `git diff --check`
  passed. Workspace `pnpm typecheck` retains only the known unrelated API
  errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-027 — MarineDevimon — 10/10

- Catalog evidence: Blue Lv.5 Ultimate Digimon, Virus/Aquabeast, play cost 6,
  7000 DP, and blue Lv.4 evolution cost 2. It has no main, inherited, or
  Security text.
- Knowledge-base and rules evidence: `node tools/kb/query.mjs card BT5-027`
  returns the card identity with no QA, errata, restriction, or ruling entries.
  Because the card is vanilla, no effect-specific rule or ambiguity applies.
- Implementation: `apps/api/src/cards/BT5/BT5-027.ts` contains an empty effect
  list with `coverage: "full"` and `residual: []`. It registers exclusively
  through `registerIrCard("BT5-027", compiled)` and contains no duplicate
  legacy registration.
- Peer and stack evidence: BT5-013 and BT5-023 use the same residual-free
  vanilla representation and tests. BT5-027 has no trait filter, inherited
  effect, timing, choice, or stack-dependent behavior requiring an additional
  evolution scenario; ordinary blue Lv.4-to-Lv.5 legality is catalog-driven.
- Behavioral proof: the 2 existing focused tests prove unchanged base DP with
  no continuous behavior and a defined runtime module with complete,
  residual-free coverage. No additional test was necessary for a correct
  vanilla implementation.
- Defect corrected: none. No source or test file changed.
- Verification: focused BT5-027 plus BT5-013 and BT5-023 vanilla peers — 3
  files, 6 tests passed. `git diff --check` passed. Workspace
  `pnpm typecheck` retains only the known unrelated API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-028 — CrysPaledramon — 10/10

- Catalog evidence: Blue Lv.5 Ultimate Digimon, Data/Dragonkin, play cost 8,
  7000 DP, and blue Lv.4 evolution cost 3. `[When Digivolving]` trashes the
  bottom digivolution card of all opposing Digimon. Its inherited `[Your
  Turn]` effect grants `<Security Attack +1>` while the opponent has a Digimon
  with no digivolution cards in play.
- Knowledge-base and rules evidence: the card query returns no card-specific
  QA, errata, restriction, or ruling entries. Local When Digivolving,
  all-target processing, bottom-stack, inherited, Your Turn, continuous
  condition, and Security Attack rules govern the two clauses.
- Implementation: `apps/api/src/cards/BT5/BT5-028.ts` uses a
  `TrashDigivolution` action targeting all opponent Digimon that have a source,
  amount 1 from the bottom. Its inherited YourTurn action grants the host
  SecurityAttack amount 1 while `opponentHas` a battle-area Digimon whose
  source state is `none`. It declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-028", compiled)`.
- Primitive, peer, and stack evidence: all-target resolution processes every
  matching opponent permanent independently, ignores source-free permanents,
  and never includes the controller's board. Continuous recomputation reads
  the live opponent stack state and removes the inherited keyword outside the
  owner's turn. The focused board uses legal blue Lv.4-to-Lv.5 stacks, while
  BT5-032 and the historical Hexeblaumon deck cover related source-stripping
  and source-free-opponent interactions.
- Behavioral proof: 5 focused tests prove the exact bottom source of every
  sourced opposing Digimon is trashed, mixed source-free opponents are
  unchanged, the controller's own stack is excluded, the inherited condition
  has positive and negative states, dynamically appears and disappears with
  source state, is inactive on the opponent's turn, and produces two actual
  security checks against neutral vanilla security Digimon.
- Defect corrected: none in the IR or engine. The audit strengthened only the
  previously missing controller, mixed-board, dynamic-turn, and observable
  Security Attack assertions in `BT5-028.test.ts`.
- Verification: focused BT5-028 — 5 tests passed; BT5-032 peer and historical
  Hexeblaumon deck — 4 tests passed; targeted TrashDigivolution mechanic and
  interpreter subsets — 5 tests passed. Targeted Oxfmt and
  `git diff --check` passed. Workspace `pnpm typecheck` retains only the known
  unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-029 — WereGarurumon: Sagittarius Mode — 10/10

- Catalog evidence: Blue Lv.5 Ultimate Digimon, Vaccine/Beastkin, play cost
  8, 8000 DP, with blue Lv.4 evolution cost 3 and blue Lv.5 evolution cost 1.
  During its owner's turn it gains `<Jamming>` while a Digimon card with
  WereGarurumon in its name is in its digivolution cards. Its inherited
  `[All Turns]` effect gives the host +1000 DP while its name contains
  Garurumon or Omnimon.
- Knowledge-base and rules evidence: the card query returns no card-specific
  QA, errata, restriction, or ruling entries. Local Your Turn, Jamming,
  digivolution-source name-substring, inherited, All Turns, live host-name,
  and continuous DP rules govern the clauses.
- Implementation: `apps/api/src/cards/BT5/BT5-029.ts` has a YourTurn self Aura
  granting Jamming while `selfDigivolutionStackHasTrait` matches a source name
  containing WereGarurumon. Its inherited AllTurns self Aura adds 1000 DP
  while the live top name contains Garurumon or Omnimon. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-029", compiled)`.
- Primitive, peer, and stack evidence: the stack-name condition inspects
  Digimon cards below the current top and uses substring matching, while the
  inherited condition reads the current host name. A legal alternate stack
  uses BT5-020 Gabumon, BT5-024 Garurumon, BT1-040 WereGarurumon, then the
  printed blue Lv.5-to-Lv.5 cost-1 evolution into BT5-029. BT5-002 and BT5-024
  cover the same Garurumon/Omnimon host-name vocabulary, and Jamming
  conformance proves survival against a stronger Security Digimon.
- Behavioral proof: 4 focused tests prove Jamming with a WereGarurumon source,
  no Jamming with an absent or wrong-name source, removal on the opponent's
  turn, the legal alternate evolution stack, inherited +1000 DP on both
  Garurumon and Omnimon hosts across both turns, and an unrelated-name
  negative.
- Defect corrected: none in the IR or engine. The audit added only missing
  alternate-stack, name-boundary, turn-boundary, Omnimon, and unrelated-host
  assertions to `BT5-029.test.ts`.
- Verification: focused BT5-029 plus BT5-002 and BT5-024 peers — 3 files, 14
  tests passed. Targeted Jamming conformance and interpreter subsets — 4 tests
  passed. Targeted Oxfmt and `git diff --check` passed. Workspace
  `pnpm typecheck` retains only the known unrelated API errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-030 — Neptunemon — 10/10

- Catalog evidence: Blue Lv.6 Mega Digimon, Vaccine/Shaman/Olympos XII, play
  cost 10, 10000 DP, and blue Lv.5 evolution cost 2. Its sole effect is
  `[Opponent's Turn] This Digimon can't be attacked.` It has no inherited or
  Security text.
- Knowledge-base and rules evidence: Q1307 establishes that a granted Blocker
  may still switch an attack onto Neptunemon. Q1308 forbids BT4-090 Chaosmon's
  When Digivolving effect from initially choosing it as an attack target.
  Q1309 permits BT4-075 Blastmon's post-declaration effect to switch the target
  onto it. These rulings distinguish choosing a target at declaration from a
  later target switch.
- Implementation: `apps/api/src/cards/BT5/BT5-030.ts` applies a permanent
  `cantBeAttacked` self restriction under `isOpponentsTurn`. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-030", compiled)`.
- Primitive, peer, and stack evidence: declaration legality consults the
  defender's `cantBeAttacked` restriction for normal and effect-driven attack
  declarations. Blocker and Blastmon target switches occur after declaration
  and intentionally do not re-run that initial-target restriction. A legal
  BT5-029 blue Lv.5-to-BT5-030 stack proves the live top card receives the
  opponent-turn restriction. Real BT4-090, BT4-075, and inherited Blocker
  modules exercise the three ruling paths.
- Behavioral proof: 6 focused tests prove direct opponent attack rejection,
  controller-turn inactivity, the legal evolution stack, Q1307 Blocker
  acceptance and security avoidance, Q1308 rejection of Chaosmon's
  effect-driven target, and Q1309 Blastmon redirection. The Q1309 proof uses
  nonempty security and a 20000-DP Neptunemon, requiring Blastmon to disappear
  in battle while security remains untouched; it cannot pass merely because
  the player had no security.
- Defect corrected: none in the IR or engine. The audit added the missing
  card-specific ruling and evolution-stack proofs to `BT5-030.test.ts`.
- Verification: focused BT5-030, BT4-075 and BT4-090 peers, combat legality,
  and restriction cluster — 5 files, 46 tests passed. Targeted Oxfmt and
  `git diff --check` passed. Workspace `pnpm typecheck` retains only the known
  unrelated API errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and `primitives.test.ts`.
- Remaining ambiguity: none identified.

## BT5-031 — MetalGarurumon — 10/10

- Catalog evidence: Blue Lv.6 Mega Digimon, Data/Cyborg, play cost 11,
  11000 DP, and blue Lv.5 evolution cost 3. Its `[When Digivolving]`
  effect requires a Digimon card with Garurumon in its name, other than
  KendoGarurumon, in its digivolution cards; it then returns exactly 1
  opposing Digimon with an `[On Deletion]` effect to the bottom of its
  owner's deck and trashes all of that Digimon's digivolution cards. Its
  inherited `[When Attacking][Once Per Turn]` effect gains 1 memory.
- Knowledge-base and rules evidence: BT5-031 has no dedicated QA or errata,
  so the catalog text is controlling. EX1-021 Q3208 answers the identical
  “Digimon with an `[On Deletion]` effect” targeting question and confirms
  that an inherited or externally gained `[On Deletion]` effect qualifies.
  The inherited-effect, trigger-timing, once-per-turn, return-to-deck, and
  source-disposal rules govern the remaining clauses.
- Implementation: `apps/api/src/cards/BT5/BT5-031.ts` encodes the evolution
  trigger as one deck-bottom `Return`, limited to an opposing Digimon whose
  live text has `[On Deletion]`, and gates it on a Garurumon source with the
  exact KendoGarurumon exclusion. The return primitive performs the required
  source disposal. The inherited effect is a once-per-turn `WhenAttacking`
  `GainMemory` action. The module declares `coverage: "full"`, an empty
  `residual`, and registers exclusively through
  `registerIrCard("BT5-031", compiled)`.
- Primitive and peer evidence: live permanent text matching now includes
  actual inherited effect headers and duration-scoped named effects granted
  to the permanent, while preserving the OR semantics of mixed
  `nameOrTrait` filters. The primitive exposes grants anchored to the live
  top-card instance, so grants disappear with their host and cannot leak to
  another permanent. EX1-021 exercises the same ruling family; BT15-068
  provides a real external `[On Deletion] Lose 1 memory` grant. The canonical
  return path places the top card at deck bottom and sends its sources to
  trash.
- Behavioral proof: 5 focused tests prove the ordinary printed-effect target
  and source disposal, the exact KendoGarurumon-only negative, an inherited
  `[On Deletion]` target, a real externally granted `[On Deletion]` target,
  and the inherited memory effect. The attack case performs two attacks in
  one turn after a canonical unsuspend and observes only one memory gain,
  proving the per-turn budget rather than merely the first activation.
- Defect corrected: the card IR was already structurally faithful, but live
  target matching previously inspected only the top card's printed text and
  therefore rejected inherited and gained `[On Deletion]` effects contrary
  to Q3208. The audit added the smallest reusable live-text/grant lookup and
  its primitive completeness registration, plus the missing behavioral
  coverage in `BT5-031.test.ts`.
- Verification: focused BT5-031, EX1-021 and BT15-068 peers, the complete
  interpreter suite, and the primitive suite — 5 files, 328 tests passed.
  Changed-file Oxlint completed with only the pre-existing `no-shadow`
  warning in `permanent.ts:505`; `git diff --check` passed. Workspace
  `pnpm typecheck` was rerun: shared and web pass, while API retains only the
  known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and the pre-existing primitive
  completeness omissions.
- Remaining ambiguity: none identified.

## BT5-032 — Hexeblaumon — 10/10

- Catalog evidence: Blue Lv.6 Mega Digimon, Data/Magic Knight, play cost 12,
  11000 DP, and blue Lv.5 evolution cost 3. On attack it trashes up to 2
  digivolution cards from the bottom of 1 opposing Digimon, then gains
  `<Jamming>` for the turn if the opponent has a Digimon with no
  digivolution cards. During all turns, opposing Digimon with no
  digivolution cards cannot attack or block.
- Knowledge-base and rules evidence: Q1310 confirms the sequential timing:
  trashing the last sources during the attack makes the subsequent Jamming
  condition true for that same attack. Q1311 confirms that losing sources
  after attack declaration does not stop an attack already in progress.
  Q1312 confirms that a source-free Digimon appearing only after the When
  Attacking effect resolved does not retroactively grant Jamming. CR §1-3-6
  requires at least one choice for “up to” when an eligible card exists, so
  the legal voluntary range here is 1–2 sources rather than 0–2.
- Implementation: `apps/api/src/cards/BT5/BT5-032.ts` has a sequential
  `WhenAttacking` `TrashDigivolution` from the bottom followed by conditional
  self `GainKeyword` for the turn. The trash action now carries `upTo: true`,
  matching the printed variable count. Two persistent opposing auras apply
  attack and block restrictions to Digimon whose live stacks have no
  digivolution cards. The module declares `coverage: "full"`, `residual: []`,
  and registers exclusively through `registerIrCard("BT5-032", compiled)`.
- Primitive, peer, and ruling evidence: the shared up-to source-trash seam
  selects the required first bottom card and offers each additional bottom
  card separately, preserving the bottom prefix and allowing the legal 1–2
  range. Conditions are evaluated after the preceding action resolves, which
  implements Q1310, while the keyword is a turn-duration grant rather than a
  continuous aura, which implements Q1312. Attack/block restrictions are
  consulted at declaration/selection time, so Q1311 does not rewind an attack
  already underway. BT5-025 exercises the same variable-count bottom-source
  mechanic, and BT1-101 covers source trashing from Security.
- Behavioral proof: 4 focused tests prove two bottom sources are trashed and
  immediately enable Jamming, a remaining third source prevents Jamming,
  selecting only one of two sources preserves the upper source and does not
  grant Jamming, and source-free opposing Digimon receive both restrictions
  only while Hexeblaumon remains in play. The historical deck regression was
  updated to accept the newly explicit optional continuation and remains
  green.
- Defect corrected: the IR used a fixed `amount: 2` despite the printed “up
  to 2,” so the player could not legally stop after the first bottom source.
  Adding `upTo: true` routes the card through the already-audited optional
  continuation without changing bottom-order semantics. Tests now explicitly
  accept or decline that continuation as appropriate.
- Verification: focused BT5-032, historical deck, BT5-025, BT1-101,
  primitive, and continuous suites — 6 files, 180 tests passed. The delegated
  security/restriction conformance matrix also passed 41/41. Targeted Oxfmt
  and `git diff --check` pass; Oxlint reports only the pre-existing
  `no-explicit-any` warning in the historical test. Workspace typecheck
  retains only the known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-033 — Cutemon — 10/10

- Catalog evidence: Yellow Lv.3 Rookie Digimon, Vaccine/Fairy, play cost 3,
  3000 DP, and yellow Lv.2 evolution cost 0. Its only effect is
  `[Opponent's Turn] Your opponent can't reduce digivolution costs.` It has
  no inherited or Security text.
- Knowledge-base and rules evidence: Q1313 defines the prohibition as
  blocking effects that reduce the memory cost, including Digisorption and
  BT3-103 Hidden Potential Discovered!, so the printed evolution cost must be
  paid. Q1314 specifically confirms Digisorption cannot provide its reduction.
  Q1315 distinguishes an effect that ignores requirements and specifies a
  cost, such as BT2-111 Beelzemon: that is not a cost reduction and remains
  legal.
- Implementation: `apps/api/src/cards/BT5/BT5-033.ts` contains one
  `OpponentsTurn` effect applying `RestrictCostReduction` to the opponent,
  scoped only to `digivolve` costs. Its persistent action is re-derived only
  while the timing guard is active. The module declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-033", compiled)`.
- Primitive and peer evidence: the continuous cost-reduction block is queried
  by the normal evolution-cost, interactive reduction, replacement reduction,
  and intrinsic reduction paths. It does not block play-cost changes or fixed
  cost overrides. BT5-021 Syakomon has identical printed text and identical
  compiled IR; its audited tests prove a real Digisorption evolution pays the
  full cost, the restriction lapses on the controller's turn, a buried copy is
  inactive, and a fixed-cost effect evolution remains allowed.
- Behavioral proof: the focused Cutemon test proves the opponent-seat
  digivolution block is active on the opponent's turn while controller-seat
  digivolution and opponent play-cost reduction remain unaffected. The four
  exact-peer tests supply the real-action and ruling boundaries without
  duplicating already sufficient card tests.
- Defect corrected: none. The module and its existing focused test were
  already faithful; in accordance with the audit instruction, no redundant
  code or tests were added.
- Verification: focused BT5-033 and exact-peer BT5-021 — 2 files, 5 tests
  passed. Filtered `RestrictCostReduction` and action-kind mechanism tests —
  2/2 passed. The unfiltered IR tier suite was also attempted; its other 14
  cases pass and only the unrelated pre-existing BT1-093 Security assertion
  fails. `git diff --check` passes. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-034 — Kotemon — 10/10

- Catalog evidence: Yellow Lv.3 Rookie Digimon, Data/Reptile, play cost 3,
  2000 DP, and yellow Lv.2 evolution cost 0. On play it reveals the top 5
  cards, adds up to 2 yellow Digimon with Warrior and/or Holy Warrior in their
  types, and places the remainder at deck bottom in any order.
- Knowledge-base and rules evidence: Q1316 confirms the selection is up to 2
  total across the union of yellow Warrior and yellow Holy Warrior Digimon,
  not two from each trait. Reveal, optional selection, combined-filter, and
  deck-bottom ordering rules govern the remaining processing.
- Implementation: `apps/api/src/cards/BT5/BT5-034.ts` uses one `OnPlay`
  `RevealAdd` action with `revealCount: 5`. Its single add group requires a
  yellow Digimon and OR-matches Warrior/Holy Warrior traits, has total
  `count: 2`, targets hand, and is optional. Unselected cards use
  `rest: "deckBottom"`. The module declares `coverage: "full"`, `residual: []`,
  and registers exclusively through `registerIrCard("BT5-034", compiled)`.
- Primitive and peer evidence: `RevealAdd` forms one candidate union before
  applying the group maximum, presents an optional 0–2 selection, moves only
  selected instances to hand, and routes every remainder through the
  deck-bottom ordering path. BT5-037 and BT5-045 exercise the same reveal/add
  interpreter family with different trait/color boundaries.
- Behavioral proof: 3 focused tests prove both eligible traits are added
  together while the other three cards return to deck, the decision exposes
  exact `min: 0, max: 2` bounds and accepts one selection, and an empty
  selection is legal and adds nothing. These cases directly cover the 0/1/2
  optional boundary and Q1316's shared total.
- Defect corrected: none. The hand-fixed compiled IR and its existing tests
  were already faithful, so no redundant changes were made.
- Verification: focused BT5-034, BT5-037 and BT5-045 peers, and the complete
  interpreter suite — 4 files, 192 tests passed. `git diff --check` passes.
  Workspace typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-035 — Starmons — 10/10

- Catalog evidence: Yellow Lv.3 Rookie Digimon, Data/Major, play cost 3,
  1000 DP, and yellow Lv.2 evolution cost 0. Its `[On Play]` effect gives
  exactly 1 opposing Digimon -1000 DP for the turn for each Digimon the
  controller has in play.
- Knowledge-base and rules evidence: Q1317 confirms Starmons counts itself.
  Q1318 confirms multiple -1000 increments combine on one target and cannot
  be split across targets. Q1319 confirms the count is fixed when the On Play
  effect resolves and does not grow when another Digimon is played later.
- Implementation: `apps/api/src/cards/BT5/BT5-035.ts` contains one `OnPlay`
  `ModifyDP` action targeting exactly one opposing Digimon. Its base -1000 is
  scaled once per controller-owned Digimon in the battle area and lasts for
  the turn. The module declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-035", compiled)`.
- Primitive and behavioral evidence: action scaling counts the live board at
  resolution, multiplies the base modifier once, and records that resolved
  amount as a turn-duration modifier rather than a continuous aura. The
  focused test plays Starmons beside one ally, observes -2000 on exactly one
  selected opponent, and verifies a second opponent remains unchanged. This
  proves self-counting, exact scaling, and Q1318's single-target boundary;
  the non-continuous action shape supplies Q1319's snapshot behavior.
- Defect corrected: none. The compiled IR and existing focused test were
  already faithful, so no redundant changes were made.
- Verification: focused BT5-035 plus filtered scaling mechanism cases — 2
  files, 6 tests passed (178 unrelated interpreter cases skipped).
  `git diff --check` passes. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-036 — Renamon — 10/10

- Catalog evidence: Yellow Lv.3 Rookie Digimon, Data/Beastkin, play cost 4,
  3000 DP, and yellow Lv.2 evolution cost 0. Its `[On Play]` effect gives
  exactly 1 opposing Digimon `<Security Attack -1>` until the end of the
  opponent's next turn. It has no inherited or Security text.
- Knowledge-base and rules evidence: the card query returns no QA, errata,
  restriction, or ruling entry, so the catalog text is controlling. The
  applicable local rules cover on-play timing, Security Attack modifiers,
  controller-qualified targeting, and opponent-next-turn duration expiry.
- Implementation: `apps/api/src/cards/BT5/BT5-036.ts` contains one `OnPlay`
  `GainKeyword` action targeting one opponent-controlled Digimon. It grants
  `SecurityAttack` with amount -1 and `untilOpponentTurnEnd` duration. The
  module declares `coverage: "full"`, `residual: []`, and registers
  exclusively through `registerIrCard("BT5-036", compiled)`.
- Primitive and peer evidence: the keyword ledger combines signed Security
  Attack amounts and the combat security-check calculation consumes the
  resulting value. The duration is anchored to the source controller's
  opponent and survives intermediate turn transitions until that opponent's
  end-of-turn sweep. BT5-042 and BT5-057 exercise the same turn-duration and
  opposing-target interpreter paths.
- Behavioral proof: 2 focused tests prove the exact -1 amount, exactly one
  selected opposing target, exclusion of a second opponent and of the
  controller's own Digimon, persistence into the opponent's turn, and expiry
  only after that opponent's turn ends.
- Defect corrected: none in the module. The implementation was already
  faithful; the audit strengthened the existing test because its title
  claimed the duration boundary without previously advancing through it.
- Verification: focused BT5-036, BT5-042 and BT5-057 peers, and the complete
  interpreter suite — 4 files, 187 tests passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Workspace typecheck passes shared and web while API
  retains only the known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-037 — Gladimon — 10/10

- Catalog evidence: Yellow Lv.4 Champion Digimon, Vaccine/Warrior, play cost
  4, 4000 DP, and yellow Lv.3 evolution cost 2. On play, its controller may
  search their Security for 1 Digimon with Warrior or Holy Warrior in its
  type, reveal and add it to hand, recover 1 from deck only if a card was
  added, and then shuffle Security.
- Knowledge-base and rules evidence: Q1320 confirms the controller privately
  sees the entire Security stack while only the chosen card is revealed to
  the opponent. Q1321 confirms that no eligible card means no Recovery, but
  Security is still shuffled before the effect ends.
- Implementation: `apps/api/src/cards/BT5/BT5-037.ts` performs an optional
  own-Security `Search` for one Digimon using a trait OR of Warrior/Holy
  Warrior and binds the result. `SecurityManipulation addTop` from deck is
  gated by that binding, followed unconditionally by Security shuffle. The
  module declares `coverage: "full"`, `residual: []`, and registers
  exclusively through `registerIrCard("BT5-037", compiled)`.
- Primitive and peer evidence: Security search decisions expose every private
  card identity to the owning seat while candidate IDs remain filter-limited;
  only the selected card moves to hand. Empty or declined optional searches
  leave the result binding absent, suppressing Recovery without skipping the
  following shuffle. BT18-037 proves equivalent private Security search and
  refusal behavior; BT11-042 proves refusal/no-Recovery/shuffle sequencing;
  the capability suite proves `nameOrTrait` entries are a union.
- Behavioral proof: 3 focused tests prove Warrior selection plus Recovery
  preserves Security size, the full stack is privately visible while a
  non-Warrior is disabled, and no eligible Warrior suppresses Recovery.
  Sixteen peer tests cover optional refusal, shuffle, and related Security
  search boundaries without duplicating sufficient focused coverage.
- Defect corrected: none. The compiled IR and existing tests were already
  faithful, so no changes were made.
- Verification: focused BT5-037, BT18-037 and BT11-042 peers — 3 files, 16
  tests passed. Filtered trait-OR mechanism — 1/1 passed (289 unrelated cases
  skipped). `git diff --check` passes. Workspace typecheck retains only the
  known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-038 — Kyubimon — 10/10

- Catalog evidence: Yellow Lv.4 Champion Digimon, Data/Mysterious Beast,
  play cost 5, 4000 DP, and yellow Lv.3 evolution cost 2. Its only text is an
  inherited `[Your Turn]` effect giving all opposing Security Digimon -1000
  DP.
- Knowledge-base and rules evidence: Q1322 states that a Security Digimon
  reduced to 0 DP still performs its security battle rather than being deleted
  beforehand. Q1323 states its `[Security]` effect still activates normally.
  Q1324 states that if the Security effect plays that card, the reduction no
  longer applies because it is no longer a Security Digimon.
- Implementation: `apps/api/src/cards/BT5/BT5-038.ts` contains an inherited
  `YourTurn` `ModifySecurityDP` action for the opponent, amount -1000, with a
  continuously re-derived permanent duration. The module declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-038", compiled)`.
- Primitive and ruling evidence: the Security DP ledger is consumed only by
  the security-battle DP calculation; it does not run field-based 0-DP
  deletion rules against the revealed loose card and does not suppress its
  Security timing. If that effect plays the card, the new permanent uses its
  ordinary printed/current DP because Security-only modifiers are not copied
  into the battle area. Continuous recomputation also gates the inherited
  modifier to the source controller's turn.
- Behavioral proof: 4 focused tests prove the exact opponent-only -1000
  modifier on the controller's turn and its absence on the opponent's turn;
  Q1322 with a real 1000-DP Security Digimon whose resolution remains
  `battle`; and Q1323/Q1324 with BT5-065 resolving its Security play effect and
  entering the battle area at its full printed 5000 DP.
- Defect corrected: none in the module. The implementation was already
  faithful; the audit added the missing direct behavioral proofs for all
  three card-specific rulings.
- Verification: focused BT5-038 — 4/4 passed. Filtered shared
  `ModifySecurityDP`/security-battle mechanism — 3/3 passed (115 unrelated
  cases skipped). Targeted Oxfmt, Oxlint, and `git diff --check` pass.
  Workspace typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-039 — ShootingStarmon — 10/10

- Catalog evidence: Yellow Lv.4 Champion Digimon, Data/Super Major, play
  cost 5, 4000 DP, and yellow Lv.3 evolution cost 2. Its only effect is
  `[On Deletion]` giving exactly 1 opposing Digimon -3000 DP for the turn.
- Knowledge-base and rules evidence: the card query returns no QA, errata,
  restriction, or ruling entry, so the catalog text is controlling. The
  applicable local rules cover On Deletion collection after the card reaches
  trash, one-target selection, DP modification, 0-DP processing, and
  end-of-turn duration cleanup.
- Implementation: `apps/api/src/cards/BT5/BT5-039.ts` contains one
  `OnDeletion` effect with a `ModifyDP` action targeting one opponent-owned
  Digimon, amount -3000, duration `forTheTurn`. The module declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-039", compiled)`.
- Primitive and peer evidence: deletion processing retains the deleted card
  as an On Deletion source, opens the appropriate effect window, and applies
  the chosen permanent modifier before 0-DP rule processing. Turn-duration
  grants are swept at the correct turn boundary. The deletion-DP cluster and
  permanent-grant-duration suites directly exercise these shared seams;
  nearby BT5-036 and BT5-038 cover the same opponent targeting and continuous
  modifier infrastructure.
- Behavioral proof: the focused test deletes ShootingStarmon through the
  real deletion primitive, observes exactly -3000 DP on one selected opposing
  Digimon, and confirms a second opposing Digimon remains at base DP.
- Defect corrected: none. The compiled IR and existing focused proof were
  already faithful, so no changes were made.
- Verification: focused BT5-039, BT5-036/038 peers, deletion-DP cluster, and
  duration suite — 5 files, 25 tests passed. Targeted Oxlint/Oxfmt and
  `git diff --check` pass. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-040 — SuperStarmon — 10/10

- Catalog evidence: Yellow Lv.5 Ultimate Digimon, Data/Mutant, play cost 6,
  7000 DP, and yellow Lv.4 evolution cost 2. It has no main, inherited,
  Security, or alternate-evolution text, and the card query exposes no QA,
  errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-040.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-040", compiled)`. This is the exact
  executable contract for a vanilla Digimon; no legacy registration or
  unsupported behavior remains.
- Primitive, peer, and behavioral evidence: the focused tests prove the card
  is registered with complete residual-free runtime coverage and that
  continuous recomputation introduces no DP or behavioral modification.
  Adjacent BT5-039 and BT5-041 tests prove the registry cleanly distinguishes
  this empty module from neighboring effectful cards. Interpreter
  registration and card-data suites verify empty compiled modules remain
  discoverable without synthesizing effects and that the committed catalog is
  structurally valid.
- Defect corrected: none. The vanilla module and existing tests were already
  complete, so no changes were made.
- Verification: focused BT5-040, adjacent BT5-039/041 peers, interpreter,
  registration, and card-data suites — 6 files, 192 tests passed.
  `git diff --check` passes. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-041 — Taomon — 10/10

- Catalog evidence: Yellow Lv.5 Ultimate Digimon, Data/Wizard, play cost 6,
  7000 DP, and yellow Lv.4 evolution cost 3. Its only text is an inherited
  `[Your Turn]` effect giving all opposing Security Digimon -1000 DP.
- Knowledge-base and rules evidence: Q1325 confirms a Security Digimon
  reduced to 0 still battles; Q1326 confirms its Security effect still
  resolves; Q1327 confirms the reduction no longer applies if that effect
  plays the card into the battle area. These are the exact counterparts of
  BT5-038 Q1322-Q1324.
- Implementation: `apps/api/src/cards/BT5/BT5-041.ts` contains an inherited
  `YourTurn` `ModifySecurityDP` action for the opponent, amount -1000, with a
  continuously re-derived permanent duration. It is byte-for-behavior
  equivalent to the audited BT5-038 module, declares `coverage: "full"` and
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-041", compiled)`.
- Primitive, peer, and behavioral evidence: the two focused tests prove the
  opponent-only modifier on the controller's turn and its absence on the
  opponent's turn. BT5-038's direct ruling tests prove a 0-DP Security battle,
  normal Security effect resolution, and full printed DP after that card is
  played. Shared Security-DP and chapter-13 conformance suites verify the
  modifier is consumed only in security battle and does not suppress the
  Security timing.
- Defect corrected: none. The module and focused tests were already faithful;
  the exact peer supplies the card-specific ruling proof without redundant
  tests.
- Verification: focused BT5-041, exact peer BT5-038, Security-DP, and Security
  conformance suites — 4 files, 20 tests passed. `git diff --check` passes.
  API typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-042 — Knightmon — 10/10

- Catalog evidence: Yellow Lv.5 Ultimate Digimon, Data/Warrior, play cost 7,
  7000 DP, and yellow Lv.4 evolution cost 3. Its sole clause is `[On Play]`
  giving exactly 1 opposing Digimon -4000 DP for the turn. The card query has
  no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-042.ts` contains one `OnPlay`
  `ModifyDP` action targeting one opponent-controlled Digimon, amount -4000,
  duration `forTheTurn`. It declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-042", compiled)`.
- Primitive, trait, and peer evidence: the target resolver excludes the
  controller's board and selects exactly one eligible opponent; the modifier
  ledger records the fixed -4000 and sweeps it at the controller's turn end.
  BT5-034 and BT5-037 select this real Warrior card while rejecting unrelated
  cards, proving the committed trait identity; BT5-045 supplies the nearby
  Holy Warrior boundary. BT5-041 exercises the adjacent yellow Lv.5 stack
  context, while interpreter and capability suites cover On Play targeting,
  DP modification, and duration plumbing.
- Behavioral proof: the focused test plays Knightmon, observes exactly -4000
  on one selected opposing Digimon, proves a second opponent and an own
  Digimon remain at base DP, advances through the controller's turn using the
  canonical turn helper, and confirms the selected target returns to base DP.
- Defect corrected: none in the module. The implementation was already
  faithful; the audit strengthened the focused proof for controller boundary
  and actual end-of-turn expiry.
- Verification: focused BT5-042, BT5-034/037/041/045 peers, interpreter, and
  card-capability suites — 7 files, 202 tests passed. Targeted Oxfmt, Oxlint,
  and `git diff --check` pass. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-043 — Jijimon — 10/10

- Catalog evidence: Yellow Lv.6 Mega Digimon, Vaccine/Ancient, play cost 10,
  10000 DP, and yellow Lv.5 evolution cost 2. Its sole clause is
  `[On Deletion]` Recovery +1 (Deck), placing the controller's deck-top card
  on top of their Security. The card query has no QA, errata, restriction, or
  ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-043.ts` contains one
  `OnDeletion` effect whose `SecurityManipulation addTop` action moves exactly
  one card from the source controller's deck to their Security. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-043", compiled)`.
- Primitive, stack, and peer evidence: deletion processing retains the card as
  an effect source after it reaches trash, so controller-relative Recovery
  still resolves for the deleted card's owner. The security primitive removes
  the actual deck-top instance and places it face-down at Security top, safely
  doing nothing if no card is available. EX8-033 and EX8-036 prove the same
  On Deletion Recovery path from real evolution stacks and related conditional
  contexts; interpreter and primitive suites cover trigger routing and zone
  movement.
- Behavioral proof: the focused test deletes Jijimon through the real deletion
  primitive, tracks the exact deck-top instance into Security, and confirms
  the deck becomes empty. The EX8 peer matrix supplies realistic stack and
  deletion interactions without redundant focused cases.
- Defect corrected: none. The module and existing focused proof were already
  faithful, so no changes were made.
- Verification: focused BT5-043, EX8-033/036 peers, complete interpreter, and
  primitive suites — 5 files, 327 tests passed. `git diff --check` passes.
  Workspace typecheck passes shared and web while API retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-044 — Sakuyamon — 10/10

- Catalog evidence: Yellow Lv.6 Mega Digimon, Data/Shaman, play cost 12,
  11000 DP, and yellow Lv.5 evolution cost 3. During the opponent's turn,
  when one of their Digimon moves from breeding to battle, that Digimon gains
  `<Security Attack -3>` for the turn. During its controller's turn, all
  opposing Security Digimon get -3000 DP.
- Knowledge-base and rules evidence: Q1328 confirms the first effect triggers
  during the breeding phase. Q1329 confirms a Security Digimon reduced to 0
  still battles; Q1330 confirms its Security effect still resolves; Q1331
  confirms the reduction is gone if that effect plays it. The latter three
  are the -3000 counterparts of BT5-038 Q1322-Q1324.
- Implementation: `apps/api/src/cards/BT5/BT5-044.ts` installs an
  opponent-turn `whenMovedFromBreeding` watcher filtered to the opponent and
  grants the trigger subject `SecurityAttack` amount -3 for the turn. A
  separate `YourTurn` continuous action applies opponent Security DP -3000.
  The module declares `coverage: "full"`, `residual: []`, and registers
  exclusively through `registerIrCard("BT5-044", compiled)`.
- Primitive, peer, and ruling evidence: the breeding move fires its watcher
  during the breeding phase with the moved permanent as trigger subject;
  duration cleanup removes the keyword at that turn's end. Watchers are
  re-derived under the opponent-turn guard, so the same event on the
  controller's turn is ignored. BT5-038 directly proves the shared Security
  battle, Security effect, and played-card DP rulings; Security-DP and
  subtrigger seam suites cover the two reusable mechanisms.
- Behavioral proof: 3 focused tests prove Q1328 through a real
  `moveFromBreeding` intent, exact -3 on only the moved Digimon, expiry after
  the opponent's turn, no watcher on the controller's turn, exact opposing
  Security -3000 on the controller's turn, and its absence on the opponent's
  turn.
- Defect corrected: none in the module. The implementation was already
  faithful; the focused tests were strengthened for turn gating and actual
  duration expiry.
- Verification: focused BT5-044, exact ruling peer BT5-038, Security-DP, and
  subtrigger seam suites — 4 files, 36 tests passed. Targeted Oxfmt, Oxlint,
  and `git diff --check` pass. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-045 — LordKnightmon — 10/10

- Catalog evidence: Yellow Lv.6 Mega Digimon, Virus/Holy Warrior/Royal
  Knight, play cost 13, 11000 DP, and yellow Lv.5 evolution cost 3. When
  attacking, it may play from hand without cost either a yellow Lv.3 Digimon
  or a yellow Warrior Digimon. During all turns, it gets +1000 DP for each
  other own Digimon in play.
- Knowledge-base and rules evidence: Q1332 confirms the play pool is one
  shared union: 1 yellow Lv.3 or 1 yellow Warrior Digimon. The applicable
  rules cover attack-declaration timing, optional refusal, play without cost
  with normal On Play processing, and continuously recalculated DP.
- Implementation: `apps/api/src/cards/BT5/BT5-045.ts` uses an optional
  `WhenAttacking` `PlayWithoutCost` from hand with common yellow/Digimon gates
  and an OR of Lv.3 versus Warrior trait. Its `AllTurns` self `ModifyDP`
  continuously scales +1000 per own battle-area Digimon while excluding self.
  It declares `coverage: "full"`, `residual: []`, and registers exclusively
  through `registerIrCard("BT5-045", compiled)`.
- Primitive, trait, stack, and peer evidence: loose-card targeting combines
  the common color/kind constraints with either branch, so neither a red Lv.3
  nor a yellow non-Warrior higher-level card qualifies. Optional play preserves
  the hand on refusal and normal play processing fires the selected card's
  On Play effects. BT5-034 proves LordKnightmon's Holy Warrior trait while
  BT5-042 supplies a real yellow Warrior target. A legal BT5-042 Lv.5 stack
  reaches LordKnightmon for the printed cost. The historical deck plays
  Knightmon during attack, resolves its DP deletion, and dynamically grows
  LordKnightmon when the new ally enters.
- Behavioral proof: 6 focused tests prove both Q1332 positive branches, the
  mixed invalid-filter boundary, optional refusal, legal yellow Lv.5
  evolution with retained stack, exact +1000 per other own Digimon, and
  exclusion of opposing Digimon from scaling. The historical deck adds a full
  attack/play/On Play/deletion/recompute flow.
- Defect corrected: none in the module. The implementation was faithful; the
  audit added missing negative-filter, refusal, legal-stack, and opposing-board
  assertions.
- Verification: focused and historical BT5-045, BT5-034/078/079 peers,
  complete interpreter, and BT20-051/BT15-003 optional-play peers — 8 files,
  206 tests passed. Targeted Oxfmt, Oxlint, and `git diff --check` pass.
  Workspace typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-046 — Terriermon Assistant — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Vaccine/Beast, play cost 3,
  1000 DP, and green Lv.2 evolution cost 0. Its `[Main]` Digi-Burst 1 trashes
  one of its own digivolution cards, reveals the deck top, adds it to hand if
  it is a green Digimon, and otherwise places it at deck bottom. The card
  query has no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-046.ts` contains a Main
  `RevealAdd` of exactly one card, with a green Digimon hand filter and
  `rest: "deckBottom"`. Its attached trash cost targets exactly one card in
  this Digimon's digivolution cards and is exposed as Digi-Burst 1. The module
  declares `coverage: "full"`, `residual: []`, and registers exclusively
  through `registerIrCard("BT5-046", compiled)`.
- Primitive, stack, and peer evidence: the activation gate requires the full
  targeted source-trash cost before exposing the Main effect. Payment removes
  the selected source to trash before reveal resolution. `RevealAdd` moves a
  matching green Digimon instance to hand while preserving every nonmatch at
  deck bottom. BT5-004 supplies the legal green Lv.2 source, BT5-100 exercises
  green Digi-Burst reveal filtering, and chapter-16 conformance covers
  Digi-Burst cost/activation semantics.
- Behavioral proof: 3 focused tests use a legal BT5-004-to-BT5-046 stack to
  prove exact one-source payment and green-Digimon addition; track a revealed
  red Digimon's identity to the bottom behind the unrevealed card; and prove a
  source-less Terriermon Assistant exposes no activatable Main effect.
- Defect corrected: none in the module. The audit repaired weak tests that
  used an illegal Lv.3 source and never actually asserted the nonmatching card
  returned to deck bottom, then added the unavailable-cost boundary.
- Verification: focused BT5-046, BT5-004/100 peers, and Digi-Burst
  conformance — 4 files, 22 tests passed. Filtered mechanic coverage passed 10
  relevant tests; its one remaining failure is the known unrelated IDigiBurst
  shape baseline for BT7-040, ST4-13, and ST6-13. Targeted Oxfmt and
  `git diff --check` pass; Oxlint reports only the existing test-helper
  `no-explicit-any` pattern. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-047 — Palmon — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Data/Vegetation, play cost 3,
  2000 DP, and green Lv.2 evolution cost 0. On deletion, it places exactly 1
  Palmon from its controller's trash at the bottom of the digivolution cards
  of exactly 1 own green Digimon.
- Knowledge-base and rules evidence: Q1333 confirms the deleted Palmon may
  choose itself after it reaches trash. Q1334 confirms a Palmon renamed
  Sukamon by BT11-043 still triggers while renamed, then loses that field
  rewrite in trash and may identify/place the same physical card as Palmon.
- Implementation: `apps/api/src/cards/BT5/BT5-047.ts` contains a mandatory
  `OnDeletion` `PlaceUnder` action selecting one own Palmon by printed name
  from trash, choosing one own green Digimon host, and using
  `position: "bottom"`. It declares `coverage: "full"`, `residual: []`, and
  registers exclusively through `registerIrCard("BT5-047", compiled)`.
- Primitive, name-state, stack, and peer evidence: On Deletion resolution sees
  the deleted card in trash. Loose-card name matching reads its committed
  definition, while continuous Sukamon name/color/DP grants are scoped to the
  former permanent and lapse when it leaves play. `PlaceUnder` removes the
  selected trash instance and inserts it before existing sources for true
  bottom placement. BT11-043 supplies the real name rewrite, and filtered
  capability tests cover PlaceUnder source, host, and position mechanics.
- Behavioral proof: 4 focused tests prove Q1333 self-placement, no legal host
  leaves the card in trash, Q1334 through a real KingSukamon rewrite followed
  by deletion/self-recovery beneath an existing source, and selection of a
  different trash Palmon while the deleted source remains in trash.
- Defect corrected: none in the module. The implementation was faithful; the
  audit added the missing Q1334, non-self selection, and meaningful
  bottom-position proofs.
- Verification: focused BT5-047, BT11-043 peer, and complete interpreter — 3
  files, 192 tests passed. Filtered PlaceUnder capabilities — 3/3 passed.
  Targeted Oxfmt and `git diff --check` pass; Oxlint reports only the existing
  test-helper `no-explicit-any` pattern. Workspace typecheck retains only the
  known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-048 — Floramon — 10/10

- Catalog evidence: Green Lv.3 Rookie Digimon, Data/Vegetation, play cost 3,
  4000 DP, and green Lv.2 evolution cost 0. It has no main, inherited,
  Security, or alternate-evolution text, and its knowledge-base query exposes
  no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-048.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-048", compiled)`. This exactly
  represents the vanilla card with no executable behavior or legacy seam.
- Primitive, trait, peer, and behavioral evidence: focused tests prove the
  empty module remains registered, residual-free, and introduces no DP or
  continuous behavior. BT5-047 supplies the adjacent real Vegetation card and
  uses Floramon as an existing source beneath a green host, proving the
  committed identity remains a normal green Digimon card without acquiring
  effects. Registration tests prove empty modules remain discoverable, and
  the raw-IR gate proves no unsupported action is hidden in the module.
- Defect corrected: none. The vanilla implementation and focused proof were
  already complete, so no changes were made.
- Verification: focused BT5-048, adjacent BT5-047, registration, and raw-IR
  gate suites — 4 files, 11 tests passed. `git diff --check` passes. Workspace
  typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-049 — Kiwimon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Data/Ancient Bird, play cost
  4, 4000 DP, and green Lv.3 evolution cost 2. On play it reveals exactly 3
  deck-top cards, adds every revealed Digimon with Digisorption to hand, and
  places every remainder at deck bottom in any order. Its knowledge-base
  query has no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-049.ts` contains one `OnPlay`
  `RevealAdd` with `revealCount: 3`; its single add group requires Digimon kind
  plus Digisorption keyword, uses `count: "all"`, and moves matches to hand.
  `rest: "deckBottom"` handles every nonmatch. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-049", compiled)`.
- Primitive, peer, and behavioral evidence: definition matching requires both
  Digimon kind and the committed Digisorption keyword, so an Option merely
  mentioning the text cannot qualify. `count: "all"` moves the complete match
  set without a selection cap, while reveal processing bottoms all remaining
  instances. The two focused tests prove two matching Digimon are both added
  while a nonmatch remains in deck, and the zero-match case adds nothing and
  retains all three cards at deck bottom. BT5-100 and the reveal-add cluster
  exercise the same keyword/reveal family across wider pools.
- Defect corrected: none. The compiled IR and existing focused tests were
  already faithful, so no changes were made.
- Verification: focused BT5-049 plus reveal-add cluster — 2 files, 18 tests
  passed. Filtered RevealAdd mechanic — 1/1 passed; filtered interpreter
  RevealAdd/Digisorption matrix — 9/9 passed. `git diff --check` passes.
  Workspace typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-050 — Weedmon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Virus/Vegetation, play cost
  4, 3000 DP, and green Lv.3 evolution cost 1. Its inherited Your Turn effect
  gains exactly 1 memory when this Weedmon source is trashed to activate its
  host Digimon's Digi-Burst. Its knowledge-base query exposes no QA, errata,
  restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-050.ts` models the inherited
  `YourTurn` watcher as an `onDigiBurstCardDiscarded` subtrigger filtered by
  `isSelfRef`, followed by `GainMemory` for 1. It declares
  `coverage: "full"`, `residual: []`, and registers exclusively through
  `registerIrCard("BT5-050", compiled)`.
- Primitive, timing, and behavioral evidence: Digi-Burst cost payment emits
  the discarded source instance, allowing `isSelfRef` to distinguish Weedmon
  from sources trashed by another Digimon. Three focused tests prove the
  positive effect through a legal Palmon Lv.3 -> Weedmon Lv.4 -> Lilamon Lv.5
  stack and real Digi-Burst 2 activation, no gain when another Digimon pays
  its own Digi-Burst cost, and suppression when the Weedmon source is
  Digi-Burst-trashed during the opponent's turn. The positive case also proves
  both sources pay the cost, Lilamon suspends the selected opposing Digimon,
  and Weedmon grants exactly 1 memory.
- Defect corrected: the module was faithful. The prior positive test used an
  illegal Lv.3-over-Lv.4 stack; the audit replaced it with the legal evolution
  line and added an explicit Your Turn boundary proof.
- Verification: focused BT5-050 plus BT4-059, BT5-046, and BT5-004 peers — 4
  files, 13 tests passed. Primitive, subtrigger, subtrigger-seam, and
  fire-site-guard suites — 248 tests passed. Targeted Oxfmt and
  `git diff --check` pass; Oxlint reports only the existing test-helper
  `no-explicit-any` pattern. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-051 — MoriShellmon — 10/10

- Catalog evidence: Green Lv.4 Champion Digimon, Data/Mollusk, play cost 6,
  7000 DP, and green Lv.3 evolution cost 2. It has no main, inherited,
  Security, or alternate-evolution text, and its knowledge-base query exposes
  no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-051.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-051", compiled)`. This exactly
  represents the vanilla card without a legacy registration seam.
- Behavioral and structural proof: the focused tests verify its committed
  7000 base/current DP remains unchanged after continuous-effect recomputation
  and that the empty, residual-free runtime module is registered. Shared card
  data and digivolution tests independently validate its printed identity and
  legal green Lv.3 evolution requirement.
- Defect corrected: none. The module and existing focused tests were already
  faithful, so no source or test changes were made.
- Verification: focused BT5-051 — 2/2 passed; shared card-data and
  digivolution suites — 49/49 passed; complete BT5 suite — 121 files and 369
  tests passed. Exact-file Oxfmt, Oxlint, and `git diff --check` pass. Workspace
  typecheck retains only the known unrelated baseline errors in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-052 — Garbagemon — 10/10

- Catalog evidence: Green Lv.5 Ultimate Digimon, Virus/Mutant, play cost 5,
  8000 DP, and green Lv.4 evolution cost 3. It has no main, inherited,
  Security, or alternate-evolution text. The committed catalog agrees with
  Bandai's card list, and the local knowledge-base query exposes no QA,
  errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-052.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-052", compiled)`. This exactly
  represents the vanilla card without a handwritten compatibility seam.
- Behavioral and structural proof: focused coverage verifies Garbagemon's
  committed 8000 base/current DP remains unchanged after continuous-effect
  recomputation and verifies the empty, residual-free runtime module remains
  registered.
- Defect corrected: none. The implementation and focused tests were already
  faithful, so no source or test changes were made.
- Verification: focused BT5-052 — 2/2 passed. Exact-file Oxfmt, Oxlint, and
  `git diff --check` pass. Workspace typecheck retains only the known unrelated
  baseline errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-053 — Deramon — 10/10

- Catalog evidence: Green Lv.5 Ultimate Digimon, Data/Avian, play cost 7,
  7000 DP, and green Lv.4 evolution cost 3. During its controller's turn it
  gets +2000 DP for each other suspended Digimon that controller has in play.
  Its knowledge-base query exposes no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-053.ts` uses a `YourTurn`
  continuous self-targeted `ModifyDP` action scaled by each battle-area card
  matching own controller, Digimon kind, suspended state, and `excludeSelf`.
  The amount is exactly 2000 per match. It declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-053", compiled)`.
- Behavioral and lifecycle proof: the focused matrix proves two eligible own
  suspended Digimon grant exactly +4000 while suspended Deramon itself, an own
  unsuspended Digimon, an own suspended Tamer, and an opposing suspended
  Digimon do not count. A second test proves live recomputation from +2000 to
  zero and back as the ally unsuspends and suspends, then proves the entire
  modifier lapses during the opponent's turn.
- Defect corrected: none in the module. The audit strengthened the previously
  positive-only test to prove every printed filter and the dynamic Your Turn
  lifecycle.
- Verification: focused BT5-053 — 2/2 passed; filtered interpreter scaling —
  1/1 relevant test passed; continuous lifecycle/lapse suites — 7/7 passed.
  Targeted Oxfmt, Oxlint, and `git diff --check` pass. Shared and web
  typechecks pass; API/workspace typecheck retains only the known unrelated
  baseline errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-054 — Piximon — 10/10

- Catalog evidence: Green Lv.5 Ultimate Digimon, Data/Fairy, play cost 7,
  8000 DP, and green Lv.4 evolution cost 2. It has no main, inherited,
  Security, or alternate-evolution text, and its knowledge-base query exposes
  no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-054.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-054", compiled)`. This exactly
  represents the vanilla card without a legacy registration seam.
- Behavioral and structural proof: focused coverage verifies Piximon has no
  continuous DP modification after recomputation and verifies the empty,
  residual-free runtime module remains registered.
- Defect corrected: none. The module and existing focused tests were already
  faithful, so no source or test changes were made.
- Verification: focused BT5-054 — 2/2 passed. Exact-file Oxfmt, Oxlint, and
  `git diff --check` pass. Workspace typecheck retains only the known unrelated
  baseline errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-055 — BanchoLillymon — 10/10

- Catalog evidence: Green Lv.6 Mega Digimon, Data/Fairy/Boss, play cost 11,
  11000 DP, and green Lv.5 evolution cost 3. On deletion it returns exactly 1
  opposing suspended Digimon to the bottom of its owner's deck and trashes all
  digivolution cards belonging to that Digimon. Its knowledge-base query
  exposes no QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-055.ts` now contains one
  mandatory `OnDeletion` `Return` action selecting exactly one opposing
  suspended Digimon and sending it to `deckBottom`. The shared Return primitive
  moves only the top card and automatically trashes every source from that
  returned permanent. The module declares `coverage: "full"`, `residual: []`,
  and registers exclusively through `registerIrCard("BT5-055", compiled)`.
- Primitive, peer, and behavioral evidence: Return/deletion peers BT2-083,
  BT2-095, BT2-096, and BT4-031 establish that returning a Digimon already
  trashes only that target's digivolution cards. Focused tests prove exact
  target instance placement at deck bottom, two target sources in the target
  owner's trash, exclusion of an upright opposing Digimon, survival of an
  unrelated own Digimon and its source, and safe no-op resolution when no
  suspended opposing Digimon exists.
- Defect corrected: removed an erroneous generated `Trash` action targeting
  all own Digimon. It duplicated source cleanup incorrectly and could delete
  every unrelated Digimon controlled by BanchoLillymon's owner after the
  legitimate return resolved.
- Verification: focused BT5-055 — 2/2 passed; shared return/deletion suites —
  145/145 passed. Root's focused peer matrix — 5 files and 16 tests passed.
  Targeted Oxfmt, Oxlint, and `git diff --check` pass. Workspace typecheck
  retains only the known unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-056 — Rafflesimon — 10/10

- Catalog evidence: Green Lv.6 Mega Digimon, Data/Fairy, play cost 12, 11000
  DP, green Lv.5 evolution cost 3, and green Lv.6 evolution cost 1. Its Main
  Digi-Burst 2 gives all own Digimon +2000 DP for the turn. During its
  controller's turn, once per turn when one of that player's Digimon activates
  Digi-Burst, one opposing Digimon cannot attack or block through the end of
  the opponent's next turn. Its knowledge-base query exposes no card-specific
  QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-056.ts` models the Main cost as
  exactly two self-stack cards, applies a for-the-turn +2000 DP modifier to all
  own Digimon, and installs a `YourTurn`, `OncePerTurn` Digi-Burst subtrigger
  that selects one opposing Digimon and grants both attack and block
  restrictions through `untilOpponentTurnEnd`. It declares full residual-free
  coverage and registers exclusively through `registerIrCard`.
- Engine correction: `onDigiBurstCardDiscarded` watchers with a non-self
  `sourceFilter` now evaluate that filter against the event's actual Digi-Burst
  host permanent. Inherited `isSelfRef` watchers continue matching the trashed
  source instances. Previously Rafflesimon's own-controller filter was skipped,
  allowing an opponent's Digi-Burst to trigger its restriction.
- Behavioral proof: four focused tests use legal green and red evolution
  stacks to prove exact Digi-Burst payment, +2000 DP on Rafflesimon and every
  own Digimon, restriction of both attacking and blocking, triggering from a
  different own Digimon's Digi-Burst, suppression of a second trigger in the
  same turn, survival through the owner's turn end, expiration at the opposing
  turn end, and no trigger from an opponent-owned Digi-Burst host.
- Defect corrected: fixed the shared host-filter seam described above and
  replaced invalid/red-under-green fixtures with legal evolution stacks. The
  card IR itself required no change.
- Verification: focused BT5-056, BT5-050/046 peers, subtrigger suite, and full
  interpreter — 5 files and 216 tests passed. Targeted Oxfmt and
  `git diff --check` pass; Oxlint reports only existing test-helper
  `no-explicit-any` warnings. Workspace typecheck retains only the known
  unrelated baseline errors in `EX6-010.test.ts`,
  `interpreter/actions/removal.ts`, `interpreter/actions/runAction.ts`,
  `interpreter/targeting/loose.ts`, and primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-057 — Rosemon — 10/10

- Catalog evidence: Green Lv.6 Mega Digimon, Data/Fairy, play cost 12, 11000
  DP, and green Lv.5 evolution cost 3. Its Main Digi-Burst 3 gives Security
  Attack +1 for the turn to every own Digimon with Digi-Burst. Its
  knowledge-base query exposes no card-specific QA, errata, restriction, or
  ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-057.ts` requires exactly three
  self-stack cards as the Digi-Burst cost, selects all own Digimon whose
  committed effects carry the Digi-Burst keyword, and grants exactly one
  Security Attack for the turn. It declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-057", compiled)`.
- Behavioral proof: the focused test uses a legal green BT5-047 Lv.3 ->
  BT5-051 Lv.4 -> BT5-052 Lv.5 -> Rosemon Lv.6 stack and proves all three exact
  source instances reach trash. Rosemon and a separate own Digi-Burst Digimon
  each receive exactly +1, while an own non-Digi-Burst Digimon and both
  Digi-Burst/non-Digi-Burst opposing Digimon receive none. The grants disappear
  at the owner's turn-end boundary.
- Defect corrected: none in the module. The audit replaced an illegal stack of
  three red Lv.3 cards beneath green Lv.6 Rosemon and expanded the proof to
  cover every target and duration boundary.
- Verification: focused BT5-057 — 1/1 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Workspace typecheck retains only the known unrelated
  baseline errors in `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-058 — Argomon — 10/10

- Catalog evidence: Green Lv.6 Mega Digimon, Virus/Mutant, play cost 13,
  11000 DP, and green Lv.5 evolution cost 4. Digisorption -2 optionally
  suspends one own Digimon while evolving from hand to reduce that cost by 2.
  When digivolving it suspends all opposing Tamers, and during all turns those
  opposing Tamers cannot unsuspend. Its knowledge-base query exposes no
  card-specific QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-058.ts` models the optional
  Digisorption replacement with an own-Digimon suspend cost and exact -2
  reduction, a mandatory all-opposing-Tamers `WhenDigivolving` suspension, and
  an `AllTurns` opponent-Tamer unsuspend restriction aura that exists only
  while Argomon remains in play. It declares `coverage: "full"`,
  `residual: []`, and registers exclusively through
  `registerIrCard("BT5-058", compiled)`.
- Behavioral proof: four focused tests use legal Lv.5-to-Lv.6 evolution states
  and prove accepting Digisorption suspends the chosen own Digimon and pays 2
  memory, while declining leaves it active and pays the full 4. They also prove
  every opposing Tamer suspends on evolution while an opposing Digimon does
  not; actual unsuspend attempts remain blocked for opposing Tamers while an
  own Tamer and opposing Digimon are unrestricted; after Argomon leaves play,
  the former opposing Tamers can unsuspend normally.
- Defect corrected: none in the module. Existing coverage was strong; the audit
  added the missing controller/kind exclusions, actual restriction consumption,
  and aura-lapse proof.
- Verification: focused BT5-058 — 4/4 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun per the user's request to
  avoid broad suites; the last run's known unrelated baseline remains in
  `EX6-010.test.ts`, `interpreter/actions/removal.ts`,
  `interpreter/actions/runAction.ts`, `interpreter/targeting/loose.ts`, and
  primitive capability typing.
- Remaining ambiguity: none identified.

## BT5-059 — Keramon — 10/10

- Catalog and ruling evidence: Black Lv.3 Rookie Digimon,
  Unknown/Unidentified, play cost 3, 2000 DP, and black Lv.2 evolution cost 0.
  On play it reveals exactly 5 cards, adds exactly 1 Unidentified-trait Digimon
  and exactly 1 Arata Sanada card when available, then places every remainder
  at deck bottom in any order. Q1335 confirms either available category may be
  added independently when the other is absent; Q1336 confirms the two filter
  categories.
- Implementation: `apps/api/src/cards/BT5/BT5-059.ts` contains one `OnPlay`
  `RevealAdd` with `revealCount: 5` and two independent count-1 add groups: a
  Digimon-kind plus Unidentified-trait filter, and an exact Arata Sanada name
  filter. `rest: "deckBottom"` handles every unselected revealed instance. It
  declares full residual-free coverage and registers exclusively through
  `registerIrCard("BT5-059", compiled)`.
- Behavioral proof: the focused mixed-pool case reveals two eligible
  Unidentified Digimon, two Arata Sanada cards, and one miss; preferred exact
  instances enter hand, while the two unchosen matches and miss occupy the
  final three deck positions in any order beneath a sixth unrevealed card that
  stays on top. Two additional cases prove the Unidentified-only and
  Arata-only Q1335 paths independently.
- Defect corrected: none in the module. The audit strengthened the focused
  proof for duplicate groups, exact count/identity, independent categories,
  and true deck-bottom placement.
- Verification: focused BT5-059 — 3/3 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because no typing-sensitive
  source changed; the last known unrelated baseline remains documented.
- Remaining ambiguity: none identified.

## BT5-060 — Monitamon — 10/10

- Catalog and ruling evidence: Black Lv.3 Rookie Digimon, Data/CRT, play cost
  3, 2000 DP, and black Lv.2 evolution cost 0. On play its controller looks at
  the top deck card; Q1337 confirms the exact instance returns face down to the
  top. On deletion it reveals exactly 3 cards, may play exactly 1 Monitamon
  without paying its cost, and bottoms every remainder in any order.
- Implementation: `apps/api/src/cards/BT5/BT5-060.ts` intentionally models the
  non-mutating private On Play look with no public state change. Its On Deletion
  `RevealAdd` reveals 3, has one optional exact-name Monitamon group with
  `count: 1` and destination `play`, and sends the rest to `deckBottom`. It
  declares full residual-free coverage and registers exclusively through
  `registerIrCard("BT5-060", compiled)`.
- Behavioral proof: four focused tests prove Q1337 preserves the exact top
  instance face down; deletion chooses exactly one of two revealed Monitamon,
  plays it without memory payment, and leaves the unchosen match and miss
  beneath an unrevealed card. A manual decision test declines the optional play
  and proves all three revealed instances go to the bottom. A zero-match case
  proves no card enters play.
- Defect corrected: none in the module. The audit replaced private primitive
  casts with the named production test seam and added duplicate-selection,
  explicit-refusal, identity, and true deck-bottom proofs.
- Verification: focused BT5-060 — 4/4 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because no typing-sensitive
  source changed; the last known unrelated baseline remains documented.
- Remaining ambiguity: none identified.

## BT5-061 — Commandramon — 10/10

- Catalog evidence: Black Lv.3 Rookie Digimon, Virus/Cyborg/D-Brigade, play
  cost 4, 2000 DP, and black Lv.2 evolution cost 0. Its only executable text is
  Blocker, and its knowledge-base query exposes no card-specific QA, errata,
  restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-061.ts` carries one static
  Blocker keyword, declares `coverage: "full"` and `residual: []`, and
  registers exclusively through `registerIrCard("BT5-061", compiled)`.
- Behavioral proof: existing focused coverage proves the keyword is active and
  drives the production combat block window. An opposing attack targeting the
  player is legally redirected to Commandramon, records the exact blocker
  permanent, and resolves the battle with Commandramon reaching trash.
- Defect corrected: none. The faithful implementation and focused behavioral
  proof required no source or test changes.
- Verification: focused BT5-061 — 2/2 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because no typing-sensitive
  source changed.
- Remaining ambiguity: none identified.

## BT5-062 — Mekanorimon — 10/10

- Catalog evidence: Black Lv.4 Champion Digimon, Virus/Machine, play cost 4,
  6000 DP, and black Lv.3 evolution cost 3. It has Blocker, cannot attack
  during its controller's turn, and during the opponent's turn unsuspends when
  it deletes an opposing Digimon in battle and survives. Its knowledge-base
  query exposes no card-specific QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-062.ts` carries the static
  Blocker keyword, a `YourTurn` self attack restriction, and an
  `OpponentsTurn` `whenDeletesInBattle` self-anchored watcher that unsuspends
  Mekanorimon. It declares full residual-free coverage and registers
  exclusively through `registerIrCard("BT5-062", compiled)`.
- Behavioral proof: focused coverage proves the Blocker keyword and rejects a
  real attack intent by Mekanorimon during its own turn. A production combat
  case on the opponent's turn has a weaker opposing attacker battle suspended
  Mekanorimon; Mekanorimon deletes it, survives, and becomes unsuspended.
- Defect corrected: none. The module and focused behavioral proof were already
  faithful, so no source or test changes were made.
- Verification: focused BT5-062 — 2/2 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because no typing-sensitive
  source changed.
- Remaining ambiguity: none identified.

## BT5-063 — Kurisarimon — 10/10

- Catalog and ruling evidence: Black Lv.4 Champion Digimon,
  Unknown/Unidentified, play cost 5, 4000 DP, and black Lv.3 evolution cost 2.
  When digivolving, if its controller has no Arata Sanada in play, that player
  may play one Arata Sanada from hand without cost. Its inherited Your Turn
  effect grants Rush to every other own Digimon with the host's current name.
  Q1338 confirms a recipient loses Rush immediately when digivolution changes
  its name.
- Implementation: `apps/api/src/cards/BT5/BT5-063.ts` now restricts the
  optional hand `PlayWithoutCost` target to the exact Arata Sanada name and
  gates it on no own Arata Sanada in play. Its inherited `YourTurn`
  `GainKeyword` targets all other own Digimon with `isSameName` and grants
  Rush through the live continuous layer. It declares full residual-free
  coverage and registers exclusively through `registerIrCard`.
- Behavioral proof: mixed-hand coverage deliberately prefers a non-Arata card
  yet proves only Arata enters play for free and the nonmatch remains in hand.
  Separate cases prove an existing Arata suppresses the effect and optional
  refusal leaves Arata in hand. A legal Kurisarimon-to-Infermon-to-Diaboromon
  inherited stack proves Rush is absent on the opponent's turn, present only
  on another same-name own Digimon during the owner's turn, absent from the
  host/different name, and lapses per Q1338 after the recipient evolves into
  differently named Armageddemon.
- Defect corrected: the free-play filter previously accepted any own hand card;
  it now requires exact Arata Sanada name matching.
- Verification: focused BT5-063 — 4/4 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because the narrow IR filter
  addition is not typing-sensitive and the unrelated baseline remains known.
- Remaining ambiguity: none identified.

## BT5-064 — BlackGaogamon — 10/10

- Catalog evidence: Black Lv.4 Champion Digimon, Data/Beast, play cost 5,
  5000 DP, and black Lv.3 evolution cost 2. Its inherited Your Turn effect
  grants Jamming to its host only while that Digimon has Reboot. Its
  knowledge-base query exposes no card-specific QA, errata, restriction, or
  ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-064.ts` contains an inherited
  `YourTurn` self aura whose live condition is `selfHasKeyword: Reboot` and
  whose effect grants Jamming. It declares full residual-free coverage and
  registers exclusively through `registerIrCard("BT5-064", compiled)`.
- Behavioral proof: a legal BlackGaogamon Lv.4 to BlackMachGaogamon Lv.5
  stack proves Reboot and Jamming coexist during the owner's turn, then proves
  Reboot remains while Jamming lapses on the opponent's turn. A separate legal
  BlackGaogamon Lv.4 to WaruMonzaemon Lv.5 stack proves the absence of Reboot
  prevents Jamming.
- Defect corrected: none in the module. The audit replaced an illegal
  Lv.4-under-Lv.4 negative fixture and added the explicit owner-turn lifecycle
  boundary.
- Verification: focused BT5-064 — 2/2 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. No typing-sensitive source changed.
- Remaining ambiguity: none identified.

## BT5-065 — Shademon — 10/10

- Catalog and ruling evidence: Black Lv.4 Champion Digimon,
  Virus/Unidentified, play cost 6, 5000 DP, and black Lv.3 evolution cost 2.
  It has Blocker, cannot attack during its controller's turn, and its Security
  effect plays it without cost at the end of the battle. Q1339 confirms it is a
  normal Digimon after entering play; Q1340 requires the play regardless of the
  security battle outcome; Q1341 requires that play after its battle and before
  the attack's next security check.
- Implementation: `apps/api/src/cards/BT5/BT5-065.ts` retains static Blocker
  and a `YourTurn` self attack restriction. Its Security effect now installs a
  once-only `whenSecurityBattleEnded` subtrigger whose nested
  `PlayWithoutCost` moves the exact Shademon source into play. It declares full
  residual-free coverage and registers exclusively through `registerIrCard`.
- Behavioral proof: BlackWarGreymon's Security Attack +1 checks Shademon first
  and a second card afterward. Event order proves Shademon's 5000-DP security
  battle completes, then its exact instance enters the battle area, then the
  second check occurs. This simultaneously proves Q1339-Q1341 even though
  Shademon loses to the 12000-DP attacker. Additional focused cases reject a
  real owner-turn attack intent and prove Shademon can suspend to redirect an
  opposing attack through the production block window.
- Defect corrected: the Security effect previously played Shademon immediately
  before its security battle, which skipped the battle entirely and violated
  Q1340/Q1341. It now waits for the dedicated battle-ended event.
- Verification: focused BT5-065 — 3/3 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. Typecheck was not rerun because the IR timing change
  uses established typed actions and the unrelated baseline remains known.
- Remaining ambiguity: none identified.

## BT5-066 — WaruMonzaemon — 10/10

- Catalog evidence: Black Lv.5 Ultimate Digimon, Virus/Puppet, play cost 5,
  6000 DP, and black Lv.4 evolution cost 2. It has no main, inherited,
  Security, or alternate-evolution text, and its knowledge-base query exposes
  no card-specific QA, errata, restriction, or ruling entry.
- Implementation: `apps/api/src/cards/BT5/BT5-066.ts` intentionally contains
  `effects: []`, `coverage: "full"`, and `residual: []`, and registers
  exclusively through `registerIrCard("BT5-066", compiled)`.
- Behavioral and structural proof: focused coverage verifies WaruMonzaemon has
  no continuous DP modification and verifies the empty, residual-free runtime
  module remains registered.
- Defect corrected: none. The vanilla implementation and focused tests were
  already faithful, so no files changed.
- Verification: focused BT5-066 — 2/2 passed. Targeted Oxfmt, Oxlint, and
  `git diff --check` pass. No typing-sensitive source changed.
- Remaining ambiguity: none identified.

## BT5-067 — Infermon — 10/10

- Catalog and ruling evidence: Black Lv.5 Ultimate Digimon,
  Unknown/Unidentified, play cost 7, 6000 DP, and black Lv.4 evolution cost 3.
  A battle-area Keramon may instead evolve into it for cost 4 while ignoring
  requirements. Its inherited On Deletion effect may play one Diaboromon Token
  without cost. Q1342 rejects the shortcut from breeding; Q1343 defines the
  token; Q1344 permits the shortcut during an effect-driven evolution.
- Implementation: `apps/api/src/cards/BT5/BT5-067.ts` carries the alternate
  exact Keramon name requirement at cost 4 and an inherited optional count-1
  `PlayToken` for Diaboromon. It declares full residual-free coverage and
  registers exclusively through `registerIrCard`. Both shared Diaboromon token
  aliases now faithfully define White, Lv.6, play cost 14, 3000 DP, Mega form,
  Unknown attribute, and Unidentified type.
- Behavioral proof: focused tests prove the cost-4 shortcut on a battle-area
  Keramon, Q1342 rejection in breeding, and rejection for a non-Keramon Lv.3.
  A legal Infermon source beneath BlackWarGreymon triggers from host deletion
  and produces the exact face-up `TOKEN-Diaboromon` instance for the correct
  owner/controller with every printed stat and trait. A refusal case proves the
  inherited play is optional.
- Defect corrected: the shared token registry previously omitted Mega form and
  Unknown attribute and incorrectly stored Unknown alongside Unidentified as a
  type. Both token aliases and the existing BT2-082 structural proof were
  corrected.
- Verification: focused BT5-067 — 5/5 passed; BT2-082 — 5/5 passed; shared
  token-definition checks — 2/2 passed; filtered PlayToken primitive — 3/3
  relevant tests passed. Shared package build/type compilation, targeted
  Oxfmt, Oxlint, and `git diff --check` pass.
- Remaining ambiguity: none identified.

## BT5-068 — BlackMachGaogamon — 10/10

- Catalog and ruling evidence: Black Lv.5 Ultimate Digimon, Data/Cyborg, play
  cost 8, 7000 DP, and black Lv.4 evolution cost 3. Its main text is Reboot,
  and its inherited Your Turn effect gives the host +2000 DP while that Digimon
  has Reboot. The knowledge base contains no card-specific ruling, errata,
  restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-068.ts` encodes an unconditional
  static Reboot keyword and an inherited owner-turn self aura that adds 2000 DP
  while `selfHasKeyword` Reboot. It declares full residual-free coverage and
  registers exclusively through `registerIrCard("BT5-068", compiled)`.
- Behavioral proof: five focused tests prove runtime registration, that Reboot
  does not immediately unsuspend the card, the inherited bonus on a legal
  evolution stack, removal of the bonus outside the controller's turn, and the
  positive boundary where another inherited source supplies Reboot later in
  the stack. The related BT2-055 tests exercise the shared Reboot mechanism.
- Defect corrected: none. The existing implementation and focused tests were
  already faithful, so no source or test file changed.
- Verification: focused BT5-068 — 5/5 passed; related BT2-055 Reboot coverage —
  3/3 passed. Targeted Oxfmt, Oxlint, and `git diff --check` pass. No
  typing-sensitive source changed.
- Remaining ambiguity: none identified.

## BT5-069 — BlackWarGreymon — 10/10

- Catalog and ruling evidence: Black Lv.6 Mega Digimon, Virus/Dragonkin, play
  cost 11, 12000 DP, and black Lv.5 evolution cost 4. Its complete effect text
  consists of Security Attack +1 and Reboot. The knowledge base contains no
  card-specific ruling, errata, restriction, or unresolved ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-069.ts` encodes both printed
  keywords as unconditional static effects, declares full residual-free
  coverage, and registers exclusively through
  `registerIrCard("BT5-069", compiled)`.
- Behavioral proof: the focused tests verify runtime registration, the exact
  Security Attack increment, Reboot availability, and that merely gaining
  Reboot does not immediately unsuspend the Digimon. BT5-068's focused stack
  tests exercise the same Reboot mechanism, while BT5-065's Security timing
  regression uses BT5-069 in a real attack and observes two security checks.
- Defect corrected: none. The implementation and existing cross-card proof were
  already faithful, so no source or test file changed.
- Verification: focused BT5-069 — 2/2 passed; related BT5-068 Reboot coverage —
  5/5 passed. The existing BT5-065 regression provides the real two-check
  Security Attack proof. Targeted Oxfmt, Oxlint, and `git diff --check` pass.
  No typing-sensitive source changed.
- Remaining ambiguity: none identified.

## BT5-070 — MetalGarurumon — 10/10

- Catalog and ruling evidence: Black Lv.6 Mega Digimon, Virus/Cyborg, play cost
  11, 11000 DP, and black Lv.5 evolution cost 3. It has Reboot and a When
  Digivolving Digi-Burst 2 effect that deletes exactly one opposing Digimon with
  play cost 6 or less; if no Digimon is actually deleted, it trashes the top of
  the opponent's security. Comprehensive §16-14-2 makes Digi-Burst processing
  optional. Q1345 defines the no-deletion branch, Q1346 requires choosing a
  legal target after activation, and Q1347 permits choosing a deletion-immune
  target so the security branch resolves.
- Implementation: `apps/api/src/cards/BT5/BT5-070.ts` encodes static Reboot and
  the evolution-triggered Digi-Burst chain. Its two-source trash cost is now
  optional and aborts the remaining chain when declined; the following Delete
  remains mandatory for one legal opposing play-cost-6-or-less target, and
  `ifThisEffectDidNotDelete` gates the top-security trash from the actual delete
  result. It declares full residual-free coverage and registers exclusively
  through `registerIrCard("BT5-070", compiled)`.
- Behavioral proof: six focused tests prove exact two-source payment while
  preserving the pre-existing stack card, instance-specific deletion at the
  play-cost-6 boundary, the no-target and above-cost security branches, complete
  refusal without source/deletion/security movement, Q1347 with a real immune
  BT14-062 chosen over another legal target, and Reboot unsuspension during the
  opponent's Active Phase. BT2-063 supplies related Reboot regression coverage.
- Defects corrected: Digi-Burst previously paid automatically despite its
  optional rules processing. The positive test also used BT2-047, whose printed
  play cost is 8 rather than the claimed boundary 6, and its non-throwing
  `settle` timeout allowed the invalid proof to continue. The IR optionality and
  all affected focused assertions were corrected.
- Verification: focused BT5-070 — 6/6 passed; related BT2-063 Reboot coverage —
  4/4 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-071 — Guilmon — 10/10

- Catalog and ruling evidence: Purple Lv.3 Rookie Digimon, Virus/Reptile, play
  cost 3, 2000 DP, and purple Lv.2 evolution cost 0. Its On Deletion effect
  gains 1 memory only if the card was deleted by an effect. Q1348 confirms that
  deletion by the game rule after DP reaches 0 is not deletion by an effect.
- Implementation: `apps/api/src/cards/BT5/BT5-071.ts` maps the On Deletion
  trigger to GainMemory 1 behind the exact `triggerRemovalCause: "byEffect"`
  condition. It declares full residual-free coverage and registers exclusively
  through `registerIrCard("BT5-071", compiled)`.
- Behavioral proof: focused coverage proves the positive effect-deletion path
  and the Q1348 negative path using an explicit 0-DP fixture deleted with the
  rule cause. Runtime registration is also asserted. The test now exercises the
  named public deletion seam instead of reaching through a private `any` cast.
- Defect corrected: no card behavior defect. The existing generic rule-deletion
  fixture was clarified as the exact 0-DP ruling scenario, and both deletion
  paths were moved to the supported test seam.
- Verification: focused BT5-071 — 3/3 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No source or shared engine
  behavior changed.
- Remaining ambiguity: none identified.

## BT5-072 — Fake Agumon Expert — 10/10

- Catalog and ruling evidence: Purple Lv.3 Rookie Digimon, Virus/Dinosaur, play
  cost 3, 1000 DP, and purple Lv.2 evolution cost 0. Its On Deletion effect may
  return one Lv.3 Digimon card with an On Deletion effect, other than Fake
  Agumon Expert, from the owner's trash to hand. Q1349 establishes that an On
  Deletion inherited effect does not satisfy this filter.
- Implementation: `apps/api/src/cards/BT5/BT5-072.ts` encodes an optional Return
  of exactly one own-trash Lv.3 Digimon whose direct effect text contains On
  Deletion, excluding the card name. The shared Return path resolves the exact
  loose trash instance into hand. The module declares full residual-free
  coverage and registers exclusively through
  `registerIrCard("BT5-072", compiled)`.
- Behavioral proof: focused tests prove one exact eligible instance returns
  from a pool containing two eligible copies, while the second copy, a
  same-name card, and the opponent's eligible card remain untouched. Q1349 is
  proven with an inherited-only On Deletion card, and an explicit refusal case
  leaves an eligible target in trash. Deletion uses the named test seam.
- Defect corrected: no executable behavior defect. Focused proof was
  strengthened for exact count, controller, same-name exclusion, inherited-text
  rejection, optional refusal, and supported deletion access.
- Verification: focused BT5-072 — 3/3 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No source or shared engine
  behavior changed.
- Remaining ambiguity: none identified.

## BT5-073 — Pillomon — 10/10

- Catalog and ruling evidence: Purple Lv.3 Rookie Digimon, Vaccine/Mammal, play
  cost 3, 4000 DP, and purple Lv.2 evolution cost 0. It has no main, inherited,
  Security, or alternate-evolution text. The knowledge base contains no
  card-specific ruling, errata, restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-073.ts` intentionally carries an
  empty effect list with full residual-free coverage and registers exclusively
  through `registerIrCard("BT5-073", compiled)`.
- Behavioral and structural proof: focused tests show that continuous
  recomputation leaves Pillomon at its printed base DP and that the empty module
  is present in the runtime registry with no residual behavior. Neighboring
  vanilla-card patterns and generated effect data agree.
- Defect corrected: none. The implementation and focused proof were already
  faithful, so no source or test file changed.
- Verification: focused BT5-073 — 2/2 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No typing-sensitive source
  changed.
- Remaining ambiguity: none identified.

## BT5-074 — Troopmon — 10/10

- Catalog and ruling evidence: Purple Lv.4 Champion Digimon, Data/Undead, play
  cost 4, 3000 DP, and purple Lv.3 evolution cost 2. Its On Deletion effect may
  play exactly one card literally named Troopmon from the owner's hand without
  paying its memory cost. The knowledge base contains no card-specific ruling,
  errata, restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-074.ts` encodes an optional
  PlayWithoutCost from the owner's hand, count 1 and `payCost: false`. Its
  bracketed card reference now uses `nameExact` rather than substring matching.
  It declares full residual-free coverage and registers exclusively through
  `registerIrCard("BT5-074", compiled)`.
- Behavioral and structural proof: focused coverage guards exact-name IR and
  proves that an alternate-set BT10-076 Troopmon is played for free at zero
  memory while the opponent's same-name card remains untouched. A different
  purple Digimon is rejected, and optional refusal leaves Troopmon in hand.
  Deletion uses the named test seam; the shared nameExact mechanism proves exact
  equality and rejection of longer containing names.
- Defect corrected: the target previously used substring `match: "name"`, which
  was broader than the literal `[Troopmon]` contract. It now uses `nameExact`;
  focused proof also covers controller, free-play, alternate printing, negative
  target, and refusal boundaries.
- Verification: focused BT5-074 — 4/4 passed; nameExact mechanism — 4/4 passed.
  Targeted Oxfmt, Oxlint, registration search, and `git diff --check` pass. No
  shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-075 — Musyamon — 10/10

- Catalog and ruling evidence: Purple Lv.4 Champion Digimon, Virus/Wizard, play
  cost 4, 4000 DP, and purple Lv.3 evolution cost 2. Its complete effect text
  is Jamming. The knowledge base contains no card-specific ruling, errata,
  restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-075.ts` publishes unconditional
  static Jamming, declares full residual-free coverage, and registers
  exclusively through `registerIrCard("BT5-075", compiled)`.
- Behavioral and mechanism proof: focused coverage verifies the runtime module
  and that continuous recomputation exposes Jamming on Musyamon. Targeted
  comprehensive §16-9 coverage proves that a weaker printed-Jamming attacker
  survives a losing battle against a Security Digimon, while the identical
  non-Jamming control is deleted.
- Defect corrected: none. The implementation and existing focused proof were
  already faithful, so no source or test file changed.
- Verification: focused BT5-075 — 2/2 passed; targeted Jamming security-battle
  conformance — 2/2 relevant tests passed. Targeted Oxfmt, Oxlint, registration
  search, and `git diff --check` pass. No typing-sensitive source changed.
- Remaining ambiguity: none identified.

## BT5-076 — BlackGrowlmon — 10/10

- Catalog and ruling evidence: Purple Lv.4 Champion Digimon, Virus/Dark Dragon,
  play cost 5, 4000 DP, and purple Lv.3 evolution cost 2. Its inherited Your
  Turn, Once Per Turn effect grants its host Security Attack +1 for the turn
  when another one of the controller's Digimon is deleted. The knowledge base
  contains no card-specific ruling, errata, restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-076.ts` installs an inherited
  owner-turn `onDeletionOf` watcher filtered to another own Digimon, then grants
  Security Attack +1 to the host for the turn. The effect carries Once Per Turn
  identity, full residual-free coverage, and exclusive
  `registerIrCard("BT5-076", compiled)` registration.
- Behavioral proof: focused coverage uses neutral vanilla deletion fixtures to
  prove the first own deletion grants exactly +1, an opponent deletion does not
  trigger, a second own deletion cannot stack the once-per-turn effect, the
  temporary keyword expires at owner turn end, and deletion during the
  opponent's turn does not trigger. Tests use the named deletion and continuous
  ledger seams.
- Defect corrected: no executable behavior defect. Focused proof was clarified
  with neutral fixtures and strengthened for turn ownership and duration while
  removing private primitive access.
- Verification: focused BT5-076 — 2/2 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No source or shared engine
  behavior changed.
- Remaining ambiguity: none identified.

## BT5-077 — Vajramon — 10/10

- Catalog and ruling evidence: Purple Lv.5 Ultimate Digimon, Vaccine/Holy
  Beast/Deva, play cost 7, 8000 DP, and purple Lv.4 evolution cost 2. It has no
  main, inherited, Security, or alternate-evolution text. The knowledge base
  contains no card-specific ruling, errata, restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-077.ts` intentionally carries an
  empty effect list with full residual-free coverage and registers exclusively
  through `registerIrCard("BT5-077", compiled)`.
- Behavioral and structural proof: focused tests show continuous recomputation
  leaves Vajramon at its printed base DP and confirm that the empty module is
  present in the runtime registry with no residual behavior.
- Defect corrected: none. The vanilla implementation and existing proof were
  already faithful, so no source or test file changed.
- Verification: focused BT5-077 — 2/2 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No typing-sensitive source
  changed.
- Remaining ambiguity: none identified.

## BT5-078 — Jokermon — 10/10

- Catalog and ruling evidence: Purple Lv.5 Ultimate Digimon, Virus/Wizard, play
  cost 7, 7000 DP, and purple Lv.4 evolution cost 3. Its On Deletion effect may
  play one purple Lv.3 Digimon card from the owner's trash without paying its
  memory cost, and suppresses that Digimon's On Play effects. The knowledge base
  contains no card-specific ruling, errata, restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-078.ts` encodes an optional
  PlayWithoutCost from own trash filtered to purple Lv.3 Digimon, with count 1,
  `payCost: false`, and `suppressOnPlayEffects: true`. It declares full
  residual-free coverage and registers exclusively through
  `registerIrCard("BT5-078", compiled)`.
- Behavioral proof: four focused tests prove an exact eligible instance enters
  play at zero memory while its real On Play draw is suppressed, reject a
  purple Digimon at the wrong level, select only the own purple Lv.3 from a
  mixed pool containing a wrong-color own card and an opponent candidate, and
  allow refusal while an eligible card remains in trash. Deletion uses the
  named test seam.
- Defect corrected: no executable behavior defect. Focused proof was
  strengthened for free-play memory, controller, color, level, exact movement,
  On Play suppression, and optional refusal; an initially ambiguous refusal
  fixture was split from the accepted mixed-pool filter proof.
- Verification: focused BT5-078 — 4/4 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No source or shared engine
  behavior changed.
- Remaining ambiguity: none identified.

## BT5-079 — BlackWarGrowlmon — 10/10

- Catalog and ruling evidence: Purple Lv.5 Ultimate Digimon, Virus/Cyborg, play
  cost 8, 7000 DP, and purple Lv.4 evolution cost 3. Its Main Digi-Burst 3
  effect may play one purple Lv.3 Digimon from the owner's trash without cost
  and without activating On Play effects. Its inherited When Attacking, Once
  Per Turn effect may delete another own Digimon to unsuspend its host. The
  knowledge base contains no card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-079.ts` now pays Digi-Burst 3 in a
  dedicated no-impact self action before offering the optional PlayWithoutCost,
  preserving the distinct activation-cost and payload choices. The inherited
  action deletes exactly one other own Digimon as its optional cost, unsuspends
  self, and carries Once Per Turn identity. The module declares full
  residual-free coverage and registers exclusively through `registerIrCard`.
- Behavioral proof: five focused tests use legal purple stacks and prove exact
  three-source Digi-Burst payment, zero-memory play, On Play suppression, and
  the valid path where the cost is paid before the play is refused. Real attacks
  prove another own Digimon is deleted to unsuspend the host, a second attack in
  the same turn cannot reuse the effect, no-target resolution stays suspended,
  and explicit refusal preserves the eligible cost Digimon and suspension.
- Defect corrected: optional PlayWithoutCost previously carried the Digi-Burst
  cost itself. Because optional actions are asked before attached generic costs,
  this collapsed the two printed choices and made refusing the play also avoid
  Digi-Burst payment. The cost and optional payload are now ordered separately;
  test fixtures and private engine access were also corrected.
- Verification: focused BT5-079 — 5/5 passed; targeted optional-cost interpreter
  subset — 2/2 relevant tests passed. Targeted Oxfmt, Oxlint, registration
  search, and `git diff --check` pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-080 — Zanbamon — 10/10

- Catalog and ruling evidence: Purple Lv.6 Mega Digimon, Virus/Wizard, play cost
  10, 10000 DP, and purple Lv.5 evolution cost 2. Its complete effect text is
  Retaliation. The knowledge base contains no card-specific ruling, errata,
  restriction, or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-080.ts` publishes unconditional
  static Retaliation, declares full residual-free coverage, and registers
  exclusively through `registerIrCard("BT5-080", compiled)`.
- Behavioral and mechanism proof: the focused combat uses a legal purple Lv.5
  source under Zanbamon and proves the lower-DP Retaliation holder is deleted in
  battle and then deletes the opposing winner. Targeted mechanism controls prove
  Retaliation fires when the holder dies and does not fire merely because the
  surviving Digimon has the keyword. Runtime registration is also asserted.
- Defect corrected: no executable behavior defect. The focused fixture was made
  a legal evolution stack and now explicitly asserts deletion of both combatants
  rather than observing only the opponent's removal.
- Verification: focused BT5-080 — 2/2 passed; targeted Retaliation holder and
  survivor controls — 2/2 passed. Targeted Oxfmt, Oxlint, registration search,
  and `git diff --check` pass. No source or shared engine behavior changed.
- Remaining ambiguity: none identified.

## BT5-081 — ChaosGallantmon — 10/10

- Catalog and ruling evidence: Purple Lv.6 Mega Digimon, Virus/Dark Knight,
  play cost 12, 12000 DP, and purple Lv.5 evolution cost 4. When Digivolving it
  may delete another own Digimon to delete one opposing Lv.5-or-lower Digimon.
  Its Your Turn, Once Per Turn watcher may play one purple Lv.3 Digimon from own
  trash for free and suppress its On Play effects when another own Digimon is
  deleted. Q1380 confirms no retroactive trigger for a deletion before entry;
  Q2146 confirms normal evolution-requirement and level boundaries.
- Implementation: `apps/api/src/cards/BT5/BT5-081.ts` encodes the optional own
  other-Digimon deletion cost and mandatory Lv.5-or-lower opposing target, plus
  an owner-turn `onDeletionOf` watcher filtered to another own Digimon. Its
  nested optional PlayWithoutCost is purple Lv.3, own-trash, count 1, free, and
  suppresses On Play. Once Per Turn, full residual-free coverage, and exclusive
  `registerIrCard("BT5-081", compiled)` registration are preserved.
- Behavioral proof: seven focused tests prove legal evolution, exact Lv.5
  deletion and Lv.6 rejection with cost preservation, first-effect refusal,
  opponent-deletion exclusion on an unused watcher, mixed-pool color/level/
  controller/count filters, Once Per Turn, nested play refusal, opponent-turn
  gating, and On Play suppression. A legal digivolution also proves the card is
  already present when its own cost deletion occurs and can observe that event,
  consistently contrasting Q1380's pre-entry timing boundary.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  to remove a false controller proof that occurred only after the Once Per Turn
  effect was consumed, and to cover both optional decisions, mixed targeting,
  exact timing, and supported deletion access.
- Verification: focused BT5-081 — 7/7 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No source or shared engine
  behavior changed.
- Remaining ambiguity: none identified.

## BT5-082 — Tactimon — 10/10

- Catalog and ruling evidence: Purple Lv.6 Mega Digimon, Data/Wizard, play cost
  12, 11000 DP, and purple Lv.5 evolution cost 3. When Attacking it activates
  one of three bullets—gain 1 memory, gain +2000 DP for the turn, or delete up
  to three opposing Lv.3 Digimon—but activates all three if no other own Digimon
  is in play. Q1350 permits choosing any one bullet with another Digimon; Q1351
  gives the owner control of the activation order when all three apply.
- Implementation: `apps/api/src/cards/BT5/BT5-082.ts` now shares three exact
  option bodies between two conditional Modals: `choose: 1` when another own
  Digimon exists and `choose: 3` when none exists. The latter preserves the
  controller's selected order through the Modal executor. The delete remains
  up to three opposing Lv.3 Digimon. Full residual-free coverage and exclusive
  `registerIrCard("BT5-082", compiled)` registration remain intact.
- Behavioral proof: seven focused tests prove the all-three state, each
  individual Q1350 mode with the other two inactive, up-to-three exact Lv.3
  deletion with a Lv.4 survivor, and Q1351 through manual non-default
  delete→DP→memory decisions. The recorded prompts prove three shrinking choice
  sets and the final board, memory, and DP confirm every selected bullet ran.
- Defect corrected: the no-other-Digimon branch previously used three fixed
  sequential conditional actions, contradicting Q1351's owner-chosen order. It
  now uses a three-choice Modal; focused tests were expanded to cover all modes,
  order, and the level boundary.
- Verification: focused BT5-082 — 7/7 passed; targeted Modal mechanism — 5/5
  passed. API typecheck, targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-083 — Megidramon — 10/10

- Catalog and ruling evidence: Purple Lv.6 Mega Digimon, Virus/Evil Dragon/Four
  Great Dragons, play cost 12 and 11000 DP, evolving for 3 from either purple or
  red Lv.5. When Digivolving both players trash the top five cards of their
  decks. On Deletion, if the controller has a Tamer, it may play one Lv.6
  Digimon with Gallantmon in its name from own hand or trash for free. The
  knowledge base contains no card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-083.ts` maps the evolution trigger
  to TrashTopDeck 5 for both players. Its optional On Deletion PlayWithoutCost
  is gated by an own battle-area Tamer and filters own hand/trash for a Lv.6
  Digimon whose name contains Gallantmon. Full residual-free coverage and
  exclusive `registerIrCard("BT5-083", compiled)` registration are preserved.
- Behavioral proof: eight focused tests exercise legal purple and red Lv.5
  evolution paths, exact top-five instance identity for both players with each
  sixth card preserved, and fewer-than-five clamping. On Deletion tests prove
  valid Gallantmon plays from both trash and hand, wrong level and wrong name
  remain, optional refusal, and that an opponent-only Tamer cannot satisfy the
  gate. Free play uses exact instance movement through the named deletion seam.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for exact deck boundary/order, both printed evolution requirements, both play
  zones, name/level filters, refusal, and Tamer ownership.
- Verification: focused BT5-083 — 8/8 passed; targeted TrashTopDeck and
  PlayWithoutCost interpreter subset — 4/4 passed; affected capability subset —
  14/14 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No source or shared engine behavior changed.
- Remaining ambiguity: none identified.

## BT5-084 — Diaboromon — 10/10

- Catalog and ruling evidence: White Lv.6 Mega Digimon, Unknown/Unidentified,
  play cost 11, 11000 DP, and black Lv.5 evolution cost 3. When Digivolving it
  may play one Diaboromon Token without cost. Q1352 defines the token semantics
  and Q1353 confirms that Diaboromon Tokens satisfy White color requirements.
- Implementation: `apps/api/src/cards/BT5/BT5-084.ts` encodes an optional,
  count-1, cost-free PlayToken for Diaboromon on the evolution trigger. The
  shared token registry supplies the corrected White Lv.6, play cost 14, 3000
  DP, Mega, Unknown, Unidentified definition. The module declares full
  residual-free coverage and registers exclusively through `registerIrCard`.
- Behavioral proof: focused tests use a legal black Lv.5 evolution and prove one
  exact face-up `TOKEN-Diaboromon` enters for the correct owner/controller,
  without consuming memory beyond the evolution cost. Every printed token stat,
  color, form, attribute, type, and token identity is asserted. Refusal leaves
  only the evolved Digimon. BT5-067 and PlayToken primitive suites provide peer
  identity, deletion-created token, allocation, and count regression coverage.
- Defect corrected: no additional source defect beyond the shared token metadata
  correction delivered with BT5-067. Focused BT5-084 proof was strengthened for
  exact identity, ownership, controller, face, all traits/stats, and free play.
- Verification: focused BT5-084 — 2/2 passed; BT5-067 token peer — 5/5 passed;
  PlayToken primitive subset — 3/3 passed. Targeted Oxfmt, Oxlint, registration
  search, and `git diff --check` pass. No source or shared engine behavior
  changed in this audit.
- Remaining ambiguity: none identified.

## BT5-085 — Armageddemon — 10/10

- Catalog and ruling evidence: White Lv.7 Mega Digimon,
  Unknown/Unidentified, play cost 15 and 15000 DP, evolving for 3 from black or
  white Lv.6. When played from hand, it may delete one own Digimon named exactly
  Diaboromon to reduce its play cost by 12. It has Rush, and while present all
  Lv.7 Digimon cannot activate When Digivolving effects. Q1354 confirms that a
  Diaboromon Token satisfies the deletion cost; Q1355 and Q5520–Q5523 define
  the exact activation restriction boundaries.
- Implementation: `apps/api/src/cards/BT5/BT5-085.ts` uses an optional
  BeforePayCost deletion with `nameExact` and a −12 play-cost modifier. Rush is
  an intrinsic static keyword with no targeting action. A continuous
  any-controller, exact-Lv.7 restriction installs
  `cannotActivateWhenDigivolving`. Full residual-free coverage and exclusive
  `registerIrCard("BT5-085", compiled)` registration are preserved.
- Behavioral proof: five focused tests prove that an own Diaboromon Token is
  the only sacrificed card in a mixed field, while an own Diaboromon (X
  Antibody), unrelated own Digimon, and opposing Diaboromon survive. They prove
  the exact reduced and full play costs, optional refusal, same-turn Rush,
  intrinsic-keyword structure without a GainKeyword action, both controllers'
  Lv.7 restriction, an unrestricted Lv.6 base, and suppression of a real Lv.7
  When Digivolving effect while the normal evolution draw still occurs.
- Defects corrected: the sacrifice filter previously used a substring name
  match, which incorrectly admitted Diaboromon (X Antibody). Rush also had a
  redundant permanent GainKeyword action targeting any own Armageddemon. The
  filter is now exact and Rush is represented only as the card's intrinsic
  keyword.
- Verification: focused BT5-085 — 5/5 passed; targeted
  `cannotActivateWhenDigivolving` capability subset — 2/2 passed. Targeted
  Oxfmt, Oxlint, registration search, and `git diff --check` pass. No shared
  engine seam changed.
- Remaining ambiguity: none identified.

## BT5-086 — Omnimon — 10/10

- Catalog and ruling evidence: White Lv.7 Mega Digimon, Vaccine/Royal Knight,
  play cost 15 and 14000 DP, evolving for 4 from red or blue Lv.6. When
  Digivolving it has Blitz and unsuspends itself. On all turns, if an opponent's
  effect would delete it or return it to hand or deck, its controller may trash
  one Lv.6 Digimon evolution source to prevent that departure. Q1356 defines
  the Blitz/unsuspend sequence, Q1357 confirms a prevented departure is not a
  deletion, and Q2858 covers the resulting attack behavior.
- Implementation: `apps/api/src/cards/BT5/BT5-086.ts` represents Blitz as an
  intrinsic When Digivolving keyword, independently unsuspends self, and uses
  an optional `wouldLeavePlay` replacement limited to opponent effects with an
  exact Lv.6 Digimon source cost. Full residual-free coverage and exclusive
  `registerIrCard("BT5-086", compiled)` registration are preserved.
- Behavioral proof: five focused tests prove legal red-Lv.6 evolution,
  self-unsuspension, Blitz, and an immediate real attack. They also prove
  prevention of opponent-effect deletion, hand return, and deck return; exact
  consumption of a Lv.6 source while a non-Lv.6 source remains; and optional
  refusal allowing the complete stack to be deleted.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  across every departure destination, exact source identity/level, refusal,
  and real post-evolution attack behavior.
- Verification: focused BT5-086 — 5/5 passed; shared leave-prevention mechanism
  — 18/18 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.

## BT5-087 — Omnimon Zwart — 10/10

- Catalog and ruling evidence: White Lv.7 Mega Digimon, Vaccine/Royal Knight,
  play cost 15 and 15000 DP, evolving for 6 from black or purple Lv.6. When
  Digivolving it trashes the top three cards of its deck, then may play up to
  two black and/or purple Digimon with play cost 8 or less from its trash for
  free. When Attacking it may return one Lv.6 Digimon card from this Digimon's
  evolution cards to hand to delete one unsuspended opposing Digimon with play
  cost 12 or less. Q1358 confirms played cards need not be among the three just
  trashed; Q1359 confirms the combined maximum is two.
- Implementation: `apps/api/src/cards/BT5/BT5-087.ts` sequences TrashTopDeck 3
  and an optional, `upTo` two, black/purple PlayWithoutCost from own trash. Its
  optional attack deletion filters exact suspension/cost boundaries and pays
  by returning an exact Lv.6 Digimon source whose `hostFilter` is self. Full
  residual-free coverage and exclusive `registerIrCard("BT5-087", compiled)`
  registration are preserved.
- Behavioral proof: six focused tests prove exact milling and legal mixed-color
  plays while cost-9 and wrong-color cards remain; refusal; and the one-card
  up-to-two boundary. Attack tests prove the exact unsuspended/cost-12 target,
  rejection of suspended and cost-15 targets, self-hosted Lv.6 source payment
  while another Omnimon's source remains, optional refusal, and no cost payment
  when no target is legal.
- Defects corrected: the trash-play target omitted `upTo`, and the return cost
  omitted a self host filter, allowing a Lv.6 evolution source from another
  permanent to satisfy the cost. Both scopes are now explicit and covered by
  regression tests.
- Verification: focused BT5-087 — 6/6 passed; targeted host-filter interpreter
  mechanism — 3/3 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-088 — Sora Takenouchi & Joe Kido — 10/10

- Catalog and ruling evidence: Blue Tamer with play cost 4. At the start of the
  controller's turn it gains 2 memory if the opponent has a Digimon with no
  evolution cards. During the controller's turn, when an own blue Digimon
  attacks, this Tamer may suspend to trash the bottom two evolution cards of
  one opposing Digimon. Its Security effect plays itself for free. The
  knowledge base contains no additional card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-088.ts` applies the exact opposing
  no-source condition and memory amount, installs a controller-turn attack
  subtrigger limited to own blue Digimon, and uses an optional self-suspend
  cost before bottom-source TrashDigivolution 2. Security plays self without
  cost. Full residual-free coverage and exclusive
  `registerIrCard("BT5-088", compiled)` registration are preserved.
- Behavioral proof: six focused tests prove the start-turn condition and +2
  memory, correct blue-attacker scope, exact bottom-two source instance removal
  with the top source preserved, clamping to the sole available source, and
  optional refusal leaving both Tamer and stack unchanged. Security proof
  confirms self enters play without a memory payment.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for exact bottom ordering, fewer-than-two clamping, and refusal boundaries.
- Verification: focused BT5-088 — 6/6 passed; targeted TrashDigivolution
  interpreter mechanism — 4/4 passed. Targeted Oxfmt, Oxlint, registration
  search, and `git diff --check` pass. No production or shared engine source
  changed.
- Remaining ambiguity: none identified.

## BT5-089 — Izzy Izumi & Mimi Tachikawa — 10/10

- Catalog and ruling evidence: Green Tamer with play cost 4. At the start of the
  controller's turn it gains 2 memory if the opponent has a suspended Digimon.
  During the controller's turn, when an own green Lv.5 attacks, this Tamer may
  suspend to reveal the top three cards, may evolve the attacker into one
  revealed green Lv.6 for free, and places the rest at deck bottom in any
  order. Security plays it for free. Q1360–Q1367 confirm the timing,
  optionality, reveal boundary, evolution behavior, ordering, and activation
  boundaries.
- Implementation: `apps/api/src/cards/BT5/BT5-089.ts` maps the exact suspended
  opponent memory condition, installs an own green exact-Lv.5 attack
  subtrigger, and uses an optional self-suspend RevealAdd with optional free
  evolution onto the trigger source and bottom-any-order cleanup. Security
  plays self without cost. Full residual-free coverage and exclusive
  `registerIrCard("BT5-089", compiled)` registration are preserved.
- Behavioral proof: eight focused tests prove the memory condition, exact
  attack source scope, free revealed evolution and remaining-card bottom
  ordering, no valid evolution choice, refusal before reveal, fewer-than-three
  deck clamping, rejection of a green non-Lv.5 attacker, and free Security play.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for refusal, short-deck behavior, and exact attacker-level exclusion.
- Verification: focused BT5-089 — 8/8 passed; targeted RevealAdd interpreter
  mechanism — 7/7 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.

## BT5-090 — Arata Sanada — 10/10

- Catalog and ruling evidence: Black Tamer with play cost 3. At the start of the
  controller's turn it gains 1 memory if own trash contains an Unidentified
  Digimon. During the controller's turn, when an own Digimon evolves into a
  card named exactly Diaboromon, this Tamer may suspend to play one Diaboromon
  Token for free. Security plays it for free. Q1368 confirms the token identity
  and the shared token definition supplies White Lv.6, play cost 14, 3000 DP,
  Mega, Unknown, and Unidentified metadata.
- Implementation: `apps/api/src/cards/BT5/BT5-090.ts` gates the memory gain on
  own trash, installs an exact `nameExact` Diaboromon digivolution watcher with
  an optional self-suspend PlayToken action, and plays self without cost from
  Security. Full residual-free coverage and exclusive
  `registerIrCard("BT5-090", compiled)` registration are preserved.
- Behavioral proof: six focused tests prove the trash condition and exact +1
  memory, real Diaboromon evolution, self suspension, free token creation and
  full token metadata, exclusion of an unrelated evolution and Diaboromon (X
  Antibody), optional refusal, and free Security play.
- Defect corrected: the evolution watcher used substring `name` matching and
  incorrectly treated Diaboromon (X Antibody) as exact Diaboromon. It now uses
  `nameExact`, with a real near-name regression fixture.
- Verification: focused BT5-090 — 6/6 passed; BT5-084 token peer and exact-name
  mechanism — 6/6 passed. Targeted Oxfmt, Oxlint (one pre-existing harness
  warning only), registration search, and `git diff --check` pass. No shared
  engine seam changed.
- Remaining ambiguity: none identified.

## BT5-091 — Takumi Aiba — 10/10

- Catalog and ruling evidence: White Tamer with play cost 2. During the
  controller's turn, when an own Digimon evolves, this Tamer may suspend to
  draw 1. On all turns every Lv.3 Digimon gains "When Attacking: lose 1
  memory." Security plays it for free. Q1369 confirms own Lv.3 Digimon are
  included, and Q1370 confirms multiple Takumi copies grant separately and
  therefore stack.
- Implementation: `apps/api/src/cards/BT5/BT5-091.ts` installs the optional
  digivolution draw watcher only during the owner's turn, with self suspension
  represented once as its activation cost. Own Lv.3 attacks use the direct
  ally attack timing, while opposing Lv.3 Digimon receive the named effect via
  GrantStatic so their attacks resolve from their controller's perspective.
  Security plays self without cost. Full residual-free coverage and exclusive
  `registerIrCard("BT5-091", compiled)` registration are preserved.
- Behavioral proof: seven focused tests prove own-turn evolution draw and
  suspension, opponent-turn exclusion, optional refusal, one-copy −1 memory,
  two-copy −2 stacking, the same penalty on an opponent's Lv.3 attack, Lv.4
  exclusion, and free Security play.
- Defects corrected: the draw watcher incorrectly used AllTurns and duplicated
  self suspension as both a cost and an action. The direct opponent attack
  scope also failed to collect attacks from the other controller; it is now a
  named static grant to opposing Lv.3 Digimon, with the working direct path
  retained for own attackers and multi-copy behavior.
- Verification: focused BT5-091 — 7/7 passed; BT9-102 GrantStatic peer — 2/2
  passed. Targeted Oxfmt, Oxlint, registration search, and `git diff --check`
  pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-092 — Nokia Shiramine — 10/10

- Catalog and ruling evidence: White Tamer with play cost 3. On Play it may play
  one card named exactly Agumon or Gabumon from hand for free. Its Main effect
  may suspend this Tamer to reduce by 1 the next evolution cost into a Digimon
  with Garurumon, Omnimon, or Greymon in its name, excluding cards named exactly
  DoruGreymon, BurningGreymon, or DexDoruGreymon. Security plays it for free.
  Rule sections 2-3-1, 15-8-4, and 15-16-7 establish bracketed literal names
  and Main activation timing.
- Implementation: `apps/api/src/cards/BT5/BT5-092.ts` uses `nameExact` for both
  On Play names, a Main CostModifier with self-suspend restriction and
  for-the-turn duration, family substring matching, and exact-name exclusions.
  Security plays self without cost. Full residual-free coverage and exclusive
  `registerIrCard("BT5-092", compiled)` registration are preserved.
- Behavioral proof: nine focused tests cover both literal-name free-play
  branches, rejection of extended and deceptive Agumon names, refusal, explicit
  Main activation, exact reduced cost and suspension, unrelated destination,
  already-suspended cost failure, exact DoruGreymon exclusion, and free Security
  play. Structural assertions lock every name mode and activation timing.
- Defects corrected: the reducer was encoded as a passive YourTurn effect
  instead of Main activation. Agumon/Gabumon targets used substring matching,
  and the three exclusions lacked explicit exact-name filters. Timing and all
  literal-name boundaries are now corrected.
- Verification: focused BT5-092 — 9/9 passed; P-098 peer — 4/4; exact-name
  mechanism — 4/4; targeted CostModifier interpreter — 10/10; CAP-C-10 — 5/5.
  Targeted Oxfmt, Oxlint, registration search, and `git diff --check` pass. No
  shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-093 — Tai Kamiya & Matt Ishida — 10/10

- Catalog and ruling evidence: White Tamer with play cost 4. At the start of the
  controller's turn it gains 2 memory if the opponent has a Lv.6 or higher
  Digimon. During the controller's turn all own Digimon with Omnimon in their
  names gain Security Attack +1. Security plays it for free. Knowledge-base
  entries Q2189/Q3191 describe unrelated text and are not applicable to this
  committed catalog definition.
- Implementation: `apps/api/src/cards/BT5/BT5-093.ts` uses the exact opponent
  Lv.6+ condition, a controller-turn aura for all own Omnimon-family Digimon,
  and cost-free self play from Security. Full residual-free coverage and
  exclusive `registerIrCard("BT5-093", compiled)` registration are preserved.
- Behavioral proof: five focused tests prove the positive and negative memory
  conditions, including that an own Lv.6 does not qualify; all own Omnimon
  targets gain exactly +1 while an opposing Omnimon does not; the aura lapses
  on the opponent's turn; and Security plays the Tamer without cost.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for controller side, level threshold, aura ownership, and turn expiry.
- Verification: focused BT5-093 — 5/5 passed; BT5-057 turn-scope peer — 1/1;
  exact-name mechanism — 4/4. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.

## BT5-094 — Rowdy Rocker — 10/10

- Catalog and ruling evidence: Red Option with use cost 2. Main may place one
  red Lv.4-or-lower Digimon card from hand at the bottom of one own Digimon's
  evolution cards; if placement succeeds, draw 2. Security adds this card to
  its owner's hand. Q1371 confirms a Digimon stack originating from a Tamer is
  a legal host, and Q1372 confirms the placed source persists through
  De-Digivolve.
- Implementation: `apps/api/src/cards/BT5/BT5-094.ts` uses an optional
  PlaceUnder from own hand with exact red/Lv.4-or-lower filtering, own Digimon
  host and bottom placement, then a success-gated Draw 2. Security returns self
  to hand. Full residual-free coverage and exclusive
  `registerIrCard("BT5-094", compiled)` registration are preserved.
- Behavioral proof: four focused tests prove paid Option cost, exact level/color
  boundaries, own-host filtering against an opposing candidate, bottom stack
  identity and order, a legal Tamer-derived Digimon host, conditional Draw 2,
  optional refusal with no draw, and exact Security routing to hand.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for every target/host boundary, bottom order, success coupling, refusal, and
  the Q1371 host case.
- Verification: focused BT5-094 — 4/4 passed; targeted PlaceUnder interpreter
  mechanism — 5/5 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.

## BT5-095 — Transcendent Sword — 10/10

- Catalog and ruling evidence: Red Option with use cost 7. Main deletes one
  opposing Digimon with 11000 DP or less; if the controller has an Omnimon or a
  Digimon with Greymon in its name, excluding cards named exactly DoruGreymon,
  BurningGreymon, and DexDoruGreymon, the ceiling becomes 15000 DP instead.
  Security activates the Main effect. The local knowledge base contains no
  card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-095.ts` encodes mutually exclusive
  one-target Delete branches at the exact DP ceilings, with own-board
  Omnimon/Greymon qualification and explicit `nameExact` exclusions. Security
  activates Main. Full residual-free coverage and exclusive
  `registerIrCard("BT5-095", compiled)` registration are preserved.
- Behavioral proof: seven focused tests prove the exact 11000 and 15000
  boundaries, one deletion among multiple legal targets, opponent-only
  targeting, upgrade from an own Omnimon, no upgrade from an opposing Omnimon
  or excluded DoruGreymon, resolution with no legal target, and Security
  activation. Structural proof locks both branches and every exact exclusion.
- Defect corrected: the three excluded names used the legacy `excludeNames`
  representation without explicit literal semantics. They now use
  `excludeNameOrTrait` entries with `nameExact`; the focused test also waits for
  the exact post-resolution board rather than an impossible intermediate size.
- Verification: focused BT5-095 — 7/7 passed; BT5-096 peer — 3/3; exact-name
  mechanism — 4/4; targeted activation/deletion interpreter subset — 9/9.
  Targeted Oxfmt, Oxlint, registration search, and `git diff --check` pass. No
  shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-096 — Supreme Cannon — 10/10

- Catalog and ruling evidence: Blue Option with use cost 5. Main returns all
  opposing Digimon with 3000 DP or less to their owners' hands, trashing all of
  those Digimon's evolution cards; if the controller has a Digimon with
  Garurumon or Omnimon in its name, it returns all at 5000 DP or less instead.
  Security activates the Main effect. The local knowledge base contains no
  card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-096.ts` encodes mutually exclusive
  `youHaveNone` 3000-DP and `youHave` 5000-DP Return-all branches, both scoped
  to opposing Digimon and preserving the shared return primitive's source-trash
  behavior. Security activates Main. Full residual-free coverage and exclusive
  `registerIrCard("BT5-096", compiled)` registration are preserved.
- Behavioral proof: four focused tests lock both mutually exclusive branches,
  all-target behavior, exact 3000/5000 boundaries, survival above each ceiling,
  and trashing every returned stack's evolution cards. They also prove own
  Digimon are unaffected, an opposing Garurumon does not qualify, and Security
  activates the threshold logic.
- Defect corrected: the base 3000-DP Return action was unconditional, so the
  upgraded state executed both it and the printed "instead" 5000-DP action.
  It is now guarded by the inverse `youHaveNone` condition.
- Verification: focused BT5-096 — 4/4 passed; targeted return-to-hand primitive
  subset — 7/7 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No shared engine seam changed.
- Remaining ambiguity: none identified.

## BT5-097 — Absolute Blast — 10/10

- Catalog and ruling evidence: Blue Option with use cost 6. Main trashes the
  bottom evolution card of one opposing Digimon, then places one opposing
  Digimon with no evolution cards at the bottom of its owner's deck. Security
  activates Main. Q1373 confirms the two selected Digimon may be different.
- Implementation: `apps/api/src/cards/BT5/BT5-097.ts` sequences an opposing
  source-bearing TrashDigivolution 1 from bottom and an opposing no-source
  Return to deck bottom. Security activates Main. Full residual-free coverage
  and exclusive `registerIrCard("BT5-097", compiled)` registration are
  preserved.
- Behavioral proof: three focused tests prove distinct Q1373 targets, exact
  bottom-source identity with the top source retained, opponent-only selection
  while an own no-source Digimon remains, and exact bottom-deck destination,
  order, and instance identity. Security proof executes the same Main sequence.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for distinct targets, source order and identity, controller scope, and deck
  bottom ordering.
- Verification: focused BT5-097 — 3/3 passed; targeted return-to-deck primitive
  subset — 3/3 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.

## BT5-098 — Meteor Shower — 10/10

- Catalog and ruling evidence: Yellow Option with use cost 3. Main may play one
  yellow Digimon card with Starmon in its name from the controller's hand
  without paying its memory cost. Security activates Main. The local knowledge
  base contains no card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-098.ts` uses an optional,
  count-one PlayWithoutCost from own hand with exact Digimon/yellow filters and
  Starmon name containment. Security activates Main. Full residual-free
  coverage and exclusive `registerIrCard("BT5-098", compiled)` registration are
  preserved.
- Behavioral proof: four focused tests prove a legal Starmons instance enters
  for free with memory unchanged beyond the Option cost, while a non-yellow
  candidate and a yellow non-Starmon both remain in hand. Refusal preserves an
  eligible card and board, and Security executes the same Main effect.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  to distinguish color from name filtering and cover explicit refusal.
- Verification: focused BT5-098 — 4/4 passed; optional PlayWithoutCost
  interpreter mechanism — 1/1 passed. Targeted Oxfmt, Oxlint, registration
  search, and `git diff --check` pass. No production or shared engine source
  changed.
- Remaining ambiguity: none identified.

## BT5-099 — Spiral Masquerade — 10/10

- Catalog and ruling evidence: Yellow Option with use cost 4. Main gives one
  opposing Digimon −3000 DP for the turn for each own Digimon in play. Security
  activates Main. Q1374 confirms two own Digimon produce two applications,
  including cumulative application to one target.
- Implementation: `apps/api/src/cards/BT5/BT5-099.ts` uses RepeatPerCount over
  own battle-area Digimon and applies a one-target opposing ModifyDP −3000 with
  for-the-turn duration on each iteration. Security activates Main. Full
  residual-free coverage and exclusive `registerIrCard("BT5-099", compiled)`
  registration are preserved.
- Behavioral proof: four focused tests prove two iterations accumulating
  exactly −6000 on one opposing Digimon, opponent-only targeting while another
  opposing choice remains, restoration at the each-turn-end modifier boundary,
  a zero-own-Digimon no-op, and Security activation of the scaled effect.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for cumulative Q1374 behavior, duration expiry, and the zero-count boundary.
- Verification: focused BT5-099 — 4/4 passed. Targeted Oxfmt, Oxlint,
  registration search, and `git diff --check` pass. No production or shared
  engine source changed.
- Remaining ambiguity: none identified.

## BT5-100 — Royal Nuts — 10/10

- Catalog and ruling evidence: Green Option with use cost 3. Main reveals the
  top five cards, adds one Digimon card with Digisorption among them to hand,
  and places the remaining revealed cards at deck bottom in any order. Security
  adds this card to its owner's hand. The local knowledge base contains no
  card-specific ruling or ambiguity.
- Implementation: `apps/api/src/cards/BT5/BT5-100.ts` uses RevealAdd 5 with a
  count-one Digimon keyword filter, deck-bottom cleanup, and AddToHandSelf for
  Security. Full residual-free coverage and exclusive
  `registerIrCard("BT5-100", compiled)` registration are preserved.
- Behavioral proof: three focused tests prove exactly five revealed cards with
  an unrevealed sentinel preserved, exactly one chosen instance among duplicate
  eligible Digisorption cards, and every other revealed instance placed below
  the sentinel. The no-match case bottoms all five, and Security moves the exact
  Option instance to hand.
- Defect corrected: no executable behavior defect. Focused proof was expanded
  for reveal count, duplicate eligibility, exact selection cardinality,
  remaining-card destination, no-match cleanup, and instance identity.
- Verification: focused BT5-100 — 3/3 passed; targeted RevealAdd interpreter
  mechanism — 7/7 passed. Targeted Oxfmt, Oxlint, registration search, and
  `git diff --check` pass. No production or shared engine source changed.
- Remaining ambiguity: none identified.
