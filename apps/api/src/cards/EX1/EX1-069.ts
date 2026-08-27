// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                levels: [5],
                nameOrTrait: [
                  {
                    tokens: ["Cyborg"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "by trashing 1 level 5 Digimon card with [Cyborg] in its traits in your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
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

registerIrCard("EX1-069", compiled);
