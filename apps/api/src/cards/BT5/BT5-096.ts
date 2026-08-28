// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The printed source-trash clause is explicit effect processing. Bind every eligible
// opponent stack, emit TrashDigivolution for that complete set, then return the same
// Digimon. Automatic attachment cleanup during Return does not emit source-trash events.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } },
            count: "all",
            bindAs: "normalReturnTargets",
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Garurumon", "Omnimon"], match: "name" }],
            },
          },
        },
        {
          kind: "TrashDigivolution",
          target: { filter: {}, count: "all", fromSelectionRef: "normalReturnTargets" },
          amount: 99,
        },
        {
          kind: "Return",
          target: { filter: {}, count: "all", fromSelectionRef: "normalReturnTargets" },
          to: "hand",
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 5000 } },
            count: "all",
            bindAs: "upgradedReturnTargets",
          },
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Garurumon", "Omnimon"], match: "name" }],
            },
            count: 1,
          },
        },
        {
          kind: "TrashDigivolution",
          target: { filter: {}, count: "all", fromSelectionRef: "upgradedReturnTargets" },
          amount: 99,
        },
        {
          kind: "Return",
          target: { filter: {}, count: "all", fromSelectionRef: "upgradedReturnTargets" },
          to: "hand",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-096", compiled);
