import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Ceresmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 7,
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            lastPlayed: true,
            controller: "mine",
            kind: ["Digimon"],
          },
          position: "bottom",
          condition: {
            kind: "ifThisEffectActed",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [
              {
                tokens: ["Shaman", "Iliad"],
                match: "trait",
              },
            ],
          },
          leaveCause: "otherThanYourEffect",
          affectsAll: true,
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by deleting this Digimon",
          },
          raw: "When any of your other [Shaman] or [Iliad] trait Digimon or Tamers would leave the battle area other than by your effects, by deleting this Digimon, they don't leave.",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: { controller: "mine", suspended: true, kind: ["Digimon"] },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-039", compiled);
