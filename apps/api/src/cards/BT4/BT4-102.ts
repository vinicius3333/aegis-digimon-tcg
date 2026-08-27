// The source-trash clause is explicit card effect processing, not merely the automatic
// trashing of stacked cards when a Digimon leaves play. Bind the opponent targets so
// TrashDigivolution fires the real source-trash primitive before the return (as in ST8-12
// and BT6-030), preserving source-trigger behavior while keeping the return destinations.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              allowTokens: true,
            },
            count: 1,
          },
          to: "hand",
          raw: "by returning 1 of your Digimon to its owner's hand",
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 2,
            upTo: true,
            bindAs: "aquaViperTargets",
          },
        },
        {
          kind: "TrashDigivolution",
          target: { filter: {}, count: 2, fromSelectionRef: "aquaViperTargets" },
          amount: 99,
        },
        {
          kind: "Return",
          target: { filter: {}, count: 2, fromSelectionRef: "aquaViperTargets" },
          to: "hand",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-102", compiled);
