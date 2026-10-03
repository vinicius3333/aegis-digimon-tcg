import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] ＜Draw 1＞. You may place 1 Digimon card from your hand as the bottom digivolution card of 1 of your [King Drasil_7D6] in the breeding area.",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          from: ["hand"],
          underFilter: {
            controller: "mine",
            zone: "breeding",
            nameOrTrait: [
              {
                tokens: ["King Drasil_7D6"],
                match: "nameExact",
              },
            ],
          },
          optional: true,
        },
        {
          effectTextPart: "Then, place this card in the battle area.",
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
              hostFilter: { zone: "breeding" },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          suppressOnPlayEffects: true,
          bindResultAs: "playedDigimon",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: { boundRef: "playedDigimon" },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-110", compiled);
