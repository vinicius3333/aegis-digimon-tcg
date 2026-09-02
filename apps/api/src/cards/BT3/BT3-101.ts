import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "bifrostTarget",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "bifrostTarget",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "bifrostTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "bifrostTarget",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "bifrostTarget",
          },
          amount: -3000,
          duration: "forTheTurn",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "bifrostTarget",
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-101", compiled);
