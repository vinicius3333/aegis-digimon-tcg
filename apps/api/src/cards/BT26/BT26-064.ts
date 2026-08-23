// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const evil = { nameOrTrait: [{ tokens: ["Fallen Angel", "Undead", "Wizard", "Demon Lord"], match: "trait" }] };
const ts = { nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            { filter: evil, count: 1, to: "hand" },
            { filter: ts, count: 1, to: "hand" },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } }, optional: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 2, traits: ["TS"], cost: 0, isAlternate: true }],
};
registerIrCard("BT26-064", compiled);
