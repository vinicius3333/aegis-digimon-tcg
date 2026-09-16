import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] ＜Draw 2＞.",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart:
            "Then, you may use 1 single-color Option card with a cost of 5 or less from your hand without paying the cost.",
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
