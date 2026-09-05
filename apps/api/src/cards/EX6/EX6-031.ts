// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: "all",
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
          kind: "GainKeyword",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: "all",
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Sanzomon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Gokuumon", "Sagomon", "Cho-Hakkaimon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "onDeletionOf",
        },
        {
          kind: "SubTrigger",
          event: "wouldBeReturned",
          sourceFilter: {
            isSelfRef: true,
            returnDestination: ["hand", "deck"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Sanzomon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Gokuumon", "Sagomon", "Cho-Hakkaimon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          raw: "wouldBeReturned",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SecurityAttackInvert",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          duration: "forTheTurn",
          raw: "Change ＜Security Attack -＞ to ＜Security Attack +＞ on all of your Digimon",
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              keywords: ["SecurityAttack"],
            },
            count: 1,
          },
          from: ["battleArea"],
          toTop: true,
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
      names: ["Sanzomon", "Gokuumon", "Sagomon", "Cho-Hakkaimon"],
      cost: 6,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["Sanzomon"],
        },
        {
          names: ["Gokuumon"],
        },
        {
          names: ["Sagomon"],
        },
        {
          names: ["Cho-Hakkaimon"],
        },
      ],
      count: 2,
    },
  ],
};

registerIrCard("EX6-031", compiled);
