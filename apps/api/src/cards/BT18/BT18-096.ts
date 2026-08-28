// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
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
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Hybrid", "Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a [Hybrid]/[Ten Warriors] trait Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Susanoomon"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                differentColors: true,
                controller: "mine",
                zone: "battleArea",
                kind: ["Tamer"],
              },
              count: 4,
              upTo: true,
            },
            targetIsPermanent: true,
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            raw: "by placing up to 4 of your Tamers with different colors under 1 of your [Susanoomon] as its bottom digivolution cards",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Susanoomon"],
                  match: "nameExact",
                },
              ],
            },
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            unit: "cards",
            usePaidCount: true,
          },
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
              hasInheritedEffects: true,
              controller: "mine",
              kind: ["Tamer"],
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

registerIrCard("BT18-096", compiled);
export { compiled };
