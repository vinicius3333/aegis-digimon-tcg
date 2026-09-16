import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
