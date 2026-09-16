import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 2＞ all of your opponent's Digimon.",
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
          effectTextPart:
            "Then, by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards, delete 2 of your opponent's Digimon with as high or lower a play cost as the number of this Digimon's digivolution cards.",
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
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 2＞ all of your opponent's Digimon.",
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
          effectTextPart:
            "Then, by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards, delete 2 of your opponent's Digimon with as high or lower a play cost as the number of this Digimon's digivolution cards.",
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
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] ＜De-Digivolve 2＞ all of your opponent's Digimon.",
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
          effectTextPart:
            "Then, by placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards, delete 2 of your opponent's Digimon with as high or lower a play cost as the number of this Digimon's digivolution cards.",
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
