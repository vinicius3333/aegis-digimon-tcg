import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              { tokens: ["Lilithmon"], match: "nameExact" },
              { tokens: ["X Antibody"], match: "nameExact" },
            ],
          },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: { excludeSelf: true, kind: ["Digimon"] },
                  count: 1,
                },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          raw: "[All Turns] [Once Per Turn] When another Digimon is deleted, if it's your turn, you may play 1 purple level 4 or lower Digimon card from your trash without paying the cost. If it's your opponent's turn, trash the top card of their security stack.",
          effectTextPart:
            "[All Turns] [Once Per Turn] When another Digimon is deleted, if it's your turn, you may play 1 purple level 4 or lower Digimon card from your trash without paying the cost. If it's your opponent's turn, trash the top card of their security stack.",
          sourceFilter: { excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelComparison: { op: "lte", value: 4 },
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              condition: { kind: "isYourTurn" },
              optional: true,
            },
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
              condition: { kind: "isOpponentsTurn" },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Lilithmon"], cost: 1, isAlternate: true }],
};

registerIrCard("EX7-061", compiled);
