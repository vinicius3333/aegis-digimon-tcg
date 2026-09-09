import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR (no AUTO-GENERATED header, so the generator preserves this file).
//
// BT19-040 Sakuyamon — KB authority (node tools/kb/query.mjs card BT19-040):
//   Q5469: the "when you use an Option card" watcher resolves AFTER the used Option's [Main]
//     effect. Production owns that order: `playCard` fires `fireOptionUsed` only once the
//     Option has finished resolving and been routed to trash/delay.
//   Q5470: it does NOT trigger when an Option's effect activates by a method OTHER than use
//     (a [Security] effect, ＜Delay＞). The `whenOptionUsed` produce sites are the two USE
//     paths only — `playCard` and `useOptionFromHand`.
//   Q5471/Q5472/Q5473: the "cost of 2 or more" gate reads the Option's USE COST — the printed
//     cost as changed by card-level effects, before any payment-only reduction and regardless
//     of whether the cost was paid at all. `triggerOptionCostAtLeast` reads exactly the value
//     production carries on the trigger (`optionUseCost`, not the paid amount).
//
// Banlist: restricted to 1 copy per deck since 2025-09-01 (data/kb/banlist.json). That is a
// deck-construction rule with no in-game effect, so it is not encoded here.
//
// `filter.playCostLte: 5` encodes the printed "cost of 5 or less" cap and `colorCount: 1` the
// printed "single-color" cap; the ＜Draw 2＞ and the Option use are one ordered [When
// Digivolving] effect ("＜Draw 2＞. Then, you may use ...").
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            colorCount: 1,
            playCostLte: 5,
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          raw: "you may use 1 single-color Option card with a cost of 5 or less from your hand without paying the cost",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerOptionCostAtLeast",
            value: 2,
            raw: "when you use an Option card with a cost of 2 or more",
          },
          actions: [
            {
              kind: "PlayToken",
              tokens: [
                {
                  name: "Pipe Fox",
                  color: "Yellow",
                  dp: 6000,
                  keywords: [{ keyword: "Blocker" }],
                },
              ],
              count: 1,
              payCost: false,
              raw: "play 1 [Pipe Fox] Token (Digimon/Yellow/6000 DP/<Blocker>)",
            },
          ],
          raw: "[Your Turn][Once Per Turn] When you use an Option card with a cost of 2 or more, play 1 [Pipe Fox] Token",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Sakuyamon: Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-040", compiled);
