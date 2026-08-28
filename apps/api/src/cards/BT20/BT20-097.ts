// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 6,
            },
            nameOrTrait: [
              {
                tokens: ["Dex", "DeathX"],
                match: "name",
              },
            ],
          },
          from: ["trash"],
          reduceCostBy: 4,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["DexDorugoramon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "Delay",
                raw: "＜Delay＞",
              },
              duration: "permanent",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          requiresDelayArmed: true,
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["DeathXmon"], match: "name" }] }, count: 1 },
          from: ["trash"],
          payCost: false,
          cost: {
            kind: "return",
            target: {
              sourceRef: "triggerSubject",
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                nameOrTrait: [{ tokens: ["Dorumon"], match: "name" }],
              },
              count: 1,
            },
            raw: "By returning 1 [Dorumon] from those Digimon's digivolution cards to the hand",
          },
          optional: true,
          abortOnDecline: true,
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
              nameOrTrait: [
                {
                  tokens: ["Dorumon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-097", compiled);
