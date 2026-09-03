import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { colors: ["Purple"] },
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
          raw: "When a purple card is placed under this Tamer, draw 1 and gain 1 memory.",
        },
      ],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: { op: "gte", value: 4 },
            nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
          },
          mode: "reduceCost",
          amount: 2,
          raw: "When you would play a level 4 or higher [Bagra Army] Digimon, place up to 3 purple Digimon from under your Tamers as digivolution cards and reduce the play cost by 2 for each.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-093", compiled);
