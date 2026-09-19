import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: ["battleArea", "breeding"],
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Appmon"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a Digimon or Tamer with the [Appmon] trait on the field",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinkTrashed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Link",
              target: {
                filter: {
                  controller: "mine",
                  zone: "trash",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Appmon"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              recipient: {
                filter: {},
                count: 1,
                sourceRef: "triggerSubject",
              },
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-070", compiled);
