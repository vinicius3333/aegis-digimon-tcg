import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
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
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your trash",
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
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your trash",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
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
            keyword: "Reboot",
            raw: "＜Reboot＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your trash",
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
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your trash",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Beelzemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "you have 10 or more cards in your trash",
          },
          optional: true,
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
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
      traits: ["Wizard"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-050", compiled);

export { compiled };
