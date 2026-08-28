// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  digivolutionRequirement: [
    {
      namesExact: ["Terriermon"],
      cost: 3,
      isAlternate: true,
    },
  ],
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 3,
            upTo: true,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-039", compiled);
