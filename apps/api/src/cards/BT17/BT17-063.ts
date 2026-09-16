import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] ＜Draw 1＞and trash 1 card in your hand.",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "[When Digivolving] ＜Draw 1＞and trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if [HippoGryphonmon] is in this Digimon's digivolution cards, this Digimon may digivolve into [Murmukusmon] in the hand for a digivolution cost of 2, ignoring its digivolution requirements.",
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Murmukusmon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 2,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["HippoGryphonmon"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[HippoGryphonmon] is in this Digimon's digivolution cards",
          },
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
  digivolutionRequirement: [
    {
      names: ["HippoGryphonmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-063", compiled);
