// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              levels: [3, 4],
              kind: ["Digimon"],
              controller: "opponent",
            },
            count: 1,
          },
          controller: "opponent",
          suspended: true,
          from: ["trash"],
          payCost: false,
          suppressOnPlayEffects: true,
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
              levels: [3, 4],
              kind: ["Digimon"],
              controller: "opponent",
            },
            count: 1,
          },
          controller: "opponent",
          suspended: true,
          from: ["trash"],
          payCost: false,
          suppressOnPlayEffects: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            byEffect: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelLteTriggerSource: true,
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-060", compiled);
