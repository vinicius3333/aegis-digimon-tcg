import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Save"], match: "text" }],
              },
              orFilters: [
                {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Hero"], match: "trait" }],
                },
              ],
              count: 1,
              from: ["hand"],
            },
            underFilter: {
              isSelfRef: true,
            },
            raw: "By placing 1 Digimon card with ＜Save＞ in its text or the [Hero] trait from your hand under this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          // No `ifThisEffectActed` guard here: a place-cost Draw does not set that receipt, so
          // the condition would suppress the memory outright. Declining the cost already aborts
          // the whole effect through the Draw's `abortOnDecline`.
          optional: false,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Save"], match: "text" },
              { tokens: ["Hero"], match: "trait" },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              raw: "reduce the digivolution cost by 1",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer and placing 1 card from under your Tamers as any of their bottom digivolution card",
              },
              additionalCosts: [
                {
                  kind: "place",
                  target: {
                    filter: { zone: "underTamers", controller: "mine" },
                    count: 1,
                    from: ["underTamers"],
                  },
                  destination: "digivolutionStack",
                  position: "bottom",
                  host: "target",
                  underFilter: { isTriggerSource: true },
                  raw: "placing 1 card from under your Tamers as any of their bottom digivolution card",
                },
              ],
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

registerIrCard("BT21-088", compiled);
