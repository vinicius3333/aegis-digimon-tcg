// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RB1-018 Monzaemon
// Digivolve: 3 from Lv.4 w/[Numemon] in name
//
// [On Play] By placing 1 Digimon card with [Numemon] in its name from your trash
//   as this Digimon's bottom digivolution card, gain 2 memory.
// [On Play][When Digivolving] 1 of your opponent's Digimon gets -3000 DP and
//   gains <Security Attack -1> until the end of their turn.
// [Inherited][Your Turn] While this Digimon has [Monzaemon] or [Numemon] in its
//   name, it gains <Security Attack +1>.
//
// Fixes vs prior IR:
// - GainMemory optional:true (the place cost is an optional "By..." cost, player
//   may decline; if they decline they don't get the memory either).
// - ModifyDP and GainKeyword target the SAME opponent Digimon (text: "1 of your
//   opponent's Digimon gets -3000 DP and gains <Security Attack -1>"): a leading
//   SelectBind picks the permanent once, both actions then reference it via
//   fromSelectionRef so only one target prompt is shown.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Numemon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 Digimon card with [Numemon] in its name from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "debuffTarget",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "debuffTarget",
            filter: {},
            count: 1,
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "debuffTarget",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "debuffTarget",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            fromSelectionRef: "debuffTarget",
            filter: {},
            count: 1,
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            fromSelectionRef: "debuffTarget",
            filter: {},
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          },
          while: {
            kind: "selfHasNameContaining",
            names: ["Monzaemon", "Numemon"],
            raw: "this Digimon has [Monzaemon] or [Numemon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Numemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("RB1-018", compiled);
