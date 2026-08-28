// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Fenriloogamon", "Kazuchimon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Eiji Nagasumi"],
                  match: "name",
                },
              ],
            },
            raw: "[Eiji Nagasumi] is in this Digimon's digivolution cards",
          },
          optional: true,
          bindResultAs: "playedFenriloogamon",
        },
        {
          kind: "DelayedEffect",
          effect: {
            kind: "Return",
            target: {
              filter: {
                boundRef: "playedFenriloogamon",
              },
              count: 1,
              isSelf: true,
            },
            to: "hand",
          },
          trigger: "nextEndOfOpponentTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [
              {
                tokens: ["SoC"],
                match: "trait",
              },
              {
                tokens: ["Pulsemon"],
                match: "text",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    value: 10000,
                  },
                },
                count: 1,
              },
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
          kind: "SetTurnEndMemory",
          minimum: 3,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Fenriloogamon"],
            raw: "this Digimon has [Fenriloogamon] in its name",
          },
          raw: "While this Digimon has [Fenriloogamon] in its name, your turn ends when your opponent has 3 or more memory.",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["SoC"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-069", compiled);
