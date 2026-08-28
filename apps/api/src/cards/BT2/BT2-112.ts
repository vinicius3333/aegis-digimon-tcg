import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR: the prose compiler recognizes the Unsuspend action but loses the
// clause that binds it to an attack on an opponent's highest-DP Digimon. The official
// Q&A confirms that every tied-highest target qualifies and a lower-DP target does not.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 6,
          raw: "reduce the memory cost to play this card from your hand by 6",
          condition: {
            kind: "opponentHas",
            filter: {
              zone: "battleArea",
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "gte",
                value: 10000,
              },
            },
            raw: "your opponent has a Digimon with 10000 DP or more in play",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "attackTargetMatchesFilter",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "highestDP",
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-112", compiled);
