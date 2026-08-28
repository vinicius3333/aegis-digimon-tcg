// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT22-042 (Nyabootmon).
// Text:
//   ＜Overclock ([Puppet] Trait)＞
//   [When Digivolving] You may play 1 level 4 or lower [Puppet] trait Digimon card from
//   your hand without paying the cost. Then, to 1 of your opponent's Digimon, give -3000
//   DP until their turn ends for each of your Digimon.
//   [All Turns] [Once Per Turn] When any of your other Digimon are deleted, you may
//   activate 1 of this Digimon's [When Digivolving] effects.
// Fixes vs AUTO-GENERATED:
//   - ModifyDP: removed optional:true — text says "Then, give -3000 DP" (mandatory)
//   - ActivateEffect target: self (isSelfRef:true) not opponent's Digimon — text says
//     "activate 1 of THIS DIGIMON's [When Digivolving] effects"
export const compiled: CompiledCard = {
  effects: [
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
      trigger: "WhenDigivolving",
      actions: [
        {
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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
          optional: false,
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "ActivateEffect",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              effectType: "WhenDigivolving",
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Arisa Kinosaki", "Chaperomon"],
      cost: 6,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-042", compiled);
