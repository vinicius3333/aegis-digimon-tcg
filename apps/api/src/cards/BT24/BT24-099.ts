// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            raw: "you have an [Appmon] trait Digimon or Tamer on the field",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
              },
              count: 1,
            },
            raw: "By trashing 1 [Appmon] card from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "any", kind: ["Digimon"] },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "Delay", raw: "＜Delay＞" },
              duration: "permanent",
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }],
            },
            count: 1,
          },
          recipient: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlaceInBattleAreaSelf" }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-099", compiled);
