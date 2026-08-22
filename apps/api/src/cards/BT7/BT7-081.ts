// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{
        kind: "RevealAdd",
        revealCount: 5,
        add: [
          { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Hybrid", "Ten Warriors"], match: "trait" }] }, count: 1, to: "hand" },
          { filter: { controllerDefault: "mine", kind: ["Tamer"] }, count: 1, to: "hand" },
        ],
        rest: "deckBottom",
      }],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: { controller: "mine", kind: ["Digimon"], digivolutionStackKind: ["Tamer"] },
        actions: [{ kind: "GainMemory", amount: 2 }],
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-081", compiled);
