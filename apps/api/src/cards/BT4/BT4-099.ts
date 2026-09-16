import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Trigger ＜Draw 2＞. (Draw 2 cards from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart:
            "Then, if one of your Digimon has [Greymon] or [Dramon] in its name (other than [DoruGreymon], [BurningGreymon], or[DexDoruGreymon]), delete 1 of your opponent's Digimon with 4000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "youHave",
            filter: {
              excludeNameOrTrait: [
                { tokens: ["DoruGreymon"], match: "nameExact" },
                { tokens: ["BurningGreymon"], match: "nameExact" },
                { tokens: ["DexDoruGreymon"], match: "nameExact" },
              ],
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Greymon", "Dramon"],
                  match: "name",
                },
              ],
            },
            raw: "one of your Digimon has [Greymon] or [Dramon] in its name other than [DoruGreymon], [BurningGreymon], or[DexDoruGreymon]",
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

registerIrCard("BT4-099", compiled);
