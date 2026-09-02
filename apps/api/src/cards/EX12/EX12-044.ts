import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
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
                tokens: ["Angel", "Holy Dragon", "Three Great Angels", "NSp", "VB"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          condition: {
            kind: "stackHasSameLevelCards",
            count: 2,
            raw: "this Digimon's stack has 2 or more same-level cards",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Holy Beast]/[NSp]/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  // CR 16-36-1: ＜Decode＞ plays from THAT Digimon's digivolution cards. Without
                  // this host gate the loose-card resolver pools every stack the controller owns.
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Holy Beast", "NSp", "VB"], match: "trait" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Green", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 4 },
        { color: "Green", level: 4 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Blue", level: 4 },
        { color: "Black", level: 4 },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["NSp", "VB"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-044", compiled);
