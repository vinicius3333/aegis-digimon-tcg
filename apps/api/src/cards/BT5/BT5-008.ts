import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              nameOrTrait: [
                {
                  tokens: ["Gaossmon"],
                  match: "nameExact",
                },
              ],
            },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 3000 },
          while: { kind: "true" },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "RestrictCostReduction",
          seat: "opponent",
          costType: "digivolve",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-008", compiled);
