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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Guilmon", "Takato Matsuki"],
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
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          requiresDelayArmed: true,
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Gallantmon"], match: "name" }],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: 5,
            },
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
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-096", compiled);
