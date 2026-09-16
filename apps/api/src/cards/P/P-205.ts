import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      condition: {
        kind: "youHave",
        filter: {
          controller: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["DM"], match: "trait" }],
        },
        count: 1,
        raw: "you have a Digimon or Tamer with DM traits in play",
      },
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
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
        },
        {
          kind: "Trash",
          target: {
            filter: { controller: "mine", zone: "hand" },
            count: 2,
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "Main",
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 7,
            },
            count: 1,
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Kimeramon", "Millenniummon"], match: "name" }],
            },
            count: 1,
            upTo: true,
          },
          payCost: true,
          reduceCostBy: 3,
          from: ["trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          effectTextPart: "[Security] ＜Draw 2＞ and trash 2 cards in your hand.",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart: "[Security] ＜Draw 2＞ and trash 2 cards in your hand.",
          kind: "Trash",
          target: {
            filter: { controller: "mine", zone: "hand" },
            count: 2,
          },
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-205", compiled);
