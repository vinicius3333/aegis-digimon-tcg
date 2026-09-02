// HAND-FIXED IR for BT22-081 — do not regenerate.
// OnPlay/WhenDigivolving PlaceUnder: added from:["hand","trash"], underFilter:self,
// position:bottom (places Yuuko Kamishiro from hand or trash under this Digimon).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Yuuko Kamishiro"],
                  match: "name",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          condition: {
            kind: "selfHasNoDigivolutionCards",
            raw: "this Digimon has no digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Yuuko Kamishiro"],
                  match: "name",
                },
              ],
            },
            from: ["hand", "trash"],
            count: 1,
          },
          underFilter: {
            isSelfRef: true,
          },
          position: "bottom",
          condition: {
            kind: "selfHasNoDigivolutionCards",
            raw: "this Digimon has no digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "digivolutionCards",
                  hostFilter: { isSelfRef: true },
                  nameOrTrait: [
                    {
                      tokens: ["Yuuko Kamishiro"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Yuuko Kamishiro"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-081", compiled);
