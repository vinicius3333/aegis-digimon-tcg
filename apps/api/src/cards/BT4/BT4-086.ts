// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 9,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Cerberusmon"],
                    match: "nameExact",
                  },
                ],
              },
              count: 1,
            },
            raw: "by deleting 1 of your [Cerberusmon]",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-086", compiled);
