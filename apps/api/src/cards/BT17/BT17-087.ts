import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Marcus Damon"],
                  match: "name",
                },
              ],
            },
            count: 1,
            bindAs: "marcusTarget",
          },
        },
        {
          kind: "GrantStatic",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "marcusTarget",
          },
          grant: "kinds",
          tokens: ["Digimon"],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "SetBaseDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "marcusTarget",
          },
          value: 3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "marcusTarget",
          },
          restriction: "digivolve",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "marcusTarget",
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Agumon", "Greymon"], match: "name" }],
                },
                raw: "you have a Digimon with [Agumon]/[Greymon] in its name",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-087", compiled);
