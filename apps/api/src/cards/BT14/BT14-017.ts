import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [When Digivolving]: grant <Blitz> to self only (the +4000 DP is NOT part of WhenDigivolving).
// [All Turns]: while opponent has 1+ memory, this Digimon gets +4000 DP AND opponent can't play Digimon ≤6000 DP.
// KB Q2379: "while your opponent has 1 or more memory" = while memory >= 1 (opponent's side = positive).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Blitz",
            raw: "＜Blitz＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 4000,
          },
          condition: {
            kind: "memoryAtLeast",
            controller: "opponent",
            value: 1,
            raw: "while your opponent has 1 or more memory",
          },
        },
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: {
            kind: ["Digimon"],
            dpAtMost: 6000,
            // Q2381 explicitly includes Digimon tokens, unlike the default token exemption
            // used by generic RestrictPlay effects (Q3834).
            allowTokens: true,
          },
          mode: "play",
          duration: "permanent",
          condition: {
            kind: "memoryAtLeast",
            controller: "opponent",
            value: 1,
            raw: "while your opponent has 1 or more memory",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-017", compiled);
