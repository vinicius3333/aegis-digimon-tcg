import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "opponentHas",
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "gte",
                    value: 10000,
                  },
                },
                raw: "your opponent has a Digimon with 10000 DP or more",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Leomon"],
                match: "name",
              },
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              excludeSelf: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Leomon"],
                match: "name",
              },
              {
                tokens: ["CS"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart: "[End of Your Turn] [Once Per Turn] 1 of your Digimon gains ＜Raid＞ for the turn.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, that Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Leomon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("BT23-036", compiled);
