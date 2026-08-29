// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grantTarget = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Social"], match: "trait" },
      { tokens: ["Tool"], match: "trait" },
      { tokens: ["Open"], match: "trait" },
      { tokens: ["Seven Code"], match: "trait" },
    ],
  },
  count: 1,
  bindAs: "grantTarget",
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }], actions: [] },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          sourceFilter: { isSelfRef: true },
          actions: [
            { kind: "SelectBind", target: grantTarget },
            {
              kind: "GainKeyword",
              keyword: { keyword: "Collision" },
              target: { filter: { boundRef: "grantTarget" }, count: 1 },
              duration: "forTheTurn",
            },
            {
              kind: "ModifyDP",
              target: { filter: { boundRef: "grantTarget" }, count: 1 },
              amount: 3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};
registerIrCard("BT26-051", compiled);
export default compiled;
