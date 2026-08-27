// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 11000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              excludeNameOrTrait: [
                { tokens: ["DoruGreymon"], match: "nameExact" },
                { tokens: ["BurningGreymon"], match: "nameExact" },
                { tokens: ["DexDoruGreymon"], match: "nameExact" },
              ],
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Omnimon", "Greymon"],
                  match: "name",
                },
              ],
            },
            raw: "you don't have a qualifying [Omnimon] or [Greymon] Digimon in play",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 15000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "youHave",
            filter: {
              excludeNameOrTrait: [
                { tokens: ["DoruGreymon"], match: "nameExact" },
                { tokens: ["BurningGreymon"], match: "nameExact" },
                { tokens: ["DexDoruGreymon"], match: "nameExact" },
              ],
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Omnimon", "Greymon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Digimon in play with [Omnimon] or [Greymon] other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon] in its name",
          },
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

registerIrCard("BT5-095", compiled);
