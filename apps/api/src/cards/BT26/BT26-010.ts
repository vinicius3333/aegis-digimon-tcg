// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handCost = {
  controllerDefault: "mine",
  zone: "hand",
  nameOrTrait: [
    { tokens: ["Game"], match: "trait" },
    { tokens: ["Open"], match: "trait" },
    { tokens: ["Seven Code"], match: "trait" },
  ],
};

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }],
  effects: [{
    trigger: "WhenAttacking",
    isInherited: false,
    actions: [{
      kind: "Draw",
      controller: "mine",
      amount: 2,
      cost: { kind: "trash", target: { filter: handCost, count: 1 } },
    }],
  }, {
    trigger: "Static",
    isLinked: true,
    keywords: [
      { keyword: "Progress", raw: "＜Progress＞" },
      { keyword: "Piercing", raw: "＜Piercing＞" },
    ],
    actions: [],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-010", compiled);
