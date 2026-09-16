import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                colors: ["Green"],
                levels: [6],
              },
              count: 1,
              to: "digivolve",
              optional: true,
              digivolveTarget: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-049", compiled);
