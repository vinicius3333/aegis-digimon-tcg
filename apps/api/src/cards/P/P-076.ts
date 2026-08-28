// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 2,
          sourceFilter: { isSelfRef: true },
          into: {
            controllerDefault: "mine",
            or: [{ multicolor: true }, { nameOrTrait: [{ tokens: ["Composite"], match: "trait" }] }],
          },
          raw: "reduce the digivolution cost by 2 for a 2-color or Composite card",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
            count: 1,
            upTo: true,
          },
          scaling: { per: 1, filter: { isSelfRef: true }, unit: "colors" },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-076", compiled);
