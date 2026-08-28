// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-081 Tai Kamiya & Matt Ishida
// [All Turns] When one of your Digimon is played or digivolves, by suspending this Tamer,
//   if you have a Digimon with [Greymon] in its name, gain 1 memory.
//   If you have a Digimon with [Garurumon] in its name, gain 1 memory.
//   (Can gain up to 2 memory if you have both; Q&A Q2855)
// [End of Your Turn] Once per turn, you may have 1 of your unsuspended Digimon with
//   [Omnimon] in its name attack your opponent directly.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          fireCondition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }],
                },
              },
            ],
            raw: "you have a Digimon with [Greymon] or [Garurumon] in its name",
          },
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Greymon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Greymon] in its name",
              },
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Garurumon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Garurumon] in its name",
              },
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          fireCondition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
                },
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Garurumon"], match: "name" }],
                },
              },
            ],
            raw: "you have a Digimon with [Greymon] or [Garurumon] in its name",
          },
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Greymon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Greymon] in its name",
              },
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Garurumon"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Digimon with [Garurumon] in its name",
              },
            },
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Omnimon"],
                  match: "name",
                },
              ],
              suspended: false,
            },
            count: 1,
          },
          optional: true,
          attackPlayer: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Security",
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
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-081", compiled);
