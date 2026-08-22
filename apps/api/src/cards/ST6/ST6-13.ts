// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"], levels: [3] },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: { filter: { isSelfRef: true, zone: "digivolutionCards" }, count: 2 },
            raw: "＜Digi-Burst 2＞",
          },
        },
      ],
      keywords: [{ keyword: "DigiBurst", amount: 2, raw: "＜Digi-Burst 2＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-13", compiled);
