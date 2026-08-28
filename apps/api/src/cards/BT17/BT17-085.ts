// @ts-nocheck
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
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "compound",
            costs: [
              {
                kind: "place",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Tamer"],
                    isSelfRef: true,
                  },
                  count: 1,
                },
                raw: "By placing this Tamer and 1 [Kyubimon] and 1 [Taomon] from your trash in any order as the bottom digivolution cards of one of your [Renamon]",
                underFilter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Renamon"], match: "name" }],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: "target",
                targetIsPermanent: true,
                bindHostAs: "rikaTarget",
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Kyubimon"], match: "name" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "rikaTarget" }, count: 1 },
              },
              {
                kind: "place",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Taomon"], match: "name" }],
                  },
                  count: 1,
                  from: ["trash"],
                },
                destination: "digivolutionStack",
                position: "bottom",
                host: { filter: { boundRef: "rikaTarget" }, count: 1 },
              },
            ],
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Renamon"], match: "name" }],
                },
                count: 1,
                fromSelectionRef: "rikaTarget",
              },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Sakuyamon"], match: "name" }],
              },
              payCost: true,
              from: ["hand"],
              costOverride: 4,
              ignoreRequirements: true,
              optional: true,
            },
          ],
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "ifThisEffectDigivolved",
            raw: "digivolved by this effect",
          },
          optional: true,
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

registerIrCard("BT17-085", compiled);
