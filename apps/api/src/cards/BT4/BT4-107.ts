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
          effectTextPart: "Then, suspend 1 of your opponent's Digimon for each card added to your hand by this effect.",
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
