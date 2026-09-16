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
              amount: 3,
              raw: "reduce the play cost by 3",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  zone: "battleArea",
                  or: [
                    {
                      kind: ["Tamer"],
                      nameOrTrait: [{ tokens: ["Yuuko Kamishiro"], match: "nameExact" }],
                    },
                    {
                      kind: ["Digimon"],
                      nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    },
                  ],
                },
                raw: "you have [Yuuko Kamishiro] or a [CS] trait Digimon",
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
          kind: "Restrict",
          target: {
            filter: {
              kind: ["Digimon"],
              or: [{ traitContains: ["Vegetation", "Plant", "Fairy"] }, { traits: ["CS"] }],
              controller: "mine",
            },
            count: 1,
          },
          restriction: "cannotReturnToHandOrDeck",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              kind: ["Digimon"],
              or: [{ traitContains: ["Vegetation", "Plant", "Fairy"] }, { traits: ["CS"] }],
              controller: "mine",
            },
            count: 1,
          },
          restriction: "cannotReturnToHandOrDeck",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "any",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By suspending 1 Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-044", compiled);
