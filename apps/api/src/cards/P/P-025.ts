// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-025/digi-burst-security-attack",
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: { isSelfRef: true, zone: "digivolutionCards" },
              count: 2,
            },
            raw: "＜Digi-Burst 2＞",
          },
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 2,
          raw: "＜Digi-Burst 2＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-025", compiled);
