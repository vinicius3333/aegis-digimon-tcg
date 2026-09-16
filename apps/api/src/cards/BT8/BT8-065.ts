import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Mamemon"],
                  match: "name",
                },
              ],
            },
            count: 4,
            upTo: true,
          },
          from: ["hand", "trash"],
          to: "deckTop",
          optional: true,
          trackCount: "mamemonReturned",
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "mamemonReturned",
            count: 3,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-065", compiled);
