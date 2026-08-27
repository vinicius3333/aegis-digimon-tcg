// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Recovery", amount: 1, source: "deck" },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Hybrid"], match: "trait" }] },
          },
        },
      ],
    },
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
          into: { nameOrTrait: [{ tokens: ["JetSilphymon"], match: "name" }] },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-038", compiled);
