import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const bonusActions: Action[] = [
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
    target: { filter: {}, count: 1, fromSelectionRef: "kotemonBonusTarget" },
    duration: "forTheTurn",
  },
  {
    kind: "ModifyDP",
    amount: 3000,
    duration: "forTheTurn",
    target: { filter: {}, count: 1, fromSelectionRef: "kotemonBonusTarget" },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: bonusActions },
    { trigger: "WhenMoving", actions: bonusActions },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        { kind: "ModifyDP", amount: 2000, duration: "forTheTurn", target: { filter: {}, count: 1, isSelf: true } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-008", compiled);
