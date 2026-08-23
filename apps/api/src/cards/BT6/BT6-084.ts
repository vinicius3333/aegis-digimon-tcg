// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Huckmon"],
                  match: "name",
                },
                {
                  tokens: ["Royal Knight"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          amount: 2000,
          duration: "permanent",
          continuous: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-084", compiled);
