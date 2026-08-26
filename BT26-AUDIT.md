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
