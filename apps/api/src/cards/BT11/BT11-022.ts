import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const qualifier = {
  controllerDefault: "mine",
  excludeSelf: true,
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Dramon"], match: "name" },
    { tokens: ["Blue Flare"], match: "trait" },
  ],
} satisfies Filter;
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: qualifier,
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: qualifier,
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Bebydomon"], cost: 0, isAlternate: true }],
};

registerIrCard("BT11-022", compiled);
