import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isFromTrash: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { zone: "trash", controller: "mine" },
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] },
            count: 1,
          },
          mode: "prevent",
          leaveCause: "any",
          digivolveFromTrash: true,
          optional: true,
          abortOnDecline: true,
          raw: "By digivolving it into this card without paying the cost",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "not",
            condition: {
              kind: "anyOf",
              conditions: [
                {
                  kind: "selfHasInDigivolutionCards",
                  nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }],
                },
                { kind: "digivolvedFromZone", zone: "trash" },
              ],
            },
          },
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 6 }, count: 1 },
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasInDigivolutionCards", nameOrTrait: [{ tokens: ["DoruGreymon"], match: "name" }] },
              { kind: "digivolvedFromZone", zone: "trash" },
            ],
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "SelectBind",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, bindAs: "chosenDigimon", upTo: true },
        },
        { kind: "Delete", target: { filter: {}, count: 1, fromSelectionRef: "chosenDigimon" } },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "level", op: "lte", selectionRef: "chosenDigimon" },
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
      optional: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["DoruGreymon"], cost: 1, isAlternate: true }],
};

registerIrCard("BT17-067", compiled);
