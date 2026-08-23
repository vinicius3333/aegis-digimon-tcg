// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      description:
        "[When Digivolving] You may place 1 [Trial of the Four Great Dragons] from your hand in the battle area if you don't have one in play.",
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
          optional: true,
          condition: {
            kind: "youHaveNone",
            filter: {
              controller: "mine",
              zone: "battleArea",
              nameOrTrait: [{ tokens: ["Trial of the Four Great Dragons"], match: "name" }],
            },
          },
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
