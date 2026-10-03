import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Overclock",
          raw: "＜Overclock ([Puppet] Trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 [Familiar] Token for each of your opponent's Digimon. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)",
          kind: "PlayToken",
          tokens: ["Familiar"],
          count: 1,
          payCost: false,
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
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
            "[On Play] [When Digivolving] You may play 1 level 4 or lower [Puppet] trait Digimon card from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Puppet"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 [Familiar] Token for each of your opponent's Digimon. (Digimon/Yellow/3000 DP/[On Deletion] 1 of your opponent's Digimon gets -3000 DP for the turn.)",
          kind: "PlayToken",
          tokens: ["Familiar"],
          count: 1,
          payCost: false,
          optional: true,
          scaling: {
            per: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-024", compiled);
