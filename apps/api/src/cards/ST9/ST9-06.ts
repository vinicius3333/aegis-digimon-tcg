// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for ST9-06 (Imperialdramon: Dragon Mode).
// [When Digivolving] You may play 1 level 4 or lower blue Digimon card AND 1 level 4
//   or lower green Digimon card from this Digimon's digivolution cards without paying
//   their memory costs.
//
// KB Q710: entirely optional (player may decline). But if they choose to play,
//   they must play as many as possible — when both eligible cards exist, they cannot
//   choose to play only one. Encoded as an optional trigger-entry + mandatory
//   (non-optional) sequential PlayWithoutCost actions so the player chooses once
//   (to act or not) and then both slots resolve.
//
// The effect-level optional flag provides the single accept/decline decision. Once accepted,
// both non-optional actions resolve in sequence and therefore play every eligible slot.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              colors: ["Blue"],
            },
            count: 1,
            source: "digivolutionCards",
          },
          from: ["digivolutionCards"],
          payCost: false,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              colors: ["Green"],
            },
            count: 1,
            source: "digivolutionCards",
          },
          from: ["digivolutionCards"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST9-06", compiled);
