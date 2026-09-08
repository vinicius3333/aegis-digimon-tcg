# P-107 Defense Training — ＜Delay＞ cost-reduction fix

Out-of-set defect found while re-auditing EX10-032 (Q5092). See `REVIEW-NOTES.md`,
"Out-of-set defects found in round 2".

## Printed text

```
[Main] Reveal the top 2 cards of your deck. Add 1 black card among them to your hand. Place
the rest at the bottom of your deck in any order. Then, place this card into your battle area.
[Main] ＜Delay＞
・1 of your Digimon may digivolve into a black Digimon card in your hand for its digivolution
cost. When it would digivolve by this effect, reduce the cost by 2.
```

## Mechanism of the defect

`apps/api/src/cards/P/P-107.ts` modelled "reduce the cost by 2" as a sibling
`Replacement { event: "wouldDigivolve", mode: "reduceCost", amount: 2 }` listed **after** the
`Digivolve` action in the same `actions` array. Consequences:

1. The replacement was installed only once the digivolve it was meant to modify had already
   been paid for, so the ＜Delay＞ digivolution paid its full printed cost.
2. The replacement stayed armed after the Option was trashed as the ＜Delay＞ cost, so the −2
   fell on the **next** digivolution instead — the Q5092 breach (P-107's clause and another
   card's digivolving effect must not combine).

`packages/shared/src/effects/ir/actions/digivolve.ts` states the rule directly on
`reduceCostScaling`: a reduction belonging to a digivolve verb "must NOT be modelled as a
separate `wouldDigivolve` replacement — a replacement installed alongside the action cannot
reach the action's own digivolve".

A second, smaller defect: `into` was written as `{ filter: { … colors: ["Black"] } }`. `Filter`
has no `filter` member, so the black-Digimon restriction was silently dropped.

## Fix

`apps/api/src/cards/P/P-107.ts`, second `[Main]` effect — follow the established pattern of the
sibling Training Option `P-108`:

- the `Replacement` action is deleted and the reduction folded into the verb as
  `reduceCost: 2`, which `runDigivolve` forwards as `costDelta: -2` for that digivolution only;
- `into` is flattened to the plain `Filter` shape used by P-106/P-108, restoring the
  black-Digimon restriction;
- `allowNoTarget: true` keeps the printed "may digivolve" branch able to end cleanly.

No engine change was needed. The "not the turn it entered play" gate is already intrinsic:
`registration/module.ts` gives every ＜Delay＞ `[Main]` clause
`self.enterFieldTurnCount !== ctx.game.state.turnCount`. The reviewer's note that P-107 lacked
that gate was a misreading of the IR; the new same-turn test proves the gate holds.

## Red → green

| Test | File:line | Was | Now |
| --- | --- | --- | --- |
| `Q5092 P-107's ＜Delay＞, played and activated publicly, reaches this card only by the ORDINARY route` | `apps/api/src/cards/EX10/EX10-032.test.ts:1246` | `it.fails` | `it`, green |
| `Q5092 leak: P-107's spent -2 must not reduce this card's [Hand] [Main] cost` | `apps/api/src/cards/EX10/EX10-032.test.ts:1422` | `it.fails` | `it`, green |
| `OnDeclaration <Delay> reduces its OWN digivolution cost by 2 and installs no replacement` | `apps/api/src/cards/P/P-107.test.ts:424` | asserted the leaked `subscribeReplacement` | asserts `costDelta: -2` on `digivolveFromInstance` and zero replacements |
| `＜Delay＞ cannot be activated on the turn the Option enters play` | `apps/api/src/cards/P/P-107.test.ts:567` | — | new |
| `＜Delay＞ digivolves on a later turn for its cost reduced by 2, and the reduction does not leak` | `apps/api/src/cards/P/P-107.test.ts:596` | — | new |

The two new P-107 proofs run entirely on public intents: `playCard` places the Option,
`activateEffect` fires the ＜Delay＞ a turn later (BT3-067 Tankmon → BT10-064 Gogmamon, printed
cost 3, memory 5 → 4), and a following ordinary `digivolve` of an identical pair pays the full
3 (memory 5 → 2), so nothing survives the trashed Option.

## Adjusted neighbouring test

`Q5092 negative: the activated ＜Delay＞ cannot put this card onto a Lv.3 [Sunarizamon] …`
(`EX10-032.test.ts:1329`) previously activated the ＜Delay＞ on a board holding only a Lv.3
[Sunarizamon]. That activation was possible only because of the defect: the trailing
`Replacement` action made the clause pass `canActivateEffect`. With the reduction folded into
the verb, the clause's single action is the `Digivolve`, and `canAttemptDigivolve` finds no
legal destination, so the engine offers nothing. The test now asserts that refusal — a stronger
form of the same negative claim — and then shows the `[Hand] [Main]` clause resolving on its
own at its own cost with P-107 sitting unused in play.

The `Q5092 leak` test needed a ＜Delay＞ that really resolves, so its board gained BT3-067 and
its hand BT10-064 as the ＜Delay＞'s legal digivolution. Its final memory reading is 2, not the
1 the red predicted: the `[Close]` Tamer suspends for 1 memory when the `[When Digivolving]`
clause trashes the `[Mineral]` card. The payment itself is asserted on the `memoryChanged`
event with `reason: "digivolve"` (3 → 1, cost 2 — no leak).

## Gates

- `pnpm --filter @aegis/api exec vitest run src/cards/P/P-107.test.ts src/cards/EX10/EX10-032.test.ts --maxWorkers=1 --no-file-parallelism` — 34 passed
- `pnpm typecheck` — clean
- `pnpm exec oxlint` / `pnpm exec oxfmt --check` on the changed files — clean

## Known neighbour, not fixed here

`apps/api/src/cards/P/P-106.ts` (Attack Training, green) carries the identical trailing
`wouldDigivolve reduceCost` replacement and the same leak. It is outside this lane's allowed
edits; it needs the same `reduceCost: 2` fold.
