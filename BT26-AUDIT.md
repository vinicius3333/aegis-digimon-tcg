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
