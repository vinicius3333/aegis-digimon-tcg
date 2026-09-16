import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDNADigivolve",
          raw: "＜Blast DNA Digivolve ([DinoBeemon] + [Paildramon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 11000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 11000,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, this Digimon may digivolve into [Imperialdramon: Fighter Mode] in the hand or trash without paying the cost.",
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
                tokens: ["Imperialdramon: Fighter Mode"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 11000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 11000,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart:
            "Then, if DNA digivolving, this Digimon may digivolve into [Imperialdramon: Fighter Mode] in the hand or trash without paying the cost.",
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
                tokens: ["Imperialdramon: Fighter Mode"],
                match: "nameExact",
              },
            ],
          },
          payCost: false,
          from: ["hand", "trash"],
          optional: true,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-076", compiled);
