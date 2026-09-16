import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
            zone: "battleArea",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Demon", "Titan"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                  nameOrTrait: [
                    {
                      tokens: ["Demon", "Titan"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                or: [
                  { nameOrTrait: [{ tokens: ["Titamon"], match: "nameExact" }] },
                  { nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] },
                ],
              },
              from: ["trash"],
              payCost: true,
              costDelta: -1,
              optional: true,
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
  digivolutionRequirement: [
    {
      namesExact: ["Tsunomon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-042", compiled);
