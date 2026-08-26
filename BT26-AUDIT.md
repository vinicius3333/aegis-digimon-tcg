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
