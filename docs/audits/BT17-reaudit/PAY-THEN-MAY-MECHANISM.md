# Paid cost, then declined optional effect ("pay, then may")

Status: **landed** (engine lane E2, session 3), on the coordinator decision recorded in
REVIEW-NOTES "Decision (session 3)". The diagnosis, rules reasoning and recommended change
below are unchanged and were implemented as written; what was actually built, the two
adjustments the implementation needed, and the evidence are in "As landed" at the end.

## Symptom

Three BT17 rulings all describe the same outcome that the engine cannot reach: the
activation cost is paid, and the player then declines the "may" payload.

| Card | Ruling | Printed shape | Unreachable state |
| --- | --- | --- | --- |
| BT17-080 Takato Matsuki | Q2853 | "By placing this Tamer and 1 [Growlmon] and 1 [WarGrowlmon] from your trash as the bottom digivolution cards of 1 of your [Guilmon], you may digivolve it into a [Gallantmon] in your hand without paying the cost." | three cards placed, digivolve declined |
| BT17-059 Diaboromon | Q2813 | "By placing 1 [Doomsday Clock] from your hand or trash as this Digimon's bottom digivolution card, you may play 2 Diaboromon tokens." | clock placed, tokens declined |
| BT17-050 Parasitemon | Q2804 | "By paying 4 cost and placing this card ..., you may suspend ... and attack ..." | placed and paid, nothing suspended or attacked |

## Root cause

`runActionInner` in `apps/api/src/engine/effects/interpreter/actions/runAction.ts` raises a
**single** optional prompt for the whole action, and it sits ahead of the cost payment:

```ts
const costUnpayable = payableActionCost !== undefined && !canPayCost(ctx, payableActionCost as Cost);
if (!costUnpayable) {
  const yes = await ctx.ask.optional(ctx, describeAction(action));
  if (!yes) { ...; return action.abortOnDecline === true; }
}
```

The cost is paid only further down, after that prompt. So `optional: true` on an action
means "may I do the cost *and* the effect", and a decline skips both.

A pay-then-ask path already exists a few lines below the payment:

```ts
// When both the processing condition and payload are optional, pay the former
// first, then offer the payload choice (e.g. Q6255: trash, then decline return).
if (action.kind !== "RawUnparsed" && action.optional && actionCost?.optional === true) { ... }
```

but it is reached only when the **cost itself** is marked `optional`. For BT17-059 and
BT17-080 the cost is a mandatory `place` cost, so the leading prompt still governs.

## Rules reasoning

Digimon templating distinguishes two shapes:

- **"By [cost], [effect]"** — `[cost]` is an activation cost, paid when the effect
  activates. A `may` inside `[effect]` applies to the payload only. The cost is spent
  whichever way the player answers. This is what Q2853, Q2813 and Q2804 all confirm.
- **"You may [do X]. If you do, [effect]"** — the whole process is optional; declining
  spends nothing.

The engine's IR does not record which shape a card printed. `optional: true` is used for
both, which is why one prompt currently covers cost and payload alike.

## Recommended change

Smallest correct change is a new per-action IR flag, authored from the printed text, plus
one engine branch:

1. `packages/shared/src/effects/ir/actions/base.ts` — add

   ```ts
   /**
    * "By [cost], you may [effect]": the activation cost is paid on activation and only the
    * payload is declinable. Without it, `optional` gates cost and payload together
    * ("You may [do X]. If you do, ...").
    */
   payCostBeforeOptional?: boolean;
   ```

2. `runAction.ts` — skip the leading `ctx.ask.optional` when
   `action.payCostBeforeOptional === true`, and extend the existing pay-then-ask block's
   condition from `actionCost?.optional === true` to
   `actionCost?.optional === true || action.payCostBeforeOptional === true`.

3. Card modules — set the flag on the "By ..., you may ..." actions: BT17-059 (`PlayToken`)
   and BT17-080 (`Digivolve`), then flip the two `it.fails`.

### Why not a heuristic

Two engine-only discriminators were considered and rejected:

- **`cost.raw` starts with "By "** — matches the official templating, but a file-level scan
  of `apps/api/src/cards` found 146 modules carrying a `place` cost into a digivolution
  stack alongside an `optional: true` action. That is a repo-wide behaviour change that
  cannot be validated inside this lane's RAM budget, and it would wrongly force payment on
  "up to N" costs whose optionality is genuinely part of the cost (BT17-041's
  "by suspending up to 2").
- **treat every mandatory cost under an optional action as pay-first** — same blast radius,
  and it silently reinterprets every card whose whole process really is optional.

The flag keeps the change opt-in and puts the decision where the printed text is read.

## BT17-050 Q2803 and Q2804 need IR changes too

Both BT17-050 reds sit in the card's IR, not only in the interpreter.

- **Q2803** (activation refused with no level 5 or higher host): the `PlaceUnder` is
  `options[0][0]` of the `Modal`, not part of `cost`. Even with the availability gate
  tightened (below), the bullet stays available because its sibling `Suspend` action is
  attemptable and `runModal` uses `option.some(...)`. To honour the ruling the placement
  must move into the modal's `cost` (a compound of `payMemory: 4` + the placement), where
  `canPayCost` refuses up front. That is a `BT17-050.ts` edit.
- **Q2804** (place and pay, then decline the suspend and attack): the desired end state
  places the card, but the `PlaceUnder` lives in `options[0]` while the "decline" branch is
  `options[1] = []`. No option choice reaches "placed, nothing else". Same IR move fixes
  it: with the placement as the cost, `options[1] = []` becomes a real "do nothing more"
  branch — which additionally requires `runModal` to treat an empty option array as
  available (today `[].some(...)` is `false`, so it is filtered out).

## Groundwork landed in this lane

Two engine narrowings were made while diagnosing Q2803. Neither closes a red on its own;
both are strict narrowings that only suppress guaranteed no-ops, and both are prerequisites
for the IR move above.

- `actions/placeUnder.ts` `canAttemptPlaceUnder`: the early `return true` for
  `isSelf` / `isSelfRef` / `targetIsPermanent` / `fromEggDeck` sources skipped the host
  preflight entirely, so a self-placement reported itself attemptable with no legal host.
  The host preflight is now factored into `hostPreflight(ctx, action)` and applied to those
  shapes too (it returns `undefined`, meaning "no host descriptor, caller decides", when the
  action names none).
- `actions/modal.ts`: `canAttemptModalAction` now routes `PlaceUnder` through
  `canAttemptPlaceUnder`, and a new exported `modalHasAvailableOption` lets
  `runActionInner` abort a modal whose every option is un-attemptable **before** its
  activation cost is charged.


---

# As landed (engine lane E2)

## The flag

`packages/shared/src/effects/ir/actions/base.ts`:

```ts
payCostBeforeOptional?: boolean;
```

"By [cost], you may [effect]": the activation cost is paid when the effect activates and
only the payload is declinable. Authored per card from the printed wording and its ruling;
no generator-wide default, because a genuinely optional "up to N" cost (BT17-041) must keep
the combined prompt.

## The engine branch, and the one correction to the recommendation

`runAction.ts` `runActionInner` as recommended: skip the leading `ctx.ask.optional` when the
flag is set. The second half needed a change. The existing pay-then-ask block sits BETWEEN
the primary cost payment and the `additionalCosts` loop, which is fine for the
`actionCost?.optional` case (a single cost) but wrong for a "By placing A and B and C"
clause: asking there would leave Q2853's placement half-done — this Tamer placed, [Growlmon]
and [WarGrowlmon] still in the trash.

So the flag gets its own prompt AFTER the additional-cost loop, and the original block keeps
its `actionCost?.optional === true` condition untouched. The whole printed cost is paid, then
the payload is offered.

## Card modules

- **BT17-080** (Q2853) — `payCostBeforeOptional: true` on the `Digivolve`.
- **BT17-059** (Q2813) — `payCostBeforeOptional: true` on the `PlayToken`.
- **BT17-050** (Q2803/Q2804) — the `PlaceUnder` moved out of `options[0]` and into the
  modal's `cost`, as a `compound` of `payMemory: 4` and the placement, plus
  `payCostBeforeOptional: true`. One extra field was required that the recommendation did not
  anticipate: `host: "target"`. `payCost`'s loose-place branch only reads `underFilter` as the
  destination when `host === "target"`; without it the placement falls back to the source
  permanent, which does not exist while the card is in hand, and the cost silently fails after
  the memory was already spent.

## `runModal`: an empty option list is a real branch

`actions/modal.ts` now shares one `optionIsAvailable` predicate between `runModal` and
`modalHasAvailableOption`, and it admits an EMPTY option list. `[].some(...)` is false, so
Q2804's `options[1] = []` — the "placed, nothing else" branch — was being filtered out of
every offer. Every non-empty option still needs at least one attemptable action, and the
`optionConditions` gate is unchanged.

## `canActivateEffect` preflights a CostGatedBlock's payload (BT17-085, Q2868)

Same family, added on the coordinator's session-3 addendum. `intrinsicPossible` in
`interpreter/effect.ts` had no `CostGatedBlock` case, so BT17-085 Rika's [Main] activated with
no legal [Sakuyamon] in hand, paid its compound place cost and then fizzled — burying Rika,
[Kyubimon] and [Taomon] under Renamon (stack length 3, expected 0).

`intrinsicPossible` now recurses into the block's inner actions. The payload's own target is
not yet bound at declaration (it reads `fromSelectionRef: "rikaTarget"`, which the cost binds),
so each inner action whose target names a ref the block's place costs bind is preflighted
against that cost's destination filter — the same substitution `runActionInner` already makes
for a `Digivolve` whose target its own place cost produces.

## Evidence

All `--maxWorkers=1 --no-file-parallelism`.

| File | Red | Green |
| --- | --- | --- |
| `src/cards/BT17/BT17-080.test.ts` | `Tests 10 passed \| 1 expected fail (11)` | `Tests 10 passed (10)` |
| `src/cards/BT17/BT17-059.test.ts` | `Tests 9 passed \| 1 expected fail (10)` | `Tests 9 passed (9)` |
| `src/cards/BT17/BT17-050.test.ts` | `Tests 6 passed \| 2 expected fail (8)` | `Tests 8 passed (8)` |
| `src/cards/BT17/BT17-085.test.ts` | `Tests 7 passed \| 1 expected fail (8)` | `Tests 8 passed (8)` |

## Two superseded tests removed

Each of BT17-080 and BT17-059 carried a test asserting the PRE-ruling endpoint on exactly the
fixture and decision path its new ruling test uses — "may decline the natural end-of-turn
evolution without moving its required cards" and "declines the whole optional effect: no clock
placed, no tokens". Both claim the outcome Q2853/Q2813 say is unreachable, and both are direct
contradictions of the tests beside them rather than additional coverage. They were deleted with
a comment in place naming the ruling; nothing else in either file changed.

## Two assertions corrected in BT17-085

Both "no legal [Sakuyamon]" tests asserted `applyIntent(...).ok === true` and then that nothing
moved. With the preflight the activation is REFUSED, which is the stronger endpoint: the
`ok === false` assertion plus the unchanged "nothing moved" endpoints now prove the ruling
outright. This also removes the unanswered optional decision the first of those tests leaked,
which was the reported cause of the BT17-019 cross-file timeout.
