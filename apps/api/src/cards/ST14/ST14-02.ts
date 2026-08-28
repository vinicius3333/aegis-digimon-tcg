// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Beelzemon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 20,
            raw: "you have 20 or more cards in your trash",
          },
          from: ["trash"],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levels: [3],
                },
                count: 1,
              },
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST14-02", compiled);
