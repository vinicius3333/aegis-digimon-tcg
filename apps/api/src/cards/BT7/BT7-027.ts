import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "digivolutionCards",
              kind: ["Digimon"],
              levelComparison: { op: "eq", value: 3 },
              hostFilter: { controller: "mine", kind: ["Digimon"] },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          suspended: false,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "playedLv3",
          raw: "You may play 1 level 3 Digimon card from one of your Digimon's digivolution cards without paying the memory cost.",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"] },
            from: ["hand"],
            count: 1,
          },
          underFilter: { controller: "mine", kind: ["Digimon"] },
          position: "bottom",
          optional: true,
          condition: { kind: "ifThisEffectActed" },
          raw: "If you do, you may place 1 blue Digimon card from your hand at the bottom of one of your Digimon's digivolution cards.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-027", compiled);
