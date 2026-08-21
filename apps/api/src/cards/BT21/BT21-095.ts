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
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              zone: "security",
              faceUp: true,
            },
            raw: "you have no face-up security cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["WG"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          keyword: {
            keyword: "Vortex",
            raw: "＜Vortex＞",
          },
          duration: "permanent",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: false,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          toTop: false,
          faceUp: true,
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
              levelComparison: {
                op: "lte",
                value: 5,
              },
              nameOrTrait: [
                {
                  tokens: ["WG"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-095", compiled);
