// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "AllTurns", isFromTrash: true, actions: [{ kind: "Replacement", event: "wouldBeDeleted", sourceFilter: { zone: "trash", controller: "mine" }, target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] } }, mode: "prevent", leaveCause: "any", digivolveFromTrash: true, optional: true, abortOnDecline: true, raw: "By digivolving it into this card without paying the cost" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 }, optional: true },
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] },
              },
              { kind: "digivolvedFromZone", zone: "trash" },
            ],
          },
          ifTrue: [
            {
              kind: "Delete",
              target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 6 }, count: 1 },
            },
          ],
          ifFalse: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    },
    { trigger: "EndOfAttack", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }], isInherited: true, frequency: "OncePerTurn" },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-067", compiled);
