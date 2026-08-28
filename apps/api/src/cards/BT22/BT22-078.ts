// @ts-nocheck
// Hand-authored override: copyEffectsFromDigivolution uses raw filter string (same as BT16-062).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
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
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: {
            copyEffectsFromDigivolution: {
              filter: "This Digimon gains all [Main] effects of its digivolution cards with the [Flame] trait",
              trigger: "Main",
            },
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Flame", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-078", compiled);
