import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "TrashTopDeck", controller: "mine", amount: 3 },
        {
          effectTextPart:
            "Then, you may play up to 2 black and/or purple Digimon cards with play costs of 8 or less from your trash without paying their memory costs.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              colors: ["Black", "Purple"],
              playCostLte: 8,
            },
            count: 2,
            upTo: true,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], unsuspended: true, playCostLte: 12 },
            count: 1,
          },
          cost: {
            kind: "return",
            to: "hand",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                kind: ["Digimon"],
                hostFilter: { isSelfRef: true },
                levelComparison: { op: "eq", value: 6 },
              },
              count: 1,
            },
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-087", compiled);
