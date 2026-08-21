// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-205 Insane Synthetic Monster (option card).
// [Static] If you have a Digimon or Tamer with DM trait, you may play this at 0 color cost.
// [Main] Draw 2, trash 2 from hand, then place this card in the battle area.
// <Delay> [Main] By deleting 1 of your Digimon with play cost 7 or lower,
//   you may play 1 Digimon with [Kimeramon] or [Millenniummon] in name from trash, reducing cost by 3.
// [Security] Draw 2, trash 2 from hand, then place this card in the battle area.
// KB Q5200: if deleted Digimon leaves while pending, that card's OnDeletion cannot fire.
// KB Q5397: DigiXros/Assembly can further reduce the play cost.
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
              nameOrTrait: [
                { tokens: ["Kimeramon", "Millenniummon"], match: "name" },
              ],
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
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-205", compiled);
