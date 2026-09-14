import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] 1 of your green Digimon may digivolve into a green Digimon card in the hand with the digivolution cost reduced by 3.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
          },
          from: ["hand"],
          reduceCost: 3,
          payCost: true,
          ignoreRequirements: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      condition: {
        kind: "opponentHas",
        filter: {
          controllerDefault: "opponent",
          kind: ["Digimon"],
        },
        raw: "your opponent has a Digimon",
      },
      actions: [
        {
          effectTextPart:
            "[Start of Your Turn] If your opponent has a Digimon, ＜Delay＞ \n・ Return 1 green Digimon card from your trash to the top of the deck.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
            },
            count: 1,
          },
          to: "deckTop",
        },
        {
          effectTextPart:
            "Then, if you don't have a Digimon, you may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              dp: {
                op: "lte",
                value: 2000,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you don't have a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 green Digimon card with 2000 DP or less from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              dp: {
                op: "lte",
                value: 2000,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-030", compiled);
