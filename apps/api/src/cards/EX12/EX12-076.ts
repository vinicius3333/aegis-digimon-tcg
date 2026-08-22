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
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
            },
            unit: "digivolutionCardColors",
          },
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
            count: "all",
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
            },
            unit: "digivolutionCardColors",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors in its digivolution cards",
          },
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Recovery",
            amount: 1,
            raw: "＜Recovery +1＞",
          },
          condition: {
            kind: "selfDigivolutionStackDistinctColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors in its digivolution cards",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Hybrid"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Hybrid", "Shambala", "TS"],
      cost: 5,
      isAlternate: true,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 8,
          traits: ["Hybrid", "Shambala"],
          differentNames: true,
        },
      ],
      reduceCost: 9,
    },
  ],
};

registerIrCard("EX12-076", compiled);

export { compiled };
