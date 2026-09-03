import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT7-036 Zephyrmon
// effectText: You may digivolve this card from your hand onto one of your yellow Tamers
//   as if the Tamer is a level 3 yellow Digimon for a memory cost of 2.
//   [When Digivolving] If a card with [Hybrid] in its traits or [Zoe Orimoto] is in this
//   Digimon's digivolution cards, all of your Security Digimon get +3000 DP until the end
//   of your opponent's next turn.
//
// KB Q1560: can also digivolve onto a level 3 Digimon (standard rule; this effect only
//   describes the Tamer base path).
// KB Q4644: cannot choose NOT to digivolve after declaring; mandatory once declared.
//
// Fixes:
// 1. WhenDigivolving effect: targets "Security Digimon" = Digimon in the security zone.
//    Use ModifySecurityDP { controller: "mine", amount: 3000 } instead of ModifyDP on
//    battle-area Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 2,
          asLevel: 3,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "mine",
          amount: 3000,
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Zoe Orimoto"],
                  match: "nameExact",
                },
              ],
            },
            raw: "a card with [Hybrid] in its traits or [Zoe Orimoto] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Yellow"],
    },
  ],
};

registerIrCard("BT7-036", compiled);
