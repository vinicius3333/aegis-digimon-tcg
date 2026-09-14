import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] If this Digimon has 1 digivolution card, you may place up to 2 level 4 or lower yellow Digimon cards from your hand at the bottom of this Digimon's digivolution cards in any order.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              levelComparison: { op: "lte", value: 4 },
            },
            from: ["hand"],
            count: 2,
            upTo: true,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          order: "any",
          optional: true,
          trackCount: "stefilmonPlaced",
          condition: { kind: "selfDigivolutionCountExactly", value: 1 },
        },
        {
          effectTextPart: "Then, ＜Draw 1＞ for each Digimon card you placed. (Draw 1 card from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 1,
          scaling: { per: 1, unit: "namedCount", countSource: "stefilmonPlaced" },
          condition: { kind: "namedCountAtLeast", countSource: "stefilmonPlaced", count: 1 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: 1 },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-039", compiled);
