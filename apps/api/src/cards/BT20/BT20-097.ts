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
          payCost: true,
          reduceCost: 4,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDigimonWouldLeave",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DexDorugoramon"], match: "nameExact" }],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["DeathXmon"], match: "nameExact" }],
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              cost: {
                kind: "return",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    zone: "digivolutionCards",
                    hostFilter: { isTriggerSource: true },
                    nameOrTrait: [{ tokens: ["Dorumon"], match: "nameExact" }],
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
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dorumon"],
                  match: "nameExact",
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
