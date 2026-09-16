import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Green"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 1,
            },
            raw: "＜Digi-Burst 1＞",
          },
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 1,
          raw: "＜Digi-Burst 1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-046", compiled);
