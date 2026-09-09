import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// HAND-FIXED IR for BT19-076 — do not regenerate.
// Re-audit fixes:
//  - "[Digivolve][Shademon]" is a bracketed EXACT name route, so `namesExact`. The
//    substring `names` gate would also accept any future card merely containing
//    "Shademon" in its name (lane 5 / BT19-012 finding).
//  - "[On Deletion] ＜Save＞" carried the keyword but no action, so nothing was placed.
//    ＜Save＞ is an OPTIONAL placement of this card under one of your Tamers
//    (comprehensive 16-20-3); the keyword makes the registration normalizer default the
//    placement to the BOTTOM of the Tamer's stack (CR 4-3-2).

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart", "Blue Flare", "Twilight"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              playCostLte: 4,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
          },
          optional: true,
        },
      ],
      keywords: [
        {
          keyword: "Save",
          raw: "＜Save＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Shademon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-076", compiled);
