// @ts-nocheck
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
          keyword: "Partition",
          raw: "＜Partition (Blue Lv.4 & Green Lv.4)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beDeletedInBattle",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "attackTargetChange",
          duration: "forTheTurn",
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Imperialdramon"],
                match: "name",
              },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
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
          raw: "＜Partition (Blue Lv.4 & Green Lv.4)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("AD1-011", compiled);
