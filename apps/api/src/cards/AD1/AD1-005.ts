import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
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
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Link",
          amount: 1,
          raw: "＜Link +1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost.",
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Social", "Navi", "Tool"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
          },
          payCost: false,
          optional: true,
        },
        {
          effectTextPart: "Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost.",
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Social", "Navi", "Tool"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
          },
          payCost: false,
          optional: true,
        },
        {
          effectTextPart: "Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] You may link up to 2 [Social], [Navi] or [Tool] trait cards from your hand or this Digimon's digivolution cards to this Digimon without paying the cost.",
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Social", "Navi", "Tool"],
                  match: "trait",
                },
              ],
            },
            count: 2,
            upTo: true,
          },
          payCost: false,
          optional: true,
        },
        {
          effectTextPart: "Then, you may delete 1 of your opponent's Digimon with as much or less DP as this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Globemon", "Charismon"],
      cost: 0,
    },
  ],
};

registerIrCard("AD1-005", compiled);
