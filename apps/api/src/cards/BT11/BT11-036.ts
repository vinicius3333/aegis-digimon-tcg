import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }] },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
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
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Chuumon"], match: "name" }] }, count: 1 },
          from: ["trash"],
          payCost: false,
          suspended: true,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Sukamon", "Etemon"],
            raw: "this Digimon has [Sukamon] or [Etemon] in its name",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-036", compiled);
