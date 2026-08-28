import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the cost by 1",
              condition: {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Black"] },
                raw: "you have a black Tamer in play",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 },
          amount: 1,
          stopAtLevel: 3,
        },
        { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 6 }, count: 3 } },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-108", compiled);
