// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-060 Chaosdramon — hand-fixed override (not auto-generated).
// <Piercing> <Security Attack +1> <Fragment (2)> <Engage>
// [OnPlay/WhenDigivolving/WhenAttacking][Once Per Turn] De-Digivolve all opponent Digimon by 2,
//   then delete 2 with play cost no higher than this Digimon's digivolution-card count,
//   by placing exactly 2 Lv.5 or lower [Machine]/[Cyborg]/[ME] trait cards from hand/trash.
// <Engage> = [End of Your Turn] this Digimon may attack (optional self-attack at EndOfYourTurn).
const sharedOncePerTurn = "ir-shared-0";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Fragment",
          amount: 2,
          raw: "＜Fragment (2)＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Engage",
          raw: "＜Engage＞",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 0,
              playCostLteScaling: {
                per: 1,
                filter: {},
                unit: "digivolutionCards",
              },
            },
            count: 2,
          },
          cost: {
            kind: "place",
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
                    tokens: ["Machine", "Cyborg", "ME"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: sharedOncePerTurn,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 0,
              playCostLteScaling: {
                per: 1,
                filter: {},
                unit: "digivolutionCards",
              },
            },
            count: 2,
          },
          cost: {
            kind: "place",
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
                    tokens: ["Machine", "Cyborg", "ME"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: sharedOncePerTurn,
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 2,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 0,
              playCostLteScaling: {
                per: 1,
                filter: {},
                unit: "digivolutionCards",
              },
            },
            count: 2,
          },
          cost: {
            kind: "place",
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
                    tokens: ["Machine", "Cyborg", "ME"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: sharedOncePerTurn,
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Red", level: 6 },
        { color: "Purple", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Red", level: 6 },
        { color: "Yellow", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Black", level: 6 },
        { color: "Purple", level: 6 },
      ],
    },
    {
      cost: 0,
      materials: [
        { color: "Black", level: 6 },
        { color: "Yellow", level: 6 },
      ],
    },
  ],
  assemblyRequirement: [
    {
      reduceCost: 8,
      materials: [{ count: 6, traits: ["Machine", "Cyborg", "ME"], levelMax: 6, differentNames: true }],
    },
  ],
};

export { compiled };
registerIrCard("EX12-060", compiled);
