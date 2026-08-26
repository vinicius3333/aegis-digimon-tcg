// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const actions = [
  { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
  {
    kind: "PlaceUnder",
    target: { filter: { controller: "mine" }, from: ["hand"], count: 1, upTo: true },
    position: "bottom",
    faceDown: true,
    optional: false,
  },
  {
    kind: "ModifyDP",
    target: self,
    amount: 1000,
    duration: "untilOpponentTurnEnd",
    scaling: { per: 1, unit: "digivolutionCards", filter: { isSelfRef: true, faceDown: true } },
    condition: { kind: "ifThisEffectActed" },
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        { keyword: "Training", raw: "＜Training＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
      ],
    },
    { trigger: "WhenMoving", actions },
    { trigger: "OnPlay", actions },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["DM"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-040", compiled);
