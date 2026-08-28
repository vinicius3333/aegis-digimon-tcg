// @ts-nocheck
// HAND-FIXED IR for BT4-107 (Pollen Spray) — do not regenerate over this file.
// Two generated defects vs the printed text ("Add all Digimon cards with
// <Digi-Burst> among them to your hand ... suspend 1 of your opponent's Digimon
// for each card added to your hand by this effect"):
//   1. The RevealAdd filter matched ANY Digimon — it now requires <Digi-Burst>
//      in the card text (nameOrTrait match:"text");
//   2. The Suspend scaling counted MY battle-area permanents — wildly wrong.
// The interpreter records `RevealAdd.trackCount`, letting the Suspend scale
// exactly by the number of cards added to hand by this effect.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Digi-Burst"],
                    match: "text",
                  },
                ],
              },
              count: "all",
              to: "hand",
            },
          ],
          rest: "deckBottom",
          trackCount: "addedByPollenSpray",
        },
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          raw: "suspend 1 of your opponent's Digimon for each card added to your hand by this effect",
          scaling: {
            per: 1,
            unit: "namedCount",
            countSource: "addedByPollenSpray",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-107", compiled);
