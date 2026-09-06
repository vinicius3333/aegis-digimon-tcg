import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          to: "deckBottom",
          from: ["trash"],
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "you have 4 or fewer cards in your hand",
          },
          cost: {
            kind: "payMemory",
            memory: 6,
            raw: "by paying 6 cost",
          },
          abortOnDecline: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              kind: ["Digimon"],
              unsuspended: true,
              controller: "opponent",
            },
            count: 1,
            upTo: false,
          },
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "you have 4 or fewer cards in your hand",
          },
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
        {
          kind: "Delete",
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
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-096", compiled);
