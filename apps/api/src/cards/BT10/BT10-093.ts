// @ts-nocheck
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
          sourceFilter: { isSelfRef: true },
          addedDigivolutionCardFilter: { colors: ["Purple"] },
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1, seat: "mine" },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 2,
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "gte", value: 4 },
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 1,
          },
          raw: "[Your Turn][Once Per Turn] When playing a Lv.4+ [Bagra Army] Digimon, by placing <=3 purple Digimon from under your Tamers as digivolution cards, reduce its play cost by 2 per card placed.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-093", compiled);
