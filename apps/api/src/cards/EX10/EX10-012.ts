import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHaveNone",
        filter: {
          kind: ["Digimon"],
          excludeNameOrTrait: [
            {
              tokens: ["Dark Masters"],
              match: "any",
            },
          ],
        },
        raw: "you don't have any Digimon other than Digimon with [Dark Masters] in their texts",
      },
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          from: ["hand"],
          payCost: true,
          allowDigiXros: true,
          reduceCostBy: 5,
          raw: "play this card with the play cost reduced by 5",
        },
        {
          kind: "DelayedDeletePlayed",
          raw: "at turn end, delete the Digimon this effect played",
        },
      ],
      optional: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            nameOrTrait: [
              {
                tokens: ["Apocalymon"],
                match: "name",
              },
            ],
          },
          duration: "permanent",
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
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              zone: "security",
              faceUp: true,
              colors: ["Blue"],
            },
            raw: "you have no blue face-up security cards",
          },
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
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          condition: {
            kind: "sourceWasFaceUpSecurity",
            raw: "this card was face-up",
          },
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX10-012", compiled);
