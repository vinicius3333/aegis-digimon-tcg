# BT26 Audit Ledger

> **Historical detailed ledger.** This file preserves the card-by-card notes
> from an earlier pass. The authoritative executed closeout, current scores,
> corrections, and reproducible test evidence are in
> `docs/audits/BT26-STATIC-AUDIT.md`.

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
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-007.ts apps/api/src/cards/BT26/BT26-007.test.ts docs/audits/BT26-AUDIT.md
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
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-008.ts apps/api/src/cards/BT26/BT26-008.test.ts docs/audits/BT26-AUDIT.md
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
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-009.ts apps/api/src/cards/BT26/BT26-009.test.ts docs/audits/BT26-AUDIT.md
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
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-010.ts apps/api/src/cards/BT26/BT26-010.test.ts docs/audits/BT26-AUDIT.md
  PASS
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. No card-specific implementation or test change was required, and no push was made. The audit evidence is delivered in the atomic commit for BT26-010.

## BT26-011 — Buraimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-011` (`Buraimon`), red level 4 Champion Digimon, play cost 5, DP 5000, Vaccine attribute, and `Birdkin`/`Iliad`/`TS` traits. Its printed normal evolution is red Lv.3 for 2; its alternate evolution is `[Digivolve] Lv.3 w/[TS] trait: Cost 2`. Main text is `＜Raid＞ [On Play] [When Digivolving] By trashing 1 card with [Chronomon] in its text or the [Shaman] trait from your hand, ＜Draw 2＞`; inherited text is `＜Raid＞`.
- Knowledge base: `node tools/kb/query.mjs card BT26-011` reports Q6965 and no erratum, restriction, or other card-specific ruling. Q6965 defines “a card with [Chronomon] in its text” as a card containing the text/icon in its name, traits, effects, inherited effects, Rule text, or any evolution, DNA Digivolve, DigiXros, Burst Digivolve, App Fusion, Link, or Assembly requirement. Comprehensive Rules §15-7 identifies “by X” as an optional processing condition and requires the following processing only after that condition succeeds; §16-23 defines Raid as an optional attack-target switch to the opponent's unsuspended Digimon with the highest DP. The timing clauses are covered by §15-16-2/3/5.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-011.ts` is a complete IR module (`coverage: "full"`, `residual: []`) with two non-inherited effects: `OnPlay` and `WhenDigivolving` each execute `Draw` amount 2 behind one hand-trash cost, and one inherited static `Raid` keyword. The cost restricts candidates to `zone: "hand"`, `controller: "mine"`, count exactly 1, and the union of `[Chronomon]` text and `[Shaman]` trait. `optional: true` plus `abortOnDecline: true` models the §15-7 optional “by trashing” condition and prevents Draw 2 when it is declined or unpayable.
- The non-inherited static effect publishes Raid on Buraimon itself; the inherited static effect publishes Raid from a real evolution stack. The committed `generated-digivolve-overrides.json` entry supplies the exact alternate Lv.3/TS/cost-2 requirement, while the catalog supplies the normal red Lv.3/cost-2 requirement. Registration is exclusively `registerIrCard("BT26-011", compiled)`; no legacy `registerCard` registration exists.
- Shared primitive trace: the interpreter maps `OnPlay`/`WhenDigivolving` to their discrete timing windows, resolves the hand cost before the gated Draw action, and carries the static inherited keyword through stack source resolution. `candidateLooseInstances` plus `definitionMatches` enforce the own-hand zone/controller and OR filter; `matchNameOrTrait(..., match: "text")` spans the full printed-text union required by Q6965. Raid's shared attack resolver selects the highest-DP unsuspended opponent target. Relevant peers inspected: BT26-009 and BT26-062 for the same optional hand-trash-to-draw cost family, BT18-058 for a Chronomon-style `match: "text"` cost, EX12-006 for shared “By trashing ... Draw” sequencing, and BT26-012/BT26-013 for neighboring BT26 trigger/effect conventions.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-011.test.ts` has 9 passing tests proving:

- complete IR shape with both Raid keyword entries and both draw-two trigger windows;
- alternate Lv.3 `[TS]` evolution for exactly 2 from an off-color TS Digimon, with rejection of a non-TS peer and unchanged memory;
- On Play payment of exactly one eligible hand card followed by exactly two draws;
- When Digivolving payment with a `[Shaman]` card and draw ordering after the evolution draw;
- Q6965 matching when `[Chronomon]` appears only in a card's inherited text;
- optional refusal and the no-eligible-card path, with no trash or draws;
- Raid publication on the top card and from a real evolution stack; and
- Raid's printed attack redirection to the highest-DP unsuspended opponent Digimon.

The cases resolve the full effect stack and assert observable zones, memory, stack transitions, hand/deck contents, and attack outcomes. The positive/negative evolution cases prove the alternate requirement, while the mixed eligible/ineligible hand cases and Q6965 inherited-text case prove the cost filter and text union. No card-specific implementation or test change was necessary because the existing module and nine behavioral tests already prove the complete contract.

### Verification

```text
node tools/kb/query.mjs card BT26-011
  PASS (Q6965; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-011.test.ts
  PASS (9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-011.test.ts src/cards/BT26/BT26-009.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts
  PASS (4 files, 335 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-011.test.ts src/engine/subTriggerSeams.test.ts src/engine/conformance/ch15-01-effect-basics.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts
  PASS (4 files, 53 tests)
```

No unresolved card-text ambiguity remains. No implementation or test change was required, no duplicate legacy registration exists, and no push was made. The BT26-011 audit evidence is left uncommitted for review.

## BT26-012 — Manekimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-012` (`Manekimon`), a red/yellow level 4 Champion Digimon, play cost 5, DP 6000, Vaccine attribute, and `Puppet`/`Shambala`/`TB` traits. Its printed normal evolution requirements are red Lv.3 for 3 or yellow Lv.3 for 3; its alternate requirement is `[Digivolve] Lv.3 w/[Shambala] trait: Cost 2`. Main text is `[Main] [Once Per Turn] You may play or use 1 [TB] trait card from your hand with the cost reduced by 2.` Its inherited text is `[When Attacking] [Once Per Turn] 1 of your opponent's Digimon gets -2000 DP for the turn.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-012`; it reports Q6966–Q6968 and no card-specific erratum, restriction, or unresolved ruling. Q6966 prohibits simultaneously activating two copies to combine reductions on one play/use; Q6967 allows activation when play-cost reductions are prohibited but leaves the cost unreduced; Q6968 allows activation when effect-driven Digimon plays are prohibited but prevents the play.
- Comprehensive Rules §1-3-9 and §4-2-3-1 establish that reduced costs cannot become negative and are paid as alternate costs; §15-7 covers optional “you may” processing; §4-3-3 establishes inherited effects and §11 covers the When Attacking timing and turn duration.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-012.ts` contains the alternate Lv.3 `[Shambala]`/cost-2 evolution requirement, one non-inherited `Main`/`OncePerTurn` modal, and one inherited `WhenAttacking`/`OncePerTurn` `ModifyDP` action for exactly one opponent Digimon by -2000 for the turn.
- The Main modal's play branch now selects exactly one own-hand `[TB]` `Digimon` or `Tamer` and pays its cost reduced by 2; the use branch selects exactly one own-hand `[TB]` Option, pays its use cost reduced by 2, and permits multicolor Options. The play wording is intentionally represented by both playable permanent kinds; Options are used by the separate branch.
- The shared interpreter applies the reduction only to the selected card's own payment, checks player-level cost-reduction and effect-play prohibitions, and leaves the card in hand when a prohibited effect-driven Digimon play cannot resolve. Once-per-turn identity is tracked per physical source copy, so separate copies do not combine reductions into one payment.
- Registration is exclusively `registerIrCard("BT26-012", compiled)`; no legacy `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-006 for the same play/use-by-trait modal and Tamer-inclusive play boundary; BT26-033 for the same reduced play/use branches and multicolor Option handling; BT26-011/BT26-013/BT26-014 for neighboring BT26 evolution, effect-play, and inherited-trigger conventions; ST12-03 and BT9-047 for the Q6967/Q6968 restriction interactions; and the shared play/use, cost, once-per-turn, and DP-duration primitives.

### Behavioral proof

Existing and strengthened `apps/api/src/cards/BT26/BT26-012.test.ts` cases prove:

- the exact red and yellow normal Lv.3 cost-3 evolution paths, plus the alternate Lv.3 `[Shambala]` cost-2 evolution and rejection of a near-match;
- playing exactly one own-hand `[TB]` Digimon for 2 less, spending the Main effect once per turn, and rejecting a second activation in the same turn;
- the repaired printed-kind boundary by playing the `[TB]` Tamer `BT26-104 Kunlun` for exactly 3 memory (5 minus 2), proving the play branch is not Digimon-only;
- the Q6967 Option path with a live “players can't reduce play costs” restriction, which pays the full Option cost;
- the Q6966 two-copy boundary, where two separate activations do not combine into a single reduced payment;
- the Q6968 effect-play prohibition, which leaves the selected Digimon in hand and preserves memory;
- optional refusal with no memory/card movement;
- the inherited effect in a real evolution stack, including exactly one opponent Digimon, exclusion of Tamers/breeding, -2000 DP for the turn, and once-per-turn suppression; and
- the negative case where another allied Digimon attacks, proving the inherited `When Attacking` source is not an ally-attack watcher.

The focused suite is mutation-sensitive to the corrected Tamer-inclusive filter, the alternate evolution requirement, Main and inherited trigger timing, optionality, reduction, prohibition interactions, controller/kind/count boundaries, duration, and once-per-turn identity. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-012
  PASS (Q6966–Q6968; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-012.test.ts
  PASS (12 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-006.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/useOption.test.ts
  PASS (4 files, 338 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-012.ts apps/api/src/cards/BT26/BT26-012.test.ts
  PASS
git diff --check
  PASS
```

The audit found and corrected one fidelity defect: the play branch previously admitted only `Digimon`, excluding valid `[TB]` Tamers despite the printed “card” wording. It now admits `Digimon` and `Tamer`, with focused behavioral proof. No commit or push was made, per the audit task instructions.

## BT26-013 — Musyamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-013` (`Musyamon`), a red/purple level 4 Champion Digimon, play cost 4, DP 5000, Virus attribute, and `Wizard`/`Shambala`/`TB`/`TS` traits. Its normal evolution requirements are red or purple Lv.3 for 3; its alternate requirement is `[Digivolve] Lv.3 w/[Shambala]/[TS] trait: Cost 2`.
- Printed text: `<Blocker>`; `[On Play] [On Deletion] By trashing 1 card in your hand, delete 1 of your opponent's Digimon with 6000 DP or less.` Its inherited text is `[Your Turn] This Digimon gets +2000 DP.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-013`; it reports no card-specific ruling, erratum, restriction, or unresolved entry.
- Comprehensive Rules §2-3-2-2–3 defines slash-separated traits and matching a specified trait; §15-7-1–5 defines “by trashing” as an optional processing condition and allows paying it even when the following target cannot be processed; §15-16-4 defines the On Deletion timing; §15-3-1–2 defines inherited effects; §15-8-2 and §16-5 define the persistent Your Turn and Blocker behaviors.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-013.ts` contains the alternate Lv.3 `[Shambala]`/`[TS]` cost-2 requirement, a static `<Blocker>` keyword, matching `OnPlay` and `OnDeletion` actions, and the inherited `YourTurn` +2000 DP action.
- Each delete action targets exactly one opponent-controlled Digimon with current DP `lte 6000`, pays exactly one card from the controller's hand, is optional with `abortOnDecline`, and sets `allowCostWithoutTarget` to preserve §15-7-5's legal cost-only path when no qualifying opponent exists.
- The inherited modifier targets only the source stack's top permanent, grants +2000 DP for the turn, and is active only on its owner's turn.
- Registration is exclusively `registerIrCard("BT26-013", compiled)`; no legacy `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-008 for the same Shambala/TS OR-trait evolution and inherited +2000 DP shape; BT26-011/BT26-012/BT26-014 for neighboring alternate evolution, optional hand-trash, and inherited-trigger conventions; BT24-013 and BT13-006 for the same hand-trash-to-delete semantics; and the shared deletion, cost, DP-duration, trait matching, Blocker, and evolution primitives.

### Behavioral proof

The strengthened `apps/api/src/cards/BT26/BT26-013.test.ts` suite has 10 passing tests proving:

- exact compiled trigger/keyword/action structure and the alternate evolution requirement;
- alternate evolution for 2 from both a TS-only Lv.3 and a Shambala-only Lv.3, with rejection of a non-trait peer;
- On Play and On Deletion payment of exactly one hand card followed by deletion of one opposing Digimon at the inclusive 6000-DP boundary, while leaving a 7000-DP Digimon;
- the §15-7-5 no-target path, where the hand card may still be trashed without deletion;
- optional refusal without hand trashing or deletion;
- `<Blocker>` publication on the top card; and
- inherited +2000 DP on the owner's turn, including a real evolution stack, with no bonus on the opponent's turn.

The focused and affected regression suites resolve the full effect stack and assert observable zones, memory, stack transitions, DP, and keywords. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-013
  PASS (no knowledge-base entries)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-013.test.ts
  PASS (1 file, 10 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-008.test.ts src/cards/BT26/BT26-012.test.ts src/cards/BT26/BT26-014.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts
  PASS (6 files, 349 tests)
pnpm --filter @aegis/api exec vitest run src/engine/conformance/ch15-01-effect-basics.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts
  PASS (2 files, 20 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-013.ts apps/api/src/cards/BT26/BT26-013.test.ts
  PASS
git diff --check
  PASS
```

No card implementation change was necessary. One focused evolution test was added to prove the previously untested Shambala-only branch of the printed OR requirement. No commit or push was made, per the audit task instructions.

## BT26-014 — Darumamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-014` (`Darumamon`), a red/yellow level 5 Ultimate Digimon with 7000 DP, Vaccine attribute, and `Mutant`/`Shambala`/`TB` traits. Its normal evolution requirements are red or yellow Lv.4 for 4; its alternate requirement is `[Digivolve] Lv.4 w/[Shambala] trait: Cost 3`. The printed Assembly requirement is `[Assembly -2] Lv.4 or lower [TB] trait card`.
- Printed text: `[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 7000 DP or less.` Its `[On Deletion]` effect may return 1 `[Shambala]` trait card from its trash to the hand, then may play 1 `[TB]` trait Digimon card with 6000 DP or less from the hand without paying the cost. The inherited text is `[On Deletion]` may play 1 `[TB]` trait Digimon card with 6000 DP or less from the hand without paying the cost.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-014`; it reports Q6969 and no erratum, restriction, or unresolved card-text ambiguity. Q6969 confirms that after the first On Deletion part returns the activating card from trash to hand, the effect continues through the part after `then`.
- Comprehensive Rules evidence: the effect-timing rules define On Play, When Digivolving, and On Deletion triggers; the optional-effect rules define each `may` branch; the Assembly rules require the exact specified trash material and apply the fixed reduction before paying the play cost; inherited-effect rules apply the inherited On Deletion clause from an evolution stack.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-014.ts` is a complete IR module with separate On Play and When Digivolving delete actions, a two-action On Deletion sequence, and a separate inherited On Deletion play action. The delete filter is exactly one opponent Digimon with DP `lte 7000`; the play filter is exactly one own-hand Digimon with the `TB` trait and printed DP `lte 6000`, played without cost and optionally.
- The first On Deletion Return action is optional and restricted to one own-trash `[Shambala]` trait card; the following optional PlayWithoutCost action remains in the same resolving effect, preserving Q6969 continuation when the returned card is the activating Darumamon itself. The inherited action uses the same exact hand/trait/DP boundary.
- The alternate evolution requirement is supplied by `packages/shared/src/effects/generated-digivolve-overrides.json`, and the Assembly recipe by the BT26 override in `packages/shared/src/effects/data.ts`; both are consumed by the shared evolution/Assembly engine. Registration is exclusively `registerIrCard("BT26-014", compiled)`; no legacy `registerCard` registration exists.
- Shared primitive trace: target resolution applies controller, kind, trait, and inclusive DP filters; Return moves a selected trash card to hand before the following action resolves; PlayWithoutCost plays the selected hand Digimon without memory cost and fires its play timing; deletion timing preserves the pending effect source after the source moves to trash. Assembly validates trash-only material, exact count, Lv.4-or-lower and `[TB]` constraints, and the -2 reduction.
- Relevant peers inspected: BT26-012 and BT26-013 for adjacent TB/Shambala hand filters, alternate evolution, and optional deletion sequencing; BT26-017 for Shambala/Assembly and inherited-stack behavior; BT24-073 and BT24-076 for On Deletion effect-play conventions; and shared `assembly.ts`, loose-targeting, definition matching, permanent matching, play, removal, and trigger-resolution primitives. Their controller, zone, trait, DP, optionality, and source-continuation conventions are consistent with Darumamon.

### Behavioral proof

Existing `apps/api/src/cards/BT26/BT26-014.test.ts` has 9 passing tests proving:

- exact compiled trigger structure, the alternate `[Shambala]` Lv.4/cost-3 evolution requirement, and the `[TB]` Lv.4-or-lower Assembly recipe;
- Assembly with a legal Lv.4 `[TB]` material, rejection of a Lv.5 `[TB]` near-match, exact -2 memory reduction, and material placement under the played card;
- On Play deletion of an opposing Digimon at the inclusive 7000-DP boundary while leaving an 8000-DP Digimon;
- When Digivolving deletion at the same inclusive boundary through a legal evolution path;
- Q6969's source-continuation case: returning Darumamon itself from trash to hand and then continuing to play an eligible `[TB]` Digimon from hand;
- inherited On Deletion play from a real evolution stack, with the played card resolved after the host deletion;
- rejection of a `[TB]` Digimon above 6000 DP and of a low-DP Digimon without the `[TB]` trait; and
- optional refusal of both On Deletion branches without moving unrelated cards.

The focused suite is mutation-sensitive to every printed target, zone, controller, trait, count, DP boundary, trigger, optional branch, Assembly boundary, and inherited-stack path. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-014
  PASS (Q6969; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-014.test.ts
  PASS (1 file, 9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-014.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch15-01-effect-basics.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts
  PASS (6 files, 349 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
git diff --check
  PASS
```

No card implementation or test change was required. The BT26-014 audit evidence is left uncommitted for review; no push was made.

## BT26-015 — Butenmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-015` (`Butenmon`), a red/yellow level 5 Ultimate Digimon with 7000 DP, Vaccine attribute, and `Shaman`/`Iliad`/`TS` traits. Its normal evolution requirements are red or yellow Lv.4 for 4; its alternate requirement is `[Digivolve] Lv.4 w/[TS] trait: Cost 3`.
- Printed text: `[On Play] [When Digivolving] 1 of your opponent's Digimon gets -4000 DP until their turn ends. Then, by returning 1 card in your trash to the bottom of the deck, delete 1 of your opponent's 5000 DP or lower Digimon.` `[Your Turn] [Once Per Turn] When your effects add to decks, 1 of your Digimon may get +3000 DP until your opponent's turn ends and attack.` The inherited text is `[All Turns] [Once Per Turn] When your effects add to decks, this Digimon with [Chronomon] in its text may unsuspend.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-015`; it reports Q6970–Q6975 and no erratum or restriction. Q6970 defines `[Chronomon] in its text` across name, traits, effects, inherited effects, rules, and requirements; Q6971 confirms that 0-DP deletion waits until all activated effects finish; Q6972 makes the buffed Digimon's attack mandatory when possible; Q6973 excludes a revealed card merely restored to the deck; Q6974 includes effects that remove then add deck cards; and Q6975 includes adding cards to the opponent's deck with one of your effects.
- Comprehensive Rules evidence: §15-7-1–5 defines `by returning` as optional processing and permits paying it even when the following deletion has no legal target; §15-8-3-1–9 defines trigger timing, once-per-turn trigger processing, and state references; §15-9-1–2 and §15-9-2–2 distinguish mandatory attack/debuff processing from optional clauses; §15-16-2–3, §15-16-5, §15-16-8–9 define On Play, When Digivolving, Your Turn, and All Turns timing; and the glossary defines independent once-per-turn budgets.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-015.ts` is a complete IR module. The shared `onPlayBody` is registered for both `OnPlay` and `WhenDigivolving`: it applies -4000 DP to exactly one opponent Digimon until the opponent's turn ends, optionally returns exactly one card from the controller's trash to deck bottom, and gates the following deletion on the return action having acted, targeting exactly one opponent Digimon at the inclusive 5000-DP boundary.
- The `[Your Turn] [Once Per Turn]` watcher uses `whenEffectAddsToDeck`; the interpreter's dedicated gate credits the effect controller, so it reacts to cards added to either player's deck while excluding deck reveal/restoration. Its body optionally binds one own Digimon, gives it +3000 DP until the opponent's turn ends, and force-attacks it with the mandatory attack action.
- The inherited `[All Turns] [Once Per Turn]` watcher uses the same deck-add event, gates the live host's top card with `selfTopHasText` for `[Chronomon]` per Q6970, and optionally unsuspends only the host permanent. Registration is exclusively `registerIrCard("BT26-015", compiled)`; no `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-001 and BT26-060 for deck-add watchers and Chronomon text matching; BT26-009 for genuine draw-then-deck-bottom event sequencing; BT26-014/BT26-016 for adjacent TS evolution and return-cost conventions; and shared subtrigger, return-to-deck, DP-duration, deletion, attack, once-per-turn, and `selfTopHasText` primitives. Their controller, zone, timing, optionality, and stack-source behavior is consistent with Butenmon.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-015.test.ts` suite has 10 passing tests proving:

- complete IR coverage, empty residuals, both printed timing windows, and the alternate TS Lv.4/cost-3 evolution requirement;
- legal alternate evolution over a TS Lv.4, rejection of a non-TS peer, and correct memory payment/stack transition;
- the On Play/When Digivolving debuff, exact trash-to-deck-bottom processing, deletion only after the return, and the inclusive post-debuff 5000-DP target boundary;
- optional refusal of the return condition while retaining the mandatory -4000 DP clause;
- Q6971's deferred zero-DP rule check after the complete effect resolves;
- Q6972/Q6975's real reaction to an effect adding an opponent's Digimon to the opponent's deck, including +3000 DP and the forced attack;
- Q6974's real draw-then-return-to-deck sequence and Q6973's non-triggering deck restoration path;
- optional refusal of the deck-add buff; and
- inherited unsuspend only for a Chronomon-text host, exclusion of a nonmatching host, and the once-per-turn limit on a real evolution stack.

The focused and affected regression suites resolve the full effect stack and assert observable zones, DP, suspension, attacks, memory, stack transitions, target boundaries, controller attribution, and pending decisions. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-015
  PASS (Q6970–Q6975; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-015.test.ts
  PASS (1 file, 10 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-015.test.ts src/cards/BT26/BT26-001.test.ts src/cards/BT26/BT26-060.test.ts src/engine/subTriggerSeams.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts
  PASS (6 files, 368 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-015.ts apps/api/src/cards/BT26/BT26-015.test.ts
  PASS
git diff --check
  PASS
```

No card implementation or test change was necessary. Only this BT26-015 ledger section was added for review; no commit or push was made.

## BT26-016 — Chronomon: Holy Mode — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-016` (`Chronomon: Holy Mode`), a red/yellow level 6 Mega Digimon with 12000 DP, Vaccine attribute, and `Shaman`/`Iliad`/`TS` traits. Its normal evolution requirements are red or yellow Lv.5 for 4; its alternate requirement is `[Digivolve] Lv.5 w/[TS] trait: Cost 3`.
- Printed text: `＜Piercing＞`, `＜Engage＞`; `[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may delete 1 of your opponent's Digimon with as much DP as this Digimon or less. Then, by returning 3 cards in trashes to the bottom of the deck, ＜Recovery +1＞`; and `[All Turns] [Once Per Turn] When this Digimon would leave the battle area, by returning your top security card to the bottom of the deck, it doesn't leave.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-016`; it reports Q6976–Q6981 and no erratum, restriction, or unresolved card-text ambiguity. Q6976 requires all three trash cards for the `by` condition; Q6977 confirms that a deleted card returned during the effect cannot activate its pending On Deletion effect; Q6978 permits any combination of both players' trashes; Q6979 gives both selection and ordering to the activating player; Q6980 counts a Digi-Egg returned to the Digi-Egg deck; and Q6981 says the top security card returned by the replacement cannot be looked at.
- Comprehensive Rules evidence: §15-7-1–5 defines optional processing conditions, all-or-nothing `by` payment, and payment even when the following processing cannot be performed; §15-8-3-7–9 defines trigger-time references and trigger activation; §15-16-2–3 and §16-6 define On Play/When Digivolving/When Attacking and Recovery; §3-1-3-3–5, §3-2-2–3, and §3-7-2–3 define simultaneous bottom-deck ordering and private face-down deck/security state; and §16-13/§16-14 define Piercing and Engage.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-016.ts` is a complete IR module. The three discrete timing entries share `BT26-016/delete-recover`, so the printed Once Per Turn limit is one budget across On Play, When Digivolving, and When Attacking. Each targets exactly one opposing Digimon with live DP `lte` the source's current DP, then exposes an optional recovery clause whose mandatory payment returns exactly three cards from the union of both players' trashes to their owners' deck bottoms, with controller-selected ordering, before `Recovery +1` adds one card from the source owner's deck.
- The All Turns replacement is a once-per-turn `wouldLeavePlay` prevention anchored by `isSelfRef`; its cost targets only the source controller's top security card and returns it to that card's owner's deck bottom. The standard security/deck primitives keep the move face-down and do not expose card information. The module publishes Piercing and Engage and has `coverage: "full"` with an empty residual list.
- Registration is exclusively `registerIrCard("BT26-016", compiled)`; there is no `registerCard` registration for this card. Shared primitive tracing covered live relative-DP matching, all-or-nothing loose-card return costs, mixed-seat `orFilters`, controller-owned ordering, Digi-Egg routing, Recovery, leave-prevention costs, once-per-turn ledgers, and keyword consumers.
- Relevant peers inspected: BT26-015 for Chronomon/TS adjacent DP and deck-return behavior; BT26-017 for TS/Shambala alternate-evolution and keyword conventions; BT26-001 and BT26-060 for Chronomon text and deck-add interactions; BT15-009/BT19-014 for relative-to-source DP boundaries; and shared `security.ts`, `costs.ts`, `loose.ts`, `permanent.ts`, `replacement.ts`, `leavePrevention.ts`, and conformance suites. Their target, controller, zone, ordering, visibility, and replacement semantics are consistent with Chronomon: Holy Mode.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-016.test.ts` suite has 15 passing tests proving:

- alternate evolution from a legal Lv.5 `[TS]` Digimon for exactly 3 memory and rejection of a non-TS base;
- the three shared once-per-turn trigger windows, full IR shape, and the All Turns leave replacement;
- deletion of an opposing Digimon at the inclusive 12000-DP boundary while leaving a 13000-DP Digimon;
- the same delete/recovery body resolving positively from both the When Digivolving and When Attacking windows;
- exact three-card recovery from a mixed own/opponent trash pool, activating-player selection, ordering, owner deck destinations, and Recovery +1;
- Q6977's source-continuation behavior, where a deleted Digimon is returned before its pending On Deletion effect can activate;
- Q6976's rejection of partial two-card payment without moving cards or recovering;
- independent optional refusal of the deletion and recovery clauses;
- the shared budget preventing a second use through When Attacking after On Play;
- Q6980's Digi-Egg routing to the owner's Digi-Egg deck while counting toward the three-card payment;
- printed Piercing and Engage through real deletion/battle and end-of-turn attack flows;
- optional refusal of the leave replacement; and
- Q6981's top-security replacement, which moves the exact top card face-down without a selection/look decision and is limited to one use per turn.

The focused and regression suites resolve the full effect stack and assert observable zones, owners, ordering decisions, DP boundaries, source/controller attribution, pending deletion triggers, security privacy, evolution transitions, attack behavior, and once-per-turn state. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-016
  PASS (Q6976–Q6981; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-016.test.ts
  PASS (1 file, 15 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-016.test.ts src/cards/BT26/BT26-015.test.ts src/cards/BT26/BT26-017.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch15-01-effect-basics.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts
  PASS (9 files, 386 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-016.ts apps/api/src/cards/BT26/BT26-016.test.ts
  PASS
git diff --check
  PASS
```

No card implementation change was necessary. Two focused tests were added to prove the positive When Digivolving and When Attacking paths. Only this BT26-016 ledger section and its focused test additions are left uncommitted for review; no commit or push was made.

## BT26-017 — Zanbamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-017` (`Zanbamon`), a red/purple level 6 Mega Digimon with 12000 DP, Virus attribute, and `Wizard`/`Shambala`/`TB`/`TS` traits. Its normal evolution requirements are red or purple Lv.5 for 4; its alternate requirement is `[Digivolve] Lv.5 w/[Shambala]/[TS] trait: Cost 3`. Its Assembly requirement is `[Assembly -4] 2 Lv.5 or lower [Shambala] trait cards w/different levels`. The printed effects are `＜Blocker＞`, `＜Retaliation＞`; `[On Play] [When Digivolving] 1 of your Digimon with the [Shambala] trait gains ＜Security A. +1＞ and ＜Progress＞ for the turn`; and `[On Deletion] You may play 1 [Shambala] or [TS] trait card with a play cost of 5 or less from your trash without paying the cost.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-017`; it reports Q6982 and no erratum, restriction, or unresolved card-text ambiguity. Q6982 confirms that multiple effects triggered by this card's deletion activate simultaneously and the player may choose their activation order.
- Comprehensive Rules evidence: §7-3 defines Assembly's exact trash-material, level, distinct-level, and cost-reduction requirements; §15-8-3 defines simultaneous trigger activation and player-chosen ordering; §15-16-2–3 defines On Play and When Digivolving timing; §15-16-7 defines On Deletion timing; and §16-7/§16-13 define Retaliation and Blocker behavior.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-017.ts` is a complete IR module. Its Static effect publishes Blocker and Retaliation. The On Play and When Digivolving effects each select exactly one own Digimon with the Shambala trait, then grant SecurityAttack +1 and Progress with `forTheTurn` duration. The On Deletion effect is optional and selects exactly one own Digimon or Tamer card from the trash with either the Shambala or TS trait and printed play cost at most 5, then plays it without paying the cost. The target includes Tamer cards, as required by the printed “trait card” wording, and the inclusive cost boundary is enforced by `playCostLte: 5`.
- Alternate evolution and Assembly requirements are supplied by the shared catalog/effect data: Lv.5 Shambala/TS at cost 3, and two Lv.5-or-lower Shambala cards with different levels for a flat 4-cost reduction. The shared Assembly validator enforces trash-only materials, exact count, level ceiling, trait, and different-level constraints.
- Registration is exclusively `registerIrCard("BT26-017", compiled)`; no `registerCard` registration exists for this card. `coverage` is `full` and `residual` is empty.
- Relevant peers inspected: BT26-012 for trait-card play including Tamers; BT26-014 for the adjacent Shambala On Deletion play path and inherited-deletion interaction; BT26-016 for adjacent TS evolution; BT26-018/BT26-021 for TS and Zanbamon interactions; and shared Assembly, filtered PlayWithoutCost, loose-card matching, temporary keyword, and deletion-trigger primitives. Their controller, zone, target, duration, and stack semantics are consistent with Zanbamon.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-017.test.ts` suite has 12 passing tests proving:

- complete IR coverage, empty residuals, Static keywords, both printed trigger paths, and both alternate evolution/Assembly requirements;
- legal Assembly with two different-level Shambala materials and rejection of equal-level materials;
- SecurityAttack +1 and Progress granted to exactly one own Shambala Digimon on play, with both temporary keywords expiring at turn end;
- the same temporary grants when digivolving through a legal Shambala stack, plus alternate evolution over a TS Lv.5 and rejection of a non-trait peer;
- real Blocker and Retaliation behavior through security protection and battle deletion;
- On Deletion play of a Shambala card from the own trash, acceptance of the TS-only branch, rejection of a non-trait card, and optional refusal without moving a candidate;
- the inclusive play-cost-5 boundary and card-kind coverage by playing own `[Shambala]/[TS]` Tamer BT26-104 while leaving an identical opponent-trash card untouched; and
- Q6982's simultaneous top-card and inherited On Deletion triggers exposing two distinct activation-order choices.

The focused and affected regression suites resolve the full effect stack and assert observable battle-area/trash zones, controller ownership, temporary keyword duration, target boundaries, evolution transitions, Assembly memory/material behavior, keyword combat behavior, and pending trigger-order decisions. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-017
  PASS (Q6982; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-017.test.ts
  PASS (1 file, 12 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-017.test.ts src/cards/BT26/BT26-014.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (6 files, 371 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-017.ts apps/api/src/cards/BT26/BT26-017.test.ts
  PASS
git diff --check
  PASS
```

No card implementation change was necessary. One focused test was added to prove the inclusive cost-5 Tamer branch and own-trash controller boundary. Only this BT26-017 ledger section and its focused test addition are left uncommitted for review; no commit or push was made.

## BT26-018 — Sangomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-018` (`Sangomon`), a blue level 3 Rookie Digimon with 1000 DP, Data attribute, and `Mollusk`/`DS` traits. Its normal evolution requirement is blue Lv.2 for 0; its alternate requirement is `[Digivolve] Lv.2 w/[DS] trait: Cost 0`. The printed effects are `[When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with [Aqua] or [Sea Animal] in any of its traits or 1 card with the [DS] trait among them to the hand. Return the rest to the bottom of the deck. Then, trash the bottom digivolution card of 1 of your opponent's Digimon`; `[Rule] Trait: Has [Aquatic] Type`; and inherited `＜Jamming＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-018`; it reports no knowledge-base entries, errata, restrictions, or unresolved card-specific rulings. The applicable comprehensive/manual rules cover exact effect ordering, mandatory processing, private deck state and bottom-deck ordering, On Play/When Moving timing, inherited effects, and bottom digivolution-card processing.
- Comprehensive Rules evidence: §15-1-2/§15-1-4/§15-1-5 establish printed processing order and mandatory processing; §15-3-1/§15-3-2 establish inherited-effect activation by a host Digimon; §15-16-2 and the movement timing rules establish On Play and movement triggers; §3-1/§3-2 and the manual's “Returning Revealed Cards to the Deck” ruling establish revealed-card ordering and face-down private deck placement; and the digivolution-stack rules establish the bottom card as the first card in stack order.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-018.ts` is an IR-only module. The shared `revealAndTrash` body is attached to both `OnPlay` and `WhenMoving`, revealing exactly three cards, selecting exactly one from the union of the `[Aqua]`/`[Sea Animal]` substring branches and the `[DS]` exact-trait branch, returning every unselected revealed card to the deck bottom in controller-selected order, then trashing exactly one bottom digivolution card from exactly one opposing Digimon. The `[Aqua]` and `[Sea Animal]` branches use `traitContains`, matching the printed “in any of its traits” semantics and the repository's Aquatic/Aqua precedent; `[DS]` remains exact trait matching.
- The alternate evolution requirement is represented as level 2, `[DS]`, cost 0, alternate. `[Rule] Trait: Has [Aquatic] Type` is represented by a `Rule` `GrantStatic` action, and inherited Jamming is represented as an inherited static keyword. The module declares `coverage: "full"` with an empty residual list.
- Registration is exclusively `registerIrCard("BT26-018", compiled)`; `rg` found no `registerCard("BT26-018"` registration. Relevant peers inspected included BT18-020/BT18-023, BT19-017/BT19-024, EX6-013, EX8-029, and BT26-019/BT26-020, plus the shared RevealAdd, TrashDigivolution, trait-matching, deck, and inherited-keyword seams.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-018.test.ts` suite has 9 passing tests proving:

- the RevealAdd union and the exact/substring distinction for Aqua, Sea Animal, DS, and a non-matching card;
- the printed Rule trait shape and runtime Aquatic trait visibility;
- actual On Play reveal of an Aquatic card through the `[Aqua]` substring branch, bottom-deck return of the two remaining cards, and subsequent trashing of the opponent's bottom stack card;
- actual DS-branch hand addition, remainder ordering, memory payment, and opposing bottom-card trash;
- the shared When Moving body firing only for movement from breeding while processing the follow-up trash clause;
- inherited Jamming applying only when Sangomon is a host's evolution card, with a real losing security battle surviving, while a top-card Sangomon does not gain Jamming;
- the exact alternate Lv.2 DS evolution path at cost 0 and rejection of a non-DS base; and
- no self/opponent leakage in trait or target handling.

The focused and regression suites resolve the full effect stack and assert observable hand/deck/trash/stack state, controller ownership, bottom-card boundaries, evolution transitions, keyword inheritance, and public trait matching. No unresolved card-text ambiguity remains.

### Verification

```text
node tools/kb/query.mjs card BT26-018
  PASS (no knowledge-base entries; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-018.test.ts
  PASS (1 file, 9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-018.test.ts src/cards/BT18/BT18-023.test.ts src/cards/BT19/BT19-024.test.ts
  PASS (3 files, 18 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch02-card-information.test.ts
  PASS (3 files, 343 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-018.ts apps/api/src/cards/BT26/BT26-018.test.ts
  PASS
git diff --check
  PASS
```

The card implementation and focused tests were adjusted to correct the Aqua/Sea Animal substring matching and to encode the printed Rule line as a Rule effect. Only this BT26-018 section and its focused proof additions are left uncommitted for review; no commit or push was made.

## BT26-019 — Mailmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-019` (`Mailmon`), a blue level 3 Digimon with 4000 DP, Social attribute, and `Mail (App Name)`/`Seven Code` traits. Its normal evolution requirement is blue Lv.2 for 0; its alternate requirement is `[Digivolve] Lv.2 w/[Appmon] trait: Cost 0`; and its Link requirement is `[Link] [Appmon] trait: Cost 3`. The printed effects are `＜Detach ([Seven Code] trait)＞`; `[When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞`; and `[When Linking] 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-019`; it reports no card-specific entries, errata, restrictions, or unresolved rulings.
- Comprehensive Rules evidence: §4-24-1 defines `Digimon/Tamers` as choosing one opposing Digimon or Tamer; §11-2-1 and §11-2-5 establish that an attack declaration suspends the attacker and cannot be made by a Digimon that can't suspend; §16-46-1–3 defines Detach as an optional link-card trash that prevents a non-owner-effect leave; and §15-14/§15-16 cover the hand-boundary condition, When Attacking, and When Linking timing.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-019.ts` is IR-only and registers exactly once with `registerIrCard("BT26-019", compiled)`; no `registerCard` registration exists. The module publishes Detach, the non-inherited When Attacking Draw 1 with an inclusive hand-count condition (`lte: 7`), and the linked When Linking restriction targeting exactly one opposing Digimon or Tamer until the opponent's turn ends. Catalog-backed evolution and Link requirements are exposed through the shared card-definition readers.
- The known regression was caused by the shared restriction interpreter normalizing every IR `restriction: "suspend"` to `beSuspended`, which only blocks effect-driven suspension. The new explicit `blocksCombatSuspend` IR option is enabled only by BT26-019: the action records both canonical `beSuspended` and combat-facing `suspend`, so it blocks effect suspension and normal attack declarations while still allowing an effect-driven attack that explicitly does not suspend. Existing cards using the legacy token retain their prior behavior.
- Relevant peers and seams inspected: BT26-010/BT26-051/BT26-084 for Appmon and Seven Code Link/Detach timing; BT26-037/BT26-063/BT26-086 for linked-card sub-trigger identity; BT20-024 and EX9-019 for the legacy suspend restriction token; and the shared Link, sub-trigger, restriction, combat-legality, Detach, target, duration, and evolution-stack primitives.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-019.test.ts` suite has 11 passing tests proving:

- the exact Lv.2 Appmon alternate evolution path at cost 0 and rejection of a same-level non-Appmon near-match;
- Draw 1 at the inclusive seven-card boundary, no draw above seven, and safe empty-deck behavior;
- the exact Appmon Link target and cost-3 payment, rejection of a non-Appmon host, and rejection when memory is insufficient;
- When Linking selection of exactly one opposing Digimon or Tamer, exclusion of own permanents and Options, the simultaneous `suspend` and `beSuspended` restrictions, and expiration only at the opponent's turn end;
- the host's simultaneous When Linking window, no retrigger from a previously linked Mailmon when another card links later, and Detach eligibility restricted to linked Seven Code cards; and
- actual Detach battle survival by trashing the specified link card while the host remains in play.

### Verification

```text
node tools/kb/query.mjs card BT26-019
  PASS (no knowledge-base entries; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-019.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-019.test.ts src/cards/BT20/BT20-024.test.ts src/cards/EX9/EX9-019.test.ts src/cards/BT26/BT26-051.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/combat/legality.test.ts
  PASS (7 files, 369 tests)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-019.ts apps/api/src/cards/BT26/BT26-019.test.ts apps/api/src/engine/effects/interpreter/actions/restrictions.ts packages/shared/src/effects/ir/actions/restrictions.ts
  PASS
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
git diff --check
  PASS
```

A broader exploratory command over 10 files and 400 tests also reproduced three unrelated pre-existing failures in `BT26-031.test.ts`, `BT26-084.test.ts`, and `BT26-086.test.ts`; none of those cards/tests is touched by this audit, and the directly affected BT26-019, suspend-normalization peers, Link, interpreter, primitive, and combat-legality suites pass. This card's implementation and focused proof were adjusted for the real suspend-regression cause. Only this BT26-019 section and its minimal shared-seam/card/test changes are left uncommitted for review; no commit or push was made.

## BT26-020 — ShellNumemon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-020` (`ShellNumemon`), a blue level 4 Champion Digimon with 4000 DP, Virus attribute, and `Crustacean`/`DS` traits. Its normal evolution requirement is blue Lv.3 for 2; its alternate requirement is `[Digivolve] Lv.3 w/[DS] trait: Cost 2`. The printed effects are `[On Play] ＜Draw 1＞ Then, 1 of your opponent's Digimon can't attack or block until their turn ends.` Its inherited effect is `＜Evade＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-020`; it reports no card-specific knowledge-base entries, errata, restrictions, or unresolved rulings.
- Comprehensive Rules evidence: §15-1-2/§15-1-4 establish mandatory printed processing order and `Then` sequencing; §15-11-1-1/§15-11-1-3 define individual target selection and persistence after selection; §15-16-2 defines On Play timing; §15-3-1/§15-3-2 define inherited effects and their Digimon-effect identity; §16-8 defines Draw 1; and §16-22-1–3 defines Evade as an optional suspend that prevents deletion. The manual's target-choice and turn-end examples also confirm that an individually chosen Digimon remains restricted even if its later state changes, and that `until their turn ends` lasts through the affected opponent's turn.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-020.ts` is an IR-only module. Its On Play effect executes `Draw` for one card under the source controller, then resolves one opposing Digimon target and applies `attackOrBlock` until `untilOpponentTurnEnd`. The interpreter expands `attackOrBlock` to both `attack` and `block` restrictions on the same selected permanent; the target filter's `controller: "opponent"` and `kind: ["Digimon"]` exclude own permanents, Tamers, Options, and non-battle-area cards unless explicitly included by text.
- The inherited effect is represented by a `Static` effect with `isInherited: true` and the `Evade` keyword marker. The compiled-card runtime grants this inherited keyword to the host Digimon only while the card is in its evolution stack; a top-card ShellNumemon does not receive its own inherited effect as a host.
- The alternate evolution requirement is supplied by the shared generated override as level 3, exact `DS` trait, cost 2, alternate. Registration is exclusively `registerIrCard("BT26-020", compiled)`; no `registerCard` registration exists for this card. `coverage` is `full` and `residual` is empty.
- Relevant peers and seams inspected: BT26-018 for the adjacent DS trait/evolution path; BT19-018, BT24-050, and EX3-020 for printed and inherited Evade handling; BT19-077 and the engine's attack-or-block targeting examples for the same restriction vocabulary; shared target resolution, restriction, duration, draw, inherited-keyword, combat-legality, and deletion/Evade primitives. Their controller, zone, target, timing, duration, and evolution-stack semantics are consistent with ShellNumemon.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-020.test.ts` suite has 6 passing tests proving:

- complete IR coverage, empty residuals, Draw followed by same-target `attackOrBlock`, and inherited Evade metadata;
- mandatory Draw 1 with a populated deck, selection of exactly one among two opposing Digimon, and no leakage to the unselected target;
- the selected Digimon being unable to declare an attack and unable to block, while the restriction remains through the owner's turn end and expires at the affected opponent's turn end;
- the `Then` restriction still applying when Draw 1 has no card to draw;
- the exact level-3 DS alternate evolution at cost 2, rejection of a same-level non-DS near-match, memory payment, and stack transition; and
- inherited Evade applying only to a host containing ShellNumemon in its evolution stack, then actually suspending that host and preventing effect deletion through the `respondEvade` decision.

The focused and regression suites resolve the full effect stack and assert observable hand/deck, target restrictions, attack legality, block legality, turn-end duration, evolution stack, keyword inheritance, suspension, and deletion state. No unresolved card-text ambiguity remains. No code or test changes were necessary for this audit.

### Verification

```text
node tools/kb/query.mjs card BT26-020
  PASS (no knowledge-base entries; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-020.test.ts
  PASS (1 file, 6 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-020.test.ts src/cards/BT26/BT26-018.test.ts src/cards/BT26/BT26-071.test.ts src/cards/BT19/BT19-018.test.ts src/cards/BT24/BT24-050.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch15-03-targeting-and-selection.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts src/engine/combat/legality.test.ts
  PASS (10 files, 420 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-020.ts apps/api/src/cards/BT26/BT26-020.test.ts
  PASS
git diff --check
  PASS
```

Only this BT26-020 ledger section is left uncommitted for review; no code/test change, commit, or push was made.

## BT26-021 — Gekomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-021` (`Gekomon`), a blue/purple level 4 Champion Digimon with 4000 DP, Virus attribute, and `Amphibian`/`Titan`/`TS` traits. Its normal evolution requirements are blue or purple Lv.3 for 3; its alternate requirement is `[Digivolve] Lv.3 w/[TS] trait: Cost 2`. The printed effects are `[On Play] [When Digivolving] 1 of your [TS] trait Digimon's attack target can't change for the turn`; `[Main] [Once Per Turn] You may play 1 [TS] trait Tamer card from your trash with the cost reduced by 2`; and inherited `[All Turns] [Once Per Turn] When a Digimon attacks, by trashing 1 card in your hand, trash the bottom 2 digivolution cards of 1 of your opponent's Digimon.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-021`; it reports Q6983 and Q6984, with no erratum, restriction, or unresolved card-text ambiguity. Q6983 confirms that two simultaneous Gekomon Main effects cannot be activated to combine reductions; Q6984 confirms that the Main effect may activate under a `Players can't reduce play costs` effect, but the reduction is not applied.
- Comprehensive Rules evidence: §11-2-7-1–5 defines attack-target choice and switching, including the rule that a target switch can be prevented; §15-3-1–2 defines inherited effects as effects gained by the host Digimon; §15-7-1–5 defines optional processing conditions and their costs; §15-8-3-7–9 defines trigger-time references and processing conditions; §15-16-2–3, §15-16-5, and §15-16-7 define On Play, When Digivolving, When Attacking, and Main timing; and the glossary's Once Per Turn rule establishes independent budgets for separate Gekomon copies and one budget per effect source.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-021.ts` is an IR-only module. Its On Play and When Digivolving actions select exactly one own Digimon with the exact `TS` trait and apply `attackTargetChange` through the current turn's end. Its Main effect is Once Per Turn, optional, selects exactly one own `TS` Tamer from the trash, plays it from the trash while paying its cost with a reduction of 2, and leaves the reduction subject to global play-cost blockers. Its inherited All Turns watcher fires on any Digimon attack, once per turn, pays by trashing exactly one card from its controller's hand, and trashes the bottom two sources from exactly one opposing Digimon.
- The compiled alternate evolution requirement is level 3, exact `TS` trait, cost 2, alternate; normal blue/purple Lv.3 cost-3 requirements remain supplied by the catalog definition. `coverage` is `full` and `residual` is empty. Registration is exclusively `registerIrCard("BT26-021", compiled)`; no `registerCard` registration exists for this card.
- Relevant peers inspected: BT26-018/BT26-020/BT26-022 for adjacent DS/TS evolution, target, and inherited-keyword conventions; BT26-017 and BT26-078 for TS/Titan stack interactions; BT17-020 and BT19-053 for reduced-cost filtered play; BT14-023 and BT15-030 for bottom-source trash; and the shared restriction, attack legality, filtered PlayWithoutCost, cost-reduction, SubTrigger/Once Per Turn, and TrashDigivolution seams. Their controller, target, duration, zone, stack-order, and inherited-source semantics are consistent with Gekomon.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-021.test.ts` suite has 9 passing tests proving:

- complete IR shape, exact alternate Lv.3 TS evolution at cost 2, legal stack transition, and rejection of a same-level non-TS base;
- On Play selection of exactly one own TS Digimon, exclusion of a non-TS own Digimon and all opponent Digimon, attack-target-change restriction during the turn, and expiration at turn end;
- Main selection/play of an own TS Tamer from trash at the inclusive reduced cost, with Q6983's two-copy no-combination behavior;
- Q6984's activation under ST12-03 Solarmon, where the Tamer is still played but the full printed cost is paid;
- optional refusal of the Main play without moving the Tamer or paying memory;
- an inherited real evolution-stack watcher firing on an opponent's attack, paying one hand card, trashing exactly the bottom two opposing sources, and not firing again on a second attack in the same turn; and
- the inherited cost-decline boundary, which leaves the once-per-turn budget available rather than consuming it.

The focused and regression suites resolve the full effect stack and assert observable battle-area, hand, trash, memory, attack legality, restriction duration, controller ownership, evolution-stack transition, bottom-source order, and Once Per Turn state. No unresolved card-text ambiguity remains. No code or test changes were necessary for this audit.

### Verification

```text
node tools/kb/query.mjs card BT26-021
  PASS (Q6983–Q6984; no erratum/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-021.test.ts
  PASS (1 file, 9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-021.test.ts src/cards/BT26/BT26-020.test.ts src/cards/BT26/BT26-022.test.ts src/cards/BT26/BT26-056.test.ts src/cards/BT26/BT26-078.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts src/engine/combat/legality.test.ts
  PASS (9 files, 413 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-021.ts apps/api/src/cards/BT26/BT26-021.test.ts
  PASS
git diff --check
  PASS
```

Only this BT26-021 ledger section is left uncommitted for review; no code/test change, commit, or push was made.

## BT26-022 — Sorcermon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-022` (`Sorcermon`), a blue/yellow level 4 Champion Digimon with 4000 DP, Vaccine attribute, and `Wizard`/`Witchelny`/`Iliad`/`TS` traits. It has normal blue Lv.3 and yellow Lv.3 evolution requirements, each cost 3; its alternate requirement is `[Digivolve] Lv.3 w/[TS] trait: Cost 2`. The printed effects are `[On Play] [When Digivolving] Add your top security card to the hand and ＜Recovery +1＞`, then `[End of Your Turn] If you have a red or purple Digimon, by placing this Digimon as the bottom security card, you may play 1 blue or red [Iliad] trait Digimon card from your hand with the cost reduced by 4.` The inherited effect is `＜Barrier＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-022`; it reports Q6985 (2026-08-18): with 0 security cards, the recovery effect may still activate and perform Recovery +1 without adding a card to hand. No errata, restrictions, or additional unresolved card-specific rulings were returned.
- Comprehensive Rules evidence: §2-3-5-3 includes text after `[Digivolve]` in the requirement; §3-4-7-5 excludes breeding-area cards from effect selection unless explicitly specified; §8-1-3-1/3 describes requirement choice, stacking, memory payment, and draw; §15-1-2 requires printed processing order; §15-4-1-2 carries a resolving effect through its source becoming a new card or leaving play; §15-16-2/3 covers On Play and When Digivolving timing; §15-16-12-1 covers End of Your Turn; §16-6-1/2 defines Recovery as placing deck cards face-down on top of security; and §16-25-1/3 limits Barrier to optional prevention of battle deletion by trashing top security.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-022.ts` is IR-only and registers exclusively via `registerIrCard("BT26-022", compiled)`. The alternate evolution requirement is exact level 3 + `TS` trait + cost 2; catalog-generated normal requirements remain available through registration. Both On Play and When Digivolving use the ordered `SecurityManipulation(toHand, securityTop)` followed by `SecurityManipulation(addTop, deck)`, preserving Q6985's empty-security behavior and face-down recovery semantics.
- End-of-turn uses a conditional, optional `CostGatedBlock`: the condition requires an own battle-area red or purple Digimon; the cost places this Sorcermon permanently at the bottom of its controller's security; the nested optional `PlayWithoutCost` is restricted to one own hand Digimon that is blue or red and has the `Iliad` trait, pays its play cost with `reduceCostBy: 4`, and leaves the source effect resolving after Sorcermon changes zones. The battle-area zone on the condition is explicit so a breeding-area red/purple Digimon cannot satisfy the printed condition.
- The inherited `Static` keyword marker grants Barrier only through an evolution stack. The shared deletion primitive was corrected so Barrier processing is entered only for `cause === "byBattle"`; effect deletion now proceeds normally, matching §16-25. No `registerCard` registration exists in the BT26-022 module.
- Relevant peers/seams inspected: BT26-021 for TS evolution and bottom-source inherited timing; BT26-033 and BT26-081 for Iliad filter/controller conventions; BT26-020 for Recovery/keyword stack proof; shared security, loose-card targeting, play-cost reduction, CostGatedBlock, condition, registration, and combat Barrier primitives.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-022.test.ts` suite has 13 passing tests proving:

- both printed blue Lv.3 and yellow Lv.3 normal evolution paths in real stacks, the exact alternate Lv.3 TS cost-2 path, and rejection of a non-TS base;
- ordered security-to-hand then face-down deck-top recovery on play and digivolution, including Q6985 with zero security cards;
- the end-of-turn red/purple battle-area condition, exact cost reduction behavior using a cost-7 blue Iliad, blue and red branch acceptance, exclusion of a yellow Iliad/non-trait card from the mixed hand pool, bottom-security source movement, and independent refusal of the nested optional play;
- refusal to activate the end-of-turn clause when the only red Digimon is in breeding; and
- inherited Barrier only under a host, battle deletion prevention with top-security payment, and no Barrier prompt or payment against effect deletion.

### Verification

```text
node tools/kb/query.mjs card BT26-022
  PASS (Q6985; no errata/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-022.test.ts
  PASS (1 file, 13 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-020.test.ts src/cards/BT26/BT26-021.test.ts src/cards/BT26/BT26-022.test.ts src/cards/BT26/BT26-033.test.ts src/cards/BT26/BT26-081.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (7 files; focused card/Barrier regressions green)
pnpm --filter @aegis/api exec vitest run src/engine/mechanic.test.ts
  115/117 PASS, including the adjusted Barrier coverage; 2 unrelated pre-existing failures remain: BT15-020 timeout and BLK-04 missing targeted DigiBurst costs for BT7-040/ST4-13/ST6-13.
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-022.ts apps/api/src/cards/BT26/BT26-022.test.ts apps/api/src/engine/effects/primitives.ts apps/api/src/engine/mechanic.test.ts
  PASS
git diff --check
  PASS
```

The card module, focused proof, Barrier seam correction, and its adjusted shared regression assertions remain uncommitted for review; no commit or push was made.

## BT26-023 — Mojyamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-023` (`Mojyamon`), a blue level 4 Champion Digimon with 4000 DP, Vaccine attribute, and `Rare Animal`/`DM`/`Ver.4` traits. Its normal evolution requirement is blue Lv.3 for cost 2, and its alternate requirement is Lv.3 with the `DM` trait for cost 2. The printed text is `＜Training＞`, `＜Jamming＞`, `[On Play] [When Attacking] By placing 1 card in your hand face down as this Digimon's bottom digivolution card, return 1 of your opponent's level 4 or lower Digimon to the bottom of the deck.` The inherited text is `[When Attacking] If your hand has 7 or fewer cards, ＜Draw 1＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-023` (and `--json`) returns `qa: []`, `banlist: null`, and `errata: null`; there are no card-specific rulings, errata, restrictions, or unresolved local KB entries.
- Comprehensive Rules evidence: §15-7-1–5 defines `By ...` as an optional processing condition and requires the following effect only after the condition succeeds; §15-16-2-1 and §15-16-5-1 define On Play and When Attacking timing; §4-7-3–10 defines fixed stack ordering, bottom-card placement, and face-down visibility; §16-9-1–2 defines Jamming as a persistent battle-deletion safeguard; §16-41-1–3 defines Training as an optional main-phase suspension cost followed by mandatory deck-top placement; §16-8-1–3 makes Draw 1 mandatory once the inherited condition is met.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-023.ts` is IR-only and registers exclusively through `registerIrCard("BT26-023", compiled)`; it contains no `registerCard` registration. The alternate evolution requirement is exact (`level: 3`, `traits: ["DM"]`, `cost: 2`, `isAlternate: true`).
- The static effect publishes both `Training` and `Jamming`. Registration synthesizes Training's activation-type Main effect; the shared keyword/combat machinery makes it available only from the correct source, suspends that Digimon, and places the deck top face down at the bottom of its stack. Jamming is visible on the top card and prevents deletion from a losing Security Digimon battle, but it does not transfer when Mojyamon is under a host because the effect is not inherited.
- Separate On Play and When Attacking effects each carry the same `Return` action. Its target is exactly one opponent-controlled Digimon (`controllerDefault: "opponent"`, `kind: ["Digimon"]`) with `levelComparison: { op: "lte", value: 4 }`, and its destination is `deckBottom`. The `place` cost selects exactly one card from the source owner's hand, places it face down at the bottom of this Digimon's digivolution stack, and gates the return; `optional: true` models the printed `By` condition. The action has no once-per-turn marker, so each eligible On Play/When Attacking trigger may resolve independently.
- The inherited When Attacking action is a separate non-optional `Draw` of exactly one card for the inherited source's controller, gated by the live hand count `zoneCount(hand) <= 7`. It has no frequency marker, matching the absence of Once Per Turn in the catalog text. The shared effect builder scopes inherited effects to the evolution host rather than unrelated permanents.
- Shared seams inspected: `candidatePermanents`/`permanentMatchesFilter` apply controller, Digimon kind, and inclusive live level comparison while excluding breeding targets unless explicitly requested; `canPayCost`/`payCost` and `placeUnder` select hand cards transactionally and preserve bottom ordering plus face-down state; `resolvePermanentTargets` and `returnToDeck` move the selected opponent permanent to the deck bottom; `trainingActivatedEffect` implements the keyword's suspension/deck-top rule; and security combat's Jamming path applies only to battles against Security Digimon. Relevant peers inspected: EX9-017, EX9-034, EX9-059, and EX9-060 for the same DM evolution/Training/hand-placement vocabulary; BT26-018 and BT26-040 for Jamming/Training inherited and top-card behavior; and BT26-015/BT26-022 for neighboring deck-bottom return and evolution conventions.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-023.test.ts` suite has 11 passing tests proving:

- exact normal/alternate evolution metadata, a legal level-3 DM stack transition with cost 2, and rejection of a same-level non-DM base;
- the On Play cost/payment path, including hand-card removal, bottom stack placement, face-down state, and bottom-deck return of an opponent level-4 Digimon;
- the inclusive level-4 boundary and rejection of level 5, Tamer, and breeding-area candidates;
- optional refusal of the `By` processing condition with no hand or board movement;
- independent On Play and When Attacking timing, with the main return effect bound to Mojyamon rather than another ally attacking;
- Training suspension, deck-top placement as a face-down bottom stack card, and the suspended/empty-deck negative boundaries;
- top-card Jamming publication and survival of a losing Security Digimon battle;
- inherited When Attacking Draw 1 at exactly seven cards and suppression at eight cards, exercised from a real evolution stack.

The tests resolve the full effect stack and assert observable hand, deck, trash, battle-area, suspension, face-up/face-down, controller, level, timing, and inherited-source state. No card-specific code or test change was necessary; the existing proof is mutation-sensitive to the evolution requirement, target filter, cost ordering, optionality, Training/Jamming synthesis, and inherited hand boundary.

### Verification

```text
node tools/kb/query.mjs card BT26-023
  PASS (no QA/ruling, errata, or restriction entries)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-023.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-034.test.ts src/cards/EX9/EX9-059.test.ts src/cards/EX9/EX9-060.test.ts src/cards/BT26/BT26-018.test.ts src/cards/BT26/BT26-040.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (7 files, 66 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-023.ts apps/api/src/cards/BT26/BT26-023.test.ts
  PASS
git diff --check
  PASS
```

No unresolved card-text ambiguity remains. No implementation, shared-engine, or test changes were needed, and no commit or push was made, per the audit task instructions. Only this BT26-023 ledger section is left uncommitted for review.

## BT26-024 — Tinkermon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-024` (`Tinkermon`), a yellow level 3 Rookie Digimon with 2000 DP, Virus attribute, and `Fairy`/`WG` traits. It has normal yellow Lv.2 and green Lv.2 evolution requirements, both cost 0, plus `[Digivolve] Lv.2 w/[WG] trait: Cost 0`. The main text is `[Your Turn] When any of your other Digimon with the [Vegetation], [Fairy] or [WG] trait are played, this Digimon may digivolve into a Digimon card with the [Vegetation], [Fairy] or [WG] trait in the hand without paying the cost.` The inherited text is `＜Barrier＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-024 --json`; it returns `qa: []`, `banlist: null`, and `errata: null`. There are no card-specific rulings, errata, restrictions, or unresolved local KB entries.
- Comprehensive Rules evidence: §2-3-5-1/2/3 defines normal and post-`[Digivolve]` requirements; §3-4-7-3 through 3-4-7-8 excludes breeding-area cards from ordinary effect triggers, activation, targeting, and information; §4-7-3/5/7/8/9/10 defines fixed stack order, face-up defaults, inherited information, and face-down visibility; §8-1-3-1/2/3 defines requirement selection, payment, stacking, and the digivolution draw; §15-4-1-2 preserves a resolving effect through source/card transitions; §15-4-2-2/3 covers trigger and pending-activation timing; §15-16-8-1 limits `[Your Turn]` to its owner's turn; and §16-25-1/2/3 defines Barrier as an optional security-trash replacement for battle deletion only.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-024.ts` is IR-only and registers exclusively through `registerIrCard("BT26-024", compiled)`; it contains no `registerCard` call. The alternate requirement is exact (`level: 2`, `traits: ["WG"]`, `cost: 0`, `isAlternate: true`), while catalog-generated normal yellow/green requirements remain available to the standard digivolve path.
- The `[Your Turn]` effect installs a continuous `whenPlayed` SubTrigger. Its source filter is controller `mine`, kind `Digimon`, and an OR union of the exact `Vegetation`, `Fairy`, and `WG` traits, with `excludeSelf: true`; `withSubTriggerTurnScope` carries the owner-turn boundary to the watcher. The target is this Digimon, and the nested optional `Digivolve` selects exactly one own-hand Digimon matching the same trait union, with `payCost: false`. The explicit `controllerDefault: "mine"` on the destination filter is a required correction: without it, loose-card targeting enumerated the opponent's hand as well.
- The inherited `Static` keyword marker publishes Barrier only when Tinkermon is under a host. Shared continuous keyword publication and the corrected Barrier seam restrict prevention to battle deletion; effect deletion proceeds without a Barrier prompt or security payment. No once-per-turn marker is present, matching the printed unlimited trigger frequency.
- Shared seams inspected: `withSubTriggerTurnScope`, `runSubTrigger`/`matchingSubjectPermanentIds`, `candidateLooseInstances`/`seatsForController`, `runDigivolve`/`legalIntoCandidates`, `digivolveFromInstance`, continuous inherited keyword publication, and the battle-only Barrier replacement path. Relevant peers inspected: BT26-027 (same WG/Fairy filter and inherited Barrier), BT26-034 (Vegetation free digivolve), EX9-002 and EX9-042 (own-hand digivolution target conventions), plus the digivolution and Barrier conformance suites.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-024.test.ts` suite has 11 passing tests proving:

- the exact WG alternate requirement and legal/illegal WG-base boundary;
- both printed normal yellow Lv.2 and green Lv.2 evolution routes, with zero memory cost and the real stack transition;
- matching Vegetation/Fairy/WG play triggering the optional free digivolution, while a nonmatching Digimon, an opponent's play, and opponent-turn timing do not trigger it;
- optional refusal with no hand movement or additional memory payment;
- destination ownership, including retention of a matching card in the opponent's hand;
- inherited Barrier publication only under a host, security payment and survival from battle deletion, and no Barrier activation against effect deletion.

The affected regression run passed 8 files and 213 tests: BT26-027, BT26-034, EX9-042, digivolution candidate legality, ch08 digivolution, ch16c deletion/advanced keywords, primitives, and BT26-024. `pnpm typecheck` passed the shared build plus shared/API/web typechecks. `pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-024.ts apps/api/src/cards/BT26/BT26-024.test.ts` and `git diff --check` both passed.

One stale pre-audit assertion incorrectly expected Barrier to prevent effect deletion; it was corrected to the printed battle-only behavior and a separate negative effect-deletion assertion was added. No card-text ambiguity remains. Changes are intentionally uncommitted and unpushed for review.

## BT26-025 — Liollmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-025` (`Liollmon`), a yellow level 3 Rookie Digimon with play cost 3, 1000 DP, Vaccine attribute, and `Holy Beast`/`Glowing Dawn`/`BEATBREAK` traits. Its normal requirement is yellow Lv.2 for cost 0, and its alternate requirement is `[Digivolve] Lv.2 w/[Glowing Dawn] trait: Cost 0`. The printed effect is `[When Moving] [On Play] By placing your top security card face down under any of your [Glowing Dawn] trait Tamers, ＜Recovery +1＞`. The inherited effect is `[When Attacking] [Once Per Turn] You may add your top security card to the hand. Then, if you have 0 security cards, ＜Recovery +1＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-025 --json`; it returns `banlist: null`, `errata: null`, and Q6986 (2026-08-18), confirming that the inherited effect can activate with 0 security cards and perform Recovery +1 without adding a security card to hand.
- Comprehensive Rules evidence: §2-3-5/§8-1-3 covers the alternate requirement, requirement choice, stacking, and digivolution draw; §3-4-7-3/5/8/9/10 and §4-4-2 cover stack order, face-down information, and new cards under an existing Tamer going to the bottom; §15-4-1-2 preserves a resolving effect through source transitions; §15-7-1 through §15-7-5 defines `By` as an optional processing condition and requires the follow-up only after successful payment; §15-16-2-1, §15-16-5-1, and §15-16-16-1 define On Play, When Attacking, and When Moving timing; §16-6-1/2 defines Recovery as face-down deck-top cards placed on security; and the rules glossary's Once Per Turn entry limits the inherited trigger to one activation each turn.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-025.ts` is IR-only and registers exclusively with `registerIrCard("BT26-025", compiled)`; no `registerCard` registration exists for BT26-025. The generated alternate requirement is the exact level-2 `Glowing Dawn` trait requirement with cost 0.
- The first compiled effect is shared by `OnPlay` and `WhenMoving`. Its `SecurityManipulation(addTop, source: "deck")` recovers exactly one face-down deck-top card, gated by a `place` cost that selects exactly one own top security card and places it face-down at the bottom of one own Tamer's stack. The cost's destination host filter requires kind `Tamer`, controller `mine`, and the exact `Glowing Dawn` trait; `position: "bottom"` follows §4-4-2 for existing Tamer stacks. `optional: true` models the printed `By` condition, while payment failure leaves both security and deck unchanged.
- The inherited `WhenAttacking` effect is marked `isInherited: true` and `frequency: "OncePerTurn"`. It first optionally moves exactly one own top security card to hand, then independently executes one deck-top Recovery only when `securityAtMost` is 0. The action sequencing, controller, count, and empty-security behavior match Q6986; no duration, opponent controller, target selection, or security-face-up approximation is present.
- Shared seams inspected: `canPayCost`/`payCost` placement preflight and transactional host resolution; `candidateLooseInstances` security `position: "top"` matching; `placeUnder` bottom-stack ordering and forced face-down digivolution-card state; `runSecurityAdd` deck-top Recovery; inherited-source dispatch; and the once-per-turn activation ledger. Relevant peers inspected: BT26-022 for Q6985's zero-security recovery, BT26-024/BT26-027 for Glowing Dawn/WG evolution stacks, BT26-089/BT26-093 and ST23-15/ST24-15 for face-down cards under trait Tamers, and the shared security/interpreter/primitive/subtrigger suites.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-025.test.ts` suite has 11 passing tests proving:

- exact normal/alternate evolution metadata, legal level-2 Glowing Dawn evolution for 0, and rejection of a near-match base;
- On Play and When Moving activation, top-security payment, exact Glowing Dawn Tamer filtering, face-down placement, Recovery +1 from the deck, and no recovery when no eligible Tamer exists;
- bottom ordering under a Tamer that already has a stacked card, including face-down state;
- Q6986's empty-security inherited path, optional refusal, taking the last security then recovering, no recovery when one security remains, and once-per-turn suppression of a second activation;
- full observable zone transitions, controller ownership, stack order, face state, and inherited-source behavior.

No implementation change was needed. One additional test closes the previously uncovered §4-4-2 bottom-ordering boundary; the existing inherited tests already cover the exact-zero security boundary.

### Verification

```text
node tools/kb/query.mjs card BT26-025 --json
  PASS (Q6986; no errata/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-025.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-025.test.ts src/cards/BT26/BT26-022.test.ts src/cards/BT26/BT26-024.test.ts src/cards/BT26/BT26-027.test.ts src/cards/BT26/BT26-041.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (8 files, 387 tests)
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-025.ts apps/api/src/cards/BT26/BT26-025.test.ts
  PASS
git diff --check
  PASS
```

No unresolved ambiguity or unsupported behavior remains. Changes are intentionally uncommitted and unpushed for review; this audit is limited to BT26-025.

## BT26-026 — Cougarmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-026` (`Cougarmon`), a yellow level 4 Champion Digimon with play cost 4, 4000 DP, Virus attribute, and `Mammal`/`Glowing Dawn`/`BEATBREAK` traits. Its normal requirement is yellow Lv.3 for cost 2, and its printed alternate requirement is `[Digivolve] Lv.3 w/[Glowing Dawn] trait: Cost 2`. The main text is `＜Barrier＞` and `[When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers or your top security card, you may use 1 Option card with the [Glowing Dawn] trait from your hand with the cost reduced by 2.` The inherited text is `＜Barrier＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-026 --json`; it returns `banlist: null`, `errata: null`, and `qa: []`. No card-specific rulings, errata, restrictions, or unresolved local KB entries exist.
- Comprehensive Rules evidence: §2-3-5 and §8-1-3 cover alternate digivolution requirements, selecting a legal requirement, paying memory, stacking, and the digivolution draw; §3-5-3, §3-6-3, and §3-7-2/3 define hand privacy, face-up public trash, and face-down/private ordered security; §4-7-3/5/7/9/10 defines fixed stack order, bottom-card semantics, and face-down information; §15-4-2-2/3 covers triggered and pending effects; §15-7-1/2 defines optional `By` processing and its conditional follow-up; §15-16-5-1 defines `[When Attacking]`; §16-25-1/2/3 limits Barrier to optional top-security payment for battle deletion and makes prevention mandatory after payment.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-026.ts` is compiled IR and registers exactly once with `registerIrCard("BT26-026", compiled)`; it has no `registerCard` call. The compiled alternate requirement is exact (`level: 3`, `traits: ["Glowing Dawn"]`, `cost: 2`, `isAlternate: true`), while the generated normal yellow Lv.3 requirement remains available through the catalog/engine path.
- The top-level `Static` effect publishes Barrier on the top card, and the separate inherited `Static` effect publishes Barrier through an evolution host. The shared Barrier replacement is battle-only; it consumes the controller's top security card only when the Digimon would be deleted in battle, and does not activate for effect deletion.
- The `[When Attacking]` effect is marked `frequency: "OncePerTurn"` and presents a two-way `Modal`: either trash one bottom face-down card from any own Tamer, or trash one own top security card. Both alternatives use `CostGatedBlock` with `optional: true`/`abortOnDecline: true`, then use exactly one own-hand Option whose kind is `Option` and whose exact `Glowing Dawn` trait is matched, paying its normal cost with `reduceCostBy: 2`. `selectionRequired: true` is a required atomicity guard: the cost is not paid when no eligible Option can be used, while the nested use remains optional after the cost choice.
- `trashBottomFaceDownUnderTamer` resolves only the bottom stack card, requires the host's top card to be a Tamer and the bottom card to be face-down, trashes it face-up, and allows the controller to choose among multiple eligible Tamers. `trashSecurityTop` removes exactly the own security top card. Option resolution is server-side, retains the source controller, applies the reduction once, runs the Option's Main effect, and moves the used Option out of hand according to the shared lifecycle.
- Shared seams inspected: modal availability and option selection, `CostGatedBlock` payment/abort flow, `canAttemptUseOptionWithoutCost`, bottom-face-down Tamer cost selection, security-top cost payment, once-per-turn activation ledger, inherited keyword publication, battle-only Barrier replacement, alternate digivolution legality, and source/zone ownership. Relevant peers inspected: BT26-025/BT26-027/BT26-031/BT26-053, plus the shared interpreter, primitive, and deletion conformance suites. The BT26-053 peer already demonstrates the same `selectionRequired` preflight requirement for a cost-gated Option use.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-026.test.ts` suite has 11 passing tests proving:

- exact alternate evolution metadata and a legal Glowing Dawn Lv.3 stack transition versus an invalid near-match;
- both alternate costs, including security-top trash and bottom face-down Tamer-card trash, with the correct resulting zones, face-up trash state, and reduced Option payment;
- exact `Glowing Dawn` Option filtering while retaining a nonmatching Option in hand;
- no cost payment when no eligible Glowing Dawn Option exists;
- optional refusal after paying the selected alternate cost;
- Once Per Turn suppression across repeated activations;
- Barrier publication on the top card and through an inherited evolution source, battle-deletion prevention after security payment, and no Barrier activation for effect deletion.

The card-specific fix is mutation-sensitive: removing `selectionRequired: true` makes the no-eligible-Option test fail because the alternate cost is consumed; restoring the stale effect-deletion cause makes the Barrier battle-boundary test fail.

### Verification

```text
node tools/kb/query.mjs card BT26-026 --json
  PASS (no QA/ruling, errata, or restriction entries)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-026.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-026.test.ts src/cards/BT26/BT26-006.test.ts src/cards/BT26/BT26-022.test.ts src/cards/BT26/BT26-031.test.ts src/cards/BT26/BT26-053.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  7 files passed, 388 tests passed; BT26-031 has 1 unrelated pre-existing failure (line 85 expects `beSuspended=false`, runtime returns `true`), reproduced in the isolated peer run
pnpm typecheck
  PASS (shared build, shared/api/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-026.ts apps/api/src/cards/BT26/BT26-026.test.ts
  PASS
git diff --check
  PASS
```

No card-specific ambiguity or unsupported behavior remains. The BT26-031 peer failure is outside this card's files and unchanged by this audit. Changes are intentionally uncommitted and unpushed for review; this audit is limited to BT26-026.

## BT26-027 — Petermon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-027` (`Petermon`), a yellow/green level 4 Champion Digimon with play cost 4, 5000 DP, Data attribute, and `Fairy`/`WG` traits. Its normal evolution requirements are yellow Lv.3 for cost 2 and green Lv.3 for cost 2; its alternate requirement is `[Digivolve] Lv.3 w/[WG] trait: Cost 2`. The main text is `[On Play] [Start of Opponent's Main Phase] By suspending 1 of your Digimon with the [Vegetation], [Fairy] or [WG] trait, give 1 of your opponent's Digimon ＜Security A. -2＞ until their turn ends.` The inherited text is `＜Barrier＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-027 --json`; it returns `banlist: null`, `errata: null`, and `qa: []`. There are no card-specific rulings, errata, restrictions, or unresolved local KB entries.
- Comprehensive Rules evidence: §§2-3-5 and 8-1-3 cover normal/alternate evolution requirements, requirement selection, payment, stacking, and the evolution draw; §§3-4-7-3/5/8 and 4-3-3/4-7-3/5/7/9/10 cover breeding-area boundaries, stack identity, inherited effects, face state, and visibility; §§15-7-1/2/4/5 define optional `By` processing and allow the payment even when the post-payment target cannot be processed; §§15-8-3-9 and 15-16-2-1/15-16-13-1 define trigger activation and the On Play/start of opponent's main phase windows; §15-4-1-2 preserves a resolving effect through source/card transitions; §16-7-1/2 defines Security Attack modifiers; and §16-25-1/2/3 limits inherited Barrier to the battle-deletion replacement.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-027.ts` is compiled IR and registers exactly once with `registerIrCard("BT26-027", compiled)`; it contains no `registerCard` call. The alternate requirement is exact (`level: 3`, `traits: ["WG"]`, `cost: 2`); the catalog's two normal yellow/green Lv.3 requirements remain handled by the shared normal evolution path.
- The shared `weaken` action is attached to both `OnPlay` and `StartOfOpponentsMainPhase`, with no `WhenDigivolving` or attack trigger. Its activation cost suspends exactly one own unsuspended Digimon whose trait union is `Vegetation`/`Fairy`/`WG`; `controllerDefault: "mine"`, `kind: ["Digimon"]`, and the OR `nameOrTrait` entries enforce ownership, category, and all three exact trait alternatives. The payload targets exactly one opposing Digimon and grants `SecurityAttack -2` for `untilOpponentTurnEnd`. `optional: true` models the optional `By` activation, while the shared cost preflight prevents payment by an already-suspended or absent eligible Digimon.
- The inherited `Static` keyword entry publishes `Barrier` only when Petermon is a digivolution card under a host; the shared keyword/replacement seam keeps it unavailable on a standalone top card and battle-only, matching the printed inherited keyword. No once-per-turn, security, face-state, zone, or controller approximation is present.
- Shared seams inspected: `timingForTrigger`, `runAction` optional/cost sequencing, `canPayCost`/`payCost` suspend targeting, `candidatePermanents`/`permanentMatchesFilter`/`seatsForController`, OR trait matching in `definitionMatches`, continuous duration sweep, inherited keyword publication, Barrier replacement, and normal/alternate digivolution legality. Relevant peers inspected: BT26-024 (same `Fairy`/`WG` family and inherited Barrier), BT26-025/026 (BT26 stack/Barrier and cost conventions), BT26-034 (Vegetation trait), and BT26-028 (Fairy/WG stack interactions), plus interpreter, primitives, and deletion/keyword conformance suites.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-027.test.ts` suite has 6 passing tests proving:

- exact WG alternate evolution metadata, legal level-3 WG stack transition, memory payment, stack source retention, and rejection of a nonmatching base;
- On Play activation, one eligible own Vegetation Digimon as the suspension payment, exclusion of an own non-trait and opponent Vegetation from the payment, exact opposing target selection, −2 Security Attack, and a real attack producing no security check;
- optional refusal without suspension or modifier, and no activation when the only eligible payment Digimon is already suspended;
- the separate start-of-opponent-main-phase window, payment/target behavior, and expiration at that opponent's turn end;
- inherited Barrier publication only while Petermon is under another Digimon and absence of Barrier on a standalone Petermon.

The affected regression run passed 8 files and 391 tests: BT26-027, BT26-024/025/026/034, `interpreter.test.ts`, `primitives.test.ts`, and `ch16c-deletion-and-advanced-keywords.test.ts`. `pnpm typecheck` passed the shared build plus shared/API/web typechecks. `pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-027.ts apps/api/src/cards/BT26/BT26-027.test.ts` and `git diff --check` both passed.

No implementation, shared-engine, or test changes were needed. No card-text ambiguity or unsupported behavior remains. Changes are intentionally uncommitted and unpushed for review; this audit is limited to BT26-027.

## BT26-028 — Medicmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-028` (`Medicmon`), a yellow level-4 Digimon with play cost 5, 5000 DP, `Sup.`/`Appmon` forms, `Life` attribute, and `Medical (App Name)`/`Seven Code` traits. Its normal evolution requirement is yellow Lv.3 for cost 2. The printed requirements and text are `[App Fusion] [Aidmon] & [Supplemon] & [Spamon]: Cost 0`, `[Assembly -2] Lv.3 [Life]/[System]/[Seven Code] trait Digimon card`, `＜Barrier＞`, `＜Detach ([Seven Code] trait)＞`, `[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Life], [System] or [Seven Code] trait from this Digimon's digivolution cards to this Digimon without paying the cost.`, `[Link] [Appmon] trait: Cost 3`, and `[When Linking] Until your opponent's turn ends, 1 of their Digimon can't activate [When Digivolving] effects and gets -3000 DP.` There is no inherited or Security text, and `linkDp` is null.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-028 --json`; it returns no banlist or errata and Q6987–Q6993. Q6987 requires a linked card to carry its own `<Link>` requirement. Q6988–Q6992 define the precise `[When Digivolving]` suppression boundary, including preserving a combined `[When Digivolving] [When Attacking]` effect and not consuming its once-per-turn use when the digivolving timing is suppressed. Q6993 confirms all six ordered pairs of two distinct names from Aidmon/Supplemon/Spamon for App Fusion.
- Comprehensive/manual rules evidence: §4-7-3/§4-7-7/§4-8-1 cover fixed stack order and digivolution-card identity; §4-9-1–§4-9-6 and §10-1-1–§10-1-3 cover Link source, link eligibility, recipient, cost, placement, and linked-card effects; §7-3-1–§7-3-3 covers Assembly's exact trash-card count, Digimon-only play, reduction, and placement order; §8-4-1–§8-4-3 covers the six App Fusion pairings and cost-0 digivolution; §15-16-2-1/§15-16-3-1/§15-16-6-1 define On Play, When Digivolving, and When Linking timing; §16-25-1–§16-25-3 defines battle-only Barrier; and §4-7-9/§4-7-10 preserve face-down stack visibility boundaries. No applicable local ruling, restriction, or erratum remains unresolved.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-028.ts` is IR-only and registers exactly once through `registerIrCard("BT26-028", compiled)`; no `registerCard` call exists. The compiled App Fusion requirement names all three Appmon cards at cost 0, the Link requirement is Appmon trait at cost 3, and the Assembly recipe is exactly one level-3 Digimon with the Life/System/Seven Code trait, reduced by 2.
- The Assembly `kinds: ["Digimon"]` gate is present both in the direct compiled module and the shared `ASSEMBLY_REQUIREMENT_OVERRIDES` entry used by `assemblyRequirementFor`; this keeps the executable play-legality path faithful rather than allowing a non-Digimon card with a matching trait/level shape. Assembly remains trash-only, exact-count, face-up-on-entry stack placement, and pays the printed cost after the -2 reduction through the shared Assembly seam.
- The On Play and When Digivolving actions are optional `Link` actions with `from: ["digivolutionCards"]` and `payCost: false`. Their source filter requires exactly level 3, Digimon kind, any one of the three printed traits, and `hasLinkRequirement: true` (Q6987). The added `hostFilter: { isSelfRef: true }` limits the source to this Medicmon's own evolution stack; without it, the generic digivolution-card enumerator could link a legal card from another one of the controller's stacks. The shared Link primitive makes the selected card face-up/linked, pays no link cost for this effect, and publishes the `whenLinked` event.
- The linked face is a `Static` `isLinked` watcher. Its `whenLinked` SubTrigger is physically scoped by `sourceFilter: { isSelfRef: true }`, binds exactly one opponent-controlled Digimon, then applies `cannotActivateWhenDigivolving` and -3000 DP to that same bound target, both for `untilOpponentTurnEnd`. The restriction seam suppresses only the When Digivolving timing (not When Attacking), and the duration ledgers clear at the opponent's turn end. The standalone static keywords publish Barrier and Detach; shared combat owns the battle-only Barrier/Detach replacement behavior and the Seven Code linked-card filter.
- Relevant peers/seams inspected: BT26-010, BT26-019, BT26-037, BT26-051, BT26-063, and BT26-084 for the same Seven Code Detach and linked-face vocabulary; `actions/link.ts`/`interpreter/actions/link.ts` for stack source, Link eligibility, cost, face state, and event publication; `actions/assembly.ts` and shared Assembly overrides; `interpreter/actions/subTrigger.ts` for linked-source identity; `continuous.ts`/`context.ts` for target restrictions and duration; and the Barrier/Detach combat seams. All registration remains exclusive to `registerIrCard`.

### Behavioral proof

The focused `apps/api/src/cards/BT26/BT26-028.test.ts` suite has 10 passing tests proving:

- all six distinct ordered App Fusion pairs, rejection of duplicate/non-requirement names, exact Assembly recipe including the Digimon-kind gate, keyword publication, On Play/When Digivolving Link windows, and linked-face action structure;
- Assembly from trash with exact level/trait matching, -2 play-cost reduction, final stack placement, and rejection of a near-match;
- legal level-3 Link selection from this Medicmon's own stack, rejection of a level/trait/no-Link near-match, and the mixed-pool boundary proving another own Digimon's stack cannot supply the source;
- optional refusal with no link movement;
- When Digivolving linking after a real evolution-stack transition;
- linked Medicmon's exact opponent Digimon target, simultaneous -3000 DP and When Digivolving suppression, and expiry after the opponent's turn end;
- Q6988/Q6989 behavior: suppression of only the opponent's When Digivolving effect while a combined When Digivolving/When Attacking effect still resolves at attack timing; and
- top-card Barrier/Detach publication.

The focused assertions are mutation-sensitive: removing the `hostFilter` reintroduces cross-stack linking, removing `kinds: ["Digimon"]` weakens the Assembly contract, and removing either linked-face action or its duration fails the corresponding observable assertions. The tests exercise a real evolution stack and full effect settlement.

### Verification

- `node tools/kb/query.mjs card BT26-028 --json`: PASS (Q6987–Q6993; no errata/restriction).
- Focused `pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-028.test.ts`: PASS (1 file, 10 tests).
- Link/Detach/Assembly regression run across BT26-028, BT26-019, BT26-037, BT26-051, BT26-063, BT26-084, `bt26Assembly.test.ts`, `ch10-link.test.ts`, and `detach.test.ts`: 7 files passed, 84 tests passed; 2 unrelated pre-existing failures remain. `ch10-link`/`linkState.test.ts:320` expects a BT25-056 link but gets zero links; BT26-084 Q7127 expects BT26-063 in its PAD linked-card array but the runtime result omits it.
- Shared mechanism run (`primitives.test.ts`, `interpreter.test.ts`, `detach.test.ts`, `subtriggers.test.ts`): PASS (4 files, 348 tests).
- `pnpm typecheck`: PASS (shared build, shared/API/web typecheck).
- Changed-file `pnpm exec oxlint ...`: PASS. Changed-file `pnpm exec oxfmt --check ...`: PASS. `git diff --check`: PASS.
- The prescribed `meteor npm run quave-check-ci` and `meteor npm run quave-check` commands are unavailable because this repository's `package.json` has neither script; equivalent changed-file Oxlint/Oxfmt checks pass.

No unresolved BT26-028 ambiguity or unsupported card clause remains. The two named regression failures reproduce outside BT26-028's focused suite and are unrelated to the three changed files. Changes are intentionally uncommitted and unpushed, per the audit task; this section is limited to BT26-028.

## BT26-029 — Aegiochusmon: Holy — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-029` (`Aegiochusmon: Holy`), a yellow/black level 5 Ultimate Digimon with play cost 8, 8000 DP, Vaccine attribute, and `Shaman`/`Iliad`/`TS` traits. Its normal requirements are yellow Lv.4 for cost 4 and black Lv.4 for cost 4; the alternate requirement is `[Digivolve] [Aegiomon]: Cost 3`. The main text is `＜Decode ([Aegiomon])＞`, `＜Ascension＞`, `[On Play] [When Digivolving] By trashing your top security card, until your opponent's turn ends, their effects can't reduce the DP of 1 of your Digimon, trash any of its stacked cards, or return them to hands or decks.`, `[All Turns] [Once Per Turn] When your security stack is removed from, 3 of your opponent's Digimon get -5000 DP for the turn.`, and `[Rule] Trait: Has [Angel] Type.` The inherited text is `[All Turns] [Once Per Turn] When your security stack is removed from, ＜De-Digivolve 1＞ 1 of your opponent's Digimon.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-029`; it returns Q6994 (2026-08-18), which confirms that `[Security]` effects resolve before other simultaneous security-removal triggers and that the turn player orders the other triggers, and Q6995 (2026-08-18), which confirms that the stacked-card lock covers both cards placed on top (`De-Digivolve`) and cards placed on the bottom (effects trashing digivolution cards). No errata, banlist restriction, or unresolved card-specific ruling is present.
- Comprehensive Rules evidence: §§2-3-5/8-1-3 cover the alternate/normal evolution requirements, cost, stack transition, and evolution draw; §§3-6-3/3-7-2–5 cover public trash, private ordered security, face state, and simultaneous security movement; §§15-7-1–5 define `By ...` as an optional processing condition and require all subsequent protection only after successful payment; §§15-14-1-1–5 define Once Per Turn identity and reset boundaries; §§15-16-2-1/15-16-3-1/15-16-9-1/15-16-10-1–2 define On Play, When Digivolving, All Turns, and Security timing; §§16-36-1–3 define optional Decode on non-battle leave; and §§16-43-1–3 define optional Ascension to the top of security.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-029.ts` is compiled IR and registers exactly once through `registerIrCard("BT26-029", compiled)`; no `registerCard` registration exists. The alternate requirement is exact (`level: 4`, `names: ["Aegiomon"]`, `cost: 3`, `isAlternate: true`), while the catalog's yellow/black normal routes remain handled by the shared evolution path.
- The shared On Play/When Digivolving `CostGatedBlock` models the optional `By` condition, pays exactly one top own-security card, then binds exactly one own Digimon. It installs opponent-effect-only DP immunity and return-to-hand/deck immunity through `untilOpponentTurnEnd`, and installs the reusable stacked-card lock whose consumers cover opponent De-Digivolve and opponent effects returning stacked cards while leaving the controller's own effects usable. Declining or lacking the security cost aborts the gated payload without protection.
- The Static effect publishes Decode and Ascension and installs a `wouldLeavePlay` replacement restricted to this source and `leaveCause: "otherThanBattle"`. Decode plays exactly one matching `[Aegiomon]` Digimon from this card's own evolution stack without cost, preserving source ownership and stack transition; the shared Ascension deletion seam captures the live keyword before deletion and optionally places the same card on top of its controller's security stack. Battle deletion does not invoke Decode.
- The All Turns watcher listens to both generic `whenSecurityRemoved` and effect-specific `whenEffectRemovesFromSecurity` events, gated to this card's controller's security stack. Both watcher variants share one stable once-per-turn identity, so effect-driven removal cannot double-fire the trigger. The main body targets exactly 3 opponent Digimon for -5000 DP until the turn ends. The inherited body is separately marked `isInherited` and `OncePerTurn`, targets exactly 1 opposing Digimon, and performs De-Digivolve 1; inherited source identity is retained through a real evolution stack.
- The Rule Static grant adds the effective `Angel` trait to the top card. Shared `candidatePermanents`/`resolvePermanentTargets`, security-removal seams, `deDigivolve`, `returnToHand`/`returnToDeck`, DP restriction enforcement, duration cleanup, and keyword registration were traced through their consumers. Relevant peers inspected include BT19-024/EX9 Decode implementations, BT26-085's opponent-only stack/DP protection, BT26-089/BT26-103 security-removal watchers, BT24-101 and BT15-084 security-trigger conventions, and the Aegiomon/Aegiochusmon neighboring cards.

### Behavioral proof

The existing `apps/api/src/cards/BT26/BT26-029.test.ts` suite has 10 passing tests proving:

- IR coverage is `full`, residuals are empty, Decode/Ascension markers are present, the security-paid protection has the exact cost/selection/restriction structure, both removal watcher events share the intended once-per-turn key, and the inherited De-Digivolve effect is marked and shaped correctly;
- security-top payment, one selected own Digimon, all three protection classes, and optional refusal without security movement or restrictions;
- Q6995's boundary: opposing DP reduction, De-Digivolve/stack trash, and stacked-card return are blocked, while the controller's own DP reduction and stack trash remain legal;
- exactly 3 opposing Digimon receive -5000 DP once per turn, including a real opponent security check through the non-effect removal window;
- inherited once-per-turn De-Digivolve from a real host stack, exact Aegiomon alternate evolution for cost 3, and retention of the protection after When Digivolving;
- Decode/Ascension publication, Angel effective trait, and Decode playing Aegiomon from the own evolution stack when leaving by effect.

The focused suite exercises a legal evolution-stack transition and the inherited stack source. The existing shared tests cover security ordering/visibility, opponent-only restriction consumers, stack-trash/de-Digivolve/return boundaries, keyword deletion reactions, and duration/once-per-turn machinery. No card-specific implementation or test change was necessary because the committed proof and shared mechanism coverage are sufficient.

### Verification

```text
node tools/kb/query.mjs card BT26-029
  PASS (Q6994, Q6995; no errata/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-029.test.ts
  PASS (1 file, 10 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-029.test.ts src/cards/BT26/BT26-089.test.ts src/cards/BT26/BT26-103.test.ts src/cards/BT24/BT24-101.test.ts src/cards/BT24/BT24-034.test.ts src/cards/BT15/BT15-084.test.ts src/engine/security/securityCheck.test.ts src/engine/effects/restrictionEnforcement.test.ts src/engine/effects/leavePrevent.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (10 files, 123 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-029.ts apps/api/src/cards/BT26/BT26-029.test.ts
  PASS
git diff --check
  PASS
```

No unresolved ambiguity or unsupported BT26-029 clause remains. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-029; no later card section was touched.

## BT26-030 — Pumpkinmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-030` (`Pumpkinmon`), a yellow/purple level 5 Ultimate Digimon with play cost 6, 6000 DP, Data attribute, and `Puppet`/`Iliad`/`TS` traits. Its normal evolution requirements are yellow Lv.4 for cost 4 and purple Lv.4 for cost 4; its alternate requirement is `[Digivolve] Lv.4 w/[TS] trait: Cost 3`. The printed text is `[Security] You may play 1 [Angel] or [TS] trait card with a play cost of 4 or less from your hand or trash without paying the cost.` and `[On Play] [When Digivolving] By trashing 1 card in your hand, 1 of your [Iliad] trait Digimon gains ＜Execute＞ and ＜Ascension＞ for the turn.` There is no inherited text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-030 --json`; it returns Q6996 (2026-08-18), confirming that when this card is checked from security its `[Security]` effect activates before it battles the attacking Digimon. There is no erratum or banlist restriction.
- Comprehensive/manual rules evidence: §§2-3-5 and 8-1-3 cover alternate digivolution requirements, payment, stacking, and the evolution draw; §§3-5-3/3-6-3/3-7-2 cover hand privacy, public face-up trash, and private ordered security; §§13-1-7/13-1-8 and 15-16-10-1/2 cover Security Digimon battle and `[Security]` precedence; §§15-7-1–5 define optional `By` processing and its payment gate; §§15-16-2-1 and 15-16-3-1 define On Play and When Digivolving windows; §§16-38-1–4 and 16-43-1–3 define the granted Execute and Ascension behavior and their optional processing.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-030.ts` is compiled IR and registers exactly once through `registerIrCard("BT26-030", compiled)`; no `registerCard` call exists. The alternate requirement is exact (`level: 4`, `traits: ["TS"]`, `cost: 3`, `isAlternate: true`), while the two normal color requirements remain handled by the shared evolution path.
- The Security effect is an optional `PlayWithoutCost` from `hand` or `trash`, with `payCost: false`, exact `playCostLte: 4`, OR trait matching for `Angel`/`TS`, and `kind: ["Digimon", "Tamer"]`. This is the executable meaning of playing a trait card: Options are used rather than played, while dual Digimon/Option cards remain eligible through their Digimon side. The source/controller is the security card's owner (`mine`), and the Q6996 sequence is preserved by the Security timing and play lifecycle.
- The On Play and When Digivolving actions share the same `CostGatedBlock`: optional hand trash of exactly one own card, abort-on-decline, then binding exactly one own Digimon with the `Iliad` trait and granting both Execute and Ascension for the turn. `GainKeyword` publishes the keywords and `GrantStatic` supplies the named Execute behavior when the selected target is the source itself; the shared custom-effect ledger deduplicates the same token/instance. No once-per-turn, inherited, security-text, controller, target, or zone clause is approximated.
- Shared seams inspected: alternate/normal evolution legality and stack transition; Security timing/precedence and post-effect battle; `candidateLooseInstances`/`PlayWithoutCost` zone and kind filtering; `CostGatedBlock` payment, optional refusal, and abort behavior; OR trait matching; keyword publication and synthesized Execute/Ascension; duration sweep; source identity and owner/controller resolution. Relevant peers inspected: BT26-012/021/022/023/033/048/053/075/094/097/100/101/102 and BT24-019/035, plus `interpreter`, `primitives`, `subtriggers`, security, and advanced-keyword conformance suites.

### Behavioral proof

The existing focused `apps/api/src/cards/BT26/BT26-030.test.ts` suite has 8 passing tests proving:

- exact TS Lv.4 alternate evolution cost 3, legal stack transition, memory payment, and When Digivolving grant;
- Security play from hand/trash without cost, exact cost-4 ceiling, Angel/TS trait filtering, and retention of over-cost/unrelated cards;
- Q6996 ordering: the Security effect resolves before the checked Pumpkinmon battles the attacker;
- On Play hand-trash payment, selection of an Iliad Digimon, both granted keywords, and the full Execute attack/self-delete plus Ascension security transition;
- optional refusal and unavailable-cost negative paths without keyword grants or hand movement.

The focused assertions exercise a real evolution stack and a mixed eligible/ineligible Security pool. Shared mechanism coverage proves the exact hand/trash visibility and ownership boundaries, `By` optionality/cost sequencing, duration cleanup, Security battle sequencing, and Execute/Ascension behavior.

### Verification

```text
node tools/kb/query.mjs card BT26-030 --json
  PASS (Q6996; no errata/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-030.test.ts
  PASS (1 file, 8 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-030.test.ts src/cards/BT26/BT26-023.test.ts src/cards/BT26/BT26-033.test.ts src/cards/BT26/BT26-075.test.ts src/cards/BT26/BT26-097.test.ts src/cards/BT26/BT26-101.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts src/engine/security/securityCheck.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (11 files, 432 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-030.ts apps/api/src/cards/BT26/BT26-030.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-030 ambiguity or unsupported clause remains. No implementation, shared-engine, or test changes were needed. Changes are intentionally uncommitted and unpushed for review; this audit is limited to BT26-030 and does not mark the collection complete.

## BT26-031 — Murasamemon / Gonozan: Murashigure — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-031` (`Murasamemon` / `Gonozan: Murashigure`). This is a yellow/blue DUAL level-5 Ultimate Digimon/Option with play cost 4, 8000 DP, `Beastkin`/`Glowing Dawn`/`BEATBREAK` traits, normal yellow/blue Lv.4 evolution for cost 4, and alternate Lv.4 `[Glowing Dawn]` evolution for cost 3. Its Digimon text is `[When Digivolving] By trashing the top security card of 1 player with the most security cards, 1 of your opponent's Digimon or Tamers can't suspend until their turn ends.` and `[When Digivolving] [When Attacking] [Once Per Turn] By trashing the bottom face-down card from under any of your Tamers, ＜Recovery +1＞`. Its Option text is `＜Use Req. ([GlowingDawn] trait)＞ [Main] 1 of your opponent's Digimon gets -8000 DP until their turn ends. By trashing your top security card, it further gets -5000 DP.`
- Knowledge-base command: `node tools/kb/query.mjs card BT26-031`; it returns Q6997 (a tied largest-security stack is chosen by the activating player), Q6998 (0-DP deletion waits for the rule check after the used Option is trashed or Arts Digivolve completes), and Q6999 (the two When Digivolving effects trigger simultaneously and may be ordered). `data/kb/errata.json` and `data/kb/banlist.json` contain no BT26-031 entry.
- Comprehensive Rules evidence: §§4-6-1–6 define DUAL card mode/category information; §§4-20-1–2 define Arts Digivolve replacing Option trashing; §4-24-1 defines the `Digimon/Tamers` union; §§11-2-1–5 establish that a normal attack declaration suspends the attacker and cannot be made by a Digimon that can't suspend; §§15-7-1–5 define `By ...` as optional processing and allow paying the condition even if later target processing is impossible; §§15-10-2/15-11-1 define exact individual targets; §§16-6-1–2 define Recovery; and §§17-1-2-2/17-1-3-1 define the post-effect DP-0 rule check.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-031.ts` compiles the Digimon When Digivolving clause as `RecoverByTrashingMostSecurity` with `recover: false`, then binds exactly one opponent `Digimon` or `Tamer` and applies the `suspend` restriction until the target's turn ends. The restriction now includes `blocksCombatSuspend: true`: the interpreter records both normalized `beSuspended` (effect-driven suspension) and `suspend` (the suspension required by ordinary attack declaration). This is required by §11-2-5 and the engine's `canAttackerDeclare` consumer; a without-suspending effect attack remains outside this guard. Tied security stacks use the shared sentinel chooser and preserve hidden top-card identity.
- The shared When Digivolving/When Attacking recovery effects use one `sharedUseKey` and `OncePerTurn` frequency. Their optional `CostGatedBlock` trashes exactly the bottom face-down card from any controller-owned Tamer, then performs exactly one Recovery; the cost is paid before recovery and face-up/upper-stack boundaries are handled by the shared Tamer-stack primitive.
- The Static color waiver is conditioned on having an own `[Glowing Dawn]` card, enabling the yellow-requirement Option side for a non-yellow board card while preserving the DUAL card's normal mode rules. The Main Option effect binds exactly one opponent Digimon, gives it -8000 DP until the opponent's turn ends, then optionally pays the own top-security cost for the same bound target's further -5000 DP. `ModifyDP` duration and the Option-to-trash/Arts-Digivolve lifecycle preserve Q6998's deferred rule deletion.
- Registration is exclusive: the module contains only `registerIrCard("BT26-031", compiled)`; no `registerCard` registration exists. Relevant peers and seams inspected: BT26-003 (same Glowing Dawn inherited Tamer cost), BT26-019 (same `can't suspend` link effect and `blocksCombatSuspend` requirement), BT26-029/BT26-033 (security and DUAL/waiver patterns), BT26-057/BT26-076 (bottom face-down Tamer costs), and the restriction, combat-legality, security, duration, DUAL, and rule-check primitives.

### Behavioral proof and correction

- The prescribed focused failure was real: the existing test expected `hasRestriction(..., "beSuspended")` to be false, but the runtime correctly normalized the printed `suspend` prohibition to `beSuspended`. After correcting that stale assertion, the same proof exposed that the ordinary attack still returned `{ ok: true }`; the missing `blocksCombatSuspend` flag was therefore a card implementation gap, not merely stale test data. The minimal fix adds that flag and updates the structural/observable restriction expectations so both `beSuspended` and `suspend` are asserted.
- `apps/api/src/cards/BT26/BT26-031.test.ts` proves full IR coverage and exact action shapes; leading-security trash and lock on a Digimon; Q6997 tie selection; face-up-bottom Tamer cost rejection; shared recovery once-per-turn identity across When Digivolving and When Attacking; alternate Glowing Dawn evolution; Q6999 simultaneous trigger ordering; DUAL Option use with waiver, one-target -8000/-5000 binding, optional refusal of the second cost, and correct Option trash ordering; and Q6998 Arts-Digivolve rule deletion after all active effects resolve. The lock proof now confirms an opponent Digimon cannot declare a normal attack while the restriction is active.

### Verification

```text
node tools/kb/query.mjs card BT26-031
  PASS (Q6997–Q6999; no errata/restriction)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-031.test.ts
  PASS (1 file, 10 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/continuous.test.ts src/engine/effects/restrictionEnforcement.test.ts src/engine/combat/legality.test.ts
  PASS (5 files, 395 tests)
pnpm --filter @aegis/api exec vitest run src/engine/cards/combatRestrictCluster.test.ts src/engine/combat/restrictionProjection.test.ts src/engine/effects/restrictionConsumers.guard.test.ts src/cards/BT26/BT26-019.test.ts src/cards/BT26/BT26-031.test.ts
  PASS (5 files, 61 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-019.test.ts src/cards/BT26/BT26-029.test.ts src/cards/BT26/BT26-032.test.ts
  FAIL (BT26-032 pre-existing unrelated Digisorption expectation; BT26-019 and BT26-029 pass)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-031.ts apps/api/src/cards/BT26/BT26-031.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-031 ambiguity or unsupported card clause remains. The only broader-suite failure is the unrelated pre-existing BT26-032 Digisorption expectation. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-031; no later card section was touched.

## BT26-032 — Ceresmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-032` (`Ceresmon`), a Yellow/Green level-6 DUAL Digimon/Option with play cost 5, 13000 DP, Data attribute, and `Shaman`/`Olympos XII`/`Iliad`/`TS` traits. Its normal evolution requirements are Yellow Lv.5 for cost 5 or Green Lv.5 for cost 5; its alternate requirement is `Play cost 12 [Ceresmon]: Cost 2`. The Digimon text is `＜Alliance＞`, `＜Succession ([Ceresmon])＞`, `[When Digivolving] All of your opponent's suspended Digimon get -5000 DP until their turn ends. Then, by suspending 1 Digimon, if it's your turn, you may play or use 1 [Vegetation] or [TS] trait card from your hand with the cost reduced by 5.`, and `[Rule] Trait: Has [Vegetation] Type.` The Option face is `＜Use Req. ([TS] trait)＞ [Main] You may suspend 2 of your opponent's Digimon or Tamers. Then, 3 of their Digimon or Tamers can't unsuspend until their turn ends.` There is no inherited or Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-032 --json`; it reports Q7000–Q7003, with no banlist restriction or errata. Q7000 confirms that 0-DP deletion waits for the rule-check timing after all activated effects resolve. Q7001 confirms that the Digimon paid to the When Digivolving continuation may belong to either player. Q7002 confirms that the played card's own cost reduction and Ceresmon's -5 reduction stack. Q7003 confirms that the Main effect may restrict cards that were not suspended by its first clause.
- Comprehensive Rules evidence: §§2-3-5-1–3 cover alternate evolution requirements and cost; §§4-6-3–6 distinguish the Digimon and Option information on a DUAL card and treat a DUAL card placed on the field as a Digimon; §§4-7-3–10 cover stack order and face/visibility; §§15-7-1–3 cover the optional `by suspending` processing condition and its continuation gate; §§15-8-3 and 16-24-1–5 cover Alliance's attack-time suspend cost and temporary DP/Security Attack result; §§15-13-1–2 and 15-15-2-1–2 cover gained effects and their carried state; §§15-16-3-1, 15-16-7-1, 15-16-8-1, and 15-16-9-1 define When Digivolving, Main, turn-scoped, and all-turn timing; §16-10-1–5 defines Digisorption as an immediate effect only for a card with that effect in hand; and §17-1 covers the deferred 0-DP rule check.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-032.ts` is IR-only and registers exactly once through `registerIrCard("BT26-032", compiled)`; it contains no `registerCard` call. The alternate evolution requirement is exact (`names: ["Ceresmon"]`, `basePlayCost: 12`, `cost: 2`, `isAlternate: true`), while the two normal color/level routes remain handled by the shared evolution legality path.
- The When Digivolving body first applies -5000 DP to all opponent-controlled suspended Digimon through an all-target filter and `untilOpponentTurnEnd`. Its next action is an optional suspend of exactly one Digimon with `controller: "any"`, matching Q7001. The following modal is gated by both successful payment (`ifThisEffectActed`) and the controller's turn (`isYourTurn`); it splits the printed `play or use` verb into `PlayWithoutCost` for Digimon/Tamer cards and `UseOptionWithoutCost` for Options, both from hand, OR-matching `Vegetation`/`TS`, with `payCost: true` and `reduceCostBy: 5`. This preserves Q7002 stacking and the optional refusal/failure path.
- The static Rule clause grants the effective `Vegetation` trait to this permanent. The Succession clause uses `GrantStatic` with a Ceresmon name filter and `topmostOnly: true`, so only the topmost matching evolution card's effects are conferred while lower matching cards are excluded. The shared conferral collector preserves source instance and trigger identity for inherited/stack effects.
- The Option face's `WaiveColorRequirement` is conditional on an own live `TS` trait card, matching the green Option requirement and `[TS]` Use Req. Its Main body optionally suspends up to two opponent Digimon/Tamers, then applies an `unsuspend` restriction to three opponent Digimon/Tamers (or all available when fewer than three exist) until the opponent's turn ends. The target sets are independently resolved, so Q7003's restriction can include a card that was not selected by the first action.
- Relevant peers and seams inspected: BT26-080 and BT26-103 for the same DUAL/alternate-evolution/Succession pattern; BT25-059 and BT25-077 for the Ceresmon/TS cost-reduction and stack interactions; BT24-102 for activating effects gained through Succession; `actions/digivolve.ts` for alternate requirements, cost affordability, evolution-stack transition, and deferred rule checks; `actions/play.ts`/`actions/borrowed.ts` for paid reductions on effect-driven play/use; `grantStatic.ts`, `collect.ts`, and `continuous.ts` for topmost effect conferral; and the target/restriction primitives for mixed Digimon/Tamer selection and duration cleanup.

### Behavioral proof and correction

- The focused suite initially failed only at `apps/api/src/cards/BT26/BT26-032.test.ts:113`, where it expected a Ceresmon host to expose `Digisorption` after conferring BT3-056 from its stack. This was a stale expectation, not a card or engine gap: the shared registration intentionally consumes BT3-056's intrinsic Digisorption marker into the hand-only cost registry, and §16-10-1 says the keyword triggers only when the card with the effect is in hand. The test now asserts that Succession confers only the topmost matching card while the hand-only Digisorption marker remains inactive on the field host.
- The focused `apps/api/src/cards/BT26/BT26-032.test.ts` suite has 7 passing tests proving catalog/DUAL metadata, exact alternate evolution IR, Alliance/Succession/Rule trait/waiver structure, topmost Ceresmon conferral with lower-card exclusion, -5000 suspended-opponent DP and deferred 0-DP deletion, Q7001's either-player suspend, Q7002's stacked cost reductions, and the Famis mixed target/TS waiver/Q7003 path. The tests exercise real evolution stacks, hand/trash movement, optional continuation, final zones, and effect settlement.

### Verification

```text
node tools/kb/query.mjs card BT26-032
  PASS (Q7000–Q7003; no errata/restriction)
node tools/kb/query.mjs card BT26-032 --json
  PASS (banlist: null; errata: null; Q7000–Q7003)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-032.test.ts
  PASS (1 file, 7 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-009.test.ts src/cards/BT26/BT26-011.test.ts src/cards/BT26/BT26-080.test.ts src/cards/BT26/BT26-103.test.ts src/cards/BT24/BT24-102.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts src/engine/actions/digivolve.test.ts
  PASS (7 files, 91 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/continuous.test.ts src/engine/effects/primitives.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/subtriggers.test.ts
  PASS (4 files, 372 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-032.test.ts
  PASS
pnpm exec oxlint apps/api/src/cards/BT26/BT26-032.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-032 ambiguity or unsupported printed clause remains. The only change for this card is the corrected stale Digisorption expectation in its focused test; implementation files remain unchanged. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-032; no later card section was touched.

## BT26-033 — Jupitermon / Wide Plasment — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-033` (`Jupitermon` / `Wide Plasment`), a yellow/red level-6 DUAL Digimon/Option with play cost 2, 13000 DP, Vaccine attribute, and `Shaman`/`Olympos XII`/`Iliad`/`TS` traits. Its normal evolution requirements are yellow Lv.5 for cost 5 or red Lv.5 for cost 5; its alternate requirement is Lv.5 with the `TS` trait for cost 4. The Digimon text is `＜Raid＞ ＜Alliance＞ ＜Engage＞ [When Digivolving] Add your top security card to the hand. Then, if it's your turn, you may play or use 1 [Iliad] card from your hand with the cost reduced by 5. [All Turns] When any of your [TS] trait Digimon or Tamers would leave the battle area, by placing this Digimon's top stacked card as the bottom security card, they don't leave.` The Option text is `For each of your security cards, add 1 to this card's use cost. ＜Use Req. ([TS] trait)＞ [Main] Delete all of your opponent's Digimon with the lowest DP. Then, ＜Recovery +1＞`.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-033 --json`; it reports no banlist restriction and no erratum. Q7004 confirms that Jupitermon's paid `-5` play reduction stacks with BT25-044 Junomon's own reduction for a total of 10. Q7005 confirms that the All Turns replacement prevents every simultaneously-leaving matching Digimon/Tamer after one payment, without a per-target choice. Q7006 confirms that Wide Plasment's first cost effect is always active and its use cost constantly fluctuates with the current security count.
- Comprehensive/manual rules evidence: §§2-3-5-1–3 and 8-1-3 define the normal/alternate evolution requirements, costs, stack transition, and evolution draw; §§4-6-1–6 distinguish DUAL Digimon/Option information and the declared use side; §§4-7-1–10 and 4-8-1–2 define stacked-card order, top-card identity, visibility, and the fate of cards under a permanent that leaves; §§4-22-1–5 define Option color requirements and field color sources; §§9-1-1–9 define Option use, payment, the no-area resolving window, and pending trash; §§15-7-1–5 define optional processing and payment gates; §§15-8-2/3/4 define persistent, trigger-type, and activation-type timing; §§15-14-1-1–5 define once-per-turn boundaries (not printed on this card); §§15-16-3-1, 15-16-7-1, and 15-16-9-1 define When Digivolving, Main, and All Turns timing; §§16-24-1–5 define Alliance; §16-42-1–3 defines Use Req.; and §17-1-2-2/17-1-3-1–2 defer DP-0 deletion and other rule checks until effect resolution completes. No applicable ruling, restriction, erratum, or unresolved ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-033.ts` is compiled IR and registers exactly once through `registerIrCard("BT26-033", compiled)`; there is no `registerCard` registration. The alternate requirement is exact (`level: 5`, `traits: ["TS"]`, `cost: 4`, `isAlternate: true`); the two normal color/Lv.5 routes remain handled by the shared evolution legality path. Raid, Alliance, and Engage are published as keyword metadata.
- The When Digivolving body first moves exactly one own top security card to hand, then exposes an optional, your-turn-only modal. Its play branch selects one own-hand `Iliad` Digimon/Tamer and its use branch selects one own-hand `Iliad` Option; both pay the normal cost after applying the printed `-5` reduction, preserving Q7004's stacked-reduction behavior. The source/controller, hand zone, one-card count, optionality, turn gate, and Option-vs-play split are explicit.
- The All Turns replacement uses `wouldLeavePlay`, `sourceFilter`/target filters for own `TS` permanents, `affectsAll: true`, and a `placeAsSecurity` cost targeting this source's top card at the bottom of the controller's security. The shared leave-prevention consult pays once and marks every matching simultaneous departure prevented, exactly as Q7005 requires; the source top-card placement and face-down bottom-security default are traced through `payCost`, `addSecurity`, leave-cause handling, and stack teardown.
- The Option-side static `CostModifier` is hand-resident, self-targeted, permanent, and adds one to use cost per own security card. The live modifier ledger is read for both normal Option use and effect-driven use, so Q7006's constant cost fluctuation is preserved. The separate static `WaiveColorRequirement` is conditioned on an own live `TS` permanent, implementing `＜Use Req. ([TS] trait)＞`; the Main body deletes all opponent Digimon tied for lowest DP, then performs one Recovery. It does not target Tamers, and the recovery/rule-check order remains deferred through the normal effect stack.
- Shared seams and peers inspected: `actions/borrowed.ts` and `actions/play.ts` for paid effect-driven play/use and cost reductions; `actions/security.ts`, `costs.ts`, `leavePrevention.ts`, and `primitives.ts` for security movement, bottom placement, simultaneous prevention, and permanent stack fate; `resources.ts`/`modifiers.ts` for hand-resident dynamic use cost; `conditions.ts`/target matching for field `TS` Use Req. and lowest-DP ties; DUAL `playCard.ts`/Arts-Digivolve routing; and BT26-029, BT26-032, BT26-080, BT26-103, BT24-093, and BT24-101 for adjacent DUAL, Iliad/TS, security, and evolution-stack patterns. Raid/Alliance/Engage registration and their combat consumers were also checked. No inherited or Security clause exists on this card.

### Behavioral proof

The existing focused `apps/api/src/cards/BT26/BT26-033.test.ts` suite has 4 passing tests proving:

- full IR coverage with no residual behavior, exact DUAL-facing keyword metadata, alternate evolution shape, explicit your-turn modal split, All Turns `affectsAll` replacement, dynamic use-cost modifier, conditional color waiver, lowest-DP deletion, and Recovery;
- Q7004's real When Digivolving path: top security to hand, paid Junomon play, stacked `-5` reductions, and final memory/zone state;
- Q7005's simultaneous boundary: one top Jupitermon card placed at bottom security and every matching TS Digimon protected by one payment; and
- Q7006's real Option use: use cost `2 +` the three live security cards, full lowest-DP tie deletion, deferred Recovery +1, and final Option trash.

These assertions are mutation-sensitive and use public intents, `advance`, and settled observable state. The focused proof exercises a real evolution-style source, an explicit stacked source card for the replacement payment, mixed lowest-DP opponents, an Iliad peer card, and the DUAL Option lifecycle. Shared mechanism tests cover optional decisions, controller/zone/kind filters, payment/flooring, dynamic scaling, security face/order, simultaneous replacement, stack teardown, DUAL mode, and rule-check timing. No card-specific implementation or test change was necessary because the committed implementation and tests are sufficient.

### Verification

```text
node tools/kb/query.mjs card BT26-033 --json
  PASS (Q7004–Q7006; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-033.test.ts
  PASS (1 file, 4 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-029.test.ts src/cards/BT26/BT26-032.test.ts src/cards/BT26/BT26-080.test.ts src/cards/BT26/BT26-103.test.ts src/cards/BT24/BT24-093.test.ts src/cards/BT24/BT24-101.test.ts
  PASS (6 files, 49 tests)
pnpm --filter @aegis/api exec vitest run src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts src/engine/effects/leavePrevent.test.ts src/engine/security/securityCheck.test.ts
  PASS (5 files, 373 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-033.ts apps/api/src/cards/BT26/BT26-033.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-033.ts apps/api/src/cards/BT26/BT26-033.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-033 ambiguity or unsupported printed clause remains. No implementation, shared-engine, or test changes were needed. The audit entry is intentionally uncommitted and unpushed, and this audit is limited to BT26-033; no later card section was touched.

## BT26-034 — Palmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-034` (`Palmon`), a green level-3 Rookie Digimon with play cost 3, 1000 DP, Data attribute, and `Vegetation`/`Iliad`/`TS` traits. Its normal evolution requirement is green Lv.2 for cost 0, and its alternate requirement is `[Digivolve] Lv.2 w/[TS] trait: Cost 0`. The main text is `[Start of Your Main Phase] If you have 4 or less memory, this Digimon may digivolve into a Digimon card with the [Vegetation] or [TS] trait in the hand without paying the cost.` Its inherited text is `[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-034 --json`; it returns Q7007 and no erratum or banlist restriction. Q7007 confirms that “4 or less memory” means positions at 4 and to the right on the activating player's side of the memory gauge.
- Comprehensive/manual rules evidence: §§2-3-5-1–3 and 8-1-2–3 define normal/alternate evolution requirements, payment, and stack transition; §§4-7-1–10 and 4-8-1–2 define evolution-stack order and top-card identity; §§11-2-1–5 define attack declaration and suspension; §§15-7-1–5 define optional processing; §§15-8-3-1–9 define trigger-type effects and activation; §§15-14-1-1–5 define Once Per Turn identity/reset; §§15-16-5-1 and 15-16-13-1 define When Attacking and Start of Your Main Phase timing. No additional card-specific ambiguity remains after Q7007.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-034.ts` is compiled IR with `coverage: "full"` and `residual: []`. The alternate evolution requirement is exact (`level: 2`, `traits: ["TS"]`, `cost: 0`, `isAlternate: true`), while the catalog supplies the normal green Lv.2/cost-0 requirement. Registration is exclusively `registerIrCard("BT26-034", compiled)`; no `registerCard` registration exists.
- The Start of Your Main Phase action is optional, targets this Digimon, draws only from the controller's hand, requires `kind: ["Digimon"]`, and OR-matches the complete `Vegetation`/`TS` trait set. `payCost: false` waives only memory payment; shared `runDigivolve` still enforces the chosen card's ordinary/alternate evolution requirement. The `memoryAtMost` condition uses `controller: "mine"`, preserving Q7007's controller-side gauge semantics.
- The inherited When Attacking effect is `frequency: "OncePerTurn"` and targets exactly one opponent-controlled Digimon. Its `Suspend` action is explicitly `optional: true`, implementing the printed “You may”; the effect ledger counts the activation by physical inherited copy and resets at turn/new-card boundaries. Shared target resolution excludes Tamers and own Digimon.
- Shared seams inspected: `actions/digivolve.ts` for source-zone/trait filtering, requirement legality, free-cost stack transition, and suppression of unintended candidate triggers; `conditions.ts` for controller-relative memory thresholds; suspend targeting/optional-decision resolution; attack timing and inherited-effect collection; and the Once Per Turn ledger. Relevant peers inspected: BT26-035/036/038 for TS/Vegetation evolution and inherited attack/suspend vocabulary, BT26-042/043 for opponent Digimon/Tamer target boundaries, and BT26-090 for the same Q7007 memory-condition encoding.

### Behavioral proof and correction

- The audit found one real fidelity gap: the inherited optional suspension had been compiled without `optional: true`, making a legal opponent Digimon suspension mandatory whenever the effect activated. The minimal correction adds that flag; no shared-engine change was necessary.
- `apps/api/src/cards/BT26/BT26-034.test.ts` now has 7 passing tests proving the exact alternate evolution and full IR shape, free evolution of both a `Vegetation` and a `TS` card from hand at 4 memory, Q7007's no-activation boundary at 5 memory, optional refusal of the free evolution without movement/payment, inherited suspension of exactly one opponent Digimon, inherited Once Per Turn behavior across repeated attacks, and optional refusal of the inherited suspension. The inherited proof uses a real Palmon evolution stack and a mixed two-Digimon opponent board; the main-path tests use real stack transitions and final hand/stack/memory assertions.

### Verification

```text
node tools/kb/query.mjs card BT26-034 --json
  PASS (Q7007; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts
  PASS (1 file, 7 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (7 files, 363 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-034.ts apps/api/src/cards/BT26/BT26-034.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-034.ts apps/api/src/cards/BT26/BT26-034.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-034 ambiguity or unsupported printed clause remains. The implementation and focused tests were corrected only for the inherited optionality gap; no shared-engine or peer-card files were changed. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-034; the collection is not marked complete.

## BT26-035 — Morphomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-035` (`Morphomon`), a green level-3 Rookie Digimon with play cost 3, 1000 DP, Vaccine attribute, and `Insectoid`/`NSp` traits. Its normal evolution requirement is green Lv.2 for cost 0, and its alternate requirement is `[Digivolve] Lv.2 w/[NSp] trait: Cost 0`. The main text is `[When Moving] [On Play] You may suspend 1 Digimon.` Its inherited text is `[Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your [Insectoid] or [NSp] trait Digimon may digivolve into an [Insectoid] or [NSp] trait Digimon card in the hand with the cost reduced by 1.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-035 --json`; it returns no Q&A ruling, erratum, or banlist restriction. `data/kb/errata.json` and `data/kb/banlist.json` contain no BT26-035 entry.
- Comprehensive Rules evidence: §§2-3-5-1–3 define the alternate evolution requirement; §§8-1-1–3 define revealing, requirement checking, payment, stacking, and the evolution draw; §§11-2-1–5 define attack declaration and the suspension requirement; §§15-7-1–5 define optional processing; §§15-14-1-1–5 define Once Per Turn identity, activation counting, and reset; §§15-16-2-1, 15-16-16-1, and 15-16-5-1 define On Play, When Moving, and When Attacking timing. No unresolved card-specific ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-035.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers exactly once through `registerIrCard("BT26-035", compiled)` and has no `registerCard` registration.
- The alternate requirement is exact (`level: 2`, `traits: ["NSp"]`, `cost: 0`, `isAlternate: true`). The shared evolution legality path supplies the normal green Lv.2/cost-0 route and preserves requirement checking, stack transition, orientation, and draw behavior.
- The combined `[When Moving] [On Play]` clause is represented by two trigger entries, both using one optional `Suspend` action targeting exactly one Digimon with `controller: "any"` and `kind: ["Digimon"]`. This permits either player’s Digimon and excludes Tamers while preserving the printed “may”.
- The inherited clause is a `[Your Turn]` persistent watcher with `frequency: "OncePerTurn"` and a `SubTrigger` for `whenBattleWon`. `sourceFilter: { isSelfRef: true }` binds “this Digimon” to the host that actually won; the target is exactly one own Digimon and the hand destination is restricted to own Digimon cards with the complete OR trait filter (`Insectoid` or `NSp`). `payCost: true` with `costDelta: -1` reduces the normal digivolution cost by one while shared legality still enforces the destination card’s requirements. The interpreter’s turn-scope and stable Once Per Turn ledger carry the `[Your Turn]`/`[Once Per Turn]` semantics across recomputation.
- Shared seams inspected: `effects/interpreter/actions/digivolve.ts` for candidate-zone/trait filtering, ordinary and alternate requirement legality, cost delta, hand source, and evolution stack transition; `effects/interpreter/actions/subTrigger.ts` for self-source binding, turn scope, optional activation, and stable Once Per Turn keys; target matching for `controller: "any"`, `controllerDefault: "mine"`, kind, and OR trait filters; attack/battle-win event dispatch; and the inherited-effect collector. Relevant peers inspected: BT26-034 and BT26-038 for adjacent NSp/TS evolution and the same battle-win inherited-digivolution vocabulary, plus BT26-036 for the paired On Play/When Moving and inherited suspend pattern.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-035.test.ts` now has 6 passing tests. The suite proves the exact alternate requirement and IR trigger/action shape; On Play suspension of an opponent Digimon; When Moving suspension from breeding; optional refusal for both suspend windows; optional refusal of the inherited evolution; an actual own-host battle win while an ally’s battle win is ignored; selection of an NSp target from a mixed board containing a non-matching Digimon; the one-memory cost reduction and final stack/source transition; and rejection of a near-match non-NSp alternate-evolution base.
- The inherited mixed-board test uses a real `EX12-049` NSp target, a non-matching `BT1-009` ally, two legal Insectoid destination cards, and real attacks. It forces the NSp target, verifies the first evolution, unsuspends the host, and proves the second host battle in the same turn cannot consume the second candidate, providing mutation-sensitive evidence for source identity, OR trait breadth, cost reduction, and Once Per Turn.
- The final-zone and negative assertions verify that declined optional effects leave the opponent unsuspended and the evolution card in hand, while a non-NSp Lv.2 breeding card cannot use the alternate route. All effects settle before observable assertions.

### Verification

```text
node tools/kb/query.mjs card BT26-035 --json
  PASS (no Q&A; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-035.test.ts
  PASS (1 file, 6 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (6 files, 358 tests)
pnpm --filter @aegis/api exec vitest run src/engine/actions/digivolve.test.ts src/engine/effects/digivolveCandidateLegality.test.ts
  PASS (2 files, 39 tests)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-035.ts apps/api/src/cards/BT26/BT26-035.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-035.ts apps/api/src/cards/BT26/BT26-035.test.ts
  PASS
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
git diff --check
  PASS
```

No unresolved BT26-035 ambiguity or unsupported printed clause remains. No implementation or shared-engine change was needed; only the focused test was strengthened to provide the required optional, mixed-trait, host-source, cost, and Once Per Turn evidence. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-035; the collection is not marked complete.

## BT26-036 — Lalamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-036` (`Lalamon`), a green level-3 Rookie Digimon with play cost 3, 1000 DP, Data attribute, and `Vegetation`/`DATA SQUAD` traits. Its normal evolution requirement is green Lv.2 for cost 0, and its alternate requirement is `[Digivolve] Lv.2 w/[DATA SQUAD] trait: Cost 0`. The main text is `[When Moving] [On Play] Reveal the top 3 cards of your deck. Add 1 card with the [Vegetation], [Fairy] or [DATA SQUAD] trait or 1 green Tamer card among them to the hand. Return the rest to the bottom of the deck.` Its inherited text is `[When Attacking] [Once Per Turn] You may suspend 1 of your opponent's Digimon.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-036 --json`; it returns `qa: []`, `banlist: null`, and `errata: null`. No card-specific ruling, erratum, or restriction remains to resolve.
- Comprehensive Rules evidence: §§2-3-5-1–3 define alternate evolution requirements; §§8-1-1–3 define requirement checking, payment, and stack transition; §§11-2-1–5 define attack declaration; §§15-7-1–5 define optional processing; §§15-14-1-1–5 define Once Per Turn identity, activation counting, and reset; §§15-16-2-1, 15-16-5-1, and 15-16-16-1 define On Play, When Attacking, and When Moving timing. §15-15-3 covers revealing cards and returning unrecruited cards to the deck. No unresolved ambiguity is present.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-036.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers exactly once through `registerIrCard("BT26-036", compiled)`; no second `registerCard` registration exists.
- The alternate requirement is exact (`level: 2`, `traits: ["DATA SQUAD"]`, `cost: 0`, `isAlternate: true`); the shared requirement reader supplies the normal green Lv.2/cost-0 route. The focused evolution test uses a real DATA SQUAD Lv.2 stack and rejects a near-match base.
- The printed `[When Moving] [On Play]` clause is represented by separate `OnPlay` and `WhenMoving` `RevealAdd` actions, each revealing exactly three, adding exactly one card to hand, and bottoming every remaining revealed card. The add filter is the union of `Vegetation`, `Fairy`, `DATA SQUAD`, or a green Tamer via the `RevealAdd` entry's `orFilters` field. This preserves the Tamer branch without accidentally requiring a trait as well.
- The inherited action is `WhenAttacking`, `isInherited: true`, `frequency: "OncePerTurn"`, and an optional `Suspend` targeting exactly one opponent-controlled Digimon. The shared attack dispatcher, inherited collector, target matcher, optional decision path, and per-copy Once Per Turn ledger provide the timing, controller, count, refusal, and repeated-attack semantics.
- Shared seams inspected: `effects/interpreter/actions/reveal.ts` for reveal count, OR-filter union, hand destination, and deck-bottom restoration; loose definition matching for trait/kind/color boundaries; `effects/interpreter/actions/suspend.ts` and attack dispatch for opponent-only target resolution and optionality; the inherited-effect collector and Once Per Turn ledger; and digivolution requirement/stack transition handling. Relevant peers inspected: BT26-034, BT26-035, BT26-038, BT26-052, BT26-061, BT24-066, and BT25-047 for the same evolution, RevealAdd, inherited When Attacking, and deck-bottom patterns.

### Behavioral proof and correction

- The audit found two real fidelity gaps and corrected only this card: the green-Tamer alternative had been nested inside the primary definition filter instead of `RevealAdd.orFilters`, and the inherited “You may suspend” action lacked `optional: true`. The former rejected green Tamers without one of the listed traits; the latter made the suspension mandatory when the trigger resolved.
- `apps/api/src/cards/BT26/BT26-036.test.ts` now has 9 passing tests. It proves the exact IR shape and alternate requirement; On Play reveal/add/bottom behavior for each of `Vegetation`, `Fairy`, and `DATA SQUAD`; the green-Tamer alternative with a non-DATA-SQUAD green Tamer and rejection of a red Tamer; the independent When Moving window; inherited suspension of one opponent Digimon while excluding an own Digimon; inherited Once Per Turn behavior across two attacks; optional refusal; and rejection of a non-DATA-SQUAD alternate-evolution base.
- The inherited proof uses a real BT26-039 host with BT26-036 in its evolution stack and a mixed board, so source identity, inherited visibility, opponent-only targeting, exact count, and Once Per Turn behavior are observed after full attack resolution. Reveal tests assert final hand identity and the exact order of the two bottomed cards.

### Verification

```text
node tools/kb/query.mjs card BT26-036 --json
  PASS (qa: []; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-036.test.ts
  PASS (1 file, 9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-038.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (7 files, 368 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-036.ts apps/api/src/cards/BT26/BT26-036.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-036.ts apps/api/src/cards/BT26/BT26-036.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-036 ambiguity or unsupported printed clause remains. The implementation and focused tests were corrected only for the two identified fidelity gaps; no shared-engine files were changed. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-036; the collection is not marked complete.

## BT26-037 — Weatherdramon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-037` (`Weatherdramon`), a green level-4 Sup./Appmon Digimon with 5000 DP, play cost 5, Navi attribute, and `Weather (App Name)`/`Seven Code` traits. Its normal evolution requirement is green Lv.3 for cost 2. The special requirements are `[App Fusion] [Weathermon] & [Rocketmon] & [Newsmon]: Cost 0` and `[Assembly -2] Lv.3 [Navi]/[System]/[Seven Code] trait Digimon card`. The printed main text is `＜Blocker＞`, `＜Detach ([Seven Code] trait)＞`, and `[On Play] [When Digivolving] You may link 1 level 3 Digimon card with the [Navi], [System] or [Seven Code] trait from this Digimon's digivolution cards to this Digimon without paying the cost.` Its link requirement is `[Link] [Appmon] trait: Cost 3`, and its link text is `[When Linking] This Digimon may battle 1 of your opponent's Digimon.` It has no inherited or Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-037 --json`; it returns no erratum or banlist restriction and Q7014–Q7017. Q7014 confirms that only cards with `<Link>` may be linked; Q7015 defines “may battle” as an immediate standard battle; Q7016 confirms that effect immunity does not prevent choosing a Digimon for that battle; Q7017 confirms all six ordered pairs of two distinct names among Weathermon, Rocketmon, and Newsmon.
- Comprehensive Rules evidence: §§2-3-9 and 8-4-1–3 define App Fusion and the two-distinct-name pairing; §§2-3-10 and 7-3-1–3 define Assembly, exact material count, cost reduction, and stack placement; §§4-8-1–2 and 4-9-1–5 distinguish digivolution cards from link cards and enforce link requirements/limits; §§6-5-1-4 and 10-1-1–3 define linking, paying its cost, and placing the link; §§15-16-2-1 and 15-16-3-1 define On Play and When Digivolving; §15-16-6-1 defines When Linking; §§14-1–2 define DP comparison and battle deletion; §16-5-1–2 defines Blocker; and §16-46-1–3 defines the optional Detach prevention. No card-specific ambiguity remains after Q7014–Q7017.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-037.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers exactly once through `registerIrCard("BT26-037", compiled)`; no `registerCard` registration exists.
- `appFusionRequirement` exactly captures the three printed names and cost 0. The shared `appFusionCostFor` seam requires the top name plus one linked card with a different required name, matching Q7017 and rejecting duplicates/unrelated names.
- `assemblyRequirement` exactly captures Assembly -2 and one level-3 Digimon with the OR trait set. The focused Assembly test proves the material is taken from trash, stacked under Weatherdramon, and removed from trash.
- `linkRequirement` now captures `[Appmon]` and cost 3. The On Play/When Digivolving `Link` actions are optional, free (`payCost: false`), source exactly one level-3 Digimon with `<Link>` and Navi/System/Seven Code, and are restricted by `controllerDefault: "mine"` plus `hostFilter: { isSelfRef: true }` to this Weatherdramon's own digivolution cards. The host restriction is necessary for the printed “this Digimon's” boundary.
- The static keyword window supplies Blocker and Detach with the exact Seven Code trait parameter. The linked static window fires a `whenLinked` SubTrigger whose optional `Battle` uses this linked host as attacker and exactly one opponent Digimon as defender; the combat seam performs the immediate DP battle and honors Q7015/Q7016.
- Shared seams inspected: `effects/interpreter/actions/link.ts` and loose-card targeting for `<Link>` eligibility, link cost, source zone, owner, host filtering, and relocation; `effects/interpreter/actions/combat.ts` and `combat/controller.ts` for immediate Battle and effect-immunity bypass; `actions/assembly.ts` for trash material selection and cost reduction; keyword registration/continuous projection for Blocker and Detach; and `data.ts` for App Fusion/Assembly metadata. Relevant peers inspected: BT26-010, BT26-019, BT26-028, BT26-051, BT26-063, and BT26-084 for Seven Code/Detach, Appmon link costs, linked triggers, and this-Digimon stack filtering.

### Behavioral proof and correction

- The audit found two real fidelity gaps and corrected only this card: `compiled.linkRequirement` was missing despite the catalog's `[Link] [Appmon] trait: Cost 3`, and the source filter could select a qualifying level-3 link card from another own Digimon's stack because it lacked `hostFilter: { isSelfRef: true }` (and the explicit own-controller default). No shared-engine change was necessary.
- `apps/api/src/cards/BT26/BT26-037.test.ts` now has 9 passing tests. It proves the exact App Fusion/Assembly/link metadata and keyword/trigger shape; all six distinct ordered App Fusion pairs plus duplicate rejection; linking an eligible source and resolving the linked-face battle; Q7014 rejection of a level-3 card without `<Link>`; optional refusal of the On Play link; exclusion of an eligible card under another own Digimon; Q7015/Q7016 battle against an effect-immune Digimon; optional refusal of that linked battle; and actual Assembly -2 from trash.
- The mixed-stack test uses an illegal source under Weatherdramon and a legal Navi link card under a separate own Digimon, proving the latter remains untouched. The battle test uses a real link intent and a 3000-DP opponent; the effect-immune restriction is applied before linking and the direct battle still deletes the lower-DP opponent. All assertions occur after effect settlement.

### Verification

```text
node tools/kb/query.mjs card BT26-037 --json
  PASS (Q7014–Q7017; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-037.test.ts
  PASS (1 file, 9 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-037.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/engine/cards/bt26Assembly.test.ts src/engine/conformance/ch02-card-information.test.ts src/engine/conformance/ch08-digivolution.test.ts
  PASS (7 files, 73 tests)
  Note: the additional `src/engine/conformance/ch10-link.test.ts` regression run has one pre-existing failure in `src/engine/linkState.test.ts` (BT25-056 cost integration expects a link that is not created); no BT26-037 test or shared file is implicated.
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-037.ts apps/api/src/cards/BT26/BT26-037.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-037.ts apps/api/src/cards/BT26/BT26-037.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-037 ambiguity or unsupported printed clause remains. Only the card module and colocated focused test were changed; changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-037; the collection is not marked complete.

## BT26-038 — Kuwagamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-038` (`Kuwagamon`), a green level-4 Champion Digimon with play cost 5, 5000 DP, Virus attribute, and `Insectoid`/`Titan`/`TS` traits. Its normal evolution requirement is green Lv.3 for cost 2, and its alternate requirement is `[Digivolve] Lv.3 w/[TS] trait: Cost 2`. The main text is `[When Moving] [On Play] [When Digivolving] You may suspend 1 Digimon. Then, 1 of your Digimon with the [Insectoid] or [Titan] trait gets +3000 DP until your opponent's turn ends.` The inherited text is `[Your Turn] [Once Per Turn] When this Digimon wins a battle, 1 of your [Insectoid] or [Titan] trait Digimon may digivolve into an [Insectoid] or [Titan] trait Digimon card in the hand with the cost reduced by 1.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-038 --json`; it returns Q7018–Q7023, with no erratum or banlist restriction. Q7018 confirms the suspend target may be either player's Digimon. Q7019–Q7023 establish that the inherited effect triggers after the battle win (including a Security Digimon battle), remains valid when deletion is prevented, and participates in the stated simultaneous-trigger ordering.
- Comprehensive Rules evidence: §§2-3-5-1–3 and 8-1-1–3 define normal/alternate evolution requirements, requirement checking, payment, stack transition, and evolution draw; §§14-1–2 define battle winners, loser deletion, Security Digimon battles, and trigger timing; §§15-7-1–5 define optional processing; §§15-8-3-1–9 define trigger-type effects; §§15-14-1-1–5 define per-copy Once Per Turn activation and reset; §§15-16-2-1, 15-16-5-1, and 15-16-16-1 define On Play, When Attacking/battle processing, and When Moving. The modifier ledger's `UntilOpponentTurnEnd` mapping was also checked. No unresolved card-specific ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-038.ts` is compiled IR with `coverage: "full"` and `residual: []`; it registers exactly once through `registerIrCard("BT26-038", compiled)`, with no `registerCard` registration.
- The alternate evolution requirement is exact (`level: 3`, `traits: ["TS"]`, `cost: 2`, `isAlternate: true`); the shared evolution path supplies the normal green Lv.3/cost-2 route and preserves requirement validation, stack placement, and draw behavior.
- The shared `clause` is installed independently for `OnPlay`, `WhenDigivolving`, and `WhenMoving`. Its first action is optional `Suspend` targeting exactly one Digimon with `controller: "any"`, implementing Q7018. Its following `ModifyDP` targets exactly one own Digimon and OR-matches the complete `Insectoid`/`Titan` trait set for 3000 DP with `untilOpponentTurnEnd`; it is not aborted when the optional suspension is declined.
- The inherited action is a `[Your Turn]` persistent watcher with `frequency: "OncePerTurn"` and a `whenBattleWon` SubTrigger. `sourceFilter: { isSelfRef: true }` binds “this Digimon” to the host that won, while the target and hand destination each use the own-controller and OR trait filters. `payCost: true` plus `costDelta: -1` applies the printed one-memory reduction while shared digivolution legality remains authoritative.
- Shared seams inspected: `actions/board.ts` and permanent targeting for any-controller suspension, actual transition results, OR trait matching, and DP modifiers; `duration.ts`/`modifiers.ts` for opponent-turn-end expiry; `actions/subTrigger.ts` and `matching/trigger.ts` for inherited host identity and turn scope; `actions/digivolve.ts` for hand source, requirement checks, cost delta, and stack transition; and combat/security dispatch for battle wins and Q7019–Q7023 boundaries. Relevant peers inspected: BT26-034–BT26-036, BT26-039, BT26-041, and BT26-042 for adjacent TS evolution, Insectoid/Titan targeting, inherited battle-win effects, and the same suspend/DP vocabulary.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-038.test.ts` now has 7 passing tests. The suite proves the full IR shape and exact alternate requirement; a real inherited battle-win evolution with one-memory reduction; host-source isolation when a different Digimon wins; Q7020's Security Digimon battle path; Q7018's any-controller suspend target through the positive opponent-target case; optional refusal while the `Then` buff still resolves; own-only and exact Insectoid/Titan trait boundaries; opponent-turn-end DP expiry; and legal/illegal alternate evolution bases.
- The mixed-board refusal test uses an own Insectoid, an own non-matching Digimon, and an opponent Insectoid. It asserts that declining suspension leaves every target unsuspended, buffs only the preferred own Insectoid by exactly 3000 DP, leaves the non-matching/opponent cards unchanged, and clears the modifier at `opponentTurnEnd`.
- The inherited tests use a real evolution stack carrying BT26-038, a separate ally that wins a battle, an eligible target, and a hand candidate. They assert the candidate's final stack instance and memory, reject the unrelated winner, and repeat the same proof against a Security Digimon. The alternate-evolution test performs a real Lv.3 TS transition and rejects a red non-TS Lv.3 base.

### Verification

```text
node tools/kb/query.mjs card BT26-038 --json
  PASS (Q7018–Q7023; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-038.test.ts
  PASS (1 file, 7 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-039.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (9 files, 385 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-038.ts apps/api/src/cards/BT26/BT26-038.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-038.ts apps/api/src/cards/BT26/BT26-038.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-038 ambiguity or unsupported printed clause remains. Only the colocated focused test and this appended audit section were changed; the card implementation and shared engine required no correction. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-038; the collection is not marked complete.

## BT26-039 — Sunflowmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-039` (`Sunflowmon`), a green level-4 Champion/Data Digimon with play cost 5, 6000 DP, and `Vegetation`/`DATA SQUAD` traits. Its normal evolution requirement is green Lv.3 for cost 2. The alternate requirement is `[Digivolve] Lv.3 w/[DATA SQUAD] trait: Cost 2`. The main text is `[On Play] [When Digivolving] If you have 1 or fewer Tamers, you may play 1 [Yoshino Fujieda] from your hand without paying the cost.` The inherited text is `[When Attacking] [Once Per Turn] 1 of your opponent's Digimon can't unsuspend until their turn ends.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-039 --json`; it returns no errata, banlist restriction, QA, or card-specific ruling entry.
- Comprehensive Rules evidence: §§2-3-1-2 and 2-3-1-3 distinguish a bracket-only individual name from an `in its name` substring reference; §§2-3-5-1–3 and 8-1 define printed and alternate digivolution requirements, payment, and stack transition; §§7-1-2–3 define effect-driven playing from hand; §§11-2-1–3 define attack declaration; §§15-8-3-1–9 define triggered effects; §§15-14-1-1–5 define per-copy Once Per Turn activation/reset; and §§15-16-2-1, 15-16-3-1, and 15-16-5-1 define On Play, When Digivolving, and When Attacking timings. The glossary's Once Per Turn entry confirms separate copies/effects have independent budgets. No unresolved card-specific ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-039.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers exactly once through `registerIrCard("BT26-039", compiled)`; no `registerCard` registration exists.
- The normal green Lv.3/cost-2 route is supplied by the catalog `evoCosts`; the compiled alternate requirement is exact (`level: 3`, `traits: ["DATA SQUAD"]`, `cost: 2`, `isAlternate: true`). Shared digivolution legality validates the requirement, pays the selected cost, and preserves the source stack.
- A shared `PlayWithoutCost` action is installed independently for `OnPlay` and `WhenDigivolving`. It is hand-only, own-controller scoped, count 1, free, optional, and gated by an own battle-area `permanentCount` of Tamers `lte 1`. The name reference uses `nameExact`, matching CR §2-3-1-2; this excludes the composite `ST24-14 Yoshino Fujieda & Keenan Crier` while accepting the three standalone Yoshino printings.
- The inherited action is `WhenAttacking`, `isInherited: true`, `frequency: "OncePerTurn"`, and a mandatory `Restrict` on exactly one opponent-controlled Digimon with restriction `unsuspend` and duration `untilOpponentTurnEnd`. The production `durationForTarget` seam swaps the relative duration for an opponent-owned target, so it expires at that target's turn end; the restriction consumer blocks unsuspend attempts while active.
- Shared seams inspected: definition/name matching and loose hand targeting; `permanentCount` condition evaluation; `PlayWithoutCost` optional/preflight and effect-driven play; alternate and normal digivolution requirement validation/stack transition; inherited-effect collection and Once Per Turn ledger; `Restrict`/unsuspend legality; `durationForTarget` and continuous duration sweeps; and attack dispatch. Relevant peers inspected: BT26-034, BT26-035, BT26-036, BT26-038, BT26-041, BT26-042, BT13-054, BT19-060, and BT19-050 for adjacent DATA SQUAD evolution, Yoshino name targeting, Tamer thresholds, inherited attack triggers, and unsuspend restrictions.

### Behavioral proof and correction

- The audit found one real fidelity gap and corrected only this card: `match: "name"` treated the bracket-only `[Yoshino Fujieda]` reference as a substring and could therefore play the composite `ST24-14 Yoshino Fujieda & Keenan Crier`. The target now uses `match: "nameExact"`, and a focused negative case proves the composite remains in hand.
- `apps/api/src/cards/BT26/BT26-039.test.ts` now has 11 passing tests. It proves the compiled IR shape and exclusive registration path; exact alternate evolution and rejection of a near-match base; free Yoshino play with zero and one Tamer; exact selection among multiple standalone Yoshino printings; rejection at two Tamers and with no valid Yoshino; optional refusal; inherited targeting of an already suspended opponent Digimon; actual unsuspend blocking and expiry at the opponent's turn end; Once Per Turn behavior across two attacks; and source isolation when another ally attacks.
- The inherited duration test uses the production attack/effect path, attempts an effect-driven unsuspend while the lock is active, performs the owner-relative end-turn sweep for the opponent target, and confirms unsuspend succeeds only after expiry. The multiple-Yoshino test and composite-name negative case exercise both exact name boundaries and final hand/battle-area zones.

### Verification

```text
node tools/kb/query.mjs card BT26-039 --json
  PASS (qa: []; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-039.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-023.test.ts src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/cards/BT26/BT26-049.test.ts src/cards/BT26/BT26-051.test.ts src/cards/BT26/BT26-091.test.ts src/cards/BT26/BT26-094.test.ts src/cards/BT26/BT26-098.test.ts
  11 files passed (91 tests); 1 pre-existing unrelated failure in `BT26-098.test.ts` (fails identically when run alone: expected memory 0, received -2)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (9 files, 384 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-039.ts apps/api/src/cards/BT26/BT26-039.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-039.ts apps/api/src/cards/BT26/BT26-039.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-039 ambiguity or unsupported printed clause remains. Only `apps/api/src/cards/BT26/BT26-039.ts`, its colocated focused test, and this appended audit section were changed; no shared engine files were modified. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-039; the collection is not marked complete.

## BT26-040 — Drimogemon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-040` (`Drimogemon`), a green level-4 Champion/Data Digimon with play cost 5, 5000 DP, and `Beast`/`DM`/`Ver.3` traits. Its normal evolution requirement is green Lv.3 for cost 2, and its alternate requirement is `[Digivolve] Lv.3 w/[DM] trait: Cost 2`. The printed keywords are `＜Training＞` and `＜Piercing＞`. The main text is `[When Moving] [On Play] Suspend 1 of your opponent's Digimon. Then, by placing 1 card in your hand face down as this Digimon's bottom digivolution card, this Digimon gets +1000 DP until your opponent's turn ends for each of its face-down digivolution cards.` Its inherited text is `＜Piercing＞`; it has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-040 --json`; it returns `qa: []`, `banlist: null`, and `errata: null`. No card-specific ruling, erratum, or restriction remains to resolve.
- Comprehensive Rules evidence: §§2-3-5-1–3 and 8-1-1–3 define the alternate evolution requirement, requirement checking, payment, stack transition, and evolution draw; §§4-7-4, 4-7-9–10 define bottom-stack ordering, face-down information, and owner visibility; §§15-16-2-1 and 15-16-16-1 define On Play and When Moving; §15-7-1–5 covers mandatory/optional processing; §16-7-1–6 defines Piercing; and §16-41-1–3 defines Training. No unresolved card-specific ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-040.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers exactly once through `registerIrCard("BT26-040", compiled)` and has no `registerCard` registration.
- The alternate evolution requirement is exact (`level: 3`, `traits: ["DM"]`, `cost: 2`, `isAlternate: true`); the shared evolution path supplies the normal green Lv.3/cost-2 route and preserves requirement validation, cost payment, stack transition, and draw behavior.
- The printed `Training` and `Piercing` keywords are carried by a static effect; keyword registration synthesizes the standard Training activation, while the inherited static effect supplies Piercing to a host carrying Drimogemon. The combined `[When Moving] [On Play]` clause is represented by independent trigger entries sharing one action sequence.
- That sequence mandates `Suspend` of exactly one opponent-controlled Digimon, then offers the optional processing condition to place exactly one card from the controller's hand (with no kind restriction, matching “1 card”) face down at the bottom of this Digimon's stack. `ModifyDP` targets this Digimon, scales by every face-down card in its digivolution stack (including the newly placed card), and lasts through the opponent's turn end only when the placement acted.
- Shared seams inspected: alternate/normal evolution legality and stack transition; Training keyword synthesis and On Declaration activation; permanent targeting/controller/kind matching; `PlaceUnder` hand-zone selection, bottom ordering, face-down orientation, and acted receipt; face-down stack scaling; duration sweep; inherited keyword projection; Piercing combat processing; and the `WhenMoving` subject guard that scopes the trigger to the moved permanent. Relevant peers inspected: BT26-038, BT26-041, BT26-042, BT26-043, BT26-045, and BT26-077 for DM/TS evolution, suspend/DP, face-down stack, inherited Piercing, and Ver.3 trait interactions.

### Behavioral proof and correction

- The audit found two real fidelity gaps and kept only the necessary corrections: the hand placement had `kind: ["Digimon"]`, which incorrectly excluded Tamer, Option, and other non-Digimon cards despite the printed “1 card in your hand,” and the shared `WhenMoving` builder did not scope the event to its `movedPermanentId`. The card filter now scopes only to the controller's hand, and the reusable builder guard now rejects unrelated moves.
- `apps/api/src/cards/BT26/BT26-040.test.ts` has 11 passing tests. It proves both the printed green Lv.3 evolution and exact DM alternate evolution, plus rejection of a non-DM Lv.3 base; mandatory opponent-Digimon suspension while excluding a Tamer; placement of a non-Digimon Tamer card from hand; explicit refusal of the optional placement while the mandatory suspension still resolves; scaling from a pre-existing plus newly placed face-down stack; DP expiry at opponent turn end; self-only When Moving source behavior including rejection of an unrelated move; no buff with no hand card; Training activation; and inherited Piercing projection on a realistic evolution host.
- The mixed-board and stacked-source tests assert final zones, face-down state, exact DP totals (5000 + 2000 for two face-down cards), and no action rejection. The evolution-stack test confirms the Drimogemon transition from a real off-color DM base and the negative near-match. Shared Training and Piercing conformance suites provide the mechanism-level keyword proof.

### Verification

```text
node tools/kb/query.mjs card BT26-040 --json
  PASS (qa: []; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-040.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT24/BT24-034.test.ts src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-039.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts
  PASS (11 files, 405 tests)
pnpm --filter @aegis/api exec vitest run src/engine/actions/digivolve.test.ts src/engine/effects/digivolveCandidateLegality.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (4 files, 79 tests)
pnpm --filter @aegis/api exec vitest run <all 26 focused card suites containing WhenMoving> src/engine/conformance/ch15-04-continuous-and-static.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts
  27 files PASS (477 tests); 2 pre-existing unrelated failures in EX11-038 and EX11-048 (both expect undefined but receive [] for an empty digivolution-requirement list, reproduced in isolation)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-040.ts apps/api/src/cards/BT26/BT26-040.test.ts apps/api/src/engine/effects/builders.ts apps/api/src/engine/effects/interpreter/effect.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-040.ts apps/api/src/cards/BT26/BT26-040.test.ts apps/api/src/engine/effects/builders.ts apps/api/src/engine/effects/interpreter/effect.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-040 ambiguity or unsupported printed clause remains. `apps/api/src/cards/BT26/BT26-040.ts`, its colocated focused test, the reusable `WhenMoving` builder/interpreter seam, and this appended audit section were changed. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-040; the collection is not marked complete.

## BT26-041 — Hudiemon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-041` (`Hudiemon`), a green/yellow level-4 Champion/Free Digimon with play cost 4, 5000 DP, and `Insectoid`/`NSp` traits. Its normal evolution requirements are green Lv.3 for cost 3 and yellow Lv.3 for cost 3. The alternate requirement is `[Digivolve] Lv.3 w/[Larva]/[Insectoid]/[NSp] trait: Cost 2`. The main text is `[On Play] [When Digivolving] Add your top security card to the hand and ＜Recovery +1＞ Then, you may suspend 1 Digimon.` The inherited text is `[Your Turn] [Once Per Turn] When this Digimon wins a battle, gain 1 memory.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-041 --json`; it returns `qa: []`, `banlist: null`, and `errata: null`, with no card-specific ruling or restriction entry. No unresolved card-specific ambiguity remains.
- Comprehensive Rules evidence: §§2-3-5-1–3 and 8-1-1–3 define normal/alternate digivolution requirements, legality, payment, and stack transition; §§15-16-2-1 and 15-16-3-1 define On Play and When Digivolving; §§15-7-1–5 define mandatory/optional processing and ordered follow-up effects; §16-6-1–2 defines ＜Recovery＞; §§15-8-3-1–9 define trigger-type effects; §§15-14-1-1–5 define per-copy Once Per Turn limits and reset; and §§14-1–2 define battle winners. Face-down security placement follows the private-area rule in the official manual. These rules cover every printed clause.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-041.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers executable behavior exactly once via `registerIrCard("BT26-041", compiled)`; no `registerCard` registration exists.
- The compiled alternate requirement is exact (`level: 3`, `traits: ["Larva", "Insectoid", "NSp"]`, `cost: 2`, `isAlternate: true`). The shared card-data path supplies both normal catalog EvoCost rows and validates the level/color requirements, while the shared digivolution transition preserves the stack and evolution draw.
- The shared `action` sequence is installed independently for `OnPlay` and `WhenDigivolving`. It first moves exactly one card from the controller's top security to hand, then places one deck card face-down on top as Recovery +1, and finally offers an optional `Suspend` of exactly one Digimon with `controller: "any"`. The target is limited to Digimon and the optional action does not abort the mandatory recovery sequence.
- The inherited effect is a `YourTurn` persistent watcher with `frequency: "OncePerTurn"` and a `whenBattleWon` `SubTrigger`. `sourceFilter: { isSelfRef: true }` binds the event to the Hudiemon-bearing host, and the action gains exactly one memory.
- Shared seams inspected: `actions/security.ts` for top-security-to-hand ordering, deck Recovery, face-down placement, empty-security behavior, and optional-target handling; `actions/digivolve.ts` and card-data matching for normal/alternate legality and cost; `actions/subTrigger.ts` and the frequency ledger for host identity, turn scope, and Once Per Turn; permanent matching for any-controller Digimon-only target selection; and battle dispatch for winner timing. Relevant peers inspected: BT26-035, BT26-038, BT26-040, BT26-042, BT26-044, and BT26-045 for the same any-Digimon suspend vocabulary, inherited battle-win timing, adjacent trait evolution, and security/recovery primitives.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-041.test.ts` has 10 passing tests. It proves the exact alternate metadata and full IR shape; public On Play security handoff and Recovery with a Digimon-only target (excluding a Tamer); actual When Digivolving resolution from zero security; mandatory recovery after optional suspension refusal; all three alternate trait routes plus rejection of a red near-match; both normal green and yellow Lv.3 routes; inherited memory gain after the host wins; source isolation when another Digimon wins; and inherited Once Per Turn enforcement across two battles.
- The evolution scenarios use real digivolution intents and assert final host stacks, memory payment, and deck/security/hand zones. The recovery scenarios assert the old security card reaches hand, the new deck card is face-down security, and the first evolution draw remains in hand. The mixed target scenario proves a Tamer is not eligible, and the refusal scenario proves the optional suspend does not suppress the preceding mandatory effects.
- The inherited scenarios use a real stack containing Hudiemon, production attack resolution, a distinct ally-winner negative case, and two battle wins in one turn. All assertions are made after effect settlement.

### Verification

```text
node tools/kb/query.mjs card BT26-041 --json
  PASS (qa: []; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-041.test.ts
  PASS (1 file, 10 tests)
pnpm --filter @aegis/api exec vitest run src/cards/BT26/BT26-034.test.ts src/cards/BT26/BT26-035.test.ts src/cards/BT26/BT26-036.test.ts src/cards/BT26/BT26-037.test.ts src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-039.test.ts src/cards/BT26/BT26-040.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/subtriggers.test.ts src/engine/actions/digivolve.test.ts src/engine/effects/digivolveCandidateLegality.test.ts
  PASS (13 files, 323 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-041.ts apps/api/src/cards/BT26/BT26-041.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-041.ts apps/api/src/cards/BT26/BT26-041.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-041 ambiguity or unsupported printed clause remains. Only the colocated focused test and this appended audit section were changed; the card implementation and shared engine required no correction. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-041; the collection is not marked complete.

## BT26-042 — Okuwamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-042` (`Okuwamon`), a green level-5 Ultimate Digimon with play cost 7, 7000 DP, Virus attribute, and `Insectoid`/`Titan`/`TS` traits. Its normal evolution requirement is green Lv.4 for cost 3. Its alternate requirement is `[Digivolve] Lv.4 w/[TS] trait: Cost 3`. The main text is `[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, 1 of their Digimon or Tamers can't unsuspend until their turn ends.` The second main clause is `[On Play] [When Attacking] [Once Per Turn] Until your opponent's turn ends, 1 of your [Insectoid] or [Titan] trait Digimon gains ＜Piercing＞ and +3000 DP.` The inherited text is `[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in battle, trash their top security card.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-042 --json`; it returns Q7031–Q7033, with no banlist restriction or erratum. Q7031 confirms that the second Digimon/Tamer need not be the card suspended by the first clause. Q7032 confirms that the inherited effect cannot activate when this Digimon and the opponent's Digimon are deleted simultaneously. Q7033 confirms that the two On Play effects trigger simultaneously and the controller chooses their activation order.
- Comprehensive Rules evidence: §§2-3-5-1–3 and 8-1-1–3 define normal/alternate evolution requirements, payment, and stack transition; §§15-7-1–5 define ordered processing and independent target selection; §§15-14-1-1–5 define Once Per Turn counting, per-copy identity, and reset; §§15-16-2-1, 15-16-3-1, 15-16-5-1, and 15-16-9-1 define On Play, When Digivolving, When Attacking, and All Turns timing; §§14-1–2 define battle winners, deletion, simultaneous deletion, and battle-trigger resolution; and §§16-7-1–6 define Piercing's mandatory security check. The target and duration rules in §§4-13, 15-15, and 15-16 cover suspended state, selected-target persistence, and the opponent-turn-end boundary. These sources cover every printed clause and the three card-specific rulings.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-042.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers executable behavior exactly once through `registerIrCard("BT26-042", compiled)`; no `registerCard` registration exists.
- The alternate requirement is exact (`level: 4`, `traits: ["TS"]`, `cost: 3`, `isAlternate: true`), while the catalog supplies the normal green Lv.4/cost-3 route. The shared digivolution legality path validates both routes, pays the selected cost, and preserves the evolution stack.
- The first clause is installed independently for On Play and When Digivolving. It suspends exactly one opponent-controlled Digimon or Tamer, then resolves a fresh, independent target selection for exactly one opponent-controlled Digimon or Tamer and installs an `unsuspend` restriction through the opponent's turn end. The separate target object and duration mapping preserve Q7031.
- The second clause is installed independently for On Play and When Attacking with `frequency: "OncePerTurn"` and shared key `bt26-042-piercing-dp`, so either timing consumes the same per-copy turn budget while separate Okuwamon copies remain independent. Its target is exactly one own Digimon with the OR trait filter `Insectoid`/`Titan`; `GainKeyword(Piercing)` and `ModifyDP(+3000)` both last until the opponent's turn end.
- The inherited clause is an All Turns, Once Per Turn `whenDeletesInBattle` SubTrigger with `sourceFilter: { isSelfRef: true }`. Shared subtrigger identity binds the event to the Okuwamon-bearing host, while the combat controller publishes the event only when the winner survives and the opponent's Digimon is deleted. `SecurityManipulation(trashTop, controller: "opponent")` then removes exactly one opponent security card.
- Shared seams inspected: alternate/normal evolution legality and stack transition; independent target resolution, `Restrict`/unsuspend enforcement, `durationForTarget`, and turn-end cleanup; `GainKeyword`/`ModifyDP` targeting and Piercing combat consumption; shared Once Per Turn keys; simultaneous On Play trigger ordering; inherited-host identity; and the battle deletion/security dispatch. Relevant peers inspected: BT26-038, BT26-041, BT26-043, BT26-044, BT26-045, BT26-049, BT26-051, BT26-066, and BT1/BT9 Okuwamon implementations for TS evolution, mixed Digimon/Tamer targets, Insectoid/Titan matching, shared attack limits, inherited battle deletion, and Piercing/security behavior.

### Behavioral proof and correction

- The implementation was already faithful; no card or shared-engine correction was required. The audit added only two focused proof cases that were missing from the prior suite: a real normal green Lv.4 evolution and a real own attack that activates the When Attacking buff. The existing proof already covers alternate evolution rejection, independent Q7031 target selection, Q7033 trigger ordering, shared On Play/When Attacking Once Per Turn behavior, target-copy independence, Q7032 simultaneous deletion, surviving-host security trash, and source isolation.
- `apps/api/src/cards/BT26/BT26-042.test.ts` now has 11 passing tests. It asserts exact alternate metadata and full IR shape; executes both evolution paths; resolves the mixed opponent Digimon/Tamer On Play body; independently locks a different target; observes simultaneous On Play ordering; proves shared and per-copy Once Per Turn behavior; executes the When Attacking clause through a real attack and checks +3000/Piercing; and verifies inherited security trash only for a surviving Okuwamon host that deletes in battle.
- The focused scenarios use public intents, `advance`, `settle()`, and observable final state. They assert exact memory payment, stack transition, suspension/restriction state, DP totals, Piercing projection, security/trash zones, and no activation after simultaneous host deletion or an unrelated ally's battle.

### Verification

```text
node tools/kb/query.mjs card BT26-042 --json
  PASS (qa: Q7031–Q7033; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run --pool=forks --poolOptions.forks.singleFork=true src/cards/BT26/BT26-042.test.ts
  PASS (1 file, 11 tests)
pnpm --filter @aegis/api exec vitest run --pool=forks --poolOptions.forks.singleFork=true src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-043.test.ts src/cards/BT26/BT26-044.test.ts src/cards/BT26/BT26-045.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts src/engine/effects/restrictionEnforcement.test.ts src/engine/security/securityCheck.test.ts src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts
  PASS (12 files, 446 tests)
pnpm typecheck
  PASS (shared build, shared/API/web typecheck)
pnpm exec oxlint apps/api/src/cards/BT26/BT26-042.ts apps/api/src/cards/BT26/BT26-042.test.ts
  PASS
pnpm exec oxfmt --check apps/api/src/cards/BT26/BT26-042.ts apps/api/src/cards/BT26/BT26-042.test.ts
  PASS
git diff --check
  PASS
```

No unresolved BT26-042 ambiguity or unsupported printed clause remains. Only the colocated focused test and this appended audit section were changed; the card implementation and shared engine required no correction. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-042; the collection is not marked complete.

## BT26-043 — Piximon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-043` (`Piximon`), a green level-5 Ultimate/Data Digimon with play cost 6, 6000 DP, and `Fairy`/`DM`/`Ver.4` traits. Its normal evolution requirement is green Lv.4 for cost 3, and its alternate requirement is `[Digivolve] Lv.4 w/[DM] trait: Cost 3`. The printed keyword is `＜Blocker＞`. The main text is `[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon or Tamers. Then, by placing your deck's top card face down as this Digimon's bottom digivolution card, for each of this Digimon's face-down digivolution cards, 1 of your opponent's Digimon or Tamers can't unsuspend until their turn ends.` The inherited text is `[All Turns] [Once Per Turn] When any of your Digimon are played, you may suspend 1 of your opponent's Digimon.` It has no Security text.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-043`; it returns Q7034 only. Q7034 confirms that the `can't unsuspend` target may be a card that was not suspended by Piximon's preceding action; no banlist restriction or erratum applies.
- Comprehensive Rules evidence: §§2-3-5-1–3 and 8-1-1–3 define normal/alternate evolution requirements, payment, stack transition, and evolution draw; §§4-7-3–10 define stack ordering and face-down information; §§4-13-1-1–2 define unsuspended/suspended orientation; §§15-7-1–5 define optional processing; §§15-8-3-1–9 define triggered-effect timing and state references; §§15-14-1-1–5 define Once Per Turn identity/reset; §§15-16-2-1, 15-16-3-1, 15-16-9-1, and 15-16-5-1 define On Play, When Digivolving, All Turns, and When Attacking timings; and §16-5 defines Blocker. No unresolved card-specific ambiguity remains.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-043.ts` is compiled IR with `coverage: "full"` and `residual: []`. It registers executable behavior exactly once through `registerIrCard("BT26-043", compiled)`; no `registerCard` registration exists.
- The alternate evolution requirement is exact (`level: 4`, `traits: ["DM"]`, `cost: 3`, `isAlternate: true`), while the catalog supplies the normal green Lv.4/cost-3 route. Shared digivolution legality validates both routes, pays the selected cost, preserves the stack, and fires When Digivolving after the transition.
- The shared On Play/When Digivolving sequence mandates exactly one opponent Digimon or Tamer suspension, places the own deck top face down at the bottom of Piximon's stack, then scales an independent opponent Digimon/Tamer `unsuspend` restriction by Piximon's live face-down stack count through the opponent's turn end. The separate target object preserves Q7034.
- The inherited effect is an All Turns, Once Per Turn `whenPlayed` SubTrigger scoped to own Digimon plays; its optional action suspends exactly one opponent Digimon. Shared SubTrigger identity, optional decision handling, target resolution, face-down stack counting, restriction enforcement, and turn-duration cleanup were inspected. Relevant peers: BT26-040, BT26-041, BT26-042, BT26-044, BT26-045, and BT26-077 for DM evolution, mixed Digimon/Tamer targeting, face-down scaling, inherited play watchers, and Blocker/stack behavior.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-043.test.ts` has 6 passing tests. It proves the exact alternate metadata and full IR shape; public On Play suspension, deck-top face-down placement, and scaled lock; a real normal green Lv.4/cost-3 evolution including the new face-down stack card; independent Q7034 target selection including a Tamer; a real inherited suspension from another Digimon play; and refusal of that optional inherited action.
- The scaled case selects a different target from the one suspended and confirms the suspended target is not locked while each independently chosen Digimon/Tamer is locked. The real evolution fixture retains a second deck card after the mandatory evolution draw, proving the printed placement and restriction path rather than only metadata.

### Verification

```text
node tools/kb/query.mjs card BT26-043
  PASS (Q7034; banlist: null; errata: null)
pnpm --filter @aegis/api exec vitest run --pool=forks --poolOptions.forks.singleFork=true src/cards/BT26/BT26-043.test.ts
  PASS (1 file, 6 tests)
pnpm --filter @aegis/api exec vitest run --pool=forks --poolOptions.forks.singleFork=true src/cards/BT26/BT26-038.test.ts src/cards/BT26/BT26-039.test.ts src/cards/BT26/BT26-040.test.ts src/cards/BT26/BT26-041.test.ts src/cards/BT26/BT26-042.test.ts src/cards/BT26/BT26-043.test.ts src/cards/BT26/BT26-044.test.ts src/cards/BT26/BT26-045.test.ts src/engine/effects/interpreter.test.ts src/engine/effects/primitives.test.ts src/engine/effects/subtriggers.test.ts src/engine/effects/restrictionEnforcement.test.ts src/engine/actions/digivolve.test.ts src/engine/effects/digivolveCandidateLegality.test.ts
  PASS (14 files, 464 tests)
typecheck, Oxlint/Oxfmt, and git diff --check
  Not rerun after the focused/regression gates per instruction to stop additional commands; no implementation/shared-engine files changed.
```

No unresolved BT26-043 ambiguity or unsupported printed clause remains. Only `apps/api/src/cards/BT26/BT26-043.test.ts` and this appended audit section were changed; the implementation and shared engine required no correction. Changes are intentionally uncommitted and unpushed, and this audit is limited to BT26-043; the collection is not marked complete.

## BT26-044 — Lilamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-044` (`Lilamon`), a green level-5 Ultimate/Data Digimon with play cost 7, 7000 DP, and `Fairy`/`DATA SQUAD` traits. Its normal evolution requirement is green Lv.4 for cost 3, and its alternate requirement is `[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3`.
- Printed behavior verified: the On Play/When Digivolving optional suspension and independent unsuspend restriction; the Your Turn/Once Per Turn reaction to an opponent Digimon/Tamer suspending or an effect trashing cards from under an own Tamer; the optional hand evolution into a `Vegetation`, `Fairy`, or `DATA SQUAD` Digimon with cost reduced by 1; and inherited leave prevention for a `Rosemon`-named or `DATA SQUAD` Digimon by trashing the bottom face-down card under an own Tamer.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-044`; Q7035 confirms that the unsuspend-restriction target may differ from the card suspended by the preceding process. No banlist restriction, erratum, or unresolved ambiguity applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-044.ts` has `coverage: "full"`, `residual: []`, and registers executable behavior exclusively through `registerIrCard("BT26-044", compiled)`.
- Separate On Play and When Digivolving action sequences independently resolve the optional suspension and mandatory restriction targets, preserving Q7035.
- The Your Turn watcher shares one Once Per Turn budget across `whenSuspended` for opposing Digimon/Tamers and `whenDigivolutionTrashed` with `byEffect: true` for own Tamer stacks. Its optional hand evolution targets Lilamon itself, OR-matches all three printed traits, pays the legal evolution cost with `costDelta: -1`, and aborts cleanly on refusal.
- The inherited `wouldLeavePlay` replacement is optional, source-bound, limited to a `Rosemon` name match or `DATA SQUAD` trait, and pays the exact `trashBottomFaceDownUnderTamer` cost. The relevant suspension, subtrigger, evolution, replacement, and face-down Tamer-stack primitives and adjacent BT26 peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-044.test.ts` covers the alternate evolution metadata, complete IR shape, public On Play suspension/lock, independent Q7035 targets, reactive reduced-cost evolution from both printed event families, and inherited leave prevention with the final cost card in trash.
- The focused fixtures exercise real hand evolution, opponent suspension, effect-driven Tamer-stack trash, face-down cost selection, final memory, stack identity, restriction state, and prevention outcome. No implementation or proof gap requiring a new test was found.

### Verification

```text
node tools/kb/query.mjs card BT26-044
  PASS (Q7035; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-044 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-045 — GranKuwagamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-045` (`GranKuwagamon`), a green level-6 Mega/Free Digimon with play cost 11, 11000 DP, and `Insectoid`/`Titan`/`TS` traits. Its normal evolution requirement is green Lv.5 for cost 3, and its alternate requirement is `[Digivolve] Lv.5 w/[Insectoid]/[TS] trait: Cost 3`.
- Printed behavior verified: a hand-size-dependent self play-cost reduction of 4; a shared On Play/When Digivolving/When Attacking Once Per Turn optional free play of one level-4-or-lower `Insectoid` or `Titan` Digimon from hand; and Your Turn grants of Alliance, Piercing, and Vortex to all own `Insectoid`/`Titan` Digimon.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-045`; Q7036–Q7037 confirm the strict hand comparison and announcement timing, Q7038 confirms that the newly played Digimon may be suspended for Alliance, and Q7077 confirms stacking the relevant play-cost reductions. No banlist restriction or erratum applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-045.ts` has `coverage: "full"`, `residual: []`, and registers executable behavior exclusively through `registerIrCard("BT26-045", compiled)`.
- The self-bound `wouldBePlayed` replacement applies `reduceCost: 4` only when `handCompare` is strictly `lt`; the shared reducer path evaluates while the declared card is still in hand and does not apply to play from another zone, matching Q7036–Q7037.
- On Play, When Digivolving, and When Attacking use one shared Once Per Turn key and the same optional hand-only free-play action, limited to Digimon level 4 or lower and OR-matching `Insectoid`/`Titan`.
- The Your Turn continuous body targets all own matching Digimon and grants Alliance, Piercing, and Vortex through the turn-scoped keyword ledger. The newly played permanent enters before Alliance candidate resolution, preserving Q7038. Cost-reducer registration, hand comparison, free play, keyword projection, Alliance timing, and adjacent trait peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-045.test.ts` covers the exact alternate requirement and complete IR shape; public projection of all three keywords; reduced and tied-hand play-cost cases for Q7036–Q7037; and a real attack that free-plays an eligible Digimon, exposes it to the Alliance prompt, and proves the shared Once Per Turn budget prevents a second On Play activation.
- The focused proof asserts final memory, battle-area/hand state, the newly played permanent's keyword state, Alliance eligibility, suspension, and the retained second candidate. Shared reducer and combat primitives cover the Q7077 stacking mechanism. No implementation or proof gap requiring a new test was found.

### Verification

```text
node tools/kb/query.mjs card BT26-045
  PASS (Q7036–Q7038, Q7077; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-045 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-046 — Gryphonmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-046` (`Gryphonmon`), a green/blue level-6 Mega/Data Digimon with play cost 11, 11000 DP, and `Mythical Beast`/`Iliad`/`TS` traits. Its normal evolution requirements are green or blue Lv.5 for cost 3, and its alternate requirement is `[Digivolve] Lv.5 w/[TS] trait: Cost 3`. The printed keywords are Piercing and Vortex. The card reduces its play cost by 4 when there are 2 or more suspended Digimon, then its On Play/When Digivolving clause suspends one opponent Digimon or Tamer, independently restricts one such card from unsuspending, and protects one own Digimon from battle deletion. Its Rule clause adds the `Avian` trait.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-046`; Q7039 confirms that the card receiving the unsuspend restriction need not be the card suspended by the preceding action. No banlist restriction or erratum applies.
- Comprehensive Rules evidence reviewed: normal/alternate evolution and stack transition; suspension orientation and ordered processing; numerical cost reduction; On Play/When Digivolving timing; battle deletion; Piercing; and Vortex.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-046.ts` has `coverage: "full"`, `residual: []`, and registers executable behavior exclusively through `registerIrCard("BT26-046", compiled)`.
- The alternate requirement exactly matches Lv.5 `TS` for cost 3, while catalog data supplies both normal color routes. The self-bound `wouldBePlayed` replacement applies reduction 4 under `totalDigimonGte` with suspended-only matching; registration extracts this allowlisted reducer for normal payment and counts Digimon across both battle areas while excluding Tamers.
- On Play and When Digivolving share the ordered body with separate opponent target objects for suspension and restriction, preserving Q7039, followed by battle-deletion protection for exactly one own Digimon.
- Static keyword projection carries Piercing/Vortex, and `GrantStatic` adds the effective `Avian` trait. The reducer, restriction, protection, keyword, evolution, and adjacent peer seams were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-046.test.ts` contains 4 focused tests proving the alternate metadata and IR shape; public On Play resolution with independent opponent targets and real battle-deletion protection; the exact 4-cost reduction with two suspended Digimon; and the negative one-suspended-Digimon boundary.
- The proof observes suspension, restriction, protection, battle survival, and exact memory movement. Shared card-data coverage verifies the effective Rule trait. No implementation or proof gap requiring a new test was found.

### Verification

```text
node tools/kb/query.mjs card BT26-046
  PASS (Q7039; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-046 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-047 — TyrantKabuterimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-047` (`TyrantKabuterimon`), a green level-6 Mega/Virus Digimon with `Insectoid`/`Titan`/`TS` traits. Its alternate evolution is Lv.5 with `Insectoid` or `TS` for cost 3, and Assembly -6 requires four `Larva`/`Insectoid`/`Titan` Digimon cards with different levels.
- Printed effects verified: optional immediate battle on On Play/When Digivolving; and an optional Start of Your Main Phase/On Play/When Digivolving suspend cost that gives all own suspended `Insectoid`/`Titan` Digimon +3000 DP and immunity to opposing Option effects until the opponent's turn ends.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-047`; Q7040–Q7041 cover immediate battle and effect-immune defenders, Q7042 permits either player's Digimon as the suspend cost, Q7043 covers simultaneous trigger ordering, and Q7044–Q7049 define dynamic effect immunity, targetability, granted effects, and trigger behavior. No erratum or restriction applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-047.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-047", compiled)`.
- Separate optional `Battle` actions use TyrantKabuterimon itself as attacker and one opponent Digimon as defender, preserving standard battle rules and Q7040–Q7041.
- Separate `CostGatedBlock` effects suspend one unsuspended Digimon controlled by either player. Their payload targets all own suspended `Insectoid`/`Titan` Digimon, applies `beAffected` immunity only from opposing Option effects, and grants +3000 DP through the opponent's turn end.
- The alternate evolution and Assembly metadata exactly encode the printed trait, count, reduction, and distinct-level requirements. The combat, suspend-cost, immunity, modifier, Assembly, and evolution seams and peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-047.test.ts` now covers alternate Lv.5 TS evolution for cost 3; positive Assembly using four matching different-level materials with reduction, final zones, face state, and stack order; rejection of repeated-level Assembly; refusal of both optional On Play effects; immediate battle against an effect-immune Digimon; either-controller suspension cost; opposing-Option immunity and DP gain; Q7043 ordering; and Q7046–Q7049 dynamic immunity/granted-effect behavior.
- The new cases close real proof gaps for the printed Assembly and optional paths; the production module required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-047
  PASS (Q7040–Q7049; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-047 ambiguity or unsupported printed clause remains. Only the colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-048 — BloomLordmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-048` (`BloomLordmon`), a green/yellow level-6 Mega/Vaccine Digimon with play cost 12, 12000 DP, and `Fairy`/`DM`/`Ver.4` traits. Its normal evolution requirements are green or yellow Lv.5 for cost 4, and its alternate requirement is `[Digivolve] Lv.5 w/[DM] trait: Cost 3`.
- Printed behavior verified: Alliance and Vortex; a shared When Digivolving/When Attacking optional cost that trashes the bottom face-down digivolution card of any own Digimon, then may play one 6000-DP-or-lower `Ver.4` Digimon from hand without cost; and an All Turns reaction that gives one opposing Digimon -6000 DP for the turn when effects trash face-down digivolution cards from an own Digimon.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-048`; Q7050 confirms that simultaneously trashing multiple qualifying cards produces one activation, and Q7051 confirms that a Digimon played during When Attacking may participate in Alliance for that attack. No banlist restriction or erratum applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-048.ts` has `coverage: "full"`, `residual: []`, and registers executable behavior exclusively through `registerIrCard("BT26-048", compiled)`.
- Static keyword projection supplies Alliance and Vortex. When Digivolving and When Attacking share an optional `CostGatedBlock`; its cost selects the bottom face-down card under any own Digimon, and its hand-only `PlayWithoutCost` filter requires a Digimon with at most 6000 DP and the `Ver.4` trait.
- The All Turns watcher uses the batched digivolution-card discard event, scopes the affected source to an own Digimon, requires at least one face-down card in the batch, and now requires effect attribution. The single batch event preserves Q7050, while normal attack timing preserves Q7051.
- Alternate evolution, cost gating, bottom-card/face-state handling, batched subtrigger filtering, DP modification duration, Alliance timing, and adjacent implementations were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-048.test.ts` covers alternate evolution metadata and full IR shape; the qualifying trash-and-play path and 6000-DP ceiling; optional decline; rejection of a face-up bottom card; the real When Attacking route and Alliance availability; one activation for a multi-card batch; and rejection of face-up, opponent-owned, and non-effect stack trash.
- The newly added non-effect case exposes the implementation defect that the watcher previously accepted rule/non-effect trash. Adding `requireByEffect: true` closes that gap without changing the qualifying effect-driven path.

### Verification

```text
node tools/kb/query.mjs card BT26-048
  PASS (Q7050-Q7051; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-048 ambiguity or unsupported printed clause remains. Only the direct IR module, its colocated focused test, and this ledger section changed; the shared engine remains unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-049 — Rosemon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-049` (`Rosemon`), a green level-6 Mega/Data Digimon with play cost 12, 12000 DP, and `Fairy`/`DATA SQUAD` traits. Its normal evolution requirement is green Lv.5 for cost 4. Its alternate requirements are `[Digivolve] [Lilamon]: Cost 3` and `[Digivolve] Lv.5 w/[DATA SQUAD] trait: Cost 3`.
- Printed behavior verified: When Digivolving/When Attacking Once Per Turn suspends two opposing Digimon or Tamers; and All Turns Once Per Turn, when an opposing Digimon/Tamer suspends or effects trash cards from under an own Tamer, may play or use a cost-3-or-lower `DATA SQUAD` card from hand without paying, increasing the ceiling by 1 for every suspended Digimon or Tamer.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-049 --json`; result has no Q&A, banlist entry, or erratum.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-049.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-049", compiled)`.
- The exact alternate requirements are encoded. When Digivolving and When Attacking each suspend exactly two opponent Digimon/Tamers and share one Once Per Turn key.
- The All Turns watcher has opponent-suspension and effect-attributed own-Tamer-stack-trash routes under one Once Per Turn budget. Both resolve the same optional hand modal for a `DATA SQUAD` Digimon/Tamer play or Option use, with a dynamic base-3 ceiling raised for suspended Digimon/Tamers across both players.
- Suspension batching, effect attribution, dynamic cost ceilings, modal play/use, optional handling, Once Per Turn accounting, and relevant peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-049.test.ts` now contains 7 focused cases covering alternate metadata/IR shape; raised and boundary ceilings; optional refusal without consuming the budget; shared All Turns timing budget; a positive `DATA SQUAD` Digimon play after effect-driven trash under an own Tamer; and the shared When Digivolving/When Attacking suspend budget.
- The added positive Tamer-trash case uses the real trash primitive with effect attribution, observes the stacked card in trash, and confirms the eligible cost-5 Digimon is played under the two-suspended-permanent ceiling. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-049 --json
  PASS (qa: []; banlist: null; errata: null)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-049 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-050 — Rosemon: Burst Mode — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-050` (`Rosemon: Burst Mode`), a green/red dual card represented as a level-7 Digimon/Option with play/use cost 6 and 15000 DP. It has normal green Lv.6 evolution, alternate Lv.6 `DATA SQUAD` evolution for cost 5, and Burst Digivolve from `Rosemon` for cost 0 by returning `Yoshino Fujieda`.
- Printed Digimon behavior verified: When Digivolving may suspend two Digimon/Tamers, then independently prevents two opposing Digimon/Tamers from unsuspending through the opponent's turn; and When Digivolving/When Attacking may return one suspended opposing Digimon to deck bottom, then trash the opponent's top security. Its Option Main effect suspends all opposing Digimon/Tamers and prevents them from unsuspending through the opponent's turn.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-050`; Q7052–Q7053 confirm either player's cards may be suspended and the opposing cards locked need not be those suspended, Q7054 confirms standard Burst Digivolve end-of-turn trash, and Q7055 confirms simultaneous When Digivolving ordering. No erratum or restriction applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-050.ts` has full IR coverage and registers exclusively through `registerIrCard("BT26-050", compiled)`.
- Independent When Digivolving actions preserve the Q7052/Q7053 selections. The shared When Digivolving/When Attacking sequence conditionally returns one suspended opposing Digimon to deck bottom and trashes top security only when that return succeeds.
- The `DATA SQUAD` use-requirement waiver, Option Main mass suspension/restriction, alternate evolution, and Burst Digivolve requirement/return cost are encoded. Duration, optional/conditional processing, dual Digimon/Option use, Burst cleanup, and peer implementations were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-050.test.ts` covers structural encoding; When Digivolving return/trash; the newly added real When Attacking return-then-trash route and decline guard; Q7052/Q7053 independent suspension/locking; Q7055 trigger ordering; `DATA SQUAD` Option use; and Q7054 Burst Digivolve end-of-turn processing.
- The positive case observes the opposing permanent leave play, reach deck bottom, and security become empty. The decline case proves security is not trashed when the optional prerequisite return is refused. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-050
  PASS (Q7052-Q7055; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-050 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-051 — Gomimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-051` (`Gomimon`), a black level-3 Digimon with play cost 4, 4000 DP, and `Tool`/`Trashbin (App Name)`/`Seven Code` traits. It may evolve from a level-2 `Appmon` for cost 0 and link to an `Appmon` trait card for cost 3.
- Printed behavior verified: Detach with a `Seven Code` trait restriction; Your Turn Once Per Turn, when an effect links a card to an own Digimon, one own `Social`/`Tool`/`Open`/`Seven Code` Digimon gains Collision and +3000 DP for the turn; and its linked effect De-Digivolves one opposing Digimon by 2 at the same timing.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-051`; no card-specific Q&A, banlist restriction, or erratum is recorded. Link/linked-card state, When Linking timing, Once Per Turn, Collision, and De-Digivolve rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-051.ts` has complete compiled IR and registers exclusively through `registerIrCard("BT26-051", compiled)`.
- Detach is restricted to the printed `Seven Code` trait. The Your Turn `whenLinked` watcher has one Once Per Turn budget and binds exactly one own Digimon matching the printed OR-trait list before granting Collision and +3000 DP for the turn.
- The linked-card face carries the effect-attributed When Linking reaction and applies De-Digivolve 2 to one opposing Digimon. Alternate evolution and Link requirements match the catalog. Link-event attribution, linked-face projection, target binding, keyword/DP duration, and neighboring Appmon implementations were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-051.test.ts` covers evolution and Link requirements, Detach publication, granting Collision/+3000 DP to exactly one matching recipient while excluding a non-matching Digimon, linked-face De-Digivolve 2, and Once Per Turn enforcement across repeated link events.
- The existing proof is sufficient for each printed clause; no implementation or test change was required.

### Verification

```text
node tools/kb/query.mjs card BT26-051
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-051 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-052 — Pristimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-052` (`Pristimon`), a black level-3 Rookie/Vaccine Digimon with play cost 3, 2000 DP, and `Puppet`/`Glowing Dawn`/`BEATBREAK` traits. Its normal evolution is black Lv.2 for cost 0, and its alternate requirement is Lv.2 with `Glowing Dawn` for cost 0.
- Printed behavior verified: On Play reveals the top three cards, adds one `Glowing Dawn` card and one black `BEATBREAK` card among them to hand, and returns the rest to deck bottom. Its inherited keyword is Reboot.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-052 --json`; result has no Q&A, banlist entry, or erratum. Reveal disposition/order, alternate evolution, inherited effects, and Reboot rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-052.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-052", compiled)`.
- The alternate requirement is exact. On Play uses `RevealAdd` with count 3, independent `Glowing Dawn` and black-plus-`BEATBREAK` hand slots, and deck-bottom disposition for the remainder.
- The shared reveal primitive prevents one revealed instance from satisfying both slots, exposes the reveal, moves selected cards to hand, and lets the controller order the remainder. The inherited Static marker projects Reboot through the evolution host. Relevant reveal, filter, evolution, stack, keyword, and peer implementations were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-052.test.ts` contains 5 focused cases covering exact alternate metadata/IR shape; the two independent additions and bottomed remainder; non-reuse of one overlapping revealed card; real zero-cost alternate evolution from a differently colored `Glowing Dawn` Lv.2; and inherited Reboot projection on the host.
- Final zones, stack transition, exact memory payment, instance exclusivity, and inherited keyword state are asserted. No implementation or proof gap requiring a change was found.

### Verification

```text
node tools/kb/query.mjs card BT26-052 --json
  PASS (qa: []; banlist: null; errata: null)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-052 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-053 — Wolvermon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-053` (`Wolvermon`), a black level-4 Digimon with play cost 5, 5000 DP, an alternate evolution from a level-3 `Glowing Dawn` Digimon for cost 2, and Blocker on both its main and inherited faces.
- Printed behavior verified: All Turns Once Per Turn, when an attack target is switched, may trash the bottom face-down card under any own Tamer to use one use-cost-4-or-lower `Glowing Dawn` Option from hand without paying.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-053`; no card-specific Q&A, banlist restriction, or erratum is recorded. Attack-target switching, use cost, face-down Tamer stacks, optional cost processing, and Blocker rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-053.ts` has full IR coverage and registers exclusively through `registerIrCard("BT26-053", compiled)`.
- Its All Turns Once Per Turn watcher reacts to `whenAttackTargetSwitched`; the optional cost trashes exactly one bottom face-down card under any own Tamer; and `UseOptionWithoutCost` restricts the hand selection to an Option with use/play cost at most 4 and the `Glowing Dawn` trait.
- Blocker is projected on the top card and inherited through the evolution stack. Alternate evolution, cost-gated execution, face-state/bottom selection, Option-use filtering, and relevant peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-053.test.ts` now covers full structural filters; target-switch positive behavior and exact face-down Tamer-bottom cost; unavailable-cost and no-eligible-Option paths; Once Per Turn; Blocker inheritance; real alternate-evolution success and rejection; and mixed valid, over-cost, and wrong-trait Options.
- The new cases prove the exact alternate route and the inclusive cost-4/trait boundary through real execution. The production module required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-053
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-053 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-054 — Andromon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-054` (`Andromon`), a black/yellow level-5 Digimon with play cost 7, 7000 DP, and `Cyborg`/`CS` traits. Its alternate evolution is from a level-4 `CS` Digimon for cost 3.
- Printed behavior verified: On Play/When Digivolving may play one `CS` Tamer from hand without cost if no own Tamer has the same name; All Turns Once Per Turn, when an effect places a `CS` Digimon into this Digimon's digivolution cards, may evolve it into a `CS` Digimon from hand without cost; and its inherited Opponent's Turn Once Per Turn effect may redirect an attack to this Digimon.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-054`; no card-specific Q&A, banlist restriction, or erratum is recorded. Tamer-name uniqueness, effect-attributed stack placement, free evolution, Link/evolution timing, and inherited redirection rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-054.ts` has full compiled IR coverage and registers exclusively through `registerIrCard("BT26-054", compiled)`.
- Both play windows now use `excludeSameNameAsOwnTamers: true`, correctly comparing candidate names only against own Tamers. The prior `notSameNameAs: ["battleArea"]` compared against every own permanent and could incorrectly reject a Tamer whose name matched an own Digimon.
- The All Turns watcher is self-host scoped, requires effect attribution and a placed `CS` Digimon, and offers a free hand evolution into `CS` under one Once Per Turn budget. The inherited watcher offers optional redirection during the opponent's turn. Name filtering, stack-add provenance, free evolution, redirection, and relevant peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-054.test.ts` covers structural encoding with the exact Tamer-only name exclusion; eligible `CS` Tamer play and duplicate-Tamer rejection; effect-attributed and unattributed stack-add behavior; free `CS` evolution; Once Per Turn handling; and inherited attack redirection.
- The tightened structural assertions guard both On Play and When Digivolving against reintroducing the overly broad battle-area comparison. The implementation correction uses an existing engine primitive already behaviorally exercised by neighboring cards.

### Verification

```text
node tools/kb/query.mjs card BT26-054
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-054 ambiguity or unsupported printed clause remains. Only the direct IR module, its colocated focused test, and this ledger section changed; the shared engine remains unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-055 — Giromon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-055` (`Giromon`), a black level-5 Digimon with play cost 7, 7000 DP, and alternate evolution from a level-4 `DM` Digimon for cost 3. Its printed bodies are Fragment (2), a shared On Play/When Digivolving/Counter Once Per Turn effect, and an inherited All Turns leave-play security effect.
- The shared body optionally places one hand card face down at this Digimon's stack bottom, then independently may delete one own `Ver.3` Digimon to delete all opposing Digimon tied for lowest play cost. The inherited effect trashes the opponent's top security when this Digimon leaves play.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-055`; Q7058 confirms only one Counter effect may activate during an attack. Optional sequencing, lowest-cost ties, Fragment, leave-play timing, and Counter limits were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-055.ts` has full compiled IR coverage and registers exclusively through `registerIrCard("BT26-055", compiled)`.
- On Play, When Digivolving, and Counter share one Once Per Turn body. It independently models optional face-down bottom placement and optional bound deletion of an own `Ver.3`, then deletes all opposing lowest-play-cost Digimon.
- Fragment (2), the inherited self leave-play watcher, alternate evolution, target binding, optional processing, superlative selection, and relevant peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-055.test.ts` covers structural mapping; inherited security trash; positive own/opponent deletion processing; shared timing budget; Fragment combat survival; Q7058 Counter exclusivity; and the newly added positive hand placement route.
- The added case accepts placement, independently declines deletion, and proves the selected instance enters the source's stack bottom face down. The production module required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-055
  PASS (Q7058; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-055 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-056 — Cerberusmon: Werewolf Mode — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-056` (`Cerberusmon: Werewolf Mode`), a black/purple level-5 dual Digimon/Option with play/use cost 3, 8000 DP, alternate evolution from `Cerberusmon` for cost 1 or a level-4 `TS` Digimon for cost 3, and Jamming, Reboot, and Blocker.
- Printed behavior verified: On Deletion may play one level-4-or-lower `Titan` Digimon from trash without cost; Rule grants the `Dark Animal` trait; an own `TS` card waives the black Option color requirement; and Option Main trashes one hand card, then De-Digivolves one opposing Digimon by 3.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-056`; no card-specific Q&A, banlist restriction, or erratum is recorded. Dual-card, Use Requirement, De-Digivolve, optional replay, and stacked-card rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-056.ts` has full IR coverage and registers exclusively through `registerIrCard("BT26-056", compiled)`.
- Static projection exposes Jamming, Reboot, Blocker, and the effective `Dark Animal` trait. On Deletion optionally plays an own level-4-or-lower `Titan` Digimon from trash. The `TS`-gated color waiver and Option Main hand-trash followed by De-Digivolve 3 are encoded, as are both alternate evolution routes.
- Keyword/trait grants, deletion timing, trash filtering, dual-card Option use, color waivers, De-Digivolve depth, and relevant peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-056.test.ts` now covers deletion replay and its negative path; mixed valid, over-level, and wrong-trait trash candidates; runtime keywords/Rule trait; both evolution routes; the exact De-Digivolve 3 boundary; the empty-hand processing path; and off-color `TS` Use Requirement waiver/rejection.
- The strengthened De-Digivolve case leaves exactly one of four stack cards, proving a depth of 3 rather than merely emptying a three-card stack. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-056
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-056 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-057 — Bearcatmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-057` (`Bearcatmon`), a black/red level-5 dual Digimon/Option with play/use cost 4 and 8000 DP. Normal evolution is black or red Lv.4 for cost 4, with alternate evolution from a level-4 `Glowing Dawn` Digimon for cost 3.
- Printed Digimon behavior verified: by trashing the bottom face-down card under any own Tamer, it becomes unaffected by opposing Digimon effects and gains +3000 DP through the opponent's turn; and All Turns Once Per Turn, when attack targets change or an effect trashes cards from under a Tamer, it may unsuspend. Its Option body De-Digivolves one opposing Digimon by 1, then grants one opposing Digimon a Start of Your Main Phase attack through the opponent's turn end; `Glowing Dawn` satisfies its Use Requirement.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-057 --json`; Q7060–Q7066 confirm targeting, granted effects, and their interaction with immunity and duration. No banlist restriction or erratum applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-057.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-057", compiled)`.
- The When Digivolving cost uses the exact face-down Tamer-bottom primitive, then grants opposing-Digimon-effect immunity and +3000 DP through the opponent's turn. The All Turns watcher shares one Once Per Turn budget across target-switch and effect-attributed own-Tamer-stack-trash routes.
- The `Glowing Dawn` color waiver, dual Option routing, De-Digivolve 1, and granted Start of Your Main Phase attack are encoded with correct duration. Cost payment, immunity, event attribution, gained-trigger anchoring, and peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-057.test.ts` covers exact IR shape/metadata; the newly added real alternate-evolution success over a `Glowing Dawn` Lv.4 and rejection of a nonmatching Lv.4; face-down Tamer cost and unavailable-cost path; opposing Digimon-effect immunity versus Options; shared Once Per Turn behavior; and the dual Option route.
- The Q7060/Q7062–Q7066 proof shows the Option can grant an attack effect to an immune Digimon, that it does not affect the Digimon while immunity remains active, and that it activates after immunity expires. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-057 --json
  PASS (Q7060-Q7066; banlist: null; errata: null)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-057 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-058 — HiAndromon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-058` (`HiAndromon`), a black/yellow level-6 Digimon with play cost 12, 12000 DP, alternate evolution from a level-5 `CS` Digimon for cost 3, Reboot, and Blocker.
- Printed behavior verified: shared When Digivolving/When Attacking Once Per Turn protection makes exactly one own `CS` Digimon unaffected by opposing Digimon effects through the opponent's turn; and its All Turns replacement may rotate HiAndromon's top stack card to the bottom to prevent an own `CS` Digimon from leaving play.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-058`; no Q&A, banlist restriction, or erratum is recorded. Effect immunity, leave-play replacement, stack rotation, Reboot, and Blocker rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-058.ts` has full compiled IR coverage and registers exclusively through `registerIrCard("BT26-058", compiled)`.
- Reboot and Blocker are projected statically. The two protection timings share one Once Per Turn identity and select exactly one own `CS` Digimon for opponent-Digimon-effect immunity through the proper duration.
- The `wouldLeavePlay` replacement scopes the protected permanent to own `CS`, offers the prevention cost, and moves HiAndromon's top digivolution card to stack bottom. Restriction/replacement gates, self-protection, stack order, and peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-058.test.ts` covers alternate evolution, keyword exposure, shared timing budget, protection duration, protecting another `CS` or HiAndromon itself, stack rotation order, and failure without a source card.
- The focused fixture now also contains a non-`CS` Digimon and explicitly proves it is excluded from the protection target while only one eligible recipient gains immunity. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-058
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-058 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-059 — Plutomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-059` (`Plutomon`), a black/purple level-6 Digimon with play cost 13, 13000 DP, and alternate evolution from a level-5 `TS` Digimon for cost 4.
- Printed behavior verified: a strict smaller-hand condition reduces its hand play cost by 6; shared On Play/When Digivolving/When Attacking Once Per Turn may trash one hand card and, during the controller's turn, play a non-Plutomon `Titan` Digimon from trash with play cost reduced by 7; and All Turns reacts to either player trashing hand cards by deleting all opposing Digimon tied for lowest level.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-059`; Q7074–Q7078 confirm comparison timing, no reduction outside hand, opponent-turn activation without the turn-gated play, reduction stacking, and either player's hand-trash trigger. No erratum or restriction applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-059.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-059", compiled)`.
- Its self-bound `wouldBePlayed` replacement uses the strict hand comparison and reduction 6. Three timing windows share one Once Per Turn optional hand-trash cost, then a controller-turn-gated trash play filtered to a non-Plutomon `Titan` with reduction 7.
- The All Turns watcher accepts hand trash from either seat and deletes all opposing lowest-level Digimon. Announcement timing, reducers, cost gating, event seat matching, superlatives, and peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-059.test.ts` now covers On Play and When Digivolving bodies; mixed trash filtering for valid Titan, Plutomon, and non-Titan candidates; strict hand comparison; real alternate evolution and invalid rejection; opponent-turn behavior; optional refusal; Q7077 reduction stacking; Q7078 hand-trash ownership; and the shared Once Per Turn budget.
- The added refusal proof preserves hand/trash/battle-area state, while the mixed pool and alternate-evolution cases close concrete filter and evolution proof gaps. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-059
  PASS (Q7074-Q7078; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-059 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-060 — Chronomon: Destroy Mode — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-060` (`Chronomon: Destroy Mode`), a black/red level-7 Digimon with play cost 16, 16000 DP, Security Attack +1, Reboot, Blocker, and Succession from a level-6 card with `Chronomon` in its name. It has alternate cost-5 evolution from a level-6 card with `Chronomon` in its text or from `Giant Slayer`.
- Printed behavior verified: On Play/When Digivolving returns the top five cards of exactly three opposing Digimon stacks to deck top; and All Turns Once Per Turn, when an own effect adds cards to decks, may delete one opposing Digimon.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-060 --json`; Q7079–Q7087 confirm target count, five-card limit, ordering, short stacks, rule checks, deck-add triggers, and `Giant Slayer` meaning. No banlist restriction or erratum applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-060.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-060", compiled)`.
- Separate On Play and When Digivolving actions use `ReturnTopDigivolutionCards` with three opposing targets, five cards per target, and activating-player ordering. The All Turns watcher uses `whenEffectAddsToDeck`, Once Per Turn, and optional opposing-Digimon deletion.
- Root keywords and the self-targeted Succession grant are encoded, as are both alternate requirements. Stack-return ordering, rule checks, event attribution, Succession source selection, and peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-060.test.ts` now covers both alternate evolution paths and invalid rejection; exact three-target/five-card return behavior; short-stack promotion; deck ordering; Q7082/Q7083 rule-check cleanup; Q7084–Q7086 deck-add reactions and Once Per Turn; highest matching Chronomon Succession with an intervening non-Chronomon peer; and optional deletion refusal.
- The new refusal case proves that the qualifying deck-add event still occurs while the opposing permanent survives. The production module required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-060 --json
  PASS (Q7079-Q7087; banlist: null; errata: null)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-060 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-061 — Chiropmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-061` (`Chiropmon`), a purple level-3 Digimon with play cost 3, 2000 DP, and alternate evolution from a level-2 `Glowing Dawn` Digimon for cost 0.
- Printed behavior verified: On Play reveals the top three cards, adds one `Glowing Dawn` card and one purple `BEATBREAK` card, and returns the remainder to deck bottom; its inherited When Attacking Once Per Turn draws one, then trashes one hand card.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-061`; no Q&A, banlist restriction, or erratum is recorded. Reveal, bottom-deck ordering, inherited timing, and Draw/Trash sequencing rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-061.ts` has full compiled IR coverage and registers exclusively through `registerIrCard("BT26-061", compiled)`.
- `RevealAdd` uses count 3, independent `Glowing Dawn` and purple-plus-`BEATBREAK` slots, and deck-bottom disposition. Shared reveal tracking prevents one instance from filling both slots.
- The inherited When Attacking body has one Once Per Turn budget and performs Draw 1 followed by mandatory hand trash. Evolution, reveal visibility/selection, bottom ordering, inherited projection, and peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-061.test.ts` covers the positive two-slot search and bottomed remainder; overlap without duplicate use; rejection of an off-color `BEATBREAK`; real zero-cost alternate evolution; and inherited attack Draw/Trash with the second activation blocked by Once Per Turn.
- The existing proof is sufficient for every printed clause; no implementation or test change was required.

### Verification

```text
node tools/kb/query.mjs card BT26-061
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-061 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-062 — Ghostmon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-062` (`Ghostmon`), a purple/red level-3 Digimon with play cost 3, 1000 DP, alternate evolution from a level-2 `NSo` Digimon for cost 0, and inherited Your Turn +2000 DP.
- Printed behavior verified: Start of Your Main Phase, by trashing one `Ghost` or `NSo` card from hand, draws one and gains one memory. The payment is optional; the draw and memory gain follow only successful payment.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-062`; no card-specific Q&A, banlist restriction, or erratum is recorded. Phase timing, optional cost gates, Draw/Trash ordering, inherited duration, and evolution rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-062.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-062", compiled)`.
- Start of Your Main Phase uses an optional cost gated to one own hand card matching `Ghost` OR `NSo`; its successful body draws one and gains one memory in order.
- The inherited Your Turn modifier supplies +2000 DP only while the host's controller owns the turn. The alternate evolution, hand filters, optional/no-cost path, duration, and analogous peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-062.test.ts` covers Ghost-only and NSo-only costs, positive resolution, optional refusal, no eligible-cost no-op, legal NSo evolution, inherited DP on owner versus opponent turns, and newly added mixed-hand and invalid-evolution boundaries.
- The mixed hand case proves an unrelated card cannot pay and remains in hand while exactly one eligible card is trashed. The invalid case rejects a non-NSo Lv.2 despite sufficient memory. The implementation required no correction.

### Verification

```text
node tools/kb/query.mjs card BT26-062
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-062 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-063 — Tellermon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-063` (`Tellermon`), a purple level-3 Digimon with play cost 4, 4000 DP, `Fortune Telling (App Name)`/`Seven Code` traits, alternate evolution from a level-2 `Appmon` for cost 0, and Link to an `Appmon` for cost 3.
- Printed behavior verified: Detach restricted to `Seven Code`; Your Turn Once Per Turn, when this Digimon gets linked, reveals the top three, adds one `Entertainment`/`Open`/`Seven Code` card, and returns the rest to deck top or bottom; its linked When Linking effect deletes one opposing lowest-level Digimon.
- Knowledge-base command: `node tools/kb/query.mjs card BT26-063 --json`; no card-specific Q&A, banlist restriction, or erratum is recorded. Link, Detach, reveal ordering, Once Per Turn, and lowest-level selection rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-063.ts` has `coverage: "full"`, `residual: []`, and registers exclusively through `registerIrCard("BT26-063", compiled)`.
- Evolution and Link requirements are exact. The source-scoped Your Turn watcher reacts when this permanent receives a link, uses one Once Per Turn budget, reveals exactly three, accepts one card matching any printed trait, and exposes top/bottom disposition for the remainder.
- Its linked face reacts at When Linking and deletes exactly one opposing member of the lowest-level superlative. Detach retains the exact trait restriction. Link state, reveal filters, superlatives, and peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-063.test.ts` covers IR/catalog structure; real zero-cost Appmon evolution; public Link payment and reveal resolution; valid and near-match trait filters; top/bottom choices; no-eligible fallback; lowest-level deletion; Detach battle-deletion prevention; source scoping when another Appmon links; independent copies; same-copy Once Per Turn; and Your Turn gating.
- The existing proof is sufficient for each printed clause; no implementation or test change was required.

### Verification

```text
node tools/kb/query.mjs card BT26-063 --json
  PASS (qa: []; banlist: null; errata: null)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-063 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-064 — DemiDevimon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-064` (`DemiDevimon`), a purple level-3 Digimon with play cost 3, 2000 DP, and alternate evolution from a level-2 `TS` Digimon for cost 0.
- Printed behavior verified: On Play reveals the top three, adds one `Fallen Angel`/`Undead`/`Wizard`/`Demon Lord` card and one `TS` card, then returns the remainder to deck bottom; inherited When Attacking Once Per Turn draws one, then trashes one hand card.
- Knowledge-base query found no card-specific Q&A, restriction, or erratum. Reveal matching, duplicate exclusion, bottom ordering, inherited timing, and Draw/Trash rules were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-064.ts` has full compiled IR coverage and exclusive `registerIrCard("BT26-064", compiled)` registration.
- `RevealAdd` encodes the four-trait union and independent `TS` slot across exactly three cards, with unused cards sent to deck bottom and no revealed instance reused. The inherited body has the correct Draw/Trash order and Once Per Turn budget.
- Alternate evolution, trait-union matching, reveal state, inherited projection, and peers were inspected.

### Behavioral proof

- Existing `apps/api/src/cards/BT26/BT26-064.test.ts` covers positive dual-slot selection and bottom disposition, overlap without duplicate use, trait/color boundary, legal zero-cost evolution, real inherited attack behavior, and Once Per Turn enforcement.
- Existing proof is sufficient for every printed clause; no implementation or test change was required.

### Verification

```text
Knowledge-base card query
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-064 ambiguity or unsupported printed clause remains. No card, engine, or test file changed; only this audit section was appended. The audit remains unpushed and the collection is not marked complete.

## BT26-065 — Falcomon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-065` (`Falcomon`), a purple level-3 Digimon with play cost 3, 1000 DP, alternate evolution from a level-2 `DATA SQUAD` Digimon for cost 0, and inherited When Attacking Once Per Turn Draw 1 then trash one hand card.
- Printed On Play reveals the top three, adds one exact `Keenan Crier` or `DATA SQUAD` card, adds one purple card with `Ravemon` in its name or `Avian`/`Bird` trait, and returns the remainder to deck bottom.
- KB Q7088 confirms the purple restriction applies to all alternatives in the second slot. Analogous reveal rulings confirm maximum eligible selection and remainder disposition. No erratum or restriction applies.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-065.ts` has `coverage: "full"`, `residual: []`, and exclusive `registerIrCard("BT26-065", compiled)` registration.
- The first reveal slot now uses exact-name matching for `Keenan Crier`, alongside the separate `DATA SQUAD` trait alternative. The prior substring matcher incorrectly allowed composite names containing Keenan Crier.
- The second slot correctly applies purple to the `Ravemon`/`Avian`/`Bird` union. Reveal exclusivity/bottom disposition, inherited Draw/Trash, evolution, and peers were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-065.test.ts` covers positive dual-slot selection, Q7088 purple filtering, duplicate-slot prevention, alternate evolution, inherited Once Per Turn behavior, and the newly added exact-name regression.
- The new case proves a composite name containing `Keenan Crier` is not accepted unless it independently has `DATA SQUAD`. The implementation and structural expectation were corrected together.

### Verification

```text
Knowledge-base card query
  PASS (Q7088; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-065 ambiguity or unsupported printed clause remains. Only the direct IR module, its colocated focused test, and this ledger section changed; the shared engine remains unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-066 — Salamon — 10/10

### Contract evidence

- Catalog source: `packages/shared/src/cards/data/cards.json` entry `BT26-066` (`Salamon`), a purple level-3 Digimon with play cost 3, 2000 DP, `Mammal`/`Titan`/`TS` traits, and alternate evolution from a level-2 `TS` Digimon for cost 0.
- Printed behavior verified: Start of Your Main Phase at five or fewer hand cards may evolve an own `Titan` Digimon into a `Titan` from trash with cost reduced by 2; inherited Your Turn Once Per Turn, when the controller's hand is trashed, may evolve its `Titan` host into `Titamon` or a `Titan` from trash with cost reduced by 1.
- KB Q7089 confirms Alliance does not retroactively apply after evolving during an attack. Start-main timing, hand-trash attribution, inherited anchoring, cost reduction, and evolution legality were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-066.ts` has `coverage: "full"`, `residual: []`, and exclusive `registerIrCard("BT26-066", compiled)` registration.
- Both optional evolution windows use the printed `Titan` filters, correct controller/zones, and cost deltas -2/-1 while preserving normal evolution legality and zero-floor costs.
- The inherited watcher binds to its host, requires a `Titan` host, scopes hand trash to the owner, and has one Once Per Turn budget. Relevant timing, trash evolution, trait, and peer seams were inspected.

### Behavioral proof

- `apps/api/src/cards/BT26/BT26-066.test.ts` covers successful start-main evolution, the six-card boundary, inherited evolution, non-Titan inherited-host rejection, opponent-effect hand trash, inherited Once Per Turn, and Q7089's non-retroactive Alliance behavior.
- This audit added a start-main negative case using a non-Titan purple Lv.5 that otherwise meets the candidate card's normal evolution route, independently proving the source-target `Titan` restriction. The existing inherited negative fixture was strengthened similarly. The module required no correction.

### Verification

```text
Knowledge-base card query
  PASS (Q7089; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-066 ambiguity or unsupported printed clause remains. Only its colocated focused test and this ledger section changed; the card implementation and shared engine remain unchanged. The audit remains unpushed and the collection is not marked complete.

## BT26-067 — Wizardmon — 10/10

### Contract evidence

- Catalog confirms a purple/red level-4 Digimon, play cost 4, 4000 DP, alternate evolution from level-3 `TS` for cost 2, On Play/When Digivolving Draw 1 then trash one, End of Your Turn processing, and inherited Retaliation.
- End of Your Turn requires an own blue or yellow Digimon, then may return Wizardmon to deck bottom to play one red or blue `Iliad` Digimon from trash with cost reduced by 4.
- The KB has no card-specific Q&A, erratum, or restriction. End-turn timing, optional cost payment, reduced-cost play, and Retaliation were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-067.ts` has full IR coverage and exclusive `registerIrCard("BT26-067", compiled)` registration.
- Both entry timings encode ordered Draw/Trash. The end-turn block checks the color condition, optionally returns self to deck bottom, and only then performs the filtered reduced-cost trash play. Alternate evolution and inherited Retaliation are exact.
- Conditional payment, cost reduction, zone transition, target filters, and peers were inspected.

### Behavioral proof

- `BT26-067.test.ts` covers Draw/Trash, positive reduced-cost play and memory, illegal target, insufficient memory, missing color condition, real evolution, and inherited Retaliation.
- The added optional-decline case proves a legal activation can be refused without returning Wizardmon, moving the trash target, or changing memory. The module required no correction.

### Verification

```text
Knowledge-base card query
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-067 limitation remains. Only its focused test and this ledger section changed; the implementation and engine remain unchanged. The collection is not marked complete.

## BT26-068 — Devimon — 10/10

### Contract evidence

- Catalog confirms a purple level-4 Digimon with play cost 6, 6000 DP, alternate evolution from level-3 `TS` for cost 2, and inherited When Attacking Once Per Turn Draw 1 then trash one hand card.
- On Play/When Digivolving, if the controller has five or fewer hand cards, both players draw two. All Turns Once Per Turn, when effects add cards to the opponent's hand, may trash one own hand card to make the opponent trash one of their choice.
- The KB has no card-specific Q&A, erratum, or restriction. Conditional boundaries, opponent choice, hand-add event direction, optional payment, and inherited timing were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-068.ts` has `coverage: "full"`, `residual: []`, and exclusive `registerIrCard("BT26-068", compiled)` registration.
- Both entry windows use the exact five-or-fewer condition and draw two for each player. The All Turns watcher is directionally scoped to effect additions to the opponent's hand, reserves one Once Per Turn use, and gates opponent-selected discard behind optional own-hand trash.
- Alternate evolution and inherited Draw/Trash are exact. Condition timing, event direction, opponent selection, source identity, and peers were inspected.

### Behavioral proof

- Existing `BT26-068.test.ts` contains 10 focused cases covering IR/catalog shape; valid/invalid evolution; exact five/six-card boundary; both entry windows; two-copy independence; opponent-hand event direction through real On Play processing; declined/failed costs; Once Per Turn reservation; and realistic inherited-stack execution.
- Existing proof is sufficient for every printed clause; no code or test change was required.

### Verification

```text
Knowledge-base card query
  PASS (no card-specific Q&A, errata, or restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the ledger-only commit
```

No unresolved BT26-068 limitation remains. No card, engine, or test file changed; only this audit section was appended. The collection is not marked complete.

## BT26-069 — Dobermon — 10/10

### Contract evidence

- Catalog confirms a purple level-4 Digimon with play cost 5, 6000 DP, `Dark Animal`/`Titan`/`TS` traits, and alternate evolution from level-3 `TS` for cost 2.
- Printed behavior verified: when this card is trashed from hand and five or fewer cards remain, draw one; On Play/When Digivolving may trash one hand card to delete any level-4-or-lower Digimon; inherited Your Turn Once Per Turn, when the owner's hand is trashed, may evolve a `Titan` host into `Titamon` or a `Titan` from trash with cost reduced by 1.
- KB Q7090–Q7091 cover non-retroactive Alliance and simultaneous two-copy hand-trash draw behavior. Hand-trash timing, optional costs, inherited anchoring, and trash evolution were reviewed.

### Implementation mapping

- `apps/api/src/cards/BT26/BT26-069.ts` has full IR coverage, no residual, and exclusive `registerIrCard("BT26-069", compiled)` registration.
- The self-bound hand-trash watcher evaluates the post-trash five-card ceiling. Both entry windows use an optional abortable hand-trash cost and target one Digimon of either controller at level 4 or lower.
- The inherited watcher scopes the event to the owner, binds to and requires a `Titan` host, applies one Once Per Turn budget, and evolves from own trash into `Titamon` or `Titan` with reduction 1. Relevant primitives and peers were inspected.

### Behavioral proof

- `BT26-069.test.ts` now covers exact structural filters; alternate evolution; On Play and direct When Digivolving behavior; optional refusal; exact hand-size boundary; own/opponent level-4 targets; inherited Titan evolution, direction, and Once Per Turn; Q7091 simultaneous copies; and Q7090's non-retroactive Alliance during attack evolution.
- This audit added the missing When Digivolving and rulings paths and strengthened the target boundary with an exact level-4 fixture. The implementation required no correction.

### Verification

```text
Knowledge-base card query
  PASS (Q7090-Q7091; no errata/restriction)
Automated tests, typecheck, lint, and format
  NOT RUN by user instruction
git diff --check
  PASS before the card-specific commit
```

No unresolved BT26-069 limitation remains. Only its focused test and this ledger section changed; the implementation and engine remain unchanged. The collection is not marked complete.

## BT26-070 — NightChiropmon — 10/10

### Contract evidence

- Catalog confirms a purple level-4 Digimon with alternate level-3 `Glowing Dawn` evolution for cost 2, On Play/When Digivolving Draw 1 then trash one, Main Once Per Turn, and inherited Retaliation.
- Main trashes exactly two bottom face-down cards under own Tamers, then may use one `Glowing Dawn` Option from trash with use cost reduced by 2. KB Q7092 requires both cards; Q7093 prevents combining reductions across copies.

### Implementation mapping

- `BT26-070.ts` has full IR coverage and exclusive `registerIrCard` registration. It encodes exact two-card bottom-face-down Tamer payment, optional trait-filtered Option use from trash, reduction 2, and inherited Retaliation.
- Draw/Trash ordering, all-or-nothing payment, Option lifecycle, Once Per Turn identity, and peers were inspected.

### Behavioral proof

- `BT26-070.test.ts` covers evolution, Retaliation, Draw/Trash, bottom selection, Q7092/Q7093, and failure paths. The public positive fixture now uses a real `Glowing Dawn` Option plus two valid Tamer-stack cards; added cases prove legal refusal and exclusion of a nonmatching Option.

### Verification

```text
Knowledge-base query: PASS (Q7092-Q7093)
Automation: NOT RUN by user instruction
git diff --check: PASS before commit
```

No unresolved BT26-070 limitation remains. Only its focused test and this ledger section changed; the implementation remains unchanged.

## BT26-071 — Flarerizamon — 10/10

### Contract evidence

- Catalog confirms a purple/red level-4 Digimon with play cost 4, 5000 DP, alternate level-3 `NSo` evolution for cost 2, and inherited Raid.
- On Play/When Digivolving, by deleting one own Digimon, may delete one opposing level-4-or-lower Digimon. Under Comprehensive Rules §15-7-5, the optional processing cost may be paid even if the following target does not exist.
- The KB has no card-specific Q&A, erratum, or restriction.

### Implementation mapping

- `BT26-071.ts` has full IR coverage and exclusive `registerIrCard` registration. Both timing windows share the optional own-delete cost and opponent level filter; inherited Raid and evolution are exact.
- `allowCostWithoutTarget: true` was added to match §15-7-5. Previously the engine incorrectly suppressed payment when no legal opposing target existed.

### Behavioral proof

- `BT26-071.test.ts` covers positive payment/deletion, refusal, off-color NSo evolution, inherited Raid publication/execution, and now payment without a legal opposing level-4 target. The corrected case observes the own Digimon deleted while the opposing level-5 survives.

### Verification

```text
Knowledge-base query: PASS (no card-specific entries)
Automation: NOT RUN by user instruction
git diff --check: PASS before commit
```

No unresolved BT26-071 limitation remains. The direct IR module, focused test, and ledger changed; the shared engine did not.

## BT26-072 — Peckmon — 10/10

### Contract evidence

- Catalog confirms a purple level-4 `Avian`/`DATA SQUAD` Digimon with play cost 4, 5000 DP, alternate level-3 `DATA SQUAD` evolution for cost 2, Blocker, and inherited On Deletion opponent hand trash.
- On Play/When Digivolving offers a modal cost: trash one hand card, or place one hand card face down at the bottom under an own `Keenan Crier`; either paid mode deletes one opposing level-4-or-lower Digimon. KB Q7094–Q7097 cover bottom placement, face-down access/order, and face-up trash conversion.

### Implementation mapping

- `BT26-072.ts` has full IR coverage, no residual, and exclusive `registerIrCard` registration. Static Blocker, both optional modal windows, exact placement/trash costs, opponent level filter, and inherited opponent-selected hand trash are encoded.
- Modal processing, bottom/face state, target boundary, chooser semantics, evolution, Blocker, and peers were inspected.

### Behavioral proof

- `BT26-072.test.ts` covers catalog/IR, evolution, hand-trash deletion, bottom placement under an existing Keenan stack, face-down-to-face-up trash conversion, Blocker, and inherited discard.
- Added direct When Digivolving execution, refusal of both alternatives, and an exact level-4 target while a level-7 target remains, closing timing/optional/boundary proof gaps. The module required no correction.

### Verification

```text
Knowledge-base query: PASS (Q7094-Q7097)
Automation: NOT RUN by user instruction
git diff --check: PASS before commit
```

No unresolved BT26-072 limitation remains. Only its focused test and ledger changed; the implementation and engine remain unchanged.

## BT26-073 — Aegiochusmon: Dark — 10/10

- Catalog/KB: purple/red Lv.5 `Shaman`/`Iliad`/`TS`, alternate `Aegiomon` evolution, Assembly -2, Rule Wizard, inherited Security A. +1, and printed effects confirmed. Q7098–Q7099 cover the Assembly level ceiling and `Chronomon`-in-text matching; no erratum/restriction.
- Implementation: full IR, no residual, exclusive `registerIrCard`. Alternate evolution, exact one-material Assembly, shared optional self-delete/deck-bottom modal, opposing Lv.5 deletion, optional On Deletion TS play from hand/trash, inherited keyword, and trait grant map exactly.
- Proof: existing cases cover evolution, Assembly and Q7098 boundary, both modal costs/refusal, TS Digimon/Tamer plays, deletion completion, real Security A. attack, and Wizard projection. Added optional On Deletion refusal, preserving the eligible hand card.
- Verification: automation not run by user instruction; `git diff --check` passed before commit. No unresolved limitation remains.

## BT26-074 — Cerberusmon — 10/10

- Catalog/KB: purple/black Lv.5, alternate Lv.4 `TS` evolution for cost 3, and inherited On Deletion deletion of an opposing lowest-level Digimon confirmed. No card-specific Q&A, erratum, or restriction.
- Implementation: full IR, no residual, exclusive `registerIrCard`. On Play/When Digivolving/When Attacking share one Once Per Turn owner-turn body: optional hand-trash cost, then use an own `Titan` Option from trash with cost reduced by 2. Inherited lowest-level selection and evolution are exact.
- Proof: existing cases cover off-color evolution, mixed Option/Titan filtering, near matches, cost payment, reduced use, affordability failure, decline, shared timing budget, lowest-level ties, and real deleted-stack behavior.
- Verification: automation not run by user instruction; `git diff --check` passed before the ledger-only commit. No files besides this ledger changed; no unresolved limitation remains.

## BT26-076 — Crowmon — 10/10

- Catalog/KB: purple Lv.5 `Mysterious Bird`/`DATA SQUAD`, alternate Lv.4 DATA SQUAD evolution, printed When Digivolving/Your Turn/inherited effects confirmed. Q7104 preserves the cost ceiling across all inherited trait alternatives.
- Implementation: full IR and exclusive `registerIrCard`; exact Lv.4 deletion, optional face-down Tamer-bottom cost/opponent discard, shared Once Per Turn reaction routes, reduced trash evolution into Ravemon/DATA SQUAD, and inherited cost-5 Avian/Bird/DATA SQUAD trash play.
- Proof: existing evolution, deletion, cost, reaction, turn, reduction, and trait/ceiling cases plus new shared Once Per Turn and inherited refusal proofs. Automation not run by instruction; `git diff --check` passed. No unresolved limitation.

## BT26-077 — Reapermon — 10/10

- Catalog/KB: purple/black Lv.6 `Cyborg`/`DM`/`Ver.3`, alternate Lv.5 DM evolution, Security A. +1, Execute, Fragment (2), shared timing effect, and highest-cost deletion confirmed. No card-specific KB entry or erratum.
- Implementation: full IR and exclusive `registerIrCard`; the three windows share one Once Per Turn key, dynamically cap optional free `Ver.3` trash play by face-down stack count, then delete highest-play-cost opposing Digimon/Tamers. Intrinsic keywords are exact.
- Proof: existing dynamic ceiling, trash play, timing, Execute, Fragment, Security Attack, and deletion cases plus new non-DM evolution rejection and mixed Ver.3/non-Ver.3 trash filtering. Automation not run by instruction; `git diff --check` passed. No unresolved limitation.

## BT26-078 — Cherubimon — 10/10

- Catalog/KB: purple/green Lv.6 `Cherub`/`Titan`/`TS`, alternate Lv.5 TS evolution, self-delete entry effect, Trash reaction, Rush/Execute grants confirmed. Q7105–Q7108 cover text matching, Trash timing, opponent-memory threshold, and shared kind/cost limits.
- Implementation: full IR with exclusive `registerIrCard`; optional self-delete gates a cost-12-or-lower `Chronomon`-text/Titan Digimon-or-Tamer trash play. The Your Turn Trash watcher requires opponent memory at least 5 and optional self return to deck bottom before granting Rush/Execute to the played qualifying Digimon.
- Proof: existing evolution, entry, dual-kind/boundary, Trash-only, threshold, Rush, and Execute cases plus new Q7106 refusal proof preserving Cherubimon in trash and withholding grants. Automation not run by instruction; `git diff --check` passed. No unresolved limitation.

## BT26-079 — ZombiePlutomon — 10/10

- Catalog/KB: purple Lv.6 `Undead`/`Titan`/`TS`; alternate evolutions, Assembly -2, Trash Main reduction, Security A. +1, Decode, Retaliation, three deletion timings, and All Turns Once Per Turn hand trim confirmed. Q7109–Q7111 cover Trash timing, Assembly from Trash Main, and each player's discard choice.
- Correction: removed the erroneous shared Once Per Turn limit from On Play/When Digivolving/When Attacking deletion; the printed three timings are independent. The All Turns hand-trim effect retains its printed limit.
- Proof: existing evolution, Assembly, Trash Main, hand trim, Decode, Retaliation, and Security cases; updated independent-timing proof and new optional Decode refusal. Exclusive `registerIrCard`; automation not run by instruction; diff check passed. No unresolved limitation.

## BT26-080 — Bacchusmon / Reversal of the Dead — 10/10

- Catalog/KB: purple/green dual Lv.6 Digimon/Option, purple Option requirement, TS Use Requirement, Security A. +1, Succession, orientation deletion, digivolution attack, and Option unsuspend/delete confirmed. Q7112–Q7114 define orientation and either-player suspension/unsuspension.
- Implementation: full IR, exclusive `registerIrCard`; exact alternate evolution, optional either-player suspend cost followed by attack without suspending, live same-orientation deletion Once Per Turn, TS color waiver, and Option lowest-DP sequence.
- Proof: both orientations/ownership cases, Succession, evolution, Once Per Turn, Security Attack, and deletion plus new purple requirement assertion and no-TS Option rejection. Automation not run by instruction; diff check passed. No unresolved limitation.

## BT26-081 — Mervamon — 10/10

- Catalog/KB: purple/yellow/black Lv.6 `Shaman`/`Olympos XII`/`Iliad`/`TS`, alternate paths, Assembly -5, optional total-cost-8 Iliad play, scaled DP reduction, and continuous Alliance/Reboot/Blocker/+2000 confirmed. Q7115–Q7116 cover no-play reduction and zero-DP timing.
- Correction: the DP-scaling count now explicitly uses `zone: "battleArea"`; breeding-area cards must not count under rule §3-4-5.
- Proof: metadata, both evolution paths, Assembly, exact-cost-8 trash play, refusal, no-card reduction, breeding exclusion, scaling, and all grants. Full IR, exclusive `registerIrCard`; automation not run by instruction; diff check passed. No unresolved limitation.

## BT26-082 — Ravemon — 10/10

- Catalog/KB: purple Lv.6 DATA SQUAD, alternate Crowmon/DATA SQUAD evolution, Security/end-opponent-turn plays, modal deletion, On Deletion discard/security placement, and Rule Birdkin confirmed. Q7117–Q7123 cover face-up Security behavior, timing, thresholds, and indivisible two-card cost.
- Implementation: full IR and exclusive `registerIrCard`; both modal timings offer self-delete or exactly two bottom face-down Tamer cards before highest-DP deletion; On Deletion enforces discard then optional face-up bottom-security placement.
- Proof: existing evolution, both costs, insufficient/refusal, Security, end-turn, threshold, and trait cases plus new End of Attack execution and security-placement refusal. Automation not run; diff check passed. No unresolved limitation.

## BT26-083 — Junomon: Hysteric Mode — 10/10

- Catalog/KB: purple/yellow Lv.7, alternate Lv.6 TS evolution, Assembly -4 Junomon, Rush/Piercing/Execute, Decode, security wipe/delete/recovery, and deletion debuff confirmed. Q7124 permits Recovery +3 with zero security to trash.
- Implementation: full IR and exclusive `registerIrCard`; exact evolution/Assembly, Decode filter, security `leaveCount: 0` with tracked per-card deletion, Recovery +3, and opponent-wide Security A. -1 duration.
- Proof: existing normal/alternate evolution, Assembly, zero-security recovery, per-card deletion, combat keywords, Execute/Decode and level boundary, and deletion debuff. No change needed; automation not run; diff check passed. No unresolved limitation.

## BT26-084 — Copipemon — 10/10

- Catalog/KB: white Lv.3 `Copy & Paste`/`Seven Code`, Appmon evolution/Link, Detach, linked reveal, reduced Seven Code play/use, and linked trash-link effect confirmed. Q7125–Q7128 cover Link eligibility, reveal-return timing, Option lifecycle, and simultaneous triggers.
- Implementation: full IR and exclusive `registerIrCard`; source-scoped linked Once Per Turn reveal of three, optional reduced-by-3 Seven Code play/use, top/bottom remainder, and optional free link from trash of a non-white Lv.4-or-lower System/Seven Code card carrying Link.
- Proof: metadata, evolution/link, eligible boundaries, Digimon/Option branches, reduction, remainder, turn/frequency, Detach, Q7127/Q7128, plus new trash-link refusal. Automation not run; diff check passed. No unresolved static limitation.

## BT26-085 — Giant Slayer — 10/10

- Catalog/KB: white `NO DATA`/`TS` Digimon, Assembly -5 from five different-level `Chronomon`-text/Shaman cards, Collision/Reboot/Blocker, opponent-effect protection, and Destroy Mode leave replacement confirmed. Catalog intentionally has no level field; no clause depends on its own level. No KB entry/erratum.
- Implementation: full IR and exclusive `registerIrCard`; exact Assembly, keyword suite, opponent-only DP/stack-trash protection, and optional free Destroy Mode evolution from hand/trash replacing departure.
- Proof: valid/invalid Assembly, protection ownership, combat keywords, replacement from both zones, refusal, and final zones. No change needed; automation not run; diff check passed. No unresolved implementation limitation.

## BT26-086 — Dantemon — 10/10

- Catalog/KB: white Lv.7 Appmon, Assembly -7 from seven differently named Seven Code Digimon, Rush/Reboot/Blocker/Link +6, stack linking, attack, linked reaction, deletion, and security return confirmed. No card-specific KB entry.
- Correction: replaced `SecurityManipulation(moveTopToBottom)`, which only reordered security, with `Return` of the opponent's top security card to deck bottom as printed.
- Proof: Assembly boundaries, stack Appmon filtering, link capacity/distinct names, keywords, reaction/frequency, seven-link condition, and corrected security-to-deck zones. Full IR, exclusive `registerIrCard`; automation not run; diff check passed. No unresolved limitation.

## BT26-087 — Toya Kuga — 10/10

- Catalog/KB: red cost-3 TS Tamer with Start Main, On Play, and Security text confirmed; no card-specific Q&A/erratum.
- Implementation: full IR and exclusive `registerIrCard`; optional transactional return of one TS Digimon from trash to deck bottom then +1 memory, optional exact Giant Slayer recovery, optional On Play TS hand-trash then Draw 2, and free Security play.
- Proof: positive start-main/recovery, wrong kind/trait, unavailable/refused costs, On Play Draw 2, Security play, and strengthened mixed-pool cases preserving non-TS cards. Automation not run; diff check passed. No unresolved limitation.

## BT26-088 — Hiroko Sagisaka — 10/10

- Catalog/KB: red cost-4 TS Tamer, start-turn memory, conditional Boss/TS Digimon play reduction, and Security play confirmed; no card-specific Q&A/erratum.
- Implementation: full IR and exclusive `registerIrCard`; Start Main gains memory when the opponent has a Digimon; optional suspension reduces a qualifying Boss/TS Digimon's play cost by 2 with no own Digimon or 1 otherwise; Security plays free.
- Proof: both reduction branches, Boss/TS routes, refusal, suspended source, Security, start-turn condition, plus new negative non-Boss/non-TS Digimon boundary. Automation not run; diff check passed. No unresolved limitation.

## BT26-089 — Kyo Sawashiro — 10/10

- Catalog/KB: yellow cost-3 `Glowing Dawn`/`BEATBREAK` Tamer confirmed. Q7137–Q7142 cover bottom face-down placement, visibility/order, face-up trash conversion, suspend-gated follow-up, and Security trigger ordering.
- Implementation: full IR and exclusive `registerIrCard`; optional BEATBREAK hand placement then Draw 1/+1 memory, distinct normal/effect security-removal watchers, suspend-gated face-down top-deck placement, effect-only Security A. -1, and Security free play.
- Proof: stack order, refusal, normal/effect distinction, suspended and opponent-security negatives, ordering, debuff, and Security play. No change needed; automation not run; diff check passed. No unresolved limitation.

## BT26-090 — Kanan Yuki — 10/10

- Catalog/KB: green cost-3 `ADAMAS`/`TS` Tamer, Start Main memory, End Turn TS Option use, and Security play confirmed. Q7143 defines the controller-side memory gauge positions for “4 or less.”
- Correction: added `allowMultiColor: true` to the unrestricted TS Option action. Multicolor TS Options now qualify while the engine still requires every printed color; previously they were rejected categorically.
- Proof: Q7143 boundaries, paid/reduced/floored Option costs, optional refusal, wrong trait, suspended source, Security, and new multicolor success/missing-color rejection. Full IR, exclusive `registerIrCard`; automation not run; diff check passed. No unresolved limitation.

## BT26-091 — Yoshino Fujieda — 10/10

- Catalog/KB: green cost-4 DATA SQUAD Tamer, start-main stack placement, suspension/stack-trash reaction, reduced evolution, and Security play confirmed. Q7144–Q7148 cover bottom face-down placement and cost reduction.
- Implementation: full IR and exclusive `registerIrCard`; exact DATA SQUAD hand placement/Draw/+1, opponent suspension and effect-attributed self-stack-trash watchers, suspend cost, and Vegetation/Fairy/DATA SQUAD hand evolution reduced by 1.
- Proof: all timings, refusal/negative controller, Q7148, Security, plus new real Vegetation and Fairy evolution branches. Automation not run; diff check passed. No unresolved limitation.

## BT26-092 — Shota Kuroi — 10/10

- Catalog/KB: black cost-3 TS Tamer with start-main, opponent-turn attack redirect, and Security play confirmed. No direct KB entry; CR §15-7-5 and BT26-003/Q6953 establish that an optional “by returning” cost may be paid without a legal later target.
- Correction: added `allowCostWithoutTarget: true` while retaining refusal abort semantics, so the own TS Tamer may return to deck bottom even when no TS Digimon can receive the attack.
- Proof: successful redirect, cost-only resolution, decline, turn gate, start-main cost/benefit, and Security. Exclusive `registerIrCard`; automation not run; diff check passed. No unresolved limitation.

## BT26-093 — Reina Sakuya — 10/10

- Catalog/KB: black cost-3 `Glowing Dawn`/`BEATBREAK` Tamer, start-main placement, attack reaction, Collision/Blocker grants, and Security play confirmed. Q7151–Q7155 cover bottom/face-down handling and “After” gating.
- Implementation: full IR and exclusive `registerIrCard`; transactional optional BEATBREAK hand placement/Draw/+1, global attack watcher with suspend cost, face-down top-deck placement under self, grants only to own BEATBREAK Digimon, and free Security play.
- Proof: ordering, refusal, empty deck, unavailable suspend, opponent attack/block, Q7154, Security, plus mixed matching/nonmatching hand and Digimon pools. Automation not run; diff check passed. No unresolved limitation.

## BT26-094 — Keenan Crier — 10/10

- Catalog/KB: purple cost-3 DATA SQUAD Tamer, start-main placement, hand-trash/self-stack reaction, Execute grant, and Security play confirmed. Q7156–Q7159 cover bottom face-down handling.
- Implementation: full IR/exclusive `registerIrCard`; exact DATA SQUAD placement/Draw/+1, opponent hand-trash and effect-attributed self-stack watchers, suspend cost, own DATA SQUAD Execute grant, and Security.
- Proof: all clauses, refusal/unavailable cost, controller/turn filters, face-up trash, duration, Security, plus mixed-board non-DATA SQUAD exclusion. Automation not run; diff check passed. No limitation.

## BT26-095 — Makoto Kuonji — 10/10

- Catalog/KB: purple cost-3 Glowing Dawn/BEATBREAK Tamer, start-main placement, deletion reaction, and Security play confirmed. Q7160–Q7164 cover bottom/face-down handling and suspend-gated “after.”
- Implementation: full IR/exclusive `registerIrCard`; hand BEATBREAK placement/Draw/+1, any-Digimon deletion watcher, suspend cost, Draw then hand trash, and own non-Digi-Egg BEATBREAK trash placement under self.
- Proof: positive/refusal/suspended/empty cases, both controllers' deletions, order/face state, Security, plus mixed trait pools and Digi-Egg exclusion. Automation not run; diff check passed. No limitation.

## BT26-096 — Kosuke Misono — 10/10

- Catalog/KB: purple cost-3 TS Tamer, start-turn memory set, Main self-return and reduced Chronomon-text Digimon/TS Tamer play, and Security confirmed. Generic Q4366 defines full “in its text” scope.
- Implementation: full IR/exclusive `registerIrCard`; exact memory threshold, optional deck-bottom return cost, hand/trash union, kind/trait/text filters, paid reduction 2, and Security play.
- Proof: memory boundaries, hand/trash routes, ordering, payment, affordability/refusal, unrelated cards, Security, plus mixed valid/near/nonmatching pools for both branches. Automation not run; diff check passed. No limitation.

## BT26-097 — The Thunder Emperor Awakens — 10/10

- Catalog/KB: yellow cost-2 TS Option with security-scaled surcharge, named-Tamer stack cost, free Jupitermon evolution, Aegiochusmon follow-up, and Security play/add confirmed; no KB entry.
- Implementation: full IR/exclusive `registerIrCard`; current-security cost scaling, bound Aegiomon host, hand/trash Jupitermon evolution ignoring requirements, gated optional top-source placement, and Security fallback.
- Proof: scaling, both named Tamers, both evolution zones, follow-up/refusal/unavailable cost, Security play/fallback. No change; automation not run; diff check passed. No limitation.

## BT26-098 — Queen of Thorns — 10/10

- Catalog/KB: green cost-5 DATA SQUAD Option, face-down Tamer-stack reduction, named two-material Main evolution, and Security play/add confirmed. Q7173 requires both Sunflowmon and Lilamon atomically.
- Implementation: full IR/exclusive `registerIrCard`; optional cost modifier trashes one bottom face-down card for -2, Main places both exact trash materials under one Lalamon then offers free Rosemon evolution, and Security offers Lalamon/Yoshino before adding self to hand.
- Proof: reducer/refusal, both Security branches/fallback, positive evolution, and Q7173 partial failure. No change; automation not run; diff check passed. No unresolved static limitation.

## BT26-099 — Training Manual — 10/10

- Catalog/rules: green cost-3 DM Option, DM Use Requirement, mandatory reveal/add, battlefield placement, face-down-stack Delay, free Lv.6-or-lower DM evolution, and Security Main confirmed. CR §16-42/§16-17 govern Use Req/Delay; no card-specific KB entry.
- Correction: restricted the Use Requirement waiver to DM Digimon/Tamers. The previous broad permanent filter wrongly allowed a DM Option; the reveal filter remains broad enough to add any DM card.
- Proof: valid/invalid Use Req including DM Option, DM Option reveal, mandatory add, Security Main, Delay success and same-turn/face-up/non-Digimon/level-7 refusals. Full IR/exclusive `registerIrCard`; automation not run; diff check passed. No limitation.

## BT26-100 — Dark Field — 10/10

- Catalog/KB: purple/black cost-3 Titan/TS Option, empty/no-face-up-security waiver, face-up Security grants, Main security exchange/free Titan play, and Security free play confirmed. Q7174–Q7181 cover face-up/empty security and Titan boundaries.
- Implementation: full IR/exclusive `registerIrCard`; exact waiver, dynamic Blocker/+3000 grants, bottom-security-to-hand then face-up self placement, and Lv.4-or-lower Titan hand/trash plays.
- Proof: dynamic grants/enabler removal, non-Titan, zero-security/waiver boundary, Main movement/play, Security activation/fallback. No change; automation not run; diff check passed. No limitation.

## BT26-101 — Cross Arts — 10/10

- Catalog/KB: white cost-4 ADAMAS/TS Option with TS Use Requirement, named-Tamer bonus, modal deletion/unsuspend, and Security TS play confirmed. Q7182 keeps the “Then” modal available without the named Tamer.
- Implementation: full IR/exclusive `registerIrCard`; conditional all-own-TS Blocker/+3000 through opponent turn, independent modal, `SelectBind` current-DP deletion limit, and cost-4 TS Digimon/Tamer Security play.
- Proof: Use Req, hand/trash Security, trait/cost boundaries, named bonus with non-TS exclusion, DP deletion, unsuspend, and Q7182. Automation not run; diff check passed. No limitation.

## BT26-102 — Seven Code PAD — 10/10

- Catalog/KB: white cost-7 Appmon/Seven Code Option, Use Req, exact-six mixed-source placement/free Dantemon evolution, and Security Appmon play/self-recovery confirmed. Q7127–Q7128/Q7183–Q7186 cover sequencing, sources, atomicity, order, and optional evolution.
- Correction: restricted the Seven Code Use Requirement waiver to Digimon/Tamers under CR §16-42-3; the broad filter wrongly admitted Seven Code Options.
- Proof: waiver boundaries including Option rejection, Security, mixed battle/link/trash sources, nonmatching preservation, stacked cleanup, five-card atomic failure, ordering, evolution refusal, and corrected stack assertion. Full IR/exclusive `registerIrCard`; automation not run; diff check passed. No limitation.

## BT26-103 — Jupitermon: Wrath Mode — 10/10

- Catalog/KB: yellow/red/black Lv.7 Olympos XII/Iliad/TS, alternate Lv.6 Olympos evolution, Piercing/Reboot/Blocker/Succession, shared recovery, and security-removal penalty confirmed. Q7187–Q7189 cover Counter, zero-security recovery, and Security timing.
- Correction: both unqualified security-removal watchers now use `sourceFilter: { controller: "any" }`; the default mine-only scope wrongly ignored opponent-security removals.
- Proof: recovery/zero security, Counter/shared lock, Succession topmost behavior, security-removal Once Per Turn, plus opponent-security regression. Full IR/exclusive `registerIrCard`; automation not run; diff check passed. No limitation.

## BT26-104 — Kunlun — 10/10

- Catalog/KB: white cost-5 Shambala/SW/TB/TS Tamer with start-main memory, On Play trash/draw, end-turn Option use, and Security play confirmed. Q7190 preserves the end-turn activation after simultaneous Execute/evolution processing.
- Implementation: full IR/exclusive `registerIrCard`; +1 memory, optional Shambala hand-trash then Draw 2, Tentei Hachibushu condition, self-suspend cost, multicolor-capable Shambala Option use without cost, and Security self-play.
- Proof: all clauses, mixed Shambala/nonmatching Options, missing Tentei, missing Option, refusal, and Q7190 timing. Automation not run; diff check passed. No unresolved limitation.

## BT26-075 — ScourgeChiropmon — 10/10

- Catalog/KB: purple/yellow dual Lv.5 Digimon/Option, alternate Lv.4 `Glowing Dawn` evolution for cost 3, `Execute`, `Ascension`, Security/On Deletion trash play, and Option `Despair Blast` confirmed. Q7100–Q7103 cover deletion/Ascension ordering, Security-before-battle, dual-face Security classification, and Option-only Security locks.
- Implementation: full IR with exclusive `registerIrCard`. Conditional color waiver, permanent keywords, bottom-face-down Tamer cost, optional play of a cost-5-or-lower `Glowing Dawn` Digimon/Tamer from trash, and Option deletion of opposing lowest-level Digimon match the contract.
- Proof: existing tests cover catalog/IR, evolution, Option face, cost payment, Security, On Deletion, Ascension ordering, Security lock, lowest-level deletion, Execute, and Ascension. No gap required a change.
- Verification: automation not run by user instruction; `git diff --check` passed before the ledger-only commit. No files besides this ledger changed; no unresolved limitation remains.

## Historical collection closeout

This section's former results are superseded by the authoritative executed
ledger in `docs/audits/BT26-STATIC-AUDIT.md`. The final re-audit passed 104
files and 972 tests, plus the documented shared-mechanism and delivery gates.
