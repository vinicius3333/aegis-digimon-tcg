import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
