// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Trial of the Four Great Dragons"],
                  match: "name",
                },
              ],
            },
            count: 1,
            zone: "hand",
            from: ["hand"],
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Trial of the Four Great Dragons"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have a [Trial of the Four Great Dragons] in play",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Four Great Dragons"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenPlacedInBattleArea",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Trial of the Four Great Dragons"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Four Great Dragons"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenPlacedInBattleArea",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Trial of the Four Great Dragons"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: -3000,
              duration: "forTheTurn",
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
};

registerIrCard("EX3-034", compiled);
