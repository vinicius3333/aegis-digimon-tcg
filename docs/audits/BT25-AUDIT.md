# BT25 Card Implementation Audit

Current campaign (2026-09-06): **INCOMPLETE; 0/104 independently approved 10/10**.
See [the current evidence ledger](./BT25/REAUDIT-LEDGER.md) and
[collection plan](../plans/2026-09-06-bt25-reaudit-plan.md). The reports below
are historical claims under independent revalidation, not current completion.

This ledger records evidence in ascending card-ID order. A card receives 10/10 only after its complete catalog contract and local knowledge-base record are inspected, every clause is traced through its direct compiled-IR module and relevant shared primitives, and existing observable behavioral proof passes. In accordance with the requested audit policy, an already-correct card does not receive newly created tests; tests are added or strengthened when the audit finds a defect.

## Collection completion

- Scope: 104/104 BT25 card modules audited, 104 unique 10/10 ledger entries, no missing IDs, duplicates, residual limitations, or below-10 scores.
- Registration: all 104 modules have exactly one matching `registerIrCard(cardId, compiled)` call and no BT25 module uses `registerCard`.
- Collection gate: `pnpm --filter @aegis/api exec vitest run src/cards/BT25` — 107 files passed, 680 tests passed.
- Relevant shared mechanisms: interpreter, primitives, stack, SubTrigger registry/seams, Link state, pooled source trash, and EX5-025 regression — 416 tests passed. The broader `mechanic.test.ts` run passed 116/118; its two failures are unrelated pre-existing cases (BT15-020 timeout and the BT7-040/ST4-13/ST6-13 Digi-Burst shape guard).
- Static checks: `git diff --check` passed; API typecheck reports only the existing unrelated EX6-010, removal/runAction/loose-targeting, and primitives completeness errors, with no BT25 or newly changed mechanism error.

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

## BT25-032 — Liollmon — 10/10

- Catalog evidence: Yellow level-3 Digimon, play cost 3, 2000 DP, `Rookie`/`Vaccine`, `Holy Beast`/`Glowing Dawn`/`BEATBREAK`; standard yellow level-2 evolution for 0 plus alternate level-2 `Glowing Dawn` evolution for 0; On Play reveals the top 3 cards, adds one Glowing Dawn trait card and one yellow BEATBREAK trait card, then bottoms the remainder; inherited Barrier.
- Knowledge base: `node tools/kb/query.mjs card BT25-032` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply. General reveal rules and shared RevealAdd processing require distinct-card consumption between the two add slots.
- Implementation: the mandatory RevealAdd action encodes the exact reveal count, unrestricted Glowing Dawn first slot, conjunctive yellow-and-BEATBREAK second slot, shared taken-card tracking, and deck-bottom remainder. Alternate evolution and inherited Barrier are complete. Direct/shared IR match, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-032", compiled)`.
- Behavioral proof: the existing focused suite verifies the full compiled contract. Delegated peer/evolution, BT25 catalog/audit, and RevealAdd mechanism checks cover conjunctive color/trait filtering, distinct selection, bottoming, inherited keyword visibility, and legal/invalid alternate evolution. No defect was found, so no implementation or test change was made.
- Verification: focused suite — 2 passed; evolution/peer — 3 passed; BT25 catalog/audit — 9 passed; RevealAdd interpreter/mechanic subsets — 8 passed; `git diff --check` — passed. The broader mechanism baseline retains unrelated BT15-020 timeout and IDigiBurst expectation failures. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-032 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-032
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-032.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-032.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-032.

## BT25-033 — Aegiomon — 10/10

- Catalog evidence: Yellow level-4 Digimon, play cost 5, 5000 DP, `Champion`/`Vaccine`, `Shaman`/`Iliad`/`TS`; standard yellow level-3 evolution for 2 plus alternate level-3 `TS` evolution for 2; Barrier; On Play/When Digivolving optionally adds the top friendly security card to hand to give one opposing Digimon -5000 DP for the turn; inherited Barrier.
- Knowledge base: `node tools/kb/query.mjs card BT25-033` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply. General by-cost processing requires refusal or inability to pay to abort the dependent DP reduction.
- Implementation: both entry timings now use the executable controller-owned `securityToHand` cost, mark the costed action optional, and abort the action on refusal. Exact single-opponent targeting, -5000 amount, turn duration, both Barrier markers, and alternate evolution are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-033", compiled)`.
- Defects corrected: neither direct costed ModifyDP action encoded the printed optionality/decline gate, and persisted IR retained the security cost only as raw text. Both timings now preserve security and DP on refusal and perform the complete payment/effect sequence on acceptance.
- Behavioral proof: the focused suite proves both entry timings, exact top-security movement, one-target boundary, -5000 amount, refusal with no side effect, turn expiry, inherited Barrier on a realistic stack, and legal/invalid TS evolution. The refusal assertion fails against the prior action encoding.
- Verification: focused suite — 8 passed; related cost-gating peers — 12 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-033 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-033
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-033.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-033.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-033.ts apps/api/src/cards/BT25/BT25-033.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-033.

## BT25-034 — Angemon — 10/10

- Catalog evidence: Yellow level-4 Digimon, play cost 5, 5000 DP, `Champion`/`Vaccine`, `Angel`/`Iliad`/`TS`; standard yellow level-3 evolution for 2 plus alternate level-3 `TS` evolution for 2; when an effect trashes this card directly from security, optionally play one level-4-or-lower Angel/Iliad trait card from hand without cost; Ascension; inherited Barrier.
- Knowledge base: Q6298 excludes reveals, searches, and looks at security; only direct effect-driven trashing from security triggers the effect. `OnDiscardSecurity` is the dedicated effect-trash seam and does not fire for those excluded observations.
- Implementation: the direct module already used `OnDiscardSecurity`, an optional controller-hand PlayWithoutCost action, the exact level and Angel/Iliad union filters, and no payment. Ascension, inherited Barrier, and alternate evolution are complete. The persisted IR now matches the authoritative module, with full coverage/no residual clauses and exclusive `registerIrCard("BT25-034", compiled)` registration.
- Defect corrected: the persisted shared IR incorrectly represented the security-trash clause as an unconditional Static play action and omitted optionality. It now uses the Q6298-specific timing and optional free-play semantics. The BT25 catalog-sync suite now includes BT25-033 and BT25-034 to prevent renewed direct/shared drift.
- Behavioral proof: the focused suite verifies the Q6298 trigger shape, eligible hand target, optional no-cost play, Ascension, and inherited Barrier. Security-trash peer mechanisms distinguish direct trashing from reveal/search paths. Persisted-IR equality now fails against the prior stale Static entry.
- Verification: focused suite — 2 passed; security-trash peers — 6 passed; interpreter/primitives — 319 passed; BT25 persisted-IR sync — 9 passed; registration audit — 2 passed; shared-IR JSON parse and `git diff --check` — passed. The broader reencoded-IR baseline retains 10 unrelated failures. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-034 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-034
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-034.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-034.test.ts src/cards/BT25/BT25-catalog-sync.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-034.

## BT25-035 — Cougarmon — 10/10

- Catalog evidence: Yellow level-4 Digimon, play cost 5, 6000 DP, `Champion`/`Virus`, `Mammal`/`Glowing Dawn`/`BEATBREAK`; standard yellow level-3 evolution for 2 plus alternate level-3 `Glowing Dawn` evolution for 2; On Play/When Digivolving give one opposing Digimon -3000 DP for the turn, then optionally trash exactly two bottom face-down cards from under friendly Tamers to evolve this Digimon into a Glowing Dawn Digimon from hand without paying the cost; inherited Barrier.
- Knowledge base: Q6299 delays zero-DP rule deletion until the entire activated effect finishes. Q6300 requires paying both cards, not a partial cost. Q6301 permits the two bottom face-down cards to come from multiple friendly Tamers. The dedicated cost primitive implements atomic multi-Tamer bottom-card payment.
- Implementation: both timings preserve the unconditional -3000 DP first action and the separately optional costed self evolution. The evolution uses hand-only Glowing Dawn targeting, waives evolution cost, aborts on cost refusal, and pays exactly two bottom face-down cards across controller-owned Tamers. Inherited Barrier and alternate evolution are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-035", compiled)`.
- Defect corrected: the direct module was already hand-fixed, but persisted shared IR still modeled the cost as trashing two Tamer permanents. Both persisted actions now use `trashBottomFaceDownUnderTamer` with count 2 and controller scope, and BT25-035 was added to persisted-IR equality coverage.
- Behavioral proof: the focused suite verifies both timing structures and the specialized cost. Mechanism regressions cover atomic two-card payment, distribution across multiple Tamers, bottom-only selection, refusal, free legal evolution, delayed zero-DP rule check, and inherited Barrier. Persisted equality fails against the prior Tamer-trash representation.
- Verification: focused suite — 2 passed; related interpreter/mechanism regressions — 197 passed; BT25 persisted-IR sync — 10 passed; BT25 catalog audit — 7 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. The broader interaction baseline retains one unrelated memory assertion failure. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-035 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-035
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-035.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-035.test.ts src/cards/BT25/BT25-catalog-sync.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-catalog-sync.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-035.

## BT25-036 — Craftmon — 10/10

- Catalog evidence: Yellow level-4 Appmon, play cost 5, 5000 DP, `Sup.`/`Appmon`/`Tool`, `Design`; standard yellow level-3 evolution for 2; zero-cost App Fusion using two distinct names from Kabemon/Gomimon/Ecomon/Puzzlemon; Security plays this card without cost at the end of its security battle; On Play/When Digivolving adds the top friendly security card to hand, then performs Recovery +1.
- Knowledge base: Q6302 permits the entry effect at zero security, skipping the unavailable move and still recovering. Q6303 enumerates every ordered pair of two distinct names in the four-name App Fusion pool and excludes duplicate-name pairs.
- Implementation: the Security effect now installs a one-shot `whenSecurityBattleEnded` watcher, identifies security timing explicitly, and plays this exact card from trash only after battle resolution. Both entry sequences preserve independent Recovery after security movement, including Q6302. The App Fusion requirement uses the complete four-name pool with engine-enforced distinct names. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-036", compiled)`.
- Defect corrected: Security previously executed PlayWithoutCost immediately with no end-of-battle timing and no trash source, allowing Craftmon to bypass the security battle lifecycle. It now waits for the dedicated battle-ended event and moves the battled instance from trash. Persisted equality coverage includes BT25-036.
- Behavioral proof: the focused suite proves catalog/IR shape, real security battle ordering (including attacker deletion), deferred exact-instance play, ensuing On Play exchange, zero-security Q6302 recovery, When Digivolving behavior, every distinct-name App Fusion class, and duplicate-name rejection. The deferred-battle case fails against the prior immediate action.
- Verification: focused suite — 7 passed; security mechanisms — 14 passed; interpreter mechanisms — 183 passed; App Fusion/card information — 25 passed; evolution conformance — 17 passed; BT25 persisted-IR sync — 11 passed; Oxlint/Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-036 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-036
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-036.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-036.test.ts src/cards/BT25/BT25-catalog-sync.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-036.ts apps/api/src/cards/BT25/BT25-036.test.ts apps/api/src/cards/BT25/BT25-catalog-sync.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-036.

## BT25-037 — Pegasusmon — 10/10

- Catalog evidence: Yellow/blue level-4 Digimon, play cost 6, 6000 DP, `Armor Form`/`Free`, `Holy Beast`/`Iliad`/`TS`; standard yellow or blue level-3 evolution for 3 plus alternate Patamon or level-3 `TS` evolution for 2; Armor Purge; On Play/When Digivolving adds the top friendly security card to hand, then optionally places one Angel/Archangel/Three Great Angels/Iliad Digimon or TS Tamer from hand as top or bottom security.
- Knowledge base: Q6304 permits activation at zero security: the unavailable security-to-hand step is skipped and the specified hand card may still be placed into security.
- Implementation: both timings preserve the mandatory top-security movement and independently optional placement. The placement now explicitly sources the controller's hand, accepts the exact union of traited Digimon or TS Tamer, and offers top/bottom choice. Armor Purge and both alternate evolution routes are complete. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-037", compiled)`.
- Defects corrected: the direct action encoded the source as a malformed nested object, and persisted IR only offered unfiltered bottom placement. Both timing copies now use `source: "hand"`, the exact union filter, and `addTopOrBottom`; persisted equality coverage includes BT25-037.
- Behavioral proof: the focused suite proves both timings, Angel top placement, TS Tamer bottom placement, negative filtering, Q6304 at zero security, optional refusal after the mandatory move, live Armor Purge, and both Patamon/TS evolution stacks. Hand-source and top-choice assertions fail against the prior IR.
- Verification: focused suite — 9 passed; hand-to-security peer/mechanism checks — 4 passed; BT25 persisted-IR sync — 12 passed; Oxlint/Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. The broad Tier-1 baseline retains one unrelated BT1-093 failure. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-037 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-037
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-037.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-037.test.ts src/cards/BT25/BT25-catalog-sync.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-037.ts apps/api/src/cards/BT25/BT25-037.test.ts apps/api/src/cards/BT25/BT25-catalog-sync.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-037.

## BT25-038 — Shakkoumon — 10/10

- Catalog evidence: Yellow/black level-5 Digimon, play cost 8, 8000 DP, `Ultimate`/`Free`, `Mutant`/`Iliad`/`TS`/`Angel`; standard yellow or black level-4 evolution for 4 plus alternate Patamon or level-3 `TS` evolution for 2; On Play/When Digivolving optionally places one Angel/Archangel/Three Great Angels/Iliad Digimon from hand or a friendly Digimon's sources as top/bottom security, then obligatorily trashes both players' top security when DNA evolving; all-turn once-per-turn De-Digivolve 1 when friendly security is added to; inherited all-turn once-per-turn -4000 DP when friendly security is removed from.
- Knowledge base: Q6305 orders simultaneous security-check events: the Security effect resolves immediately, then pending triggers follow turn-player priority. The inherited security-removal watcher remains correctly pending and controller-scoped.
- Implementation: both entry timings now constrain candidates to controller-owned Digimon in hand or digivolution-card zones, preserve top/bottom choice, and use structured DNA context for the mandatory bilateral trash. The add-security watcher uses `triggerSecurityIsYours`; the inherited removal watcher uses controller scope. Both alternate evolution routes are present. Direct/shared IR are synchronized, have full coverage/no residual clauses, and register exclusively through `registerIrCard("BT25-038", compiled)`.
- Defects corrected: source selection used an unsupported location shape without ownership/kind constraints; the add-security watcher incorrectly treated a security event as a permanent source; and both alternate evolution routes were absent. Persisted IR additionally retained a raw DNA condition and all stale shapes. All direct/shared representations and persisted equality coverage are corrected.
- Behavioral proof: the focused suite proves stack-source placement and removal, opponent/non-Digimon exclusion, top/bottom security placement structure, DNA-only bilateral trash, friendly-only add-security De-Digivolve once per turn, friendly-only inherited removal reaction once per turn, and both evolution routes. The source and watcher-direction cases fail against the prior IR.
- Verification: focused suite — 8 passed; DNA/security/subtrigger mechanisms — 4 passed; BT25 persisted-IR sync — 13 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-038 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-038
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-038.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-038.test.ts src/cards/BT25/BT25-catalog-sync.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-038.ts apps/api/src/cards/BT25/BT25-038.test.ts apps/api/src/cards/BT25/BT25-catalog-sync.test.ts
node -e 'JSON.parse(require("fs").readFileSync("packages/shared/src/effects/effects.json", "utf8"))'
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-038.

## BT25-039 — Sirenmon — 10/10

- Catalog evidence: Yellow/green level-5 Digimon, play cost 6, 6000 DP, `Ultimate`/`Data`, `Shaman`/`Iliad`/`TS`; standard yellow or green level-4 evolution for 4 plus alternate level-4 `TS` evolution for 3; face-up Security End of Your Turn optionally plays Ceresmon from hand at cost -7 and may place this card under the played Digimon; all-turn deletes self to prevent all simultaneous non-own-effect departures of other friendly Shaman/Iliad Digimon or Tamers; On Deletion optionally places self face up at bottom security; inherited opponent-turn once-per-turn attack redirect to a suspended friendly Digimon.
- Knowledge base: Q6306 stacks Sirenmon's -7 with Ceresmon's -5. Q6307 applies one self-deletion replacement to all simultaneous matching departures without selection. Q6308 delays Sirenmon's On Deletion activation until the opponent's resolving effect completes.
- Implementation: the security play pays the remaining cost after -7, binds the exact `lastPlayed` Digimon, and gates optional PlaceUnder on successful play. The leave replacement excludes self, matches Digimon/Tamers by Shaman/Iliad, excludes the controller's effects, affects all matches, and pays by deleting self. On Deletion preserves face-up bottom placement; inherited redirect and alternate evolution are complete. Direct/shared IR are synchronized, full/residual-free, and exclusively register through `registerIrCard("BT25-039", compiled)`.
- Defects corrected: the TS evolution route was incorrectly marked non-alternate. Persisted IR also lacked executable paid reduction, successful-play gating/binding, all-match replacement metadata, and face-up security placement; these are synchronized and covered by persisted equality.
- Behavioral proof: the focused suite proves alternate evolution cost, exact 5-memory Ceresmon play after -7, face-up Sirenmon placement under that instance, simultaneous Q6307 prevention with one self deletion, own-effect exclusion, face-up On Deletion security return, and inherited redirect. These assertions expose the stale evolution/shared IR.
- Verification: focused suite — 12 passed; focused/catalog/mechanism regressions — 228 passed; targeted Oxfmt, shared-IR JSON parse, and `git diff --check` — passed. The broader BT25 catalog baseline retains 8 unrelated failures. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-039 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-039
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-039.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-039.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-039.ts apps/api/src/cards/BT25/BT25-039.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-039.

## BT25-040 — MagnaAngemon — 10/10

- Catalog evidence: Yellow level-5 Digimon, play cost 7, 7000 DP, `Ultimate`/`Vaccine`, `Archangel`/`Iliad`/`TS`; standard yellow level-4 evolution for 3 plus alternate level-4 `TS` evolution for 3; direct effect-trash-from-security optionally plays one level-4-or-lower Angel/Iliad card from hand without cost; Ascension; On Play/When Digivolving may trash the controller's top or bottom security to give one opposing Digimon -8000 DP until their turn ends; inherited all-turn once-per-turn -4000 DP when friendly security is removed from.
- Knowledge base: Q6309 restricts the security-trash trigger to direct effect trash, excluding reveal/search/look operations. Q6310 orders Security effects ahead of pending security-check/removal triggers, with turn-player priority afterward.
- Implementation: `OnDiscardSecurity` uses exact hand/level/trait targeting and optional free play. Both entry DP clauses use an optional controller-security trash cost, abort on refusal/unpayability, and apply exact amount/duration on payment. The inherited watcher is controller-scoped and once per turn; Ascension and alternate evolution are complete. Direct/shared IR are synchronized, full/residual-free, and exclusively register through `registerIrCard("BT25-040", compiled)`.
- Defects corrected: the cost filters omitted the security zone. The delegated patch also incorrectly removed optionality; root review restored `optional: true`/`abortOnDecline: true` because Digimon “By trashing…” is an optional activation cost, and added a live refusal regression. Persisted IR carries the same corrected semantics.
- Behavioral proof: the focused suite proves accepted On Play/When Digivolving payment, empty-security negative path, explicit refusal with no trash or DP change, direct Q6309 security-trash play, and inherited own-security/once-per-turn scope. The zone and refusal assertions expose the prior underspecification and prevent the rejected mandatory interpretation.
- Verification: focused suite — 9 passed; security mechanisms — 17 passed; interpreter/security regressions — 200 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-040 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-040
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-040.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-040.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-040.ts apps/api/src/cards/BT25/BT25-040.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-040.

## BT25-041 — Murasamemon — 10/10

- Catalog evidence: Yellow level-5 Digimon, play cost 7, 7000 DP, `Ultimate`/`Virus`, `Beastkin`/`Glowing Dawn`/`BEATBREAK`; standard yellow level-4 evolution for 3 plus alternate level-4 `Glowing Dawn` evolution for 3; Alliance; shared once-per-turn When Digivolving/When Attacking during the controller's turn chooses either top-security-to-hand or bottom-face-down-under-Tamer payment, then may play or use one Glowing Dawn card from hand at cost -3; inherited End of Attack once-per-turn pays the Tamer-under-card cost to unsuspend this Glowing Dawn Digimon.
- Knowledge base: `node tools/kb/query.mjs card BT25-041` returned no entries, so there are no local card-specific rulings, errata, restrictions, or unresolved ambiguities to apply. The printed modal grammar requires both payment choices to feed both play/use choices rather than pairing one cost with one card kind.
- Implementation: nested Modal actions preserve the 2×2 choice matrix, use executable `securityToHand` and `trashBottomFaceDownUnderTamer` costs, allow Glowing Dawn Digimon/Tamers through PlayWithoutCost or Options through UseOptionWithoutCost, pay the remaining cost after -3, and share once-per-turn scope. The inherited target requires the resulting host to be a Glowing Dawn Digimon. Alliance and alternate evolution are complete. Direct/shared IR are synchronized, full/residual-free, and exclusively register through `registerIrCard("BT25-041", compiled)`.
- Defects corrected: the play branch excluded Tamers despite the printed word “card”; stale raw replacement/cost forms were replaced with the full nested modal execution; the inherited Unsuspend lacked the Glowing Dawn host restriction; and alternate evolution coverage was added. Root review also updated the modal label so the UI accurately advertises Digimon-or-Tamer selection.
- Behavioral proof: the focused suite verifies Alliance, both costs across both shared timings, Glowing Dawn Tamer play with exact remaining payment, inherited accepted cost/unsuspend, non-Glowing-Dawn host rejection, alternate evolution, and accurate modal labels. The Tamer play and inherited negative case fail against the prior IR.
- Verification: focused suite — 7 passed; focused/catalog — 22 passed; mechanisms — 45 passed; targeted Oxfmt/Oxlint, shared-IR JSON parse, and `git diff --check` — passed. Workspace typecheck retains the already-recorded unrelated pre-existing errors and no BT25-041 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-041
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-041.ts
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-041.test.ts
pnpm exec oxfmt --check apps/api/src/cards/BT25/BT25-041.ts apps/api/src/cards/BT25/BT25-041.test.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-041.

## BT25-042 — ClavisAngemon — 10/10

- Catalog evidence: Yellow/black level-6 Digimon, play cost 12, 12000 DP; alternate level-5 Angel/Archangel/TS evolution for 3; shared once-per-turn On Play/When Digivolving/When Attacking may trash top/bottom friendly security to grant self immunity to opposing Digimon effects; all-turn once-per-turn on friendly security removal optionally plays a level-4-or-lower Angel/Iliad card from hand, then grants Reboot and Blocker to the same two friendly Digimon until the opponent's turn ends.
- Knowledge base: Q6311 orders immediate Security effects before pending security-check/removal triggers, then uses turn-player priority.
- Implementation: all three optional by-cost clauses now target the controller's security zone. The removal watcher contains the entire optional play plus two linked keyword grants, with `sameTarget` preserving the same pair. Controller direction, once-per-turn scope, alternate evolution, full coverage/no residual clauses, and exclusive `registerIrCard("BT25-042", compiled)` are complete.
- Defects corrected: all three costs lacked the security zone; Reboot/Blocker sat outside the watcher and could apply without security removal; and independent selection could grant the keywords to different Digimon. All are corrected with focused live proof.
- Verification: focused suite — 8 passed; neighboring security-cost and interpreter regressions — 194 passed; `git diff --check` — passed. Workspace typecheck retains unrelated pre-existing errors and no BT25-042 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-042
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-042.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-042.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-042.

## BT25-043 — Habakirimon — 10/10

- Catalog evidence: Yellow level-6 Digimon, play cost 6, 12000 DP, `Mega`/`Virus`, `Shaman`/`Glowing Dawn`/`BEATBREAK`; alternate level-5 Glowing Dawn evolution for 3; shared once-per-turn When Digivolving/When Attacking Recovery +1, then trash the top security of a player tied for most to unsuspend; all-turn once-per-turn trashes friendly top security to prevent every simultaneous Glowing Dawn Digimon departure.
- Knowledge base: Q6312 lets the activating player choose among tied most-security players. Q6313 delays zero-DP rule checks until the full option/evolution processing completes. Q6314 confirms one replacement/payment prevents all simultaneous matching departures without selection.
- Implementation: both shared timing sequences gate Unsuspend on successful most-security trash via `ifThisEffectActed`. The replacement targets all friendly Glowing Dawn Digimon and now places `zone: security` inside the executable cost filter. Alternate evolution, full coverage/no residual clauses, and exclusive `registerIrCard("BT25-043", compiled)` are complete.
- Defects corrected: Unsuspend could occur when the prerequisite trash did not act, and the prevention cost stored the security zone outside its filter. Focused tests prove success/failure and all-match boundaries.
- Verification: focused suite — 4 passed; neighboring recovery/leave suites — 33 passed; conformance chapters — 78 passed; `git diff --check` — passed. Workspace typecheck retains unrelated pre-existing errors and no BT25-043 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-043
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-043.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-043.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-043.

## BT25-044 — Junomon — 10/10

- Catalog evidence: Yellow/purple level-6 Digimon, play cost 12, 12000 DP; standard yellow/purple level-5 evolution for 4 plus alternate Angel/Archangel/TS evolution for 3; conditional self play reducers; On Play/When Digivolving places one other friendly Digimon face down as top security, then trashes both players' top security; all-turn once-per-turn on friendly security removal optionally plays an eligible Angel/Archangel/Iliad card from hand or trash without cost.
- Knowledge base: Q7004 confirms stacked Junomon self-reductions total -10. Q6315 establishes immediate Security-effect ordering before pending removal triggers.
- Implementation: each entry clause now represents placement as an all-or-nothing `place` cost on the controller's own trash-top action, then separately trashes the opponent's top. No valid other Digimon aborts the remaining sequence. The reducer boundary, controller-scoped once-per-turn watcher, hand/trash free-play filters, alternate evolution, full coverage/no residual clauses, and exclusive `registerIrCard("BT25-044", compiled)` are complete.
- Defects corrected: placement was unconditional and the bilateral trash could proceed without a legal other Digimon. Both timings now require and execute the face-down top-security placement before either top-security result.
- Verification: focused suite — 7 passed; BT26-033 — 4 passed; interpreter — 183 passed; Junomon deck interaction — 1 passed; targeted Oxfmt and `git diff --check` — passed. The broader BT25 deck baseline retains unrelated Marsmon/Rebootmon failures; workspace typecheck retains unrelated pre-existing errors and no BT25-044 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-044
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-044.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-044.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-044.

## BT25-045 — Onmon — 10/10

- Catalog evidence: Green level-3 Appmon, play cost 3, 2000 DP; alternate level-2 Appmon evolution for 0; during the controller's turn once per turn, a Social/Tool/Game card linking to this Digimon may reduce its link cost by 1; linked When Linking suspends one opposing Digimon.
- Knowledge base: no card-specific entries; general Link rules require a legal Link card, declaration-time optional reduction, real memory payment, linked-effect timing, and once-per-turn use.
- Implementation: recipient-scoped `GrantLinkCostReduction` now records declaration optionality and once-per-turn use with exact trait filters. The linked `WhenLinking` entry suspends one opponent Digimon. Evolution requires level 2 plus Appmon trait, and registration remains exclusively `registerIrCard("BT25-045", compiled)` with full coverage/no residuals.
- Defects corrected: the alternate evolution omitted level 2, reduction lacked optional/once-per-turn semantics, and the linked suspension effect was absent.
- Verification: focused suite — 8 passed; BT25-004/interpreter regressions — 189 passed; targeted lint/format and `git diff --check` — passed. Workspace typecheck retains unrelated pre-existing errors and no BT25-045 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-045
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-045.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-045.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-045.

## BT25-046 — Gekkomon — 10/10

- Catalog evidence: green level-3 Digimon; alternate level-2 Glowing Dawn evolution for 0; On Play reveals top 3, adds one Glowing Dawn card and one green BEATBREAK card with distinct selection, then bottoms the remainder; inherited Piercing.
- Knowledge base: no card-specific entries; general RevealAdd, evolution, inherited-effect, and Piercing rules apply.
- Implementation: exact reveal slots, conjunctive green/BEATBREAK filter, distinct-card consumption, bottom remainder, alternate evolution, and inherited keyword are complete. Direct/shared IR match, coverage is full/residual-free, and registration is exclusively `registerIrCard("BT25-046", compiled)`.
- Verification: focused — 1 passed; live deck interaction — 1 passed; RevealAdd — 7 passed; Piercing — 2 passed; registration — 2 passed; card-data — 17 passed; `git diff --check` — passed. No defect was found, so no implementation/test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-046
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-046.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-046.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-046.

## BT25-047 — Floramon — 10/10

- Catalog evidence: green level-3 Digimon; On Play reveal/search adds distinct Vegetation/Shaman and TS cards and bottoms the remainder; alternate zero-cost evolution from a level-2 TS Digi-Egg; inherited controller-turn +1000 DP to all friendly Digimon.
- Knowledge base: no card-specific entries; general reveal distinct-selection, evolution, and inherited continuous-effect rules apply.
- Implementation: reveal filters, distinct consumption, deck-bottom remainder, exact alternate evolution, owner-turn scope, friendly-only all-Digimon DP grant, full coverage/no residuals, and exclusive `registerIrCard("BT25-047", compiled)` are complete. Direct/shared IR match.
- Verification: focused — 1 passed; related BT25-099 — 6 passed; catalog sync — 19 passed; `git diff --check` — passed. No defect was found, so the subagent's unnecessary test expansion was discarded and no implementation/test change remains.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-047
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-047.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-047.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-047.

## BT25-048 — Bearmon — 10/10

- Catalog evidence: green level-3 Digimon, play cost 3; alternate level-2 TS evolution for 0; controller-turn self TS evolution cost -1; inherited all-turn once-per-turn Draw 1 when this Digimon wins a battle.
- Knowledge base: Q6316 excludes breeding-area Bearmon from its reducer. Q6317–Q6321 define battle-win timing, Security battles, simultaneous deletion triggers, would-delete/leave priority, and wins where deletion is prevented.
- Implementation: `wouldDigivolve` reduction is self- and battle-area-scoped with exact green/TS constraints; inherited `whenBattleWon` is self-scoped, all-turn, and once per turn. Direct/shared IR match, coverage is full/residual-free, and registration is exclusively `registerIrCard("BT25-048", compiled)`.
- Audit seam corrected: the behavior was correct, but the module-local IR was not exported, preventing reproducible direct/shared equality checks. `compiled` is now exported without changing runtime behavior.
- Verification: focused — 4 passed; catalog/audit — 25 passed after synchronization; evolution/combat/interpreter regressions — 241 passed; `git diff --check` — passed. No behavioral test was added.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-048
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-048.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-048.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-048.

## BT25-049 — Armalizamon — 10/10

- Catalog evidence: green level-4 Digimon; alternate level-3 Glowing Dawn evolution for 2; On Play/When Digivolving optionally suspends an opposing Digimon; controller-turn once-per-turn reduces a Glowing Dawn Option use cost by 3 by trashing a bottom face-down card under a friendly Tamer; inherited Piercing.
- Knowledge base: no card-specific entries; general suspension, replacement/use-cost, under-Tamer cost, and Piercing rules apply.
- Implementation: both entry timings, opponent target, optionality, exact once-per-turn Option reducer, atomic bottom-face-down cost, alternate evolution, and inherited keyword are complete. Direct/shared IR match, full/residual-free, with exclusive `registerIrCard("BT25-049", compiled)`.
- Audit seam corrected: the behavior was correct, but the module-local IR was not exported, preventing reproducible direct/shared equality checks. `compiled` is now exported without changing runtime behavior.
- Verification: focused — 3 passed; replacement/play mechanisms — 30 passed; manual runtime payment probe — passed; catalog/audit — 25 passed after synchronization; `git diff --check` — passed. No behavioral test was added.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-049
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-049.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-049.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-049.

## BT25-050 — Kiwimon — 10/10

- Catalog evidence: green level-4 Digimon, play cost 4, 4000 DP; alternate level-3 TS evolution for 2; On Play/When Digivolving may suspend either player's Digimon, then if at least two Digimon are suspended, one opposing Digimon obligatorily can't unsuspend until their turn ends; inherited controller-turn +1000 DP to all friendly Digimon.
- Knowledge base: Q6322 confirms the optional suspension may target either player's Digimon.
- Implementation: both timing sequences preserve optional any-controller suspension, threshold count 2, mandatory opponent-only restriction after the threshold, exact duration, alternate evolution, and inherited friendly-only owner-turn boost. Full coverage/no residuals and exclusive `registerIrCard("BT25-050", compiled)` remain.
- Defect corrected: the conditional restriction was incorrectly optional, allowing refusal after its condition was met. Focused live selection proves the second choice is required while the threshold-unmet path remains inert.
- Verification: focused — 4 passed; BT25 audit — 2 passed; targeted Oxfmt and `git diff --check` — passed. Workspace typecheck retains unrelated pre-existing errors and no BT25-050 error.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-050
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-050.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-050.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-050.

## BT25-051 — Grizzlymon — 10/10

- Catalog evidence: green/black level-4 Digimon; alternate level-3 TS evolution for 2; Blocker; On Play/When Digivolving gives one friendly qualifying Beast/Animal/Sovereign or Shaman/TS Digimon, excluding Sea Animal, +3000 DP through the opponent's turn; inherited all-turn once-per-turn Draw 1 after this Digimon wins a battle.
- Knowledge base: no card-specific entries; standard alternate-evolution, Blocker, targeting, duration, inherited-effect, and battle-win rules apply.
- Implementation: both entry timings share the exact inclusive/exclusive trait filter and friendly target; duration, alternate evolution, keyword, and inherited self-bound battle-win watcher are complete. Direct/shared IR match, coverage is full/residual-free, and registration is exclusively `registerIrCard("BT25-051", compiled)`.
- Verification: focused — 1 passed; battle-win regressions — 33 passed; shared evolution requirements — 93 passed; `git diff --check` — passed. No defect was found, so no implementation or behavioral-test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-051
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-051.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-051.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-051.

## BT25-052 — Logimon — 10/10

- Catalog evidence: green/red level-4 Appmon; App Fusion from Onmon and Gatchmon for 0; Main once per turn links a Social, Tool, or Game Digimon with Link from hand or this Digimon's evolution cards at cost -1; self-bound when-linked watcher may play Kazuki & Itsuki with at most one friendly Tamer; this card links to an Appmon for 2 and its linked When Linking effect suspends one opposing Digimon or Tamer.
- Knowledge base: Q6328 confirms the Main effect cannot choose a card without Link.
- Defects corrected: the linked When Linking effect and the card's Appmon Link requirement were absent; the Main action lacked executable Link eligibility; the when-linked watcher was not bound to this Logimon; and the Tamer threshold used an unexecutable raw condition. The corrected source selector admits qualifying hand cards while limiting the evolution-card branch to this Digimon.
- Verification: focused — 5 passed, including the public Main activation, exact cost reduction, hand source, Kazuki & Itsuki boundary, linked suspension, and self binding; catalog synchronization follows separately; `git diff --check` — passed. Registration remains exclusively `registerIrCard("BT25-052", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-052
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-052.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-052.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-052.

## BT25-053 — Aegiochusmon: Green — 10/10

- Catalog evidence: green/red level-5 Digimon; alternate Aegiomon evolution for 3; Vortex and Decode (Aegiomon); On Play/When Digivolving suspends one opposing Digimon or Tamer and prevents that same permanent from unsuspending through its controller's turn, then at three or fewer friendly security gives this Digimon Piercing and +5000 DP for the turn; inherited all-turn once-per-turn optional suspension after the controller's security is removed from.
- Knowledge base: Q6329 confirms the selected permanent still receives the unsuspend restriction when already suspended. Q6330 defines the simultaneous security-effect ordering handled by the shared security timing seam.
- Defect corrected: `Suspend` ignored the old result binding and `Restrict` placed its selection reference inside the filter, so the two actions could affect different permanents. Both timings now select once, bind that exact target, then suspend and restrict it; the already-suspended path remains legal.
- Verification: focused — 5 passed, covering exact-target binding, Q6329, alternate Aegiomon evolution, Vortex/Decode, Piercing/+5000, security direction, optionality, and once-per-turn behavior; `git diff --check` — passed. Registration remains exclusively `registerIrCard("BT25-053", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-053
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-053.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-053.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-053.

## BT25-054 — GreatGrizzlymon — 10/10

- Catalog evidence: green/black level-5 Digimon; alternate level-4 TS evolution for 3; Blocker; On Play/When Digivolving grants one opposing Digimon a forced attack at the start of its controller's next main phase through that turn; self battle-win may evolve into Callismon or Marsmon from hand for free; inherited once-per-turn trashes opposing top security after this Digimon deletes in battle.
- Knowledge base: Q6331 covers effect immunity at grant/trigger time. Q6332–Q6336 define battle-win timing and prevention. Q6337 forbids the inherited activation when its host is deleted in the same timing.
- Defects corrected: placeholder token grants were replaced with target-anchored timed main-phase watchers; the battle-win and battle-deletion watchers are now self-bound; and the inherited watcher rejects simultaneous host deletion.
- Verification: focused — 6 passed, including delayed forced attack, duration expiry, self-only battle win, self-only battle deletion, once per turn, and Q6337; catalog synchronization follows separately; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-054", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-054
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-054.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-054.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-054.

## BT25-055 — Deramon — 10/10

- Catalog evidence: green level-5 Digimon; alternate level-4 TS evolution for 3; On Play/When Digivolving may suspend either player's Digimon, then at two or more suspended Digimon may unsuspend one friendly Digimon; all-turn once-per-turn after this Deramon suspends may play a qualifying 4000-DP-or-less Digimon from hand free; inherited opponent-turn once-per-turn attack redirection to a friendly suspended Digimon.
- Knowledge base: Q6338 confirms either player's Digimon may be suspended. Q6339 defines the exact Vegetation/Plant/Avian/Bird-or-TS and 4000-DP play filter.
- Defect corrected: the all-turn watcher had no source filter and could trigger when any permanent suspended. It is now bound to this Deramon; the free play remains optional and once per turn.
- Verification: focused — 2 passed; Deramon deck oracle — 1 passed; subtrigger mechanisms — 23 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-055", compiled)` with full coverage and no residuals; shared synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-055
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-055.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-055.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-055.

## BT25-056 — Bootmon — 10/10

- Catalog evidence: green/black level-6 Appmon; App Fusion from Logimon and Craftmon for 0; Barrier; owner-turn On Play/When Digivolving/When Attacking may link a Social, Tool, or Game Digimon with Link from hand or this Digimon's evolution cards at cost -2; when this Digimon gets linked suspends an opposing Digimon or Tamer; this card links to an Appmon for 3 and, while linked, returns one suspended opposing Digimon to deck bottom when linked.
- Knowledge base: Q6340 confirms all three Link effects require a card with Link.
- Defects corrected: a common `hostFilter` excluded the hand branch from all three Link actions; each now uses the combined hand/evolution source with `source: "thisDigimon"`, executable Link eligibility, and the printed Appmon Link requirement.
- Verification: focused — 5 passed, including On Play hand Link, evolution-stack Link, cost reduction, opponent suspension, linked return, and Q6340; link-state mechanisms — 10 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-056", compiled)` with full coverage and no residuals; shared synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-056
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-056.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-056.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-056.

## BT25-057 — Monarchlizamon / Final Judgment — 10/10

- Catalog evidence: green/black level-5 dual Digimon/Option; alternate level-4 Glowing Dawn evolution for 3; conditional color waiver; shared once-per-turn When Digivolving/When Attacking paid De-Digivolve 1; separate When Digivolving rules battle; Final Judgment grants one friendly Digimon Rush, Security Attack +1, and +5000 DP for the turn, then may attack with that same Digimon.
- Knowledge base: 2026-05-15 errata changes Final Judgment's grants to `for the turn`. Q6341–Q6344 cover simultaneous triggers, direct battle, unaffected participants, and the Arts Digivolve attack timing.
- Implementation: exact paid cost, shared-use key, direct battle, corrected errata duration, and same-target Option chain are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-057", compiled)`.
- Verification: focused — 5 passed; neighboring battle regressions — 15 passed; `git diff --check` — passed. No direct behavioral defect was found, so no implementation or test change was made; persisted IR synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-057
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-057.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-057.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-057.

## BT25-058 — Callismon — 10/10

- Catalog evidence: green/black level-6 Digimon; alternate level-5 TS evolution for 4; Reboot, Blocker, and Fortitude; shared once-per-turn On Play/When Digivolving/When Attacking optional suspension followed by a potentially different opposing Digimon/Tamer unsuspend restriction; all-turn once-per-turn reacts to effect-driven play or digivolution with mandatory De-Digivolve 1 then optional direct battle.
- Knowledge base: Q6345 permits different suspend/restrict targets. Q6346 includes this card's own effect-driven entry. Q6347 makes De-Digivolve mandatory and battle optional. Q6348–Q6349 define the direct rules battle and unaffected participants.
- Implementation: all three keywords, shared-use timings, distinct-target sequence, effect provenance gates, mandatory De-Digivolve, and optional self-bound battle are complete. Direct/shared IR match, coverage is full/residual-free, and registration is exclusively `registerIrCard("BT25-058", compiled)`.
- Verification: focused — 8 passed; shared subtriggers — 50 passed; keyword/conformance — 31 passed; advanced keyword/combat — 63 passed; related BT25 peers — 24 passed; catalog sync — 31 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-058
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-058.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-058.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-058.

## BT25-059 — Ceresmon — 10/10

- Catalog evidence: green/yellow level-6 Digimon; alternate level-5 Vegetation/TS evolution for 3; self play-cost reduction of 5 at two or more suspended Digimon; On Play/When Digivolving may suspend up to two Digimon from either side, then grants friendly suspended Vegetation/TS Digimon immunity from opposing Digimon effects through the opponent's turn; all-turn once-per-turn global suspension reaction gives one opposing Digimon -3000 DP per suspended Digimon.
- Knowledge base: Q6306 covers stacked play-cost reductions. Q6350 permits either-side suspension. Q6351–Q6356 define effect immunity, selection, grants, later immunity changes, and trigger suppression.
- Implementation: thresholded replacement, either-controller up-to-two targeting, exact friendly suspended trait scope, opponent-Digimon-effect immunity, global suspension watcher, and live suspended-count DP scaling are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-059", compiled)`.
- Verification: focused — 5 passed; focused/peer/mechanism aggregate — 49 passed; `git diff --check` — passed. No direct behavioral defect was found, so no implementation or test change was made; persisted IR equality is recorded separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-059
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-059.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-059.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-059.

## BT25-060 — Rebootmon — 10/10

- Catalog evidence: green/white level-6 Appmon; App Fusion from Bootmon and Shutmon for 0; Security Attack +1, Reboot, and Link +1; shared once-per-turn When Digivolving/When Attacking pays by linking one Appmon card with Link from hand or this Digimon's evolution cards free, then may unsuspend a friendly Digimon; all-turn once-per-turn self Link/unsuspend reaction grants Piercing, Blocker, and immunity from opposing Digimon effects through the controller's turn.
- Knowledge base: Q6357 requires Link eligibility. Q6358–Q6363 define Digimon-effect immunity, selection, grants, later immunity changes, and trigger suppression.
- Defects corrected: common host filters excluded hand cards; both Link actions now use the combined source restricted to this Digimon's stack. The Link executor now records whether the current action actually linked a card, so the dependent unsuspend cannot be enabled by a pre-existing link. Opponent-Digimon-effect immunity is behaviorally proven.
- Verification: focused — 11 passed; link-state/link-eligibility/conformance — 34 passed; broader link/interpreter/subtrigger mechanisms — 218 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-060", compiled)` with full coverage and no residuals; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-060
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-060.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-060.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-060.

## BT25-061 — Offmon — 10/10

- Catalog evidence: black level-3 Appmon; alternate level-2 Appmon evolution for 0; start of controller's main phase may pay by trashing exactly one Appmon card from hand to Draw 1 and gain 1 memory; this card links to an Appmon for 1 and, while linked, prevents one opposing Digimon from unsuspending through its controller's turn.
- Knowledge base: no card-specific entries; standard activation-cost, Draw, memory, Link, linked-effect, target, and duration rules apply.
- Defects corrected: the trash cost incorrectly allowed zero cards, making it non-payment. It now requires exactly one eligible card behind a single optional activation; accepting pays once and makes both Draw 1 and gain 1 memory mandatory, while refusal grants neither benefit.
- Verification: focused — 6 passed, covering payment, refusal, exact filter, one optional decision, alternate evolution, linked target kind, non-retrigger, and expiry; hand-trash — 2 passed; restriction — 17 passed; subtrigger — 23 passed; adjacent Link peers — 35 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-061", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-061
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-061.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-061.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-061.

## BT25-062 — Kokuwamon — 10/10

- Catalog evidence: black level-3 Digimon; alternate level-2 TS evolution for 0; at start of controller's main phase, while memory is 4 or less on their side, this Digimon may evolve free into a Machine, Cyborg, or TS Digimon from hand; inherited all-turn +1000 DP.
- Knowledge base: Q6364 confirms “4 or less memory” means position 4 or farther right on the controller's side of the gauge.
- Implementation: timing, controller-relative memory gate, self evolution target, exact hand destination filter, free optional evolution, alternate evolution, and continuous inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-062", compiled)`.
- Verification: focused — 4 passed; digivolution legality/interpreter — 188 passed; adjacent peers — passed; `git diff --check` — passed. No direct behavioral defect was found, so no implementation or test change was made; persisted IR synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-062
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-062.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-062.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-062.

## BT25-063 — Commandramon — 10/10

- Catalog evidence: black/purple level-3 Digimon; two zero-cost alternate evolutions; When Moving/On Play reveals three, adds one Chaosmon or D-Brigade/ACCEL card, and returns the remainder to chosen deck top/bottom positions; inherited all-turn +1000 DP.
- Knowledge base: no card-specific entries; standard reveal, distinct remainder placement, moving, evolution, and inherited continuous-effect rules apply.
- Implementation: both timings, exact reveal/filter/count, ordered top-or-bottom remainder, evolution requirements, and inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-063", compiled)`.
- Verification: focused — 4 passed; BT25 audit — 2 passed; action-kind gate — 1 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-063
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-063.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-063.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-063.

## BT25-064 — ToyAgumon — 10/10

- Catalog evidence: black level-3 Digimon; alternate level-2 TS evolution for 0; On Play reveals three, adds one Option and one distinct TS card, then bottoms the remainder; inherited Reboot.
- Knowledge base: no card-specific entries; standard reveal distinct-selection, deck-bottom remainder, evolution, and inherited-keyword rules apply.
- Implementation: exact reveal slots, Option and TS filters with distinct consumption, remainder handling, alternate evolution, and inherited Reboot are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-064", compiled)`.
- Verification: focused — 4 passed; interpreter — 183 passed; BT25 audit — 2 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-064
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-064.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-064.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-064.

## BT25-065 — Monodramon — 10/10

- Catalog evidence: black level-3 Digimon; alternate level-2 TS evolution for 0; all-turn self-suspension Draw 1; controller-turn self player attack loses 2 memory; inherited all-turn +1000 DP.
- Knowledge base: no card-specific entries; standard suspension, attack-target, memory-loss, evolution, and inherited continuous-effect rules apply.
- Implementation: self-bound suspension watcher, controller-scoped draw, self/player-only attack gate, memory loss, alternate evolution, and continuous inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-065", compiled)`.
- Verification: focused — 6 passed; BT25 audit — 2 passed; relevant mechanisms — 23 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-065
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-065.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-065.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-065.

## BT25-066 — Guardromon — 10/10

- Catalog evidence: black level-4 Digimon; alternate level-3 TS evolution for 2; Blocker; all-turn replacement prevents this Digimon from leaving by trashing one of its own link cards; inherited all-turn +1000 DP.
- Knowledge base: no card-specific entries; standard replacement payment, hosted-link ownership, Blocker, evolution, and inherited continuous-effect rules apply.
- Implementation: exact self leave event, own-host link-card cost, prevention replacement, keyword, alternate evolution, and inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-066", compiled)`. The module IR is exported for reproducible direct/shared comparison without changing behavior.
- Verification: focused — 6 passed; leave prevention — 18 passed; subtriggers — 23 passed; interpreter — 183 passed; adjacent peers — 11 passed; `git diff --check` — passed. No behavioral test change was needed.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-066
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-066.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-066.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-066.

## BT25-067 — Sealsdramon — 10/10

- Catalog evidence: black/purple level-4 Digimon; alternate level-3 D-Brigade/ACCEL evolution for 2; controller-turn watcher when a matching Digimon is played, including self-play, may evolve this Digimon from hand with cost reduced; inherited all-turn +1000 DP.
- Knowledge base: Q6365 confirms playing this Sealsdramon itself triggers its effect.
- Implementation: play watcher, exact trait scope, self-entry handling, hand-only evolution candidate and reduction, alternate evolution, and continuous inherited boost are complete. Direct/shared IR match, coverage is full/residual-free, and registration is exclusively `registerIrCard("BT25-067", compiled)`.
- Verification: focused — 4 passed; subtrigger/digivolution mechanisms — 28 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-067
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-067.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-067.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-067.

## BT25-068 — Deltamon — 10/10

- Catalog evidence: black level-4 Digimon; alternate level-3 TS evolution for 2; Collision; all-turn once-per-turn when this Digimon suspends De-Digivolve 1 on one opposing Digimon; inherited all-turn +1000 DP.
- Knowledge base: no card-specific entries; standard self-suspension, Collision, De-Digivolve, once-per-turn, evolution, and inherited continuous-effect rules apply.
- Implementation: keyword, self-bound suspension watcher, exact opposing target, De-Digivolve amount, per-copy frequency, alternate evolution, and inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-068", compiled)`.
- Verification: focused — 4 passed; suspension/subtrigger/De-Digivolve/once-per-turn mechanisms — passed; `git diff --check` — passed. No direct defect was found, so no implementation or test change was made; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-068
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-068.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-068.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-068.

## BT25-069 — Raremon — 10/10

- Catalog evidence: black level-4 Digimon; alternate level-3 TS evolution for 2; Jamming; On Play/When Digivolving may link one TS Digimon card with Link from trash to one friendly Digimon free; inherited all-turn +1000 DP.
- Knowledge base: Q6366 confirms the selected card must have Link.
- Implementation: both entry timings, trash source, TS and Link eligibility, friendly recipient, free Link, alternate evolution, keyword, and inherited boost are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-069", compiled)`.
- Verification: focused — 6 passed; Link eligibility/state/conformance — 35 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-069
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-069.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-069.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-069.

## BT25-070 — Logamon — 10/10

- Catalog evidence: black/purple level-4 Appmon; App Fusion from Offmon and Hackmon for 0; Main once per turn may link a Social, Tool, or Game Digimon with Link from trash or this Digimon's evolution cards at cost -1; controller-turn self-linked watcher deletes one opposing play-cost-4-or-less Digimon; while linked, prevents one opposing Digimon/Tamer from unsuspending through its turn.
- Knowledge base: Q6367 confirms the Main effect cannot select a card without Link.
- Defect corrected: a common host filter excluded the trash branch. The target now has separate hosted and trash-capable filters while `source: "thisDigimon"` restricts only evolution-card candidates to this Digimon's stack.
- Verification: focused — 6 passed; Link/interpreter regressions — 204 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-070", compiled)` with full coverage and no residuals; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-070
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-070.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-070.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-070.

## BT25-071 — Orochimon — 10/10

- Catalog evidence: black level-5 Digimon; alternate level-4 TS evolution for 3; On Play/When Digivolving prevents one opposing Digimon/Tamer from attacking through its turn; self-suspension reveals three, may play one play-cost-4-or-less TS Digimon free, then bottoms the remainder; inherited copy is once per turn.
- Knowledge base: no card-specific entries; standard restriction, suspension, reveal/play/remainder, evolution, inherited, and once-per-turn rules apply.
- Implementation: both restriction timings, exact target/duration, self-bound suspension watcher, reveal pool, optional filtered free play, ordered deck-bottom remainder, inherited scope, and frequency are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-071", compiled)`.
- Verification: focused — 5 passed; interpreter/combat/subtrigger — 239 passed; suspension source-filter — 6 passed; `git diff --check` — passed. No direct defect was found, so no implementation or test change was made; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-071
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-071.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-071.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-071.

## BT25-072 — Shutmon — 10/10

- Catalog evidence: black level-6 Appmon; App Fusion requirement and Appmon Link requirement for 3; On Play/When Digivolving/When Attacking may link a Social, Tool, or Game Digimon with Link from trash or this Digimon's evolution cards at cost -2; remaining printed linked/self effects are preserved.
- Knowledge base: Q6368 confirms all three Link effects require a card with Link.
- Defects corrected: common hosted filters excluded trash candidates. Each timing now separates the trash-capable branch from the host-qualified branch while `source: "thisDigimon"` limits evolution-card candidates to this Digimon's stack; the printed Link requirement is explicit.
- Verification: focused — 8 passed; Link state — 10 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-072", compiled)` with full coverage and no residuals; module IR is exported for persisted comparison.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-072
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-072.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-072.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-072.

## BT25-073 — Dragomon — 10/10

- Catalog evidence: black level-5 Digimon with alternate evolution, Jamming, link-card payment, modal free play of one qualifying TS card or use of a qualifying TS Option, and inherited leave replacement.
- Knowledge base: no card-specific entries; standard payment, modal choice, card-kind wording, free play/use, and inherited replacement rules apply.
- Defect corrected: both play branches narrowed “1 TS trait card” to Digimon only, excluding valid TS Tamers. They now accept Digimon or Tamer while the separate Option branch remains unchanged.
- Verification: focused — 8 passed; BT25 audit — 2 passed; link/use-option seams plus BT25-066 — 23 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-073", compiled)` with full coverage and no residuals; module IR is exported for persisted comparison.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-073
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-073.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-073.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-073.

## BT25-074 — Tankdramon — 10/10

- Catalog evidence: black level-5 Digimon; alternate level-4 D-Brigade/ACCEL evolution for 3; shared once-per-turn When Digivolving/When Attacking reveal three, play one eligible Digimon with cost reduced by 5, and trash the remainder; all-turn filtered play watcher prevents one opposing Digimon from attacking; inherited conditional Reboot and Blocker for Chaosmon/D-Brigade/ACCEL hosts.
- Knowledge base: Q6369 confirms this card's own play can trigger its all-turn effect.
- Implementation: shared timing ledger, reveal/play/trash sequence, cost reduction, self-entry play watcher, restriction duration, and conditional inherited keywords are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-074", compiled)`. The IR is exported only for reproducible persistence checks.
- Verification: focused — 4 passed; interpreter — 183 passed; continuous ledger — 31 passed; `git diff --check` — passed. No behavioral defect was found, so no test change was made; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-074
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-074.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-074.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-074.

## BT25-075 — Vulcanusmon — 10/10

- Catalog evidence: black/red level-6 Digimon; alternate level-5 TS evolution for 3; conditional play-cost reduction; On Play/When Digivolving links up to two Link-capable cards from hand/trash free then De-Digivolves all opposing Digimon once per friendly link card; all friendly TS Digimon gain Rush and Link +1; when friendly Digimon get linked, one of those Digimon may attack.
- Knowledge base: Q6370 covers excess-link cleanup after Link +1 is lost. Q6371 requires Link eligibility. Q6372 includes this Vulcanusmon getting linked.
- Defect corrected: the linked watcher was not scoped to friendly Digimon and the attack could select an unrelated permanent. It now gates on a friendly linked subject and attacks that triggering Digimon.
- Verification: focused — 3 passed; analogous linked/trigger-subject — 11 passed; link scaling/excess rules — 5 passed; deck interaction — 1 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-075", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-075
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-075.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-075.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-075.

## BT25-076 — Ghoulmon — 10/10

- Catalog evidence: black level-6 Digimon; Before Pay Cost may delete one friendly play-cost-11-or-less Digimon containing an exact Negamon evolution card and Negamon in its text to reduce this card's play cost by the deleted Digimon's cost; Rush, Reboot, Blocker; On Play/When Attacking/On Deletion deletes one lowest-play-cost opposing Digimon, else trashes opposing top security.
- Knowledge base: Q6373 makes lowest-cost deletion mandatory when possible. Q6374 allows the fallback after deletion prevention. Q6714 defines “in its text.”
- Defect corrected: the evolution-stack Negamon gate used substring name matching rather than the exact bracketed card name. Exact-name matching now preserves the printed cost condition.
- Verification: focused — 9 passed; cost modifier — 7 passed; lowest-play-cost — 5 passed; Reboot — 3 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-076", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-076
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-076.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-076.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-076.

## BT25-077 — Bacchusmon — 10/10

- Catalog evidence: black/green level-6 Digimon; alternate level-5 TS evolution for 3; level-total play-cost reduction; On Play/When Digivolving may play one 6000-DP-or-less TS Digimon from hand free; all-turn once-per-turn on any play/digivolution may suspend one Digimon, then effect-driven entry obligatorily deletes one lowest-DP opposing Digimon.
- Knowledge base: Q6375–Q6378, Q6946, and Q7002 cover self-entry, suspended boards, once-per-turn consumption, mandatory effect-entry deletion, declining non-effect entry, and stacked reductions.
- Defect corrected: the direct IR injected Rush, Reboot, and Blocker despite none appearing on the card. They were removed, and the stale focused assertions now prove those keywords remain absent while the real effect-driven evolution flow resolves.
- Verification: focused — 8 passed; mechanism/interpreter/collection — 208 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-077", compiled)` with full coverage and no residuals; module IR is exported for persisted comparison.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-077
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-077.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-077.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-077.

## BT25-078 — Gazimon — 10/10

- Catalog evidence: purple level-3 Digimon with two zero-cost alternate evolutions; When Moving/On Play reveals three and either adds one card with Three Musketeers in its text or places one Three Musketeers-trait card under this Digimon, then bottoms the remainder; inherited Retaliation.
- Knowledge base: no card-specific entries; standard reveal alternative-disposition, hosted placement, evolution, remainder, and inherited-keyword rules apply.
- Implementation: both timings, exact reveal count, text/trait alternatives, placement host, deck-bottom remainder, evolution requirements, and inherited Retaliation are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-078", compiled)`.
- Verification: focused — 6 passed; BT25 audit — 2 passed; RevealAdd mechanisms — 9 passed; `git diff --check` — passed. No direct defect was found, so no implementation or test change was made; persisted synchronization follows separately.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-078
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-078.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-078.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-078.

## BT25-079 — Hyemon — 10/10

- Catalog evidence: purple level-3 Digimon; all-turn memory-gain lock applies to both players except Tamer effects; inherited Retaliation.
- Knowledge base: Q6380 confirms both players are restricted except Tamer effects. Q6381 confirms the exception still applies when the Tamer is also treated as a Digimon.
- Implementation: seat-wide permanent memory restriction with the exact Tamer-effect exception and inherited Retaliation are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-079", compiled)`. The IR is exported for reproducible persistence checks only.
- Verification: focused — 4 passed; BT25 audit — 2 passed; restriction regressions — 4 passed; `git diff --check` — passed. No behavioral defect was found, so no test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-079
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-079.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-079.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-079.

## BT25-080 — SkullMammothmon — 10/10

- Catalog evidence: purple level-4 Digimon; alternate level-3 TS evolution for 2; shared once-per-turn On Play/When Attacking hand-trash cost and Titan-trait trash recovery; effect-entry-only level-5 deletion; inherited all-turn once-per-turn hand-trash cost deletes a level-4 Digimon while hosted by a Titan.
- Knowledge base: no unresolved card-specific gap; standard activation-cost, trash recovery, effect provenance, level targeting, inherited host trait, and shared once-per-turn rules apply.
- Implementation: exact alternate evolution, shared-use timings, mandatory cost availability, Titan recovery, effect-entry provenance gate, level targets, and inherited host scope are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-080", compiled)`. The IR is exported for persisted comparison only.
- Verification: focused — 8 passed; `git diff --check` — passed. No behavioral defect was found, so no test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-080
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-080.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-080.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-080.

## BT25-081 — Devidramon — 10/10

- Catalog evidence: purple level-4 Digimon; mandatory On Play/When Digivolving suspension of exactly one opposing non-purple Tamer; all-turn once-per-turn after an opposing Tamer suspends gains 1 memory; inherited Retaliation.
- Knowledge base: no unresolved card-specific ambiguity; standard color exclusion, multicolor handling, Tamer suspension, memory, once-per-turn, and inherited keyword rules apply.
- Implementation: both entry timings, exact non-purple exclusion including multicolor, opponent-Tamer watcher, memory gain, frequency reset, and inherited Retaliation are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-081", compiled)`. The IR is exported for persistence proof only.
- Verification: focused — 5 passed; BT25 audit — 2 passed; exclude-colors mechanism — 2 passed; `git diff --check` — passed. No behavioral defect was found, so no test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-081
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-081.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-081.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-081.

## BT25-082 — DeputyMon — 10/10

- Catalog evidence: purple/black level-4 Digimon with two alternate level-3 evolution routes for 2; On Play/When Digivolving may play a qualifying Tamer free when at most one friendly Tamer exists; all-turn may evolve into a Three Musketeers Digimon for cost 4 ignoring requirements; inherited once-per-turn When Attacking places a card and draws.
- Knowledge base: Q6387–Q6392 cover breeding-area limits, base-granted evolution, requirement ignoring, and inherited behavior.
- Implementation: evolution routes, executable Tamer-count ceiling, free play, requirement-ignoring Three Musketeers evolution, inherited self-attack placement/draw, and once-per-turn scope are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-082", compiled)`.
- Verification: focused/adjacent — 19 passed; mechanism/interpreter/base-grant — 242 passed; `git diff --check` — passed. No defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-082
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-082.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-082.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-082.

## BT25-083 — LadyDevimon — 10/10

- Catalog evidence: purple Digimon whose placement cost accepts one Three Musketeers-trait card from hand or trash as any friendly Digimon's bottom evolution card; remaining When Digivolving/When Attacking Option-use and Three Musketeers interactions follow the printed clauses.
- Knowledge base: Q6390 and Q6393–Q6396 cover Three Musketeers text, simultaneous effects, trash/use sequencing, and Option zone lifecycle.
- Defect corrected: both placement costs required a Digimon card, excluding valid Three Musketeers Options, and did not explicitly encode the “any friendly Digimon” bottom-stack destination. Card-kind restriction was removed and the destination host/position are now exact.
- Verification: focused — 7 passed; BT25 collection/catalog — 63 passed; peers — 10 passed; interpreter — 183 passed; Option lifecycle — 35 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-083", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-083
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-083.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-083.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-083.

## BT25-084 — Titamon — 10/10

- Catalog evidence: purple level-6 Digimon with two alternate evolution routes; shared once-per-turn On Play/When Digivolving/When Attacking hand-trash payment deletes all highest-DP opposing Digimon and conditionally trashes security after effect-driven entry; first all-turn effect prevents leaving by trashing two cards; second all-turn effect watches this controller's hand and deletes one lowest-DP opposing Digimon.
- Knowledge base: Q6397–Q6401 require complete indivisible payments, repeat the 0-DP rule check before the hand-trash watcher can activate, and fire that watcher once per trash action rather than once per card.
- Defects corrected: both hand payments now explicitly select only the controller's hand, and the watcher explicitly gates on that controller's discarded hand. The rule-process deferral now retains a deleted subject's live context only for its own granted deletion watcher; unrelated watchers must still have a live source at activation, preserving BT15-039 while satisfying Q6399.
- Verification: focused — 15 passed; BT15-039 regression — 3 passed; rule process — 8 passed; subtrigger/interpreter — 206 passed; combined gate — 243 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-084", compiled)` with full coverage and no residuals; the module IR is exported for persisted comparison.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-084
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-084.test.ts src/cards/BT15/BT15-039.test.ts src/engine/ruleProcess.test.ts src/engine/effects/subtriggers.test.ts src/engine/effects/interpreter.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-084.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-084.

## BT25-085 — BeelStarmon — 10/10

- Catalog evidence: dual Digimon/Option card with Blocker, two level-5 alternate evolution routes, shared once-per-turn free use of a Three Musketeers/TS Option from hand or this Digimon's evolution cards, shared once-per-turn Option-card trash cost to unsuspend, and an Option-side Main effect that deletes an opposing highest-level Digimon then may place a Three Musketeers card from hand/trash as a friendly Digimon's bottom evolution card.
- Knowledge base: Q6402–Q6404 define text matching, simultaneous evolution/attack effects, and this card's Option identity/Three Musketeers trait; Q6716 confirms only one Counter activation per attack.
- Defect corrected: the Option-side placement omitted the printed bottom position and therefore used the generic placement default. The IR now specifies `position: "bottom"`, with a focused regression assertion for the exact destination.
- Verification: focused — 6 passed; combined focused/mechanism gate — 243 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-085", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-085
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-085.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-085.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-085.

## BT25-086 — Dan Yuki — 10/10

- Catalog evidence: black Tamer; start-main memory gain at four or less memory; end-turn self-suspension gives one friendly TS Digimon +1000 DP per opponent memory and then lets that same Digimon attack; Security plays this card free.
- Knowledge base: Q6405 defines the memory boundary, Q6406 confirms opponent-memory scaling, Q6407 makes the suspension payment gate the later attack, Q6408 prevents a nested second attack, and Q6713 confirms the exact-name interaction with BT24-085.
- Implementation: memory boundary, opponent-relative scaling, same-target attack binding, suspension payment, TS/battle-area scope, duration, and Security play are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-086", compiled)`.
- Verification: focused — 5 passed; combined focused/mechanism gate — 243 passed; `git diff --check` — passed. No direct defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-086
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-086.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-086.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-086.

## BT25-087 — Thomas H. Norstein — 10/10

- Catalog evidence: black Tamer; start-turn memory setter; all-turn opponent-hand-add watcher suspends this Tamer and may place the top two deck cards face down underneath it; once-per-turn DATA SQUAD evolution reduction paid by trashing a bottom face-down card under a friendly Tamer; Security plays this card free.
- Knowledge base: Q6409–Q6413 define true-bottom insertion, fixed order, private visibility, face-up trashing, and top-first deck placement; Q6414 allows two physical copies to stack their reductions.
- Implementation: memory boundary, opponent-seat event gate, self-suspension, top-first face-down placement, bottom-card payment, per-copy reduction, DATA SQUAD scope, and Security play are complete. Coverage is full/residual-free and registration is exclusively `registerIrCard("BT25-087", compiled)`.
- Verification: focused — 5 passed; stack/subtrigger/hand-trash mechanisms — 56 passed; combined batch/mechanism gate — 263 passed; `git diff --check` — passed. No direct defect was found, so no implementation or test change was made.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-087
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-087.test.ts src/engine/effects/stack.test.ts src/engine/effects/subtriggers.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-087.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-087.

## BT25-088 — Kyo Sawashiro — 10/10

- Catalog evidence: purple Tamer; start-turn memory setter; all-turn own-security-removal watcher suspends this Tamer and may place the top two deck cards face down underneath it; your-turn once-per-turn Glowing Dawn play reduction paid by trashing a bottom face-down card under a friendly Tamer; Security plays this card free.
- Knowledge base: Q6415 establishes Security-effect priority, Q6416–Q6420 define true-bottom placement, visibility, face-up trashing, and top-first deck order, and Q6421 allows two physical copies to stack play reductions.
- Defect corrected: the play-cost reduction was registered as unrestricted `Static` even though the printed effect is `[Your Turn]`. Its trigger is now `YourTurn`, and the focused suite asserts that timing explicitly.
- Verification: focused — 10 passed; interpreter/security-watcher mechanisms — 186 passed; combined batch/mechanism gate — 263 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-088", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-088
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-088.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/subtriggers.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-088.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-088.

## BT25-089 — Kazuki & Itsuki — 10/10

- Catalog evidence: black Tamer; start-main memory gain while the opponent has a Digimon; Main self-suspension links a Link-capable Appmon from hand or evolution cards at cost -2; end-turn once-per-turn may App Fuse a friendly Digimon into a Digimon card in the controller's hand; Security plays this card free.
- Knowledge base: Q6422 excludes Appmon cards without Link, and Q6423 prevents combining multiple link-effect activations for a single link action.
- Defects corrected: the end-turn App Fusion was mandatory despite “may,” and its result filter did not explicitly restrict the loose card to the controller's hand. The action is now optional and controller-scoped, with regressions for declining and for excluding an opponent's hand.
- Verification: focused — 8 passed; dedicated Link — 3 passed; BT24-087 and chapter-10 Link regressions — 29 passed; combined batch/mechanism gate — 263 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-089", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-089
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-089.test.ts src/cards/BT25/BT25-089-link.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-089.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-089.

## BT25-090 — Tomoro Tenma — 10/10

- Catalog evidence: red Tamer; start-turn memory setter; all-turn Digimon-suspension watcher may suspend this Tamer and place the top two deck cards face down underneath it; your-turn once-per-turn Glowing Dawn Option-use reduction paid by trashing a bottom face-down card under a friendly Tamer; Security plays this card free.
- Knowledge base: Q6424–Q6428 define true-bottom placement, fixed order, private visibility, face-up trashing, and top-first deck placement; Q6429 allows two physical copies to stack their Option-use reductions.
- Defect corrected: the Option cost reduction was registered as unrestricted `Static` despite the printed `[Your Turn]` timing. It now uses `YourTurn`, with a focused regression asserting both the timing and once-per-turn frequency.
- Verification: focused — 10 passed; placement/Glowing Dawn regressions — 14 passed; combined batch/mechanism gate — 236 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-090", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-090
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-090.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-090.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-090.

## BT25-091 — Monica Simmons — 10/10

- Catalog evidence: blue Tamer; On Play may return one TS Option from trash and draws regardless; all-turn TS Option-use watcher may activate by suspending this Tamer to prevent one opposing Digimon from attacking; Security plays this card free.
- Knowledge base: Q6430–Q6431 require the draw after either declining or lacking a return target, Q6432 places the watcher after the used Option finishes and reaches trash, and Q6433 excludes Security/Delay activations that did not use the Option.
- Defects corrected: the On Play return was mandatory, and the watcher modeled suspension as an unconditional body action rather than the optional activation payment. The return is now optional, while the watcher prompts for activation because it carries the self-suspension cost and resolves no restriction when declined or unpayable.
- Verification: focused — 9 passed; mechanism suite — 381 passed in the delegated audit; combined batch/interpreter/subtrigger gate — 236 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-091", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-091
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-091.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/subtriggers.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-091.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-091.

## BT25-092 — Asuna Shiroki — 10/10

- Catalog evidence: purple Tamer; start-main memory gain while the opponent has a Digimon; Main activation suspends this Tamer and trashes one Option from hand or a friendly Digimon's evolution cards to evolve a friendly Digimon into a Three Musketeers-text/TS Digimon from hand at cost -1; Security plays this card free.
- Knowledge base: Q6434 makes both suspension and Option trash mandatory for activation, and Q6435 prevents combining multiple digivolving effects into one evolution.
- Defect corrected: the trash-cost filter admitted Option cards under Tamers. The hosted branch now requires a friendly Digimon host while a separate OR branch preserves valid Options in hand; a focused regression proves a Tamer-hosted Option cannot pay.
- Verification: focused — 6 passed; BT25-082/Tamer-suspension/digivolve-legality regressions — 14 passed; combined batch/mechanism gate — 236 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-092", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-092
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-092.test.ts src/cards/BT25/BT25-082.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-092.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-092.

## BT25-093 — Ignition Flare — 10/10

- Catalog evidence: red Option with TS use requirement and TS Link requirement at cost 3; Security activates Main; Main deletes all lowest-DP opposing Digimon, falls back to trashing an opposing placed Option when deletion did not occur, then may link this card free; linked When Attacking once per turn deletes within host DP.
- Knowledge base: Q6436 limits the fallback to Options placed in the battle area by effect; Q6437–Q6438 define mandatory lowest-DP deletion and prevention fallback; Q6439–Q6443 define linked-effect provenance and field/breeding Link legality.
- Defects corrected: the fallback accepted any opposing Option permanent without encoding the placed-by-effect requirement, and the direct compiled card omitted its printed TS Link requirement/cost. Both are now explicit, with a focused regression assertion.
- Verification: focused — 7 passed; interpreter — 183 passed; targeting/conformance — 10 passed; Link mechanisms — 31 passed in delegated verification; combined gate — 216 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-093", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-093
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-093.test.ts src/engine/linkState.test.ts src/engine/effects/interpreter.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-093.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-093.

## BT25-094 — Cosmic Area — 10/10

- Catalog evidence: blue/purple Option with conditional color waiver; face-up Security all-turn effects support TS Digimon; Main manipulates security and plays a TS Digimon with reduction; Security may play an eligible low-level blue/purple TS Digimon from hand or trash free.
- Knowledge base: Q6444–Q6449 cover color requirement, face-up Security interactions, Security timing, TS target bounds, and the card's remaining placement/play clauses.
- Defect corrected: the Security play was encoded as mandatory even though the printed effect says “you may play.” It is now optional, with a focused decline regression that leaves the eligible card in trash.
- Verification: focused — 7 passed; mechanism suite — 116 passed with two unrelated known failures outside this card; combined interpreter/Link/play gate — 216 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-094", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-094
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-094.test.ts src/engine/effects/interpreter/actions/play.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-094.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-094.

## BT25-095 — Paradise Colosseum — 10/10

- Catalog evidence: red/green Option with conditional color waiver; face-up Security all-turn buffs friendly red/green TS Digimon and conditionally grants Rush; Main moves bottom security to hand, places this card face up at security bottom, and may play a TS card with cost reduction; Security may play an eligible low-level red/green TS Digimon from hand or trash free.
- Knowledge base: Q6450–Q6455 cover color requirement, face-up Security state, Marsmon/Callismon condition, bottom-security sequencing, and Security target legality.
- Defect corrected: the Security play was encoded as mandatory despite “you may play.” It is now optional, with a real decision regression proving refusal preserves the candidate and creates no permanent.
- Verification: focused — 7 passed; play/interpreter mechanisms — 185 passed; combined interpreter/Link/play gate — 216 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-095", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-095
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-095.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/actions/play.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-095.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-095.

## BT25-096 — Mirage Beast Knight — 10/10

- Catalog evidence: blue Option; use-cost reduction paid by trashing a bottom face-down card under a friendly Tamer; Main places exactly one Gaogamon and one MachGaogamon from trash as one Gaomon's bottom evolution cards, then that Digimon may evolve into MirageGaogamon from hand free while ignoring requirements; Security may play Gaomon/Thomas H. Norstein and then returns this Option to hand.
- Knowledge base: Q6456 requires both distinct named materials; partial placement cannot meet the activation condition.
- Defect corrected: the two placement costs and later evolution independently selected a Gaomon, allowing “that Digimon” to diverge on multi-host boards. The Main effect now uses one compound cost that binds the first selected Gaomon, forces the second material onto that bound host, and restricts the optional evolution to the same host.
- Verification: focused — 5 passed; interpreter — 183 passed; combined batch/mechanism gate — 212 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-096", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-096
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-096.test.ts src/engine/effects/interpreter.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-096.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-096.

## BT25-097 — Guardian Palace — 10/10

- Catalog evidence: black/green Option with conditional color waiver; face-up Security grants Alliance and Scapegoat interactions; Main manipulates bottom security and may play a qualifying Digimon; Security may play an eligible low-level black/green TS Digimon from hand or trash free.
- Knowledge base: Q6457–Q6463 cover Alliance/Scapegoat behavior, face-up Security state, bottom-security ordering, play targets, and related resolution boundaries.
- Defect corrected: the Security play was mandatory despite the printed “you may play.” It is now optional, with a focused decision regression proving refusal keeps the candidate in hand.
- Verification: focused — 5 passed; relevant mechanisms — 10 passed; combined batch/interpreter/play/Link gate — 212 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-097", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-097
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-097.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-097.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-097.

## BT25-098 — Cyber Engage — 10/10

- Catalog evidence: black Option with Appmon use requirement; Main reveals three, adds one Appmon card, trashes the remainder, and places this Option in the battle area; Delay may play one Appmon card from the controller's hand with cost reduced by 3; Security places this card in the battle area.
- Knowledge base: Q6464 prevents combining two Delay activations into one card-playing action; Comprehensive Rules §16-42 confines the use requirement to the specified cards on the field.
- Defects corrected: the use-requirement waiver accepted any Appmon card without field/card-kind scope, including a placed Appmon Option, and Delay could select an opponent's hand. The waiver now requires a friendly battle-area Appmon Digimon/Tamer and the play target is controller-scoped, with focused negative regressions.
- Verification: focused — 7 passed; interpreter/play mechanisms — 185 passed; combined batch/interpreter/play/Link gate — 212 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-098", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-098
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-098.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/interpreter/actions/play.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-098.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-098.

## BT25-099 — Gear Forest Village — 10/10

- Catalog evidence: green/black Option with a no-face-up-security color waiver; face-up Security grants Alliance to friendly green/black TS Digimon and conditionally grants Piercing while Bacchusmon or Ceresmon is present; Main moves the bottom security card to hand, places this card face up at security bottom, and may play a qualifying TS Digimon with cost reduced by 3; Security may play an eligible level 4-or-lower TS Digimon from hand or trash free.
- Knowledge base: Q6465–Q6470 confirm that zero security satisfies the waiver and Main condition, Main still places this card when no security card can be added to hand, and face-up security remains revealed, checks and activates Security normally, then becomes face down when shuffled.
- Audit result: the exclusive direct IR already matches the catalog and rulings. The focused suite covers empty-security resolution, face-up security behavior, grants, Main sequencing, and optional play; no implementation or test correction was needed.
- Verification: focused — 6 passed; combined batch/interpreter/provenance gate — 256 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-099", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-099
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-099.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-099.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-099.

## BT25-100 — Iron Slash — 10/10

- Catalog evidence: black Option with a TS color waiver; Security activates Main; Main de-digivolves one opposing Digimon by 2 and may link this card free to a friendly Digimon on the field; linked effects grant Collision and Piercing.
- Knowledge base: Q6471 classifies linked clauses as Digimon effects, Q6472 distinguishes linking from using an Option, and Q6473–Q6474 explicitly allow Main to link to a breeding-area Digimon even when it has no DP.
- Defects corrected: the Link action had its source and recipient selectors reversed and could not faithfully select the Option as the linked card, while the field recipient gate did not support the battle-area/breeding union. The action now links this card to a friendly Digimon in either field area, the shared permanent matcher supports zone unions, and linked Option resolution preserves Digimon-effect provenance through direct and deferred clauses.
- Verification: focused — 3 passed; interpreter — 183 passed; stack/subtrigger provenance — 56 passed; combined batch gate — 256 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-100", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-100
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-100.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/stack.test.ts src/engine/effects/subtriggers.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-100.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-100.

## BT25-101 — Divine Arms Version Ω — 10/10

- Catalog evidence: black Option with a TS color waiver; Main may trash one TS card from hand to draw 2, then may link this card or a Link-capable TS card from trash free to a friendly Digimon on the field; Security activates Main; linked effects grant Security Attack +1 and Reboot and can protect Vulcanusmon by trashing one of its link cards.
- Knowledge base: Q6475 makes the hand trash mandatory for reaching the post-“then” portion; Q6476 classifies linked clauses as Digimon effects; Q6477 distinguishes linking from Option use; Q6478–Q6480 define Link-capable targets and breeding-area recipients; Q6481 confirms that a trashed linked card's keywords are gone before battle deletion resolves.
- Defects corrected: linked Security Attack +1 and Reboot expired at each turn end instead of remaining active while linked, and the Main Link recipient omitted breeding. Both grants are now persistent, the recipient includes either field area, the draw action is fully typed without a file-wide suppression, and the shared Q6476 provenance mechanism is covered by direct/deferred engine regressions.
- Verification: focused — 8 passed; stack/subtrigger provenance — 56 passed; combined batch/interpreter gate — 256 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-101", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-101
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-101.test.ts src/engine/effects/stack.test.ts src/engine/effects/subtriggers.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-101.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-101.

## BT25-102 — Factorial Area — 10/10

- Catalog evidence: black/red Option with a no-face-up-security color waiver; face-up Security grants Blocker to friendly black/red TS Digimon and conditionally Link +1 while Vulcanusmon is present; Main moves bottom security to hand, places this card face up at security bottom, and may play a qualifying TS Digimon with cost reduced by 3; Security may play an eligible level 4-or-lower TS Digimon from hand or trash free.
- Knowledge base: Q6482–Q6487 confirm the empty-security waiver/Main behavior and the reveal, check, Security activation, and shuffle rules for face-up security cards.
- Audit result: the exclusive direct IR already matches the catalog and rulings. Focused behavior covers the waiver, both Security grants, Main sequencing, and optional play; no implementation or test correction was needed.
- Verification: focused — 4 passed; final-tail focused/mechanism gate — 29 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-102", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-102
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-102.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-102.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-102.

## BT25-103 — GraceNovamon — 10/10

- Catalog evidence: level 7 red/blue Digimon with Security Attack +1, Ice Clad, Partition (Apollomon & Dianamon), a shared When Digivolving/When Attacking deck-bottom return bounded by this Digimon's source count, and a shared When Attacking/Counter once-per-turn effect that may trash one opposing source for each of this Digimon's sources and then may end the attack.
- Knowledge base: Q6488–Q6490 define simultaneous activation/order across attack and Counter windows; Q6491–Q6493 define End Attack as a timing transition unaffected by immunity that still opens End of Attack; Q6717 limits each attack to one Counter activation.
- Defect corrected: pooled TrashDigivolution scaling was applied once by the generic dispatcher and a second time by the pooled action, squaring the source-count multiplier. The action now consumes the dispatcher-computed amount exactly once; a focused regression proves two GraceNovamon sources trash exactly two freely selected cards across different opposing hosts even when another friendly Digimon has an unrelated three-card stack.
- Verification: focused — 7 passed; interpreter — 183 passed; pooled TrashDigivolution mechanisms — 2 passed; EX5-025 regression — 4 passed; final-tail gate — 29 passed; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-103", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-103
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-103.test.ts src/cards/EX5/EX5-025.test.ts src/engine/effects/interpreter.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-103.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-103.

## BT25-104 — ShineGreymon: Burst Mode — 10/10

- Catalog evidence: red/yellow Digimon/Option DUAL card; Digimon side has Raid, Piercing, Security Attack +1, Blocker, Barrier, shared once-per-turn When Digivolving/When Attacking Option-side Main activation, and a your-turn Marcus Damon Digimon/12000 DP/Rush grant; Option side has DATA SQUAD Use Requirement, -15000 DP to one opposing Digimon for the turn, then may play a Tamer from hand free.
- Knowledge base: Q6494–Q6498 define Burst cleanup and Option-side activation/provenance; Q6499–Q6506 define Marcus's simultaneous Tamer/Digimon identity, DP, deletion, overlapping effects, and loss of the continuous grant; Q6507 defines the Option-side DATA SQUAD trait; Q6947 confirms the rule-process result when the granting ShineGreymon disappears before the 0-DP check.
- Defects corrected: the DATA SQUAD Use Requirement accepted trait cards outside the battle area and non-Digimon/Tamer cards, and the direct module omitted the Marcus-return Burst Digivolve route that runtime data supplied elsewhere. The gate now requires a friendly battle-area DATA SQUAD Digimon/Tamer, regressions reject breeding and Option false positives, both evolution routes live in the direct IR, and the compiled object is exported and fully typed without an unsafe action cast.
- Verification: focused — 9 passed; related mechanism/interpreter — 13 passed in delegated verification; final-tail focused/mechanism gate — 29 passed; typecheck has no BT25-104 errors and only the known unrelated baseline failures; `git diff --check` — passed. Registration is exclusively `registerIrCard("BT25-104", compiled)` with full coverage and no residuals.

### Reproduce

```bash
node tools/kb/query.mjs card BT25-104
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-104.test.ts
rg -n 'register(Card|IrCard)\(' apps/api/src/cards/BT25/BT25-104.ts
git diff --check
```

No ambiguity or unsupported behavior remains for BT25-104.
