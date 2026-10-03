import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] You may play 1 white Tamer card with a play cost of 4 or less from your hand without paying its memory cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart: "Then, your opponent may play 1 Tamer card from their hand without paying its memory cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
              kind: ["Tamer"],
            },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-083", compiled);
