import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              keywords: ["Blocker"],
            },
            orFilters: [{ controller: "mine", kind: ["Digimon"], stackKeywords: ["Blocker"] }],
            count: "all",
          },
          restriction: "beDeleted",
          duration: "permanent",
          byOpponentEffectsOnly: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-075", compiled);
