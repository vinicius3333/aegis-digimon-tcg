import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
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
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
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
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                colors: ["Yellow"],
              },
              count: 2,
              upTo: true,
            },
            raw: "By suspending up to 2 of your yellow Tamers",
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            usePaidCount: true,
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["ShineGreymon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-041", compiled);
