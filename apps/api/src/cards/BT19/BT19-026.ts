import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve2＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          trackOpponentDigimonCountAs: "postDeDigivolveOpponentDigimonCount",
        },
        {
          effectTextPart:
            "Then, if your opponent has 2 or more Digimon, return 1 of your opponent's level 4 or lower Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          to: "hand",
          condition: { kind: "namedCountAtLeast", countSource: "postDeDigivolveOpponentDigimonCount", count: 2 },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] ＜De-Digivolve2＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          trackOpponentDigimonCountAs: "postDeDigivolveOpponentDigimonCount",
        },
        {
          effectTextPart:
            "Then, if your opponent has 2 or more Digimon, return 1 of your opponent's level 4 or lower Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
            },
            count: 1,
          },
          to: "hand",
          condition: { kind: "namedCountAtLeast", countSource: "postDeDigivolveOpponentDigimonCount", count: 2 },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart:
            "[On Deletion] You may play 1 [Blue Flare]/[Xros Heart] trait Digimon card with a play cost of 5 or less from under your Tamers without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 5,
              zone: "underTamers",
              nameOrTrait: [
                {
                  tokens: ["Blue Flare", "Xros Heart"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["underTamers"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            excludeToken: true,
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
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-026", compiled);
