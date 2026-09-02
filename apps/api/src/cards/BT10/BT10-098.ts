import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "automatic",
            condition: {
              kind: "opponentHas",
              filter: {
                zone: "battleArea",
                controllerDefault: "opponent",
                kind: ["Digimon"],
              },
              count: 2,
              raw: "your opponent has 2 or more Digimon in play",
            },
          },
          amount: { kind: "fixed", value: 2 },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 6,
              },
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-098", compiled);
