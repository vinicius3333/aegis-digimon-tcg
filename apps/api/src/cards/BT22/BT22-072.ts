import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Night Claw", "Light Fang"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          notSameNameAs: ["battleArea"],
          condition: { kind: "stackHasSameLevelCards", count: 2 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [{ tokens: ["Night Claw", "Light Fang", "Galaxy"], match: "trait" }],
          },
          cost: {
            kind: "trash",
            target: {
              filter: { zone: "digivolutionCards", isSelfRef: true, sameLevelPair: true },
              count: 2,
              from: ["digivolutionCards"],
            },
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["Night Claw", "Light Fang", "CS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT22-072", compiled);
export default compiled;
