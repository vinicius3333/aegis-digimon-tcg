// @ts-nocheck
// HAND-FIXED IR for BT10-087 — do not regenerate.
// The printed [Your Turn] clause is a would-be-play DigiXros material expansion,
// not an after-play whenPlayed trigger (KB Q2011-Q2015).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
              },
              count: 1,
              to: "underTamer",
              requiresMinRevealed: 2,
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            hasDigiXrosRequirements: true,
          },
          actions: [
            {
              kind: "PlaceUnder",
              target: { filter: { controller: "mine", zone: "underTamer" }, count: "any" },
              underFilter: { isTriggerSource: true },
              asDigiXrosMaterial: true,
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-087", compiled);
