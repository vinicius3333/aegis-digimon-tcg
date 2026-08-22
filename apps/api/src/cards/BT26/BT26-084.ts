// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const sevenCode = { nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }] };
const linkedTrash = { controller: "mine", zone: "trash", kind: ["Digimon", "Tamer", "Option"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [
  { tokens: ["System"], match: "trait" },
  { tokens: ["Seven Code"], match: "trait" },
] };

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }],
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [
        { kind: "RevealAdd", revealCount: 3, add: [
          { filter: { controller: "mine", kind: ["Digimon"], ...sevenCode }, count: 1, to: "play", costDelta: 3, optional: true },
          { filter: { controller: "mine", kind: ["Option"], ...sevenCode }, count: 1, to: "useOption", costDelta: 3, optional: true },
        ], rest: "deckTopOrBottom" },
      ] }],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Link", target: { filter: linkedTrash, count: 1 }, recipient: self, from: ["trash"], payCost: false, optional: true }] }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT26-084", compiled);
export default compiled;
