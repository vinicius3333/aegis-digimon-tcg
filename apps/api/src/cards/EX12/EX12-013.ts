import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-013 BetelGammamon.
// [Main][Once Per Turn] You may PLAY or USE 1 card with [Gammamon] in its text or the [VB]
// trait from your hand with the cost reduced by 2.
//
// Two verbs, so a Modal with two branches: PlayWithoutCost for the Digimon/Tamer side and
// UseOptionWithoutCost for the Option side, each `payCost: true` with `reduceCostBy: 2` on the
// action itself. `runModal` skips a branch with no legal candidate and auto-selects when only
// one remains, and each branch is `optional: true`, so "you may" survives the branch choice.
//
// The reduction is deliberately NOT a sibling `wouldBePlayed` reduceCost Replacement: that shape
// installs an un-scoped subscription that discounts every play in the window rather than only
// the card this activation chose, and it has no Option-use path at all (Q6731 forbids stacking
// two copies' reductions onto one play).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon", "Tamer"],
                    nameOrTrait: [
                      {
                        tokens: ["Gammamon"],
                        match: "text",
                      },
                      {
                        tokens: ["VB"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [
                    { tokens: ["Gammamon"], match: "text" },
                    { tokens: ["VB"], match: "trait" },
                  ],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Gammamon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["VB"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-013", compiled);
