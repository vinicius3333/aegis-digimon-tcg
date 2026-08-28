// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [Main]: reveal 3, play 1 black ≤4-cost Digimon for free (optional), trash the rest,
// then place this card in your battle area (PlaceInBattleAreaSelf).
// [Main] <Delay>: the engine auto-injects "trash this card from battle area as cost +
// can't activate the turn it enters play"; the payload is just gain 2 memory.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                playCostLte: 4,
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-105", compiled);
