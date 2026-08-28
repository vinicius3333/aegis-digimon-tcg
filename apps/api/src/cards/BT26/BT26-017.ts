// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const shambalaTarget = {
  count: 1,
  filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Shambala"], match: "trait" }] },
};
const grantActions = [
  { kind: "SelectBind", target: { ...shambalaTarget, bindAs: "zanbamonGrantTarget" } },
  {
    kind: "GainKeyword",
    target: { fromSelectionRef: "zanbamonGrantTarget" },
    keyword: { keyword: "SecurityAttack", amount: 1 },
    duration: "forTheTurn",
  },
  {
    kind: "GainKeyword",
    target: { fromSelectionRef: "zanbamonGrantTarget" },
    keyword: { keyword: "Progress" },
    duration: "forTheTurn",
  },
];
const playTrash = {
  kind: "PlayWithoutCost",
  from: ["trash"],
  payCost: false,
  optional: true,
  target: {
    count: 1,
    filter: {
      controller: "mine",
      kind: ["Digimon", "Tamer"],
      playCostLte: 5,
      nameOrTrait: [
        { tokens: ["Shambala"], match: "trait" },
        { tokens: ["TS"], match: "trait" },
      ],
    },
  },
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Blocker", raw: "＜Blocker＞" },
        { keyword: "Retaliation", raw: "＜Retaliation＞" },
      ],
    },
    { trigger: "OnPlay", actions: grantActions },
    { trigger: "WhenDigivolving", actions: grantActions },
    { trigger: "OnDeletion", actions: [playTrash] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-017", compiled);
