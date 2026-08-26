// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "TrashTopDeck", controller: "mine", amount: 4 },
        {
          kind: "Return",
          target: {
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }] },
            count: 2,
            upTo: true,
          },
          to: "hand",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 2,
            upTo: true,
          },
          underFilter: { controller: "mine", kind: ["Tamer"] },
          condition: { kind: "ifThisEffectActed", raw: "if you added cards to your hand" },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentMovedFromBreeding",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "GainTriggeredEffect",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              gainedTrigger: "whenAttacking",
              gainedActions: [{ kind: "GainMemory", amount: -3 }],
              duration: "forTheTurn",
              cost: {
                kind: "trash",
                target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 1 },
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-087", compiled);
