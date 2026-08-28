// @ts-nocheck
// HAND-FIXED IR — returning a Digimon already trashes its digivolution cards.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "by returning 1 of your other Digimon to its owner's hand",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-031", compiled);
