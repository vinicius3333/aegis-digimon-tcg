import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Sistermon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              sourceFilter: { isSelfRef: true },
              actions: [
                {
                  kind: "Replacement",
                  event: "wouldDigivolve",
                  mode: "reduceCost",
                  amount: 2,
                  raw: "reduce the digivolution cost by 2",
                },
              ],
            },
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
                    tokens: ["Jesmon"],
                    match: "name",
                  },
                ],
              },
              from: ["hand"],
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sistermon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }] },
            raw: "this Digimon has the [Royal Knight] trait",
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-016", compiled);
