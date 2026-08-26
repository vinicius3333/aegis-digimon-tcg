# BT26 Audit Ledger

Cards are audited independently in ascending card-ID order. A card receives 10/10 only when its complete catalog and local knowledge-base contract maps to compiled IR, all relevant shared semantics are traced, and observable behavioral tests prove every applicable boundary.

## BT26-001 — Yokomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-001` (`Yokomon`), a red Digi-Egg, level 2 In-Training, traits `Bulb`, `Iliad`, and `TS`.
- Printed inherited text: `[Your Turn] [Once Per Turn] When your effects add to decks, this Digimon may digivolve into a Digimon card with [Chronomon] in its text in the hand with the cost reduced by 1.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-001 --json`.
- Applicable rulings: Q6948 defines “with [Chronomon] in its text” across name, traits, effects, inherited effects, rules, and evolution requirements; Q6949 says a card returned to a deck from outside the deck triggers, but a revealed deck card merely restored does not; Q6950 confirms the trigger still applies when cards are both added and removed in one effect; Q6951 confirms adding cards to the opponent’s deck by one of your effects triggers it.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-001.ts` contains one inherited `YourTurn`/`OncePerTurn` effect and one `SubTrigger` for `whenEffectAddsToDeck`.
- The action targets this permanent, reads only `from: ["hand"]`, requires a Digimon, matches `[Chronomon]` with `nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }]`, pays the printed evolution cost, and applies `costDelta: -1` with `optional: true`.
- Registration is exclusively `registerIrCard("BT26-001", compiled)`; there is no `registerCard` registration in the module.
- Shared primitive trace: `returnToDeck` emits `whenEffectAddsToDeck` for genuine effect-driven deck placement and attributes the event to the effect controller, so Q6951 is covered. `RevealAdd` now passes `suppressWhenEffectAddsToDeck: true` while restoring unchosen revealed cards, preserving Q6949. The option is part of the reusable `EffectContext.returnToDeck` seam and does not change ordinary return behavior.
- Relevant peers inspected: BT26-015 (same deck-add event and Chronomon text vocabulary), BT26-060 (same event with an explicit once-per-turn watcher), BT26-009/BT26-011 (shared `match: "text"` Chronomon semantics), and BT26-036/BT26-063/BT26-018 (RevealAdd restoration callers/tests).

### Behavioral proof

Existing and strengthened `apps/api/src/cards/BT26/BT26-001.test.ts` cases prove:

- legal evolution from an inherited stack on a real deck return, including opponent-deck placement (Q6948/Q6951), cost reduction, evolution draw, and final zones;
- rejection of a Chronomon-text card that is not legal for the current stack;
- optional refusal with no memory/card movement;
- no reaction on the opponent’s turn;
- once-per-turn consumption after successful evolution;
- no reaction when a revealed card is restored directly or through `RevealAdd` (Q6949).

The last case failed before the seam fix because `RevealAdd` incorrectly activated Yokomon; it passes after the fix. The focused suite is therefore mutation-sensitive to the card-specific behavior and the repaired shared seam.

### Verification

Commands and results:

```text
pnpm --filter @aegis/shared build                                  PASS
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-001.test.ts PASS (8 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-018.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-063.test.ts PASS (26 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/primitives.test.ts src/engine/subTriggerSeams.test.ts PASS (160 tests)
pnpm typecheck                                                     PASS
git diff --check                                                    PASS
pnpm exec oxfmt --check <changed files>                             PASS
```

No unresolved card-text ambiguity remains after applying Q6948–Q6951. No commit or push was made, per the audit task instructions.

## BT26-002 — Budmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-002` (`Budmon`), a green Digi-Egg, level 2 In-Training, traits `Vegetation` and `DATA SQUAD`.
- Printed inherited text: `[Your Turn] [Once Per Turn] When effects trash cards from under your Tamers, ＜Draw 1＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-002`; it returned no knowledge-base entries. No card-specific ruling, erratum, restriction, or unresolved ambiguity is present locally.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-002.ts` contains one inherited `YourTurn`/`OncePerTurn` effect and one `SubTrigger` for `whenDigivolutionTrashed`, filtering the event subject to a Tamer controlled by the watcher and requiring effect provenance (`sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }`), then drawing one card for the watcher controller.
- `withSubTriggerTurnScope` carries `[Your Turn]` onto the installed watcher, `withSubTriggerFrequency` carries the per-physical-copy once-per-turn ledger, and `subjectMatchesFilter` resolves the event's Tamer host using controller and kind at fire time.
- `trashDigivolutionCards` is the shared effect-trash seam for cards under Tamers/Digimon: it moves the selected stack cards, emits `whenDigivolutionTrashed` once per card with the host as `subjectPermanentId`, and does not emit this event for return-to-hand bounce. `runResourceAction` resolves the resulting `Draw` against the watcher owner.
- Registration is exclusively `registerIrCard("BT26-002", compiled)`; there is no `registerCard` registration in the module.
- Relevant peers inspected: BT6-002 (same inherited event in the opponent-stack direction), ST23-13, ST24-13, and ST24-14 (under-Tamer stack/event consumers), and BT26-044, BT26-057, BT26-076, BT26-091, and BT26-094 (BT26 consumers of the same Tamer-trash event). Their event and controller/host-filter conventions are consistent with Budmon.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-002.test.ts` cases prove:

- an effect-trashing event under your Tamer draws exactly one card and a second event in the same turn is suppressed;
- cards under a Digimon, cards under an opponent's Tamer, and events during the opponent's turn do not draw;
- a Tamer-stack trash without effect provenance does not draw;
- separate physical Budmon copies maintain independent once-per-turn draws;
- the inherited source is exercised in an actual evolution stack, with final hand/deck state asserted through the public engine state.

The focused suite is mutation-sensitive: removing the inherited watcher, Tamer/controller filter, turn scope, or once-per-turn frequency makes the corresponding structural or behavioral assertion fail. The shared seam suite independently proves genuine effect-trash publication and the bounce-clear negative path.

### Verification

Commands and results:

```text
node tools/kb/query.mjs card BT26-002                                      PASS (no KB entries)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-002.test.ts    PASS (5 tests)
pnpm --filter @aegis/api exec vitest run src/engine/subTriggerSeams.test.ts src/engine/effects/primitives.test.ts PASS (160 tests)
pnpm typecheck                                                              PASS
git diff --check                                                            PASS
pnpm exec oxfmt --check <changed files>                                      PASS
```

The missing `byEffect: true` gate was corrected in the card module and covered by the added negative behavioral test. No commit or push was made, per the audit task instructions.

## BT26-003 — Kyaromon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-003` (`Kyaromon`), a black Digi-Egg, level 2 In-Training, traits `Lesser`, `Glowing Dawn`, and `BEATBREAK`; it has no main, Security, or other effect text.
- Printed inherited text: `[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, by trashing the bottom face-down card from under any of your Tamers, change the attack target to 1 of your [Glowing Dawn] trait Digimon.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-003 --json` (the required non-JSON query was also run); it reports no banlist or errata entry and the card rulings Q6952 and Q6953.
- Q6952 confirms that this attack-target change can affect an attacking Digimon that is unaffected by effects. Q6953 confirms that the inherited effect may be activated and pay its Tamer-stack cost even when no [Glowing Dawn] Digimon is available as a redirect target.
- Comprehensive rules §11-2-7-2–5 cover effect-based target switching, the prohibition on switching to an existing target, and switching targets involving unaffected Digimon. Sections §4-7-5 and §4-7-9–10 establish bottom-card ordering and the face-down/hidden state relevant to the cost.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-003.ts` contains one inherited `OpponentsTurn`/`OncePerTurn` effect with a `whenOpponentAttacks` sub-trigger.
- Its `RedirectAttack` action selects exactly one Digimon controlled by the watcher controller whose trait matches `Glowing Dawn`, pays `trashBottomFaceDownUnderTamer` for exactly one of that controller's Tamers, and is optional. `abortOnDecline: true` preserves the unchanged attack when the optional processing is declined; `allowCostWithoutTarget: true` implements Q6953 by allowing the cost to resolve without a redirect candidate.
- Registration is exclusively `registerIrCard("BT26-003", compiled)`; no `registerCard` registration exists for this card.
- Shared primitive trace: `runAction` preflights redirect candidates unless `allowCostWithoutTarget` is set, then delegates candidate resolution to the controller chooser and attack switching to `redirectAttack`; the combat primitive preserves target switching for unaffected attackers/targets and emits the attack-target-switched event only after a successful switch. The structured cost preflight and payer enumerate only the bottom (`stack[0]`) face-down card of each matching Tamer, select across any of the controller's Tamers, and trash it through `trashDigivolutionCards`.
- Relevant peers inspected: BT15-085, BT18-073, BT19-065, BT19-072, and BT19-078 for opponent-turn/once-per-turn redirect patterns; BT26-005, BT26-031, BT26-053, BT26-076, and BT26-082 for the shared bottom-face-down-under-Tamer cost; and BT26-075/BT26-090 for Glowing Dawn and Tamer-stack fixtures. Their controller, trait, timing, and stack-order conventions are consistent.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-003.test.ts` cases prove:

- the inherited trigger, opponent-turn scope, once-per-turn frequency, exact `whenOpponentAttacks` event, optional redirect, and printed cost shape;
- successful redirection to a Glowing Dawn Digimon while trashing the bottom face-down Tamer card and leaving the upper card under the Tamer;
- Q6953's no-target path, which still trashes the eligible bottom face-down Tamer card;
- optional refusal with no cost payment and the original attack proceeding to Security;
- Q6952's unaffected Progress attacker being redirected successfully;
- once-per-turn suppression across two opponent attacks, including preservation of the second stack card; and
- the negative face-up-bottom boundary, which neither pays the cost nor redirects.

The focused behavioral suite passes all 7 tests. It exercises the inherited effect in a real stacked Digimon (`BT26-003` under a Digimon), both an eligible-target path and the ruling-backed no-target path, paid-cost final zones, target switching, optional refusal, immunity interaction, and the once-per-turn ledger. No card or engine change was necessary.

### Verification

Commands and results:

```text
node tools/kb/query.mjs card BT26-003                                      PASS (Q6952, Q6953; no errata/banlist)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-003.test.ts    PASS (7 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts src/engine/subTriggerSeams.test.ts PASS
pnpm typecheck                                                              PASS
git diff --check                                                            PASS
```

No unresolved card-text ambiguity remains. No card-specific test or implementation changes were needed, and no commit or push was made, per the audit task instructions.

## BT26-004 — Pagumon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-004` (`Pagumon`), a purple Digi-Egg, level 2 In-Training, traits `Lesser`, `Glowing Dawn`, and `BEATBREAK`; it has no main or Security effect.
- Printed inherited text: `[When Attacking] [Once Per Turn] By placing 1 card from your hand face down under any of your [Glowing Dawn] trait Tamers, ＜Draw 1＞.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-004`; it reports Q6954–Q6957 and no card-specific erratum, restriction, or unresolved ambiguity.
- Q6954 requires a newly placed card to be at the bottom of an existing Tamer stack. Q6955 prohibits changing the order of face-down cards. Q6956 limits inspection/search of face-down cards under a Tamer to their owner. Q6957 requires a trashed face-down Tamer-stack card to enter the trash face-up. Comprehensive Rules §4-4-2 and §4-7-3/§4-7-9/§4-7-10 establish the same placement, ordering, and visibility semantics.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-004.ts` contains exactly one inherited `WhenAttacking` effect with `frequency: "OncePerTurn"`. Its `Draw` action draws exactly one card for the effect controller.
- The draw's placement cost selects exactly one card from the controller's hand, restricted to the printed card categories (`Digimon`, `Tamer`, or `Option`), and places it face-down under one of the controller's Tamer permanents whose trait is `Glowing Dawn`. The placement cost is optional and aborts the draw when declined or unpayable, matching the effect's “By” activation structure.
- With no explicit position, the shared place-cost interpreter uses the normal Tamer placement rule (push to the stack's bottom); `faceDown: true` preserves hidden state. The shared visibility view exposes the card ID only to its owner, and `trashDigivolutionCards` flips a face-down stacked card face-up when it enters the trash.
- Registration is exclusively `registerIrCard("BT26-004", compiled)`; no legacy `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-003 and BT26-005 for the inherited BT26 Tamer-stack costs, BT26-025 and BT26-089 for Glowing Dawn Tamer placement, ST24-02 for the same generic hand-card-to-trait-Tamer draw cost, and BT19-016 for the same `By placing ... under any of your Tamers` timing/cost pattern. Their target, controller, stack-order, and optional-cost conventions are consistent.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-004.test.ts` cases prove:

- successful inherited attack activation places a hand card face-down at the bottom of an existing Tamer stack, draws exactly one, and exposes the hidden card ID only to its owner (Q6954/Q6956);
- the destination is restricted to an own `Glowing Dawn` Tamer, excluding an opponent's Tamer and an own plain Tamer;
- the inherited effect resolves only once per turn after successful payment;
- without an eligible own `Glowing Dawn` Tamer, neither the hand card nor the deck changes;
- declining the optional placement leaves both hand and deck unchanged; and
- trashing the hidden placed card reveals it face-up in the trash (Q6957), while the structural assertion confirms the `faceDown` placement shape and inherited once-per-turn trigger.

The inherited effect is exercised from a real battle-area evolution stack (`BT26-004` under an attacking Digimon). The six focused tests are mutation-sensitive to the inherited trigger, once-per-turn ledger, controller/trait destination filter, optional payment, face-down placement, draw amount, and visibility/trash semantics. No card or engine change was necessary.

### Verification

Commands and results:

```text
node tools/kb/query.mjs card BT26-004
  PASS (Q6954–Q6957; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-004.test.ts
  PASS (6 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-004.test.ts src/engine/state/visibility.test.ts src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts
  PASS (4 files, 341 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. No card or engine change was necessary, and no commit or push was made, per the audit task instructions.

## BT26-005 — Pinamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-005` (`Pinamon`), a purple Digi-Egg, level 2 In-Training, with `Bird` and `DATA SQUAD` traits and no main or Security effect.
- Printed inherited text: `[On Deletion] By trashing the bottom face-down card from under any of your Tamers, you may play 1 play cost 5 or lower [Avian] trait or [DATA SQUAD] trait card from your trash without paying the cost.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-005`; it reports Q6958 and no local erratum, restriction, or unresolved ruling conflict.
- Q6958 confirms that the card just trashed from under the Tamer may be the card played from the trash.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-005.ts` contains exactly one inherited `OnDeletion` effect. Its optional `PlayWithoutCost` action reads only the controller's trash, selects exactly one `Digimon` or `Tamer` with printed play cost at most 5 and either the `Avian` or `DATA SQUAD` trait, and pays `trashBottomFaceDownUnderTamer` for exactly one of the controller's Tamers before the free play.
- The shared `definitionMatches`/`matchNameOrTrait` path treats the two `nameOrTrait` entries as a union and applies whole-trait matching; the shared loose-card path scopes `controller: "mine"` to the source owner's trash and applies the play-cost and kind boundaries. Options are intentionally excluded because this is a `play` clause and the engine's Option lifecycle is `use`, not permanent play.
- The shared `canPayCost` and `payCost` implementations enumerate only battle-area Tamers whose literal bottom stack card (`stack[0]`) is face-down, select among any eligible Tamer, and trash the selected card through `trashDigivolutionCards`. The cost is paid before candidate selection, preserving Q6958 when the newly trashed card is itself eligible.
- Registration is exclusively `registerIrCard("BT26-005", compiled)`; no `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-003 and BT26-057 for bottom-face-down Tamer costs and unpayable/declined boundaries; BT26-076 for the same inherited play-from-trash vocabulary; BT26-072 and BT26-065 for DATA SQUAD/Avian candidates; and ST24-12 for the same Tamer-stack cost family. Their controller, kind, trait, and stack-order conventions are consistent with Pinamon.

### Behavioral proof

Existing and strengthened `apps/api/src/cards/BT26/BT26-005.test.ts` cases prove:

- the inherited deletion trigger, optional free-play action, exact play-cost/kind/trait filter, and exact Tamer-stack cost shape;
- runtime selection of an Avian-only card (`BT1-013`) and a DATA SQUAD Digimon/Tamer, with the selected card entering the battle area without paying its play cost;
- the Q6958 path where the card just trashed from under the Tamer is immediately selected from the trash and played;
- the inclusive play-cost-5 boundary and rejection of an over-cost candidate and an unrelated Tamer from a mixed trash pool; and
- optional refusal, which leaves both the face-down Tamer-stack card and trash candidate unmoved.

The inherited effect is exercised from a stacked Digimon, including a legal BT26 Pinamon-to-Falcomon evolution base in the Avian branch test. Shared peer tests cover the face-up-bottom/unpayable cost boundary and the reusable cost/primitive resolution. The six focused tests are mutation-sensitive to the inherited trigger, optionality, cost ordering, controller scope, exact kind/cost/trait filter, and Q6958 final zones. No implementation change was necessary; the only card-specific change was the missing Avian behavioral proof and exact filter assertion.

### Verification

Commands and results:

- `node tools/kb/query.mjs card BT26-005` — PASS (Q6958; no erratum/restriction).
- Focused `pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-005.test.ts` — PASS (6 tests).
- Focused plus peers/primitives/interpreter — PASS (5 files, 338 tests).
- `pnpm typecheck` — PASS (shared build, shared/api/web typecheck).
- `git diff --check` — PASS.
- `pnpm exec oxfmt apps/api/src/cards/BT26/BT26-005.test.ts` — PASS.

No unresolved card-text ambiguity remains. No module or shared-engine change was necessary, no duplicate legacy registration exists, and no commit or push was made, per the audit task instructions.

## BT26-006 — Monimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-006` (`Monimon`), a purple level 2 Digi-Egg/In-Training with `CRT` and `Bagra Army` traits. It has no main or Security effect.
- Printed inherited text: `[When Attacking] [Once Per Turn] By trashing any 2 digivolution cards from your [Bagra Army] trait Digimon, you may play or use 1 [Bagra Army] trait card from your hand with the cost reduced by 2.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-006`; it reports Q6959–Q6961 and no card-specific erratum or restriction. Q6959 requires both specified cards to be trashed; Q6960 makes an attack fail when the attacking Digimon becomes DigiXros material for the played card; Q6961 removes a pending effect when its trashed source leaves the trash before activation.
- Comprehensive Rules §4-2-2/§4-2-3-1 cover exact payment and reduced alternate costs; §4-3-2/§4-3-3 define digivolution cards and inherited effects; §15-4-4-3/§15-4-4-4 cover pending-effect loss when a card becomes new or loses its effect; §15-8-4-3-1/§15-8-4-4-1 require activation and optional processing conditions to be payable and completed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-006.ts` contains exactly one inherited `WhenAttacking` effect with `frequency: "OncePerTurn"`. The effect is a one-choice modal: the play branch selects exactly one own-hand `Digimon` or `Tamer` with the `Bagra Army` trait, pays its printed cost reduced by 2, and permits DigiXros; the use branch selects exactly one own-hand `Option` with the `Bagra Army` trait and pays its use cost reduced by 2.
- Both branches share an exact `kind: "trash"` activation cost requiring two cards in the `digivolutionCards` zone whose host is an own `Digimon` with the `Bagra Army` trait. The shared candidate resolver spans multiple hosts, while `trashDigivolutionCardsAtomic` validates every selected source before moving any card, satisfying Q6959 and preventing partial payment.
- The shared play/use primitives preserve effect-driven lifecycle semantics. `allowDigiXros: true` enables normal and expanded DigiXros material selection; if the attacking permanent is consumed as material, the attack no longer has a present attacker (Q6960). Pending source watchers are dropped when a trashed card is moved from the trash into the DigiXros stack (Q6961).
- Registration is exclusively `registerIrCard("BT26-006", compiled)`; no `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-012 and BT26-033 for play/use modal branches including Tamers; BT26-049 for trait-scoped play/use filters; BT26-021 and BT26-026 for reduced paid effect-play semantics; EX10-034, EX10-044, EX10-058, and EX10-064 for Bagra Army DigiXros and pending-source interactions. Their controller, trait, reduction, and DigiXros conventions are consistent.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-006.test.ts` suite has 10 passing tests proving:

- inherited `WhenAttacking` timing, once-per-turn identity, exact two-card source cost, cross-host source selection, and atomic rejection when one selected source is protected;
- selection of a Bagra Army Digimon with the cost reduced by 2 and selection of a Bagra Army Tamer (`BT10-093`) through the play branch, while a non-Bagra Tamer remains in hand;
- rejection of a non-Bagra host, the one-source Q6959 boundary, and optional refusal without moving sources or paying the card cost;
- Q6960 attack invalidation when the attacking Digimon is placed under an effect-played DigiXros card; and
- Q6961 retirement of a pending trashed-source effect when `EX10-064` moves that source into the DigiXros stack.

The tests exercise the effect from realistic evolution stacks and mixed Bagra/non-Bagra board state. They are mutation-sensitive to the inherited trigger, once-per-turn ledger, exact count, host trait/controller filter, atomic payment, reduced payment, Tamer inclusion, DigiXros material handling, attack termination, and pending-effect lifecycle.

### Verification

Commands and results:

```text
node tools/kb/query.mjs card BT26-006
  PASS (Q6959–Q6961; no card-specific erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-006.test.ts
  PASS (10 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-006.test.ts src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts
  PASS (3 files, 328 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
git diff --check
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-006.ts apps/api/src/cards/BT26/BT26-006.test.ts
  PASS
```

The audit found and corrected one fidelity defect: the play branch previously admitted only `Digimon`, excluding valid Bagra Army Tamers despite the printed “card” wording. It now admits `Digimon` and `Tamer`, with focused behavioral proof. No unresolved card-text ambiguity remains. No commit or push was made, per the audit task instructions.

## BT26-007 — Swipemon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-007` (`Swipemon`), a white level 2 Digi-Egg/In-Training with `Appmon` form, `Navi` attribute, and `Swipe` trait. It has no main or Security effect.
- Printed inherited text: `[When Attacking] [Once Per Turn] You may link 1 [Seven Code] trait Digimon card from your hand or this Digimon's digivolution cards to this Digimon with the cost reduced by 2.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-007`; it reports Q6962 and no local erratum, restriction, or other card-specific ruling. Q6962 confirms that a card without `<Link>` cannot be linked by this optional effect.
- Comprehensive Rules §2-3-11-4-1–4-3 define the structured Link requirement and link cost; §10-1-1, §10-1-2-1–2, and §10-1-3-1–3 define legal Link cards, hand/battle-area sourcing, bottom insertion, cost payment, and final attachment.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-007.ts` contains exactly one inherited `WhenAttacking` effect with `frequency: "OncePerTurn"` and one optional `Link` action.
- The action selects exactly one own `Digimon` carrying the `Seven Code` trait and an actual `linkRequirement` (`hasLinkRequirement: true`), sources it from `hand` or `digivolutionCards`, and applies `costDelta: -2`. `target.source: "thisDigimon"` narrows only the stack branch to the source permanent, while preserving the printed hand branch; the omitted recipient uses the source permanent as “this Digimon.”
- The shared `candidateLooseInstances` resolver applies `source: "thisDigimon"` only to hosted stack candidates, and `definitionMatches` applies the kind, trait, controller, and structured Link-capability predicates. `runLink` parses the candidate's printed Link cost, floors the reduced cost at zero, pays it through the shared memory plumbing, and `primitives.link` moves the selected card to the bottom of the host's existing linked cards and makes it face-up.
- The timing/sub-trigger machinery installs inherited effects from a real evolution stack and tracks the physical-copy `OncePerTurn` ledger across repeated attack windows. Registration is exclusively `registerIrCard("BT26-007", compiled)`; no legacy `registerCard` registration exists for this card.
- Relevant peers inspected: BT25-089 for hand/stack Link with `hasLinkRequirement` and cost reduction; BT26-028, BT26-037, BT26-084, and BT26-086 for Seven Code/Appmon Link sourcing and self-recipient patterns; BT26-010 and BT26-019 for the Seven Code Link cards and their cost-3 requirements; and the shared Link action, loose-card targeting, Link eligibility, cost, and placement primitives. Their controller, trait, Link-capability, cost, and stack-order conventions are consistent with Swipemon.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-007.test.ts` suite has 8 passing tests proving:

- inherited `WhenAttacking` timing, `OncePerTurn`, optionality, exact Link action shape, and the `-2` reduction;
- linking an eligible cost-3 `Seven Code` Digimon from hand for cost 1, with memory and final linked zone asserted;
- linking an eligible card from this Digimon's own digivolution cards, preserving the remaining stack;
- rejection of a matching card in another Digimon's stack, proving the source-stack boundary;
- suppression across repeated attack windows after one successful activation;
- Q6962's rejection of a Digimon without `<Link>`;
- rejection of a Link-capable Digimon without the `Seven Code` trait; and
- optional refusal with no memory payment or card movement.

The focused suite is mutation-sensitive: restoring the prior `hostFilter` encoding makes the hand and once-per-turn positive cases fail because the shared loose-card resolver treats that host filter as inapplicable to the hand branch; removing `source: "thisDigimon"` makes the cross-stack negative fail. No unresolved card-text ambiguity remains.

### Verification

Commands and results:

```text
node tools/kb/query.mjs card BT26-007
  PASS (Q6962; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-007.test.ts
  PASS (8 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-007.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/subTriggerSeams.test.ts
  PASS (4 files, 350 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-089.test.ts src/cards/BT26/BT26-028.test.ts
  PASS (2 files, 14 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-007.ts apps/api/src/cards/BT26/BT26-007.test.ts BT26-AUDIT.md
  PASS
git diff --check
  PASS
```

The audit found and corrected one fidelity defect: the previous `hostFilter: { isSelfRef: true }` on the combined hand/stack target incorrectly rejected all hand candidates. The source restriction is now encoded with `target.source: "thisDigimon"`, and the Link-capability gate is explicit. A broader peer command also exposed unrelated failures in BT26-019, BT26-084, and BT26-086 (none of those modules or tests was touched by this diff); the directly affected Link mechanism suites and BT26-007 focused proof pass. No commit or push was made, per the audit task instructions.

## BT26-008 — Kotemon — 10/10

### Contract and implementation evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-008` (`Kotemon`), red level 3 Rookie/Data Digimon, play cost 3, DP 1000, printed red level 2 evolution cost 0, traits [Reptile]/[Shambala]/[TB]/[TS]. Main text is `[Digivolve] Lv.2 w/[Shambala]/[TS] trait: Cost 0` and `[When Moving] [On Play] 1 of your [Shambala] or [TS] trait Digimon gains ＜Piercing＞ and +3000 DP for the turn.` Inherited text is `[Your Turn] This Digimon gets +2000 DP.`
- Knowledge base: `node tools/kb/query.mjs card BT26-008` reports no entries; no card-specific errata, ruling, or restriction applies.
- `apps/api/src/cards/BT26/BT26-008.ts` uses exclusive `registerIrCard("BT26-008", compiled)`, `coverage: "full"`, and `residual: []`. Both main triggers use one `SelectBind` of one controller-owned Digimon with Shambala OR TS, then `GainKeyword` and `ModifyDP` through the same selection reference for the turn. The inherited effect uses `YourTurn` and +2000 on `isSelf`. The alternate requirement is parsed by the shared `digivolutionRequirementsFor` catalog path.
- Shared primitive trace: `SelectBind` + `fromSelectionRef` ensures Piercing and DP affect the same selected permanent; `controller: "mine"`, `kind: ["Digimon"]`, and `nameOrTrait` provide the printed controller/type/disjunctive trait boundaries; `forTheTurn` expires both bonuses; inherited `YourTurn` follows the standard peer encoding.

### Behavioral proof

`apps/api/src/cards/BT26/BT26-008.test.ts` has 8 passing tests covering compiled trigger shape, exact zero-cost Shambala/TS evolution, legal off-color TS and Shambala eggs, rejection of a non-trait near-match, On Play and When Moving timing, TS-only positive targeting, controller and trait filtering, same-target binding for both bonuses, end-of-turn expiry, and inherited +2000 DP only on the controller's turn. Real `digivolve` and `moveFromBreeding` intents prove stack/source transitions. The mixed-board case includes an opponent trait match and non-matching Digimon.

### Verification

```text
node tools/kb/query.mjs card BT26-008
  PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-008.test.ts
  PASS (8 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-008.ts apps/api/src/cards/BT26/BT26-008.test.ts BT26-AUDIT.md
  PASS
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. The audit added only card-specific behavioral cases and made no changes to the implementation module because it already faithfully compiled the complete contract.

## BT26-009 — Hyokomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-009` (`Hyokomon`), red level 3 Rookie Digimon, play cost 3, DP 2000, traits `Bird`, `Iliad`, and `TS`. Printed evolution is `[Digivolve] Lv.2 w/[TS] trait: Cost 0`. Main text is `[Start of Your Main Phase] By trashing 1 card with [Chronomon] in its text or the [Shaman] trait from your hand, ＜Draw 1＞ and gain 1 memory.` Inherited text is `[When Attacking] ＜Draw 1＞ Then, if your hand has 6 or more cards, return 1 card in your hand to the bottom of the deck.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-009`; it reports Q6963 and no erratum, restriction, or unresolved card-specific ruling. Q6963 defines “with [Chronomon] in its text” to include name, traits, effects, inherited effects, rules, and evolution/DNA/DigiXros/Burst/App Fusion/Link/Assembly requirements.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-009.ts` uses `coverage: "full"`, `residual: []`, and exactly one `registerIrCard("BT26-009", compiled)` registration. No legacy `registerCard` registration exists.
- The `StartOfYourMainPhase` effect places the printed hand-trash cost on one `Draw 1` action, restricting the payer to the controller's hand and matching the union of Chronomon text and Shaman trait. `abortOnDecline` prevents the subsequent memory gain when the activation is declined or cannot be paid; this matches the standard optional activation semantics of a “By” cost. The following `GainMemory` adds exactly one memory after successful payment/draw.
- The inherited `WhenAttacking` effect draws one for the watcher controller, then returns exactly one own-hand card to `deckBottom` only when the post-draw hand count is at least 6. The shared return primitive moves the selected card face-down to the deck bottom.
- The alternate level-2 TS evolution requirement is supplied by the committed `generated-digivolve-overrides.json` catalog path and is verified through `digivolutionRequirementsFor` and real `digivolve` intents.
- Relevant peers inspected: EX12-006 and BT24-026 for the same Start-of-Main “By trashing ... Draw 1 and gain 1 memory” cost sequencing; BT26-008/BT26-010 for neighboring TS evolution and inherited timing; BT26-015 and BT26-023 for deck-bottom return and hand-count boundaries. Their controller, cost, trigger, and zone conventions are consistent.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-009.test.ts` cases prove:

- exact zero-cost Lv.2 `[TS]` evolution, including a legal TS egg stack and rejection of a near-match egg;
- Q6963's Chronomon-text hand payment, including a card whose Chronomon mention is in inherited text, followed by Draw 1 and gain 1 memory;
- the alternative Shaman-trait payment and rejection of an unrelated hand card;
- the unpayable-cost negative path, which leaves hand/deck/memory unchanged;
- optional refusal of the “By” activation, with no trash, draw, or memory gain;
- inherited attack behavior from an actual evolution stack, including draw-first ordering, exactly-six post-draw boundary, one card to face-down deck bottom, and the five-card post-draw negative boundary.

The focused suite is mutation-sensitive to both printed clauses, their filters, cost sequencing, inherited source, and the numeric hand boundary. No card-specific implementation or test change was necessary because the current compiled module and eight behavioral tests already prove the complete contract.

### Verification

```text
node tools/kb/query.mjs card BT26-009
  PASS (Q6963; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-009.test.ts
  PASS (8 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-009.test.ts src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts src/engine/subTriggerSeams.test.ts
  PASS (4 files, 350 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-009.ts apps/api/src/cards/BT26/BT26-009.test.ts BT26-AUDIT.md
  PASS
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. No implementation or test change was required, no duplicate legacy registration exists, and this audit created no push. The audit evidence is delivered in the atomic commit for BT26-009.

## BT26-010 — Roleplaymon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-010` (`Roleplaymon`), red level 3 Digimon, play cost 4, DP 4000, `Appmon` form, and `Game`, `Role-playing (App Name)`, and `Seven Code` traits. Printed evolution is `[Digivolve] Lv.2 w/[Appmon] trait: Cost 0`. Main text is `＜Detach ([Seven Code] trait)＞ [When Attacking] By trashing 1 [Game], [Open] or [Seven Code] trait card from your hand, ＜Draw 2＞`; Link requirement is `[Appmon] trait: Cost 3`, with linked effects `＜Progress＞ ＜Piercing＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-010`; it reports Q6964 and no erratum, restriction, or unresolved card-specific ruling. Q6964 confirms that Detach occurs immediately before both equal-DP battle losers would be deleted, and that detaching a link with Piercing removes Piercing before the opponent's Digimon is deleted, so Piercing cannot activate.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-010.ts` uses `coverage: "full"`, `residual: []`, and exactly one `registerIrCard("BT26-010", compiled)` registration. No legacy `registerCard` registration exists.
- The module publishes Detach as a non-inherited static keyword, places the `[When Attacking]` Draw 2 effect as non-inherited with an optional trash cost restricted to the controller's hand and the union of the printed `Game`, `Open (App Name)`, and `Seven Code` traits, and grants linked Progress plus Piercing through a linked static effect. The alternate evolution and Link requirements match the catalog exactly.
- Shared primitive trace: the IR interpreter resolves the structured hand trash cost before Draw 2 and aborts cleanly when declined or unpayable; the Link resolver enforces the candidate's Appmon trait and cost 3 requirement and removes linked static keywords when the link leaves. Combat's Detach seam evaluates eligible Seven Code links immediately before battle deletion and before Piercing consumption, matching Q6964.
- Relevant peers inspected: BT26-019 for the same Seven Code Detach and cost-3 Appmon Link requirement, BT26-028/BT26-037/BT26-084 for Appmon/Seven Code Link and Detach patterns, BT26-007 for Appmon evolution and Link filtering, and the combat keyword/controller and Link/hand-cost primitives. Their timing, controller, trait, cost, and linked-zone behavior is consistent with Roleplaymon.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-010.test.ts` has 15 passing tests proving:

- exact Lv.2 Appmon cost-0 evolution, including rejection of a non-Appmon Lv.2;
- non-inherited When Attacking behavior and Detach publication;
- successful Draw 2 after trashing each printed cost trait (`Game`, `Open`, and `Seven Code`), plus no eligible-card and optional-decline paths;
- Link through the public action only to Appmon, payment of exactly 3 memory, and linked Progress/Piercing visibility; rejection preserves memory for an invalid recipient;
- removal of both linked keywords when Roleplaymon leaves the link area; and
- Q6964 equal-DP battle timing, including survival after detaching, two simultaneous Detach decisions, decline deleting both Digimon, non-Seven-Code links not qualifying, and Detach not being offered for effect deletion.

The tests exercise Roleplaymon in a real evolution stack and a real linked host, assert final zones and memory, and include the ruling-backed Piercing boundary. No implementation or test change was necessary because the existing proof is complete and mutation-sensitive to the card's clauses.

### Verification

```text
node tools/kb/query.mjs card BT26-010
  PASS (Q6964; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-010.test.ts
  PASS (15 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-010.test.ts src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts src/engine/subTriggerSeams.test.ts
  PASS (4 files, 357 tests)
pnpm typecheck
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-010.ts apps/api/src/cards/BT26/BT26-010.test.ts BT26-AUDIT.md
  PASS
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. No card-specific implementation or test change was required, and no push was made. The audit evidence is delivered in the atomic commit for BT26-010.
