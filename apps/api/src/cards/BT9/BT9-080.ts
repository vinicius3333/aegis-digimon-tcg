import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              dp: { op: "lte", value: 6000 },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 2 },
        },
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Yellow", "Purple"],
                    dp: { op: "lte", value: 6000 },
                  },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 6 },
                    nameOrTrait: [{ tokens: ["Angel", "Fallen Angel"], match: "trait" }],
                  },
                  count: 1,
                },
                from: ["trash"],
                payCost: false,
              },
            ],
          ],
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 1 },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: { isSelfRef: true },
              count: 1,
              zone: "battleArea",
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
              zone: "battleArea",
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasDnaDigivolutionRequirement: true,
              zone: "hand",
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-080", compiled);
