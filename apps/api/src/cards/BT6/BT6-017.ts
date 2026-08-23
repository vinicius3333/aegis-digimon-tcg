import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-validated effect IR for BT6-017 (MagnaKidmon), including Q1410's
// player-controlled "use the Option or delete" branch.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            playCostOneOf: [7],
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "not",
            condition: {
              kind: "ifThisEffectUsed",
            },
            raw: "if you don't use a 7-cost Option card with this effect",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-017", compiled);
