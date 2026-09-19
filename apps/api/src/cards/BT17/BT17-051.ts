import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may place up to 4 level 5 or lower [Argomon] from your trash as this Digimon's bottom digivolution cards.",
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
          effectTextPart:
            "Then, delete any number of your opponent's Digimon whose levels that add up to 4 or less. For every 2 [Argomon] in this Digimon's digivolution cards, add 1 to the maximum level you can choose with this effect.",
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
          effectTextPart:
            "[On Play] [When Digivolving] You may place up to 4 level 5 or lower [Argomon] from your trash as this Digimon's bottom digivolution cards.",
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
          effectTextPart:
            "Then, delete any number of your opponent's Digimon whose levels that add up to 4 or less. For every 2 [Argomon] in this Digimon's digivolution cards, add 1 to the maximum level you can choose with this effect.",
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
          whileMatchesTargetFilter: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      namesExact: ["Argomon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-051", compiled);
