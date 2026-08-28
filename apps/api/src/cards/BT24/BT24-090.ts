// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-090 Abyss Sanctuary: Throne Room
// Fix: [Security][All Turns] now includes conditional <Alliance> grant for Neptunemon/Venusmon.
//   [Main] cost reduction integrated into PlayWithoutCost (reduceCostBy: 3), not separate Replacement.
//   SecurityManipulation toHand now specifies position: "bottom" for the bottom security card.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controller: "mine",
              zone: "security",
              faceUp: true,
            },
            raw: "you have no face-up security cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue", "Yellow"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Blocker",
              raw: "＜Blocker＞",
            },
          },
        },
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue", "Yellow"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Alliance",
              raw: "＜Alliance＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Neptunemon", "Venusmon"], match: "nameExact" }],
            },
            raw: "you have [Neptunemon] or [Venusmon]",
          },
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          position: "bottom",
          toTop: false,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue", "Yellow"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 3,
          optional: true,
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
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue", "Yellow"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-090", compiled);
