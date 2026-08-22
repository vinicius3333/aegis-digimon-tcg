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
        { kind: "RevealAdd", revealCount: 3, add: [{ filter: { controller: "mine", kind: ["Digimon"], ...sevenCode }, count: 1, to: "play", costDelta: 3, optional: true }], rest: "deckTopOrBottom" },
        { kind: "RawUnparsed", text: "A revealed [Seven Code] Option may be used with its cost reduced by 3; after its Main effect resolves, return the rest of the revealed cards to the top or bottom of the deck (Q7126-Q7127)." },
      ] }],
    },
    {
      trigger: "Static",
      isLinked: true,
      actions: [{ kind: "SubTrigger", event: "whenLinked", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Link", target: { filter: linkedTrash, count: 1 }, recipient: self, from: ["trash"], payCost: false, optional: true }] }],
    },
  ],
  coverage: "partial",
  residual: ["RevealAdd has no executable useOption disposition for a revealed [Seven Code] Option; the Option-use path and its post-Main reveal return remain explicit RawUnparsed until that reusable seam exists."],
  digivolutionRequirement: [{ level: 2, traits: ["Appmon"], cost: 0, isAlternate: true }],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
};

registerIrCard("BT26-084", compiled);
export default compiled;
