import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
        {
          keyword: "Partition",
          raw: "＜Partition (purple Lv.4 & red Lv.4)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Free"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
          optional: true,
        },
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            bindAs: "rushAttacker",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: { fromSelectionRef: "rushAttacker", filter: {}, count: 1 },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
          optional: false,
        },
        {
          kind: "Attack",
          target: { fromSelectionRef: "rushAttacker", filter: {}, count: 1 },
          attackPlayer: true,
          withoutSuspending: false,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition (purple Lv.4 & red Lv.4)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Purple",
          level: 4,
        },
        {
          color: "Red",
          level: 4,
        },
      ],
    },
  ],
};

registerIrCard("BT16-077", compiled);
export { compiled };
