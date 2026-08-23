// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bonusActions = [
  {
    kind: "SelectBind",
    target: {
      count: 1,
      bindAs: "kotemonBonusTarget",
      filter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          { tokens: ["Shambala"], match: "trait" },
          { tokens: ["TS"], match: "trait" },
        ],
      },
    },
  },
  {
    kind: "GainKeyword",
    keyword: { keyword: "Piercing" },
    target: { fromSelectionRef: "kotemonBonusTarget" },
    duration: "forTheTurn",
  },
  { kind: "ModifyDP", amount: 3000, duration: "forTheTurn", target: { fromSelectionRef: "kotemonBonusTarget" } },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: bonusActions },
    { trigger: "WhenMoving", actions: bonusActions },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn", target: { isSelf: true } }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-008", compiled);
