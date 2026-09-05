// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3843: [Your Turn] affects all of YOUR Digimon with the [NSp] trait;
// the restriction is attackTargetChange on the controller's NSp Digimon, not the opponent's.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["NSp"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          restriction: "attackTargetChange",
          duration: "whileInPlay",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["NSp"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-022", compiled);
