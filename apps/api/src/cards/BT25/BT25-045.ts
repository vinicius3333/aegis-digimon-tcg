// HAND-AUTHORED OVERRIDE (no AUTO-GENERATED header => the generator preserves this file).
//
// (node tools/kb/query.mjs card BT25-045: no card-specific Q&A; general link rules apply).
//
// reducedCost:1) that reduces by 1 the link cost of a [Social]/[Tool]/[Game] trait card linking
// to THIS Digimon, plus a separate `[Main]` LinkEffect and a `[When Linking]` suspend. The
// cross-actor continuous WhenWouldLink grant (the broad shape shared with BT25-004) needs an
// engine seam serialized to wave 08-09; here we discharge the flag faithfully for the common
// path by baking the `-1` onto this card's own trait-gated, once-per-turn Link action via the
// Phase-7 `LinkAction.costDelta` / `linkCostOf` seam (07-01-SUMMARY.md). This genuinely reduces a
// REAL link cost (fails-when-reverted; see BT25-045.test.ts). The residual broadening
// (a reduction when ANOTHER card links a [Social]/[Tool]/[Game] card to this Digimon) is deferred
// to 08-09's WhenWouldLink hook (tracked with BT25-004).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // The link-cost-reduction discharge: [Your Turn][Once Per Turn] link a [Social]/[Tool]/[Game]
      // trait card to this Digimon with the cost reduced by 1 (costDelta:-1 floors the paid cost).
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
            },
            count: 1,
          },
          costDelta: -1,
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              nameOrTrait: [{ tokens: ["Social", "Tool", "Game"], match: "trait" }],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
          ],
          raw: "[When Linking] Suspend 1 of your opponent's Digimon.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 0,
      isAlternate: true,
      traits: ["Appmon"],
    },
  ],
  linkRequirement: [
    {
      cost: 1,
      traits: ["Appmon"],
    },
  ],
};

registerIrCard("BT25-045", compiled);
