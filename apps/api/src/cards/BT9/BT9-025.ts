// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-025 TeslaJellymon
// [End of Attack][Once Per Turn] You may trash 2 cards in your hand (any kind) to
//   unsuspend this Digimon.
// The cost targets any card from hand (no kind filter), Unsuspend is the action.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 2,
            },
            raw: "by trashing 2 cards in your hand",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-025", compiled);
