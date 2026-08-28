// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handCost = {
  controllerDefault: "mine",
  zone: "hand",
  nameOrTrait: [
    { tokens: ["Game"], match: "trait" },
    { tokens: ["Open", "Open (App Name)"], match: "trait" },
    { tokens: ["Seven Code"], match: "trait" },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }],
      actions: [],
    },
    {
      trigger: "WhenAttacking",
      isInherited: false,
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: { kind: "trash", target: { filter: handCost, count: 1 } },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      isLinked: true,
      keywords: [
        { keyword: "Progress", raw: "＜Progress＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
      ],
      actions: [],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT26-010", compiled);
