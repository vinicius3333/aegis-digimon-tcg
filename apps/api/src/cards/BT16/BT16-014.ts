import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          ignorePlayCostLimit: true,
          target: {
            filter: {
              controller: "mine",
              // "use 1 [God Flame] or 1 Option card with the [Four Great Dragons] trait":
              // naming Option is what routes this through the USE path rather than a play.
              kind: ["Option"],
              nameOrTrait: [
                { tokens: ["God Flame"], match: "name" },
                { tokens: ["Four Great Dragons"], match: "trait" },
              ],
            },
            count: 1,
            forceSelection: true,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          ignorePlayCostLimit: true,
          target: {
            filter: {
              controller: "mine",
              // "use 1 [God Flame] or 1 Option card with the [Four Great Dragons] trait":
              // naming Option is what routes this through the USE path rather than a play.
              kind: ["Option"],
              nameOrTrait: [
                { tokens: ["God Flame"], match: "name" },
                { tokens: ["Four Great Dragons"], match: "trait" },
              ],
            },
            count: 1,
            forceSelection: true,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Goldramon"],
                match: "name",
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Goldramon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-014", compiled);
export { compiled };
