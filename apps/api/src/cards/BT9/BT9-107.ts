// Hand-authored override — do not regenerate.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Q1915/Q1916: discard count drives repeated De-Digivolve 1 on one bound target;
// the later level-4 deletion is a fresh target choice.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
            },
            count: 3,
            upTo: true,
          },
          trackCount: "metalImpulseDiscarded",
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "metalImpulseTarget",
          },
          condition: {
            kind: "namedCountAtLeast",
            countSource: "metalImpulseDiscarded",
            count: 1,
          },
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "metalImpulseTarget",
          },
          amount: 1,
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "metalImpulseDiscarded",
          },
          stopAtLevel: 3,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-107", compiled);
