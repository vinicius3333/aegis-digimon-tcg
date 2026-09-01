import { CardColor, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "BT12-015/hand-main-stack-and-digivolve",
      trigger: "Main",
      isFromHand: true,
      // This whole-effect gate preserves the printed atomic material requirement.  The
      // requiredNamesExact selection below remains authoritative if the board changes between
      // declaration and resolution, so a stale decision cannot place only one material.
      condition: {
        kind: "allOf",
        conditions: [
          {
            kind: "memoryAtLeast",
            controller: "mine",
            value: -7,
            raw: "you can pay the 3 memory digivolution cost",
          },
          {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Takuya Kanbara"], match: "nameExact" }],
            },
            raw: "you have 1 [Takuya Kanbara] in play",
          },
          {
            kind: "selfHasMinTrash",
            count: 1,
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Agunimon"], match: "nameExact" }],
            },
            raw: "you have 1 [Agunimon] in your trash",
          },
          {
            kind: "selfHasMinTrash",
            count: 1,
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["BurningGreymon"], match: "nameExact" }],
            },
            raw: "you have 1 [BurningGreymon] in your trash",
          },
        ],
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Takuya Kanbara"], match: "nameExact" }],
            },
            count: 1,
            bindAs: "bt12_015_takuya",
          },
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Agunimon"], match: "nameExact" },
                { tokens: ["BurningGreymon"], match: "nameExact" },
              ],
            },
            count: 2,
            requiredNamesExact: ["Agunimon", "BurningGreymon"],
          },
          from: ["trash"],
          order: "any",
          underSelectionRef: "bt12_015_takuya",
          trackCount: "BT12-015/materials-placed",
        },
        {
          kind: "Digivolve",
          target: {
            fromSelectionRef: "bt12_015_takuya",
            filter: {},
            count: 1,
          },
          into: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Aldamon"], match: "nameExact" }],
          },
          from: ["hand"],
          source: "triggerSource",
          payCost: true,
          costOverride: 3,
          virtualBase: { level: 4, colors: [CardColor.Red] },
          condition: {
            kind: "namedCountAtLeast",
            countSource: "BT12-015/materials-placed",
            count: 2,
          },
        },
      ],
    },
    {
      effectKey: "BT12-015/return-takuya",
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Takuya Kanbara"], match: "name" }],
            },
            count: 1,
          },
          from: ["trash"],
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-015", compiled);
export { compiled };
