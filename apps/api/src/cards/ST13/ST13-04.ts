import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            isSelfRef: true,
          },
          into: {
            or: [
              {
                colors: ["Black"],
              },
              {
                nameOrTrait: [
                  {
                    tokens: ["Legend-Arms"],
                    match: "trait",
                  },
                ],
              },
            ],
            zone: "hand",
            controller: "mine",
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
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: {
                isSelfRef: true,
              },
              zone: "battleArea",
              count: 1,
            },
            {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                zone: "battleArea",
                excludeSelf: true,
              },
              zone: "battleArea",
              count: 1,
            },
          ],
          into: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "hand",
              hasDnaDigivolutionRequirement: true,
            },
            count: 1,
          },
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST13-04", compiled);
