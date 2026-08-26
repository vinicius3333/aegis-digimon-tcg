import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
              hostFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
            },
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
          to: "deckBottom",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Seadramon"], match: "name" }],
            },
            raw: "you have a Digimon with [Seadramon] in its name in play",
          },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-098", compiled);
