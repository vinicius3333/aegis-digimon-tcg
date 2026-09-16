import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand without paying the cost. If they don't, you may play 1 white Tamer card with a play cost of 4 or less from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand without paying the cost. If they don't, you may play 1 white Tamer card with a play cost of 4 or less from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "they don't",
          },
          optional: true,
        },
        {
          effectTextPart: "Then, ＜De-Digivolve1＞ 1 of your opponent's Digimon for every 2 Tamers.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          scaling: {
            per: 2,
            filter: {
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
          effectTextPart:
            "[On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand without paying the cost. If they don't, you may play 1 white Tamer card with a play cost of 4 or less from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
            upTo: true,
            chooser: "opponent",
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Your opponent may play 1 Tamer card from their hand without paying the cost. If they don't, you may play 1 white Tamer card with a play cost of 4 or less from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "they don't",
          },
          optional: true,
        },
        {
          effectTextPart: "Then, ＜De-Digivolve1＞ 1 of your opponent's Digimon for every 2 Tamers.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          scaling: {
            per: 2,
            filter: {
              kind: ["Tamer"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Eosmon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      namesExact: ["Eosmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-075", compiled);
