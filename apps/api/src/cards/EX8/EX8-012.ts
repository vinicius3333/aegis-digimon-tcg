// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const stackGate = {
  kind: "anyOf",
  conditions: [
    { kind: "selfDigivolutionStackMatchesFilter", filter: { nameOrTrait: [{ tokens: ["Growlmon"], match: "name" }] } },
    { kind: "selfDigivolutionStackHasTrait", filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
        {
          kind: "GainTriggeredEffect",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          gainedTrigger: "OnDeletion",
          gainedActions: [
            {
              kind: "PlayWithoutCost",
              from: ["trash"],
              payCost: false,
              optional: true,
              target: {
                filter: { controller: "mine", nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }] },
                count: 1,
              },
            },
          ],
          duration: "untilOpponentTurnEnd",
          condition: stackGate,
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          raw: "when any of your opponent's Digimon is deleted",
          actions: [{ kind: "GainMemory", amount: 1 }],
          fireCondition: { kind: "selfIsInBattleArea" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Growlmon"], cost: 0, isAlternate: true }],
};

registerIrCard("EX8-012", compiled);
