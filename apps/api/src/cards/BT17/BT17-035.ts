import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-035 Taomon
// <Barrier>
// [When Digivolving] You may use 1 option card that has [Plug-In] in its name or
//   that's yellow from the hand with the cost reduced by 2.
// [When Attacking] (inherited) You may use 1 option card that has [Plug-In] in its
//   name or that's yellow from the hand with the cost reduced by 2, if this Digimon
//   has [Sakuyamon] in its name. [Once Per Turn]
//
// KB Q2785: color requirements cannot be ignored — you can only use cards that meet
//   the color requirements when using this effect.
//
// The effect is UseOptionWithoutCost (use, not play) with a filter matching:
//   - nameOrTrait: "Plug-In" in name, OR
//   - colors includes Yellow
// UseOptionWithoutCost checks single-color eligibility by default; this card does not print
// a one-color restriction, so multi-color Options are legal when their own requirements are met.
// The name/color disjunction is the filter-level `or` predicate consumed by the Option-use path.
// The text has no use-cost ceiling, so set the runtime's explicit no-ceiling sentinel rather than
// inheriting its historical cost-5 default.
// The "with cost reduced by 2" is payCost:true + reduceCostBy:2.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            or: [
              {
                nameOrTrait: [
                  {
                    tokens: ["Plug-In"],
                    match: "name",
                  },
                ],
              },
              {
                colors: ["Yellow"],
              },
            ],
          },
          allowMultiColor: true,
          payCost: true,
          reduceCostBy: 2,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            or: [
              {
                nameOrTrait: [
                  {
                    tokens: ["Plug-In"],
                    match: "name",
                  },
                ],
              },
              {
                colors: ["Yellow"],
              },
            ],
          },
          allowMultiColor: true,
          payCost: true,
          reduceCostBy: 2,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Sakuyamon"],
            raw: "this Digimon has [Sakuyamon] in its name",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-035", compiled);
