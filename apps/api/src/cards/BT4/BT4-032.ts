import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
//
// BT6-002 Q1399: the printed source-trash sentence explains the returned stack's
// rule teardown. Canonical Return moves the attachments without emitting a
// whenDigivolutionTrashed event.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 2,
            },
            raw: "＜Digi-Burst 2＞",
          },
          to: "hand",
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 2,
          raw: "＜Digi-Burst 2＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 2000,
          },
          while: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-032", compiled);
