// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "youHaveNone",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 5,
                  },
                },
                raw: "you don't have a level 5 or lower Digimon",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Angel", "Archangel", "Three Great Angels", "Seven Great Demon Lords"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Angel", "Archangel", "Three Great Angels", "Seven Great Demon Lords"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levels: [6],
              },
              count: 1,
            },
            destination: "security",
            position: "top",
            targetIsPermanent: true,
            raw: "By placing one of your level 6 Digimon on top of your security stack",
          },
          actions: [
            {
              kind: "Digivolve",
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
                    tokens: ["Lucemon: Chaos Mode"],
                    match: "nameExact",
                  },
                ],
              },
              payCost: false,
              from: ["trash"],
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Cupimon"],
      cost: 5,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-018", compiled);
