import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const actions: Action[] = [
  {
    effectTextPart: "[When Moving] [On Play] Suspend 1 of your opponent's Digimon.",
    kind: "Suspend",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  },
  {
    effectTextPart:
      "Then, by placing 1 card in your hand face down as this Digimon's bottom digivolution card, this Digimon gets +1000 DP until your opponent's turn ends for each of its face-down digivolution cards.",
    kind: "PlaceUnder",
    target: { filter: { controller: "mine" }, from: ["hand"], count: 1 },
    position: "bottom",
    faceDown: true,
    optional: true,
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
