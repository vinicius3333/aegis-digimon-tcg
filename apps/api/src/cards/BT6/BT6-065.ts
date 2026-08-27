// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            {
              filter: {
                kind: ["Option"],
                playCostOneOf: [7],
              },
              count: 1,
              to: "useOption",
              payCost: false,
            },
          ],
          rest: "trash",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
            },
            count: 1,
          },
          condition: { kind: "ifThisEffectDidNotAct" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-065", compiled);
