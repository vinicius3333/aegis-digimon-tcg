// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it.
// Audit fix (LM audit): the deletion was scoped to the opponent; the printed clause names no
// controller, so it can also take one of the controller's own level 4 or lower Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              // "Delete 1 level 4 or lower Digimon" carries no possessive: either player's.
              controllerDefault: "any",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
        },
        {
          kind: "PlayToken",
          tokens: ["Gyuukimon Token"],
          count: 1,
          payCost: false,
          condition: {
            kind: "ifThisEffectActed",
            raw: "you did",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-018", compiled);
