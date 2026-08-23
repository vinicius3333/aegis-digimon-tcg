// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Creepymon"],
                match: "nameExact",
              },
            ],
          },
          fireCondition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "your opponent has 10 or more cards in their trash",
          },
          actions: [
            {
              kind: "Digivolve",
              target: { filter: {}, count: 1, sourceRef: "triggerSubject" },
              into: { controller: "mine", zone: "trash", isSelfRef: true, kind: ["Digimon"] },
              from: ["trash"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
            },
          ],
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
        },
        {
          kind: "PlayMultiple",
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Evil", "Fallen Angel"], match: "trait" }],
          },
          from: ["trash"],
          payCost: false,
          totalCost: 4,
          totalCostScaling: {
            base: 4,
            raise: 4,
            per: 10,
            filter: { zone: "trash", controller: "opponent" },
            unit: "cards",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Creepymon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-078", compiled);
