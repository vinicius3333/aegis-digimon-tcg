import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              raw: "reduce the cost by 5",
              condition: {
                kind: "totalSecurityCount",
                op: "lte",
                value: 6,
                raw: "there are 6 or fewer total cards in both players' security stacks",
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
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          amount: 1,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                controllerDefault: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                zone: "battleArea",
              },
              count: 1,
            },
            destination: "security",
            position: "top",
            faceDown: true,
            raw: "By placing 1 other Digimon as the top security card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          amount: 1,
          abortOnDecline: true,
          cost: {
            kind: "place",
            targetIsPermanent: true,
            target: {
              filter: {
                controllerDefault: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                zone: "battleArea",
              },
              count: 1,
            },
            destination: "security",
            position: "top",
            faceDown: true,
            raw: "By placing 1 other Digimon as the top security card",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  playCostLte: 8,
                  nameOrTrait: [
                    {
                      tokens: ["Angel", "Archangel", "Iliad"],
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
      traits: ["Angel", "Archangel", "TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-044", compiled);
