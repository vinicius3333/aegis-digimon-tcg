// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX4-070 (Tarnished Hero, Option card with <Delay>).
// Text:
//   [Static] You can ignore this card's color requirements if you have a green Digimon or
//            Tamer in play.
//   [Main] Delete 1 of your opponent's level 3 Digimon. Then, place this card in your battle area.
//   [Main] <Delay> (Trash this card in your battle area to activate the effect below. You
//          can't activate this effect the turn this card enters play.)
//   ・ Your opponent may trash 1 Option card in their hand. If they do not, you gain 2 memory.
//   [Security] Place this card in your battle area.
//
// KB Q3513: Even if opponent has no level 3 Digimon, you can still activate to place in battle area.
// KB Q3514: "You gain 2 memory" (not opponent) if opponent doesn't trash an Option card.
//
// Fixes:
// 1. The Delay effect is encoded as trigger:"Main" with keywords:[{keyword:"Delay"}] — not a
//    plain second Main effect.
// 2. The trash target must restrict to kind:['Option'] cards in opponent's hand.
// 3. GainMemory must be scoped: if opponent did not trash, you gain 2 memory. Encoded as a
//    conditional action via ifThisEffectDidNotAct (reads the prior Trash's lastEffectActed).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              colors: ["Green"],
            },
            raw: "you have a green Digimon or Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
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
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
              kind: ["Option"],
            },
            count: 1,
          },
          optional: true,
          controller: "opponent",
        },
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "if opponent did not trash an Option card",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-070", compiled);
