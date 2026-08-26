# BT25 Card Implementation Audit

This ledger records evidence in ascending card-ID order. A card receives 10/10 only after its complete catalog contract and local knowledge-base record are inspected, every clause is traced through its direct compiled-IR module and relevant shared primitives, and existing observable behavioral proof passes. In accordance with the requested audit policy, an already-correct card does not receive newly created tests; tests are added or strengthened when the audit finds a defect.

## BT25-001 — Tokomon — 10/10

- Catalog evidence: Red level-2 Digi-Egg, `In-Training` form, `Lesser` type, `TS` trait, no evolution recipe, no main or Security text, and inherited `[When Attacking] [Once Per Turn] If this Digimon has the [TS] trait, <Draw 1>`.
- Knowledge base: `node tools/kb/query.mjs card BT25-001` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT25-001.ts` contains one inherited `WhenAttacking`, `OncePerTurn` effect whose conditional `Draw 1` uses `selfHasTrait(TS)`. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-001", compiled)`.
- Behavioral proof: the existing focused suite uses realistic Tokomon-under-host stacks, draws exactly once for a TS carrier across two attacks in the same turn, and does not draw for a non-TS carrier. The audit found no defect, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; shared package build — passed in the delegated audit; `git diff --check` — passed. Workspace typecheck currently reports unrelated pre-existing errors in `EX6-010.test.ts` and shared removal, `runAction`, and targeting primitives; no BT25-001 file or shared seam changed.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-001
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-001.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-001.test.ts
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-001.

## BT25-002 — Wanyamon — 10/10

- Catalog evidence: Blue level-2 Digi-Egg, `In-Training` form, `Lesser` and `DATA SQUAD` traits, no evolution recipe, no main or Security text, and inherited `[Your Turn] [Once Per Turn] When you play a [DATA SQUAD] trait Tamer, both players draw 1 card`.
- Knowledge base: `node tools/kb/query.mjs card BT25-002` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT25-002.ts` installs an inherited `YourTurn`, `OncePerTurn` `whenPlayed` watcher, restricts the event subject to the controller's `DATA SQUAD` Tamer, then draws exactly 1 for `mine` and 1 for `opponent`. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-002", compiled)`.
- Behavioral proof: the existing focused suite proves both players draw from the controller's first matching Tamer, a second matching Tamer does not retrigger that turn, and an opponent-owned matching Tamer does not trigger it. The audit found no defect, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; shared subtrigger regression — 23 passed; green-Tamer mechanism selection — 2 passed; `git diff --check` — passed. Workspace typecheck reports only the already-recorded unrelated pre-existing errors and no BT25-002 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-002
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-002.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-002.test.ts
pnpm --filter @aegis/api exec vitest run src/engine/effects/subtriggers.test.ts
pnpm --filter @aegis/api exec vitest run src/engine/mechanic.test.ts -t 'green Tamer'
pnpm typecheck
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-002.

## BT25-003 — Frimon — 10/10

- Catalog evidence: Yellow level-2 Digi-Egg, `In-Training` form, `Lesser` and `Glowing Dawn` traits, no evolution recipe, no main or Security text, and inherited `[When Attacking] [Once Per Turn] By trashing your top security card, this Digimon may digivolve into a [Glowing Dawn] trait Digimon card in the hand with the digivolution cost reduced by 1`.
- Knowledge base: `node tools/kb/query.mjs card BT25-003` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: `BT25-003.ts` contains one inherited `WhenAttacking`, `OncePerTurn` optional self-digivolution. Its cost targets exactly the top of the controller's security, its hand candidate filter requires `Glowing Dawn`, and it pays the printed evolution cost reduced by 1. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-003", compiled)`.
- Behavioral proof: the existing focused suite proves the cost and reduced-cost evolution on a realistic stack, excludes a nonmatching hand card, and proves declining preserves security, memory, hand, and board. The audit found no executable defect, so no test or implementation change was needed.
- Data-path trace: API boot imports the direct module, and `registerIrCard` builds the runtime module from its exported `compiled` value. The generated shared `effects.json` snapshot lacks the direct module's `position: "top"`, but `packages/shared/src/effects/data.ts` explicitly identifies card modules as authoritative; the API's executable action contains the boundary and the catalog/candidate/primitives regressions pass.
- Verification: focused suite — 2 passed; catalog synchronization, candidate-legality, and primitives regressions — 148 passed; `git diff --check` — passed. Workspace typecheck reports only the already-recorded unrelated pre-existing errors and no BT25-003 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-003
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-003.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-003.test.ts
git diff --check
```

No ambiguity or unsupported executable behavior remains for BT25-003.

## BT25-004 — Tapmon — 10/10

- Catalog evidence: Green level-2 Digi-Egg, `Appmon` form, `Tool` attribute, `Tap` type, no evolution recipe, no main or Security text, and inherited `[Your Turn] [Once Per Turn] When a [Social], [Tool] or [Game] trait card would link to this Digimon, you may reduce the cost by 1`.
- Knowledge base: `node tools/kb/query.mjs card BT25-004` returned no card-specific entries. The audit also applied the general Link rulings Q6422/Q6423, including Link eligibility and the rule that simultaneous reductions do not stack on one declaration.
- Implementation: `BT25-004.ts` installs an inherited, controller-turn, optional, once-per-turn recipient grant for exactly the three printed traits and amount 1. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-004", compiled)`.
- Defect corrected: after a once-per-turn recipient grant had been consumed, the declaration-time resolver correctly returned no grant, but `runLink` fell back to an older amount-only reader and reapplied the reduction. The shared Link action now treats an installed grant resolver's `undefined` result as authoritative while retaining the legacy fallback only for lightweight contexts that do not provide that resolver.
- Behavioral proof: the focused suite verifies the IR shape, optional acceptance/refusal, exact reduction amount, once-per-turn consumption across two declarations, Q6423 non-stacking, a revert-sensitive no-grant path, and a legal Tapmon-under-Appmon live evolution stack. The strengthened test fails against the prior fallback behavior.
- Verification: focused suite — 6 passed; effect-resolution regression — 7 passed; Link-eligibility regression — 3 passed; targeted Oxfmt/Oxlint and `git diff --check` — passed. `linkState.test.ts` retains an unrelated pre-existing BT25-056 failure, and workspace typecheck retains the already-recorded unrelated errors.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-004
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-004.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-004.test.ts
pnpm --filter @aegis/api exec vitest run src/engine/effects/resolution.test.ts src/engine/linkEligible.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-004.

## BT25-005 — Pagumon — 10/10

- Catalog evidence: Black level-2 Digi-Egg, `In-Training` form, `Lesser`, `Iliad`, and `TS` traits, no evolution recipe, no main or Security text, and inherited `[Your Turn] [Once Per Turn] When [Three Musketeers] trait cards are placed in this Digimon's digivolution cards, it may digivolve into a Digimon card with [Three Musketeers] in its text or the [TS] trait in the hand with the cost reduced by 2`.
- Knowledge base: Q6252 defines “X in its text” to include name, traits, effects, inherited effects, and the listed requirement/icon fields. The direct IR therefore correctly uses the broad `match: "text"` branch for `Three Musketeers`, alongside the exact `TS` trait branch.
- Implementation: `BT25-005.ts` installs an inherited controller-turn, once-per-turn `onAddDigivolutionCards` watcher bound to this Digimon, requires the added source card to have the `Three Musketeers` trait, and offers a self-digivolution from hand into a Digimon matching either printed destination branch at cost -2. Optional refusal preserves the once-per-turn opportunity. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-005", compiled)`.
- Behavioral proof: the delegated audit exercised a temporary full-engine fixture that proved the actual placement trigger, reduced-cost payment, and a text-only destination, then removed that fixture because the implementation was already correct and the requested policy does not require adding tests for a good card. The committed focused test verifies the complete IR routing and cost/options shape and remained green.
- Verification: focused suite — 1 passed; temporary full-engine positive path — passed during audit; `git diff --check` — passed. Workspace typecheck reports only the already-recorded unrelated pre-existing errors and no BT25-005 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-005
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-005.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-005.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-005.

## BT25-006 — Dorimon — 10/10

- Catalog evidence: Purple level-2 Digi-Egg, `In-Training` form, `Lesser`, `X Antibody`, `Titan`, and `TS` traits, no evolution recipe, no main or Security text, and inherited `[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by trashing 1 card in your hand, 1 of your [Titan] trait Digimon unsuspends`.
- Knowledge base: `node tools/kb/query.mjs card BT25-006` returned no card-specific entries. Comprehensive Rules §15-7-1/4/5 establish that “by X” is optional processing and may be paid even when the following payload has no legal target; §15-14-1-4 establishes that an accepted activation consumes its limit even if later processing cannot resolve. Q1818/Q6946 establish that declining an optional once-per-turn activation preserves the opportunity for a later trigger that turn.
- Implementation: `BT25-006.ts` installs an inherited opponent-turn, once-per-turn watcher restricted to an opposing Digimon's attack. The nested `Unsuspend` selects exactly one controller-owned `Titan`, carries the one-card hand-trash processing condition, permits that condition without a target, and preserves the frequency only when declined. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-006", compiled)`.
- Defects corrected: the generated IR placed the trash condition on the outer watcher, so it could be charged before the nested target/action decision and could not model decline correctly. The condition now belongs to the `Unsuspend` action with explicit optional/abort/preserve semantics. The reusable Unsuspend preflight now honors the existing `allowCostWithoutTarget` action flag, matching §15-7-5.
- Behavioral proof: the focused suite covers a real opponent attack with Dorimon in a legal evolution stack, exact one-of-many mixed `Titan` targeting, accepted payment with no legal Titan followed by once-per-turn suppression, and a declined first trigger followed by a successful later activation in the same turn. The new tests fail against the prior IR/preflight behavior.
- Verification: focused suite — 4 passed; subtrigger regression — 23 passed; targeted Oxfmt check and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-006 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-006
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-006.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-006.test.ts src/engine/effects/subtriggers.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-006.ts apps/api/src/cards/BT25/BT25-006.test.ts apps/api/src/engine/effects/interpreter/actions/runAction.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-006.

## BT25-007 — Gatchmon — 10/10

- Catalog evidence: Red level-3 Digimon, play cost 3, 2000 DP, `Stnd.`/`Appmon` forms, `Social` attribute, `Search` type; alternate evolution from a level-2 `Appmon` for 0; On Play top-3 search for one `Appmon` plus one `Social`/`Tool`/`Reboot`/`Creation`, bottoming the rest; `[Link] [Appmon] trait: Cost 1`, +2000 linked DP, and `[When Linking] Delete 1 opposing Digimon with 3000 DP or less`.
- Knowledge base: `node tools/kb/query.mjs card BT25-007` returned no card-specific entries. General Link, reveal, and selection rules apply without unresolved ambiguity.
- Implementation: the direct IR encodes the two independent `RevealAdd` selections, bottom-deck remainder, linked DP/timing deletion with the exact controller/kind/DP boundary, alternate evolution, and the completed Appmon Link recipe. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-007", compiled)`.
- Defect corrected: the executable module omitted the printed Link requirement, so the card's linked behavior lacked its legal declaration recipe. The audit adds `linkRequirement: [{ traits: ["Appmon"], cost: 1 }]`; the linked effect itself was present and was retained.
- Behavioral proof: the focused suite now checks catalog/IR completeness, selects two distinct qualifying cards and bottoms the miss, links for exactly 1 memory and deletes the 3000-DP boundary while preserving an above-boundary Digimon, and legally evolves from a level-2 Appmon for 0. The new requirement assertion/declaration test fails against the previous module.
- Verification: focused suite — 5 passed; delegated focused/comparative selection — 19 passed across 5 files; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-007 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-007
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-007.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-007.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-007.

## BT25-008 — Coronamon — 10/10

- Catalog evidence: Red level-3 Digimon, play cost 3, 1000 DP, `Rookie`/`Vaccine`, `Beast`/`Iliad`/`TS`; standard red or blue level-2 evolution for 0 plus alternate level-2 `TS` evolution for 0; `[When Moving] [On Play] By trashing up to 2 [Iliad] or [TS] trait cards from your hand, <Draw 1> for each card trashed`; inherited `[Your Turn] This Digimon gets +2000 DP`.
- Knowledge base: `node tools/kb/query.mjs card BT25-008` returned no entries, so there are no local rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: two trigger-specific Draw actions share the exact optional up-to-2 filtered hand-trash cost and scale by paid count. The inherited modifier is self-scoped and controller-turn-gated, and the alternate evolution accepts only `TS`. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-008", compiled)`.
- Behavioral proof: the strengthened focused suite proves both live triggers, one- and two-card payment scaling, refusal without zone changes, exact trait inclusion/exclusion, zero-cost legal `TS` evolution and invalid non-TS rejection, plus inherited +2000 DP on the controller's turn and expiration off-turn. No production defect was found; the added proof is card-specific and revert-sensitive.
- Verification: focused suite — 6 passed; targeted Oxlint/Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-008 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-008
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-008.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-008.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-008.

## BT25-009 — Bearmon — 10/10

- Catalog evidence: Red level-3 Digimon, play cost 3, 1000 DP, `Rookie`/`Vaccine`, `Beast`/`Iliad`/`TS`; standard red or green level-2 evolution for 0 plus alternate level-2 `TS` evolution for 0; `[Start of Your Main Phase] If you have 4 or less memory, this Digimon may digivolve without cost into a hand Digimon with Beast/Animal/Sovereign in any trait other than Sea Animal, or with TS`; inherited `[All Turns] +1000 DP`.
- Knowledge base: Q6253 defines “while you have 4 or less memory” relative to the controller's side of the gauge: position 4 or farther right on that side.
- Implementation: the start-main optional self-digivolution reads `memoryAtMost` from `controller: "mine"`, searches only hand Digimon, includes the three positive trait groups plus `TS`, explicitly excludes `Sea Animal`, and pays no evolution cost. The alternate evolution and inherited all-turn modifier are complete. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-009", compiled)`.
- Defect corrected: the generated condition omitted the controller perspective required by Q6253. The direct IR and committed shared effects record now both carry `controller: "mine"`, preventing consumers from interpreting the memory threshold as an unscoped gauge comparison.
- Behavioral proof: the focused suite covers the exact 4-memory boundary, rejection above 4, opponent-turn timing exclusion, legal zero-cost `TS` evolution stack followed by the free Beast evolution, preserved stack sources, and inherited +1000 DP. The analogous BT25-062 mechanism regression remains green.
- Verification: focused suite — 6 passed; BT25-062 comparison — 4 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-009 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-009
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-009.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-009.test.ts src/cards/BT25/BT25-062.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-009.

## BT25-010 — Hawkmon — 10/10

- Catalog evidence: Red/green level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Free`, `Avian`/`Iliad`/`TS`; standard red or yellow level-2 evolution for 1; alternate Poromon or level-2 `TS` evolution for 0; controller-turn cost -1 when this Digimon would evolve into a Digimon with Avian/Bird/Beast/Animal/Sovereign in any trait other than Sea Animal; inherited controller-turn +2000 DP.
- Knowledge base: Q6254 explicitly says the main reduction does not trigger while Hawkmon is in the breeding area.
- Implementation: the direct IR installs a controller-turn `wouldDigivolve` replacement scoped to self, uses the exact positive trait set and `Sea Animal` exclusion, and reduces cost by exactly 1. The inherited modifier and both alternate evolution paths are complete. Runtime replacement/continuous gates exclude breeding-area activation as ruled. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-010", compiled)`.
- Behavioral proof: the existing focused suite verifies the complete IR contract. The delegated audit additionally ran catalog-sync/interpreter/primitives regressions and evolution-legality/peer suites, covering the real replacement seam, legal alternate paths, negative destination filter, inherited stack behavior, and Q6254 area boundary. No defect was found, so no test or implementation change was needed.
- Verification: focused suite — 1 passed; catalog-sync/interpreter/primitives regressions — 326 passed; evolution legality plus BT25-009/012 peers — 13 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-010 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-010
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-010.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-010.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-010.

## BT25-011 — Aquilamon — 10/10

- Catalog evidence: Red/green level-4 Digimon, play cost 4, 4000 DP, `Champion`/`Free`, `Giant Bird`/`Iliad`/`TS`; standard red or yellow level-3 evolution for 3; alternate Hawkmon or level-3 `TS` evolution for 2; Raid; On Play/When Digivolving suspend one opposing Digimon, then during the controller's turn two of their Digimon may DNA evolve into hand Silphymon; inherited controller-turn +2000 DP.
- Knowledge base: `node tools/kb/query.mjs card BT25-011` returned no entries. General DNA evolution timing/material/stack rules apply without unresolved card-specific ambiguity.
- Implementation: the direct IR has the static Raid keyword, parallel On Play and When Digivolving sequences with exact opposing suspension followed by an optional controller-turn two-Digimon DNA evolution into Silphymon from hand, both alternate evolution recipes, and the inherited self modifier. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-011", compiled)`.
- Behavioral proof: the focused suite verifies the complete effect shape and clauses. The delegated audit traced the shared DNA resolver and ran BT24-035's equivalent resolver cases plus BT16-012/BT8-015 Silphymon legality peers, covering legal material choice, stack formation, trigger sequencing, and inherited source visibility. No defect was found, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; DNA peer regressions — 10 passed; `git diff --check` — passed. The broader capability suite retains five unrelated pre-existing Delay/G3 failures, and workspace typecheck retains the already-recorded unrelated errors; neither reports a BT25-011 regression.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-011
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-011.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-011.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-011.
