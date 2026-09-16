import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: "all",
          },
          restriction: "cantBeBlocked",
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

registerIrCard("BT6-028", compiled);
