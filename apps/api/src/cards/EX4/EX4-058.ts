import type { CompiledCard, SubTriggerEvent } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "SubTrigger",
          event: "endOfOpponentTurn" as SubTriggerEvent,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Ravemon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                location: "trash",
                controller: "mine",
              },
              from: ["trash"],
              payCost: false,
            },
          ],
        },
      ],
      cost: {
        kind: "deleteOwn",
        target: {
          filter: {
            isSelfRef: true,
            digivolutionStackNameOrTrait: [
              {
                tokens: ["Bird"],
                match: "traitContains" as "trait",
              },
              {
                tokens: ["Avian"],
                match: "traitContains" as "trait",
              },
            ],
          },
          count: 1,
          isSelf: true,
        },
        optional: true,
        raw: "By deleting this Digimon that has a digivolution card with [Bird] or [Avian] in one of its traits",
      },
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
            chooser: "opponent",
          },
          controller: "opponent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 8,
            raw: "your opponent has 8 or more cards in their hand",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "lte",
            value: 7,
            raw: "your opponent has 7 or fewer cards in their hand",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-058", compiled);
