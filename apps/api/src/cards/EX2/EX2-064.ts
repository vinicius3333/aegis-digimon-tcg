// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX2-064 Alice McCoy
// Text: [Your Turn][Once Per Turn] When one of your Digimon would digivolve from level 5
// to level 6, you may delete 1 of your Digimon to reduce the digivolution cost by 3.
// KB Q3349: does NOT activate for Digimon in the breeding area.
// KB Q3350: if you delete the level-5 Digimon itself, digivolution is cancelled.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 3,
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levels: [5],
            zone: "battleArea",
          },
          into: {
            levels: [6],
          },
          raw: "When one of your Digimon would digivolve from level 5 to level 6, you may delete 1 of your Digimon to reduce the digivolution cost by 3",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "by deleting 1 of your Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-064", compiled);
