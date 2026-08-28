// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dedigivolve = {
  kind: "DeDigivolve",
  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
  amount: 4,
  stopAtLevel: 3,
};
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [dedigivolve] },
    { trigger: "WhenAttacking", actions: [dedigivolve] },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              zone: "battleArea",
            },
            count: "all",
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanYourEffect",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Rock Dragon", "Earth Dragon"], match: "trait" }],
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "When this Digimon would leave battle area other than by one of your effects, you may play 1 Rock Dragon or Earth Dragon Digimon from your trash without paying the cost",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-049", compiled);
