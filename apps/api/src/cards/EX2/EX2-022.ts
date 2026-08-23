// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored fix:
// (1) [Main] digivolve-in-hand: text says "If you have [Shu-Chong Wong] in play,
//     your [Lopmon] can digivolve into this card in your hand for a digivolution cost
//     of 3, ignoring its digivolution requirements."
//     Encoded in digivolutionRequirement as an exact Lopmon entry with a controllerControls
//     gate for an exact Shu-Chong Wong Tamer. The shared override is the client/server source
//     of truth; this local copy documents the audited module semantics.
// (2) WhenAttacking cost: added zone:"security" + topCard:true to target filter —
//     text says "trash the top card of your security stack".
// (3) Static effect removed — it was empty and served no role; the [Main] ability
//     is captured via digivolutionRequirement (above).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
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
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                topCard: true,
              },
              count: 1,
            },
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Lopmon"],
      cost: 3,
      controllerControls: {
        kind: ["Tamer"],
        namesExact: ["Shu-Chong Wong"],
        min: 1,
      },
      isAlternate: true,
    },
  ],
};

registerIrCard("EX2-022", compiled);
