import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue", "Green"],
              nameOrTrait: [
                {
                  tokens: ["Dramon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["hand"],
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          optional: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dramon"],
                  match: "name",
                },
              ],
              colors: ["Green", "Blue"],
              dp: {
                op: "lte",
                value: 12000,
              },
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: {
            kind: "isDnaDigivolving",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          raw: "When this Digimon becomes suspended",
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Green",
          level: 6,
        },
        {
          color: "Blue",
          level: 6,
        },
      ],
    },
  ],
};

registerIrCard("EX3-074", compiled);
