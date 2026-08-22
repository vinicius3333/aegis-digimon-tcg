// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const main = [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: -3000,
    duration: "untilEachTurnEnd",
    raw: "1 of your opponent's Digimon gets -3000 DP for the turn.",
  },
  {
    kind: "GainKeyword",
    target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Rasenmon"], match: "name" }] }, count: 1 },
    keyword: { keyword: "SecurityAttack", amount: 1 },
    duration: "untilEachTurnEnd",
    raw: "1 of your [Rasenmon] gains ＜Security Attack +1＞ for the turn.",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [{
        kind: "CostModifier",
        costType: "play",
        mode: "set",
        amount: 0,
        handResident: true,
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        duration: "permanent",
        scaling: { per: 1, unit: "security", floor: 1, filter: { controller: "mine" } },
      }],
    },
    { trigger: "Main", actions: main },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-100", compiled);
