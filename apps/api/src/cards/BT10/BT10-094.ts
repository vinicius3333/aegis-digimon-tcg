// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 2000,
          duration: "forTheTurn",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
            from: ["hand"],
          },
          underFilter: { controller: "mine", kind: ["Digimon"] },
          position: "bottom",
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: { kind: "ifThisEffectActed", raw: "this effect placed Gammamon" },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-094", compiled);
