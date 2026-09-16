import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "battleArea",
              nameOrTrait: [
                {
                  tokens: ["Impmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            isSelfRef: true,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 4,
          ignoreRequirements: true,
          condition: {
            kind: "selfHasMinTrash",
            count: 10,
            filter: {
              controllerDefault: "mine",
            },
            raw: "while you have 10 or more cards in your trash",
          },
        },
      ],
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
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-111", compiled);
