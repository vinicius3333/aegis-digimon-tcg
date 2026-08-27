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

## BT25-012 — Grizzlymon — 10/10

- Catalog evidence: Red/green level-4 Digimon, play cost 5, 6000 DP, `Champion`/`Vaccine`, `Beast`/`Iliad`/`TS`; standard red or green level-3 evolution for 3 plus alternate level-3 `TS` evolution for 2; On Play/When Digivolving one controller-owned Digimon matching Beast/Animal/Sovereign except Sea Animal, or Shaman/TS, gains Raid and +3000 DP for the turn; inherited all-turn +1000 DP.
- Knowledge base: `node tools/kb/query.mjs card BT25-012` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: both entry triggers use the exact inclusive and exclusive trait filters, select one controller-owned Digimon, then reuse that selected target for the DP modifier. The alternate evolution and inherited self modifier are complete. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-012", compiled)`.
- Defect corrected: the generated DP actions stored `sameTarget` at action level, where the runtime ignored it, allowing Raid and +3000 DP to resolve on different Digimon. Both direct-module targets and both committed shared-IR targets now carry `sameTarget: true` in the location consumed by the selector.
- Behavioral proof: the focused suite proves one chosen recipient receives both clauses, mixed valid peers remain unchanged, `Sea Animal` and nonmatching cards are excluded, When Digivolving prompts only once and reuses the first target, alternate `TS` evolution legality/invalidity, and inherited DP visibility. The new identity assertions fail against the prior IR.
- Verification: focused suite — 5 passed; targeted formatting and `git diff --check` — passed. Workspace typecheck's shared/web portions pass while API retains only the already-recorded unrelated errors and no BT25-012 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-012
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-012.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-012.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-012.

## BT25-013 — Firamon — 10/10

- Catalog evidence: Red level-4 Digimon, play cost 4, 5000 DP, `Champion`/`Vaccine`, `Beast`/`Iliad`/`TS`; standard red or blue level-3 evolution for 2 plus alternate level-3 `TS` evolution for 2; On Play/When Digivolving, trash one hand card then optionally return one red or blue Iliad Digimon from trash; controller-turn reaction to a blue Digimon being played or evolving, optionally evolve this Digimon into hand Flaremon at cost -1; inherited controller-turn +2000 DP.
- Knowledge base: Q6255 permits paying the trash condition and declining the return; Q6256 says all friendly play/evolution events trigger but activation requires the resulting Digimon to be blue; Q6257 checks the post-evolution Digimon's colors.
- Implementation: both entry actions bind the one-card hand-trash processing condition to an optional filtered trash return. Both controller-turn subtriggers use a post-event blue subject condition and offer self-evolution into Flaremon from hand at cost reduced by 1. Alternate evolution and the inherited modifier are complete. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-013", compiled)`.
- Defect corrected: both Flaremon `Digivolve` actions declared a reduction but omitted `payCost: true`, which could bypass the remaining printed evolution cost. Both actions now explicitly pay the base cost after the -1 reduction.
- Behavioral proof: the focused suite covers both entry timings, exact color/trait filtering, Q6255 return refusal after payment, an actual blue play event and exact reduced-cost payment, non-blue rejection, standard/alternate evolution metadata, a legal `TS` evolution stack, and inherited DP turn duration. The payment assertion fails against the prior IR.
- Verification: focused suite — 9 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-013 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-013
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-013.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-013.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-013.

## BT25-014 — Meramon — 10/10

- Catalog evidence: Red level-4 Digimon, play cost 4, 5000 DP, `Champion`/`Data`, `Flame`/`Iliad`/`TS`; alternate level-3 Flame/TS evolution for 2; `[Main] [Once Per Turn]` trash one Flame/TS hand card, delete one opposing Digimon with 4000 DP or less, and Draw 2 if this effect did not delete; inherited When Attacking deletion with the same DP boundary.
- Knowledge base: Q6258 allows activation and requires the trash cost even with no eligible opposing Digimon; Q6259 requires selecting/deleting an eligible target when one exists; Q6260 permits selecting a deletion-protected eligible target, whose failed deletion satisfies the Draw 2 condition.
- Implementation: the direct IR uses a mandatory filtered hand-trash cost, mandatory exact-boundary Delete, structured `ifThisEffectDidNotDelete`, once-per-turn frequency, the alternate evolution recipe, and the inherited deletion. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-014", compiled)`.
- Defects corrected: the Main deletion now sets `allowCostWithoutTarget`, allowing Q6258's cost-plus-zero-result path without making target selection optional. The shared Delete action preserves legally selected protected targets through target resolution while the deletion primitive still enforces protection, so result binding reports zero deleted for Q6260 and the conditional Draw 2 resolves.
- Behavioral proof: the focused suite covers successful deletion at exactly 4000 DP without drawing, >4000 exclusion, once-per-turn suppression, Q6258 no-target payment/draw, Q6260 protected-target selection/draw, alternate evolution metadata, and inherited deletion from a realistic Meramon-under-BT25-015 stack. The new no-target/protected assertions fail against the prior seams.
- Verification: focused suite — 6 passed; result-binding/interpreter regressions — 193 passed; immunity regressions — 3 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated errors, including the pre-existing `DeleteAction.trackCount` typing issue, and no BT25-014 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-014
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-014.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-014.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-014.ts apps/api/src/cards/BT25/BT25-014.test.ts apps/api/src/engine/effects/interpreter/actions/removal.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-014.

## BT25-015 — Garudamon — 10/10

- Catalog evidence: Red/green level-5 Digimon, play cost 7, 7000 DP; alternate level-4 Giant Bird/TS evolution for 3; Raid and Fortitude; On Play/When Digivolving delete one opposing Digimon with 6000 DP or less; inherited `[All Turns] [Once Per Turn]` after this Digimon wins a battle, trash the opponent's top security.
- Knowledge base: Q6261 rules that the inherited effect cannot activate when both battle participants are deleted at the same timing.
- Implementation: the direct IR exposes executable Raid/Fortitude keyword markers, two exact-boundary Delete entry effects, the alternate evolution recipe, and an inherited once-per-turn `whenDeletesInBattle` watcher scoped to this Digimon that trashes exactly the opponent's top security. The battle-deletion dispatch only emits the winning-source event when the attacker survives, satisfying Q6261. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-015", compiled)`.
- Behavioral proof: the focused suite verifies the full compiled contract. The delegated audit ran the analogous BT20-034 plus Raid/Fortitude mechanism suites, covering live keyword behavior, DP boundary deletion, source identity, battle victory/survival, once-per-turn scope, security destination, and evolution-stack visibility. No defect was found, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; peer/mechanism regressions — 58 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-015 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-015
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-015.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-015.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-015.

## BT25-016 — GrapLeomon — 10/10

- Catalog evidence: Red/green level-5 Digimon, play cost 7, 7000 DP, `Ultimate`/`Vaccine`, `Beastkin`/`Iliad`/`TS`; alternate level-4 `TS` evolution for 3; On Play/When Digivolving give one friendly Digimon +3000 DP for the turn, then another independently chosen friendly Digimon may attack; all-turn reaction to either player's 13000+ DP attacker, optionally evolve this Digimon into Marsmon/Callismon from hand without cost; inherited Security Attack +1.
- Knowledge base: Q6262 includes DP gained simultaneously from suspension in the attack-time threshold; Q6263 excludes DP gained later by `[When Attacking]`; Q6264 allows either controller's attacking Digimon to trigger the effect.
- Implementation: entry sequences keep independent boost and attack selections, the all-turn watcher accepts any-controller Digimon at the inclusive 13000 boundary and offers free self-evolution into the two printed names, the alternate evolution and inherited keyword are complete. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-016", compiled)`.
- Defect corrected: attack watchers previously evaluated live DP after `[When Attacking]` effects, violating Q6263. Combat now captures `attackerDPAtDeclaration` after suspension watchers/recomputation (therefore including Q6262) and before OnUseAttack/OnAllyAttack effects; attack-subtrigger DP filters consume that snapshot while retaining every non-DP filter.
- Behavioral proof: the focused suite covers metadata/evolution, inherited Security Attack +1 on a realistic stack, independent entry targets and optional attack, legal alternate evolution plus entry resolution, opponent 13000 boundary, rejection of a 12000 attacker boosted only by When Attacking, and acceptance of a 12000 attacker whose suspension-time inherited modifier makes it 13000. The Q6263 regression fails against the prior live-DP matcher.
- Verification: focused suite — 10 passed; interpreter/subtrigger regressions — 206 passed; mechanism suite — 322 passed with two unrelated pre-existing failures; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated errors and no BT25-016 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-016
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-016.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-016.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-016.test.ts apps/api/src/engine/combat/controller.ts apps/api/src/engine/effects/EffectContext.ts apps/api/src/engine/effects/interpreter/matching/trigger.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-016.

## BT25-017 — Flaremon — 10/10

- Catalog evidence: Red level-5 Digimon, play cost 6, 7000 DP, `Ultimate`/`Vaccine`, `Beastkin`/`Iliad`/`TS`; standard red or blue level-4 evolution for 3 plus alternate level-4 `TS` evolution for 3; On Play/When Digivolving this Digimon may attack, then by trashing one hand card delete one opposing Digimon with 7000 DP or less; controller-turn blue play/evolution reaction into hand Apollomon at cost -2; inherited Security Attack +1.
- Knowledge base: Q6265 says every friendly Digimon play/evolution event triggers but activation requires the resulting Digimon to be blue; Q6266 checks the post-evolution Digimon's color.
- Implementation: both entry sequences preserve optional self-attack followed by the hand-trash processing condition and exact-boundary Delete. Both controller-turn watchers use the blue event-subject condition and pay Apollomon's remaining evolution cost after -2. The inherited keyword and `TS` special evolution are complete. The module has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-017", compiled)`.
- Defects corrected: both entry deletions now allow paying the printed “by” condition with no eligible deletion target. The direct module's `[Digivolve] Lv.4 w/[TS]` requirement was incorrectly marked non-alternate; it now matches the already-correct shared record with `isAlternate: true`, preserving the route from off-color TS bases.
- Behavioral proof: the focused suite covers exact 7000 deletion and 8000 exclusion, no-target cost payment, blue play into Apollomon with exact reduced-cost payment, non-blue rejection, legal evolution from an off-color green level-4 TS base, rejection of a green non-TS peer, and inherited Security Attack +1 from a realistic stack. The no-target and off-color assertions fail against the prior IR.
- Verification: focused suite — 9 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-017 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-017
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-017.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-017.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-017.ts apps/api/src/cards/BT25/BT25-017.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-017.

## BT25-018 — Apollomon — 10/10

- Catalog evidence: Red/yellow level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Vaccine`, `Shaman`/`Olympos XII`/`Iliad`/`TS`; standard red or yellow level-5 evolution for 4 plus alternate level-5 `TS` evolution for 3; self play cost -5 if the opponent has a 12000+ DP Digimon; On Play/When Digivolving all opposing Digimon get -2000 DP per friendly Digimon for the turn, then delete one at or below this Digimon's DP; end-turn optional DNA into GraceNovamon followed independently by an optional friendly attack; inherited When Attacking once-per-turn relative-DP deletion.
- Knowledge base: Q6267 delays the 0-DP rule check until the activated effect fully resolves; Q6268 permits the DNA result to perform the following attack; Q6269 preserves the following attack even when the DNA choice is declined.
- Implementation: the direct IR contains the conditional self reducer, both scaling DP/deletion entry sequences, the ordered optional DNA and attack actions, the alternate evolution, and inherited once-per-turn deletion. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-018", compiled)`.
- Defect corrected: the play-cost replacement existed in IR but BT25-018 was absent from the verified pay-time self-reducer registry, so the engine charged the full 12 at the printed 12000-DP boundary. Registering the card activates its already-faithful condition and exact -5 amount.
- Behavioral proof: the focused suite covers reducer boundary/below-boundary payment, scaling by the post-play friendly count, live relative-DP deletion after On Play and a legal `TS` evolution, Q6268 DNA-result attack, Q6269 declined-DNA-followed-by-attack, and inherited relative deletion/once-per-turn across two attacks from a realistic stack. The reducer assertion fails against the prior registry. The chapter-17 rule-check suite proves Q6267's 0-DP target remains through the next clause and is rule-deleted only after full resolution.
- Verification: focused suite — 9 passed; reducer/registration regressions — 32 passed; chapter-17 rule checks — 4 passed; BT25 collection checkpoint — 100 passed with 8 pre-existing failures in later unaudited cards; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-018 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-018
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-018.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-018.test.ts src/engine/conformance/ch17-rule-checks.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-018.test.ts apps/api/src/engine/effects/interpreter/registration/reducers.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-018.

## BT25-019 — UltimateBrachiomon — 10/10

- Catalog evidence: Red/black level-6 Digimon, play cost 13, 13000 DP, `Mega`/`Data`, `Cyborg`/`X Antibody`/`Titan`/`TS`/`Dinosaur`; standard red or black level-5 evolution for 5 plus alternate level-5 Dinosaur/TS evolution for 4; Reboot and Blocker; On Play/When Digivolving delete one opposing highest-DP Digimon; end-turn once-per-turn Digimon-effect immunity at opponent memory 5+, then Option-effect immunity at 5 or less, each until their turn ends.
- Knowledge base: Q6270/Q6271 define the memory thresholds from the opponent's side of the gauge. Q6272–Q6277 define effect immunity, including legal selection, suppression of granted/previous effects while immune, restoration after immunity lapses, and trigger suppression at timing.
- Implementation: the direct IR exposes both static keywords, parallel highest-DP deletions, both exact opponent-memory conditions, opponent-only duration, and both alternate trait branches. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-019", compiled)`.
- Defect corrected: the immunity actions encoded source kind inside `sourceFilter`, a target/event filter ignored by restriction matching. The direct and shared IR now use the executable `fromSourceKind` field for Digimon and Option respectively, while `byOpponentEffectsOnly` preserves Tamer effects and all friendly effects.
- Behavioral proof: the focused suite verifies live Reboot/Blocker, highest-DP deletion on play/evolution, legal level-5 TS and Dinosaur evolution routes, and the 6/5/4 opponent-memory boundaries: Digimon-only at 6, both at 5, Option-only at 4, with Tamer always unaffected. Catalog-sync plus immunity-mechanism tests prove the restriction is enforced by actual effect source kind. The source-kind assertions fail against the prior IR.
- Verification: focused suite — 9 passed; catalog-sync/immunity mechanism regressions — 25 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains six unrelated pre-existing errors and no BT25-019 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-019
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-019.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-019.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-019.ts apps/api/src/cards/BT25/BT25-019.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-019.

## BT25-020 — Marsmon — 10/10

- Catalog evidence: Red/green level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Vaccine`, `Shaman`/`Olympos XII`/`Iliad`/`TS`; standard red or green level-5 evolution for 4 plus alternate level-5 `TS` evolution for 3; self play cost -5 if any Digimon has 13000+ DP; On Play/When Digivolving/When Attacking give one friendly Digimon +3000 DP, then one friendly Digimon may directly battle an opposing Digimon; all-turn once-per-turn after any friendly TS Digimon wins a battle, trash the opponent's top security.
- Knowledge base: Q6278–Q6281 define direct-battle selection, immunity compatibility, and its interaction with attacks/Piercing. Q6282–Q6286 define battle-win timing, Security Digimon wins, simultaneous deletion triggers, would-delete ordering, and wins where loser deletion is prevented.
- Implementation: the direct IR contains the conditional self reducer, all three parallel boost/optional-Battle sequences, an any-friendly-TS `whenBattleWon` watcher, once-per-turn scope, the exact top-security destination, and the alternate evolution. It has full coverage, no residual clauses, and registers exclusively through `registerIrCard("BT25-020", compiled)`.
- Defects corrected: the reducer incorrectly counted only the controller's board even though the printed clause is controller-neutral, and it was absent from the verified pay-time registry. It now uses `totalDigimonCount` and is registered at the exact 13000 boundary. All three Battle actions now encode the printed “may” with `optional: true`. Direct and shared IR are synchronized.
- Behavioral proof: the focused suite proves self and opponent 13000 reducer paths plus 12999 rejection, exact payment, +3000 followed by direct battle, optional refusal retaining the boost, all three entry timings, direct battle without its own security check, any friendly TS winner, top-security trash once per turn, legal TS evolution, and invalid near-match. Shared combat-controller regressions separately prove protected-loser battle wins (Q6286). The reducer/controller and refusal assertions fail against the prior IR.
- Verification: focused suite — 10 passed; mechanism/catalog regressions — 32 passed; targeted formatting and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-020 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-020
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-020.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-020.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-020.ts apps/api/src/cards/BT25/BT25-020.test.ts apps/api/src/engine/effects/interpreter/registration/reducers.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-020.

## BT25-021 — Gaomon — 10/10

- Catalog evidence: Blue level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Data`, `Beast`/`DATA SQUAD`; alternate Wanyamon or level-2 DATA SQUAD evolution for 0; On Play reveal top 3, add one Thomas H. Norstein/DATA SQUAD trait card and one Gaogamon-name card, bottoming the rest; inherited When Attacking once-per-turn both players Draw 1.
- Knowledge base: `node tools/kb/query.mjs card BT25-021` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: the direct IR contains two exact independent RevealAdd slots with shared revealed-card consumption, the deck-bottom remainder, both alternate evolution routes, and two inherited Draw actions under one source-scoped frequency. It exactly matches the persisted shared IR, has full coverage/no residual clauses, and registers exclusively through `registerIrCard("BT25-021", compiled)`.
- Behavioral proof: the existing focused suite verifies the complete search/evolution/inherited IR contract. The delegated audit traced shared RevealAdd distinct-card consumption and compared neighboring search, Gaogamon, and DATA SQUAD implementations, covering selection order, no double-use, bottoming, stack inheritance, controller/opponent draws, and once-per-turn identity. No defect was found, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; reencoded-IR suite — 29 passed with 10 unrelated baseline failures; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-021 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-021
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-021.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-021.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-021.

## BT25-022 — Lunamon — 10/10

- Catalog evidence: Blue level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Data`, `Mammal`/`Iliad`/`TS`; standard blue or red level-2 evolution for 0 plus alternate level-2 `TS` evolution for 0; On Play reveal top 3, add one Iliad trait card and one TS trait card, bottoming the rest; inherited Jamming.
- Knowledge base: `node tools/kb/query.mjs card BT25-022` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: the direct IR contains two exact RevealAdd slots with shared revealed-card consumption, deck-bottom remainder, the alternate evolution, and an inherited static Jamming marker. It has full coverage/no residual clauses and registers exclusively through `registerIrCard("BT25-022", compiled)`.
- Behavioral proof: the focused suite verifies the complete compiled contract. The delegated audit ran analogous BT23-006 search/evolution cases, security/Jamming conformance, and a Jamming peer, covering distinct selection, bottoming, legal off-color trait evolution, inherited stack visibility, and security-battle survival. No defect was found, so no test or implementation change was needed.
- Verification: focused suite — 2 passed; reveal/evolution/Jamming peers — 21 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-022 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-022
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-022.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-022.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-022.

## BT25-023 — Gaogamon — 10/10

- Catalog evidence: Blue level-4 Digimon, play cost 5, 6000 DP, `Champion`/`Data`, `Beast`/`DATA SQUAD`; standard blue level-3 evolution for 2 plus alternate level-3 DATA SQUAD evolution for 2; On Play/When Digivolving, with one or fewer Tamers, optionally play Thomas H. Norstein from hand without cost; inherited When Attacking once-per-turn both players Draw 1.
- Knowledge base: `node tools/kb/query.mjs card BT25-023` returned no entries. The committed English card text labels `[Thomas H. Norstein]` as a trait, but BT25-087's catalog identity is the Tamer name `Thomas H. Norstein` and its only declared trait is `DATA SQUAD`; BT25-096 uses the same bracketed token as a named-card target. The executable interpretation is therefore a named Tamer, not a nonexistent trait.
- Implementation: both entry effects now select a controller-owned Tamer named Thomas H. Norstein from hand, gate on at most one friendly Tamer, and play it optionally without cost. The alternate evolution and inherited two-player Draw sequence are complete. Direct/shared IR are synchronized, with full coverage/no residual clauses and exclusive `registerIrCard("BT25-023", compiled)` registration.
- Defect corrected: the generated target used `match: "trait"`, making the intended BT25-087 target ineligible. Both direct actions and persisted shared actions now use `kind: ["Tamer"]` plus `match: "name"`.
- Behavioral proof: the focused suite proves live On Play of BT25-087, the two-Tamer negative boundary, complete structural equivalence for When Digivolving, and both-player inherited draws capped across two attacks. BT25-087/BT25-096 peer suites remain green. The live Thomas play fails against the prior trait filter.
- Verification: focused suite — 5 passed; peer suites — 9 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains six unrelated pre-existing errors and no BT25-023 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-023
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-023.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-023.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-023.ts apps/api/src/cards/BT25/BT25-023.test.ts
git diff --check
```

No unsupported executable behavior remains for BT25-023; the catalog-label discrepancy is resolved by the set's named-card data and peer wording.

## BT25-024 — Lekismon — 10/10

- Catalog evidence: Blue level-4 Digimon, play cost 4, 5000 DP, `Champion`/`Data`, `Beastkin`/`Iliad`/`TS`; standard blue or red level-3 evolution for 2 plus alternate level-3 `TS` evolution for 2; On Play/When Digivolving Draw 1; controller-turn red play/evolution reaction, optionally evolve this Digimon into hand Crescemon at cost -1; inherited Jamming.
- Knowledge base: Q6287 says every friendly play/evolution event triggers but activation requires the resulting Digimon to be red; Q6288 checks the post-evolution Digimon's color.
- Implementation: both entry Draw clauses, both red-event subtriggers, post-event subject color filtering, Crescemon hand/self targeting, remaining-cost payment after -1, the alternate evolution, and inherited Jamming are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-024", compiled)`.
- Defects corrected: the direct watchers used an unsupported scalar `value` shape for `triggerSubjectHasColor`, and the Crescemon actions omitted `payCost: true`. They now use `filter.colors: ["Red"]` and pay the reduced cost. Persisted IR replaces its raw action condition with the same structured fire condition and payment flag.
- Behavioral proof: the focused suite covers Draw 1 at both timings, live Jamming on a realistic stack, both play/evolution red events, Q6287 non-red rejection, Q6288 real post-evolution color, exact Crescemon cost 3→2 payment, optional refusal, and the alternate evolution metadata. The red-event and payment assertions fail against the prior IR.
- Verification: focused suite — 11 passed; card-specific Oxlint/Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-024 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-024
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-024.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-024.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-024.ts apps/api/src/cards/BT25/BT25-024.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-024.

## BT25-025 — Aegiochusmon: Blue — 10/10

- Catalog evidence: Blue/black level-5 Digimon, play cost 8, 8000 DP, `Ultimate`/`Vaccine`, `Shaman`/`Iliad`/`TS`/`Cyborg`; standard blue or black level-4 evolution for 3 plus alternate Aegiomon evolution for 3; Blocker; Decode Aegiomon; On Play/When Digivolving De-Digivolve 1, then unsuspend one friendly Digimon with three or fewer security; inherited all-turn once-per-turn optional unsuspend of one friendly Shaman when the controller's security is removed from.
- Knowledge base: Q6289 establishes that Security effects resolve immediately before pending effects triggered by a security check; this card's inherited security-removal trigger remains pending and follows turn-player ordering. The general Decode rules define an optional immediate effect before a non-battle departure and require the original departure to continue after the selected digivolution card is played.
- Implementation: the direct IR contains Blocker, executable Decode replacement timing with exact Aegiomon stack selection and Decode provenance, both parallel De-Digivolve/conditional Unsuspend sequences, controller-scoped inherited security removal, once-per-turn scope, and the alternate evolution. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-025", compiled)`.
- Defect corrected: Decode was only a static keyword marker and therefore did not execute when the Digimon left play. The hand-authored compiled IR now handles non-battle leave events, offers the optional free Aegiomon play while the source stack is still available, records Decode provenance, and then permits the original removal to finish.
- Behavioral proof: the focused suite proves successful Decode on effect deletion with the played Aegiomon retaining its original instance, exclusion for battle deletion, optional refusal followed by trashing the whole stack, and the inherited Shaman unsuspend capped once per turn. Structural assertions cover all remaining printed clauses. The live non-battle case fails against the prior marker-only IR.
- Verification: focused suite — 6 passed; Decode/security/subtrigger peer regressions — 49 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. One broader BT24-023 comparative test remains independently failing while its focused Decode cases pass. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-025 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-025
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-025.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-025.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-025.ts apps/api/src/cards/BT25/BT25-025.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-025.

## BT25-026 — Crescemon — 10/10

- Catalog evidence: Blue level-5 Digimon, play cost 6, 7000 DP, `Ultimate`/`Data`, `Wizard`/`Iliad`/`TS`; standard blue or red level-4 evolution for 3 plus alternate level-4 `TS` evolution for 3; On Play/When Digivolving trash the bottom three digivolution cards of one opposing Digimon, then prevent one opposing Digimon with no digivolution cards from suspending until their turn ends; controller-turn red play/evolution reaction optionally evolves this Digimon into Dianamon from trash at cost -2; inherited controller-turn attack-target-change immunity.
- Knowledge base: Q6290 says every friendly Digimon play/evolution event triggers, but the effect can activate only if that Digimon is red. Q6291 says a digivolution event checks the resulting, post-evolution Digimon. The structured fire condition reads the trigger subject after the event and combines red color with controller-turn scope.
- Implementation: both entry timings preserve bottom-up digivolution trashing and independently select a now-empty opposing Digimon for the suspension restriction. Both delayed watchers are scoped to a friendly Digimon, evaluate post-event red color, optionally evolve this card into a controller-owned Dianamon from the controller's trash, and pay the printed cost reduced by 2. The alternate evolution and inherited restriction are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-026", compiled)`.
- Defects corrected: the direct module's watchers lacked the printed “your Digimon” source filter, and the Dianamon destination did not explicitly default to the controller. Both watchers now reject an opponent's red event and cannot consume Dianamon from the opponent's trash. These changes bring the direct module back into exact alignment with the persisted shared IR.
- Behavioral proof: the focused suite proves both entry timings, exact bottom-three order and partial-stack handling, independent selection of the no-source restriction target, both red play/evolution routes with exact reduced-cost payment, opponent event rejection, opponent-trash exclusion, controller-turn inherited scope, and valid/invalid alternate evolution. The opponent-event and opponent-trash cases expose the prior underspecified direct IR.
- Verification: focused suite — 12 passed; watcher/evolution/restriction mechanism regressions — 34 passed with 111 skipped; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-026 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-026
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-026.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-026.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-026.ts apps/api/src/cards/BT25/BT25-026.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-026.

## BT25-027 — MachGaogamon — 10/10

- Catalog evidence: Blue/black level-5 Digimon, play cost 7, 7000 DP, `Ultimate`/`Data`, `Cyborg`/`DATA SQUAD`; standard blue or black level-4 evolution for 3 plus alternate level-4 `DATA SQUAD` evolution for 3; shared once-per-turn When Digivolving/When Attacking sequence optionally returns one opposing level-4-or-lower Digimon to hand, then optionally trashes the bottom face-down card under a friendly Tamer to unsuspend this Digimon; all-turn once-per-turn self leave prevention for the same cost; inherited once-per-turn leave prevention for a friendly Gaogamon-name or DATA SQUAD Digimon for the same cost.
- Knowledge base: `node tools/kb/query.mjs card BT25-027` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply.
- Implementation: both primary timings share `ir-shared-0`, preserve the optional bounce and independently optional paid unsuspend, use the dedicated bottom-face-down-under-Tamer cost, and target self correctly. Both leave replacements use prevention mode, controller-owned costs, and source filters matching the main/inherited text. The alternate evolution is complete. Direct/shared IR match, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-027", compiled)`.
- Behavioral proof: the existing focused suite verifies the compiled timing, target, shared-frequency, payment, replacement, inherited-filter, and evolution contract. Delegated runtime smoke checks cover bounce level boundaries, exact unsuspend payment, shared timing consumption, and both main/inherited leave-prevention paths. No defect was found, so no implementation or test change was made.
- Verification: focused suite — 2 passed; focused plus interpreter/leave-prevention mechanisms — 203 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-027 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-027
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-027.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-027.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-027.

## BT25-028 — Dianamon — 10/10

- Catalog evidence: Blue/purple level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Data`, `Shaman`/`Olympos XII`/`Iliad`/`TS`; standard blue or purple level-5 evolution for 4 plus alternate level-5 `TS` evolution for 3; self play cost -5 while the opponent has a level-6-or-higher Digimon; On Play/When Digivolving continuously prevent opposing Digimon with at most one digivolution card from suspending, then delete one opposing unsuspended Digimon; all-turn once-per-turn on any Digimon play/evolution optionally trashes any four opposing digivolution cards, then optionally DNA evolves two friendly Digimon into GraceNovamon from hand; inherited When Attacking once-per-turn suspension restriction.
- Knowledge base: Q6292 includes Dianamon's own play/evolution in the all-turn trigger. Q6293 requires the Trash-then-DNA sequence to resolve within that pending effect before a separately pending entry effect. Q6294 makes the low-stack restriction affect qualifying later entrants, and Q6295 removes it dynamically once a Digimon reaches two sources. Q6489 confirms the resulting GraceNovamon can participate at a later counter timing.
- Implementation: the verified pay-time reducer now recognizes this card at the exact opposing level-6 boundary. Both entry timings use live target-filter membership for the suspension lock and independently select the unsuspended deletion target. Both any-player play/evolution watchers contain the complete TrashDigivolution-then-DnaDigivolve sequence, use a hand-only controller-owned GraceNovamon destination, and share source-scoped once-per-turn usage. The alternate evolution and inherited restriction are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-028", compiled)`.
- Defects corrected: the self reducer was inert because BT25-028 was absent from the verified registry; the suspension lock captured only a resolution-time snapshot contrary to Q6294/Q6295; and the persisted shared IR used a friendly-only evolution event while placing DNA outside the event watchers. Registration, live-filter semantics, any-player timing, action nesting, and hand zone are now explicit and synchronized.
- Behavioral proof: the focused suite proves both play-cost boundaries, continuous restriction for later entrants and 2+-source exclusion, expiration, self-play triggering, any-Digimon evolution triggering, exact four-source trash followed by live DNA from hand, cross-event once-per-turn scope, and inherited suspension prevention. The reducer, later-entrant, and event-chain cases fail against the prior implementation.
- Verification: focused suite — 10 passed; subtrigger/primitives — 26 passed; continuous/subtrigger fire-site mechanisms — 93 passed; reducer registration — 2 passed; adjacent BT25-018/BT25-026 — 21 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. BT25-103 retains an unrelated existing multi-host trash-test failure. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-028 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-028
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-028.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-028.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-028.ts apps/api/src/cards/BT25/BT25-028.test.ts apps/api/src/engine/effects/interpreter/registration/reducers.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-028.

## BT25-029 — MirageGaogamon — 10/10

- Catalog evidence: Blue/black level-6 Digimon, play cost 12, 12000 DP, `Mega`/`Data`, `Beast Knight`/`DATA SQUAD`; standard blue or black level-5 evolution for 4 plus alternate level-5 MachGaogamon-name or DATA SQUAD evolution for 3; Reboot, Blocker, and Evade; shared once-per-turn When Digivolving/When Attacking sequence optionally returns one opposing level-5-or-lower Digimon, then optionally trashes the bottom face-down card under a friendly Tamer to return one opposing lowest-level Digimon; all-turn once-per-turn optional self unsuspend when effects add cards to the opponent's hand or trash cards from under a friendly Tamer.
- Knowledge base: Q6296 confirms that declining the shared When Digivolving/When Attacking effect at evolution does not consume its once-per-turn activation, so it remains available on a later attack that turn. The shared source key and optional action activation follow that timing.
- Implementation: all three permanent keywords, both complete main timing sequences, shared `ir-shared-0` usage, exact level/superlative targets, controller-owned bottom-face-down-under-Tamer cost, both all-turn subtriggers, source filters, optionality, and alternate evolution routes are present. Direct/shared IR match, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-029", compiled)`.
- Behavioral proof: the existing focused suite verifies the complete compiled contract. The delegated audit exercised subtrigger matching, optional unsuspension, and source-scoped once-per-turn behavior, including the shared timing semantics required by Q6296. No defect was found, so no implementation or test change was made.
- Verification: focused suite — 2 passed; subtrigger mechanisms — 27 passed; once-per-turn mechanisms — 23 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-029 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-029
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-029.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-029.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-029.

## BT25-030 — Elecmon — 10/10

- Catalog evidence: Yellow level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Data`, `Mammal`/`Iliad`/`TS`; standard yellow or red level-2 evolution for 0 plus alternate level-2 `TS` evolution for 0; Start of Your Main Phase optionally adds the top friendly security card to hand to gain 1 memory; inherited When Attacking once-per-turn optionally adds the top friendly security card to hand, then performs Recovery +1 if the controller has zero security.
- Knowledge base: Q6297 explicitly permits activating the inherited effect at zero security and performing Recovery +1 without first moving a security card. The optional security movement and independent post-action zero-count condition encode that ruling.
- Implementation: the main effect uses an optional controller-owned `securityToHand` cost with decline abort before GainMemory. The inherited sequence uses optional top-security movement followed by the exact zero-security condition and the interpreter's executable Recovery action-keyword seam. Timing, inherited status, once-per-turn scope, and alternate evolution are complete. Direct/shared IR match, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-030", compiled)`.
- Behavioral proof: the existing focused suite verifies the compiled contract. The delegated audit ran the analogous BT24-031 behavior/evolution suite and the interpreter mechanisms, covering optional movement, empty-security Q6297 resolution, recovery execution, memory payment semantics, stack inheritance, and once-per-turn identity. No defect was found, so no implementation or test change was made.
- Verification: focused suite — 2 passed; peer behavior/evolution — 7 passed; interpreter mechanisms — 183 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-030 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-030
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-030.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-030.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-030.

## BT25-031 — Patamon — 10/10

- Catalog evidence: Yellow level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Data`, `Mammal`/`Iliad`/`ADAMAS`/`TS`; standard yellow level-2 evolution for 0 plus alternate level-2 `TS` evolution for 0; On Play reveals the top 3 cards, adds one Angel/Archangel/Three Great Angels/Four Great Dragons trait card and one TS trait card, then bottoms the remainder; inherited Barrier.
- Knowledge base: `node tools/kb/query.mjs card BT25-031` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply. General reveal rules and the shared RevealAdd implementation require the two slots to consume distinct revealed cards and bottom all unselected cards.
- Implementation: one mandatory RevealAdd action encodes the exact reveal count, two independent trait-filtered add slots, shared revealed-card consumption, and deck-bottom remainder. The alternate evolution and inherited static Barrier marker are complete. Direct/shared IR match, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-031", compiled)`.
- Behavioral proof: the existing focused suite verifies the compiled contract. The delegated audit ran RevealAdd interpreter, special-reveal primary, and BT25 collection audit suites, covering exact trait matching, distinct choice consumption, fewer-than-two valid hits, remainder bottoming, inherited keyword visibility, and alternate evolution metadata. No defect was found, so no implementation or test change was made.
- Verification: focused suite — 2 passed; RevealAdd mechanisms — 7 passed; special reveal mechanisms — 6 passed; BT25 audit — 2 passed; `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-031 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-031
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-031.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-031.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-031.
