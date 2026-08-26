// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
          },
          to: "deckBottom",
        },
        {
          kind: "Return",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Tamer"],
            },
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-101", compiled);
