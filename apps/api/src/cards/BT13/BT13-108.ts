import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          effectText:
            "[Opponent's Turn] When this Digimon becomes suspended, delete all of your opponent's Digimon with a play cost less than or equal to this Digimon's",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GrantAuraToOpponents",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          effectText: "[Opponent's Turn] This Digimon isn't affected by your opponent's Option cards.",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-108", compiled);
