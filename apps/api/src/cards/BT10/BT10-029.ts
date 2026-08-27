// @ts-nocheck
// HAND-FIXED IR for BT10-029 — do not regenerate.
// WhenAttacking inherited: removed spurious unconditional Draw (compiler emitted
// conditional + unconditional from single clause; only the conditional one is correct).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
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
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Shoutmon"],
            raw: "this Digimon has [Shoutmon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-029", compiled);
