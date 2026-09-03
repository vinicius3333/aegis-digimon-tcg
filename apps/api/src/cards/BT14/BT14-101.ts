import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "allOf",
        conditions: [
          {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Tai Kamiya"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Tai Kamiya] in its name",
          },
          {
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
        ],
        raw: "you have a Tamer with [Tai Kamiya] in its name and your opponent has a Digimon with 10000 DP or more",
      },
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Agumon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          into: {
            filter: {
              isSelfRef: true,
            },
          },
          payCost: true,
          from: ["hand"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
        {
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          withoutSuspending: false,
          drainTimingWindowDuringAttack: true,
          optional: true,
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
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
        },
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
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Greymon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT14-101", compiled);
export { compiled };
