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
          raw: "＜Blast DNA Digivolve ([Fenriloogamon] + [Kazuchimon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] 2 of your opponent's Digimon get -10000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
          amount: -10000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if a Tamer card is in this Digimon's digivolution cards, delete 1 of your opponent's 10000 DP or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 10000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 1,
            filter: { kind: ["Tamer"] },
            raw: "a Tamer card is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] 2 of your opponent's Digimon get -10000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
          amount: -10000,
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "Then, if a Tamer card is in this Digimon's digivolution cards, delete 1 of your opponent's 10000 DP or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 10000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            count: 1,
            filter: { kind: ["Tamer"] },
            raw: "a Tamer card is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ReactivateEffect",
          fromTrigger: "WhenDigivolving",
          count: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          namesExact: ["Fenriloogamon"],
        },
        {
          color: "Yellow",
          level: 6,
          namesInText: ["Pulsemon"],
        },
      ],
    },
  ],
};

registerIrCard("BT20-081", compiled);
