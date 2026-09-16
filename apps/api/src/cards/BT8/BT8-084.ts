import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] You may place 1 level 5 or lower Digimon card from your trash under this Digimon as its bottom digivolution card.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          from: ["trash"],
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, up to 4 of your opponent's Digimon get -1000 DP for each of this Digimon's colors until the end of your opponent's next turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 4,
            upTo: true,
          },
          amount: -1000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            unit: "selfAndDigivolutionCardColors",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "hasAllDigivolutionColors",
          tokens: [],
        },
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 4000,
          },
          while: {
            kind: "selfColorCount",
            op: "gte",
            value: 4,
            raw: "this Digimon has 4 or more colors",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-084", compiled);
