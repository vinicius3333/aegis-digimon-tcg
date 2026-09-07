import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
              zone: "security",
              controllerDefault: "mine",
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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red", "Green"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          amount: 2000,
          duration: "permanent",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Red", "Green"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "permanent",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Marsmon", "Callismon"],
                  match: "name",
                },
              ],
            },
            raw: "you have [Marsmon] or [Callismon]",
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
              colors: ["Red", "Green"],
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
          optional: true,
          reduceCostBy: 3,
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
              colors: ["Red", "Green"],
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

registerIrCard("BT25-095", compiled);
