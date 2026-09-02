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
                  tokens: ["Agumon", "Gabumon"],
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
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          leaveCause: "otherThanBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [
              {
                tokens: ["Greymon", "Garurumon"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: {
                filter: { controller: "mine", kind: ["Digimon"] },
                count: 1,
                includeRef: "triggerSubject",
              },
              looseMaterials: {
                filter: { zone: "hand", controller: "mine", kind: ["Digimon"] },
                count: 1,
                from: ["hand"],
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Omnimon"], match: "name" }],
              },
              payCost: true,
              optional: true,
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
              nameOrTrait: [
                {
                  tokens: ["Tai Kamiya", "Matt Ishida"],
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

registerIrCard("BT17-095", compiled);
