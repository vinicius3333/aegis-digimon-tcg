import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 2,
          fromTop: false,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      optional: true,
      condition: {
        kind: "opponentHas",
        filter: { zone: "battleArea", controllerDefault: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
        countMin: 1,
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], levels: [3] }, count: 1 },
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
          payCost: false,
        },
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"], levels: [4] }, count: 1 },
          from: ["digivolutionCards"],
          fromOwnDigivolutionStack: true,
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };
registerIrCard("BT10-027", compiled);
