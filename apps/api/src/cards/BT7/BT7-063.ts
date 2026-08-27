// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["SkullKnightmon", "DeadlyAxemon"], match: "name" }],
            },
            requiredNamesExact: ["SkullKnightmon", "DeadlyAxemon"],
            from: ["hand", "trash"],
            count: 2,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          order: "any",
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["SkullKnightmon", "DeadlyAxemon"], match: "name" }],
                },
                requiredNamesExact: ["SkullKnightmon", "DeadlyAxemon"],
                count: 2,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
              suspended: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-063", compiled);
