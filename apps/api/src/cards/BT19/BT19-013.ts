import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: {
                filter: {
                  zone: "digivolutionCards",
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [
                    {
                      tokens: ["Xros Heart"],
                      match: "trait",
                    },
                  ],
                },
                count: 3,
                upTo: true,
              },
              from: ["digivolutionCards"],
              underFilter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamers",
              nameOrTrait: [
                {
                  tokens: ["Xros Heart"],
                  match: "trait",
                },
              ],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["underTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        { names: ["Shoutmon"] },
        { names: ["Ballistamon"] },
        { names: ["Dorulumon"] },
        { names: ["Starmons"] },
        { names: ["Sparrowmon"] },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT19-013", compiled);
