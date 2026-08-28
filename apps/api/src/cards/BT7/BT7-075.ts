// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          costType: "digivolve",
          mode: "delta",
          amount: -2,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          sourceFilter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
          into: { nameOrTrait: [{ tokens: ["Rhihimon"], match: "name" }] },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", zone: "trash", kind: ["Tamer"], colors: ["Purple"] }, count: 1 },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "triggerDeletedStackMatchesFilter",
            filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-075", compiled);
