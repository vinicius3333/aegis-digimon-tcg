// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{ kind: "RevealAdd", revealCount: 3, add: [
        { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] }, count: 1, to: "hand" },
        { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }] }, count: 1, to: "placeUnder", underFilter: { controller: "mine", kind: ["Digimon"] } },
      ], rest: "deckBottom" }],
    },
    {
      trigger: "YourTurn",
      actions: [{ kind: "Replacement", event: "wouldDigivolve", sourceFilter: { isSelfRef: true }, into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] }, actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1, raw: "reduce the digivolution cost by 1" }] }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-060", compiled);
