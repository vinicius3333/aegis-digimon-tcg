// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT3-069 RaijiLudomon
// [When Attacking] (inherited) If this Digimon is level 7, De-Digivolve 1 of your opponent's
// Digimon by 1. The level-7 check is a prerequisite for the whole effect (not scoped to the
// DeDigivolve action), so it sits on the effect block. No Trash action in printed text.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      condition: {
        kind: "selfLevelIs",
        value: 7,
        raw: "this Digimon is level 7",
      },
      actions: [
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
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-069", compiled);
