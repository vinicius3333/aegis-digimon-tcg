import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          options: [
            [
              {
                kind: "SecurityManipulation",
                op: "placeAsSecurity",
                controller: "opponent",
                source: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Virus"], match: "trait" }],
                  },
                  count: 1,
                },
                toTop: false,
              },
            ],
            [
              {
                kind: "ModifyDP",
                target: {
                  filter: {
                    controller: "opponent",
                    kind: ["Digimon"],
                  },
                  count: 1,
                },
                amount: -5000,
                duration: "forTheTurn",
              },
            ],
          ],
          cost: {
            kind: "deleteOwn",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "By deleting this Digimon",
          },
          optional: true,
          abortOnDecline: true,
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
        },
        {
          kind: "Hatch",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
          optional: true,
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
          source: {
            filter: {
              controllerDefault: "mine",
              colors: ["Yellow"],
              nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Patamon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT14-102", compiled);
export { compiled };
