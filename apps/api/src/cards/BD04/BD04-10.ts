import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Delete 1 of your opponent's level 5 or lower Digimon.",
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, 1 of your [Shaman] trait Digimon unsuspends and gains ＜Blocker＞ until your opponent's turn ends.",
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shaman"], match: "trait" }] },
            count: 1,
            bindAs: "shamanBlocker",
          },
        },
        {
          kind: "Unsuspend",
          target: { filter: {}, count: 1, fromSelectionRef: "shamanBlocker" },
        },
        {
          kind: "GainKeyword",
          target: { filter: {}, count: 1, fromSelectionRef: "shamanBlocker" },
          keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 6 } },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-10", compiled);
