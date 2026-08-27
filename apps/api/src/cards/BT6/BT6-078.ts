// @ts-nocheck
// Hand-authored override for BT6-078 (SkullGreymon).
// runtime-effect fix: correct SubTrigger event (whenTrashedFromHand not whenTrashedFromDigivolutionCards),
// add optional+position to PlaceUnder, DP gain conditional on trash cost, duration forTheTurn.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          once: true,
          sourceFilter: {
            isSelfRef: true,
          },
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
                kind: ["Digimon"],
                colors: ["Purple"],
              },
              position: "bottom",
              optional: true,
            },
          ],
          raw: "When you trash this card in your hand using one of your effects, you may place it under 1 of your purple Digimon at the bottom of its digivolution cards.",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
              },
              count: 1,
            },
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-078", compiled);
