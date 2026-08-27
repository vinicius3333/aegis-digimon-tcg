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
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Argomon"],
                  match: "name",
                },
              ],
            },
            count: 4,
            upTo: true,
            from: ["trash"],
          },
          optional: true,
        },
        {
          kind: "DeleteLevelBudget",
          filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
          baseBudget: 4,
          upTo: true,
          scaling: {
            per: 2,
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] },
            unit: "digivolutionCards",
            budgetAdd: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Argomon"],
                  match: "name",
                },
              ],
            },
            count: 4,
            upTo: true,
            from: ["trash"],
          },
          optional: true,
        },
        {
          kind: "DeleteLevelBudget",
          filter: { controller: "opponent", kind: ["Digimon"], hasLevel: true },
          baseBudget: 4,
          upTo: true,
          scaling: {
            per: 2,
            filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] },
            unit: "digivolutionCards",
            budgetAdd: 1,
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
            per: 2,
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Argomon"],
                  match: "name",
                },
              ],
            },
            unit: "digivolutionCards",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: "all",
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Argomon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-051", compiled);
