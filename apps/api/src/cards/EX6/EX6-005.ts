// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "return",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                hostFilter: { isSelfRef: true },
                nameOrTrait: [
                  {
                    tokens: ["Legend-Arms"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By returning 1 card with the [Legend-Arms] trait from this Digimon's digivolution cards to the hand",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-005", compiled);
