// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "opponent",
          amount: 3,
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "opponent",
          amount: 3,
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "trash",
            op: "gte",
            value: 10,
            raw: "your opponent has 10 or more cards in their trash",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-080", compiled);
