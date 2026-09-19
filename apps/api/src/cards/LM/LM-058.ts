import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Parkour Training"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have [Parkour Training] in the battle area",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 2,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Blue", "Green"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Blue", "Green"],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
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
          kind: "RevealAdd",
          revealCount: 2,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Blue", "Green"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
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

registerIrCard("LM-058", compiled);
