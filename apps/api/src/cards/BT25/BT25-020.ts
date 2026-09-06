import type { CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              condition: {
                // The printed clause says "if there is a Digimon", without a
                // controller qualifier: count both players' battle areas.
                kind: "totalDigimonCount",
                op: "gte",
                value: 1,
                filter: { kind: ["Digimon"], dp: { op: "gte", value: 13000 } },
              },
            },
          ],
        },
      ],
    },
    ...(["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).map((trigger): CardEffect => ({
      trigger,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          kind: "Battle",
          attacker: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          optional: true,
        },
      ],
    })),
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          actions: [
            {
              kind: "Trash",
              target: { filter: { zone: "security", controller: "opponent", position: "top" }, count: 1 },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT25-020", compiled);
