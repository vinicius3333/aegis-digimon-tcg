import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              excludeNameOrTrait: [
                {
                  tokens: ["Sea Animal"],
                  match: "trait",
                },
              ],
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red"],
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-013", compiled);
export { compiled };
