import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 4,
            filter: {
              zone: "hand",
              controller: "mine",
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["On Deletion"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          to: "deckBottom",
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "handAtLeast",
                value: 8,
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                },
              },
            ],
            raw: "you have 8 or more cards in your hand and a Tamer in play",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-021", compiled);
