// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST15-12 WarGreymon
// effectText: [Digivolve] Lv.5 w/[Greymon] in name: Cost 3
//             [Hand][Counter] <Blast Digivolve> (One of your Digimon may digivolve into this
//             card without paying the cost.)
//             <Blocker>
//             [All Turns][Once Per Turn] When a card is removed from a security stack, you may
//             unsuspend this Digimon.
//
// Audit fixes:
// - Counter: was "Unsuspend self" — wrong. BlastDigivolve keyword handles the digivolve-without-cost.
//   Empty actions array is correct for a pure BlastDigivolve (same pattern as ST20-11).
// - Added <Blocker> Static keyword (was missing entirely).
// - Added [All Turns][Once Per Turn] SubTrigger for whenSecurityCardRemoved → Unsuspend self.
//   KB Q814: "activates when a Digimon other than this Digimon removes a card" → any removal.
//   Engine needs whenSecurityCardRemoved event if not present (spec'd in LANE_A.md).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: {
            controller: "any",
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST15-12", compiled);
