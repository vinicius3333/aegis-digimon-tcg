import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT3-051 (Dokugumon).
// Fix: level 5 add entry was missing kind:["Digimon"] — text says "1 level 5
// Digimon card and 1 level 6 Digimon card". KB Q1085: may add only whichever
// level is found if both aren't revealed. KB Q2827: this card treated as both
// Lv5 and Lv6, so two copies may be added.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levels: [5],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                levels: [6],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-051", compiled);
